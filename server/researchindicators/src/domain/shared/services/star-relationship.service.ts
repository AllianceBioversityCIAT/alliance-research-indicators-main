// @sdd-spec results/cross-platform-duplicate-resolution
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';

/**
 * How a row came to be protected. Recorded on the audit row so an operator can
 * see *why* a duplicate was retained, not just that it was.
 */
export enum ProtectingRelationshipKind {
  /** A STAR result links TO this row (`link_results.other_result_id` = target). */
  STAR_LINKS_TO_RESULT = 'STAR_LINKS_TO_RESULT',
  /** This row links TO a STAR result (`link_results.result_id` = target). */
  RESULT_LINKS_TO_STAR = 'RESULT_LINKS_TO_STAR',
  /** A `project_indicators_results` row would be silently cascade-deleted. */
  PROJECT_INDICATOR_CASCADE = 'PROJECT_INDICATOR_CASCADE',
}

export type ProtectingRelationship = {
  /** The dedup-scope row that must be kept. */
  resultId: number;
  kind: ProtectingRelationshipKind;
  /** The STAR result on the other side, when the relationship is a link. */
  counterpartResultId: number | null;
  linkResultId: number | null;
  /** `null` for non-link relationships. */
  linkIsActive: boolean | null;
};

export type ProtectionVerdict = {
  /** Rows that MUST NOT be deleted. */
  protectedResultIds: number[];
  /** Every relationship found, for the audit record. */
  relationships: ProtectingRelationship[];
  /**
   * Rows protected **only** by an inactive link. This is the OQ-7 surface: under
   * the conservative default these rows are protected; if OQ-7 resolves the other
   * way they become deletable, and this list is what changes.
   */
  inactiveLinkOnlyResultIds: number[];
};

/** `app_config` key gating the OQ-7 decision. */
export const PROTECT_INACTIVE_STAR_LINKS_KEY =
  'duplicate_resolution.protect_inactive_star_links';

/**
 * Answers the one question that stands between a hard delete and someone else's
 * data: **does anything that must survive reference this row?**
 *
 * This guard is load-bearing in a way the previous implementation's was not. The
 * live `full_delete_result_version` clears `link_results` in **both** directions
 * with no `is_active` predicate, so there is no longer a foreign-key error to
 * stop a mistake — a bug here fails **silently**, destroying link rows rather
 * than raising errno 1451. Earlier revisions of this spec assumed the database
 * would object; it will not.
 *
 * Three gaps in the shipped check are closed here:
 *
 *  1. **Both link directions.** The old query looked only at
 *     `link_results.other_result_id`. A STAR result linked *from* the duplicate
 *     was invisible, and deleting it orphaned the STAR side.
 *  2. **The counterpart must actually be STAR.** The old query protected a row
 *     referenced by *any* platform, so a mirror-to-mirror link between two
 *     external results blocked legitimate cleanup — over-protection.
 *  3. **`project_indicators_results` is `ON DELETE CASCADE`.** It raises no error
 *     and is not in the delete function; the rows simply vanish, where today's
 *     soft delete preserves them. That is the same class as an inactive STAR
 *     link, so it gets the same treatment (D-dup-16).
 *
 * Evaluation is per `result_id` over the **whole resolved deletion target set**,
 * not just a loser's seed row: family expansion adds sibling ids that the old
 * call site never checked.
 *
 * Measured exposure on dev (2026-08-04): **19** dedup-scope rows are referenced
 * by a STAR result via `other_result_id`, and **7** inactive STAR link rows touch
 * dedup-scope results. A run over comparable data that reports zero protected
 * rows is a signal the query shape is wrong, not that the data is clean.
 */
@Injectable()
export class StarRelationshipService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Evaluates protection for a set of result ids.
   *
   * @param resultIds Every id in the resolved deletion target set, including
   *        expanded family members.
   */
  async evaluate(resultIds: number[]): Promise<ProtectionVerdict> {
    if (!resultIds.length) {
      return {
        protectedResultIds: [],
        relationships: [],
        inactiveLinkOnlyResultIds: [],
      };
    }

    const placeholders = resultIds.map(() => '?').join(', ');
    const relationships: ProtectingRelationship[] = [
      ...(await this.findStarLinksToResult(placeholders, resultIds)),
      ...(await this.findResultLinksToStar(placeholders, resultIds)),
      ...(await this.findProjectIndicatorCascades(placeholders, resultIds)),
    ];

    const protectInactive = await this.shouldProtectInactiveLinks();

    const protecting = relationships.filter(
      (relationship) => relationship.linkIsActive !== false || protectInactive,
    );
    const protectedResultIds = [
      ...new Set(protecting.map((relationship) => relationship.resultId)),
    ];

    // Rows whose ONLY protection is an inactive link — the set that changes if
    // OQ-7 resolves against protecting them.
    const activelyProtected = new Set(
      relationships
        .filter((relationship) => relationship.linkIsActive !== false)
        .map((relationship) => relationship.resultId),
    );
    const inactiveLinkOnlyResultIds = [
      ...new Set(
        relationships
          .filter(
            (relationship) =>
              relationship.linkIsActive === false &&
              !activelyProtected.has(relationship.resultId),
          )
          .map((relationship) => relationship.resultId),
      ),
    ];

    return { protectedResultIds, relationships, inactiveLinkOnlyResultIds };
  }

  /** Convenience wrapper for the common "may I delete these?" question. */
  async isProtected(resultIds: number[]): Promise<boolean> {
    const verdict = await this.evaluate(resultIds);
    return verdict.protectedResultIds.length > 0;
  }

  /**
   * A STAR result links TO the target row.
   *
   * This is the only direction the shipped implementation checked — and it did
   * not verify the counterpart was STAR.
   */
  private async findStarLinksToResult(
    placeholders: string,
    resultIds: number[],
  ): Promise<ProtectingRelationship[]> {
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT l.link_result_id AS linkResultId,
              l.other_result_id AS resultId,
              l.result_id AS counterpartResultId,
              l.is_active AS linkIsActive
         FROM link_results l
         JOIN results s ON s.result_id = l.result_id
        WHERE l.other_result_id IN (${placeholders})
          AND s.platform_code = ?`,
      [...resultIds, ReportingPlatformEnum.STAR],
    );
    return rows.map((row) =>
      StarRelationshipService.toLinkRelationship(
        row,
        ProtectingRelationshipKind.STAR_LINKS_TO_RESULT,
      ),
    );
  }

  /**
   * The target row links TO a STAR result.
   *
   * Never checked before. Deleting the target clears this row too — the live
   * delete function matches `link_results` on both directions — so the STAR
   * result loses a reference it authored.
   */
  private async findResultLinksToStar(
    placeholders: string,
    resultIds: number[],
  ): Promise<ProtectingRelationship[]> {
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT l.link_result_id AS linkResultId,
              l.result_id AS resultId,
              l.other_result_id AS counterpartResultId,
              l.is_active AS linkIsActive
         FROM link_results l
         JOIN results s ON s.result_id = l.other_result_id
        WHERE l.result_id IN (${placeholders})
          AND s.platform_code = ?`,
      [...resultIds, ReportingPlatformEnum.STAR],
    );
    return rows.map((row) =>
      StarRelationshipService.toLinkRelationship(
        row,
        ProtectingRelationshipKind.RESULT_LINKS_TO_STAR,
      ),
    );
  }

  /**
   * `project_indicators_results` rows that a hard delete would cascade away.
   *
   * The table holds the one `ON DELETE CASCADE` foreign key pointing at
   * `results`, has no TypeORM entity, and appears in no migration — it exists
   * only in the live schema, which is why an entity-derived enumeration misses
   * it entirely. Because CASCADE raises no error, this is the quietest data-loss
   * path in the whole feature.
   */
  private async findProjectIndicatorCascades(
    placeholders: string,
    resultIds: number[],
  ): Promise<ProtectingRelationship[]> {
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT p.result_id AS resultId
         FROM project_indicators_results p
        WHERE p.result_id IN (${placeholders})`,
      resultIds,
    );
    return rows.map((row) => ({
      resultId: Number(row.resultId),
      kind: ProtectingRelationshipKind.PROJECT_INDICATOR_CASCADE,
      counterpartResultId: null,
      linkResultId: null,
      linkIsActive: null,
    }));
  }

  /**
   * Whether an inactive STAR link protects (OQ-7).
   *
   * **Defaults to `true` — deliberately more conservative than R-RES-004**,
   * which as written protects active links only. While OQ-7 is open the default
   * errs toward retaining: a soft-deleted STAR link is recoverable today and
   * would stop being so, and under-deletion is the recoverable error while
   * over-deletion is not. A missing config row therefore protects; flipping the
   * decision is a config change, not a code change. R-RES-004 should be amended
   * when OQ-7 closes.
   */
  private async shouldProtectInactiveLinks(): Promise<boolean> {
    try {
      const rows: Record<string, unknown>[] = await this.dataSource.query(
        `SELECT simple_value AS value FROM app_config WHERE \`key\` = ? LIMIT 1`,
        [PROTECT_INACTIVE_STAR_LINKS_KEY],
      );
      const raw = rows?.[0]?.value;
      if (raw === undefined || raw === null) return true;
      return String(raw).trim().toLowerCase() !== 'false';
    } catch {
      // A missing table or an unreadable config must never widen deletion.
      return true;
    }
  }

  private static toLinkRelationship(
    row: Record<string, unknown>,
    kind: ProtectingRelationshipKind,
  ): ProtectingRelationship {
    return {
      resultId: Number(row.resultId),
      kind,
      counterpartResultId:
        row.counterpartResultId === null ||
        row.counterpartResultId === undefined
          ? null
          : Number(row.counterpartResultId),
      linkResultId:
        row.linkResultId === null || row.linkResultId === undefined
          ? null
          : Number(row.linkResultId),
      // MySQL returns 0/1 for booleans through a raw query.
      linkIsActive:
        row.linkIsActive === null || row.linkIsActive === undefined
          ? null
          : Boolean(Number(row.linkIsActive)),
    };
  }
}

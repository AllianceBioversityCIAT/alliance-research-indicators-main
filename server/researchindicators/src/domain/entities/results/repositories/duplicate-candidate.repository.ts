// @sdd-spec results/cross-platform-duplicate-resolution
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Result } from '../entities/result.entity';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../enum/reporting-platform.enum';
import { DuplicateGroupParticipant } from '../../../shared/utils/duplicate-result-priority.util';
import {
  dedupScopeSql,
  normalizedPublicLinkParams,
  normalizedPublicLinkSql,
} from '../../../shared/utils/public-link-normalizer.util';
import {
  PublicationIdentitySource,
  prmsHandleEvidenceScopeSql,
  publicLinkIdentityScopeSql,
} from '../../../shared/utils/publication-identity.util';

/** A candidate row, shaped so it can be handed straight to the group resolver. */
export type DuplicateCandidate = DuplicateGroupParticipant & {
  resultId: number;
  resultOfficialCode: number;
  reportYearId: number;
  /**
   * The raw value that produced the identity — `results.public_link` for
   * TIP/AICCRA, `result_evidences.evidence_url` for PRMS (R-RES-010). Renamed
   * from `rawPublicLink` (design §3.1.2): that name would be a lie on the
   * PRMS branch, whose raw value is never `public_link`.
   */
  rawIdentity: string;
  normalizedPublicLink: string;
  /** Which field supplied the identity (R-RES-009 AC.4). */
  identitySource: PublicationIdentitySource;
  /**
   * Distinct normalized identities this `resultId` carries across the WHOLE
   * dedup-scope population, not just the rows this particular query
   * returned — the carrier for the multi-identity refusal
   * (`refuseMultiIdentityLosers`, R-RES-010 AC.8). Always 1 for TIP/AICCRA (a
   * `results` row has exactly one `public_link`); only PRMS can exceed 1.
   */
  identityCount: number;
};

/** One cross-platform duplicate group found by the sweep. */
export type DuplicateGroupKey = {
  normalizedPublicLink: string;
  members: number;
  platforms: number;
  reportYears: number;
};

/**
 * All SQL for cross-platform duplicate detection, in one place.
 *
 * Both callers — the sync path in `SaveResultService` and the admin sweep — share
 * this repository so the scope filters and the normalization can never diverge
 * between them.
 *
 * Three properties are structural rather than conventional, and each exists because
 * an earlier revision got it wrong:
 *
 *  - **Normalization is symmetric by construction.** The same expression is
 *    applied to the stored column and to the incoming value. The previous
 *    implementation trimmed only the incoming value and compared it against raw
 *    storage, so trailing whitespace and scheme differences went undetected.
 *  - **Comparisons run under an explicit binary collation.** `public_link` is
 *    `utf8mb3_general_ci`, which folds case and accents, so a plain `=` would
 *    ignore path case and collapse distinct publications — over-matching, whose
 *    consequence here is a hard delete.
 *  - **Identity source is a `UNION ALL`, not a `LEFT JOIN` (rev 3, design §3.1.2).**
 *    PRMS draws its identity from `result_evidences`, never from `public_link`;
 *    TIP/AICCRA draw it from `public_link` and never join `result_evidences`. A
 *    join would need the platform predicate stated twice (once in `ON`, once in a
 *    `CASE`) and could drift; each branch here reads exactly one identity source
 *    and owns its own scope predicate.
 *
 * No index supports these queries and none is wanted: `results` holds ~14.7k
 * rows, of which ~13.4k are in dedup scope, and the normalization cannot be
 * index-satisfied on a `TEXT` column anyway. The PRMS branch additionally joins
 * ~4.5k evidence rows against ~3.9k PRMS rows; `evidence_url` is `text` too, so
 * the format predicate is equally unindexable. At this scale a scan remains
 * free (design §3.1.2 "Cost"). If either table grows by orders of magnitude
 * this decision needs revisiting — see `design.md` §0.2.
 */
@Injectable()
export class DuplicateCandidateRepository extends Repository<Result> {
  constructor(private readonly dataSource: DataSource) {
    super(Result, dataSource.createEntityManager());
  }

  /**
   * The two-branch identity `UNION ALL` (design §3.1.2), as a pair of CTEs
   * every read composes with `WITH ${identityCandidatesCte()} SELECT … FROM
   * identity_counted WHERE …`.
   *
   * `identity_candidates` is the union itself, one row per (result, identity):
   *  - **Branch 1 (TIP/AICCRA):** reads `public_link` directly. No format
   *    filter — R-RES-010 AC.6 measured AICCRA at 315/584 handle-format, so a
   *    filter here would drop 269 real rows out of scope.
   *  - **Branch 2 (PRMS):** joins `result_evidences` and applies the full
   *    stored-side predicate (`prmsHandleEvidenceScopeSql`). `GROUP BY
   *    (result_id, …, normalizedPublicLink)` is load-bearing, not
   *    stylistic: `result_evidences` carries no unique constraint on
   *    `(result_id, evidence_url)`, and the versioning stored procedures
   *    copy evidence rows wholesale (JD3-S-04). Without the grouping, two
   *    identical handle rows would put one `result_id` in a group twice —
   *    duplicate audit rows and a double hard-delete attempt for one
   *    physical row — or inflate `identityCount` into a spurious refusal
   *    that freezes a real group. `MIN(e.evidence_url)` is representational
   *    only: which literal raw variant is shown when several collapse to the
   *    same normalized value is not load-bearing: only the count and the
   *    comparison value are, and both are unaffected by which raw variant
   *    `MIN` happens to pick.
   *
   * `identity_counted` adds `identityCount`: distinct normalized identities
   * per `result_id`, computed via a correlated subquery over the WHOLE
   * (unfiltered) union rather than a window function — deliberately, to make
   * no assumption about the deployed MySQL 8.0.x point release's support for
   * `DISTINCT` inside an aggregate window function. It is computed
   * unfiltered because a result's identity plurality is a property of the
   * result, not of what a caller's `WHERE` happens to be looking for:
   * filtering by report year or by one specific link afterwards, in the
   * OUTER query, cannot under-count it — a `results` row carries exactly one
   * `report_year_id`, so restricting by year removes whole OTHER results,
   * never one of THIS result's own identity rows.
   */
  private static identityCandidatesCte(): string {
    return `identity_candidates AS (
        SELECT
          r.result_id AS resultId,
          r.result_official_code AS resultOfficialCode,
          r.platform_code AS platformCode,
          r.indicator_id AS indicatorId,
          r.report_year_id AS reportYearId,
          r.public_link AS rawIdentity,
          '${PublicationIdentitySource.PUBLIC_LINK}' AS identitySource,
          ${normalizedPublicLinkSql('r.public_link')} AS normalizedPublicLink
        FROM results r
        WHERE ${dedupScopeSql('r')}
          AND ${publicLinkIdentityScopeSql('r')}

        UNION ALL

        SELECT
          r.result_id AS resultId,
          r.result_official_code AS resultOfficialCode,
          r.platform_code AS platformCode,
          r.indicator_id AS indicatorId,
          r.report_year_id AS reportYearId,
          MIN(e.evidence_url) AS rawIdentity,
          '${PublicationIdentitySource.HANDLE_EVIDENCE}' AS identitySource,
          ${normalizedPublicLinkSql('e.evidence_url')} AS normalizedPublicLink
        FROM results r
        INNER JOIN result_evidences e ON e.result_id = r.result_id
        WHERE ${dedupScopeSql('r')}
          AND ${prmsHandleEvidenceScopeSql({ resultAlias: 'r', evidenceAlias: 'e' })}
        GROUP BY
          r.result_id, r.result_official_code, r.platform_code,
          r.indicator_id, r.report_year_id, normalizedPublicLink
      ),
      identity_counted AS (
        SELECT
          ic.*,
          (
            SELECT COUNT(DISTINCT ic2.normalizedPublicLink)
            FROM identity_candidates ic2
            WHERE ic2.resultId = ic.resultId
          ) AS identityCount
        FROM identity_candidates ic
      )`;
  }

  /** Columns every read projects, so all three queries return the same shape. */
  private static readonly SELECT_COLUMNS = `
      resultId,
      resultOfficialCode,
      platformCode,
      indicatorId,
      reportYearId,
      rawIdentity,
      identitySource,
      normalizedPublicLink,
      identityCount`;

  private static toCandidate(row: Record<string, unknown>): DuplicateCandidate {
    const identityCount = Number(row.identityCount);
    if (!Number.isFinite(identityCount)) {
      // Fail CLOSED (R-RES-010 AC.8): `refuseMultiIdentityLosers` computes
      // `(loser.identityCount ?? 1) > 1`, and `NaN > 1` is `false` — a
      // projection or alias regression that turns this column into `NaN`
      // would therefore make the multi-identity refusal silently never fire,
      // while `identityCount` still reads as "present" in the audit trail
      // (undistinguishable from a genuine 1). On the one branch standing
      // between an ambiguous identity and an irreversible hard delete,
      // an unparseable count is treated as a defect to surface loudly, not
      // as "no ambiguity".
      throw new Error(
        `identityCount for result ${String(row.resultId)} did not resolve to a finite number (got ${JSON.stringify(row.identityCount)}); refusing to treat it as unambiguous.`,
      );
    }
    return {
      resultId: Number(row.resultId),
      resultOfficialCode: Number(row.resultOfficialCode),
      platformCode: row.platformCode as ReportingPlatformEnum,
      indicatorId: Number(row.indicatorId) as IndicatorsEnum,
      reportYearId: Number(row.reportYearId),
      rawIdentity: String(row.rawIdentity),
      identitySource: row.identitySource as PublicationIdentitySource,
      normalizedPublicLink: String(row.normalizedPublicLink),
      identityCount,
    };
  }

  /**
   * Candidates for one incoming sync row, within the same report year.
   *
   * Note what is NOT filtered out: rows of the incoming platform are returned.
   * The resolver needs them to detect same-system ambiguity, and — critically —
   * `excludeResultId` is deliberately absent from the default path, because
   * excluding the row being updated is what hid the loser's own stored row and
   * let the reported bug survive every sync run.
   *
   * @param params.publicLink Raw incoming identity value; normalization is
   *        applied here. Despite the name, this is the resolved identity
   *        handed in by the caller (a PRMS handle for PRMS, `public_link`
   *        otherwise) — `resolveIncomingPublicationIdentity` decides which.
   * @param params.reportYearId Auto-deletion is confined to a single report year
   *        (R-RES-006); the sweep is what surfaces cross-year duplicates.
   */
  async findCandidatesForIncoming(params: {
    publicLink: string;
    reportYearId: number;
  }): Promise<DuplicateCandidate[]> {
    const sql = `
      WITH ${DuplicateCandidateRepository.identityCandidatesCte()}
      SELECT ${DuplicateCandidateRepository.SELECT_COLUMNS}
      FROM identity_counted
      WHERE reportYearId = ?
        AND normalizedPublicLink = ${normalizedPublicLinkSql('?')}`;

    const rows: Record<string, unknown>[] = await this.query(sql, [
      params.reportYearId,
      ...normalizedPublicLinkParams(params.publicLink),
    ]);
    return rows.map(DuplicateCandidateRepository.toCandidate);
  }

  /**
   * Normalized identities that span more than one of PRMS/TIP/AICCRA.
   *
   * Paged rather than streamed so the sweep can process groups in batches and
   * never hold one transaction across the whole run (NFR-RES-002).
   *
   * @returns Group keys with member, platform and report-year counts. A group
   *          whose `reportYears > 1` is classified `CROSS_YEAR_REVIEW` by the
   *          resolver and is never auto-deleted.
   */
  async findCrossPlatformGroupKeys(filters: {
    reportYearId?: number;
    platformCodes?: ReportingPlatformEnum[];
    indicatorIds?: IndicatorsEnum[];
    limit?: number;
    offset?: number;
  }): Promise<DuplicateGroupKey[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.reportYearId !== undefined) {
      where.push('reportYearId = ?');
      params.push(filters.reportYearId);
    }
    if (filters.platformCodes?.length) {
      where.push(
        `platformCode IN (${filters.platformCodes.map(() => '?').join(', ')})`,
      );
      params.push(...filters.platformCodes);
    }
    if (filters.indicatorIds?.length) {
      where.push(
        `indicatorId IN (${filters.indicatorIds.map(() => '?').join(', ')})`,
      );
      params.push(...filters.indicatorIds);
    }

    // The grouping key is the normalized identity itself; grouping by the
    // column name keeps MySQL from evaluating the underlying expression twice.
    const sql = `
      WITH ${DuplicateCandidateRepository.identityCandidatesCte()}
      SELECT
        normalizedPublicLink,
        COUNT(*) AS members,
        COUNT(DISTINCT platformCode) AS platforms,
        COUNT(DISTINCT reportYearId) AS reportYears
      FROM identity_counted
      ${where.length ? `WHERE ${where.join('\n        AND ')}` : ''}
      GROUP BY normalizedPublicLink
      HAVING COUNT(DISTINCT platformCode) > 1
      ORDER BY normalizedPublicLink
      ${filters.limit !== undefined ? 'LIMIT ?' : ''}
      ${filters.limit !== undefined && filters.offset !== undefined ? 'OFFSET ?' : ''}`;

    if (filters.limit !== undefined) params.push(filters.limit);
    if (filters.limit !== undefined && filters.offset !== undefined) {
      params.push(filters.offset);
    }

    const rows: Record<string, unknown>[] = await this.query(sql, params);
    return rows.map((row) => ({
      normalizedPublicLink: String(row.normalizedPublicLink),
      members: Number(row.members),
      platforms: Number(row.platforms),
      reportYears: Number(row.reportYears),
    }));
  }

  /**
   * Every member row of the given normalized identities.
   *
   * Takes a batch of keys so the sweep issues one query per batch of groups
   * rather than one per group. The keys are themselves already-normalized
   * values (produced by {@link findCrossPlatformGroupKeys}), so — unlike
   * {@link findCandidatesForIncoming} — no further normalization is applied
   * to the bound parameters here; only the stored side needs normalizing.
   */
  async findMembersByNormalizedLinks(
    normalizedLinks: string[],
  ): Promise<DuplicateCandidate[]> {
    if (!normalizedLinks.length) return [];

    const placeholders = normalizedLinks.map(() => '?').join(', ');
    const sql = `
      WITH ${DuplicateCandidateRepository.identityCandidatesCte()}
      SELECT ${DuplicateCandidateRepository.SELECT_COLUMNS}
      FROM identity_counted
      WHERE normalizedPublicLink IN (${placeholders})
      ORDER BY normalizedPublicLink, resultId`;

    const rows: Record<string, unknown>[] = await this.query(
      sql,
      normalizedLinks,
    );
    return rows.map(DuplicateCandidateRepository.toCandidate);
  }
}

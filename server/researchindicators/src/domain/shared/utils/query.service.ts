// @sdd-spec results/cross-platform-duplicate-resolution
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';

/** Which MySQL routine performs the deletion. */
export enum ResultDeleteMode {
  /** `delete_result` — sets `is_active = FALSE`; the row and its link survive. */
  LOGICAL = 'LOGICAL',
  /** `full_delete_result_version` — removes the row and its dependency graph. */
  FULL = 'FULL',
}

/** Per-row outcome, so a no-op is never reported as a deletion. */
export enum ResultDeleteStatus {
  DELETED = 'DELETED',
  /**
   * The routine returned FALSE: the row was already gone. It does NOT raise, so
   * without inspecting the return value a concurrent sync or a retried apply
   * would be audited as a fresh deletion.
   */
  NOOP = 'NOOP',
}

export type ResultDeleteOutcome = {
  resultId: number;
  status: ResultDeleteStatus;
};

export type ResultDeleteScope = {
  seedId: number;
  isSnapshot: boolean;
  reportYearId: number | null;
  /** Ordered: snapshots first, the live row last. */
  targetIds: number[];
  /**
   * Rows sharing the seed's `result_official_code` + `platform_code` but a
   * **different** `report_year_id`, which year scoping excludes.
   *
   * Surfaced rather than dropped silently. Two things depend on it:
   *  - It proves the narrowing happened, so an operator can see it in the audit
   *    record instead of inferring it.
   *  - It is the tripwire for an assumption this spec could not verify — that a
   *    snapshot always carries its live row's `report_year_id`. If snapshots
   *    turn out to be stored under a different year, they would land here
   *    instead of in `targetIds`, and a non-empty list on a live seed is the
   *    signal to stop and re-derive the scope rather than delete.
   */
  siblingIdsOutsideReportYear: number[];
};

@Injectable()
export class QueryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Loads the seed row fields required to decide delete scope.
   */
  private async findResultDeleteSeed(
    resultId: number,
    manager: EntityManager = this.dataSource.manager,
  ) {
    return manager.getRepository(Result).findOne({
      where: { result_id: resultId },
      select: {
        result_id: true,
        result_official_code: true,
        platform_code: true,
        report_year_id: true,
        is_snapshot: true,
      },
    });
  }

  /**
   * Resolves every `result_id` in the same logical result family as the seed row.
   *
   * Versioning stores live rows (`is_snapshot = false`) and snapshot rows
   * (`is_snapshot = true`) as separate `results` records sharing the same
   * `result_official_code` and `platform_code`.
   *
   * **The family is confined to the seed's `report_year_id`.** It previously was
   * not, and the same official code legitimately has one live row per report year
   * — PRMS keys identity on `{official_code, platform_code, report_year_id}`. So
   * deleting a 2024 row expanded to and destroyed the 2025 row of the same code,
   * defeating the report-year boundary the spec advertises as its main
   * conservatism control, and doing it to rows the protection guard never saw.
   *
   * All four existing callers want "this row and its versions", never "every year
   * of this official code":
   *  - `results.service.ts` bulk `delete-results-by-parameters` — the operator
   *    selected specific rows; expanding across years deletes rows they did not.
   *  - `results.service.ts` AI-report rollback — undoes what this pass created.
   *  - `prms.opensearch.service.ts` sync rollback — same.
   *  - `save-all-sections.service.ts` winner rollback — same, and its own lookup
   *    already keys on `report_year_id`.
   * Narrowing is therefore a fix for all four, not a regression in three.
   */
  async findResultFamilyIds(
    resultId: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<number[]> {
    const seed = await this.findResultDeleteSeed(resultId, manager);
    if (!seed) return [];

    const family = await manager.getRepository(Result).find({
      where: {
        result_official_code: seed.result_official_code,
        platform_code: seed.platform_code,
        report_year_id: seed.report_year_id,
      },
      select: { result_id: true, is_snapshot: true },
    });

    return QueryService.orderSnapshotsFirst(family);
  }

  /**
   * Full delete scope for a seed row, including what year scoping excluded.
   *
   * Delete scope rules:
   *  - Live row (`is_snapshot = false`) → the whole family for that report year.
   *  - Snapshot row (`is_snapshot = true`) → only the provided `result_id`.
   */
  async resolveResultDeleteScope(
    resultId: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ResultDeleteScope> {
    const seed = await this.findResultDeleteSeed(resultId, manager);

    if (!seed) {
      return {
        seedId: resultId,
        isSnapshot: false,
        reportYearId: null,
        targetIds: [],
        siblingIdsOutsideReportYear: [],
      };
    }

    const targetIds =
      seed.is_snapshot === true
        ? [seed.result_id]
        : await this.findResultFamilyIds(seed.result_id, manager);

    // Everything sharing the identity but a different year. Computed even for a
    // snapshot seed so the audit record can show the full picture.
    const allYears = await manager.getRepository(Result).find({
      where: {
        result_official_code: seed.result_official_code,
        platform_code: seed.platform_code,
      },
      select: { result_id: true, report_year_id: true },
    });
    const siblingIdsOutsideReportYear = allYears
      .filter((row) => row.report_year_id !== seed.report_year_id)
      .map((row) => row.result_id);

    return {
      seedId: seed.result_id,
      isSnapshot: seed.is_snapshot === true,
      reportYearId: seed.report_year_id ?? null,
      targetIds,
      siblingIdsOutsideReportYear,
    };
  }

  /**
   * Resolves which `result_id` values should be deleted for a given seed row.
   *
   * Retained for callers that only need the ids; prefer
   * {@link resolveResultDeleteScope}, which also reports what year scoping
   * excluded.
   */
  async resolveResultDeleteTargetIds(resultId: number): Promise<number[]> {
    const scope = await this.resolveResultDeleteScope(resultId);
    return scope.targetIds;
  }

  /**
   * Soft-deletes a result via the `delete_result` MySQL function.
   * Scope follows {@link resolveResultDeleteScope}.
   */
  async deleteLogicalResultById(
    resultId: number,
  ): Promise<ResultDeleteOutcome[]> {
    return this.deleteResultFamily(resultId, ResultDeleteMode.LOGICAL);
  }

  /**
   * Hard-deletes a result via the `full_delete_result_version` MySQL function.
   * Scope follows {@link resolveResultDeleteScope}.
   */
  async deleteFullResultById(resultId: number): Promise<ResultDeleteOutcome[]> {
    return this.deleteResultFamily(resultId, ResultDeleteMode.FULL);
  }

  /**
   * Deletes one result family atomically.
   *
   * Three properties, each fixing a defect in the previous implementation:
   *
   *  1. **One transaction for the family.** Deletion previously issued one
   *     autocommitted call per member, so a failure part-way through destroyed the
   *     live row and left its snapshots behind — and because every duplicate
   *     participant set filters `is_snapshot = FALSE`, no later run could ever see
   *     or clean them, while they kept a `public_link`. The state was
   *     unrecoverable by re-running the tool that created it.
   *  2. **The family is read inside the transaction, `FOR UPDATE`.** Reading it
   *     first left a window in which a concurrent versioning run could insert a
   *     snapshot that the delete then skipped — the same orphan, by a different
   *     route.
   *  3. **The routine's return value is inspected.** Both functions return FALSE
   *     rather than raising when the row is already gone, so a no-op is reported
   *     as {@link ResultDeleteStatus.NOOP} instead of a deletion.
   *
   * Deletion order is snapshots first, the live row last: the live row is the
   * anchor any later re-resolution starts from, so it is the last thing to go.
   */
  private async deleteResultFamily(
    resultId: number,
    mode: ResultDeleteMode,
  ): Promise<ResultDeleteOutcome[]> {
    const routine =
      mode === ResultDeleteMode.FULL
        ? 'full_delete_result_version'
        : 'delete_result';

    return this.dataSource.transaction(async (manager) => {
      const seed = await this.findResultDeleteSeed(resultId, manager);
      if (!seed) return [];

      const locked: { result_id: number; is_snapshot: number | boolean }[] =
        seed.is_snapshot === true
          ? [{ result_id: seed.result_id, is_snapshot: true }]
          : await manager.query(
              `SELECT result_id, is_snapshot
                 FROM results
                WHERE result_official_code = ?
                  AND platform_code = ?
                  AND report_year_id = ?
                FOR UPDATE`,
              [
                seed.result_official_code,
                seed.platform_code,
                seed.report_year_id,
              ],
            );

      const targetIds = QueryService.orderSnapshotsFirst(
        locked.map((row) => ({
          result_id: Number(row.result_id),
          is_snapshot: Boolean(Number(row.is_snapshot)),
        })),
      );

      const outcomes: ResultDeleteOutcome[] = [];
      for (const id of targetIds) {
        const rows = await manager.query(`SELECT ${routine}(?) AS affected`, [
          id,
        ]);
        const affected = Boolean(Number(rows?.[0]?.affected ?? 0));
        outcomes.push({
          resultId: id,
          status: affected
            ? ResultDeleteStatus.DELETED
            : ResultDeleteStatus.NOOP,
        });
      }
      return outcomes;
    });
  }

  /**
   * Snapshots first, the live row last, and stable by `result_id` within each
   * group so the order is deterministic across runs.
   */
  private static orderSnapshotsFirst(
    rows: { result_id: number; is_snapshot?: boolean | null }[],
  ): number[] {
    return [...rows]
      .sort((left, right) => {
        const leftLive = left.is_snapshot === true ? 0 : 1;
        const rightLive = right.is_snapshot === true ? 0 : 1;
        if (leftLive !== rightLive) return leftLive - rightLive;
        return Number(left.result_id) - Number(right.result_id);
      })
      .map((row) => Number(row.result_id));
  }
}

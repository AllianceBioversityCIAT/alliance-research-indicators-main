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
  /**
   * Deletion was never attempted because the seed's identity has more than one
   * LIVE row and no parent link exists to say which live row a snapshot
   * belongs to (`version_id` is NULL on every snapshot measured — 0 of 574,
   * 2026-08-04). Sweeping every snapshot by identity in that state could
   * destroy a SURVIVING live row's version history, so the family refuses to
   * resolve rather than guess. Never conflated with NOOP: a NOOP means the
   * routine ran and found nothing to remove; a REFUSED means the routine was
   * never called at all.
   */
  REFUSED = 'REFUSED',
}

/** Why a delete scope refused to resolve rather than guess. */
export enum ResultDeleteRefusalReason {
  /**
   * The identity (`result_official_code` + `platform_code`) has more than one
   * live row. Measured 2026-08-04: 4 identities out of 14,108 live rows.
   */
  AMBIGUOUS_LIVE_ROWS = 'AMBIGUOUS_LIVE_ROWS',
}

export type ResultDeleteOutcome = {
  resultId: number;
  status: ResultDeleteStatus;
};

export type ResultDeleteScope = {
  seedId: number;
  isSnapshot: boolean;
  reportYearId: number | null;
  /**
   * Ordered: snapshots first, the live row last. Empty when `refusalReason`
   * is set — a refusal deletes nothing, not "everything except the live row".
   */
  targetIds: number[];
  /**
   * LIVE rows sharing the seed's identity but a *different* `report_year_id`
   * than the seed — never snapshots.
   *
   * **Corrected 2026-08-04 (design.md §5.4.1).** As originally written this
   * field counted snapshots too. A snapshot legitimately retains the year it
   * was taken for — measured: 82% of snapshots carry a `report_year_id` no
   * live row of their identity shares — so counting them fired this field on
   * nearly every delete and it decayed into noise: a tripwire that always
   * trips gets waived.
   *
   * For a LIVE seed, this is populated in exactly one case: `refusalReason`
   * is set, and this lists the other live rows that made the identity
   * ambiguous. Whenever the identity is unambiguous — the only other case
   * that reaches a live seed, since an ambiguous one refuses first — it is
   * structurally always empty, because an unambiguous identity has exactly
   * one live row: the seed itself.
   *
   * For a SNAPSHOT seed it is purely informational (a snapshot's scope is
   * always itself alone — see `targetIds` — so this cannot narrow or widen
   * anything) and is kept so the audit record can show the full picture.
   */
  siblingIdsOutsideReportYear: number[];
  /**
   * Set when the seed's identity has more than one LIVE row — see
   * {@link ResultDeleteRefusalReason}. Null whenever resolution proceeded
   * normally, including every snapshot seed, which never expands and is
   * therefore never ambiguous.
   */
  refusalReason: ResultDeleteRefusalReason | null;
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
   * Every LIVE row (`is_snapshot = false`) sharing the seed's identity
   * (`result_official_code` + `platform_code`), across all report years.
   *
   * This is the ambiguity check's input: an identity with more than one such
   * row has no way to say which live row a snapshot belongs to, because
   * `version_id` is NULL on every snapshot measured. Also reused to compute
   * `siblingIdsOutsideReportYear`, so it is fetched once per scope resolution
   * rather than twice.
   *
   * **NULL-safe (design.md §5.4.1; the T-04 precedent in
   * `public-link-normalizer.util.ts:154-163`, `dedupScopeSql`).**
   * `is_snapshot` is nullable with no database default — AICCRA is loaded by a
   * raw MySQL script with no ARI code path enforcing it. A bare
   * `is_snapshot = FALSE` does not match a NULL row, which would silently drop
   * it from this count: exactly the shape that lets a second, unnoticed live
   * row through the ambiguity guard in {@link resolveResultDeleteScope}. Read
   * via raw SQL with `COALESCE(is_snapshot, FALSE) = FALSE` — matching the
   * matching side's own rule — so a NULL row buckets **live**, the same as
   * `FALSE`, and is never simply absent from either bucket.
   */
  private async findLiveRowsForIdentity(
    seed: { result_official_code: number; platform_code?: string },
    manager: EntityManager,
  ): Promise<{ result_id: number; report_year_id: number | null }[]> {
    const rows: {
      result_id: number | string;
      report_year_id: number | string | null;
    }[] = await manager.query(
      `SELECT result_id, report_year_id
         FROM results
        WHERE result_official_code = ?
          AND platform_code = ?
          AND COALESCE(is_snapshot, FALSE) = FALSE`,
      [seed.result_official_code, seed.platform_code],
    );
    return rows.map((row) => ({
      result_id: Number(row.result_id),
      report_year_id:
        row.report_year_id === null || row.report_year_id === undefined
          ? null
          : Number(row.report_year_id),
    }));
  }

  /**
   * Resolves every `result_id` in the same logical result family as a LIVE
   * seed row. (A snapshot seed resolves to itself alone — see
   * {@link resolveResultDeleteScope} — and never reaches this method.)
   *
   * **Corrected 2026-08-04 (design.md §5.4.1, Pivot Record: T-07 in
   * execution.md).** A snapshot is a VERSION of a result, not a
   * reporting-year row of it, so one filter cannot govern both kinds of row.
   * Measured: the live row carries the *current* `report_year_id` while a
   * snapshot retains the year it was taken for — 451 of 574 snapshots (82%)
   * carry a year no live row of their identity shares. Scoping the whole
   * family by year therefore excluded a live row's own snapshots, orphaning
   * them in `results` with no live counterpart forever (every duplicate
   * participant set filters `is_snapshot = false`, so no later run could ever
   * see them again) — the exact permanent-invisibility failure this method
   * exists to prevent, produced by this method's prior revision.
   *
   * The family therefore splits by row kind:
   *  - **live siblings** — same identity, `COALESCE(is_snapshot, FALSE) =
   *    FALSE` (NULL buckets live — see {@link findLiveRowsForIdentity}),
   *    **year-scoped** against the seed's `report_year_id`. NULL-safe on the
   *    year too: rendered as a literal `report_year_id IS NULL` when the
   *    seed's year is NULL, never as a bound `= ?` parameter — TypeORM's
   *    find-options builder silently drops a `null`/`undefined` key instead
   *    of rendering `IS NULL` (`SelectQueryBuilder.js`: `if (where[key] ===
   *    undefined || where[key] === null) continue;`), which would have
   *    widened a NULL-year family to every year. This preserves the original
   *    T-07 fix — deleting a 2024 loser must not destroy a 2025 live row of
   *    the same identity.
   *  - **snapshots** — same identity, `COALESCE(is_snapshot, FALSE) = TRUE`
   *    (a row must be exactly `TRUE` to land here — see the live predicate
   *    above), **no year filter** — a snapshot is a version, not a
   *    reporting-year row.
   *  - **ordering** — snapshots first, the live row last. Unchanged and
   *    load-bearing: see {@link orderSnapshotsFirst}.
   *
   * Both queries are raw SQL rather than TypeORM find-options, for the same
   * reason as {@link findLiveRowsForIdentity}: `is_snapshot` and
   * `report_year_id` are both nullable with no database default, and a bare
   * equality predicate silently drops or widens on NULL instead of raising.
   *
   * Callers must first confirm the identity is unambiguous (at most one live
   * row) via {@link resolveResultDeleteScope}'s `refusalReason` — this method
   * does not itself guard against multiple live rows, and is not the reused
   * primitive `deleteResultFamily` locks against for the actual delete (which
   * re-derives the same split under `FOR UPDATE` inside its own transaction).
   */
  async findResultFamilyIds(
    resultId: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<number[]> {
    const seed = await this.findResultDeleteSeed(resultId, manager);
    if (!seed) return [];

    const reportYearId = seed.report_year_id ?? null;
    const yearIsNull = reportYearId === null;

    const liveSiblingRows: { result_id: number | string }[] =
      await manager.query(
        `SELECT result_id
           FROM results
          WHERE result_official_code = ?
            AND platform_code = ?
            AND COALESCE(is_snapshot, FALSE) = FALSE
            AND ${yearIsNull ? 'report_year_id IS NULL' : 'report_year_id = ?'}`,
        yearIsNull
          ? [seed.result_official_code, seed.platform_code]
          : [seed.result_official_code, seed.platform_code, reportYearId],
      );

    const snapshotRows: { result_id: number | string }[] = await manager.query(
      `SELECT result_id
           FROM results
          WHERE result_official_code = ?
            AND platform_code = ?
            AND COALESCE(is_snapshot, FALSE) = TRUE`,
      [seed.result_official_code, seed.platform_code],
    );

    return QueryService.orderSnapshotsFirst([
      ...snapshotRows.map((row) => ({
        result_id: Number(row.result_id),
        is_snapshot: true,
      })),
      ...liveSiblingRows.map((row) => ({
        result_id: Number(row.result_id),
        is_snapshot: false,
      })),
    ]);
  }

  /**
   * Full delete scope for a seed row, including what year scoping excluded
   * and, for a LIVE seed, whether the identity is ambiguous.
   *
   * Delete scope rules:
   *  - Live row (`is_snapshot = false`) → its snapshots (any year) plus its
   *    own year-scoped live row — {@link findResultFamilyIds} — *unless* the
   *    identity has more than one live row, in which case deletion refuses
   *    (`targetIds = []`, `refusalReason` set) rather than guessing which
   *    live row owns which snapshot.
   *  - Snapshot row (`is_snapshot = true`) → only the provided `result_id`.
   *    Never refused: a snapshot never expands, so there is nothing to guess.
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
        refusalReason: null,
      };
    }

    const reportYearId = seed.report_year_id ?? null;

    if (seed.is_snapshot === true) {
      const liveRowsForIdentity = await this.findLiveRowsForIdentity(
        seed,
        manager,
      );
      const siblingIdsOutsideReportYear = liveRowsForIdentity
        .filter((row) => row.report_year_id !== reportYearId)
        .map((row) => row.result_id);

      return {
        seedId: seed.result_id,
        isSnapshot: true,
        reportYearId,
        targetIds: [seed.result_id],
        siblingIdsOutsideReportYear,
        refusalReason: null,
      };
    }

    // Live seed: the identity must have exactly one live row before any
    // snapshot sweep is safe to plan.
    const liveRowsForIdentity = await this.findLiveRowsForIdentity(
      seed,
      manager,
    );

    if (liveRowsForIdentity.length > 1) {
      return {
        seedId: seed.result_id,
        isSnapshot: false,
        reportYearId,
        targetIds: [],
        siblingIdsOutsideReportYear: liveRowsForIdentity
          .filter((row) => row.result_id !== seed.result_id)
          .map((row) => row.result_id),
        refusalReason: ResultDeleteRefusalReason.AMBIGUOUS_LIVE_ROWS,
      };
    }

    const targetIds = await this.findResultFamilyIds(seed.result_id, manager);

    return {
      seedId: seed.result_id,
      isSnapshot: false,
      reportYearId,
      targetIds,
      // liveRowsForIdentity has exactly one row here — the seed — so this is
      // always empty; computed rather than hard-coded so a future change to
      // the ambiguity check is not silently unrepresented here too.
      siblingIdsOutsideReportYear: liveRowsForIdentity
        .filter(
          (row) =>
            row.result_id !== seed.result_id &&
            row.report_year_id !== reportYearId,
        )
        .map((row) => row.result_id),
      refusalReason: null,
    };
  }

  /**
   * Resolves which `result_id` values should be deleted for a given seed row.
   *
   * Retained for callers that only need the ids; prefer
   * {@link resolveResultDeleteScope}, which also reports what year scoping
   * excluded and whether the identity is ambiguous. An ambiguous identity
   * resolves to an empty array here — the same array shape as "nothing to
   * delete" for any other reason, since this API has no room for `why`.
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
   * Four properties, each fixing a defect in a previous implementation:
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
   *  4. **An identity with more than one live row refuses rather than guesses.**
   *     Re-derived under `FOR UPDATE`, independently of
   *     {@link resolveResultDeleteScope}, so a live row inserted between a
   *     caller's plan and this call cannot make the delete proceed on stale
   *     information. Refusal returns a single {@link ResultDeleteStatus.REFUSED}
   *     outcome for the seed and touches nothing — never a partial delete.
   *
   * For a live seed, deletion order is snapshots first, the live row last: the
   * live row is the anchor any later re-resolution starts from, so it is the
   * last thing to go.
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

      let targetIds: number[];

      if (seed.is_snapshot === true) {
        targetIds = [seed.result_id];
      } else {
        // NULL-safe (design.md §5.4.1; the T-04 precedent in
        // public-link-normalizer.util.ts:154-163): is_snapshot is nullable
        // with no database default, so a bare `is_snapshot = 0` would drop a
        // NULL row from the lock and from this count — letting a second,
        // unnoticed live row through the ambiguity guard below. Every row of
        // the identity lands in exactly one bucket via COALESCE.
        const liveRows: { result_id: number | string }[] = await manager.query(
          `SELECT result_id
               FROM results
              WHERE result_official_code = ?
                AND platform_code = ?
                AND COALESCE(is_snapshot, FALSE) = FALSE
              FOR UPDATE`,
          [seed.result_official_code, seed.platform_code],
        );

        if (liveRows.length > 1) {
          // Ownership of the identity's snapshots is undecidable — never
          // guess, never partially delete. Nothing is touched: no snapshot
          // query, no routine call.
          return [
            { resultId: seed.result_id, status: ResultDeleteStatus.REFUSED },
          ];
        }

        const snapshotRows: { result_id: number | string }[] =
          await manager.query(
            `SELECT result_id
               FROM results
              WHERE result_official_code = ?
                AND platform_code = ?
                AND COALESCE(is_snapshot, FALSE) = TRUE
              FOR UPDATE`,
            [seed.result_official_code, seed.platform_code],
          );

        targetIds = QueryService.orderSnapshotsFirst([
          ...snapshotRows.map((row) => ({
            result_id: Number(row.result_id),
            is_snapshot: true,
          })),
          { result_id: seed.result_id, is_snapshot: false },
        ]);
      }

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

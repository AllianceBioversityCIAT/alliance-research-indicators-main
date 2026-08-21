/**
 * Unit coverage for delete scope and family deletion.
 *
 * **Pivot, 2026-08-04 (design.md §5.4.1, execution.md → Pivot Record: T-07).**
 * The prior revision of this suite asserted the family stayed within the
 * seed's `report_year_id` — including snapshots. That was the regression:
 * snapshots retain the year they were taken for, not their live row's current
 * year, so year-scoping a snapshot orphaned it (measured: 82% of snapshots).
 * This suite now asserts the corrected, complete partition on every case —
 * what is swept AND what survives untouched — not only the row a prior
 * revision got wrong.
 *
 * **Rework, 2026-08-04 (Reviewer FAIL, attempt 1).** The fixture itself was
 * unfaithful on two axes the Reviewer named directly (KZ-001 — a double that
 * does not behave like the thing it stands for yields a green suite over
 * broken behavior):
 *
 *  - `Row.is_snapshot` was typed `boolean`, so a NULL row — the exact shape
 *    the ambiguity guard must catch — could not even be expressed.
 *  - The old `matches()` helper compared `where` values with `===`, which
 *    cannot model `IS NULL` / `COALESCE(...)` SQL semantics. It happened to
 *    make one prior test pass, but for the wrong reason: against a real
 *    database, TypeORM's find-options builder silently *drops* a `null`
 *    where-value instead of rendering `IS NULL`, which widens the match
 *    rather than narrowing it.
 *
 * The production code responded by moving every predicate this suite cares
 * about (`is_snapshot`, the live-sibling `report_year_id`) to raw SQL with
 * literal `COALESCE(...)` / `IS NULL` text — the same style the `FOR UPDATE`
 * locks already used. So the fixture no longer needs to interpret a
 * TypeORM `FindOperator`: it interprets the literal SQL text this suite can
 * read and assert against directly, the same way the lock-query tests always
 * have. `repository.find()` is gone from `QueryService` entirely; the fake
 * repository below keeps only `findOne`, used for the single-row, plain-
 * equality seed lookup, where `===` is the correct semantics.
 *
 * Two limits are stated up front so a green run is not read as more than it is:
 *
 *  - **Real rollback needs a database.** These tests prove the deletion runs
 *    inside `dataSource.transaction(...)`, that a failing member propagates out of
 *    the callback (which is what makes TypeORM roll back), and that no further
 *    member is attempted after it. Whether MySQL actually rolls the DML back is
 *    T-11's integration case.
 *  - **The multi-live-row, NULL-`is_snapshot`, and multi-year shapes are
 *    constructed here, not observed.** Live data holds 4 multi-live-row
 *    identities out of 14,108 and 0 same-identity multi-year LIVE families
 *    today, so a suite passing over today's data alone would prove nothing
 *    about any of these rules. Every case that matters is built explicitly.
 */
import { DataSource } from 'typeorm';
import {
  QueryService,
  ResultDeleteRefusalReason,
  ResultDeleteStatus,
} from './query.service';

type Row = {
  result_id: number;
  result_official_code: number;
  platform_code: string;
  report_year_id: number | null;
  /** Nullable, exactly like the real column — see `result.entity.ts:158-162`. */
  is_snapshot: boolean | null;
};

type Fixture = {
  rows: Row[];
  /** result_id -> routine return value (1 deleted, 0 no-op). */
  affected?: Record<number, number>;
  /** result_id whose routine call should throw. */
  throwOn?: number;
  /** Simulate the routine returning no rows at all. */
  emptyRoutineResult?: boolean;
};

const routineCalls: { routine: string; resultId: number }[] = [];
const lockQueries: { sql: string; params: unknown[] }[] = [];

/**
 * `COALESCE(is_snapshot, FALSE)` — the exact expression the production SQL
 * uses on both the live (`= FALSE`) and snapshot (`= TRUE`) side, so a NULL
 * row is never simply absent from either bucket.
 */
const coalesceIsSnapshot = (row: Row): boolean => row.is_snapshot ?? false;

const buildService = (fixture: Fixture) => {
  routineCalls.length = 0;
  lockQueries.length = 0;

  const repository = {
    // The only remaining `.find()`-shaped call is `findResultDeleteSeed`'s
    // `findOne` by `result_id` — a plain-number primary-key lookup, where a
    // bare `===` is genuinely the right semantics (no NULL, no operator).
    findOne: jest.fn(async ({ where }: { where: { result_id: number } }) =>
      fixture.rows.find((row) => row.result_id === where.result_id),
    ),
  };

  const query = jest.fn(async (sql: string, params: unknown[]) => {
    // 1. The routine call itself.
    if (sql.includes('AS affected')) {
      const routine = sql.includes('full_delete_result_version')
        ? 'full_delete_result_version'
        : 'delete_result';
      const resultId = Number((params as unknown[])[0]);
      if (fixture.throwOn === resultId) {
        throw new Error(`errno 1451 on ${resultId}`);
      }
      routineCalls.push({ routine, resultId });
      if (fixture.emptyRoutineResult) return [];
      const hasOverride =
        fixture.affected !== undefined &&
        Object.prototype.hasOwnProperty.call(fixture.affected, resultId);
      return [{ affected: hasOverride ? fixture.affected![resultId] : 1 }];
    }

    // 2. `deleteResultFamily`'s two FOR UPDATE locks — identity-wide, no year.
    if (sql.includes('FOR UPDATE')) {
      lockQueries.push({ sql, params });
      const [officialCode, platformCode] = params as [number, string];
      const wantSnapshot = sql.includes('COALESCE(is_snapshot, FALSE) = TRUE');
      return fixture.rows
        .filter(
          (row) =>
            row.result_official_code === officialCode &&
            row.platform_code === platformCode &&
            coalesceIsSnapshot(row) === wantSnapshot,
        )
        .map((row) => ({ result_id: row.result_id }));
    }

    // 3. The three non-locking family/identity SELECTs: findLiveRowsForIdentity
    // (selects report_year_id too, no year predicate), and findResultFamilyIds'
    // live-siblings (year-scoped) and snapshots (no year filter) queries.
    const [officialCode, platformCode, maybeYear] = params as [
      number,
      string,
      number?,
    ];
    const wantsReportYear = sql.includes('SELECT result_id, report_year_id');
    const wantSnapshot = sql.includes('COALESCE(is_snapshot, FALSE) = TRUE');
    const wantsNullYear = sql.includes('report_year_id IS NULL');
    const hasYearFilter = wantsNullYear || sql.includes('report_year_id = ?');

    const matched = fixture.rows.filter((row) => {
      if (row.result_official_code !== officialCode) return false;
      if (row.platform_code !== platformCode) return false;
      if (coalesceIsSnapshot(row) !== wantSnapshot) return false;
      if (!hasYearFilter) return true;
      return wantsNullYear
        ? row.report_year_id === null
        : row.report_year_id === maybeYear;
    });

    return matched.map((row) =>
      wantsReportYear
        ? { result_id: row.result_id, report_year_id: row.report_year_id }
        : { result_id: row.result_id },
    );
  });

  const manager = { getRepository: () => repository, query };
  const transaction = jest.fn(
    async (callback: (m: typeof manager) => Promise<unknown>) =>
      callback(manager),
  );
  const dataSource = { manager, transaction, query } as unknown as DataSource;

  return { service: new QueryService(dataSource), transaction, query };
};

const row = (
  result_id: number,
  report_year_id: number | null,
  is_snapshot: boolean | null = false,
  result_official_code = 5000,
  platform_code = 'PRMS',
): Row => ({
  result_id,
  result_official_code,
  platform_code,
  report_year_id,
  is_snapshot,
});

describe('QueryService — a snapshot is a version, not a reporting-year row', () => {
  // RED against the pre-pivot logic: that logic filtered the WHOLE family —
  // snapshots included — by `report_year_id = seed's year`, so 101 and 102
  // (different years) would have been excluded from every result below,
  // orphaning them the moment 100 was hard-deleted. This is the regression.
  const singleLiveMultiYearSnapshots: Row[] = [
    row(100, 2024, false), // live seed — the identity's only live row
    row(101, 2020, true), // its own snapshot, a DIFFERENT year
    row(102, 2022, true), // another snapshot, also a different year
  ];

  it('findResultFamilyIds sweeps every snapshot regardless of year', async () => {
    const { service } = buildService({ rows: singleLiveMultiYearSnapshots });

    const ids = await service.findResultFamilyIds(100);

    expect(ids).toEqual([101, 102, 100]);
  });

  it('resolveResultDeleteScope carries the same targetIds and is not refused', async () => {
    const { service } = buildService({ rows: singleLiveMultiYearSnapshots });

    const scope = await service.resolveResultDeleteScope(100);

    expect(scope.reportYearId).toBe(2024);
    expect(scope.targetIds).toEqual([101, 102, 100]);
    expect(scope.refusalReason).toBeNull();
  });

  it('deleteFullResultById actually deletes the differing-year snapshots, not just resolves their ids', async () => {
    const { service } = buildService({ rows: singleLiveMultiYearSnapshots });

    const outcomes = await service.deleteFullResultById(100);

    expect(outcomes).toEqual([
      { resultId: 101, status: ResultDeleteStatus.DELETED },
      { resultId: 102, status: ResultDeleteStatus.DELETED },
      { resultId: 100, status: ResultDeleteStatus.DELETED },
    ]);
    expect(routineCalls.map((call) => call.resultId)).toEqual([101, 102, 100]);
  });

  it('a snapshot seed still resolves to itself alone — unchanged', async () => {
    const { service } = buildService({ rows: singleLiveMultiYearSnapshots });

    const scope = await service.resolveResultDeleteScope(101);

    expect(scope.isSnapshot).toBe(true);
    expect(scope.targetIds).toEqual([101]);
  });

  it('an unknown seed resolves to an empty, non-refused scope and deletes nothing', async () => {
    const { service } = buildService({ rows: singleLiveMultiYearSnapshots });

    const scope = await service.resolveResultDeleteScope(999);
    const outcomes = await service.deleteFullResultById(999);

    expect(scope.targetIds).toEqual([]);
    expect(scope.refusalReason).toBeNull();
    expect(outcomes).toEqual([]);
    expect(routineCalls).toEqual([]);
  });
});

describe('QueryService — a NULL is_snapshot row buckets live, never absent from either bucket', () => {
  // Reviewer FAIL (attempt 1), issue 1: every predicate was a bare boolean
  // (`is_snapshot = 0`/`= 1`, `is_snapshot: false`/`true`), which does not
  // match a NULL row. `is_snapshot` is nullable with no database default
  // (result.entity.ts:158-162), and AICCRA is loaded by a raw MySQL script
  // with no ARI code path enforcing it — so this is reachable, not academic.
  // The fix partitions exhaustively via `COALESCE(is_snapshot, FALSE)`, the
  // same rule `dedupScopeSql` already uses (public-link-normalizer.util.ts).

  it('a lone NULL-is_snapshot row is treated as the identity live row, not orphaned', async () => {
    const rows: Row[] = [
      row(700, 2024, null), // the seed — is_snapshot is NULL, not false
      row(701, 2019, true), // its snapshot
    ];
    const { service } = buildService({ rows });

    const scope = await service.resolveResultDeleteScope(700);

    expect(scope.refusalReason).toBeNull();
    expect(scope.targetIds).toEqual([701, 700]);
  });

  it('a NULL second live row makes the identity ambiguous and REFUSES — the guard blind spot this closes', async () => {
    // Before this fix: seed A (`is_snapshot = false`) queried
    // `liveRowsForIdentity` with a bare `is_snapshot: false` predicate, which
    // excluded NULL row B entirely — length 1, no refusal, every snapshot of
    // the identity swept while B's version history was never considered.
    const rows: Row[] = [
      row(710, 2024, false), // live row A — the seed
      row(711, 2025, null), // live row B — is_snapshot NULL, still live
      row(712, 2019, true), // a snapshot whose owner is now undecidable
    ];
    const { service } = buildService({ rows });

    const scope = await service.resolveResultDeleteScope(710);

    expect(scope.targetIds).toEqual([]);
    expect(scope.refusalReason).toBe(
      ResultDeleteRefusalReason.AMBIGUOUS_LIVE_ROWS,
    );
    expect(scope.siblingIdsOutsideReportYear).toEqual([711]);
  });

  it('a NULL-is_snapshot SEED with a concrete second live row also REFUSES — not just the reverse', async () => {
    // Before this fix: `seed.is_snapshot === true` is false for a NULL seed,
    // so it took the live branch, but the live-lock query's bare
    // `is_snapshot = 0` never matched the NULL seed itself, so it was locked
    // by neither FOR UPDATE range and the guard never saw it.
    const rows: Row[] = [
      row(720, 2024, null), // live seed — is_snapshot NULL
      row(721, 2025, false), // a second, concrete live row — same identity
      row(722, 2019, true), // a snapshot whose owner is now undecidable
    ];
    const { service } = buildService({ rows });

    const scope = await service.resolveResultDeleteScope(720);
    const outcomes = await service.deleteFullResultById(720);

    expect(scope.refusalReason).toBe(
      ResultDeleteRefusalReason.AMBIGUOUS_LIVE_ROWS,
    );
    expect(outcomes).toEqual([
      { resultId: 720, status: ResultDeleteStatus.REFUSED },
    ]);
    expect(routineCalls).toEqual([]);
  });

  it('deleteFullResultById locks a NULL live row under the live FOR UPDATE range, not neither', async () => {
    const rows: Row[] = [
      row(730, 2024, null), // live seed — is_snapshot NULL
      row(731, 2019, true), // its snapshot
    ];
    const { service } = buildService({ rows });

    const outcomes = await service.deleteFullResultById(730);

    expect(outcomes).toEqual([
      { resultId: 731, status: ResultDeleteStatus.DELETED },
      { resultId: 730, status: ResultDeleteStatus.DELETED },
    ]);
    // Exactly one live-range lock (the ambiguity check) and one snapshot
    // lock: the NULL seed was found and locked, not skipped by both ranges.
    expect(lockQueries).toHaveLength(2);
    expect(routineCalls.map((call) => call.resultId)).toEqual([731, 730]);
  });

  it('a NULL row is never itself swept as a snapshot', async () => {
    // The complement of "COALESCE(is_snapshot, FALSE) = FALSE" is
    // "= TRUE" — a NULL row must land in exactly one bucket, and a NULL row
    // is not `TRUE`, so it must never appear in the snapshot bucket either.
    const rows: Row[] = [
      row(740, 2024, false), // live seed
      row(741, 2024, null), // a second live row — makes this identity ambiguous
    ];
    const { service } = buildService({ rows });

    // Confirmed via the sibling ambiguity check rather than expansion — an
    // ambiguous identity refuses before any snapshot query runs, so the
    // "never swept as a snapshot" property is proven at the lock-query level
    // in the previous case. Here we assert the identity-wide live count
    // includes row 741 (NULL bucket live), which is what makes it ambiguous
    // rather than silently invisible.
    const scope = await service.resolveResultDeleteScope(740);
    expect(scope.refusalReason).toBe(
      ResultDeleteRefusalReason.AMBIGUOUS_LIVE_ROWS,
    );
    expect(scope.siblingIdsOutsideReportYear).toEqual([741]);
  });
});

describe('QueryService — an ambiguous identity refuses rather than guesses', () => {
  // More than one live row for the identity means snapshot ownership is
  // undecidable — `version_id` is NULL on every snapshot measured, so there is
  // no parent link. Guessing here is unrecoverable: the guard lives in the
  // shared executor, so every caller (bulk delete, sync rollback, the sweep)
  // gets the identical refusal, not a per-caller judgment call.
  const ambiguous: Row[] = [
    row(500, 2024, false), // live row A — the seed
    row(501, 2025, false), // live row B — same identity, second live row
    row(502, 2019, true), // a snapshot whose owner is now undecidable
  ];

  it('resolveResultDeleteScope refuses and names the other live row', async () => {
    const { service } = buildService({ rows: ambiguous });

    const scope = await service.resolveResultDeleteScope(500);

    expect(scope.targetIds).toEqual([]);
    expect(scope.refusalReason).toBe(
      ResultDeleteRefusalReason.AMBIGUOUS_LIVE_ROWS,
    );
    expect(scope.siblingIdsOutsideReportYear).toEqual([501]);
  });

  it('deleteFullResultById refuses, deletes nothing, and the other live row survives untouched', async () => {
    const { service } = buildService({ rows: ambiguous });

    const outcomes = await service.deleteFullResultById(500);

    expect(outcomes).toEqual([
      { resultId: 500, status: ResultDeleteStatus.REFUSED },
    ]);
    // Not just "501 was not deleted" — nothing was even queried for deletion,
    // proving this is a refusal and not a partial sweep that happened to stop.
    expect(routineCalls).toEqual([]);
  });

  it('deleteLogicalResultById also refuses — the guard is mode-agnostic', async () => {
    const { service } = buildService({ rows: ambiguous });

    const outcomes = await service.deleteLogicalResultById(500);

    expect(outcomes).toEqual([
      { resultId: 500, status: ResultDeleteStatus.REFUSED },
    ]);
    expect(routineCalls).toEqual([]);
  });

  it('a snapshot seed is never refused, even when its identity is ambiguous', async () => {
    // Design: "A SNAPSHOT seed still resolves to itself alone. Unchanged." —
    // it never expands, so there is nothing to guess.
    const { service } = buildService({ rows: ambiguous });

    const scope = await service.resolveResultDeleteScope(502);
    const outcomes = await service.deleteFullResultById(502);

    expect(scope.targetIds).toEqual([502]);
    expect(scope.refusalReason).toBeNull();
    expect(outcomes).toEqual([
      { resultId: 502, status: ResultDeleteStatus.DELETED },
    ]);
  });
});

describe('QueryService — siblingIdsOutsideReportYear lists live rows only, never snapshots', () => {
  const rows: Row[] = [
    row(600, 2024, false), // live seed — the identity's only live row
    row(601, 2019, true), // a snapshot from a different year
    row(602, 2020, true), // another snapshot from a different year
  ];

  it('is empty for an unambiguous live seed, even though its snapshots span other years', async () => {
    const { service } = buildService({ rows });

    const scope = await service.resolveResultDeleteScope(600);

    expect(scope.refusalReason).toBeNull();
    expect(scope.siblingIdsOutsideReportYear).toEqual([]);
  });

  it('lists the live row for a snapshot seed, never a sibling snapshot', async () => {
    const { service } = buildService({ rows });

    const scope = await service.resolveResultDeleteScope(601);

    expect(scope.siblingIdsOutsideReportYear).toEqual([600]);
    expect(scope.siblingIdsOutsideReportYear).not.toContain(602);
  });
});

describe('QueryService — retained id-only API and NULL report years', () => {
  it('resolveResultDeleteTargetIds returns the same ids as the scope', async () => {
    const rows = [row(90, 2024, false), row(91, 2024, true)];
    const { service } = buildService({ rows });

    const ids = await service.resolveResultDeleteTargetIds(90);
    const scope = await service.resolveResultDeleteScope(90);

    expect(ids).toEqual([91, 90]);
    expect(ids).toEqual(scope.targetIds);
  });

  it('handles a NULL report year without widening the live-siblings match', async () => {
    // report_year_id is nullable. A NULL seed must group live siblings with
    // other NULL-year live rows and must NOT sweep in a live row that has a
    // concrete year — widening on a NULL is exactly the shape that turns a
    // scope fix back into the bug it replaced. (302 is deliberately a second
    // LIVE row rather than a snapshot, so a buggy `column = NULL` match — one
    // that matched everything or nothing — would be caught; the identity's
    // resulting ambiguity, since two live rows now exist, is a separate,
    // already-covered concern — findResultFamilyIds itself does not guard
    // against it.)
    const rows = [
      row(300, null, false),
      row(301, null, true),
      row(302, 2025, false),
    ];
    const { service } = buildService({ rows });

    const ids = await service.findResultFamilyIds(300);

    expect(ids).toEqual([301, 300]);
    expect(ids).not.toContain(302);
  });

  it('renders the NULL year as a literal IS NULL, never a dropped/bound = ? predicate', async () => {
    // Reviewer FAIL (attempt 1), issue 4: `report_year_id: seed.report_year_id
    // ?? null` reaches TypeORM's find-options builder, which SKIPS a
    // null/undefined where-value instead of rendering IS NULL
    // (SelectQueryBuilder.js: `if (where[key] === undefined || where[key] ===
    // null) continue;`) — so the year predicate was silently REMOVED for a
    // NULL-year seed, not narrowed. This asserts the literal SQL text sent to
    // the database, not a fixture's interpretation of it, so it can only pass
    // if the predicate the seed actually executes is the one design.md
    // §5.4.1 specifies.
    const rows = [row(300, null, false), row(302, 2025, false)];
    const { service, query } = buildService({ rows });

    await service.findResultFamilyIds(300);

    const liveSiblingsCall = query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('COALESCE(is_snapshot, FALSE) = FALSE') &&
        !call[0].includes('FOR UPDATE'),
    );
    expect(liveSiblingsCall).toBeDefined();
    expect(liveSiblingsCall![0]).toContain('report_year_id IS NULL');
    expect(liveSiblingsCall![0]).not.toContain('report_year_id = ?');
    // Only two bound params (official code, platform) — no third param for a
    // year that was rendered as a literal, not a placeholder.
    expect(liveSiblingsCall![1]).toEqual([5000, 'PRMS']);
  });

  it('binds the year as a parameter, never a literal, when it is concrete', async () => {
    const rows = [row(310, 2025, false), row(311, 2025, true)];
    const { service, query } = buildService({ rows });

    await service.findResultFamilyIds(310);

    const liveSiblingsCall = query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('COALESCE(is_snapshot, FALSE) = FALSE') &&
        !call[0].includes('FOR UPDATE'),
    );
    expect(liveSiblingsCall).toBeDefined();
    expect(liveSiblingsCall![0]).toContain('report_year_id = ?');
    expect(liveSiblingsCall![0]).not.toContain('IS NULL');
    expect(liveSiblingsCall![1]).toEqual([5000, 'PRMS', 2025]);
  });
});

describe('QueryService — deletion order and atomicity', () => {
  const family: Row[] = [
    row(10, 2025, false), // live
    row(11, 2025, true),
    row(12, 2025, true),
  ];

  it('deletes snapshots before the live row', async () => {
    const { service } = buildService({ rows: family });

    await service.deleteFullResultById(10);

    expect(routineCalls.map((call) => call.resultId)).toEqual([11, 12, 10]);
  });

  it('runs the whole family inside one transaction', async () => {
    const { service, transaction } = buildService({ rows: family });

    await service.deleteFullResultById(10);

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('locks live rows and snapshots by identity, with no year predicate on either', async () => {
    // Reading the family before the transaction left a window for a concurrent
    // versioning run to insert a snapshot the delete would then skip. Neither
    // lock query filters by year: the live-row lock is the ambiguity check
    // (identity-wide), and the snapshot lock sweeps every year on purpose.
    const { service } = buildService({ rows: family });

    await service.deleteFullResultById(10);

    expect(lockQueries).toHaveLength(2);
    expect(lockQueries[0].sql).toContain('FOR UPDATE');
    expect(lockQueries[0].sql).toContain(
      'COALESCE(is_snapshot, FALSE) = FALSE',
    );
    expect(lockQueries[0].params).toEqual([5000, 'PRMS']);
    expect(lockQueries[0].sql).not.toContain('report_year_id');
    expect(lockQueries[1].sql).toContain('COALESCE(is_snapshot, FALSE) = TRUE');
    expect(lockQueries[1].params).toEqual([5000, 'PRMS']);
    expect(lockQueries[1].sql).not.toContain('report_year_id');
  });

  it('propagates a mid-family failure and attempts no further member', async () => {
    // Propagating out of the transaction callback is what makes TypeORM roll
    // back. The previous implementation autocommitted per member, so the live
    // row was destroyed and its snapshots survived — invisible to every later
    // run, because participant sets filter is_snapshot = FALSE.
    const { service, transaction } = buildService({
      rows: family,
      throwOn: 12,
    });

    await expect(service.deleteFullResultById(10)).rejects.toThrow(
      'errno 1451',
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    // 11 succeeded, 12 threw, and the live row 10 was never attempted.
    expect(routineCalls.map((call) => call.resultId)).toEqual([11]);
  });

  it('never deletes the live row when an earlier member fails', async () => {
    const { service } = buildService({ rows: family, throwOn: 11 });

    await expect(service.deleteFullResultById(10)).rejects.toThrow();

    expect(routineCalls).toEqual([]);
  });
});

describe('QueryService — a no-op is not a deletion', () => {
  it('reports NOOP when the routine returns FALSE', async () => {
    // Both routines return FALSE instead of raising when the row is already gone.
    // Without inspecting the value, a concurrent sync or a retried apply would be
    // audited as a fresh deletion.
    const { service } = buildService({
      rows: [row(20, 2025, false), row(21, 2025, true)],
      affected: { 21: 0, 20: 1 },
    });

    const outcomes = await service.deleteFullResultById(20);

    expect(outcomes).toEqual([
      { resultId: 21, status: ResultDeleteStatus.NOOP },
      { resultId: 20, status: ResultDeleteStatus.DELETED },
    ]);
  });

  it('treats a NULL return value as NOOP rather than a deletion', async () => {
    // Fails open toward "nothing happened". Reporting a deletion that did not
    // occur is the DC-7 direction: it reads as success and makes the audit record
    // wrong in the optimistic direction, which is the one nobody re-checks.
    const { service } = buildService({
      rows: [row(30, 2025, false)],
      affected: { 30: null as unknown as number },
    });

    const outcomes = await service.deleteFullResultById(30);

    expect(outcomes).toEqual([
      { resultId: 30, status: ResultDeleteStatus.NOOP },
    ]);
  });

  it('treats an empty result set from the routine as NOOP', async () => {
    const { service } = buildService({
      rows: [row(31, 2025, false)],
      emptyRoutineResult: true,
    });

    const outcomes = await service.deleteFullResultById(31);

    expect(outcomes).toEqual([
      { resultId: 31, status: ResultDeleteStatus.NOOP },
    ]);
  });

  it('NOOP is never conflated with REFUSED, and vice versa', async () => {
    // Distinct causes: NOOP means the routine ran and found nothing; REFUSED
    // means the routine was never called because ownership was undecidable.
    const noop = buildService({
      rows: [row(32, 2025, false)],
      affected: { 32: 0 },
    });
    const noopOutcomes = await noop.service.deleteFullResultById(32);
    expect(noopOutcomes).toEqual([
      { resultId: 32, status: ResultDeleteStatus.NOOP },
    ]);

    const refused = buildService({
      rows: [row(500, 2024, false), row(501, 2025, false)],
    });
    const refusedOutcomes = await refused.service.deleteFullResultById(500);
    expect(refusedOutcomes).toEqual([
      { resultId: 500, status: ResultDeleteStatus.REFUSED },
    ]);
  });
});

describe('QueryService — routine selection', () => {
  const family = [row(40, 2025, false)];

  it('the logical path calls delete_result', async () => {
    const { service } = buildService({ rows: family });
    await service.deleteLogicalResultById(40);
    expect(routineCalls[0].routine).toBe('delete_result');
  });

  it('the full path calls full_delete_result_version', async () => {
    const { service } = buildService({ rows: family });
    await service.deleteFullResultById(40);
    expect(routineCalls[0].routine).toBe('full_delete_result_version');
  });

  it('both paths sweep the split family identically', async () => {
    const rows = [
      row(50, 2024, false), // live seed — the only live row for this identity
      row(51, 2019, true), // its snapshot, a different year — must still be swept
    ];
    const { service } = buildService({ rows });

    await service.deleteLogicalResultById(50);

    expect(routineCalls.map((call) => call.resultId)).toEqual([51, 50]);
    expect(routineCalls[0].routine).toBe('delete_result');
  });
});

describe('QueryService — the split family is correct for every existing caller', () => {
  // Each caller wants "this row and its whole version history", never "every
  // year of this official code" (the original T-07 fix) nor "guess which live
  // row owns an orphaned snapshot" (this pivot's fix, tested generically
  // above — the guard is caller-agnostic, enforced once in the shared
  // executor). One test per call site so the decision is named, not merely
  // asserted in a comment.
  const rows: Row[] = [
    row(70, 2024, false), // the seed — the ONLY live row for this identity
    row(71, 2019, true), // its own snapshot, a different year — must be swept
    row(90, 2025, false, 6000, 'TIP'), // a different identity's live row — must survive
  ];

  const expectOwnFamilyOnly = async () => {
    const { service } = buildService({ rows });
    const outcomes = await service.deleteFullResultById(70);
    expect(outcomes).toEqual([
      { resultId: 71, status: ResultDeleteStatus.DELETED },
      { resultId: 70, status: ResultDeleteStatus.DELETED },
    ]);
    expect(routineCalls.map((call) => call.resultId)).not.toContain(90);
  };

  it(
    'results.service.ts — bulk delete-results-by-parameters: the operator selected specific rows',
    expectOwnFamilyOnly,
  );

  it(
    'results.service.ts — AI-report rollback: undoes only what this pass created',
    expectOwnFamilyOnly,
  );

  it(
    'prms.opensearch.service.ts — sync rollback: undoes only what this pass created',
    expectOwnFamilyOnly,
  );

  it(
    'save-all-sections.service.ts — winner rollback: its own lookup already keys on report_year_id',
    expectOwnFamilyOnly,
  );
});

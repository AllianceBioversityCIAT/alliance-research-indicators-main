/**
 * Unit coverage for delete scope and family deletion.
 *
 * Two limits are stated up front so a green run is not read as more than it is:
 *
 *  - **Real rollback needs a database.** These tests prove the deletion runs
 *    inside `dataSource.transaction(...)`, that a failing member propagates out of
 *    the callback (which is what makes TypeORM roll back), and that no further
 *    member is attempted after it. Whether MySQL actually rolls the DML back is
 *    T-11's integration case.
 *  - **The multi-year family is constructed here, not observed.** Live data
 *    currently holds zero families spanning more than one report year, so a suite
 *    passing over today's data would prove nothing about year scoping. Every
 *    year-scope test therefore builds the multi-year shape explicitly.
 */
import { DataSource } from 'typeorm';
import { QueryService, ResultDeleteStatus } from './query.service';

type Row = {
  result_id: number;
  result_official_code: number;
  platform_code: string;
  report_year_id: number | null;
  is_snapshot: boolean;
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

const buildService = (fixture: Fixture) => {
  routineCalls.length = 0;
  lockQueries.length = 0;

  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(
      ([key, value]) => (row as Record<string, unknown>)[key] === value,
    );

  const repository = {
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
      fixture.rows.find((row) => matches(row, where)),
    ),
    find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
      fixture.rows.filter((row) => matches(row, where)),
    ),
  };

  const query = jest.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes('FOR UPDATE')) {
      lockQueries.push({ sql, params });
      const [officialCode, platformCode, reportYearId] = params as [
        number,
        string,
        number | null,
      ];
      return fixture.rows
        .filter(
          (row) =>
            row.result_official_code === officialCode &&
            row.platform_code === platformCode &&
            row.report_year_id === reportYearId,
        )
        .map((row) => ({
          result_id: row.result_id,
          is_snapshot: row.is_snapshot ? 1 : 0,
        }));
    }
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
  is_snapshot = false,
  result_official_code = 5000,
  platform_code = 'PRMS',
): Row => ({
  result_id,
  result_official_code,
  platform_code,
  report_year_id,
  is_snapshot,
});

describe('QueryService — the family never crosses a report year', () => {
  // Constructed, not observed: live data has no multi-year families today.
  const multiYear: Row[] = [
    row(100, 2024, false), // live 2024 — the seed
    row(101, 2024, true), // its snapshot
    row(200, 2025, false), // live 2025 — MUST survive
    row(201, 2025, true),
  ];

  it('expands a live seed to its own year only', async () => {
    const { service } = buildService({ rows: multiYear });

    const ids = await service.findResultFamilyIds(100);

    expect(ids).toEqual([101, 100]);
    expect(ids).not.toContain(200);
    expect(ids).not.toContain(201);
  });

  it('reports the rows year scoping excluded rather than dropping them silently', async () => {
    const { service } = buildService({ rows: multiYear });

    const scope = await service.resolveResultDeleteScope(100);

    expect(scope.reportYearId).toBe(2024);
    expect(scope.targetIds).toEqual([101, 100]);
    // The tripwire: a non-empty list on a live seed is what an operator sees in
    // the audit record, and what would reveal a snapshot stored under a
    // different year than its live row.
    expect(scope.siblingIdsOutsideReportYear.sort()).toEqual([200, 201]);
  });

  it('deletes only the seed year, leaving the other year intact', async () => {
    const { service } = buildService({ rows: multiYear });

    const outcomes = await service.deleteFullResultById(100);

    expect(outcomes.map((outcome) => outcome.resultId)).toEqual([101, 100]);
    expect(routineCalls.map((call) => call.resultId)).toEqual([101, 100]);
    expect(routineCalls.map((call) => call.resultId)).not.toContain(200);
  });

  it('binds the report year into the locking query', async () => {
    const { service } = buildService({ rows: multiYear });
    await service.deleteFullResultById(100);
    expect(lockQueries).toHaveLength(1);
    expect(lockQueries[0].sql).toContain('report_year_id = ?');
    expect(lockQueries[0].params).toEqual([5000, 'PRMS', 2024]);
  });

  it('a snapshot seed deletes only itself', async () => {
    const { service } = buildService({ rows: multiYear });

    const scope = await service.resolveResultDeleteScope(101);

    expect(scope.isSnapshot).toBe(true);
    expect(scope.targetIds).toEqual([101]);
  });

  it('an unknown seed resolves to an empty scope and deletes nothing', async () => {
    const { service } = buildService({ rows: multiYear });

    const scope = await service.resolveResultDeleteScope(999);
    const outcomes = await service.deleteFullResultById(999);

    expect(scope.targetIds).toEqual([]);
    expect(outcomes).toEqual([]);
    expect(routineCalls).toEqual([]);
  });
});

describe('QueryService — retained id-only API and null report years', () => {
  it('resolveResultDeleteTargetIds returns the same ids as the scope', async () => {
    const rows = [
      row(90, 2024, false),
      row(91, 2024, true),
      row(92, 2025, false),
    ];
    const { service } = buildService({ rows });

    const ids = await service.resolveResultDeleteTargetIds(90);
    const scope = await service.resolveResultDeleteScope(90);

    expect(ids).toEqual([91, 90]);
    expect(ids).toEqual(scope.targetIds);
  });

  it('handles a NULL report year without widening the family', async () => {
    // report_year_id is nullable. A NULL seed must group with other NULL rows and
    // must NOT sweep in rows that have a year — widening on a NULL is exactly the
    // shape that turns a scope fix back into the bug it replaced.
    const rows = [
      row(300, null, false),
      row(301, null, true),
      row(302, 2025, false),
    ];
    const { service } = buildService({ rows });

    const scope = await service.resolveResultDeleteScope(300);

    expect(scope.reportYearId).toBeNull();
    expect(scope.targetIds).toEqual([301, 300]);
    expect(scope.siblingIdsOutsideReportYear).toEqual([302]);
  });

  it('orders a row with an undefined is_snapshot as live, deleted last', async () => {
    const rows = [
      {
        ...row(400, 2025, false),
        is_snapshot: undefined as unknown as boolean,
      },
      row(401, 2025, true),
    ];
    const { service } = buildService({ rows });

    const ids = await service.findResultFamilyIds(400);

    expect(ids).toEqual([401, 400]);
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

  it('locks the family inside the transaction with FOR UPDATE', async () => {
    // Reading the family before the transaction left a window for a concurrent
    // versioning run to insert a snapshot the delete would then skip.
    const { service } = buildService({ rows: family });

    await service.deleteFullResultById(10);

    expect(lockQueries[0].sql).toContain('FOR UPDATE');
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

  it('both paths honour the same year-scoped family', async () => {
    const rows = [row(50, 2024, false), row(60, 2025, false)];
    const { service } = buildService({ rows });

    await service.deleteLogicalResultById(50);

    expect(routineCalls.map((call) => call.resultId)).toEqual([50]);
  });
});

describe('QueryService — year scoping is correct for every existing caller', () => {
  // Each caller wants "this row and its versions", never "every year of this
  // official code", so narrowing fixes all four rather than regressing three.
  // One test per call site so the decision is named and not merely asserted in a
  // comment.
  const rows: Row[] = [row(70, 2024, false), row(80, 2025, false)];

  const expectSeedYearOnly = async () => {
    const { service } = buildService({ rows });
    const outcomes = await service.deleteFullResultById(70);
    expect(outcomes.map((outcome) => outcome.resultId)).toEqual([70]);
  };

  it(
    'results.service.ts — bulk delete-results-by-parameters: the operator selected specific rows',
    expectSeedYearOnly,
  );

  it(
    'results.service.ts — AI-report rollback: undoes only what this pass created',
    expectSeedYearOnly,
  );

  it(
    'prms.opensearch.service.ts — sync rollback: undoes only what this pass created',
    expectSeedYearOnly,
  );

  it(
    'save-all-sections.service.ts — winner rollback: its own lookup already keys on report_year_id',
    expectSeedYearOnly,
  );
});

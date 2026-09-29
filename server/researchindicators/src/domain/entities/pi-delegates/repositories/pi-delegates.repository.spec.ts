import { DataSource } from 'typeorm';
import { PiDelegatesRepository } from './pi-delegates.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';

// Shape guard for the project-scoped authorization query.
//
// SCOPE — what this file CANNOT do: the DataSource is mocked, so nothing here
// parses the SQL. It cannot prove MySQL accepts the statement; it only pins
// the one structural property whose loss produced a production 500 (an
// unparenthesised `... LIMIT 1 UNION SELECT ...` is an ER_PARSE_ERROR).
// Acceptance by a real server is covered by
// test/pi-delegates-auth-sql.integration-spec.ts, which runs this same method
// against MySQL and is the suite to trust for behaviour.
describe('PiDelegatesRepository — authorization query shape', () => {
  function buildRepository() {
    const query = jest.fn().mockResolvedValue([]);
    const dataSource = {
      query,
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    return {
      repository: new PiDelegatesRepository({} as AppConfig, dataSource),
      query,
    };
  }

  it('wraps every UNION branch that carries a LIMIT in parentheses', async () => {
    const { repository, query } = buildRepository();

    await repository.isPiOrActiveDelegateOfProject('A15', 42);

    const sql: string = query.mock.calls[0][0];
    const branches = sql.split(/\bUNION\b/i);
    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      if (!/\bLIMIT\b/i.test(branch)) continue;
      const trimmed = branch.trim().replace(/;$/, '').trim();
      expect(trimmed.startsWith('(')).toBe(true);
      expect(trimmed.endsWith(')')).toBe(true);
    }
  });

  it('passes projectId and userId to both branches', async () => {
    const { repository, query } = buildRepository();

    await repository.isPiOrActiveDelegateOfProject('A15', 42);

    expect(query.mock.calls[0][1]).toEqual(['A15', 42, 'A15', 42]);
  });

  it('reports authorized only when the query returns a row', async () => {
    const { repository, query } = buildRepository();
    await expect(
      repository.isPiOrActiveDelegateOfProject('A15', 42),
    ).resolves.toBe(false);

    query.mockResolvedValueOnce([{ 1: 1 }]);
    await expect(
      repository.isPiOrActiveDelegateOfProject('A15', 42),
    ).resolves.toBe(true);
  });
});

// @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
//
// SCOPE — what this block CANNOT do (same caveat as above): the DataSource is
// mocked, so no SQL is parsed and no row is ever returned. It pins two
// structural properties and nothing else:
//   1. the scope=all variants carry NO project filter and NO bind parameters —
//      the whole point of the pair is that one of them is unfiltered;
//   2. each pair projects the SAME columns, which is the invariant the shared
//      SELECT constants exist to hold. A column added to one half only is the
//      realistic regression here, and it would pass every mocked service test.
// Whether MySQL accepts these statements is NOT covered here.
describe('PiDelegatesRepository — scope=all variants', () => {
  function buildRepository() {
    const query = jest.fn().mockResolvedValue([]);
    const dataSource = {
      query,
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    return {
      repository: new PiDelegatesRepository({} as AppConfig, dataSource),
      query,
    };
  }

  /** The column list between SELECT and the first FROM, normalised. */
  function projectedColumns(sql: string): string[] {
    const body = sql.slice(
      sql.toUpperCase().indexOf('SELECT') + 'SELECT'.length,
      sql.toUpperCase().indexOf('FROM'),
    );
    return body
      .split(/,(?![^(]*\))/)
      .map((c) => c.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  it.each([
    ['findAllProjectSummaries', 'findProjectSummariesByIds'],
    ['findAllActiveDelegates', 'findActiveDelegatesForProjects'],
    ['findAllDelegatesWithProjects', 'findDelegatesForProjects'],
    ['findAllDelegateHistory', 'findDelegateHistory'],
  ] as const)(
    '%s projects the same columns as %s',
    async (allMethod, managedMethod) => {
      const { repository, query } = buildRepository();

      await (repository[allMethod] as (arg?: unknown) => Promise<unknown>).call(
        repository,
        42,
      );
      const allSql: string = query.mock.calls[0][0];

      query.mockClear();
      await (
        repository[managedMethod] as (...args: unknown[]) => Promise<unknown>
      ).call(
        repository,
        ...(managedMethod === 'findDelegateHistory'
          ? [42, ['P-1']]
          : [['P-1']]),
      );
      const managedSql: string = query.mock.calls[0][0];

      expect(projectedColumns(allSql)).toEqual(projectedColumns(managedSql));
    },
  );

  it('findAllProjectSummaries filters nothing and binds nothing', async () => {
    const { repository, query } = buildRepository();

    await repository.findAllProjectSummaries();

    const [sql, params] = query.mock.calls[0];
    // Matches the OUTER filter shape only. A looser "WHERE … ac.agreement_id"
    // pattern also matches the correlated sub-select inside the pool-funding
    // predicate, which is not a project filter at all (KZ-017).
    expect(sql).not.toMatch(/WHERE\s+ac\.agreement_id/i);
    expect(params).toBeUndefined();
  });

  // @sdd-spec bilateral-module/mapping-drives-pool-funding-tag
  it.each([
    ['findAllProjectSummaries', () => [] as unknown[]],
    ['findProjectSummariesByIds', () => [['P-1']]],
    ['findProjectSummary', () => ['P-1']],
  ] as const)(
    '%s reports pool funding through the shared predicate, not the raw column',
    async (method, args) => {
      const { repository, query } = buildRepository();

      await (repository[method] as (...a: unknown[]) => Promise<unknown>).call(
        repository,
        ...args(),
      );
      const sql: string = query.mock.calls[0][0];

      // ★ discriminating: `ac.is_pool_funding_contributor` alone answers "No" for
      //   a contract that contributes through an active bilateral mapping, which
      //   is what My Projects tags and this table used to contradict.
      expect(sql).toContain('bilateral_project_mapping');
      expect(sql).toMatch(/AS is_pool_funding_contributor/);
    },
  );

  it.each(['findAllActiveDelegates', 'findAllDelegatesWithProjects'] as const)(
    '%s keeps the is_active gate but drops the project filter',
    async (method) => {
      const { repository, query } = buildRepository();

      await repository[method]();

      const [sql, params] = query.mock.calls[0];
      // ★ discriminating: dropping pd.is_active alongside the project filter would
      //   quietly resurrect revoked delegations in the admin view.
      expect(sql).toMatch(/pd\.is_active = TRUE/);
      expect(sql).not.toMatch(/pd\.project_id IN/);
      expect(params).toBeUndefined();
    },
  );

  it('findAllDelegateHistory binds only the delegate id — no project allowlist', async () => {
    const { repository, query } = buildRepository();

    await repository.findAllDelegateHistory(88);

    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual([88]);
    expect(sql).not.toMatch(/h\.project_id IN/);
  });
});

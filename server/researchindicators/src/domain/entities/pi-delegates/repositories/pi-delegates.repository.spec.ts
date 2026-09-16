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

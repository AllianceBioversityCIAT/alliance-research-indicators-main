import { DataSource } from 'typeorm';
import { OrgUnitRepository } from './org-unit.repository';
import { OrgUnitVersionRepository } from './org-unit-version.repository';
import { OrgUnitDelegateRepository } from './org-unit-delegate.repository';
import { OrgUnitChangeLogRepository } from './org-unit-change-log.repository';

/**
 * Repository unit tests. A mocked `query` can show WHICH SQL and parameters a
 * method sends, never what MySQL does with it; the year-coverage semantics are
 * proven on the real database (`test/org-structure-year-view.integration-spec`).
 */
describe('Organizational Structure repositories', () => {
  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  it.each([
    ['OrgUnitRepository', OrgUnitRepository],
    ['OrgUnitVersionRepository', OrgUnitVersionRepository],
    ['OrgUnitDelegateRepository', OrgUnitDelegateRepository],
    ['OrgUnitChangeLogRepository', OrgUnitChangeLogRepository],
  ])('%s instantiates with a TypeORM entity manager', (_name, Repo) => {
    expect(new Repo(dataSource)).toBeInstanceOf(Repo);
  });

  describe('OrgUnitRepository', () => {
    const makeRepo = () => {
      const repo = new OrgUnitRepository(dataSource);
      const query = jest.fn().mockResolvedValue([]);
      repo.query = query;
      return { repo, query };
    };

    it('findYearViewRows binds the year exactly once and uses the half-open coverage predicate', async () => {
      const { repo, query } = makeRepo();
      await repo.findYearViewRows(2027, false);

      const [sql, params] = query.mock.calls[0];
      expect(params).toEqual([2027]);
      expect(sql).toContain(
        '(v.valid_from_year <= p.y AND (v.valid_to_year IS NULL OR v.valid_to_year > p.y))',
      );
      expect(sql).not.toContain('status_from_year <= p.y');
    });

    it('findYearViewRows with includeEnded adds the ended-entry branch inside the same parenthesis group', async () => {
      const { repo, query } = makeRepo();
      await repo.findYearViewRows(2027, true);

      const sql: string = query.mock.calls[0][0];
      expect(sql).toContain("OR (u.status <> 'active'");
      expect(sql).toContain('v.valid_to_year = u.status_from_year');
      expect(sql.indexOf('OR (u.status')).toBeGreaterThan(
        sql.indexOf('v.valid_to_year > p.y'),
      );
    });

    it('findVersionStartBounds returns nulls when the query returns no row', async () => {
      const { repo, query } = makeRepo();
      query.mockResolvedValue([]);
      await expect(repo.findVersionStartBounds()).resolves.toEqual({
        min_year: null,
        max_year: null,
      });
    });
  });

  describe('OrgUnitDelegateRepository', () => {
    it('findStaffByVersionIds filters on the VERSION id (one placeholder per id), skips the query for none', async () => {
      const repo = new OrgUnitDelegateRepository(dataSource);
      const query = jest.fn().mockResolvedValue([]);
      repo.query = query;

      await expect(repo.findStaffByVersionIds([])).resolves.toEqual([]);
      expect(query).not.toHaveBeenCalled();

      await repo.findStaffByVersionIds([4, 5, 6]);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('dl.org_unit_version_id IN (?,?,?)');
      expect(sql).not.toContain('org_unit_id IN');
      expect(params).toEqual([4, 5, 6]);
    });
  });

  describe('OrgUnitVersionRepository', () => {
    it('findDetailedByUnit filters on the entry and orders oldest first', async () => {
      const repo = new OrgUnitVersionRepository(dataSource);
      const query = jest.fn().mockResolvedValue([]);
      repo.query = query;

      await repo.findDetailedByUnit(9);

      const [sql, params] = query.mock.calls[0];
      expect(params).toEqual([9]);
      expect(sql).toContain('ORDER BY v.valid_from_year');
    });
  });
});

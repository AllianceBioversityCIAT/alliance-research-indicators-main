import { DataSource } from 'typeorm';
import { FrameworkElementRepository } from './framework-element.repository';
import { FrameworkElementResponsibleRepository } from './framework-element-responsible.repository';
import { FrameworkLevelRepository } from './framework-level.repository';
import { InstitutionalObjectiveElementRepository } from './institutional-objective-element.repository';
import { InstitutionalObjectiveRepository } from './institutional-objective.repository';
import { PortfolioLookupRepository } from './portfolio-lookup.repository';

/**
 * Repository unit tests. A mocked `query` shows which SQL and parameters a
 * method sends, never what MySQL returns.
 */
describe('Strategy framework repositories', () => {
  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  it.each([
    ['FrameworkLevelRepository', FrameworkLevelRepository],
    ['FrameworkElementRepository', FrameworkElementRepository],
    [
      'FrameworkElementResponsibleRepository',
      FrameworkElementResponsibleRepository,
    ],
    ['InstitutionalObjectiveRepository', InstitutionalObjectiveRepository],
    [
      'InstitutionalObjectiveElementRepository',
      InstitutionalObjectiveElementRepository,
    ],
    ['PortfolioLookupRepository', PortfolioLookupRepository],
  ])('%s instantiates with a TypeORM entity manager', (_name, Repo) => {
    expect(new Repo(dataSource)).toBeInstanceOf(Repo);
  });

  describe('PortfolioLookupRepository', () => {
    const makeRepo = () => {
      const repo = new PortfolioLookupRepository(dataSource);
      const query = jest.fn().mockResolvedValue([]);
      repo.query = query;
      return { repo, query };
    };

    it('findById selects only id, name, years and is_active and binds the id once', async () => {
      const { repo, query } = makeRepo();
      query.mockResolvedValue([
        {
          id: 2,
          name: 'Strategy',
          start_year: 2026,
          end_year: 2030,
          is_active: 1,
        },
      ]);

      await expect(repo.findById(2)).resolves.toEqual({
        id: 2,
        name: 'Strategy',
        start_year: 2026,
        end_year: 2030,
        is_active: 1,
      });

      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('SELECT id, name, start_year, end_year, is_active');
      expect(sql).toContain('FROM portfolios');
      expect(sql).toContain('WHERE id = ?');
      expect(params).toEqual([2]);
    });

    it('findById returns null when the query returns no row', async () => {
      const { repo, query } = makeRepo();
      query.mockResolvedValue([]);
      await expect(repo.findById(9)).resolves.toBeNull();
      expect(query.mock.calls[0][1]).toEqual([9]);
    });
  });
});

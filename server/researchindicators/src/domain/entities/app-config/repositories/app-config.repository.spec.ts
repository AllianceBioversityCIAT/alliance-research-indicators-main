import { DataSource } from 'typeorm';
import { AppConfigRepository } from './app-config.repository';
import { AppConfigSorting } from '../enum/app-config-forting.enum';

describe('AppConfigRepository', () => {
  let repository: AppConfigRepository;
  const query = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    repository = new AppConfigRepository(dataSource);
    repository.query = query;
  });

  describe('findAll', () => {
    it('should list active configs with sort and no search params', async () => {
      const rows = [{ key: 'k1' }];
      query.mockResolvedValue(rows);

      const result = await repository.findAll(
        {},
        { field: AppConfigSorting.KEY, order: 'ASC' },
      );

      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).not.toContain('_search_relevance');
      expect(sql).toContain('WHERE ac.is_active = TRUE');
      expect(sql).toContain('ORDER BY ac.`key` ASC');
      expect(params).toEqual([]);
      expect(result).toBe(rows);
    });

    it('should apply filters and pagination', async () => {
      query.mockResolvedValue([]);

      await repository.findAll(
        { category: 'EMAIL', subcategory: 'READINESS_LEVEL_7' },
        { field: AppConfigSorting.CATEGORY, order: 'DESC' },
        { page: 2, limit: 5 },
      );

      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('ac.category = ?');
      expect(sql).toContain('ac.subcategory = ?');
      expect(sql).toContain('LIMIT 5 OFFSET 5');
      expect(sql).toContain('ORDER BY ac.category DESC');
      expect(params).toEqual(['EMAIL', 'READINESS_LEVEL_7']);
    });

    it('should search with relevance, bind params in order, and strip score column', async () => {
      query.mockResolvedValue([
        { key: 'email.to', category: 'EMAIL', _search_relevance: 2000 },
      ]);

      const result = await repository.findAll(
        { category: 'EMAIL' },
        { field: AppConfigSorting.KEY, order: 'ASC' },
        { page: 1, limit: 20 },
        '  email  ',
      );

      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('_search_relevance');
      expect(sql).toContain('ORDER BY _search_relevance DESC, ac.`key` ASC');
      expect(sql).toContain('LIMIT 20 OFFSET 0');
      expect(params).toEqual([
        ...Array(9).fill('email'),
        'EMAIL',
        ...Array(7).fill('email'),
      ]);
      expect(result).toEqual([{ key: 'email.to', category: 'EMAIL' }]);
    });

    it('should order by relevance only when search is set and sort field is missing', async () => {
      query.mockResolvedValue([{ key: 'k' }]);

      await repository.findAll({}, {}, undefined, 'term');

      const [sql] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('ORDER BY _search_relevance DESC');
      expect(sql).not.toContain('ORDER BY _search_relevance DESC,');
    });

    it('should ignore blank search', async () => {
      query.mockResolvedValue([]);

      await repository.findAll({}, {}, undefined, '   ');

      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).not.toContain('_search_relevance');
      expect(params).toEqual([]);
    });
  });

  describe('findAllCategoriesAndSubcategories', () => {
    it('should map distinct categories and subcategories', async () => {
      query
        .mockResolvedValueOnce([{ category: 'EMAIL' }, { category: 'OTHER' }])
        .mockResolvedValueOnce([{ subcategory: 'READINESS_LEVEL_7' }]);

      const result = await repository.findAllCategoriesAndSubcategories();

      expect(query).toHaveBeenCalledTimes(2);
      expect(query.mock.calls[0][0]).toContain('DISTINCT category');
      expect(query.mock.calls[1][0]).toContain('DISTINCT subcategory');
      expect(result).toEqual({
        categories: ['EMAIL', 'OTHER'],
        subcategories: ['READINESS_LEVEL_7'],
      });
    });
  });
});

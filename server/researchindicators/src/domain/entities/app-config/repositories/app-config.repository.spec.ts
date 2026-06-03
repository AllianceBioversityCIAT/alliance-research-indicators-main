import { DataSource } from 'typeorm';
import { AppConfigRepository } from './app-config.repository';
import { AppConfigSorting } from '../enum/app-config-forting.enum';

describe('AppConfigRepository', () => {
  let repository: AppConfigRepository;
  const query = jest.fn();

  const paginationMeta = (overrides: Record<string, unknown> = {}) => ({
    total: 0,
    page: 1,
    limit: 0,
    pageSize: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    repository = new AppConfigRepository(dataSource);
    repository.query = query;
  });

  describe('findAll', () => {
    it('should list active configs with sort and pagination metadata', async () => {
      const rows = [{ key: 'k1' }];
      query.mockResolvedValueOnce(rows);

      const result = await repository.findAll(
        {},
        { field: AppConfigSorting.KEY, order: 'ASC' },
      );

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).not.toContain('SELECT COUNT(*)');
      expect(sql).not.toContain('_search_relevance');
      expect(sql).toContain('WHERE ac.is_active = TRUE');
      expect(sql).toContain('ORDER BY ac.`key` ASC');
      expect(sql).not.toContain('LIMIT');
      expect(params).toEqual([]);
      expect(result).toEqual({
        data: rows,
        pagination: paginationMeta({
          total: 1,
          limit: 1,
          pageSize: 1,
          totalPages: 1,
        }),
      });
    });

    it('should return all rows when limit is not provided', async () => {
      const rows = [{ key: 'k1' }, { key: 'k2' }];
      query.mockResolvedValueOnce(rows);

      const result = await repository.findAll({}, {}, { page: 3 });

      expect(query).toHaveBeenCalledTimes(1);
      const [sql] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).not.toContain('LIMIT');
      expect(sql).not.toContain('SELECT COUNT(*)');
      expect(result.pagination).toEqual(
        paginationMeta({
          total: 2,
          page: 1,
          limit: 2,
          pageSize: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      );
    });

    it('should apply filters and pagination when limit is set', async () => {
      query.mockResolvedValueOnce([{ total: 12 }]).mockResolvedValueOnce([]);

      const result = await repository.findAll(
        { category: 'EMAIL', subcategory: 'READINESS_LEVEL_7' },
        { field: AppConfigSorting.CATEGORY, order: 'DESC' },
        { page: 2, limit: 5 },
      );

      const [countSql, countParams] = query.mock.calls[0] as [
        string,
        unknown[],
      ];
      const [sql, params] = query.mock.calls[1] as [string, unknown[]];
      expect(countSql).toContain('ac.category = ?');
      expect(countSql).toContain('ac.subcategory = ?');
      expect(countParams).toEqual(['EMAIL', 'READINESS_LEVEL_7']);
      expect(sql).toContain('LIMIT ? OFFSET ?');
      expect(sql).toContain('ORDER BY ac.category DESC');
      expect(params).toEqual(['EMAIL', 'READINESS_LEVEL_7', 5, 5]);
      expect(result.pagination).toEqual(
        paginationMeta({
          total: 12,
          page: 2,
          limit: 5,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        }),
      );
    });

    it('should search with relevance, bind params in order, and strip score column', async () => {
      query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([
          { key: 'email.to', category: 'EMAIL', _search_relevance: 2000 },
        ]);

      const result = await repository.findAll(
        { category: 'EMAIL' },
        { field: AppConfigSorting.KEY, order: 'ASC' },
        { page: 1, limit: 20 },
        '  email  ',
      );

      const [sql, params] = query.mock.calls[1] as [string, unknown[]];
      expect(sql).toContain('_search_relevance');
      expect(sql).toContain('ORDER BY _search_relevance DESC, ac.`key` ASC');
      expect(sql).toContain('LIMIT ? OFFSET ?');
      expect(params).toEqual([
        ...Array(9).fill('email'),
        'EMAIL',
        ...Array(7).fill('email'),
        20,
        0,
      ]);
      expect(result).toEqual({
        data: [{ key: 'email.to', category: 'EMAIL' }],
        pagination: paginationMeta({
          total: 1,
          limit: 20,
          pageSize: 1,
          totalPages: 1,
        }),
      });
    });

    it('should order by relevance only when search is set and sort field is missing', async () => {
      query.mockResolvedValueOnce([]);

      await repository.findAll({}, {}, undefined, 'term');

      expect(query).toHaveBeenCalledTimes(1);
      const [sql] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('ORDER BY _search_relevance DESC');
      expect(sql).not.toContain('ORDER BY _search_relevance DESC,');
    });

    it('should ignore blank search', async () => {
      query.mockResolvedValueOnce([]);

      await repository.findAll({}, {}, undefined, '   ');

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).not.toContain('_search_relevance');
      expect(sql).not.toContain('SELECT COUNT(*)');
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

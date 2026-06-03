import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppConfig } from '../entities/app-config.entity';
import { AppConfigSorting } from '../enum/app-config-forting.enum';

@Injectable()
export class AppConfigRepository extends Repository<AppConfig> {
  private static readonly FIND_APP_CONFIG_SEARCH_WHERE_PLACEHOLDER_COUNT = 7;

  private static readonly FIND_APP_CONFIG_SEARCH_RELEVANCE_PLACEHOLDER_COUNT = 9;

  constructor(private readonly dataSource: DataSource) {
    super(AppConfig, dataSource.createEntityManager());
  }

  private getFiltersQuery(filters: {
    category?: string;
    subcategory?: string;
  }): { fragment: string; params: string[] } {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters?.category) {
      conditions.push('ac.category = ?');
      params.push(filters.category);
    }
    if (filters?.subcategory) {
      conditions.push('ac.subcategory = ?');
      params.push(filters.subcategory);
    }

    return {
      fragment: conditions.length ? `AND ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  /**
   * Text search across list-visible columns (aligned with SELECT projection).
   */
  private buildFindAppConfigSearchWhereFragment(): string {
    return `
    AND (
      ac.\`key\` LIKE CONCAT('%', ?, '%')
      OR ac.category LIKE CONCAT('%', ?, '%')
      OR ac.subcategory LIKE CONCAT('%', ?, '%')
      OR ac.description LIKE CONCAT('%', ?, '%')
      OR ac.simple_value LIKE CONCAT('%', ?, '%')
      OR CAST(ac.json_value AS CHAR) LIKE CONCAT('%', ?, '%')
      OR CONCAT_WS('', su.first_name, ' ', su.last_name) LIKE CONCAT('%', ?, '%')
    )`;
  }

  /**
   * Relevance for app-config text search (aligned with search WHERE).
   * Non-key clauses use the full search string; key uses exact, prefix, then contains.
   */
  private buildFindAppConfigSearchRelevanceSelectFragment(): string {
    return `, (
      (CASE WHEN ac.\`key\` = ? THEN 2000 ELSE 0 END) +
      (CASE WHEN ac.\`key\` LIKE CONCAT(?, '%') THEN 900 ELSE 0 END) +
      (CASE WHEN ac.\`key\` LIKE CONCAT('%', ?, '%') THEN 700 ELSE 0 END) +
      (CASE WHEN ac.description LIKE CONCAT('%', ?, '%') THEN 550 ELSE 0 END) +
      (CASE WHEN ac.category LIKE CONCAT('%', ?, '%') THEN 450 ELSE 0 END) +
      (CASE WHEN ac.subcategory LIKE CONCAT('%', ?, '%') THEN 400 ELSE 0 END) +
      (CASE WHEN ac.simple_value LIKE CONCAT('%', ?, '%') THEN 380 ELSE 0 END) +
      (CASE WHEN CAST(ac.json_value AS CHAR) LIKE CONCAT('%', ?, '%') THEN 320 ELSE 0 END) +
      (CASE WHEN CONCAT_WS('', su.first_name, ' ', su.last_name) LIKE CONCAT('%', ?, '%') THEN 220 ELSE 0 END)
    ) AS _search_relevance`;
  }

  private getSortingQuery(
    sorting: { field?: AppConfigSorting; order?: 'ASC' | 'DESC' },
    hasSearch: boolean,
  ): string {
    const fieldMap = {
      [AppConfigSorting.CATEGORY]: 'ac.category',
      [AppConfigSorting.SUBCATEGORY]: 'ac.subcategory',
      [AppConfigSorting.KEY]: 'ac.`key`',
    };
    const direction = sorting?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (hasSearch) {
      if (!sorting?.field || !fieldMap[sorting.field]) {
        return 'ORDER BY _search_relevance DESC';
      }
      return `ORDER BY _search_relevance DESC, ${fieldMap[sorting.field]} ${direction}`;
    }

    if (!sorting?.field || !fieldMap[sorting.field]) return '';
    return `ORDER BY ${fieldMap[sorting.field]} ${direction}`;
  }

  private getPaginationQuery(pagination?: {
    page?: number;
    limit?: number;
  }): string {
    if (!pagination?.page || !pagination?.limit) return '';
    const page = !pagination?.page || pagination.page < 1 ? 1 : pagination.page;
    const limit = !pagination?.limit ? 100 : pagination.limit;
    const offset = (page - 1) * limit;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  async findAll(
    filters: { category?: string; subcategory?: string },
    sorting: { field?: AppConfigSorting; order?: 'ASC' | 'DESC' },
    pagination?: { page?: number; limit?: number },
    search?: string,
  ): Promise<AppConfig[]> {
    const trimmedSearch = search?.trim() ?? '';
    const hasSearch = trimmedSearch.length > 0;

    const { fragment: filtersQuery, params: filterParams } =
      this.getFiltersQuery(filters);
    const sortingQuery = this.getSortingQuery(sorting, hasSearch);
    const paginationQuery = this.getPaginationQuery(pagination);

    const searchWhereFragment = hasSearch
      ? this.buildFindAppConfigSearchWhereFragment()
      : '';
    const relevanceFragment = hasSearch
      ? this.buildFindAppConfigSearchRelevanceSelectFragment()
      : '';

    const searchWhereParams = hasSearch
      ? Array(
          AppConfigRepository.FIND_APP_CONFIG_SEARCH_WHERE_PLACEHOLDER_COUNT,
        ).fill(trimmedSearch)
      : [];
    const relevanceParams = hasSearch
      ? Array(
          AppConfigRepository.FIND_APP_CONFIG_SEARCH_RELEVANCE_PLACEHOLDER_COUNT,
        ).fill(trimmedSearch)
      : [];

    const query = `SELECT 
                            ac.\`key\`,
                            ac.category,
                            ac.subcategory,
                            ac.description,
                            ac.simple_value,
                            ac.json_value,
                            ac.updated_at,
                            IF(su.sec_user_id IS NULL, NULL, CONCAT_WS('', su.first_name, ' ', su.last_name)) updated_by
                            ${relevanceFragment}
                        FROM app_config ac 
                        LEFT JOIN sec_users su ON su.sec_user_id = ac.updated_by 
                        WHERE ac.is_active = TRUE
                        ${filtersQuery}
                        ${searchWhereFragment}
                        ${sortingQuery}
                        ${paginationQuery}`;

    const queryParams = [
      ...relevanceParams,
      ...filterParams,
      ...searchWhereParams,
    ];

    const rawData = await this.query(query, queryParams);

    if (!hasSearch) {
      return rawData;
    }

    return rawData.map((row: Record<string, unknown>) => {
      const { _search_relevance: _r, ...rest } = row;
      return rest as unknown as AppConfig;
    });
  }

  async findAllCategoriesAndSubcategories(): Promise<{
    categories: string[];
    subcategories: string[];
  }> {
    const queryCategories = `SELECT DISTINCT category FROM app_config WHERE is_active = TRUE`;
    const querySubcategories = `SELECT DISTINCT subcategory FROM app_config WHERE is_active = TRUE`;

    const rawDataCategories = await this.query(queryCategories);
    const rawDataSubcategories = await this.query(querySubcategories);

    return {
      categories: rawDataCategories.map(
        (row: Record<string, unknown>) => row.category as string,
      ),
      subcategories: rawDataSubcategories.map(
        (row: Record<string, unknown>) => row.subcategory as string,
      ),
    };
  }
}

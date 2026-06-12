import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { AgressoContract } from '../entities/agresso-contract.entity';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ContractResultCountDto } from '../dto/contract-result-count.dto';
import { isEmpty } from '../../../shared/utils/object.utils';
import { StringKeys } from '../../../shared/global-dto/types-global';
import { OrderFieldsEnum } from '../enum/order-fields.enum';
import { Indicator } from '../../indicators/entities/indicator.entity';
import { MappedContractsDto } from '../dto/mapper-agresso-contract.dto';
import {
  escapeLikeString,
  isValidText,
} from '../../../shared/utils/query-sanitizer.util';
import { User } from '../../../complementary-entities/secondary/user/user.entity';
import {
  ContractGeoScopeReportDto,
  CountryWithSubNationalsDto,
  GeoScopeSummaryDto,
  RegionByContractCountDto,
  SubNationalByContractCountDto,
} from '../dto/reports-contracts.dto';
import {
  ContractTopPartnersReportDto,
  PartnerByContractCountDto,
} from '../dto/reports-partners.dto';
import {
  ContractTopContributorsReportDto,
  ContributorContractCountDto,
} from '../dto/reports-contributors.dto';
import {
  ContractTopPrimaryLeversReportDto,
  PrimaryLeverCountDto,
} from '../dto/reports-primary-levers.dto';
import { InstitutionRolesEnum } from '../../institution-roles/enums/institution-roles.enum';

@Injectable()
export class AgressoContractRepository extends Repository<AgressoContract> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
    private readonly alianceManagementApp: AlianceManagementApp,
  ) {
    super(AgressoContract, dataSource.createEntityManager());
  }

  async findAllContracts(
    pagination?: { page: number; limit: number },
    where?: FindOptionsWhere<AgressoContract>,
    relations?: Partial<StringKeys<AgressoContract>>,
  ) {
    let offset: number = null;
    if (!isEmpty(pagination?.limit)) {
      pagination.page =
        pagination.page < 1 || isEmpty(pagination.page) ? 1 : pagination.page;
      offset = (pagination.page - 1) * pagination.limit;
    }
    const filterWhere = Object.entries(where).filter(
      (data) => !isEmpty(data[1]),
    );
    const whereClause = filterWhere.length
      ? `WHERE ${filterWhere
          .map(([key, value]) => `ac.${key} like '%${value}%'`)
          .join(' AND ')}`
      : '';
    const query = `
    select ac.*,
    ifnull(cl.full_name, 'Not available' ) as lever,
    cl.id as lever_id
    ${
      relations?.countries
        ? `,JSON_ARRAYAGG(
            JSON_OBJECT(
                'agreement_id', acc.agreement_id,
                'iso_alpha_2', acc.iso_alpha_2,
                'is_active', acc.is_active
            )
        ) AS countries`
        : ''
    }
    from agresso_contracts ac 
    LEFT JOIN 
        agresso_contract_countries acc ON ac.agreement_id = acc.agreement_id
    left join clarisa_levers cl on cl.short_name = REPLACE(ac.departmentId, 'L', 'Lever ')
    ${whereClause}
    GROUP BY 
      	ac.agreement_id,
        cl.id
    order by FIELD(ifnull(ac.contract_status, 'non'), 'ongoing', 'completed', 'suspended', 'discontinued', 'non')
    ${!isEmpty(offset) ? `LIMIT ${pagination.limit} OFFSET ${offset}` : ''};
    `;

    const result = await this.query(query);

    const leverUrlMap: Record<string, string> = {
      L1: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L1-Food-environment_COLOR.png',
      L2: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L2-Multifuntional-Landscapes_COLOR.png',
      L3: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L3-Climate-Action_COLOR.png',
      L4: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L4-Agrobiodiversity_COLOR.png',
      L5: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L5-Digital-Inclusion_COLOR.png',
      L6: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L6-Crops-for-Nutrition_COLOR.png',
      L7: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/L7-Gender-Youth-and-Inclusion_COLOR.png',
      L8: 'https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/levers/empty.png',
    };

    return result.map((item) => ({
      ...item,
      leverUrl: leverUrlMap[item.departmentId] || 'Not available',
    }));
  }

  async findByName(first_name: string, last_name: string) {
    const processed_first_name = `${first_name.toUpperCase().replace(' ', '|')}`;
    const processed_last_name = `${last_name.toUpperCase().replace(' ', '|')}`;
    return this.createQueryBuilder('ac')
      .leftJoin(
        'user_agresso_contract',
        'uac',
        'ac.agreement_id = uac.agreement_id',
      )
      .where('ac.project_lead_description REGEXP :first_name', {
        first_name: processed_first_name,
      })
      .andWhere('ac.project_lead_description REGEXP :last_name', {
        last_name: processed_last_name,
      })

      .andWhere(
        '(ac.is_active = false OR uac.user_agresso_contract_id IS NULL)',
      )
      .getMany();
  }

  async findContractsByUser(
    userId?: number,
  ): Promise<ContractResultCountDto[]> {
    const tempUserId = userId || this.currentUser.user_id;
    const contract = await this.alianceManagementApp.findUserToContract(
      tempUserId,
      SecRolesEnum.CONTRACT_CONTRIBUTOR,
    );

    if (!contract || contract.length === 0) {
      return [];
    }

    const contractIds = contract.map((c) => c.contract_id);

    const query = `
    SELECT 
      ac.agreement_id, 
      ac.projectDescription, 
      ac.project_lead_description, 
      ac.description,
      ac.start_date, 
      ac.end_date, 
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'indicator', JSON_OBJECT(
            'indicator_id', i.indicator_id,
            'name', i.name,
            'description', i.description,
            'indicator_type_id', i.indicator_type_id,
            'long_description', i.long_description,
            'icon_src', i.icon_src,
            'other_names', i.other_names,
            'is_active', i.is_active
          ),
          'count_results', 
            (SELECT count(r.result_id)
            FROM results r
            INNER JOIN result_contracts rc ON rc.result_id = r.result_id
            WHERE rc.contract_id = ac.agreement_id
              AND r.indicator_id = i.indicator_id
              AND r.is_active = 1
              AND r.is_snapshot = false
              AND rc.is_active = 1)
        )
      ) AS indicators
    FROM agresso_contracts ac
    CROSS JOIN indicators i
    WHERE ac.agreement_id IN (?)
    GROUP BY ac.agreement_id;`;

    return this.query(query, [contractIds]) as Promise<
      ContractResultCountDto[]
    >;
  }

  async findOneContract(contract_id: string) {
    if (isEmpty(contract_id)) {
      return null;
    }

    const query = `
    SELECT 
      ac.agreement_id, 
      ac.projectDescription, 
      ac.description,
      ac.project_lead_description, 
      ac.start_date, 
      ac.end_date, 
      ac.endDatefinance,
      ac.contract_status,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'indicator', JSON_OBJECT(
            'indicator_id', i.indicator_id,
            'name', i.name,
            'description', i.description,
            'indicator_type_id', i.indicator_type_id,
            'long_description', i.long_description,
            'icon_src', i.icon_src,
            'other_names', i.other_names,
            'is_active', i.is_active
          ),
          'count_results', 
            (SELECT count(r.result_id)
            FROM results r
            INNER JOIN result_contracts rc ON rc.result_id = r.result_id
            WHERE rc.contract_id = ac.agreement_id
              AND r.indicator_id = i.indicator_id
              AND r.is_active = 1
              AND r.is_snapshot = false
              AND rc.is_active = 1
              AND rc.is_primary = 1)
        )
      ) AS indicators
    FROM agresso_contracts ac
    CROSS JOIN indicators i
    WHERE ac.agreement_id = ?
    GROUP BY ac.agreement_id;`;

    return (
      this.query(query, [contract_id]) as Promise<ContractResultCountDto[]>
    ).then((response) => (response.length > 0 ? response[0] : null));
  }

  /**
   * Score used only for ORDER BY when searching by `query`. Same columns as `querySearch`
   * in getContracts; higher = closer match. Not exposed in the outer SELECT.
   */
  private buildQueryRelevanceScoreSql(
    escapedFullQuery: string,
    escapedTokens: string[],
  ): string {
    const tokens = escapedTokens.filter((t) => !isEmpty(t));
    const parts: string[] = [
      `(CASE WHEN LOWER(TRIM(ac.agreement_id)) = LOWER('${escapedFullQuery}') THEN 2000 ELSE 0 END)`,
      `(CASE WHEN ac.agreement_id LIKE '${escapedFullQuery}%' THEN 800 ELSE 0 END)`,
      `(CASE WHEN ac.description LIKE '%${escapedFullQuery}%' THEN 400 ELSE 0 END)`,
      `(CASE WHEN ac.project_lead_description LIKE '%${escapedFullQuery}%' THEN 400 ELSE 0 END)`,
    ];
    for (const token of tokens) {
      parts.push(
        `(CASE WHEN ac.agreement_id LIKE '${token}%' THEN 300 ELSE 0 END)`,
      );
      parts.push(
        `(CASE WHEN ac.agreement_id LIKE '%${token}%' THEN 150 ELSE 0 END)`,
      );
      parts.push(
        `(CASE WHEN ac.description LIKE '%${token}%' THEN 80 ELSE 0 END)`,
      );
      parts.push(
        `(CASE WHEN ac.project_lead_description LIKE '%${token}%' THEN 80 ELSE 0 END)`,
      );
    }
    return parts.join(' + ');
  }

  /**
   * Distinct active results per contract; used for contract-level count_results and count-results sort.
   */
  private buildContractTotalResultsCountSql(user?: User): string {
    const userFilter = user?.sec_user_id
      ? `AND r_ord.created_by = ${user.sec_user_id}`
      : '';
    return `(SELECT COUNT(DISTINCT r_ord.result_id)
        FROM results r_ord
        INNER JOIN result_contracts rc_ord ON rc_ord.result_id = r_ord.result_id
        WHERE rc_ord.contract_id = ac.agreement_id
          AND r_ord.is_active = 1
          AND r_ord.is_snapshot = FALSE
          AND rc_ord.is_active = 1
          AND rc_ord.is_primary = TRUE
          ${userFilter})`;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): string {
    if (isEmpty(field)) return '';

    const fieldMap: Record<OrderFieldsEnum, string> = {
      [OrderFieldsEnum.START_DATE]: 'ac.start_date',
      [OrderFieldsEnum.END_DATE]: 'ac.end_date',
      [OrderFieldsEnum.END_DATE_GLOBAL]: 'ac.endDateGlobal',
      [OrderFieldsEnum.END_DATE_FINANCE]: 'ac.endDatefinance',
      [OrderFieldsEnum.CONTRACT_CODE]: 'ac.agreement_id',
      [OrderFieldsEnum.PROJECT_NAME]: 'ac.projectDescription',
      [OrderFieldsEnum.PRINCIPAL_INVESTIGATOR]: 'ac.project_lead_description',
      [OrderFieldsEnum.STATUS]: 'ac.contract_status',
      [OrderFieldsEnum.LEAD_CENTER]: 'ac.ubwClientDescription',
      [OrderFieldsEnum.LEVER]: 'cl.id',
      [OrderFieldsEnum.COUNT_RESULTS]: 'contract_total_results',
    };
    return `${fieldMap[field] || 'ac.start_date'} ${direction} `;
  }

  async getContracts(
    filter?: Record<string, any>,
    user?: User,
    orderFields?: OrderFieldsEnum,
    direction?: 'ASC' | 'DESC',
    pagination?: { page: number; limit: number },
    query?: string,
  ) {
    let queryConditions = '';
    let queryRelevanceSelectSql = '';
    let queryRelevanceOrderPrefix = '';
    if (!isEmpty(query) && !isValidText(query)) {
      throw new BadRequestException('Invalid characters in query parameter');
    } else if (!isEmpty(query)) {
      const escapedFullQuery = escapeLikeString(query);
      const sanitizedQuery = escapedFullQuery.split(' ');

      const querySearch: (keyof AgressoContract)[] = [
        'description',
        'agreement_id',
        'project_lead_description',
      ];

      queryConditions = querySearch
        .map((field) => {
          return sanitizedQuery
            .map((value) => `ac.${field} LIKE '%${value}%'`)
            .join(' OR ');
        })
        .join(' OR ');

      const tokensForScore = sanitizedQuery.filter((t) => !isEmpty(t));
      queryRelevanceSelectSql = `, (${this.buildQueryRelevanceScoreSql(
        escapedFullQuery,
        tokensForScore,
      )}) AS _query_relevance`;
      queryRelevanceOrderPrefix = '_query_relevance DESC, ';
    }

    const validFilter = (attr: string, filter: string) => {
      if (isEmpty(attr)) return '';
      return filter;
    };

    const dateFilterClause = this.buildDateFilterClause(filter);
    const indicators = await this.dataSource.getRepository(Indicator).find();
    const contractTotalResultsSelectSql = `, (${this.buildContractTotalResultsCountSql(user)}) AS contract_total_results`;

    const operationOrder = isEmpty(orderFields)
      ? `FIELD(ifnull(ac.contract_status, 'non'), 'ongoing', 'completed', 'suspended', 'discontinued', 'non')`
      : this.orderBy(orderFields, direction);
    const orderBy = `ORDER BY ${queryRelevanceOrderPrefix}${operationOrder}`;

    let offset: number = null;
    if (!isEmpty(pagination?.limit)) {
      pagination.page =
        pagination.page < 1 || isEmpty(pagination.page) ? 1 : pagination.page;
      offset = (pagination.page - 1) * pagination.limit;
    }

    const userContracts = (userId?: number) =>
      userId
        ? `
    LEFT JOIN result_contracts rc ON rc.contract_id = ac.agreement_id AND rc.is_active = 1
        AND rc.is_primary = TRUE
    LEFT JOIN results r ON r.result_id = rc.result_id 
        AND r.is_active = 1 
        AND r.is_snapshot = FALSE 
    `
        : '';

    let metadata = null;
    if (!isEmpty(offset)) {
      const countQuery = `
    SELECT COUNT(DISTINCT ac.agreement_id) as total
    FROM agresso_contracts ac
    LEFT JOIN clarisa_levers cl ON cl.short_name = CONCAT('Lever ', 
        IF(ac.departmentId LIKE 'L%', SUBSTRING(ac.departmentId, 2), NULL))
        ${userContracts(user?.sec_user_id)}
    WHERE 1=1
    ${user?.sec_user_id ? `AND (r.created_by = ${user.sec_user_id} OR (ac.project_lead_description like '%${user.first_name}%' AND ac.project_lead_description like '%${user.last_name}%'))` : ''}
    ${validFilter(queryConditions, `AND (${queryConditions})`)}
    ${validFilter(filter?.contract_code, `AND ac.agreement_id = '${filter.contract_code}'`)}
    ${validFilter(filter?.project_name, `AND ac.projectDescription LIKE '%${filter.project_name}%'`)}
    ${validFilter(filter?.principal_investigator, `AND ac.project_lead_description LIKE '%${filter.principal_investigator}%'`)}
    ${validFilter(filter?.lever, `AND cl.id in (${filter?.lever?.join(',')})`)}
    ${dateFilterClause}
    ${validFilter(filter?.status, this.buildStatusFilterClause(filter.status))}
  `;

      const countResult = await this.query(countQuery);
      const total = parseInt(countResult[0]?.total || '0');
      const totalPages = Math.ceil(total / pagination.limit);
      metadata = {
        total,
        page: pagination?.page,
        limit: pagination?.limit,
        totalPages,
        hasNextPage: (pagination?.page || 1) < totalPages,
        hasPreviousPage: (pagination?.page || 1) > 1,
      };
    }

    const newQuery = `
    SELECT 
        paginated_contracts.agreement_id,
        paginated_contracts.projectDescription,
        paginated_contracts.project_lead_description,
        paginated_contracts.description,
        paginated_contracts.start_date,
        paginated_contracts.end_date,
        paginated_contracts.endDateGlobal,
        paginated_contracts.endDatefinance,
        paginated_contracts.contract_status,
        paginated_contracts.contract_total_results,
        result_counts.indicator_id,
        COALESCE(result_counts.total_results, 0) as count_results,
        paginated_contracts.lever_id,
        paginated_contracts.lever_short_name,
        paginated_contracts.lever_full_name,
        paginated_contracts.lever_other_names,
        paginated_contracts.is_science_program,
        paginated_contracts.funding_type,
        paginated_contracts.ubwClientDescription
    FROM (
        SELECT DISTINCT
            ac.agreement_id,
            ac.projectDescription,
            ac.project_lead_description,
            ac.description,
            ac.start_date,
            ac.end_date,
            ac.endDateGlobal,
            ac.endDatefinance,
            ac.contract_status,
            cl.id as lever_id,
            cl.short_name as lever_short_name,
            cl.full_name as lever_full_name,
            cl.other_names as lever_other_names,
            IF(pfc.id IS NOT NULL, TRUE, FALSE) AS is_science_program,
            ac.funding_type,
            CASE 
                WHEN ac.ubwClientDescription = 'ExCIAT' THEN 'CIAT'
                WHEN ac.ubwClientDescription = 'ExBIO' THEN 'Bioversity International'
                ELSE ac.ubwClientDescription
            END AS ubwClientDescription
            ${queryRelevanceSelectSql}
            ${contractTotalResultsSelectSql}
        FROM agresso_contracts ac
        LEFT JOIN clarisa_levers cl ON cl.short_name = CONCAT('Lever ', 
            IF(ac.departmentId LIKE 'L%', SUBSTRING(ac.departmentId, 2), NULL))
        LEFT JOIN pooled_funding_contracts pfc ON pfc.agreement_id = ac.agreement_id
                                              AND pfc.is_active = TRUE
        ${userContracts(user?.sec_user_id)}
        WHERE 1=1
        ${filter?.exclude_pooled_funding ? `AND pfc.id IS NULL` : ''}
        ${user?.sec_user_id ? `AND (r.created_by = ${user.sec_user_id} OR (ac.project_lead_description like '%${user.first_name}%' AND ac.project_lead_description like '%${user.last_name}%'))` : ''}
        ${validFilter(queryConditions, `AND (${queryConditions})`)}
        ${validFilter(filter?.contract_code, `AND ac.agreement_id = '${filter?.contract_code}'`)}
        ${validFilter(filter?.project_name, `AND ac.projectDescription LIKE '%${filter?.project_name}%'`)}
        ${validFilter(filter?.principal_investigator, `AND ac.project_lead_description LIKE '%${filter?.principal_investigator}%'`)}
        ${validFilter(filter?.lever, `AND cl.id in (${filter?.lever?.join(',')})`)}
        ${dateFilterClause}
        ${validFilter(filter?.status, this.buildStatusFilterClause(filter?.status))}
        ${orderBy}
        ${!isEmpty(offset) ? `LIMIT ${pagination.limit} OFFSET ${offset}` : ''}
    ) paginated_contracts
    LEFT JOIN (
        SELECT 
            rc.contract_id,
            r.indicator_id,
            COUNT(r.result_id) as total_results
        FROM results r
        INNER JOIN result_contracts rc ON rc.result_id = r.result_id
        WHERE r.is_active = 1 
          AND r.is_snapshot = FALSE 
          AND rc.is_active = 1
          AND rc.is_primary = TRUE
          ${user?.sec_user_id ? `AND r.created_by = ${user?.sec_user_id}` : ''}
        GROUP BY rc.contract_id, r.indicator_id
        HAVING COUNT(r.result_id) > 0 
    ) result_counts ON result_counts.contract_id = paginated_contracts.agreement_id;
    `;

    const rawResults = await this.query(newQuery);
    const mapContracts = new Map<string, MappedContractsDto>();

    rawResults.forEach((rawData) => {
      const contractId = rawData.agreement_id;
      if (!mapContracts.has(contractId)) {
        const mappedContract = new MappedContractsDto(
          rawData,
          filter?.with_indicators ? indicators : null,
        );
        mappedContract.setIndicatorCount(
          rawData.indicator_id,
          rawData.count_results,
        );
        mapContracts.set(contractId, mappedContract);
      } else {
        mapContracts
          .get(contractId)
          .setIndicatorCount(rawData.indicator_id, rawData.count_results);
      }
    });

    const data = Array.from(mapContracts.values());
    return {
      data,
      metadata,
    };
  }

  private buildStatusFilterClause(statuses: string[]): string {
    if (!statuses || !Array.isArray(statuses) || statuses.length === 0) {
      return '';
    }
    const statusList = statuses
      .map((status) => `'${status.toLowerCase()}'`)
      .join(',');
    return `AND LOWER(ac.contract_status) in (${statusList})`;
  }

  private buildDateFilterClause(filter?: Record<string, any>): string {
    if (filter?.start_date && filter?.end_date) {
      return `AND ac.start_date <= '${filter.end_date}' AND (ac.end_date >= '${filter.start_date}' OR ac.end_date IS NULL)`;
    }

    if (filter?.start_date) {
      return `AND ac.start_date >= '${filter.start_date}'`;
    }

    if (filter?.end_date) {
      return `AND (ac.end_date <= '${filter.end_date}' OR ac.end_date IS NULL)`;
    }

    return '';
  }

  private normalizeReportLimit(limit?: number): number {
    const parsedLimit = Number(limit);
    if (isEmpty(limit) || Number.isNaN(parsedLimit) || parsedLimit < 1) {
      return 10;
    }
    return Math.min(parsedLimit, 100);
  }

  private buildContractResultsSubquery(): string {
    return `
      SELECT DISTINCT r.result_id, r.geo_scope_id
      FROM results r
      INNER JOIN result_contracts rc ON rc.result_id = r.result_id
      WHERE rc.contract_id = ?
        AND rc.is_primary = TRUE
        AND rc.is_active = TRUE
        AND r.is_active = TRUE
        AND r.is_snapshot = FALSE
    `;
  }

  async getRegionsByContract(
    contract_id: string,
  ): Promise<RegionByContractCountDto[]> {
    const query = `
    SELECT
      cr.um49Code AS region_id,
      cr.name AS region_name,
      COUNT(cr.um49Code) AS count
    FROM result_contracts rc
    INNER JOIN result_regions rr ON rr.result_id = rc.result_id
      AND rr.is_active = TRUE
    INNER JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
    WHERE rc.is_primary = TRUE
      AND rc.is_active = TRUE
      AND rc.contract_id = ?
    GROUP BY cr.um49Code, cr.name
    ORDER BY count DESC, cr.um49Code;
    `;
    return this.query(query, [contract_id]) as Promise<
      RegionByContractCountDto[]
    >;
  }

  async getGeoScopeReport(
    contractId: string,
    limit?: number,
  ): Promise<ContractGeoScopeReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const safeLimit = this.normalizeReportLimit(limit);
    const contractResultsSubquery = this.buildContractResultsSubquery();

    const summaryQuery = `
      SELECT
        SUM(CASE WHEN cr.geo_scope_id = 1 THEN 1 ELSE 0 END) AS global_count,
        SUM(CASE WHEN cr.geo_scope_id = 2 THEN 1 ELSE 0 END) AS regional_count,
        SUM(CASE WHEN cr.geo_scope_id IN (3, 4) THEN 1 ELSE 0 END) AS countries_count,
        SUM(CASE WHEN cr.geo_scope_id = 5 THEN 1 ELSE 0 END) AS sub_national_count,
        SUM(CASE WHEN cr.geo_scope_id = 50 THEN 1 ELSE 0 END) AS yet_to_be_determined_count
      FROM (${contractResultsSubquery}) cr
    `;

    const regionsQuery = `
      SELECT
        clarisa_region.um49Code AS region_id,
        clarisa_region.name AS region_name,
        COUNT(*) AS count
      FROM result_regions rr
      INNER JOIN (${contractResultsSubquery}) cr ON cr.result_id = rr.result_id
      INNER JOIN clarisa_regions clarisa_region
        ON clarisa_region.um49Code = rr.region_id
      WHERE rr.is_active = TRUE
      GROUP BY clarisa_region.um49Code, clarisa_region.name
      ORDER BY count DESC, clarisa_region.um49Code
      LIMIT ?
    `;

    const countriesMatrixQuery = `
      WITH contract_results AS (
        SELECT DISTINCT r.result_id
        FROM results r
        INNER JOIN result_contracts rc ON rc.result_id = r.result_id
        WHERE rc.contract_id = ?
          AND rc.is_primary = TRUE
          AND rc.is_active = TRUE
          AND r.is_active = TRUE
          AND r.is_snapshot = FALSE
      ),
      country_usage AS (
        SELECT
          result_country.isoAlpha2,
          clarisa_country.name AS country_name,
          COUNT(*) AS country_count
        FROM result_countries result_country
        INNER JOIN contract_results cr ON cr.result_id = result_country.result_id
        INNER JOIN clarisa_countries clarisa_country
          ON clarisa_country.isoAlpha2 = result_country.isoAlpha2
        WHERE result_country.is_active = TRUE
        GROUP BY result_country.isoAlpha2, clarisa_country.name
      ),
      top_countries AS (
        SELECT
          isoAlpha2,
          country_name,
          country_count,
          ROW_NUMBER() OVER (
            ORDER BY country_count DESC, isoAlpha2
          ) AS country_rank
        FROM country_usage
      ),
      subnational_usage AS (
        SELECT
          result_country.isoAlpha2,
          clarisa_sub_national.id AS sub_national_id,
          clarisa_sub_national.name AS sub_national_name,
          COUNT(*) AS sub_count
        FROM result_countries_sub_nationals result_sub_national
        INNER JOIN result_countries result_country
          ON result_country.result_country_id = result_sub_national.result_country_id
        INNER JOIN contract_results cr ON cr.result_id = result_country.result_id
        INNER JOIN clarisa_sub_nationals clarisa_sub_national
          ON clarisa_sub_national.id = result_sub_national.sub_national_id
        WHERE result_sub_national.is_active = TRUE
          AND result_country.is_active = TRUE
        GROUP BY
          result_country.isoAlpha2,
          clarisa_sub_national.id,
          clarisa_sub_national.name
      ),
      ranked_subnationals AS (
        SELECT
          subnational_usage.*,
          ROW_NUMBER() OVER (
            PARTITION BY subnational_usage.isoAlpha2
            ORDER BY subnational_usage.sub_count DESC, subnational_usage.sub_national_id
          ) AS sub_rank
        FROM subnational_usage
        INNER JOIN top_countries
          ON top_countries.isoAlpha2 = subnational_usage.isoAlpha2
         AND top_countries.country_rank <= ?
      )
      SELECT
        top_countries.isoAlpha2,
        top_countries.country_name,
        top_countries.country_count,
        top_countries.country_rank,
        ranked_subnationals.sub_national_id,
        ranked_subnationals.sub_national_name,
        ranked_subnationals.sub_count,
        ranked_subnationals.sub_rank
      FROM top_countries
      LEFT JOIN ranked_subnationals
        ON ranked_subnationals.isoAlpha2 = top_countries.isoAlpha2
       AND ranked_subnationals.sub_rank <= ?
      WHERE top_countries.country_rank <= ?
      ORDER BY top_countries.country_rank, ranked_subnationals.sub_rank
    `;

    const [summaryRows, regionRows, countryMatrixRows] = await Promise.all([
      this.query(summaryQuery, [contractId]),
      this.query(regionsQuery, [contractId, safeLimit]),
      this.query(countriesMatrixQuery, [
        contractId,
        safeLimit,
        safeLimit,
        safeLimit,
      ]),
    ]);

    const summaryRow = summaryRows[0] ?? {};
    const geoScopeSummary: GeoScopeSummaryDto = {
      global: Number(summaryRow.global_count ?? 0),
      regional: Number(summaryRow.regional_count ?? 0),
      countries: Number(summaryRow.countries_count ?? 0),
      sub_national: Number(summaryRow.sub_national_count ?? 0),
      yet_to_be_determined: Number(summaryRow.yet_to_be_determined_count ?? 0),
    };

    const topCountries = this.mapCountriesWithSubNationals(countryMatrixRows);

    return {
      contract_id: contractId,
      limit: safeLimit,
      geo_scope_summary: geoScopeSummary,
      top_regions: regionRows as RegionByContractCountDto[],
      top_countries: topCountries,
    };
  }

  private mapCountriesWithSubNationals(
    rows: Record<string, unknown>[],
  ): CountryWithSubNationalsDto[] {
    const countriesMap = new Map<string, CountryWithSubNationalsDto>();

    for (const row of rows) {
      const isoAlpha2 = String(row.isoAlpha2);
      if (!countriesMap.has(isoAlpha2)) {
        countriesMap.set(isoAlpha2, {
          iso_alpha_2: isoAlpha2,
          country_name: String(row.country_name ?? ''),
          count: Number(row.country_count ?? 0),
          top_sub_nationals: [],
        });
      }

      if (!isEmpty(row.sub_national_id)) {
        const subNational: SubNationalByContractCountDto = {
          sub_national_id: Number(row.sub_national_id),
          sub_national_name: String(row.sub_national_name ?? ''),
          count: Number(row.sub_count ?? 0),
        };
        countriesMap.get(isoAlpha2).top_sub_nationals.push(subNational);
      }
    }

    return Array.from(countriesMap.values());
  }

  async getTopPartnersReport(
    contractId: string,
    limit?: number,
  ): Promise<ContractTopPartnersReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const safeLimit = this.normalizeReportLimit(limit);
    const contractResultsSubquery = `
      SELECT DISTINCT r.result_id
      FROM results r
      INNER JOIN result_contracts rc ON rc.result_id = r.result_id
      WHERE rc.contract_id = ?
        AND rc.is_primary = TRUE
        AND rc.is_active = TRUE
        AND r.is_active = TRUE
        AND r.is_snapshot = FALSE
    `;

    const query = `
      SELECT
        clarisa_institution.code AS institution_id,
        clarisa_institution.name AS institution_name,
        clarisa_institution.acronym AS acronym,
        COUNT(DISTINCT result_institution.result_id) AS count
      FROM result_institutions result_institution
      INNER JOIN (${contractResultsSubquery}) contract_results
        ON contract_results.result_id = result_institution.result_id
      INNER JOIN clarisa_institutions clarisa_institution
        ON clarisa_institution.code = result_institution.institution_id
      WHERE result_institution.institution_role_id = ?
        AND result_institution.is_active = TRUE
      GROUP BY
        clarisa_institution.code,
        clarisa_institution.name,
        clarisa_institution.acronym
      ORDER BY count DESC, clarisa_institution.code
      LIMIT ?
    `;

    const rows = await this.query(query, [
      contractId,
      InstitutionRolesEnum.PARTNERS,
      safeLimit,
    ]);

    return {
      contract_id: contractId,
      limit: safeLimit,
      top_partners: rows as PartnerByContractCountDto[],
    };
  }

  async getTopContributorsReport(
    contractId: string,
    limit?: number,
  ): Promise<ContractTopContributorsReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const safeLimit = this.normalizeReportLimit(limit);
    const primaryContractResultsSubquery = `
      SELECT DISTINCT r.result_id
      FROM results r
      INNER JOIN result_contracts rc ON rc.result_id = r.result_id
      WHERE rc.contract_id = ?
        AND rc.is_primary = TRUE
        AND rc.is_active = TRUE
        AND r.is_active = TRUE
        AND r.is_snapshot = FALSE
    `;

    const query = `
      SELECT
        secondary_contract.contract_id,
        agresso_contract.description AS contract_description,
        agresso_contract.projectDescription AS project_name,
        COUNT(DISTINCT secondary_contract.result_id) AS count
      FROM result_contracts secondary_contract
      INNER JOIN (${primaryContractResultsSubquery}) primary_contract_results
        ON primary_contract_results.result_id = secondary_contract.result_id
      LEFT JOIN agresso_contracts agresso_contract
        ON agresso_contract.agreement_id = secondary_contract.contract_id
      WHERE secondary_contract.is_primary = FALSE
        AND secondary_contract.is_active = TRUE
      GROUP BY
        secondary_contract.contract_id,
        agresso_contract.description,
        agresso_contract.projectDescription
      ORDER BY count DESC, secondary_contract.contract_id
      LIMIT ?
    `;

    const rows = await this.query(query, [contractId, safeLimit]);

    return {
      contract_id: contractId,
      limit: safeLimit,
      top_contributors: rows as ContributorContractCountDto[],
    };
  }

  async getTopPrimaryLeversReport(
    contractId: string,
    limit?: number,
  ): Promise<ContractTopPrimaryLeversReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const safeLimit = this.normalizeReportLimit(limit);
    const primaryContractResultsSubquery = `
      SELECT DISTINCT r.result_id
      FROM results r
      INNER JOIN result_contracts rc ON rc.result_id = r.result_id
      WHERE rc.contract_id = ?
        AND rc.is_primary = TRUE
        AND rc.is_active = TRUE
        AND r.is_active = TRUE
        AND r.is_snapshot = FALSE
    `;

    const query = `
      SELECT
        clarisa_lever.id AS lever_id,
        clarisa_lever.short_name AS short_name,
        clarisa_lever.full_name AS full_name,
        COUNT(DISTINCT result_lever.result_id) AS count
      FROM result_levers result_lever
      INNER JOIN (${primaryContractResultsSubquery}) primary_contract_results
        ON primary_contract_results.result_id = result_lever.result_id
      INNER JOIN clarisa_levers clarisa_lever
        ON clarisa_lever.id = result_lever.lever_id
      WHERE result_lever.is_primary = TRUE
        AND result_lever.is_active = TRUE
      GROUP BY
        clarisa_lever.id,
        clarisa_lever.short_name,
        clarisa_lever.full_name
      ORDER BY count DESC, clarisa_lever.id
      LIMIT ?
    `;

    const rows = await this.query(query, [contractId, safeLimit]);

    return {
      contract_id: contractId,
      limit: safeLimit,
      top_primary_levers: rows as PrimaryLeverCountDto[],
    };
  }
}

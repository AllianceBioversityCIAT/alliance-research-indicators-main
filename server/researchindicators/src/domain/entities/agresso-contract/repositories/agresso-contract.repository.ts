import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { AgressoContract } from '../entities/agresso-contract.entity';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ContractResultCountDto } from '../dto/contract-result-count.dto';
import { isEmpty } from '../../../shared/utils/object.utils';
import { formatPersonName } from '../../../shared/utils/name-format.util';
import { StringKeys } from '../../../shared/global-dto/types-global';
import { OrderFieldsEnum } from '../enum/order-fields.enum';
import { Indicator } from '../../indicators/entities/indicator.entity';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { MappedContractsDto } from '../dto/mapper-agresso-contract.dto';
import {
  escapeLikeString,
  isValidText,
} from '../../../shared/utils/query-sanitizer.util';
import { User } from '../../../complementary-entities/secondary/user/user.entity';
import { effectivePoolFundingContributorSql } from '../../../shared/utils/pool-funding.util';
import { ElasticFindEntity } from '../../../tools/open-search/dto/elastic-find-entity.dto';
import { AgressoContractOpensearchDto } from '../../../tools/open-search/agresso-contract/dto/agresso-contract.opensearch.dto';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
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
import {
  ContractTopMainContactPersonsReportDto,
  MainContactPersonByContractCountDto,
} from '../dto/reports-main-contact-persons.dto';
import {
  ContractStaffFieldsDto,
  ContractStaffReportDto,
} from '../dto/reports-contract-staff.dto';
import { InstitutionRolesEnum } from '../../institution-roles/enums/institution-roles.enum';
import { UserRolesEnum } from '../../user-roles/enum/user-roles.enum';
import {
  ContractResultsSummaryIndicatorYearBucketDto,
  ContractResultsSummaryReportDto,
  ContractResultsSummaryStatusBucketDto,
  ContractResultsSummaryYearBucketDto,
} from '../dto/contract-results-summary-report.dto';
import {
  ContractSpAlignmentReportDto,
  ContractSpAlignmentSpDto,
} from '../dto/contract-sp-alignment-report.dto';
import { ContractDashboardReportDto } from '../dto/contract-dashboard-report.dto';
import {
  CapacitySharingDetailsDto,
  CapacitySharingGenderSplitDto,
  ContractIndicatorDetailsReportDto,
  InnovationDevDetailsDto,
  InnovationDevScalabilityProfileDto,
  InnovationUseDetailsDto,
  KnowledgeProductDetailsDto,
  OicrDetailsDto,
  PolicyChangeDetailsDto,
  ReportingVelocityItemDto,
} from '../dto/contract-indicator-details-report.dto';
import {
  ContributingLeversSectionDto,
  EvidenceSectionDto,
  KeywordsSectionDto,
  ReachSectionDto,
  ReviewFlowSectionDto,
  SdgCoverageSectionDto,
} from '../dto/contract-insights-report.dto';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { computeReviewCycleTime } from '../utils/review-cycle-time.util';
import {
  getReviewEventTypeLabel,
  getReviewDecisionLabel,
} from '../../result-review-history/constants/review-event-vocabulary.constants';

@Injectable()
export class AgressoContractRepository
  extends Repository<AgressoContract>
  implements ElasticFindEntity<AgressoContractOpensearchDto>
{
  private readonly logger = new LoggerUtil({
    name: AgressoContractRepository.name,
  });

  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
    private readonly alianceManagementApp: AlianceManagementApp,
  ) {
    super(AgressoContract, dataSource.createEntityManager());
  }

  async findDataForOpenSearch(
    option: FindAllOptions,
    ids?: string[],
  ): Promise<AgressoContractOpensearchDto[]> {
    const where: FindOptionsWhere<AgressoContract> = {};
    if (option !== FindAllOptions.SHOW_ALL) where.is_active = true;
    if (ids?.length) where.agreement_id = In(ids);

    const contracts = await this.find({ where });
    return contracts.map((contract) => ({
      agreement_id: contract.agreement_id,
      projectDescription: contract.projectDescription,
      project_lead_description: contract.project_lead_description,
      description: contract.description,
      funding_type: contract.funding_type,
      contract_status: contract.contract_status,
      is_pool_funding_contributor: contract.is_pool_funding_contributor,
    }));
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
          .map(([key, value]) =>
            key === 'is_pool_funding_contributor'
              ? `ac.${key} = ${value ? 1 : 0}`
              : `ac.${key} like '%${value}%'`,
          )
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
      ac.*,
      COALESCE(
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'code', pfc.cgiar_entity_code,
              'name', pfc.cgiar_entity_name
            )
          )
          FROM pooled_funding_contracts pfc
          WHERE pfc.agreement_id = ac.agreement_id
            AND pfc.is_active = 1
        ),
        JSON_ARRAY()
      ) AS cgiar_entities,
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
    ).then((response) => {
      if (!response || response.length === 0) {
        return null;
      }
      const contract = response[0];
      let cgiarEntities = contract.cgiar_entities;
      if (typeof cgiarEntities === 'string') {
        try {
          cgiarEntities = JSON.parse(cgiarEntities);
        } catch {
          cgiarEntities = [];
        }
      }
      if (!Array.isArray(cgiarEntities)) {
        cgiarEntities = [];
      }

      let indicators = contract.indicators;
      if (typeof indicators === 'string') {
        try {
          indicators = JSON.parse(indicators);
        } catch {
          indicators = [];
        }
      }

      let sdgs = contract.sdgs;
      if (typeof sdgs === 'string') {
        try {
          sdgs = JSON.parse(sdgs);
        } catch {
          // ignore
        }
      }

      const formattedContract: ContractResultCountDto = {
        ...contract,
        indicators,
        cgiar_entities: cgiarEntities,
      };
      if (sdgs !== undefined) {
        formattedContract.sdgs = sdgs;
      }
      return formattedContract;
    });
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
      [OrderFieldsEnum.POOL_FUNDING_CONTRIBUTOR]:
        effectivePoolFundingContributorSql('ac'),
      [OrderFieldsEnum.FUNDING_TYPE]: 'ac.funding_type',
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
    // @sdd-spec bilateral-module/mapping-drives-pool-funding-tag
    const poolFundingContributorFilter =
      typeof filter?.is_pool_funding_contributor === 'boolean'
        ? `AND ${effectivePoolFundingContributorSql('ac')} = ${filter.is_pool_funding_contributor ? 1 : 0}`
        : '';

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
    ${poolFundingContributorFilter}
    ${validFilter(filter?.funding_type, this.buildFundingTypeFilterClause(filter?.funding_type))}
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
        paginated_contracts.is_pool_funding_contributor,
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
            ${effectivePoolFundingContributorSql('ac')} AS is_pool_funding_contributor,
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
        ${poolFundingContributorFilter}
        ${validFilter(filter?.funding_type, this.buildFundingTypeFilterClause(filter?.funding_type))}
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

  private buildFundingTypeFilterClause(fundingTypes?: string[]): string {
    if (!fundingTypes?.length) {
      return '';
    }

    const fundingTypeList = fundingTypes
      .map((fundingType) => `'${fundingType}'`)
      .join(',');

    return `AND ac.funding_type in (${fundingTypeList})`;
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

  private buildPrimaryContractResultsSubquery(options?: {
    includeGeoScope?: boolean;
    includeStatusId?: boolean;
    includeReportYearId?: boolean;
    includeIndicatorId?: boolean;
    includeCreatedAt?: boolean;
  }): string {
    const columns = ['r.result_id'];
    if (options?.includeGeoScope) columns.push('r.geo_scope_id');
    if (options?.includeStatusId) columns.push('r.result_status_id');
    if (options?.includeReportYearId) columns.push('r.report_year_id');
    if (options?.includeIndicatorId) columns.push('r.indicator_id');
    if (options?.includeCreatedAt) columns.push('r.created_at');
    const selectColumns = columns.join(', ');

    return `
      SELECT DISTINCT ${selectColumns}
      FROM results r
      INNER JOIN result_contracts rc ON rc.result_id = r.result_id
      WHERE rc.contract_id = ?
        AND rc.is_primary = TRUE
        AND rc.is_active = TRUE
        AND r.is_active = TRUE
        AND r.is_snapshot = FALSE
    `;
  }

  private buildContractResultsSubquery(): string {
    return this.buildPrimaryContractResultsSubquery({ includeGeoScope: true });
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
        ${this.buildPrimaryContractResultsSubquery()}
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
    const primaryContractResultsSubquery =
      this.buildPrimaryContractResultsSubquery();

    const query = `
      SELECT
        clarisa_institution.code AS institution_id,
        clarisa_institution.name AS institution_name,
        clarisa_institution.acronym AS acronym,
        COUNT(DISTINCT result_institution.result_id) AS count
      FROM result_institutions result_institution
      INNER JOIN (${primaryContractResultsSubquery}) contract_results
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
    const primaryContractResultsSubquery =
      this.buildPrimaryContractResultsSubquery();

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
    const primaryContractResultsSubquery =
      this.buildPrimaryContractResultsSubquery();

    const query = `
      SELECT
        clarisa_lever.id AS lever_id,
        clarisa_lever.short_name AS short_name,
        clarisa_lever.full_name AS full_name,
        clarisa_lever.icon AS icon,
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
        clarisa_lever.full_name,
        clarisa_lever.icon
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

  async getTopMainContactPersonsReport(
    contractId: string,
    limit?: number,
  ): Promise<ContractTopMainContactPersonsReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const safeLimit = this.normalizeReportLimit(limit);
    const primaryContractResultsSubquery =
      this.buildPrimaryContractResultsSubquery();

    const query = `
      SELECT
        alliance_user_staff.carnet AS user_id,
        alliance_user_staff.first_name AS first_name,
        alliance_user_staff.last_name AS last_name,
        alliance_user_staff.email AS email,
        COUNT(DISTINCT result_user.result_id) AS count
      FROM result_users result_user
      INNER JOIN (${primaryContractResultsSubquery}) primary_contract_results
        ON primary_contract_results.result_id = result_user.result_id
      INNER JOIN alliance_user_staff alliance_user_staff
        ON alliance_user_staff.carnet = result_user.user_id
      WHERE result_user.user_role_id = ?
        AND result_user.is_active = TRUE
      GROUP BY
        alliance_user_staff.carnet,
        alliance_user_staff.first_name,
        alliance_user_staff.last_name,
        alliance_user_staff.email
      ORDER BY count DESC, alliance_user_staff.carnet
      LIMIT ?
    `;

    const rows = await this.query(query, [
      contractId,
      UserRolesEnum.MAIN_CONTACT,
      safeLimit,
    ]);

    return {
      contract_id: contractId,
      limit: safeLimit,
      top_main_contact_persons: rows as MainContactPersonByContractCountDto[],
    };
  }

  async getContractStaffReport(
    contractId: string,
  ): Promise<ContractStaffReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const query = `
      SELECT
        ac.project_lead_description AS project_lead_description,
        ac.programAssistantName AS programAssistantName,
        ac.researchAssistantName AS researchAssistantName
      FROM agresso_contracts ac
      WHERE ac.agreement_id = ?
        AND ac.is_active = TRUE
    `;

    const rows = await this.query(query, [contractId]);
    if (!rows?.length) {
      throw new NotFoundException('Contract not found');
    }

    return {
      contract_id: contractId,
      staff: this.mapContractStaff(rows[0] as ContractStaffFieldsDto),
    };
  }

  private mapContractStaff(
    fields: ContractStaffFieldsDto,
  ): ContractStaffReportDto['staff'] {
    const staffMappings = [
      { name: fields.project_lead_description, role: 'Project Lead' },
      { name: fields.programAssistantName, role: 'Program Assistant' },
      { name: fields.researchAssistantName, role: 'Research Assistant' },
    ];

    return staffMappings
      .filter(({ name }) => !isEmpty(String(name ?? '').trim()))
      .map(({ name, role }) => ({
        name: formatPersonName(name),
        role,
      }));
  }

  async getResultsSummaryReport(
    contractId: string,
  ): Promise<ContractResultsSummaryReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const statusSubquery = this.buildPrimaryContractResultsSubquery({
      includeStatusId: true,
    });
    const yearSubquery = this.buildPrimaryContractResultsSubquery({
      includeReportYearId: true,
    });
    const indicatorYearSubquery = this.buildPrimaryContractResultsSubquery({
      includeIndicatorId: true,
      includeReportYearId: true,
    });
    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const statusQuery = `
      SELECT
        contract_results.result_status_id AS status_id,
        COALESCE(rs.name, 'No status') AS name,
        COUNT(*) AS count
      FROM (${statusSubquery}) contract_results
      LEFT JOIN result_status rs
        ON rs.result_status_id = contract_results.result_status_id
      GROUP BY contract_results.result_status_id, rs.name
      ORDER BY count DESC
    `;

    const yearQuery = `
      SELECT
        contract_results.report_year_id AS year,
        COUNT(*) AS count
      FROM (${yearSubquery}) contract_results
      GROUP BY contract_results.report_year_id
      ORDER BY year
    `;

    const partnersQuery = `
      SELECT
        COUNT(DISTINCT result_institution.institution_id) AS partner_institutions
      FROM result_institutions result_institution
      INNER JOIN (${baseSubquery}) contract_results
        ON contract_results.result_id = result_institution.result_id
      WHERE result_institution.institution_role_id = ?
        AND result_institution.is_active = TRUE
    `;

    const indicatorYearQuery = `
      SELECT
        contract_results.indicator_id AS indicator_id,
        contract_results.report_year_id AS year,
        COUNT(*) AS count
      FROM (${indicatorYearSubquery}) contract_results
      WHERE contract_results.indicator_id IS NOT NULL
      GROUP BY contract_results.indicator_id, contract_results.report_year_id
      ORDER BY contract_results.indicator_id, year
    `;

    const [statusRows, yearRows, partnerRows, indicatorYearRows] =
      await Promise.all([
        this.query(statusQuery, [contractId]),
        this.query(yearQuery, [contractId]),
        this.query(partnersQuery, [contractId, InstitutionRolesEnum.PARTNERS]),
        this.query(indicatorYearQuery, [contractId]),
      ]);

    const by_status: ContractResultsSummaryStatusBucketDto[] = (
      statusRows as Array<Record<string, unknown>>
    ).map((row) => ({
      status_id:
        row.status_id === null || row.status_id === undefined
          ? null
          : Number(row.status_id),
      name: String(row.name ?? 'No status'),
      count: Number(row.count ?? 0),
    }));

    const by_year: ContractResultsSummaryYearBucketDto[] = (
      yearRows as Array<Record<string, unknown>>
    ).map((row) => ({
      year:
        row.year === null || row.year === undefined ? null : Number(row.year),
      count: Number(row.count ?? 0),
    }));

    const by_indicator_year: ContractResultsSummaryIndicatorYearBucketDto[] = (
      (indicatorYearRows as Array<Record<string, unknown>>) ?? []
    ).map((row) => ({
      indicator_id: Number(row.indicator_id),
      year:
        row.year === null || row.year === undefined ? null : Number(row.year),
      count: Number(row.count ?? 0),
    }));

    const partner_institutions = Number(
      (partnerRows as Array<Record<string, unknown>>)[0]
        ?.partner_institutions ?? 0,
    );

    const total = by_status.reduce((sum, row) => sum + row.count, 0);

    return {
      total,
      by_status,
      by_year,
      partner_institutions,
      by_indicator_year,
    };
  }

  async getSpAlignmentReport(
    contractId: string,
  ): Promise<ContractSpAlignmentReportDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const primaryContractResultsSubquery =
      this.buildPrimaryContractResultsSubquery();

    const alignmentsQuery = `
      SELECT
        csp.official_code AS sp_code,
        csp.name AS name,
        csp.category AS category,
        csp.icon_key AS icon_key,
        r.result_official_code AS result_official_code,
        r.title AS result_title,
        COALESCE(rpfas.sp_role, 'UNKNOWN') AS role
      FROM (${primaryContractResultsSubquery}) primary_results
      INNER JOIN results r
        ON r.result_id = primary_results.result_id
      INNER JOIN result_pool_funding_alignment rpfa
        ON rpfa.result_id = primary_results.result_id
        AND rpfa.is_active = TRUE
      INNER JOIN result_pool_funding_alignment_sp rpfas
        ON rpfas.alignment_id = rpfa.id
        AND rpfas.is_active = TRUE
      INNER JOIN clarisa_science_programs csp
        ON csp.official_code = rpfas.sp_code
        AND csp.is_active = TRUE
      ORDER BY csp.official_code, r.result_official_code
    `;

    const countQuery = `
      SELECT
        COUNT(DISTINCT primary_results.result_id) AS total_results,
        COUNT(DISTINCT CASE
          WHEN csp.official_code IS NOT NULL THEN primary_results.result_id
        END) AS results_with_alignment
      FROM (${primaryContractResultsSubquery}) primary_results
      LEFT JOIN result_pool_funding_alignment rpfa
        ON rpfa.result_id = primary_results.result_id
        AND rpfa.is_active = TRUE
      LEFT JOIN result_pool_funding_alignment_sp rpfas
        ON rpfas.alignment_id = rpfa.id
        AND rpfas.is_active = TRUE
      LEFT JOIN clarisa_science_programs csp
        ON csp.official_code = rpfas.sp_code
        AND csp.is_active = TRUE
    `;

    const [alignmentRows, countRows] = await Promise.all([
      this.query(alignmentsQuery, [contractId]),
      this.query(countQuery, [contractId]),
    ]);

    const spsMap = new Map<string, ContractSpAlignmentSpDto>();

    for (const row of alignmentRows as Array<Record<string, unknown>>) {
      const spCode = String(row.sp_code);
      let spEntry = spsMap.get(spCode);

      if (!spEntry) {
        spEntry = {
          sp_code: spCode,
          name: String(row.name ?? ''),
          category:
            row.category === null || row.category === undefined
              ? null
              : String(row.category),
          icon_key:
            row.icon_key === null || row.icon_key === undefined
              ? null
              : String(row.icon_key),
          links: [],
        };
        spsMap.set(spCode, spEntry);
      }

      spEntry.links.push({
        result_official_code: String(row.result_official_code),
        result_title: String(row.result_title ?? ''),
        role: (row.role as 'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN') ?? 'UNKNOWN',
      });
    }

    const summaryRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const totalResults = Number(summaryRow.total_results ?? 0);
    const resultsWithAlignment = Number(summaryRow.results_with_alignment ?? 0);
    const resultsWithoutAlignment = Math.max(
      0,
      totalResults - resultsWithAlignment,
    );

    return {
      sps: Array.from(spsMap.values()),
      results_with_alignment: resultsWithAlignment,
      results_without_alignment: resultsWithoutAlignment,
    };
  }

  async getContractDashboard(
    contractId: string,
  ): Promise<{ data: ContractDashboardReportDto; errors: string[] }> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const [
      summaryResult,
      partnersResult,
      leversResult,
      contactsResult,
      contributorsResult,
      geoScopeResult,
      spAlignmentResult,
    ] = await Promise.allSettled([
      this.getResultsSummaryReport(contractId),
      this.getTopPartnersReport(contractId),
      this.getTopPrimaryLeversReport(contractId),
      this.getTopMainContactPersonsReport(contractId),
      this.getTopContributorsReport(contractId),
      this.getGeoScopeReport(contractId),
      this.getSpAlignmentReport(contractId),
    ]);

    const errors: string[] = [];

    const summary =
      summaryResult.status === 'fulfilled'
        ? summaryResult.value
        : (errors.push(
            `summary: ${summaryResult.reason?.message ?? summaryResult.reason}`,
          ),
          null);

    const partners =
      partnersResult.status === 'fulfilled'
        ? (partnersResult.value?.top_partners ?? null)
        : (errors.push(
            `partners: ${partnersResult.reason?.message ?? partnersResult.reason}`,
          ),
          null);

    const primary_levers =
      leversResult.status === 'fulfilled'
        ? (leversResult.value?.top_primary_levers ?? null)
        : (errors.push(
            `primary_levers: ${leversResult.reason?.message ?? leversResult.reason}`,
          ),
          null);

    const main_contacts =
      contactsResult.status === 'fulfilled'
        ? (contactsResult.value?.top_main_contact_persons ?? null)
        : (errors.push(
            `main_contacts: ${contactsResult.reason?.message ?? contactsResult.reason}`,
          ),
          null);

    const contributors =
      contributorsResult.status === 'fulfilled'
        ? (contributorsResult.value?.top_contributors ?? null)
        : (errors.push(
            `contributors: ${contributorsResult.reason?.message ?? contributorsResult.reason}`,
          ),
          null);

    const geo_scope =
      geoScopeResult.status === 'fulfilled'
        ? geoScopeResult.value
        : (errors.push(
            `geo_scope: ${geoScopeResult.reason?.message ?? geoScopeResult.reason}`,
          ),
          null);

    const sp_alignment =
      spAlignmentResult.status === 'fulfilled'
        ? (spAlignmentResult.value ?? null)
        : (errors.push(
            `sp_alignment: ${spAlignmentResult.reason?.message ?? spAlignmentResult.reason}`,
          ),
          null);

    return {
      data: {
        summary,
        tops: {
          partners,
          primary_levers,
          main_contacts,
          contributors,
        },
        geo_scope,
        sp_alignment,
      },
      errors,
    };
  }

  async getIndicatorDetailsReport(
    contractId: string,
  ): Promise<{ data: ContractIndicatorDetailsReportDto; errors: string[] }> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const indicatorTotals = await this.getIndicatorTotalResults(contractId);

    const totalCapacity =
      indicatorTotals[IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT] ?? 0;
    const totalInnovDev = indicatorTotals[IndicatorsEnum.INNOVATION_DEV] ?? 0;
    const totalKp = indicatorTotals[IndicatorsEnum.KNOWLEDGE_PRODUCT] ?? 0;
    const totalPolicy = indicatorTotals[IndicatorsEnum.POLICY_CHANGE] ?? 0;
    const totalOicr = indicatorTotals[IndicatorsEnum.OICR] ?? 0;
    const totalInnovUse = indicatorTotals[IndicatorsEnum.INNOVATION_USE] ?? 0;

    const [
      capacityResult,
      innovDevResult,
      kpResult,
      policyResult,
      oicrResult,
      innovUseResult,
      velocityResult,
    ] = await Promise.allSettled([
      totalCapacity > 0
        ? this.getCapacitySharingDetailsReport(contractId, totalCapacity)
        : Promise.resolve(undefined),
      totalInnovDev > 0
        ? this.getInnovationDevDetailsReport(contractId, totalInnovDev)
        : Promise.resolve(undefined),
      totalKp > 0
        ? this.getKnowledgeProductDetailsReport(contractId, totalKp)
        : Promise.resolve(undefined),
      totalPolicy > 0
        ? this.getPolicyChangeDetailsReport(contractId, totalPolicy)
        : Promise.resolve(undefined),
      totalOicr > 0
        ? this.getOicrDetailsReport(contractId, totalOicr)
        : Promise.resolve(undefined),
      totalInnovUse > 0
        ? this.getInnovationUseDetailsReport(contractId, totalInnovUse)
        : Promise.resolve(undefined),
      this.getReportingVelocityReport(contractId),
    ]);

    const errors: string[] = [];
    const data: ContractIndicatorDetailsReportDto = {};

    let attemptedCount = 1;
    let rejectedCount = 0;

    if (totalCapacity > 0) {
      attemptedCount++;
      if (capacityResult.status === 'fulfilled') {
        data.capacity_sharing =
          capacityResult.value as CapacitySharingDetailsDto;
      } else {
        rejectedCount++;
        const err =
          capacityResult.reason?.message ?? String(capacityResult.reason);
        errors.push(`capacity_sharing: ${err}`);
        this.logger._error(
          `Failed to get capacity sharing details for contract ${contractId}: ${err}`,
        );
        data.capacity_sharing = null;
      }
    }

    if (totalInnovDev > 0) {
      attemptedCount++;
      if (innovDevResult.status === 'fulfilled') {
        data.innovation_dev = innovDevResult.value as InnovationDevDetailsDto;
      } else {
        rejectedCount++;
        const err =
          innovDevResult.reason?.message ?? String(innovDevResult.reason);
        errors.push(`innovation_dev: ${err}`);
        this.logger._error(
          `Failed to get innovation dev details for contract ${contractId}: ${err}`,
        );
        data.innovation_dev = null;
      }
    }

    if (totalKp > 0) {
      attemptedCount++;
      if (kpResult.status === 'fulfilled') {
        data.knowledge_product = kpResult.value as KnowledgeProductDetailsDto;
      } else {
        rejectedCount++;
        const err = kpResult.reason?.message ?? String(kpResult.reason);
        errors.push(`knowledge_product: ${err}`);
        this.logger._error(
          `Failed to get knowledge product details for contract ${contractId}: ${err}`,
        );
        data.knowledge_product = null;
      }
    }

    if (totalPolicy > 0) {
      attemptedCount++;
      if (policyResult.status === 'fulfilled') {
        data.policy_change = policyResult.value as PolicyChangeDetailsDto;
      } else {
        rejectedCount++;
        const err = policyResult.reason?.message ?? String(policyResult.reason);
        errors.push(`policy_change: ${err}`);
        this.logger._error(
          `Failed to get policy change details for contract ${contractId}: ${err}`,
        );
        data.policy_change = null;
      }
    }

    if (totalOicr > 0) {
      attemptedCount++;
      if (oicrResult.status === 'fulfilled') {
        data.oicr = oicrResult.value as OicrDetailsDto;
      } else {
        rejectedCount++;
        const err = oicrResult.reason?.message ?? String(oicrResult.reason);
        errors.push(`oicr: ${err}`);
        this.logger._error(
          `Failed to get OICR details for contract ${contractId}: ${err}`,
        );
        data.oicr = null;
      }
    }

    if (totalInnovUse > 0) {
      attemptedCount++;
      if (innovUseResult.status === 'fulfilled') {
        data.innovation_use = innovUseResult.value as InnovationUseDetailsDto;
      } else {
        rejectedCount++;
        const err =
          innovUseResult.reason?.message ?? String(innovUseResult.reason);
        errors.push(`innovation_use: ${err}`);
        this.logger._error(
          `Failed to get innovation use details for contract ${contractId}: ${err}`,
        );
        data.innovation_use = null;
      }
    }

    if (velocityResult.status === 'fulfilled') {
      data.reporting_velocity =
        velocityResult.value as ReportingVelocityItemDto[];
    } else {
      rejectedCount++;
      const err =
        velocityResult.reason?.message ?? String(velocityResult.reason);
      errors.push(`reporting_velocity: ${err}`);
      this.logger._error(
        `Failed to get reporting velocity for contract ${contractId}: ${err}`,
      );
      data.reporting_velocity = null;
    }

    if (attemptedCount > 0 && rejectedCount === attemptedCount) {
      throw new InternalServerErrorException(
        'All indicator detail queries failed',
      );
    }

    return {
      data,
      errors,
    };
  }

  async getIndicatorTotalResults(
    contractId: string,
  ): Promise<Record<number, number>> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const subquery = this.buildPrimaryContractResultsSubquery({
      includeIndicatorId: true,
    });

    const query = `
      SELECT
        cr.indicator_id,
        COUNT(*) AS count
      FROM (${subquery}) cr
      WHERE cr.indicator_id IS NOT NULL
      GROUP BY cr.indicator_id
    `;

    const rows = (await this.query(query, [contractId])) as Array<{
      indicator_id: number;
      count: string | number;
    }>;

    const totals: Record<number, number> = {};
    for (const row of rows) {
      if (row.indicator_id !== null && row.indicator_id !== undefined) {
        totals[Number(row.indicator_id)] = Number(row.count ?? 0);
      }
    }
    return totals;
  }

  async getReportingVelocityReport(
    contractId: string,
  ): Promise<ReportingVelocityItemDto[]> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const subquery = this.buildPrimaryContractResultsSubquery({
      includeCreatedAt: true,
    });

    const query = `
      SELECT
        DATE_FORMAT(cr.created_at, '%Y-%m') AS month,
        COUNT(*) AS count
      FROM (${subquery}) cr
      WHERE cr.created_at IS NOT NULL
        AND cr.created_at >= DATE_SUB(NOW(), INTERVAL 24 MONTH)
      GROUP BY DATE_FORMAT(cr.created_at, '%Y-%m')
      ORDER BY month ASC
    `;

    const rows = (await this.query(query, [contractId])) as Array<{
      month: string;
      count: string | number;
    }>;

    return rows.map((row) => ({
      month: String(row.month),
      count: Number(row.count ?? 0),
    }));
  }

  async getCapacitySharingDetailsReport(
    contractId: string,
    totalResults: number,
  ): Promise<CapacitySharingDetailsDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const summaryQuery = `
      SELECT
        COUNT(DISTINCT rcs.result_id) AS n,
        COALESCE(SUM(rcs.session_participants_total), 0) AS total_trainees,
        COALESCE(SUM(rcs.session_participants_female), 0) AS female_count,
        COALESCE(SUM(rcs.session_participants_male), 0) AS male_count,
        COALESCE(SUM(rcs.session_participants_non_binary), 0) AS non_binary_count
      FROM (${baseSubquery}) cr
      INNER JOIN result_capacity_sharing rcs
        ON rcs.result_id = cr.result_id
        AND rcs.is_active = TRUE
    `;

    const sessionLengthsQuery = `
      SELECT
        sl.session_length_id AS id,
        sl.name AS name,
        COUNT(DISTINCT rcs.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_capacity_sharing rcs
        ON rcs.result_id = cr.result_id
        AND rcs.is_active = TRUE
      INNER JOIN session_lengths sl
        ON sl.session_length_id = rcs.session_length_id
        AND sl.is_active = TRUE
      GROUP BY sl.session_length_id, sl.name
      ORDER BY count DESC, sl.name ASC
    `;

    const deliveryModalitiesQuery = `
      SELECT
        dm.delivery_modality_id AS id,
        dm.name AS name,
        COUNT(DISTINCT rcs.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_capacity_sharing rcs
        ON rcs.result_id = cr.result_id
        AND rcs.is_active = TRUE
      INNER JOIN delivery_modalities dm
        ON dm.delivery_modality_id = rcs.delivery_modality_id
        AND dm.is_active = TRUE
      GROUP BY dm.delivery_modality_id, dm.name
      ORDER BY count DESC, dm.name ASC
    `;

    const sessionTypesQuery = `
      SELECT
        st.session_type_id AS id,
        st.name AS name,
        COUNT(DISTINCT rcs.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_capacity_sharing rcs
        ON rcs.result_id = cr.result_id
        AND rcs.is_active = TRUE
      INNER JOIN session_types st
        ON st.session_type_id = rcs.session_type_id
        AND st.is_active = TRUE
      GROUP BY st.session_type_id, st.name
      ORDER BY count DESC, st.name ASC
    `;

    const [
      summaryRows,
      sessionLengthRows,
      deliveryModalityRows,
      sessionTypeRows,
    ] = await Promise.all([
      this.query(summaryQuery, [contractId]),
      this.query(sessionLengthsQuery, [contractId]),
      this.query(deliveryModalitiesQuery, [contractId]),
      this.query(sessionTypesQuery, [contractId]),
    ]);

    const summaryRow = (summaryRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(summaryRow.n ?? 0);
    const normalizedTotalResults = Number(totalResults ?? 0);

    if (n === 0) {
      return {
        meta: {
          total_results: normalizedTotalResults,
          n: 0,
        },
        total_trainees: 0,
        gender_split: [],
        session_lengths: [],
        delivery_modalities: [],
        session_types: [],
      };
    }

    const gender_split: CapacitySharingGenderSplitDto[] = [
      { gender: 'female', count: Number(summaryRow.female_count ?? 0) },
      { gender: 'male', count: Number(summaryRow.male_count ?? 0) },
      { gender: 'non_binary', count: Number(summaryRow.non_binary_count ?? 0) },
    ];

    return {
      meta: {
        total_results: normalizedTotalResults,
        n,
      },
      total_trainees: Number(summaryRow.total_trainees ?? 0),
      gender_split,
      session_lengths: (
        sessionLengthRows as Array<Record<string, unknown>>
      ).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
      delivery_modalities: (
        deliveryModalityRows as Array<Record<string, unknown>>
      ).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
      session_types: (sessionTypeRows as Array<Record<string, unknown>>).map(
        (row) => ({
          id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
          name: String(row.name),
          count: Number(row.count ?? 0),
        }),
      ),
    };
  }

  async getKnowledgeProductDetailsReport(
    contractId: string,
    totalResults: number,
  ): Promise<KnowledgeProductDetailsDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT rkp.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_knowledge_products rkp
        ON rkp.result_id = cr.result_id
        AND rkp.is_active = TRUE
    `;

    const openAccessQuery = `
      SELECT
        CASE
          WHEN rkp.open_access = TRUE THEN 'Open access'
          WHEN rkp.open_access = FALSE THEN 'Restricted'
          ELSE 'Unknown'
        END AS name,
        COUNT(DISTINCT rkp.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_knowledge_products rkp
        ON rkp.result_id = cr.result_id
        AND rkp.is_active = TRUE
      GROUP BY
        CASE
          WHEN rkp.open_access = TRUE THEN 'Open access'
          WHEN rkp.open_access = FALSE THEN 'Restricted'
          ELSE 'Unknown'
        END
      ORDER BY count DESC, name ASC
    `;

    const accessStatusQuery = `
      SELECT
        COALESCE(NULLIF(TRIM(rkp.access_status), ''), 'Unknown') AS name,
        COUNT(DISTINCT rkp.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_knowledge_products rkp
        ON rkp.result_id = cr.result_id
        AND rkp.is_active = TRUE
      GROUP BY COALESCE(NULLIF(TRIM(rkp.access_status), ''), 'Unknown')
      ORDER BY count DESC, name ASC
    `;

    const typesQuery = `
      SELECT
        NULL AS id,
        COALESCE(NULLIF(TRIM(rkp.type), ''), 'Unknown') AS name,
        COUNT(DISTINCT rkp.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_knowledge_products rkp
        ON rkp.result_id = cr.result_id
        AND rkp.is_active = TRUE
      GROUP BY COALESCE(NULLIF(TRIM(rkp.type), ''), 'Unknown')
      ORDER BY count DESC, name ASC
    `;

    const publicationsByYearQuery = `
      SELECT
        CASE
          WHEN rkp.publication_date IS NOT NULL
            AND TRIM(rkp.publication_date) != ''
            AND CAST(SUBSTRING(TRIM(rkp.publication_date), 1, 4) AS UNSIGNED) > 0
          THEN CAST(SUBSTRING(TRIM(rkp.publication_date), 1, 4) AS UNSIGNED)
          ELSE NULL
        END AS year,
        COUNT(DISTINCT rkp.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_knowledge_products rkp
        ON rkp.result_id = cr.result_id
        AND rkp.is_active = TRUE
      GROUP BY year
      ORDER BY year ASC
    `;

    const [
      countRows,
      openAccessRows,
      accessStatusRows,
      typesRows,
      publicationsByYearRows,
    ] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(openAccessQuery, [contractId]),
      this.query(accessStatusQuery, [contractId]),
      this.query(typesQuery, [contractId]),
      this.query(publicationsByYearQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);
    const normalizedTotalResults = Number(totalResults ?? 0);

    if (n === 0) {
      return {
        meta: {
          total_results: normalizedTotalResults,
          n: 0,
        },
        open_access_split: [],
        access_status: [],
        types: [],
        publications_by_year: [],
      };
    }

    return {
      meta: {
        total_results: normalizedTotalResults,
        n,
      },
      open_access_split: (openAccessRows as Array<Record<string, unknown>>).map(
        (row) => ({
          name: String(row.name),
          count: Number(row.count ?? 0),
        }),
      ),
      access_status: (accessStatusRows as Array<Record<string, unknown>>).map(
        (row) => ({
          name: String(row.name),
          count: Number(row.count ?? 0),
        }),
      ),
      types: (typesRows as Array<Record<string, unknown>>).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
      publications_by_year: (
        publicationsByYearRows as Array<Record<string, unknown>>
      ).map((row) => ({
        year:
          row.year !== null && row.year !== undefined ? Number(row.year) : null,
        count: Number(row.count ?? 0),
      })),
    };
  }

  async getOicrDetailsReport(
    contractId: string,
    totalResults: number,
  ): Promise<OicrDetailsDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT ro.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_oicrs ro
        ON ro.result_id = cr.result_id
        AND ro.is_active = TRUE
    `;

    const maturityLevelsQuery = `
      SELECT
        ml.id AS id,
        ml.name AS name,
        COUNT(DISTINCT ro.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_oicrs ro
        ON ro.result_id = cr.result_id
        AND ro.is_active = TRUE
      INNER JOIN maturity_levels ml
        ON ml.id = ro.maturity_level_id
        AND ml.is_active = TRUE
      GROUP BY ml.id, ml.name
      ORDER BY count DESC, ml.name ASC
    `;

    const externalUseQuery = `
      SELECT
        CASE
          WHEN ro.for_external_use = TRUE THEN 'External use'
          WHEN ro.for_external_use = FALSE THEN 'Internal'
          ELSE 'Not specified'
        END AS name,
        COUNT(DISTINCT ro.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_oicrs ro
        ON ro.result_id = cr.result_id
        AND ro.is_active = TRUE
      GROUP BY
        CASE
          WHEN ro.for_external_use = TRUE THEN 'External use'
          WHEN ro.for_external_use = FALSE THEN 'Internal'
          ELSE 'Not specified'
        END
      ORDER BY count DESC, name ASC
    `;

    const [countRows, maturityRows, externalUseRows] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(maturityLevelsQuery, [contractId]),
      this.query(externalUseQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);
    const normalizedTotalResults = Number(totalResults ?? 0);

    if (n === 0) {
      return {
        meta: {
          total_results: normalizedTotalResults,
          n: 0,
        },
        maturity_levels: [],
        external_use_split: [],
      };
    }

    return {
      meta: {
        total_results: normalizedTotalResults,
        n,
      },
      maturity_levels: (maturityRows as Array<Record<string, unknown>>).map(
        (row) => ({
          id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
          name: String(row.name),
          count: Number(row.count ?? 0),
        }),
      ),
      external_use_split: (
        externalUseRows as Array<Record<string, unknown>>
      ).map((row) => ({
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
    };
  }

  async getInnovationDevDetailsReport(
    contractId: string,
    totalResults: number,
  ): Promise<InnovationDevDetailsDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT rid.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_innovation_dev rid
        ON rid.result_id = cr.result_id
        AND rid.is_active = TRUE
    `;

    const readinessLevelsQuery = `
      SELECT
        cirl.id AS id,
        cirl.name AS name,
        cirl.level AS level,
        COUNT(DISTINCT rid.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_innovation_dev rid
        ON rid.result_id = cr.result_id
        AND rid.is_active = TRUE
      INNER JOIN clarisa_innovation_readiness_levels cirl
        ON cirl.id = rid.innovation_readiness_id
        AND cirl.is_active = TRUE
      GROUP BY cirl.id, cirl.name, cirl.level
      ORDER BY cirl.level ASC
    `;

    const innovationTypesQuery = `
      SELECT
        cit.code AS id,
        cit.name AS name,
        COUNT(DISTINCT rid.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_innovation_dev rid
        ON rid.result_id = cr.result_id
        AND rid.is_active = TRUE
      INNER JOIN clarisa_innovation_types cit
        ON cit.code = rid.innovation_type_id
        AND cit.is_active = TRUE
      GROUP BY cit.code, cit.name
      ORDER BY count DESC, cit.name ASC
    `;

    const innovationNaturesQuery = `
      SELECT
        cic.id AS id,
        cic.name AS name,
        COUNT(DISTINCT rid.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_innovation_dev rid
        ON rid.result_id = cr.result_id
        AND rid.is_active = TRUE
      INNER JOIN clarisa_innovation_characteristics cic
        ON cic.id = rid.innovation_nature_id
        AND cic.is_active = TRUE
      GROUP BY cic.id, cic.name
      ORDER BY count DESC, cic.name ASC
    `;

    const anticipatedUsersQuery = `
      SELECT
        idau.id AS id,
        idau.name AS name,
        COUNT(DISTINCT rid.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_innovation_dev rid
        ON rid.result_id = cr.result_id
        AND rid.is_active = TRUE
      INNER JOIN innovation_dev_anticipated_users idau
        ON idau.id = rid.anticipated_users_id
        AND idau.is_active = TRUE
      GROUP BY idau.id, idau.name
      ORDER BY count DESC, idau.name ASC
    `;

    const scalabilityProfileQuery = `
      SELECT
        SUM(CASE WHEN rid.is_cheaper_than_alternatives = 1 THEN 1 ELSE 0 END) AS is_cheaper_than_alternatives_true,
        SUM(CASE WHEN rid.is_cheaper_than_alternatives IS NOT NULL THEN 1 ELSE 0 END) AS is_cheaper_than_alternatives_answered,
        SUM(CASE WHEN rid.is_simpler_to_use = 1 THEN 1 ELSE 0 END) AS is_simpler_to_use_true,
        SUM(CASE WHEN rid.is_simpler_to_use IS NOT NULL THEN 1 ELSE 0 END) AS is_simpler_to_use_answered,
        SUM(CASE WHEN rid.does_perform_better = 1 THEN 1 ELSE 0 END) AS does_perform_better_true,
        SUM(CASE WHEN rid.does_perform_better IS NOT NULL THEN 1 ELSE 0 END) AS does_perform_better_answered,
        SUM(CASE WHEN rid.is_desirable_to_users = 1 THEN 1 ELSE 0 END) AS is_desirable_to_users_true,
        SUM(CASE WHEN rid.is_desirable_to_users IS NOT NULL THEN 1 ELSE 0 END) AS is_desirable_to_users_answered,
        SUM(CASE WHEN rid.has_commercial_viability = 1 THEN 1 ELSE 0 END) AS has_commercial_viability_true,
        SUM(CASE WHEN rid.has_commercial_viability IS NOT NULL THEN 1 ELSE 0 END) AS has_commercial_viability_answered,
        SUM(CASE WHEN rid.has_suitable_enabling_environment = 1 THEN 1 ELSE 0 END) AS has_suitable_enabling_environment_true,
        SUM(CASE WHEN rid.has_suitable_enabling_environment IS NOT NULL THEN 1 ELSE 0 END) AS has_suitable_enabling_environment_answered,
        SUM(CASE WHEN rid.has_evidence_of_uptake = 1 THEN 1 ELSE 0 END) AS has_evidence_of_uptake_true,
        SUM(CASE WHEN rid.has_evidence_of_uptake IS NOT NULL THEN 1 ELSE 0 END) AS has_evidence_of_uptake_answered
      FROM (${baseSubquery}) cr
      INNER JOIN result_innovation_dev rid
        ON rid.result_id = cr.result_id
        AND rid.is_active = TRUE
    `;

    const [
      countRows,
      readinessLevelRows,
      innovationTypeRows,
      innovationNatureRows,
      anticipatedUserRows,
      scalabilityRows,
    ] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(readinessLevelsQuery, [contractId]),
      this.query(innovationTypesQuery, [contractId]),
      this.query(innovationNaturesQuery, [contractId]),
      this.query(anticipatedUsersQuery, [contractId]),
      this.query(scalabilityProfileQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);
    const normalizedTotalResults = Number(totalResults ?? 0);

    if (n === 0) {
      return {
        meta: {
          total_results: normalizedTotalResults,
          n: 0,
        },
        readiness_levels: [],
        innovation_types: [],
        innovation_natures: [],
        anticipated_users: [],
        scalability_profile: [],
      };
    }

    const scalabilityRow =
      (scalabilityRows as Array<Record<string, unknown>>)[0] ?? {};

    const scalability_profile: InnovationDevScalabilityProfileDto[] = [
      {
        key: 'is_cheaper_than_alternatives',
        name: 'Cheaper than alternatives',
        true_count: Number(
          scalabilityRow.is_cheaper_than_alternatives_true ?? 0,
        ),
        answered_count: Number(
          scalabilityRow.is_cheaper_than_alternatives_answered ?? 0,
        ),
      },
      {
        key: 'is_simpler_to_use',
        name: 'Simpler to use',
        true_count: Number(scalabilityRow.is_simpler_to_use_true ?? 0),
        answered_count: Number(scalabilityRow.is_simpler_to_use_answered ?? 0),
      },
      {
        key: 'does_perform_better',
        name: 'Does perform better',
        true_count: Number(scalabilityRow.does_perform_better_true ?? 0),
        answered_count: Number(
          scalabilityRow.does_perform_better_answered ?? 0,
        ),
      },
      {
        key: 'is_desirable_to_users',
        name: 'Desirable to users',
        true_count: Number(scalabilityRow.is_desirable_to_users_true ?? 0),
        answered_count: Number(
          scalabilityRow.is_desirable_to_users_answered ?? 0,
        ),
      },
      {
        key: 'has_commercial_viability',
        name: 'Commercial viability',
        true_count: Number(scalabilityRow.has_commercial_viability_true ?? 0),
        answered_count: Number(
          scalabilityRow.has_commercial_viability_answered ?? 0,
        ),
      },
      {
        key: 'has_suitable_enabling_environment',
        name: 'Suitable enabling environment',
        true_count: Number(
          scalabilityRow.has_suitable_enabling_environment_true ?? 0,
        ),
        answered_count: Number(
          scalabilityRow.has_suitable_enabling_environment_answered ?? 0,
        ),
      },
      {
        key: 'has_evidence_of_uptake',
        name: 'Evidence of uptake',
        true_count: Number(scalabilityRow.has_evidence_of_uptake_true ?? 0),
        answered_count: Number(
          scalabilityRow.has_evidence_of_uptake_answered ?? 0,
        ),
      },
    ];

    return {
      meta: {
        total_results: normalizedTotalResults,
        n,
      },
      readiness_levels: (
        readinessLevelRows as Array<Record<string, unknown>>
      ).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        level:
          row.level !== null && row.level !== undefined
            ? Number(row.level)
            : null,
        count: Number(row.count ?? 0),
      })),
      innovation_types: (
        innovationTypeRows as Array<Record<string, unknown>>
      ).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
      innovation_natures: (
        innovationNatureRows as Array<Record<string, unknown>>
      ).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
      anticipated_users: (
        anticipatedUserRows as Array<Record<string, unknown>>
      ).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
      scalability_profile,
    };
  }

  async getPolicyChangeDetailsReport(
    contractId: string,
    totalResults: number,
  ): Promise<PolicyChangeDetailsDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT rpc.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_policy_change rpc
        ON rpc.result_id = cr.result_id
        AND rpc.is_active = TRUE
    `;

    const stageFunnelQuery = `
      SELECT
        ps.policy_stage_id AS id,
        ps.name AS name,
        ps.policy_stage_id AS \`order\`,
        COUNT(DISTINCT rpc.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_policy_change rpc
        ON rpc.result_id = cr.result_id
        AND rpc.is_active = TRUE
      INNER JOIN policy_stage ps
        ON ps.policy_stage_id = rpc.policy_stage_id
        AND ps.is_active = TRUE
      GROUP BY ps.policy_stage_id, ps.name
      ORDER BY ps.policy_stage_id ASC
    `;

    const policyTypesQuery = `
      SELECT
        pt.policy_type_id AS id,
        pt.name AS name,
        COUNT(DISTINCT rpc.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_policy_change rpc
        ON rpc.result_id = cr.result_id
        AND rpc.is_active = TRUE
      INNER JOIN policy_types pt
        ON pt.policy_type_id = rpc.policy_type_id
        AND pt.is_active = TRUE
      GROUP BY pt.policy_type_id, pt.name
      ORDER BY count DESC, pt.name ASC
    `;

    const implicatedInstitutionsQuery = `
      SELECT
        COUNT(DISTINCT ri.institution_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_policy_change rpc
        ON rpc.result_id = cr.result_id
        AND rpc.is_active = TRUE
      INNER JOIN result_institutions ri
        ON ri.result_id = cr.result_id
        AND ri.is_active = TRUE
        AND ri.institution_role_id = 4
    `;

    const [
      countRows,
      stageFunnelRows,
      policyTypeRows,
      implicatedInstitutionRows,
    ] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(stageFunnelQuery, [contractId]),
      this.query(policyTypesQuery, [contractId]),
      this.query(implicatedInstitutionsQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);
    const normalizedTotalResults = Number(totalResults ?? 0);

    if (n === 0) {
      return {
        meta: {
          total_results: normalizedTotalResults,
          n: 0,
        },
        stage_funnel: [],
        policy_types: [],
        implicated_institutions_count: 0,
      };
    }

    const implicatedRow =
      (implicatedInstitutionRows as Array<Record<string, unknown>>)[0] ?? {};

    return {
      meta: {
        total_results: normalizedTotalResults,
        n,
      },
      stage_funnel: (stageFunnelRows as Array<Record<string, unknown>>).map(
        (row) => ({
          id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
          name: String(row.name),
          order:
            row.order !== null && row.order !== undefined
              ? Number(row.order)
              : null,
          count: Number(row.count ?? 0),
        }),
      ),
      policy_types: (policyTypeRows as Array<Record<string, unknown>>).map(
        (row) => ({
          id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
          name: String(row.name),
          count: Number(row.count ?? 0),
        }),
      ),
      implicated_institutions_count: Number(implicatedRow.count ?? 0),
    };
  }

  async getInnovationUseDetailsReport(
    contractId: string,
    totalResults: number,
  ): Promise<InnovationUseDetailsDto> {
    if (isEmpty(contractId)) {
      throw new BadRequestException('contract_id is required');
    }

    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT cr.result_id) AS n
      FROM (${baseSubquery}) cr
      LEFT JOIN result_actors ra
        ON ra.result_id = cr.result_id
        AND ra.is_active = TRUE
      LEFT JOIN result_institution_types rit
        ON rit.result_id = cr.result_id
        AND rit.is_active = TRUE
      LEFT JOIN result_quantifications rq
        ON rq.result_id = cr.result_id
        AND rq.is_active = TRUE
      WHERE ra.result_id IS NOT NULL
         OR rit.result_id IS NOT NULL
         OR rq.result_id IS NOT NULL
    `;

    const overallGenderYouthQuery = `
      SELECT
        COALESCE(SUM(ra.women_youth), 0) AS women_youth,
        COALESCE(SUM(ra.women_not_youth), 0) AS women_not_youth,
        COALESCE(SUM(ra.men_youth), 0) AS men_youth,
        COALESCE(SUM(ra.men_not_youth), 0) AS men_not_youth
      FROM (${baseSubquery}) cr
      INNER JOIN result_actors ra
        ON ra.result_id = cr.result_id
        AND ra.is_active = TRUE
    `;

    const actorReachQuery = `
      SELECT
        cat.code AS actor_type_id,
        cat.name AS actor_type_name,
        COALESCE(SUM(ra.women_youth), 0) AS women_youth,
        COALESCE(SUM(ra.women_not_youth), 0) AS women_not_youth,
        COALESCE(SUM(ra.men_youth), 0) AS men_youth,
        COALESCE(SUM(ra.men_not_youth), 0) AS men_not_youth
      FROM (${baseSubquery}) cr
      INNER JOIN result_actors ra
        ON ra.result_id = cr.result_id
        AND ra.is_active = TRUE
      INNER JOIN clarisa_actor_types cat
        ON cat.code = ra.actor_type_id
        AND cat.is_active = TRUE
      GROUP BY cat.code, cat.name
      ORDER BY (
        COALESCE(SUM(ra.women_youth), 0) +
        COALESCE(SUM(ra.women_not_youth), 0) +
        COALESCE(SUM(ra.men_youth), 0) +
        COALESCE(SUM(ra.men_not_youth), 0)
      ) DESC, cat.name ASC
    `;

    const organizationTypesQuery = `
      SELECT
        cit.code AS id,
        cit.name AS name,
        COUNT(DISTINCT rit.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_institution_types rit
        ON rit.result_id = cr.result_id
        AND rit.is_active = TRUE
      INNER JOIN clarisa_institution_types cit
        ON cit.code = rit.institution_type_id
        AND cit.is_active = TRUE
      GROUP BY cit.code, cit.name
      ORDER BY count DESC, cit.name ASC
    `;

    const quantificationsQuery = `
      SELECT
        COALESCE(NULLIF(TRIM(rq.unit), ''), 'Unknown') AS unit,
        COALESCE(SUM(rq.quantification_number), 0) AS total,
        COUNT(DISTINCT rq.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_quantifications rq
        ON rq.result_id = cr.result_id
        AND rq.is_active = TRUE
      GROUP BY COALESCE(NULLIF(TRIM(rq.unit), ''), 'Unknown')
      ORDER BY count DESC, unit ASC
    `;

    const [
      countRows,
      overallRows,
      actorReachRows,
      organizationTypeRows,
      quantificationRows,
    ] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(overallGenderYouthQuery, [contractId]),
      this.query(actorReachQuery, [contractId]),
      this.query(organizationTypesQuery, [contractId]),
      this.query(quantificationsQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);
    const normalizedTotalResults = Number(totalResults ?? 0);

    if (n === 0) {
      return {
        meta: {
          total_results: normalizedTotalResults,
          n: 0,
        },
        gender_youth_reach: {
          overall: {
            women_youth: 0,
            women_not_youth: 0,
            men_youth: 0,
            men_not_youth: 0,
            total: 0,
          },
          by_actor_type: [],
        },
        organization_types: [],
        quantifications: [],
      };
    }

    const overallRow = (overallRows as Array<Record<string, unknown>>)[0] ?? {};
    const women_youth = Number(overallRow.women_youth ?? 0);
    const women_not_youth = Number(overallRow.women_not_youth ?? 0);
    const men_youth = Number(overallRow.men_youth ?? 0);
    const men_not_youth = Number(overallRow.men_not_youth ?? 0);
    const overallTotal =
      women_youth + women_not_youth + men_youth + men_not_youth;

    const by_actor_type = (
      actorReachRows as Array<Record<string, unknown>>
    ).map((row) => {
      const actor_women_youth = Number(row.women_youth ?? 0);
      const actor_women_not_youth = Number(row.women_not_youth ?? 0);
      const actor_men_youth = Number(row.men_youth ?? 0);
      const actor_men_not_youth = Number(row.men_not_youth ?? 0);
      const actor_total =
        actor_women_youth +
        actor_women_not_youth +
        actor_men_youth +
        actor_men_not_youth;

      return {
        actor_type_id:
          row.actor_type_id !== null && row.actor_type_id !== undefined
            ? Number(row.actor_type_id)
            : null,
        actor_type_name: String(row.actor_type_name),
        women_youth: actor_women_youth,
        women_not_youth: actor_women_not_youth,
        men_youth: actor_men_youth,
        men_not_youth: actor_men_not_youth,
        total: actor_total,
      };
    });

    return {
      meta: {
        total_results: normalizedTotalResults,
        n,
      },
      gender_youth_reach: {
        overall: {
          women_youth,
          women_not_youth,
          men_youth,
          men_not_youth,
          total: overallTotal,
        },
        by_actor_type,
      },
      organization_types: (
        organizationTypeRows as Array<Record<string, unknown>>
      ).map((row) => ({
        id: row.id !== null && row.id !== undefined ? Number(row.id) : null,
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
      quantifications: (
        quantificationRows as Array<Record<string, unknown>>
      ).map((row) => ({
        unit: String(row.unit),
        total: Number(row.total ?? 0),
        count: Number(row.count ?? 0),
      })),
    };
  }

  // ---------------------------------------------------------------------
  // F4 Advanced Cross-Cutting Insights — private section queries
  // (composed by getInsightsReport, T-04; sections always present per D-F4-3)
  // ---------------------------------------------------------------------

  private async getReachSection(
    contractId: string,
    totalResults: number,
  ): Promise<ReachSectionDto> {
    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const overallQuery = `
      SELECT
        COUNT(DISTINCT ra.result_id) AS n,
        COALESCE(SUM(ra.women_youth), 0) AS women_youth,
        COALESCE(SUM(ra.women_not_youth), 0) AS women_not_youth,
        COALESCE(SUM(ra.men_youth), 0) AS men_youth,
        COALESCE(SUM(ra.men_not_youth), 0) AS men_not_youth,
        SUM(CASE WHEN ra.sex_age_disaggregation_not_apply = TRUE THEN 1 ELSE 0 END) AS not_disaggregated_rows
      FROM (${baseSubquery}) cr
      INNER JOIN result_actors ra
        ON ra.result_id = cr.result_id
        AND ra.is_active = TRUE
    `;

    const byActorTypeQuery = `
      SELECT
        cat.code AS actor_type_id,
        CASE
          WHEN cat.code = 5
            THEN COALESCE(NULLIF(TRIM(MAX(ra.actor_type_custom_name)), ''), cat.name)
          ELSE cat.name
        END AS actor_type_name,
        COALESCE(SUM(ra.women_youth), 0) AS women_youth,
        COALESCE(SUM(ra.women_not_youth), 0) AS women_not_youth,
        COALESCE(SUM(ra.men_youth), 0) AS men_youth,
        COALESCE(SUM(ra.men_not_youth), 0) AS men_not_youth
      FROM (${baseSubquery}) cr
      INNER JOIN result_actors ra
        ON ra.result_id = cr.result_id
        AND ra.is_active = TRUE
      INNER JOIN clarisa_actor_types cat
        ON cat.code = ra.actor_type_id
        AND cat.is_active = TRUE
      GROUP BY cat.code, cat.name
      ORDER BY (
        COALESCE(SUM(ra.women_youth), 0) +
        COALESCE(SUM(ra.women_not_youth), 0) +
        COALESCE(SUM(ra.men_youth), 0) +
        COALESCE(SUM(ra.men_not_youth), 0)
      ) DESC, cat.name ASC
    `;

    const [overallRows, byActorTypeRows] = await Promise.all([
      this.query(overallQuery, [contractId]),
      this.query(byActorTypeQuery, [contractId]),
    ]);

    const overallRow = (overallRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(overallRow.n ?? 0);
    const women_youth = Number(overallRow.women_youth ?? 0);
    const women_not_youth = Number(overallRow.women_not_youth ?? 0);
    const men_youth = Number(overallRow.men_youth ?? 0);
    const men_not_youth = Number(overallRow.men_not_youth ?? 0);
    const overallTotal =
      women_youth + women_not_youth + men_youth + men_not_youth;

    const by_actor_type = (
      byActorTypeRows as Array<Record<string, unknown>>
    ).map((row) => {
      const actorWomenYouth = Number(row.women_youth ?? 0);
      const actorWomenNotYouth = Number(row.women_not_youth ?? 0);
      const actorMenYouth = Number(row.men_youth ?? 0);
      const actorMenNotYouth = Number(row.men_not_youth ?? 0);

      return {
        actor_type_id:
          row.actor_type_id !== null && row.actor_type_id !== undefined
            ? Number(row.actor_type_id)
            : null,
        actor_type_name: String(row.actor_type_name),
        women_youth: actorWomenYouth,
        women_not_youth: actorWomenNotYouth,
        men_youth: actorMenYouth,
        men_not_youth: actorMenNotYouth,
        total:
          actorWomenYouth +
          actorWomenNotYouth +
          actorMenYouth +
          actorMenNotYouth,
      };
    });

    return {
      meta: {
        total_results: Number(totalResults ?? 0),
        n,
      },
      overall: {
        women_youth,
        women_not_youth,
        men_youth,
        men_not_youth,
        total: overallTotal,
      },
      by_actor_type,
      not_disaggregated_rows: Number(overallRow.not_disaggregated_rows ?? 0),
    };
  }

  private async getSdgCoverageSection(
    contractId: string,
    totalResults: number,
  ): Promise<SdgCoverageSectionDto> {
    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT rs.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_sdgs rs
        ON rs.result_id = cr.result_id
        AND rs.is_active = TRUE
    `;

    const sdgBreakdownQuery = `
      SELECT
        cs.id AS sdg_id,
        cs.short_name AS short_name,
        cs.full_name AS full_name,
        COUNT(DISTINCT rs.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_sdgs rs
        ON rs.result_id = cr.result_id
        AND rs.is_active = TRUE
      INNER JOIN clarisa_sdgs cs
        ON cs.id = rs.clarisa_sdg_id
        AND cs.is_active = TRUE
      GROUP BY cs.id, cs.short_name, cs.full_name
      ORDER BY count DESC, cs.id ASC
    `;

    const [countRows, sdgRows] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(sdgBreakdownQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);

    return {
      meta: {
        total_results: Number(totalResults ?? 0),
        n,
      },
      sdgs: (sdgRows as Array<Record<string, unknown>>).map((row) => ({
        sdg_id: Number(row.sdg_id),
        short_name: String(row.short_name),
        full_name: String(row.full_name),
        count: Number(row.count ?? 0),
      })),
    };
  }

  private async getEvidenceSection(
    contractId: string,
    totalResults: number,
  ): Promise<EvidenceSectionDto> {
    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const totalsQuery = `
      SELECT
        COUNT(DISTINCT re.result_id) AS n,
        COUNT(re.result_evidence_id) AS evidences_total,
        SUM(CASE WHEN re.is_private = TRUE THEN 1 ELSE 0 END) AS private_count,
        SUM(CASE WHEN re.is_private = TRUE THEN 0 ELSE 1 END) AS public_count
      FROM (${baseSubquery}) cr
      INNER JOIN result_evidences re
        ON re.result_id = cr.result_id
        AND re.is_active = TRUE
    `;

    const roleBreakdownQuery = `
      SELECT
        er.evidence_role_id AS evidence_role_id,
        er.name AS name,
        COUNT(re.result_evidence_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_evidences re
        ON re.result_id = cr.result_id
        AND re.is_active = TRUE
      INNER JOIN evidence_roles er
        ON er.evidence_role_id = re.evidence_role_id
        AND er.is_active = TRUE
      GROUP BY er.evidence_role_id, er.name
      ORDER BY count DESC, er.name ASC
    `;

    const [totalsRows, roleRows] = await Promise.all([
      this.query(totalsQuery, [contractId]),
      this.query(roleBreakdownQuery, [contractId]),
    ]);

    const totalsRow = (totalsRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(totalsRow.n ?? 0);

    return {
      meta: {
        total_results: Number(totalResults ?? 0),
        n,
      },
      results_with_evidence: n,
      evidences_total: Number(totalsRow.evidences_total ?? 0),
      public_count: Number(totalsRow.public_count ?? 0),
      private_count: Number(totalsRow.private_count ?? 0),
      by_role: (roleRows as Array<Record<string, unknown>>).map((row) => ({
        evidence_role_id: Number(row.evidence_role_id),
        name: String(row.name),
        count: Number(row.count ?? 0),
      })),
    };
  }

  private async getContributingLeversSection(
    contractId: string,
    totalResults: number,
  ): Promise<ContributingLeversSectionDto> {
    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT rl.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_levers rl
        ON rl.result_id = cr.result_id
        AND rl.is_primary = FALSE
        AND rl.is_active = TRUE
    `;

    const leverBreakdownQuery = `
      SELECT
        clarisa_lever.id AS lever_id,
        clarisa_lever.short_name AS short_name,
        clarisa_lever.full_name AS full_name,
        COUNT(DISTINCT result_lever.result_id) AS count
      FROM result_levers result_lever
      INNER JOIN (${baseSubquery}) primary_contract_results
        ON primary_contract_results.result_id = result_lever.result_id
      INNER JOIN clarisa_levers clarisa_lever
        ON clarisa_lever.id = result_lever.lever_id
      WHERE result_lever.is_primary = FALSE
        AND result_lever.is_active = TRUE
      GROUP BY
        clarisa_lever.id,
        clarisa_lever.short_name,
        clarisa_lever.full_name
      ORDER BY count DESC, clarisa_lever.id
    `;

    const [countRows, leverRows] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(leverBreakdownQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);

    return {
      meta: {
        total_results: Number(totalResults ?? 0),
        n,
      },
      levers: (leverRows as Array<Record<string, unknown>>).map((row) => ({
        lever_id: Number(row.lever_id),
        short_name: String(row.short_name),
        full_name: String(row.full_name),
        count: Number(row.count ?? 0),
      })),
    };
  }

  private async getKeywordsSection(
    contractId: string,
    totalResults: number,
  ): Promise<KeywordsSectionDto> {
    const baseSubquery = this.buildPrimaryContractResultsSubquery();
    // D-F4-5 / T-02 (dev MySQL 8.0.45-0ubuntu0.22.04.1 — REGEXP_REPLACE confirmed
    // available): normalize case + inner whitespace in SQL. REGEXP_REPLACE alone
    // leaves leading/trailing spaces, so TRIM still runs after the collapse.
    const normalizedKeywordExpr = `LOWER(TRIM(REGEXP_REPLACE(rk.keyword, '[[:space:]]+', ' ')))`;

    const countQuery = `
      SELECT
        COUNT(DISTINCT rk.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_keywords rk
        ON rk.result_id = cr.result_id
        AND rk.is_active = TRUE
    `;

    const keywordsQuery = `
      SELECT
        ${normalizedKeywordExpr} AS keyword,
        COUNT(DISTINCT rk.result_id) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_keywords rk
        ON rk.result_id = cr.result_id
        AND rk.is_active = TRUE
      GROUP BY ${normalizedKeywordExpr}
      ORDER BY count DESC, keyword ASC
      LIMIT 30
    `;

    const [countRows, keywordsRows] = await Promise.all([
      this.query(countQuery, [contractId]),
      this.query(keywordsQuery, [contractId]),
    ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);

    return {
      meta: {
        total_results: Number(totalResults ?? 0),
        n,
      },
      keywords: (keywordsRows as Array<Record<string, unknown>>).map((row) => ({
        keyword: String(row.keyword),
        count: Number(row.count ?? 0),
      })),
    };
  }

  private async getReviewFlowSection(
    contractId: string,
    totalResults: number,
  ): Promise<ReviewFlowSectionDto> {
    const baseSubquery = this.buildPrimaryContractResultsSubquery();

    const countQuery = `
      SELECT
        COUNT(DISTINCT rrh.result_id) AS n
      FROM (${baseSubquery}) cr
      INNER JOIN result_review_history rrh
        ON rrh.result_id = cr.result_id
        AND rrh.is_active = TRUE
    `;

    const eventTypeBreakdownQuery = `
      SELECT
        rrh.event_type AS event_type,
        COUNT(*) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_review_history rrh
        ON rrh.result_id = cr.result_id
        AND rrh.is_active = TRUE
      GROUP BY rrh.event_type
      ORDER BY count DESC, rrh.event_type ASC
    `;

    const decisionBreakdownQuery = `
      SELECT
        rrh.decision AS decision,
        COUNT(*) AS count
      FROM (${baseSubquery}) cr
      INNER JOIN result_review_history rrh
        ON rrh.result_id = cr.result_id
        AND rrh.is_active = TRUE
        AND rrh.decision IS NOT NULL
      GROUP BY rrh.decision
      ORDER BY count DESC, rrh.decision ASC
    `;

    // D-F4-2 / D-F4-7: cycle time is computed in TS over timestamp-ordered
    // events (review-cycle-time.util.ts) — this query only fetches the
    // columns the calculator needs. Ordered by created_at, NEVER by id
    // (R-IN-002: "events ordered by timestamp, never insertion order").
    // payload_before / payload_after are NEVER selected (proposal.md OQ-1 —
    // they may be large).
    const eventsQuery = `
      SELECT
        rrh.result_id AS result_id,
        rrh.event_type AS event_type,
        rrh.decision AS decision,
        rrh.created_at AS created_at
      FROM (${baseSubquery}) cr
      INNER JOIN result_review_history rrh
        ON rrh.result_id = cr.result_id
        AND rrh.is_active = TRUE
      ORDER BY rrh.created_at ASC
    `;

    const [countRows, eventTypeRows, decisionRows, eventRows] =
      await Promise.all([
        this.query(countQuery, [contractId]),
        this.query(eventTypeBreakdownQuery, [contractId]),
        this.query(decisionBreakdownQuery, [contractId]),
        this.query(eventsQuery, [contractId]),
      ]);

    const countRow = (countRows as Array<Record<string, unknown>>)[0] ?? {};
    const n = Number(countRow.n ?? 0);

    const cycleTime = computeReviewCycleTime(
      (eventRows as Array<Record<string, unknown>>).map((row) => ({
        result_id: Number(row.result_id),
        event_type: String(row.event_type),
        decision:
          row.decision === null || row.decision === undefined
            ? null
            : String(row.decision),
        created_at: row.created_at as string | Date,
      })),
    );

    return {
      meta: {
        total_results: Number(totalResults ?? 0),
        n,
      },
      by_event_type: (eventTypeRows as Array<Record<string, unknown>>).map(
        (row) => {
          const event_type = String(row.event_type);
          return {
            event_type,
            label: getReviewEventTypeLabel(event_type),
            count: Number(row.count ?? 0),
          };
        },
      ),
      by_decision: (decisionRows as Array<Record<string, unknown>>).map(
        (row) => {
          const decision = String(row.decision);
          return {
            decision,
            label: getReviewDecisionLabel(decision),
            count: Number(row.count ?? 0),
          };
        },
      ),
      cycle_time: {
        median_days: cycleTime.median_days,
        p90_days: cycleTime.p90_days,
        sample_size: cycleTime.sample_size,
      },
      excluded_for_incomplete_history:
        cycleTime.excluded_for_incomplete_history,
    };
  }

  async getFundingTypes() {
    const query = `
      SELECT DISTINCT funding_type FROM agresso_contracts
    `;

    const rows = await this.query(query).then((rows) =>
      rows.filter((row) => row.funding_type),
    );
    return rows as string[];
  }
}

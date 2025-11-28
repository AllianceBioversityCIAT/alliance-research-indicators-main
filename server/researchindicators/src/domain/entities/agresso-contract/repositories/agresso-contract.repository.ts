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
              AND rc.is_active = 1)
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
    if (!isEmpty(query) && !isValidText(query)) {
      throw new BadRequestException('Invalid characters in query parameter');
    } else if (!isEmpty(query)) {
      const sanitizedQuery = !isEmpty(query)
        ? escapeLikeString(query).split(' ')
        : [];

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
    }

    const validFilter = (attr: string, filter: string) => {
      if (isEmpty(attr)) return '';
      return filter;
    };

    const dateFilterClause = this.buildDateFilterClause(filter);
    const indicators = await this.dataSource.getRepository(Indicator).find();
    const operationOrder = isEmpty(orderFields)
      ? `FIELD(ifnull(ac.contract_status, 'non'), 'ongoing', 'completed', 'suspended', 'discontinued', 'non')`
      : this.orderBy(orderFields, direction);
    const orderBy = `ORDER BY ${operationOrder}`;

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
    ${validFilter(filter?.lever, `AND cl.id in (${filter.lever.join(',')})`)}
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
        result_counts.indicator_id,
        result_counts.total_results as count_results,
        paginated_contracts.lever_id,
        paginated_contracts.lever_short_name,
        paginated_contracts.lever_full_name,
        paginated_contracts.lever_other_names,
        paginated_contracts.is_science_program,
        paginated_contracts.funding_type
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
            ac.funding_type
        FROM agresso_contracts ac
        LEFT JOIN clarisa_levers cl ON cl.short_name = CONCAT('Lever ', 
            IF(ac.departmentId LIKE 'L%', SUBSTRING(ac.departmentId, 2), NULL))
        LEFT JOIN pooled_funding_contracts pfc ON pfc.agreement_id = ac.agreement_id
                                              AND pfc.is_active = TRUE
        ${userContracts(user?.sec_user_id)}
        WHERE 1=1
        ${filter?.exclude_pooled_funding ? `AND pfc.id IS NULL AND pfc.funding_type = 'W1/W2'` : ''}
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
        const mappedContract = new MappedContractsDto(rawData, indicators);
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
}

import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { AgressoContract } from '../entities/agresso-contract.entity';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ContractResultCountDto } from '../dto/contract-result-count.dto';
import { isEmpty } from '../../../shared/utils/object.utils';
import { StringKeys } from '../../../shared/global-dto/types-global';

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
    if (!isEmpty(pagination?.limit) && !isEmpty(pagination?.page)) {
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
    ifnull(cl.full_name, 'Not available' ) as lever
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
        cl.full_name
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

  async getContracts(filter?: Record<string, any>, userId?: number) {
    const dateFilterClause = this.buildDateFilterClause(filter);

    const query = `
    SELECT 
      ac.agreement_id, 
      ac.projectDescription, 
      ac.project_lead_description, 
      ac.description,
      ac.start_date, 
      ac.end_date, 
      ac.endDateGlobal,
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
              ${userId ? `AND r.created_by = ${userId}` : ''})
        )
      ) AS indicators,
      IF(cl.id IS NOT NULL, JSON_OBJECT('id', cl.id,
    			'short_name', cl.short_name,
    			'full_name', cl.full_name,
    			'other_names', cl.other_names), NULL) as lever
    FROM agresso_contracts ac
    INNER JOIN result_contracts rc on rc.contract_id = ac.agreement_id 
    								and rc.is_active = true
    								and rc.is_primary = true
    ${
      userId
        ? `inner join results r on r.result_id = rc.result_id 
    					and r.created_by = ${userId}
              and r.is_active = true
              and r.is_snapshot = false`
        : ''
    }
    left join clarisa_levers cl on cl.short_name = CONCAT('Lever ', IF(ac.departmentId LIKE 'L%', SUBSTRING(ac.departmentId, 2), NULL))
    CROSS JOIN indicators i
    WHERE 1 = 1
    ${filter?.contract_code ? `AND ac.agreement_id = '${filter.contract_code}'` : ''}
    ${filter?.project_name ? `AND ac.projectDescription LIKE '%${filter.project_name}%'` : ''}
    ${filter?.principal_investigator ? `AND ac.project_lead_description LIKE '%${filter.principal_investigator}%'` : ''}
    ${filter?.lever?.length ? `AND cl.id in (${filter.lever.join(',')})` : ''}
    ${dateFilterClause}
    ${filter?.status?.length ? this.buildStatusFilterClause(filter.status) : ''}
    GROUP BY ac.agreement_id, cl.id;`;

    return this.query(query) as Promise<ContractResultCountDto[]>;
  }

  private buildStatusFilterClause(statuses: string[]): string {
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

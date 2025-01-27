import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Result } from '../entities/result.entity';
import { Injectable } from '@nestjs/common';
import { ElasticFindEntity } from '../../../tools/open-search/dto/elastic-find-entity.dto';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
import { ResultOpensearchDto } from '../../../tools/open-search/results/dto/result.opensearch.dto';

@Injectable()
export class ResultRepository
  extends Repository<Result>
  implements ElasticFindEntity<ResultOpensearchDto>
{
  constructor(private readonly entityManager: EntityManager) {
    super(Result, entityManager);
  }

  findDataForOpenSearch(
    option: FindAllOptions,
    ids?: number[],
  ): Promise<ResultOpensearchDto[]> {
    const query: string = `
	select 
		r.result_id,
		r.result_official_code,
		r.version_id,
		r.title,
		r.description,
		r.indicator_id,
		r.geo_scope_id,
		r.report_year_id,
		r.result_status_id,
		JSON_OBJECT('result_status_id', rs.result_status_id,
					'name', rs.name,
					'description', rs.description) as result_status,
		JSON_OBJECT('indicator_id', i.indicator_id,
					'name', i.name,
					'other_names', i.other_names,
					'description', i.description,
					'long_description', i.long_description,
					'indicator_type_id', i.indicator_type_id,
					'icon_src', i.icon_src) as \`indicator\`,
		if(count(rk.keyword) = 0 , JSON_ARRAY(), JSON_ARRAYAGG(rk.keyword)) as keywords
		from results r
			inner join indicators i on r.indicator_id = i.indicator_id 
			inner join result_status rs on rs.result_status_id = r.result_status_id 
			left join result_keywords rk on rk.result_id = r.result_id 
		where 1 = 1
		${ids && ids.length > 0 ? `and r.result_id in (${ids.join(',')})` : ''}
		${option !== FindAllOptions.SHOW_ALL ? 'and r.is_active = 1' : ''}
		GROUP by r.result_id,
			r.result_official_code,
			r.version_id,
			r.title,
			r.description,
			r.indicator_id,
			r.geo_scope_id,
			r.report_year_id,
			r.result_status_id
	`;
    return this.query(query);
  }

  async findResultsFilters(filters?: Partial<ResultFiltersInterface>) {
    const queryParts: DeepPartial<CreateResultQueryInterface> = {
      contracts: {
        select: '',
        join: '',
        groupBy: '',
      },
      levers: {
        select: '',
        join: '',
        groupBy: '',
      },
      indicators: {
        select: '',
        join: '',
      },
      result_audit_data: {
        select: '',
        join: '',
        groupBy: '',
      },
      result_status: {
        select: '',
        join: '',
      },
    };

    let limit: string = '';

    if (filters?.page && filters?.limit) {
      limit = `LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}`;
    }

    if (filters?.contracts) {
      const tempQuery = ` 
			JSON_OBJECT('result_contract_id', rc.result_contract_id,
					'result_id', rc.result_id,
					'contract_role_id', rc.contract_role_id,
					'contract_id', rc.contract_id,
					'is_primary', rc.is_primary,
					'is_active', rc.is_active,
					'contract', JSON_OBJECT('agreement_id', ac.agreement_id,
		    								'center_amount', ac.center_amount,
		    								'center_amount_usd', ac.center_amount_usd,
		    								'grant_amount', ac.grant_amount,
		    								'grant_amount_usd', ac.grant_amount_usd,
		    								'office', ac.office,
		    								'officeId', ac.officeId,
		    								'client', ac.client,
		    								'contract_status', ac.contract_status,
		    								'department', ac.department,
		    								'departmentId', ac.departmentId,
		    								'description', ac.description,
		    								'division', ac.division,
		    								'divisionId', ac.divisionId,
		    								'donor', ac.donor,
		    								'donor_reference', ac.donor_reference,
		    								'entity', ac.entity,
		    								'funding_type', ac.funding_type,
		    								'project', ac.project,
		    								'projectDescription', ac.projectDescription,
		    								'project_lead_description', ac.project_lead_description,
		    								'short_title', ac.short_title,
		    								'ubwClientDescription', ac.ubwClientDescription,
		    								'unit', ac.unit,
		    								'unitId', ac.unitId,
		    								'endDateGlobal', ac.endDateGlobal,
		    								'endDatefinance', ac.endDatefinance,
		    								'end_date', ac.end_date,
		    								'extension_date', ac.extension_date,
		    								'start_date', ac.start_date,
		    								'deleted_at', ac.deleted_at))`;

      queryParts.contracts.select = `,${
        filters?.primary_contract
          ? tempQuery
          : `JSON_ARRAYAGG(COALESCE(${tempQuery}))`
      } as result_contracts`;

      if (filters?.primary_contract) {
        queryParts.contracts.groupBy = `,rc.result_contract_id`;
      }

      queryParts.contracts.join = `
	  	LEFT JOIN result_contracts rc ON rc.result_id = r.result_id 
									AND rc.is_active = TRUE 
									${filters?.primary_contract ? `AND rc.is_primary = TRUE` : ''}
		LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id `;
    }

    if (filters?.levers) {
      const tempQuery = `
			JSON_OBJECT('result_lever_id', rl.result_lever_id,
					'result_id', rl.result_id,
					'lever_role_id', rl.lever_role_id,
					'lever_id', rl.lever_id,
					'is_primary', rl.is_primary,
					'is_active', rl.is_active,
					'lever', JSON_OBJECT('id', cl.id,
										 'short_name', cl.short_name,
										 'full_name', cl.full_name,
										 'other_names', cl.other_names))
		`;
      queryParts.levers.select = `,${
        filters?.primary_lever
          ? tempQuery
          : `JSON_ARRAYAGG(COALESCE(${tempQuery}))`
      } as result_levers`;

      if (filters?.primary_lever) {
        queryParts.levers.groupBy = `,rl.result_lever_id`;
      }

      queryParts.levers.join = `
		  	LEFT JOIN result_levers rl ON rl.result_id = r.result_id
									AND rl.is_active = TRUE 
									${filters?.primary_lever ? `AND rl.is_primary = TRUE` : ''}
			LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id`;
    }

    if (filters?.indicators) {
      queryParts.indicators.select = `,JSON_OBJECT('indicator_id', i.indicator_id,
					'name', i.name,
					'indicator_type_id', i.indicator_type_id,
					'description', i.description,
					'long_description', i.long_description,
					'icon_src', i.icon_src,
					'other_names', i.other_names,
					'is_active', i.is_active) as indicators`;
      queryParts.indicators.join = `LEFT JOIN indicators i ON i.indicator_id = r.indicator_id`;
    }

    if (filters?.result_status) {
      queryParts.result_status.select = `,JSON_OBJECT('result_status_id', rs.result_status_id,
					'name', rs.name,
					'description', rs.description,
					'is_active', rs.is_active) as result_status`;
      queryParts.result_status.join = `LEFT JOIN result_status rs ON rs.result_status_id = r.result_status_id`;
    }

    if (filters?.result_audit_data) {
      queryParts.result_audit_data.select = `
		,r.created_at,
		r.created_by,
		r.updated_at,
		r.updated_by`;

      queryParts.result_audit_data.groupBy = `,r.created_at,
		r.created_by,
		r.updated_at,
		r.updated_by`;

      if (filters.result_audit_data_objects) {
        queryParts.result_audit_data.select += `,IF(su1.sec_user_id IS NOT NULL, JSON_OBJECT('user_id', su1.sec_user_id, 
					'first_name', su1.first_name, 
					'last_name', su1.last_name, 
					'is_active', su1.is_active), NULL) as created_by_user,
		IF(su2.sec_user_id IS NOT NULL, JSON_OBJECT('user_id', su2.sec_user_id, 
					'first_name', su2.first_name, 
					'last_name', su2.last_name, 
					'is_active', su2.is_active), NULL) as updated_by_user
		`;
        queryParts.result_audit_data.join = `LEFT JOIN alliancereportingdb.sec_users su1 ON su1.sec_user_id = r.created_by 
		LEFT JOIN alliancereportingdb.sec_users su2 ON su2.sec_user_id = r.updated_by `;
      }
    }

    let sort_order: string = 'ASC';
    if (['ASC', 'DESC'].includes(filters?.sort_order?.toUpperCase())) {
      sort_order = filters.sort_order.toUpperCase();
    }

    const mainQeury = `
	SELECT 
		r.result_id,
		r.result_official_code,
		r.version_id,
		r.title,
		r.description,
		r.indicator_id,
		r.geo_scope_id,
		r.result_status_id,
		r.report_year_id,
		r.is_active
		${queryParts.result_audit_data?.select}
		${queryParts.result_status?.select}
		${queryParts.indicators?.select}
		${queryParts.levers?.select}
		${queryParts.contracts?.select}
	FROM results r
		${queryParts.result_audit_data?.join}
		${queryParts.result_status?.join}
		${queryParts.indicators?.join}
		${queryParts.contracts?.join}
		${queryParts.levers?.join}
		WHERE 1 = 1
		${filters?.result_indicator ? `AND r.indicator_id = '${filters.result_indicator}'` : ''}
	GROUP BY r.result_id,
		r.result_official_code,
		r.version_id,
		r.title,
		r.description,
		r.indicator_id,
		r.geo_scope_id,
		r.result_status_id,
		r.report_year_id,
		r.is_active
		${queryParts.result_audit_data?.groupBy}
		${queryParts.contracts?.groupBy}
		${queryParts.levers?.groupBy}
		ORDER BY r.result_official_code ${sort_order}
		${limit}
	`;
    return this.query(mainQeury);
  }
}

export interface ResultFiltersInterface {
  limit?: number;
  page?: number;
  result_indicator: number;
  result_audit_data: boolean;
  contracts: boolean;
  primary_contract: boolean;
  levers: boolean;
  primary_lever: boolean;
  indicators: boolean;
  result_status: boolean;
  result_audit_data_objects: boolean;
  sort_order: string;
}

export interface CreateResultQueryInterface {
  result_audit_data: SelectJoinQueryInterface;
  contracts: SelectJoinQueryInterface;
  levers: SelectJoinQueryInterface;
  indicators: SelectJoinQueryInterface;
  result_status: SelectJoinQueryInterface;
}

export interface SelectJoinQueryInterface {
  select: string;
  join: string;
  groupBy: string;
}

export interface ResultPaginationWhere {
  limit?: number;
  offset?: number;
}

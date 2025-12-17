import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Result } from '../entities/result.entity';
import { Injectable } from '@nestjs/common';
import { ElasticFindEntity } from '../../../tools/open-search/dto/elastic-find-entity.dto';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
import { ResultOpensearchDto } from '../../../tools/open-search/results/dto/result.opensearch.dto';
import { formatArrayToQuery } from '../../../shared/utils/queries.util';
import { isEmpty } from '../../../shared/utils/object.utils';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { queryPrincipalInvestigator } from '../../../shared/const/gloabl-queries.const';
import { resultDefaultParametersSQL } from '../../../shared/utils/results.util';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';

@Injectable()
export class ResultRepository
  extends Repository<Result>
  implements ElasticFindEntity<ResultOpensearchDto>
{
  constructor(
    private readonly entityManager: EntityManager,
    private readonly appConfig: AppConfig,
    private readonly currentUserUtil: CurrentUserUtil,
  ) {
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
    r.platform_code,
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
		and r.is_snapshot = FALSE
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

  async generalReport() {
    const query = `SELECT
                    r.result_official_code as 'Code',
                    r.platform_code as 'Platform Code',
                    r.title as 'Title',
                    IFNULL(rc.contract_id, 'Not provided') as 'Projects',
                    i.name as 'Indicator',
                    GROUP_CONCAT(cl.short_name SEPARATOR ', ') as 'Levers',
                    r.report_year_id as 'Live version',
                    ry.ap_year as 'Approved versions',
                    CONCAT(su.first_name, su.last_name) as 'Creator',
                    CONCAT(aus.first_name, ' ', aus.last_name) as 'Main contact person',
                    DATE_FORMAT(r.created_at , '%d/%m/%Y') as 'Creation date',
                    ac.description as 'Project title',
                    ac.project_lead_description as 'Project principal investigator',
                    r.description as 'Result desciption',
                    GROUP_CONCAT(CONCAT('- url: ',re.evidence_url, '\n',
                              '  description: ',re.evidence_description, '\n',
                              '  is public: ',IF(re.is_private,'FALSE', 'TRUE')) SEPARATOR '\n') as 'Evidences',
                    cgs.name as 'Geographic scope',
                    GROUP_CONCAT(cc.name SEPARATOR ', ') as 'Countries specified',
                    GROUP_CONCAT(cr.name SEPARATOR ', ') as 'Regions specified',
                    GROUP_CONCAT(ci.name SEPARATOR ', ') as 'Partners involved',
                    GROUP_CONCAT(ci2.name SEPARATOR ', ') as 'Were the trainees attending on behalf of an organization? (CapSha)',
                    ps.name as 'Policy stage',
                    pt.name as 'Policy type',
                    cit.name as 'Innovation type',
                    cic.name as 'Innovation nature',
                    CONCAT(cirl.\`level\`, ': ',cirl.name) as 'Innovation readiness level',
                    rcs.session_participants_total as 'Number people trained TOTAL',
                    rcs.session_participants_female as 'Number people trained FEMALE',
                    rcs.session_participants_male as 'Number people trained MALE',
                    rcs.session_participants_non_binary as 'Number people trained NON BINARY',
                    sl.name as 'Length training',
                    dm.name as 'Delivery modality' 
                  FROM results r
                    LEFT JOIN result_contracts rc ON rc.result_id = r.result_id 
                                  AND rc.is_primary = TRUE
                                  AND rc.is_active = TRUE
                    LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
                    LEFT JOIN indicators i ON r.indicator_id = i.indicator_id 
                    LEFT JOIN result_levers rl ON rl.result_id = r.result_id 
                                AND rl.is_primary = TRUE
                                AND rl.is_active = TRUE
                    LEFT JOIN clarisa_levers cl ON cl.id  = rl.lever_id 
                    LEFT JOIN (SELECT GROUP_CONCAT(r2.report_year_id SEPARATOR ', ') ap_year, r2.result_official_code   
                          FROM results r2
                          WHERE r2.is_active = TRUE
                            AND r2.is_snapshot = TRUE
                          GROUP BY r2.result_official_code ) ry ON ry.result_official_code = r.result_official_code
                    LEFT JOIN sec_users su ON su.sec_user_id = r.created_by 
                    LEFT JOIN result_evidences re ON re.result_id = r.result_id 
                                  AND re.is_active = TRUE
                    LEFT JOIN clarisa_geo_scope cgs ON cgs.code = r.geo_scope_id
                    LEFT JOIN result_countries rc2 ON rc2.result_id = r.result_id 	
                                    AND rc2.is_active = TRUE
                    LEFT JOIN clarisa_countries cc ON rc2.isoAlpha2 = cc.isoAlpha2
                    LEFT JOIN result_regions rr ON rr.result_id = r.result_id 
                                  AND rr.is_active = TRUE
                    LEFT JOIN clarisa_regions cr ON cr.um49Code = rr.region_id 
                    LEFT JOIN result_institutions ri ON ri.result_id = r.result_id 
                                    AND ri.institution_role_id = 3
                                    AND ri.is_active = TRUE
                    LEFT JOIN clarisa_institutions ci ON ci.code = ri.institution_id 
                    LEFT JOIN result_institutions ri2 ON ri2.result_id = r.result_id 
                                    AND ri2.institution_role_id = 2
                                    AND ri.is_active = TRUE
                    LEFT JOIN clarisa_institutions ci2 ON ci2.code = ri2.institution_id 
                    LEFT JOIN result_policy_change rpc ON rpc.result_id = r.result_id 
                                    AND rpc.is_active = TRUE 
                    LEFT JOIN policy_stage ps ON ps.policy_stage_id = rpc.policy_stage_id 
                    LEFT JOIN policy_types pt ON pt.policy_type_id = rpc.policy_type_id 
                    LEFT JOIN result_innovation_dev rid ON rid.result_id = r.result_id 
                                      AND rid.is_active = TRUE
                    LEFT JOIN clarisa_innovation_types cit ON cit.code = rid.innovation_type_id 
                    LEFT JOIN clarisa_innovation_characteristics cic ON cic.id = rid.innovation_nature_id 
                    LEFT JOIN clarisa_innovation_readiness_levels cirl ON cirl.id = rid.innovation_readiness_id
                    LEFT JOIN result_users ru ON ru.result_id = r.result_id 
                                AND ru.user_role_id = 1
                    LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
                    LEFT JOIN result_capacity_sharing rcs ON rcs.result_id = r.result_id 
                    LEFT JOIN session_lengths sl ON sl.session_length_id = rcs.session_length_id 
                    LEFT JOIN delivery_modalities dm ON dm.delivery_modality_id = rcs.delivery_modality_id 
                  WHERE r.is_active = TRUE 
                    AND r.is_snapshot = FALSE
                  GROUP BY r.result_id;`;
    return this.query(query);
  }

  private queryConstructorContract(
    filters: Partial<ResultFiltersInterface>,
    queryParts: DeepPartial<CreateResultQueryInterface>,
    haveCode: boolean,
  ): void {
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
          ? `if(rc.result_contract_id is not null, ${tempQuery}, null)`
          : `JSON_ARRAYAGG(COALESCE(${tempQuery}))`
      } as result_contracts`;

      if (filters?.primary_contract) {
        queryParts.contracts.groupBy = `,rc.result_contract_id`;
      }
    }

    if (filters?.contracts || haveCode) {
      queryParts.contracts.join = `
			LEFT JOIN result_contracts rc ON rc.result_id = r.result_id 
									  AND rc.is_active = TRUE 
									  ${filters?.primary_contract ? `AND rc.is_primary = TRUE` : ''}
		  LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id `;
    }
  }

  private queryConstructorLever(
    filters: Partial<ResultFiltersInterface>,
    queryParts: DeepPartial<CreateResultQueryInterface>,
    haveCode: boolean,
  ): void {
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
      queryParts.levers.select = `,JSON_ARRAYAGG(COALESCE(${tempQuery})) as result_levers`;

      if (filters?.primary_lever) {
        queryParts.levers.groupBy = `,rl.result_lever_id`;
      }
    }

    if (haveCode || filters?.levers) {
      queryParts.levers.join = `
		  LEFT JOIN result_levers rl ON rl.result_id = r.result_id
								AND rl.is_active = TRUE 
								${filters?.primary_lever ? `AND rl.is_primary = TRUE` : ''}
		LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id`;
    }
  }

  private queryConstructorIndicator(
    filters: Partial<ResultFiltersInterface>,
    queryParts: DeepPartial<CreateResultQueryInterface>,
  ): void {
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
  }

  private queryConstructorStatus(
    filters: Partial<ResultFiltersInterface>,
    queryParts: DeepPartial<CreateResultQueryInterface>,
  ): void {
    if (filters?.result_status) {
      queryParts.result_status.select = `,JSON_OBJECT('result_status_id', rs.result_status_id,
					  'name', rs.name,
					  'description', rs.description,
					  'is_active', rs.is_active) as result_status`;
      queryParts.result_status.join = `LEFT JOIN result_status rs ON rs.result_status_id = r.result_status_id`;
    }
  }

  private queryConstructorAuditData(
    filters: Partial<ResultFiltersInterface>,
    queryParts: DeepPartial<CreateResultQueryInterface>,
  ): void {
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
        queryParts.result_audit_data.join = `LEFT JOIN ${this.appConfig.ARI_MYSQL_NAME}.sec_users su1 ON su1.sec_user_id = r.created_by 
		  LEFT JOIN ${this.appConfig.ARI_MYSQL_NAME}.sec_users su2 ON su2.sec_user_id = r.updated_by `;
      }
    }
  }

  filterByPrimaryContract(primaryContracts: string[]) {
    if (isEmpty(primaryContracts)) return '';
    const query = `INNER JOIN (SELECT 
                      DISTINCT rc.result_id 
                    FROM result_contracts rc 
                      INNER JOIN agresso_contracts ac ON rc.contract_id = ac.agreement_id 
                    WHERE rc.is_active = TRUE
                      AND rc.is_primary = TRUE
                      AND rc.contract_id IN (${primaryContracts.map((code) => `'${code}'`).join(',')})) fpc ON fpc.result_id = r.result_id `;
    return query;
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

    const haveContractsCodes = !isEmpty(filters?.contract_codes);
    const haveLeversCodes = !isEmpty(filters?.lever_codes);
    const haveIndicatorsCodes = !isEmpty(filters?.indicator_code);
    const haveStatusCodes = !isEmpty(filters?.status_codes);
    const haveUsersCodes = !isEmpty(filters?.user_codes);
    const haveYears = !isEmpty(filters?.years);
    const haveResultCodes = !isEmpty(filters?.resultCodes);
    const havePlatformCodes = !isEmpty(filters?.platform_code);

    let limit: string = '';

    if (filters?.page && filters?.limit) {
      limit = `LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}`;
    }

    this.queryConstructorContract(filters, queryParts, haveContractsCodes);
    this.queryConstructorLever(filters, queryParts, haveLeversCodes);
    this.queryConstructorIndicator(filters, queryParts);
    this.queryConstructorStatus(filters, queryParts);
    this.queryConstructorAuditData(filters, queryParts);

    let sort_order: string = 'ASC';
    if (['ASC', 'DESC'].includes(filters?.sort_order?.toUpperCase())) {
      sort_order = filters.sort_order.toUpperCase();
    }

    const mainQuery = `
	SELECT 
  ${resultDefaultParametersSQL('r')},
		r.title,
		r.description,
		r.indicator_id,
		r.geo_scope_id,
		r.result_status_id,
		r.report_year_id,
    r.external_link,
		COALESCE(r2.snapshot_years, JSON_ARRAY()) as snapshot_years,
		r.is_active
		${queryParts.result_audit_data?.select}
		${queryParts.result_status?.select}
		${queryParts.indicators?.select}
		${queryParts.levers?.select}
		${queryParts.contracts?.select}
	FROM results r
		LEFT JOIN (SELECT temp.result_official_code,
                                        IF(
								        COUNT(temp.report_year_id) = 0,
								        JSON_ARRAY(),
								        CAST(CONCAT('[', GROUP_CONCAT(temp.report_year_id ORDER BY temp.report_year_id DESC), ']') AS JSON)
								    	) AS snapshot_years
                                        FROM results temp
                                        WHERE temp.is_active = TRUE
                                        AND temp.is_snapshot = TRUE
                                        GROUP BY result_official_code) r2 ON r.result_official_code = r2.result_official_code
    ${this.filterByPrimaryContract(filters?.filter_primary_contract)}
		${queryParts.result_audit_data?.join}
		${queryParts.result_status?.join}
		${queryParts.indicators?.join}
		${queryParts.contracts?.join}
		${queryParts.levers?.join}
		WHERE 1 = 1
		AND r.is_active = TRUE
		AND r.is_snapshot = FALSE
    ${haveResultCodes ? `AND r.result_official_code IN (${formatArrayToQuery<string>(filters.resultCodes)})` : ''}
		${haveContractsCodes ? `AND ac.agreement_id IN (${formatArrayToQuery<string>(filters.contract_codes)})` : ''}
		${haveLeversCodes ? `AND cl.id IN (${formatArrayToQuery<string>(filters.lever_codes)})` : ``}
		${haveIndicatorsCodes ? `AND r.indicator_id IN (${formatArrayToQuery<string>(filters.indicator_code)})` : ''}
		${haveStatusCodes ? `AND r.result_status_id IN (${formatArrayToQuery<string>(filters.status_codes)})` : ''}
		${haveYears ? `AND r.report_year_id IN (${formatArrayToQuery<string>(filters.years)})` : ''}
		${haveUsersCodes ? `AND r.created_by IN (${formatArrayToQuery<string>(filters.user_codes)})` : ''}
    ${havePlatformCodes ? `AND r.platform_code IN (${formatArrayToQuery<string>(filters.platform_code)})` : ''}
	GROUP BY r.result_id
		${queryParts.result_audit_data?.groupBy}
		${queryParts.contracts?.groupBy}
		ORDER BY r.result_official_code ${sort_order}
		${limit}
	`;

    return this.query(mainQuery);
  }

  async deleteResult(result_id: number) {
    const query = `SELECT delete_result(?);`;
    return this.query(query, [result_id]);
  }

  async metadataPrincipalInvestigator(result_id: number, userId: number) {
    return this.query(queryPrincipalInvestigator(), [userId, result_id]).then(
      (res: { result_id: number; is_principal: number }[]) =>
        res?.length ? res[0] : { result_id: result_id, is_principal: 0 },
    );
  }

  async findUserByCarnetId(carnetId: string): Promise<SecUser> {
    const query = `SELECT su.*
    FROM sec_users su
    WHERE su.carnet = ?
      AND su.is_active = TRUE
    LIMIT 1;`;

    return this.query(query, [carnetId]).then((res: SecUser[]) =>
      res?.length ? res[0] : null,
    );
  }

  async findUserByEmail(email: string): Promise<SecUser> {
    const query = `SELECT su.*
    FROM sec_users su
    WHERE su.email = ?
      AND su.is_active = TRUE
    LIMIT 1;`;

    return this.query(query, [email]).then((res: SecUser[]) =>
      res?.length ? res[0] : null,
    );
  }

  async findUserByEmailOrCarnet(
    carnet?: string,
    email?: string,
  ): Promise<SecUser> {
    if (!carnet && !email) {
      return null;
    }
    if (!isEmpty(carnet)) {
      const userByCarnet = await this.findUserByCarnetId(carnet);
      if (userByCarnet) {
        return userByCarnet;
      }
    }
    if (!isEmpty(email)) {
      const userByEmail = await this.findUserByEmail(email);
      if (userByEmail) {
        return userByEmail;
      }
    }
    return null;
  }

  async createUserInSecUsers(newUser: SecUser): Promise<SecUser> {
    const query = `INSERT INTO ${this.appConfig.ARI_MYSQL_NAME}.sec_users
    (first_name, last_name, email, carnet, status_id, is_active)
    VALUES (?, ?, ?, ?, ?, TRUE);`;

    await this.query(query, [
      newUser.first_name,
      newUser.last_name,
      newUser.email,
      newUser.carnet,
      1,
    ]);

    const createdUser = await this.findUserByCarnetId(newUser.carnet);
    return createdUser;
  }

  async unpdateCarnetUser(userId: number, carnet: string) {
    const query = `UPDATE sec_users SET carnet = ? WHERE sec_user_id = ?`;
    await this.query(query, [carnet, userId]);
  }
}

export interface ResultFiltersInterface {
  limit?: number;
  page?: number;
  indicator_code: string[];
  result_audit_data: boolean;
  contracts: boolean;
  primary_contract: boolean;
  levers: boolean;
  primary_lever: boolean;
  indicators: boolean;
  result_status: boolean;
  result_audit_data_objects: boolean;
  sort_order: string;
  contract_codes: string[];
  lever_codes: string[];
  status_codes: string[];
  user_codes: string[];
  years: string[];
  resultCodes: string[];
  platform_code?: string[];
  filter_primary_contract?: string[];
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

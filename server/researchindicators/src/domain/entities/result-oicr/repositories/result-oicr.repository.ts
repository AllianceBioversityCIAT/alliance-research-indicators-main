import { Injectable } from '@nestjs/common';
import { ResultOicr } from '../entities/result-oicr.entity';
import { EntityManager, Repository } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';

@Injectable()
export class ResultOicrRepository extends Repository<ResultOicr> {
  constructor(
    entityManager: EntityManager,
    private readonly appConfig: AppConfig,
  ) {
    super(ResultOicr, entityManager);
  }

  async getDataToNewOicrMessage(resultId: number) {
    const query = ` SELECT 
                    r.result_official_code as result_code,
                    r.title as result_title,
                    rc.contract_id as contract_code,
                    ac.description as contract_description,
                    ac.project_lead_description as principal_investigator,
                    IFNULL(cl.full_name, 'No lever associated') as primary_lever,
                    IF(aus.carnet IS NOT NULL, CONCAT(aus.first_name, ', ',aus.last_name), 'Not Provided') as main_contact_person,
                    r.description as oicr_description,
                    '' as oicr_link
                    FROM results r
                    INNER JOIN result_oicrs ro ON ro.result_id = r.result_id 
                    INNER JOIN result_contracts rc ON rc.result_id = r.result_id 
                                                    AND rc.is_primary = TRUE
                                                    AND rc.is_active = TRUE
                                                    AND rc.contract_role_id = 1
                    INNER JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
                    LEFT JOIN result_levers rl ON rl.result_id = r.result_id 
                                                AND rl.is_primary = TRUE
                                                AND rl.lever_role_id = 1
                    LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
                    LEFT JOIN result_users ru ON ru.result_id = r.result_id 
                                                AND ru.is_active = TRUE
                                                AND ru.user_role_id = 1
                    LEFT JOIN alliance_user_staff aus ON aus.carnet = ru.user_id 
                    WHERE r.is_active = TRUE
                        AND r.result_id = ?
                    LIMIT 1;`;

    const result = await this.query(query, [resultId]).then((res) => res?.[0]);
    result.oicr_link = `${this.appConfig.ARI_CLIENT_HOST}/result/${result.result_code}/general-information`;
    return result;
  }

  async getResultOicrDetailsByOfficialCode(resultOfficialCode: number) {
    const query = `
      SELECT 
        r.result_official_code as result_code,
        r.title,
        ac.agreement_id as project_id,
        ac.description as project_title,
        t.id as tag_id,
        t.name as tagging,
        ro.outcome_impact_statement,
        cl.id as lever_id,
        cl.short_name as lever,
        cl.full_name as lever_name,
        cgs.name as geographic_scope,
        cr.um49Code as region_code,
        cr.name as region_name,
        cc.isoAlpha2 as country_code,
        cc.name as country_name,
        r.comment_geo_scope
      FROM results r
      INNER JOIN result_oicrs ro ON ro.result_id = r.result_id 
      INNER JOIN result_contracts rc ON rc.result_id = r.result_id 
          AND rc.is_active = TRUE
      INNER JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id 
      LEFT JOIN result_levers rl ON rl.result_id = r.result_id 
          AND rl.lever_role_id = 1
      LEFT JOIN clarisa_levers cl ON cl.id = rl.lever_id 
      LEFT JOIN result_tags rt on rt.result_id = r.result_id
      LEFT JOIN tags t on t.id = rt.tag_id
      LEFT JOIN clarisa_geo_scope cgs on cgs.code = r.geo_scope_id
      LEFT JOIN result_regions rg on rg.result_id = r.result_id
      LEFT JOIN clarisa_regions cr on cr.um49Code = rg.region_id
      LEFT JOIN result_countries rco on rco.result_id = r.result_id
      LEFT JOIN clarisa_countries cc on cc.isoAlpha2 = rco.isoAlpha2
      WHERE r.result_official_code = ?
        AND r.is_active = TRUE
      LIMIT 1;
    `;
    const result = await this.query(query, [resultOfficialCode]);
    return result?.[0] ?? null;
  }
}

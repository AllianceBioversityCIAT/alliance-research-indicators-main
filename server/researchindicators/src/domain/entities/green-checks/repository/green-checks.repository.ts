import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindGreenChecksDto } from '../dto/find-green-checks.dto';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { Result } from '../../results/entities/result.entity';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { FindGreenChecksUserDto } from '../dto/find-green-checks-user.dto';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import {
  FindDataForSubmissionDto,
  FindGeneralDataTemplateDto,
} from '../dto/find-general-data-template.dto';
import { queryPrincipalInvestigator } from '../../../shared/const/gloabl-queries.const';

@Injectable()
export class GreenCheckRepository {
  constructor(
    private dataSource: DataSource,
    private readonly appConfig: AppConfig,
  ) {}

  generalInformationValidation(result_key: string) {
    return `general_information_validation(${result_key}) as general_information`;
  }

  alignmentValidation(result_key: string) {
    return `alignment_validation(${result_key}) as alignment`;
  }

  geoLocationValidation(result_key: string) {
    return `geo_location_validation(${result_key}) as geo_location`;
  }

  partnersValidation(result_key: string) {
    return `partners_validation(${result_key}) as partners`;
  }

  evidencesValidation(result_key: string) {
    return `evidences_validation(${result_key}) as evidences`;
  }

  capSharingValidation(result_key: string) {
    return `cap_sharing_validation(${result_key}) as cap_sharing`;
  }

  capSharingIpValidation(result_key: string) {
    return `cap_sharing_ip_validation(${result_key}) as cap_sharing_ip`;
  }

  policyChangeValidation(result_key: string) {
    return `policy_change_validation(${result_key}) as policy_change`;
  }

  async calculateGreenChecks(result_id: number): Promise<FindGreenChecksDto> {
    const indicator: IndicatorsEnum = await this.dataSource
      .getRepository(Result)
      .findOne({
        where: {
          is_active: true,
          result_id,
        },
      })
      .then((result) => result.indicator_id);

    let spesificQuery = '';
    const result_key = 'r.result_id';
    switch (indicator) {
      case IndicatorsEnum.POLICY_CHANGE:
        spesificQuery = this.policyChangeValidation(result_key);
        break;
      case IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
        spesificQuery = `${this.capSharingIpValidation(result_key)},
            ${this.capSharingValidation(result_key)}`;
      case IndicatorsEnum.INNOVATION_DEV:
        spesificQuery = '0 as innovation_dev';
        break;
    }

    const query = `
            SELECT
                ${this.generalInformationValidation(result_key)},
                ${this.alignmentValidation(result_key)},
                ${this.geoLocationValidation(result_key)},
                ${this.partnersValidation(result_key)},
                ${this.evidencesValidation(result_key)},
                ${spesificQuery}
            FROM results r
            WHERE r.result_id = ?
                AND r.is_active = TRUE
            LIMIT 1;
        `;
    console.log(query);

    return this.dataSource
      .query(query, [result_id])
      .then((result) => (result.length ? result[0] : null));
  }

  async getSubmissionHistory(resultId: number) {
    const query = `select 
          sh.submission_history_id,
          sh.result_id,
          sh.from_status_id,
          sh.to_status_id,
          sh.submission_comment,
          sh.is_active,
          sh.created_by,
          sh.created_at,
          sh.updated_at,
          JSON_OBJECT(
          	'result_id',r.result_id,
          	'result_official_code', r.result_official_code,
          	'version_id', r.version_id,
          	'title', r.title,
          	'description', r.description,
          	'indicator_id', r.indicator_id,
          	'geo_scope_id', r.geo_scope_id,
          	'report_year_id', r.report_year_id,
          	'result_status_id', r.result_status_id) as result,
          JSON_OBJECT( 
          	'result_status_id', rs1.result_status_id,
          	'name', rs1.name ) as from_status,
          JSON_OBJECT( 
          	'result_status_id', rs2.result_status_id,
          	'name', rs2.name ) as to_status,
          JSON_OBJECT(
          	'sec_user_id', su1.sec_user_id,
          	'email', su1.email,
          	'first_name', su1.first_name,
          	'last_name', su1.last_name,
          	'is_active', su1.is_active ) as created_by_object
          from submission_history sh 
          inner join results r on r.result_id = sh.result_id 
          INNER JOIN result_status rs1 on rs1.result_status_id = sh.from_status_id
          INNER JOIN result_status rs2 on rs2.result_status_id = sh.to_status_id 
          INNER JOIN ${this.appConfig.ARI_MYSQL_NAME}.sec_users su1 on su1.sec_user_id = sh.created_by 
          WHERE r.is_active = TRUE
          	AND r.result_id = ?
          ORDER BY sh.submission_history_id DESC;`;

    return this.dataSource.query(query, [resultId]);
  }

  async canSubmit(userId: number, resultId: number, needRoles?: number[]) {
    const query = `
    SELECT 
    	COUNT(sur.sec_user_role_id) > 0 AS validation
    FROM ${this.appConfig.ARI_MYSQL_NAME}.sec_user_roles sur 
    WHERE sur.user_id = ?
    	AND (sur.is_active = TRUE
    	${needRoles?.length > 0 ? `AND sur.role_id IN (${needRoles.join(',')})` : ''})
    	OR sur.role_id = 1`;

    const queryResult = `
    SELECT 
    	count(r.result_id) = 1 as validation
    FROM results r 
    WHERE r.result_id = ?
    	AND r.created_by = ?
    	AND r.is_active = TRUE;      
    `;

    const principal = await this.dataSource
      .query(queryPrincipalInvestigator(), [userId, resultId])
      .then((result) => result?.[0]?.is_principal ?? 0);

    const roles = await this.dataSource
      .query(query, [userId])
      .then((result) => result?.[0]?.validation);

    const result = await this.dataSource
      .query(queryResult, [resultId, userId])
      .then((result) => result?.[0]?.validation);

    return principal == 1 || (roles == 1 && result == 1);
  }

  async getDataForSubmissionResult(
    resultId: number,
  ): Promise<FindDataForSubmissionDto> {
    const query = `
        select 
          su.sec_user_id as contributor_id,
        	su.email as contributor_email,
        	ac.project_lead_description as pi_name,
        	null as pi_email,
        	r.result_id,
        	r.title,
        	ac.description as project_name  
        from results r 
        	left join result_contracts rc on rc.result_id = r.result_id 
        									and rc.is_primary = true
        									and rc.is_active = true
        	left join agresso_contracts ac on ac.agreement_id = rc.contract_id 
        	left join sec_users su on su.sec_user_id = r.created_by 
        where r.is_active = true
        	and r.result_id = ?
        limit 1;
    `;

    const result: FindDataForSubmissionDto = await this.dataSource
      .query(query, [resultId])
      .then((result) => (result?.length ? result[0] : null));

    return result;
  }

  async createSnapshot(resultCode: number, reportYear: number) {
    const deleteQuery = `CALL SP_delete_result_version(?, ?)`;
    const snapshotResult = await this.dataSource.getRepository(Result).findOne({
      where: {
        is_snapshot: true,
        result_official_code: resultCode,
        report_year_id: reportYear,
      },
    });

    if (snapshotResult) {
      await this.dataSource.query(deleteQuery, [resultCode, reportYear]);
    }

    const query = `CALL SP_versioning(?);`;
    return this.dataSource.query<Result>(query, [resultCode]);
  }

  async getDataForReviseResult(
    resultId: number,
    toStatusId: ResultStatusEnum,
    fromStatusId: ResultStatusEnum,
  ): Promise<FindGeneralDataTemplateDto> {
    const query = `
    select sh.*,
    	JSON_OBJECT('sec_user_id', su.sec_user_id,
    				'first_name', su.first_name,
    				'last_name', su.last_name,
    				'email', su.email) as user
    from submission_history sh 
    inner join sec_users su on su.sec_user_id = sh.created_by 
    where sh.result_id = ?
    	and sh.is_active = true
    order by sh.created_at desc
    limit 2;
    `;

    const queryResult = `
    select r.result_id, r.title 
    from results r 
    where r.result_id = ?
    	and r.is_active = true
    limit 1;
    `;
    const result = await this.dataSource
      .query<{ result_id: number; title: string }[]>(queryResult, [resultId])
      .then((result) => (result?.length ? result[0] : null));

    const history = await this.dataSource.query<FindGreenChecksUserDto[]>(
      query,
      [resultId],
    );

    const subData = history.find((d) => d.to_status_id === toStatusId);
    const revData = history.find((d) => d.to_status_id === fromStatusId);

    return {
      sub_last_name: subData.user.last_name,
      sub_first_name: subData.user.first_name,
      sub_email: subData.user.email,
      rev_last_name: revData.user.last_name,
      rev_first_name: revData.user.first_name,
      rev_email: revData.user.email,
      description: revData.submission_comment,
      result_id: result.result_id,
      title: result.title,
    };
  }
}

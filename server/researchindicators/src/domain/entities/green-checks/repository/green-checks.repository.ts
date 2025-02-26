import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindGreenChecksDto } from '../dto/find-green-checks.dto';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { Result } from '../../results/entities/result.entity';
import { AppConfig } from '../../../shared/utils/app-config.util';

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
        spesificQuery = this.capSharingValidation(result_key);
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
}

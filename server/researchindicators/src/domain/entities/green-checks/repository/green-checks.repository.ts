import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindGreenChecksDto } from '../dto/find-green-checks.dto';

@Injectable()
export class GreenCheckRepository {
  constructor(private dataSource: DataSource) {}

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
    const result_key = 'r.result_id';
    const query = `
            SELECT
                ${this.generalInformationValidation(result_key)},
                ${this.alignmentValidation(result_key)},
                ${this.geoLocationValidation(result_key)},
                ${this.partnersValidation(result_key)},
                ${this.evidencesValidation(result_key)},
                ${this.capSharingValidation(result_key)},
                ${this.policyChangeValidation(result_key)}
            FROM results r
            WHERE r.result_id = ?
                AND r.is_active = TRUE
            LIMIT 1;
        `;

    return this.dataSource
      .query(query, [result_id])
      .then((result) => (result.length ? result[0] : null));
  }
}

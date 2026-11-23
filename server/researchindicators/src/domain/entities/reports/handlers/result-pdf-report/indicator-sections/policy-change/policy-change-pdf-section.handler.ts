import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { ResultPolicyChange } from '../../../../../result-policy-change/entities/result-policy-change.entity';
import { ResultInstitution } from '../../../../../result-institutions/entities/result-institution.entity';
import { InstitutionRolesEnum } from '../../../../../institution-roles/enums/institution-roles.enum';
import { LinkResult } from '../../../../../link-results/entities/link-result.entity';
import { LinkResultRolesEnum } from '../../../../../link-result-roles/enum/link-result-roles.enum';
import { mapPolicyChangeSection } from '../../result-pdf-report.mapper';
import { ResultPdfIndicatorSectionHandler } from '../result-pdf-indicator-section.types';

/**
 * Builds `policy_change` for the `policy_change` template. Same reads as
 * `GET /api/results/policy-change/by-result-id/:id`, but every id comes back with
 * its complete data: catalog names, institution details and the linked results.
 */
@Injectable()
export class PolicyChangePdfSectionHandler
  implements ResultPdfIndicatorSectionHandler
{
  readonly indicatorId = IndicatorsEnum.POLICY_CHANGE;

  constructor(private readonly dataSource: DataSource) {}

  async buildSections(resultId: number) {
    const [policyChange, implementingOrganizations, links] = await Promise.all([
      this.dataSource.getRepository(ResultPolicyChange).findOne({
        where: { result_id: resultId, is_active: true },
        relations: { policy_type: true, policy_stage: true },
      }),
      this.dataSource.getRepository(ResultInstitution).find({
        where: {
          result_id: resultId,
          institution_role_id: InstitutionRolesEnum.POLICY_CHANGE,
          is_active: true,
        },
        relations: {
          institution: {
            institution_type: true,
            institution_locations: { country: true },
          },
        },
      }),
      this.dataSource.getRepository(LinkResult).find({
        where: {
          result_id: resultId,
          link_result_role_id: LinkResultRolesEnum.POLICY_CHANGE,
          is_active: true,
        },
        relations: { other_result: { result_status: true } },
      }),
    ]);

    const linkedByIndicator = (indicatorId: IndicatorsEnum) =>
      links.find((link) => link.other_result?.indicator_id === indicatorId)
        ?.other_result ?? null;

    return {
      policy_change: mapPolicyChangeSection({
        policyChange,
        implementingOrganizations,
        innovationDevelopment: linkedByIndicator(IndicatorsEnum.INNOVATION_DEV),
        innovationUse: linkedByIndicator(IndicatorsEnum.INNOVATION_USE),
      }),
    };
  }
}

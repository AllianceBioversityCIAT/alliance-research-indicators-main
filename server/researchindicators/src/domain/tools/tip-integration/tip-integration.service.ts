import { Injectable } from '@nestjs/common';
import { TipIprDataDto } from './dto/tip-ipr-data.dto';
import { ResultsService } from '../../entities/results/results.service';
import { ResultCapSharingIpService } from '../../entities/result-cap-sharing-ip/result-cap-sharing-ip.service';
import { ResultUsersService } from '../../entities/result-users/result-users.service';
import { UserRolesEnum } from '../../entities/user-roles/enum/user-roles.enum';
import { AppConfig } from '../../shared/utils/app-config.util';

export enum IntellectualPropertyOwner {
  CIAT = 1,
  BIOVERSITY = 2,
  BOTH = 3,
  OTHERS = 4,
}

export const INTELLECTUAL_PROPERTY_OWNER_NAMES = {
  [IntellectualPropertyOwner.CIAT]:
    'International Center for Tropical Agriculture - CIAT',
  [IntellectualPropertyOwner.BIOVERSITY]: 'Bioversity International',
  [IntellectualPropertyOwner.BOTH]:
    'Bioversity International and International Center for Tropical Agriculture - CIAT',
  [IntellectualPropertyOwner.OTHERS]: 'Others',
};

@Injectable()
export class TipIntegrationService {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly resultsService: ResultsService,
    private readonly resultCapSharingIpService: ResultCapSharingIpService,
    private readonly resultUsersService: ResultUsersService,
  ) {}

  async getAllIprData(options?: { limit?: number }): Promise<TipIprDataDto[]> {
    console.log('Fetching all IPR data for TIP integration');

    const queryBuilder = this.resultsService['mainRepo']
      .createQueryBuilder('result')
      .where('result.is_active = :isActive', { isActive: true })
      .andWhere('result.is_snapshot = :isSnapshot', { isSnapshot: false })
      .leftJoinAndSelect('result.indicator', 'indicator')
      .leftJoinAndSelect('result.result_contracts', 'result_contracts')
      .leftJoinAndSelect(
        'result_contracts.agresso_contract',
        'agresso_contract',
      );

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    const results = await queryBuilder.getMany();

    const data: TipIprDataDto[] = [];
    for (const result of results) {
      const ipr = await this.resultCapSharingIpService.findByResultId(
        result.result_id,
      );

      const users = await this.resultUsersService.findUsersByRoleResult(
        UserRolesEnum.MAIN_CONTACT,
        result.result_id,
      );
      const creator = users?.[0]?.user;

      const reportingProject =
        result.result_contracts?.find((c) => c.is_primary)?.agresso_contract
          ?.project || '';

      const indicator = result.indicator?.name || '';

      const intellectualPropertyOwnerId = ipr?.asset_ip_owner || null;
      const intellectualPropertyOwnerName = intellectualPropertyOwnerId
        ? INTELLECTUAL_PROPERTY_OWNER_NAMES[intellectualPropertyOwnerId] || null
        : null;

      data.push({
        resultId: Number(result.result_id),
        resultCode: Number(result.result_official_code),
        indicator,
        resultTitle: result.title || '',
        resultDescription: result.description || '',
        reportingProject,
        resultCreator: {
          fullName: creator ? `${creator.first_name} ${creator.last_name}` : '',
          email: creator?.email || '',
        },
        linkToResult: `${this.appConfig.ARI_CLIENT_HOST}/result/${result.result_official_code}/general-information`,

        intellectualPropertyOwnerId,
        intellectualPropertyOwnerName,
        iprOwnerOther: ipr?.asset_ip_owner_description,

        hasLegalRestrictions: !!ipr?.publicity_restriction,
        legalRestrictionsDetails: ipr?.publicity_restriction_description,
        hasCommercializationPotential: !!ipr?.potential_asset,
        commercializationDetails: ipr?.potential_asset_description,
        requiresFurtherDevelopment: !!ipr?.requires_futher_development,
        furtherDevelopmentDetails: ipr?.requires_futher_development_description,
      });
    }
    return data;
  }
}

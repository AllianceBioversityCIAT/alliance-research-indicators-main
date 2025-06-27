import { Injectable } from '@nestjs/common';
import { TipIprDataDto, IprOwner } from './dto/tip-ipr-data.dto';
import { ResultsService } from '../../entities/results/results.service';
import { ResultCapSharingIpService } from '../../entities/result-cap-sharing-ip/result-cap-sharing-ip.service';
import { ResultUsersService } from '../../entities/result-users/result-users.service';
import { UserRolesEnum } from '../../entities/user-roles/enum/user-roles.enum';

@Injectable()
export class TipIntegrationService {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly resultCapSharingIpService: ResultCapSharingIpService,
    private readonly resultUsersService: ResultUsersService,
  ) {}

  async getAllIprData(): Promise<TipIprDataDto[]> {
    const results = await this.resultsService['mainRepo'].find({
      where: { is_active: true, is_snapshot: false },
      relations: {
        indicator: true,
        result_contracts: true,
      },
    });

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

      let iprOwner: IprOwner = IprOwner.Other;
      if (ipr?.asset_ip_owner_description) {
        const desc = ipr.asset_ip_owner_description.toLowerCase();
        if (desc.includes('ciat') && desc.includes('bioversity'))
          iprOwner = IprOwner.Both;
        else if (desc.includes('ciat')) iprOwner = IprOwner.CIAT;
        else if (desc.includes('bioversity')) iprOwner = IprOwner.Bioversity;
        else iprOwner = IprOwner.Other;
      }
      
      data.push({
        resultId: String(result.result_id),
        resultCode: String(result.result_official_code),
        indicator,
        resultTitle: result.title || '',
        resultDescription: result.description || '',
        reportingProject,
        resultCreator: {
          fullName: creator ? `${creator.first_name} ${creator.last_name}` : '',
          email: creator?.email || '',
        },
        linkToResult: `https://example.com/results/${result.result_id}`,
        iprOwner,
        iprOwnerOther:
          iprOwner === IprOwner.Other
            ? ipr?.asset_ip_owner_description
            : undefined,
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

import { IntellectualPropertyOwnerEnum } from '../../../entities/intellectual-property-owners/enum/intellectual-property-owner.enum';
import { Result } from '../../../entities/results/entities/result.entity';
import { NotApplicable, NotProvided } from '../../../shared/const/utils.const';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { isEmpty } from '../../../shared/utils/object.utils';
import { TipIprDataDto } from '../dto/tip-ipr-data.dto';

export const tipIntegrationMapper = (
  result: Result,
  appConfig: AppConfig,
): TipIprDataDto => {
  const user = result.result_users?.[0]?.user;
  let creatorFullName: string = NotProvided;
  let creatorEmail: string = NotProvided;
  if (user) {
    creatorFullName = `${user.first_name} ${user.last_name}`;
    creatorEmail = user.email;
  }

  const ip = result.result_cap_sharing_ip?.[0];

  return {
    resultId: Number(result.result_id),
    resultCode: Number(result.result_official_code),
    indicator: validationField(result.indicator?.name),
    resultTitle: validationField(result?.title),
    resultDescription: validationField(result?.description),
    reportingProject: validationField(
      result.result_contracts?.[0]?.agresso_contract?.project,
    ),
    resultCreator: {
      fullName: creatorFullName,
      email: creatorEmail,
    },
    linkToResult: `${appConfig.ARI_CLIENT_HOST}/result/${result.result_official_code}/general-information`,

    intellectualPropertyOwnerId: validationField(ip?.asset_ip_owner_id),
    intellectualPropertyOwnerName: validationField(
      ip?.intellectualPropertyOwner?.name,
    ),
    iprOwnerOther: validationField(
      ip?.asset_ip_owner_description,
      ip?.asset_ip_owner_id == IntellectualPropertyOwnerEnum.OTHERS,
    ),

    hasLegalRestrictions: validationField(ip?.publicity_restriction),
    legalRestrictionsDetails: validationField(
      ip?.publicity_restriction_description,
      Boolean(ip?.publicity_restriction),
    ),
    hasCommercializationPotential: validationField(ip?.potential_asset),
    commercializationDetails: validationField(
      ip?.potential_asset_description,
      Boolean(ip?.potential_asset),
    ),
    requiresFurtherDevelopment: validationField(
      ip?.requires_futher_development,
    ),
    furtherDevelopmentDetails: validationField(
      ip?.requires_futher_development_description,
      Boolean(ip?.requires_futher_development),
    ),
  };
};

const validationField = <T>(data: T, validation: boolean = true) => {
  if (!validation) return NotApplicable;
  return String(isEmpty(data) ? NotProvided : data);
};

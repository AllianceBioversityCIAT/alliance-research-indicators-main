import { IpRightsApplicationOptionEnum } from '../../../../entities/ip-rights-application-options/enum/ip-rights-application-option.enum';

/**
 * Maps exact PRMS questionnaire `answer.text` values to STAR
 * {@link IpRightsApplicationOptionEnum}.
 */
export const IpRightsApplicationHomologation: Record<
  string,
  IpRightsApplicationOptionEnum
> = {
  Yes: IpRightsApplicationOptionEnum.YES,
  No: IpRightsApplicationOptionEnum.NO,
  'Not sure': IpRightsApplicationOptionEnum.NOT_SURE,
};

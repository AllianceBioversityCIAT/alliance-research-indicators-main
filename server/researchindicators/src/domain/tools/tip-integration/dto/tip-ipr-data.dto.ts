export interface TipIprDataDto {
  resultId: number;
  resultCode: number;
  indicator: string;
  resultTitle: string;
  resultDescription: string;
  reportingProject: string;
  resultCreator: {
    fullName: string;
    email: string;
  };
  linkToResult: string;

  intellectualPropertyOwnerId?: string;
  intellectualPropertyOwnerName?: string;
  iprOwnerOther?: string;

  hasLegalRestrictions: string;
  legalRestrictionsDetails?: string;

  hasCommercializationPotential: string;
  commercializationDetails?: string;

  requiresFurtherDevelopment: string;
  furtherDevelopmentDetails?: string;
}

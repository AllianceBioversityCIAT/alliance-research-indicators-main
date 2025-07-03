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

  intellectualPropertyOwnerId: number | null;
  intellectualPropertyOwnerName: string | null;
  iprOwnerOther: string | null;

  hasLegalRestrictions: boolean;
  legalRestrictionsDetails: string | null;

  hasCommercializationPotential: boolean;
  commercializationDetails: string | null;

  requiresFurtherDevelopment: boolean;
  furtherDevelopmentDetails: string | null;
}

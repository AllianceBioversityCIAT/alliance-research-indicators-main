export interface TipIprDataDto {
  resultId: number;
  resultCode: number;
  indicator: string;
  resultTitle: string;
  resultDescription: string;
  createdAt?: string;
  reportingProject: {
    project: string;
    agreement_id?: string;
    name?: string;
  };
  resultCreator: {
    fullName: string;
    email: string;
    carnet?: string;
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
  year?: number;
  resultStatusName?: string;
}

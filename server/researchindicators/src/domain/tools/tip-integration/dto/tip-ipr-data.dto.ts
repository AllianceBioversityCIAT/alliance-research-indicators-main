export enum IprOwner {
  CIAT = 'CIAT',
  Bioversity = 'Bioversity',
  Both = 'Both',
  Other = 'Other',
}

export interface ResultCreatorDto {
  fullName: string;
  email: string;
}

export interface TipIprDataDto {
  resultId: string;
  resultCode: string;
  indicator: string;
  resultTitle: string;
  resultDescription: string;
  reportingProject: string;
  resultCreator: ResultCreatorDto;
  linkToResult: string;

  iprOwner: IprOwner;
  iprOwnerOther?: string;
  hasLegalRestrictions: boolean;
  legalRestrictionsDetails?: string;
  hasCommercializationPotential: boolean;
  commercializationDetails?: string;
  requiresFurtherDevelopment: boolean;
  furtherDevelopmentDetails?: string;
}

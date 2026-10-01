import { ResultStatusEnum } from '../../../../entities/result-status/enum/result-status.enum';

export enum ResultTypeEnum {
  POLICY_CHANGE = 1,
  INNOVATION_USE = 2,
  CAPACITY_CHANGE = 3,
  OTHER_OUTCOME = 4,
  CAPACITY_SHARING_FOR_DEVELOPMENT = 5,
  KNOWLEDGE_PRODUCT = 6,
  INNOVATION_DEVELOPMENT = 7,
  OTHER_OUTPUT = 8,
  IMPACT_CONTRIBUTION = 9,
  INNOVATION_USE_IPSR = 10,
  COMPLIMENTARY_INNOVATION = 11,
}

export enum AcronymExContractEnum {
  'ABC RH' = 'EXCIAT',
  'ABC' = 'EXBIO',
}

export const ResultPrmsStatusMapper = {
  1: ResultStatusEnum.EDITING_IN_PRMS,
  2: ResultStatusEnum.QAED_IN_PRMS,
  3: ResultStatusEnum.SUBMITTED_IN_PRMS,
  4: ResultStatusEnum.DISCONTINUED_IN_PRMS,
};

/**
 * PRMS `status_id` -> STAR status, for PRMS results imported as STAR results.
 * Statuses missing from this map are not imported.
 */
export const ResultPrmsToStarStatusMapper: Partial<
  Record<number, ResultStatusEnum>
> = {
  1: ResultStatusEnum.DRAFT, // Editing
  2: ResultStatusEnum.APPROVED, // Quality Assessed
  3: ResultStatusEnum.SUBMITTED, // Submitted
  5: ResultStatusEnum.SUBMITTED, // Pending Review
  6: ResultStatusEnum.APPROVED, // Approved
  // 4 Discontinued: provisionally skipped until it has a STAR equivalent.
  // 7 Rejected: skipped.
};

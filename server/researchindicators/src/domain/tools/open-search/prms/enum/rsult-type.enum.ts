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
 * Only these three PRMS statuses are imported, and all of them land in STAR as
 * Approved. Every other PRMS status (1 Editing, 2 Quality Assessed,
 * 3 Submitted, 4 Discontinued) is not imported.
 */
export const ResultPrmsToStarStatusMapper: Partial<
  Record<number, ResultStatusEnum>
> = {
  5: ResultStatusEnum.APPROVED, // Pending Review
  6: ResultStatusEnum.APPROVED, // Approved
  7: ResultStatusEnum.APPROVED, // Rejected
};

/**
 * The PRMS decision an imported result records in its sync history, by PRMS
 * `status_id`. Pending Review (5) has no decision yet.
 */
export const PrmsImportedDecision: Partial<
  Record<
    number,
    { status: 'APPROVED' | 'REJECTED'; decision: 'APPROVE' | 'REJECT' }
  >
> = {
  6: { status: 'APPROVED', decision: 'APPROVE' },
  7: { status: 'REJECTED', decision: 'REJECT' },
};

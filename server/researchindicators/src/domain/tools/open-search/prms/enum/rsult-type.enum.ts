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

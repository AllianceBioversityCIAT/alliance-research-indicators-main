import { PolicyTypesEnum } from '../../../../entities/policy-types/enum/policy-types.enum';

/**
 * PRMS policy_type ids (from PRMS `policy_change_summary.policy_type`).
 *
 * 1 = Program, budget or investment
 * 2 = Legal instrument
 * 3 = Policy or strategy
 */
export enum PrmsPolicyTypeEnum {
  PROGRAM_BUDGET_OR_INVESTMENT = 1,
  LEGAL_INSTRUMENT = 2,
  POLICY_OR_STRATEGY = 3,
}

/**
 * Maps a PRMS policy_type id to the equivalent STAR {@link PolicyTypesEnum}.
 * PRMS and STAR share the same three labels but use different id orderings.
 */
export const PolicyTypeHomologation: Record<
  PrmsPolicyTypeEnum,
  PolicyTypesEnum
> = {
  [PrmsPolicyTypeEnum.PROGRAM_BUDGET_OR_INVESTMENT]:
    PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT,
  [PrmsPolicyTypeEnum.LEGAL_INSTRUMENT]: PolicyTypesEnum.LEGAL_INSTRUMENT,
  [PrmsPolicyTypeEnum.POLICY_OR_STRATEGY]: PolicyTypesEnum.POLICY_OR_STRATEGY,
};

import { PolicyStagesEnum } from '../../../../entities/policy-stages/enum/policy-stages.enum';

/**
 * PRMS policy_stage ids (from PRMS `policy_change_summary.policy_stage`).
 *
 * 6 = Stage 1
 * 7 = Stage 2
 * 8 = Stage 3
 */
export enum PrmsPolicyStageEnum {
  STAGE_1 = 6,
  STAGE_2 = 7,
  STAGE_3 = 8,
}

/**
 * Maps a PRMS policy_stage id to the equivalent STAR {@link PolicyStagesEnum}.
 * Same stage labels; PRMS uses 6–8 while STAR uses 1–3.
 */
export const PolicyStageHomologation: Record<
  PrmsPolicyStageEnum,
  PolicyStagesEnum
> = {
  [PrmsPolicyStageEnum.STAGE_1]: PolicyStagesEnum.STAGE_1,
  [PrmsPolicyStageEnum.STAGE_2]: PolicyStagesEnum.STAGE_2,
  [PrmsPolicyStageEnum.STAGE_3]: PolicyStagesEnum.STAGE_3,
};

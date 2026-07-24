import {
  PolicyStageHomologation,
  PrmsPolicyStageEnum,
} from './policy-stage.homologation';
import { PolicyStagesEnum } from '../../../../entities/policy-stages/enum/policy-stages.enum';

describe('PolicyStageHomologation', () => {
  it('maps each PRMS stage id to the matching STAR policy_stage_id', () => {
    expect(PolicyStageHomologation[PrmsPolicyStageEnum.STAGE_1]).toBe(
      PolicyStagesEnum.STAGE_1,
    );
    expect(PolicyStageHomologation[PrmsPolicyStageEnum.STAGE_2]).toBe(
      PolicyStagesEnum.STAGE_2,
    );
    expect(PolicyStageHomologation[PrmsPolicyStageEnum.STAGE_3]).toBe(
      PolicyStagesEnum.STAGE_3,
    );
  });

  it('maps numeric PRMS ids 6/7/8 to STAR 1/2/3', () => {
    expect(PolicyStageHomologation[6]).toBe(1);
    expect(PolicyStageHomologation[7]).toBe(2);
    expect(PolicyStageHomologation[8]).toBe(3);
  });
});

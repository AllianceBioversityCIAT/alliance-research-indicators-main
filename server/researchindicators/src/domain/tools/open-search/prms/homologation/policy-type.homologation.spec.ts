import {
  PolicyTypeHomologation,
  PrmsPolicyTypeEnum,
} from './policy-type.homologation';
import { PolicyTypesEnum } from '../../../../entities/policy-types/enum/policy-types.enum';

describe('PolicyTypeHomologation', () => {
  it('maps PRMS policy types to STAR policy_type_id values', () => {
    expect(
      PolicyTypeHomologation[PrmsPolicyTypeEnum.PROGRAM_BUDGET_OR_INVESTMENT],
    ).toBe(PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT);
    expect(PolicyTypeHomologation[PrmsPolicyTypeEnum.LEGAL_INSTRUMENT]).toBe(
      PolicyTypesEnum.LEGAL_INSTRUMENT,
    );
    expect(PolicyTypeHomologation[PrmsPolicyTypeEnum.POLICY_OR_STRATEGY]).toBe(
      PolicyTypesEnum.POLICY_OR_STRATEGY,
    );
  });

  it('cross-walks PRMS numeric ids to STAR numeric ids', () => {
    // PRMS 1 (Program…) → STAR 3
    expect(PolicyTypeHomologation[1]).toBe(3);
    // PRMS 2 (Legal instrument) → STAR 2
    expect(PolicyTypeHomologation[2]).toBe(2);
    // PRMS 3 (Policy or strategy) → STAR 1
    expect(PolicyTypeHomologation[3]).toBe(1);
  });
});

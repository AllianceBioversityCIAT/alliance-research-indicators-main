import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBilateralProjectMappingDto } from './create-bilateral-project-mapping.dto';
import { MappingSourceEnum } from '../enum/mapping-source.enum';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 Finding 2
// (execution.md T-00 forward pointer, carried into T-05).
//
// `@IsEnum(MappingSourceEnum)` alone accepts `source: 'DERIVED'` from any
// admin caller, months before a matcher exists — weakening the Source
// column as the provenance signal DD-2 assumes. This file proves the
// tightened DTO rejects it while leaving MANUAL/AI_SUGGESTED/AI_AUTO (and
// the sibling confidence_score requirement) untouched.

describe('CreateBilateralProjectMappingDto — source validation', () => {
  it('rejects a client-submitted source: DERIVED', async () => {
    const dto = plainToInstance(CreateBilateralProjectMappingDto, {
      agresso_agreement_id: 'D514',
      clarisa_project_id: 1516,
      source: MappingSourceEnum.DERIVED,
      confidence_score: 1,
    });

    const errors = await validate(dto);
    const sourceError = errors.find((e) => e.property === 'source');
    expect(sourceError).toBeDefined();
    expect(sourceError?.constraints).toHaveProperty('isNotIn');
  });

  it('accepts source: MANUAL (unaffected by the DERIVED gate)', async () => {
    const dto = plainToInstance(CreateBilateralProjectMappingDto, {
      agresso_agreement_id: 'D514',
      clarisa_project_id: 1516,
      source: MappingSourceEnum.MANUAL,
    });

    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'source')).toBeUndefined();
  });

  it('accepts source: AI_SUGGESTED with a confidence_score (still reserved, not blocked here)', async () => {
    const dto = plainToInstance(CreateBilateralProjectMappingDto, {
      agresso_agreement_id: 'D514',
      clarisa_project_id: 1516,
      source: MappingSourceEnum.AI_SUGGESTED,
      confidence_score: 0.9,
    });

    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'source')).toBeUndefined();
  });

  it('omitting source entirely is still valid (defaults to MANUAL server-side)', async () => {
    const dto = plainToInstance(CreateBilateralProjectMappingDto, {
      agresso_agreement_id: 'D514',
      clarisa_project_id: 1516,
    });

    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'source')).toBeUndefined();
  });
});

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateBilateralProjectMappingDto } from './update-bilateral-project-mapping.dto';
import { MappingSourceEnum } from '../enum/mapping-source.enum';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 Finding 2
// Same rejection as the create DTO's source field — see
// create-bilateral-project-mapping.dto.spec.ts for the full rationale.

describe('UpdateBilateralProjectMappingDto — source validation', () => {
  it('rejects a client-submitted source: DERIVED', async () => {
    const dto = plainToInstance(UpdateBilateralProjectMappingDto, {
      source: MappingSourceEnum.DERIVED,
    });

    const errors = await validate(dto);
    const sourceError = errors.find((e) => e.property === 'source');
    expect(sourceError).toBeDefined();
    expect(sourceError?.constraints).toHaveProperty('isNotIn');
  });

  it('accepts source: MANUAL', async () => {
    const dto = plainToInstance(UpdateBilateralProjectMappingDto, {
      source: MappingSourceEnum.MANUAL,
    });

    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'source')).toBeUndefined();
  });
});

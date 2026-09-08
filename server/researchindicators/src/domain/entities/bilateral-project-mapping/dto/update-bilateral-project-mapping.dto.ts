import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MappingSourceEnum } from '../enum/mapping-source.enum';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / R-BIL-080
//
// Note: `agresso_agreement_id` is intentionally NOT updatable. To re-point
// a contract to a different CLARISA project, the operator deactivates the
// existing mapping and creates a new one (preserves audit history).
export class UpdateBilateralProjectMappingDto {
  @ApiPropertyOptional({
    description: 'Re-point to a different CLARISA project',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  clarisa_project_id?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clarisa_project_short_name?: string;

  // @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 Finding 2
  // (execution.md T-00 forward pointer). Same rejection as the create DTO —
  // DERIVED is written exclusively by AutomapperService, never through the
  // admin-facing update endpoint.
  @ApiPropertyOptional({
    enum: MappingSourceEnum,
    description:
      'MANUAL, AI_SUGGESTED, or AI_AUTO. DERIVED is reserved for the CLARISA automapper and is rejected on this endpoint.',
  })
  @IsOptional()
  @IsEnum(MappingSourceEnum)
  @IsNotIn([MappingSourceEnum.DERIVED], {
    message:
      'source DERIVED is reserved for the automapper and cannot be submitted directly',
  })
  source?: MappingSourceEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confidence_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

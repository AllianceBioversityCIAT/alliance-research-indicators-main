import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MappingSourceEnum } from '../enum/mapping-source.enum';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / R-BIL-080
export class CreateBilateralProjectMappingDto {
  @ApiProperty({
    description: 'AGRESSO agreement_id (e.g. "D527")',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  agresso_agreement_id!: string;

  @ApiProperty({
    description: 'CLARISA project.id from /api/projects',
  })
  @IsInt()
  @Min(1)
  clarisa_project_id!: number;

  @ApiPropertyOptional({
    description:
      'CLARISA short_name snapshot at mapping time. If omitted, the server resolves from cached CLARISA projects.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clarisa_project_short_name?: string;

  // @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 Finding 2
  // (execution.md T-00 forward pointer). DERIVED is written exclusively by
  // AutomapperService, directly against the entity (never through this
  // DTO) — see automapper.service.ts's file header. Widening @IsEnum to
  // accept it here would let any admin caller hand-write a DERIVED row,
  // weakening the Source column as a provenance signal DD-2 relies on.
  @ApiPropertyOptional({
    enum: MappingSourceEnum,
    default: MappingSourceEnum.MANUAL,
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

  @ApiPropertyOptional({
    description: 'Required when source != MANUAL',
  })
  @ValidateIf(
    (o: CreateBilateralProjectMappingDto) =>
      o.source !== undefined && o.source !== MappingSourceEnum.MANUAL,
  )
  @IsNumber()
  confidence_score?: number;

  @ApiPropertyOptional({ description: 'Operator-facing free text' })
  @IsOptional()
  @IsString()
  notes?: string;
}

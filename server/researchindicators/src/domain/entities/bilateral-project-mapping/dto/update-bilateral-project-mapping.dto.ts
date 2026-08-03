import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
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

  @ApiPropertyOptional({ enum: MappingSourceEnum })
  @IsOptional()
  @IsEnum(MappingSourceEnum)
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

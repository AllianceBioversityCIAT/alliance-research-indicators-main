import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
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

  @ApiPropertyOptional({
    enum: MappingSourceEnum,
    default: MappingSourceEnum.MANUAL,
  })
  @IsOptional()
  @IsEnum(MappingSourceEnum)
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

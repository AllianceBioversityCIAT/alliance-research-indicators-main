import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MappingSourceEnum } from '../enum/mapping-source.enum';
import { BilateralProjectMapping } from '../entities/bilateral-project-mapping.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / R-BIL-080
// @sdd-spec docs/specs/changes/bilateral-mapping-table-enhancements — T-BTE-01 / R-BTE-002 / R-BTE-003
export class ListBilateralProjectMappingsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Substring match on agresso_agreement_id, clarisa_project_short_name, or agresso_contracts description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active state' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description:
      'Filter by mapping lifecycle status (all, mapped, pending, inactive)',
    enum: ['all', 'mapped', 'pending', 'inactive'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: MappingSourceEnum })
  @IsOptional()
  @IsEnum(MappingSourceEnum)
  source?: MappingSourceEnum;
}

export interface EnrichedBilateralProjectMapping extends BilateralProjectMapping {
  agresso_description?: string | null;
  clarisa_project_full_name?: string | null;
}

export interface PaginatedBilateralProjectMappings<
  T = EnrichedBilateralProjectMapping,
> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

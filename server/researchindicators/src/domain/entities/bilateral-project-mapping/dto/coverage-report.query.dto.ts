import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-05 / R-CPA-004 / R-CPA-006

export class CoverageReportQueryDto {
  @ApiPropertyOptional({
    description: 'CLARISA phase filter override (e.g. 2026)',
    type: Number,
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  phase?: number;

  @ApiPropertyOptional({
    name: 'limit-samples',
    description:
      'Maximum number of sample contract mappings returned per resolution tier (range: 1-50, default: 10)',
    default: 10,
    minimum: 1,
    maximum: 50,
    type: Number,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  'limit-samples'?: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

/**
 * B13 query (design 4, 5.5, R-ORG-008). `fromYear` is ignored for a physical
 * delete. `backdate` is normalized from the raw query string because
 * `@Type(() => Boolean)` would turn "false" into `true`.
 */
export class DeleteOrgUnitQueryDto {
  @ApiPropertyOptional({
    type: Number,
    description:
      'Logical delete only: year the entry ends from (default: current year; must be later than its first year)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  fromYear?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Logical delete only: confirms a back-date',
  })
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  })
  @IsOptional()
  @IsBoolean()
  backdate?: boolean;
}

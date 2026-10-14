import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/**
 * A13 query parameters (design.md §4, R-CLG-004, R-CLG-009; R-CTL-006).
 * `activeOnly` and the OPTIONAL `portfolioId` filter (values that apply to
 * all portfolios plus those linked to that one; omitted = every value).
 * `@Type(() => Boolean)` alone would turn the query STRING "false" into
 * `true` (`Boolean('false') === true`), so `activeOnly` is normalized from
 * the raw query value before `@IsBoolean()` ever runs; omitted defaults to
 * `true` (R-CTL-006 "Inputs: ... activeOnly (default true)").
 */
export class GetListValuesByKeyQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Omit inactive values when true (default true)',
    default: true,
  })
  // A class-field default (not just `?: boolean`), because class-transformer
  // only invokes `@Transform` for a key present in the source object — when
  // the query omits `activeOnly` entirely, there is nothing to transform,
  // and the default below is what survives onto the instance.
  @Transform(({ value }) => {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() !== 'false';
  })
  @IsOptional()
  @IsBoolean()
  activeOnly: boolean = true;
  // R-CLG-009: an unknown or inactive portfolio is a 404 from the service,
  // not a validation error — only a malformed id is rejected here.
  @ApiPropertyOptional({
    type: Number,
    description:
      'Return only the values that apply to this portfolio: those with no ' +
      '"Applies to" restriction plus those linked to it. Omit for every value. ' +
      'An unknown or inactive portfolio answers 404',
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  portfolioId?: number;
}

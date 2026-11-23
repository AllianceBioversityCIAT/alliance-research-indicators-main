import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

/**
 * B1 query parameters (design.md section 4, R-ORG-006). Deliberately NO
 * portfolio parameter (R-ORG-001): with `forbidNonWhitelisted`, a stale caller
 * sending `portfolioId` gets a 400.
 *
 * The year RANGE (2000 to current + 10) is checked by the read service, not
 * here, because "current" comes from the injected clock. `includeEnded` is
 * normalized from the raw query string because `@Type(() => Boolean)` would
 * turn "false" into `true`.
 */
export class GetYearViewQueryDto {
  @ApiPropertyOptional({
    type: Number,
    description:
      'Structure year to show. Defaults to the current year. Accepted: 2000 to current year + 10',
    example: 2026,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Also return entries inactivated or deleted from a year at or before the viewed one (default false)',
    default: false,
  })
  @Transform(({ value }) => {
    if (value === undefined) return false;
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  })
  @IsOptional()
  @IsBoolean()
  includeEnded: boolean = false;
}

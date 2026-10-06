import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * A13 query parameters (design.md §4, R-CTL-006). `@Type(() => Boolean)`
 * alone would turn the query STRING "false" into `true`
 * (`Boolean('false') === true`), so `activeOnly` is normalized from the raw
 * query value before `@IsBoolean()` ever runs; omitted defaults to `true`
 * (R-CTL-006 "Inputs: ... activeOnly (default true)").
 */
export class GetListValuesByKeyQueryDto {
  @ApiProperty({
    type: Number,
    description: 'Portfolio id to scope the read',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  portfolioId!: number;

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
}

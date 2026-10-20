import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional } from 'class-validator';

/**
 * C1 query (design 4, R-ORG-010). `ids` is a comma-separated list (or a repeated
 * parameter); the 1-200 count and the positive-integer rule are enforced by
 * `OrgStructureReadService.resolve`, so the in-process API and the endpoint
 * reject the same input. A non-numeric entry becomes NaN and is rejected there
 * with a 400 naming `ids`. Deliberately NO portfolio parameter (R-ORG-001).
 */
export class ResolveQueryDto {
  @ApiProperty({
    type: String,
    required: true,
    description:
      'Permanent entry ids, comma-separated, 1 to 200. Missing or more than 200 returns 400; an id that does not exist returns { id, missing: true } in its place (200)',
    example: '57,58',
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return [];
    const parts = Array.isArray(value) ? value : String(value).split(',');
    return parts
      .flatMap((part) => String(part).split(','))
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => Number(part));
  })
  @IsArray()
  ids: number[];

  @ApiPropertyOptional({
    type: Number,
    description:
      'Structure year to resolve for. Defaults to the current year. Accepted: 2000 to current year + 10',
    example: 2026,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  year?: number;
}

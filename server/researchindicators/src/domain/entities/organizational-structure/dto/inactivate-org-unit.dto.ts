import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, ValidateIf } from 'class-validator';

/**
 * B11 body (design 4, 5.4, R-ORG-007). No `id`, `status` or any other field
 * (400 through `forbidNonWhitelisted`). The year range and the back-date gate
 * are checked by the service because "current year" comes from the clock.
 */
export class InactivateOrgUnitDto {
  @ApiProperty({
    type: Number,
    description:
      'Year the entry ends from. Must be later than its first year; earlier than the current year needs backdate=true',
    example: 2027,
  })
  @IsInt()
  fromYear: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Entry that takes over: same level, active in fromYear. Omitted or null = no successor',
  })
  @ValidateIf(
    (_: unknown, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  successorId?: number | null;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Explicit confirmation of a back-date (fromYear before the current year)',
  })
  @IsOptional()
  @IsBoolean()
  backdate?: boolean;
}

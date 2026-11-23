import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

/** B12 body (design 4, 5.4, R-ORG-007 AC.2). */
export class ReactivateOrgUnitDto {
  @ApiProperty({
    type: Number,
    description:
      'Year the entry is active again from. Not before the year it ended; earlier than the current year needs backdate=true',
    example: 2028,
  })
  @IsInt()
  fromYear: number;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Explicit confirmation of a back-date (fromYear before the current year)',
  })
  @IsOptional()
  @IsBoolean()
  backdate?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

/** B7 query (design 4, R-ORG-009): the entry id is required; no other filter. */
export class ChangeLogQueryDto {
  @ApiProperty({
    type: Number,
    required: true,
    description:
      'Permanent entry id. Works for a physically deleted entry too: the log outlives it',
  })
  @Type(() => Number)
  @IsInt()
  unitId: number;
}

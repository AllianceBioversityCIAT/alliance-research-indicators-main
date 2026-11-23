import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

/** C2 query (design 4): the year the chain is read for. Range checked by the read service (clock). */
export class AncestorsQueryDto {
  @ApiPropertyOptional({
    type: Number,
    description:
      'Structure year. Defaults to the current year. Accepted: 2000 to current year + 10. 400 when the entry has no version covering it',
    example: 2026,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  year?: number;
}

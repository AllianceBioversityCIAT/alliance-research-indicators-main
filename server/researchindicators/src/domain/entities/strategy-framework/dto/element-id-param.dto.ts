import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** A7 path id. DELETE has no body; this is the only input. */
export class ElementIdParamDto {
  @ApiProperty({ type: Number, example: 22 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;
}

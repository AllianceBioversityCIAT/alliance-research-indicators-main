import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/** A11 body. Copies `fromYear` onto `fromYear + 1` (design 5.5). */
export class CarryForwardObjectivesDto {
  @ApiProperty({ type: Number, example: 2 })
  @IsInt()
  @Min(1)
  portfolioId!: number;

  @ApiProperty({ type: Number, example: 2026 })
  @IsInt()
  @Min(1)
  fromYear!: number;
}

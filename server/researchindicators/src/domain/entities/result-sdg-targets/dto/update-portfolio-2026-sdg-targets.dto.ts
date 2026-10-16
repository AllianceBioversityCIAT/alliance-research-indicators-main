import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class UpdatePortfolio2026SdgTargetsDto {
  @ApiProperty({
    type: [Number],
    description: 'Clarisa SDG target ids that belong to portfolio 2026',
  })
  @IsArray()
  @IsInt({ each: true })
  sdg_target_ids: number[];
}

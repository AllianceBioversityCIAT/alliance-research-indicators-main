import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PoolFundingTagDto {
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    description: 'Whether the bilateral contract contributes to pooled funding',
  })
  is_pool_funding_contributor!: boolean;
}

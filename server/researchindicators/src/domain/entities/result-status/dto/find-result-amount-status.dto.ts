import { ApiProperty } from '@nestjs/swagger';

export class FindResultAmountStatusDto {
  @ApiProperty({
    type: Number,
    description: 'Result status id',
  })
  public result_status_id: number;

  @ApiProperty({
    type: String,
    description: 'Name',
  })
  public name: string;

  @ApiProperty({
    type: String,
    description: 'Public description',
  })
  public description: string;

  @ApiProperty({
    type: Number,
    description: 'Amount of results',
  })
  public amount_results: number;
}

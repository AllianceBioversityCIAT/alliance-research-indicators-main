import { ApiProperty } from '@nestjs/swagger';

export class FindResultAmountDto {
  @ApiProperty({
    type: Number,
    description: 'Indicator id',
  })
  public indicator_id: number;

  @ApiProperty({
    type: String,
    description: 'Indicator name',
  })
  public name: string;

  @ApiProperty({
    type: Number,
    description: 'Indicator type id',
  })
  public indicator_type_id: number;

  @ApiProperty({
    type: String,
    description: 'Indicator description',
  })
  public description: string;

  @ApiProperty({
    type: String,
    description: 'Indicator long description',
  })
  public long_description: string;

  @ApiProperty({
    type: String,
    description: 'Indicator icon source',
  })
  public icon_src: string;

  @ApiProperty({
    type: String,
    description: 'Indicator other names',
  })
  public other_names: string;

  @ApiProperty({
    type: Number,
    description: 'Amount of results',
  })
  public amount_results: number;
}

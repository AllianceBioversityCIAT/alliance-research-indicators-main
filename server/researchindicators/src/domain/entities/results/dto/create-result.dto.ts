import { ApiProperty } from '@nestjs/swagger';

export class CreateResultDto {
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Is a reference to the indicator id',
  })
  public indicator_id?: number;

  @ApiProperty({
    type: String,
    required: false,
    description: 'It is the reference of the contract in agresso',
  })
  public contract_id?: string;

  @ApiProperty({
    type: Number,
    required: false,
    description: 'Is a reference to the contract role id',
  })
  public lever_id?: number;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Is a reference to the title',
  })
  public title?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Is a reference to the description',
  })
  public description?: string;
}

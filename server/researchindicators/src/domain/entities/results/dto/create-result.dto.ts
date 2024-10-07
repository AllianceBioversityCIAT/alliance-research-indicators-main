import { ApiProperty } from '@nestjs/swagger';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';

export class CreateResultDto {
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Is a reference to the indicator id',
  })
  public indicator_id?: number;

  @ApiProperty({
    type: ResultContract,
    required: false,
    description: 'It is the reference of the contract in agresso',
  })
  public contract!: Partial<ResultContract>;

  @ApiProperty({
    type: ResultLever,
    required: false,
    description: 'Is a reference to the contract role id',
  })
  public lever?: Partial<ResultLever>;

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

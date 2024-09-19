import { ApiProperty } from '@nestjs/swagger';
import { AgressoContract } from '../../agresso-contract/entities/agresso-contract.entity';
import { ClarisaLever } from '../../../tools/clarisa/entities/clarisa-levers/entities/clarisa-lever.entity';

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
  public contracts?: AgressoContract[];

  @ApiProperty({
    type: Number,
    required: false,
    description: 'Is a reference to the contract role id',
  })
  public levers?: ClarisaLever[];

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

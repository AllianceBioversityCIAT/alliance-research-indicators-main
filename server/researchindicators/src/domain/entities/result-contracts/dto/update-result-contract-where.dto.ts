import { ApiProperty } from '@nestjs/swagger';
import { ContractRolesEnum } from '../enum/lever-roles.enum';
import { FindOptionsWhere } from 'typeorm';
import { ResultContract } from '../entities/result-contract.entity';

export class UpdateResultContractWhereDto {
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Is a reference to the result id',
  })
  public result_id?: number;

  @ApiProperty({
    required: false,
    description: 'Is a reference to the result contract not in',
  })
  not_in?: FindOptionsWhere<ResultContract>;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Is a reference to the contract id',
  })
  public contract_id?: string;
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Is a reference to the contract role id',
  })
  public contract_role_id?: ContractRolesEnum;
}

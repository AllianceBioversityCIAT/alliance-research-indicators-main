import { ApiProperty } from '@nestjs/swagger';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';

export class ResultAlignmentDto {
  @ApiProperty({
    type: ResultContract,
    isArray: true,
    example: [
      {
        result_id: 1,
        contract_id: 1,
        contract_role_id: 1,
        is_active: true,
      },
    ],
  })
  public contracts: ResultContract[];

  @ApiProperty({
    type: ResultLever,
    isArray: true,
    example: [
      {
        result_id: 1,
        lever_id: 1,
        lever_role_id: 1,
        is_active: true,
      },
    ],
  })
  public levers: ResultLever[];
}

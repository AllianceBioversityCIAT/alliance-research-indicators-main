import { ApiProperty } from '@nestjs/swagger';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';
import { ResultSdg } from '../../result-sdgs/entities/result-sdg.entity';

export class ResultAlignmentDto {
  @ApiProperty({
    type: ResultContract,
    isArray: true,
  })
  public contracts: ResultContract[];

  @ApiProperty({
    type: ResultLever,
    isArray: true,
  })
  public levers: ResultLever[];

  @ApiProperty({
    type: ResultSdg,
    isArray: true,
    name: 'result_sdgs',
  })
  public result_sdgs?: ResultSdg[];
}

import { ApiProperty } from '@nestjs/swagger';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';
import { ResultSdg } from '../../result-sdgs/entities/result-sdg.entity';
import { ResultStrategicObjective } from '../../result-strategic-objectives/entities/result-strategic-objective.entity';
import { ResultImpactOutcome } from '../../result-impact-outcomes/entities/result-impact-outcome.entity';
import { ResultLeverSdgTarget } from '../../result-lever-sdg-targets/entities/result-lever-sdg-target.entity';

export class ResultAlignmentDto {
  @ApiProperty({
    type: ResultContract,
    isArray: true,
  })
  public contracts: ResultContract[];

  @ApiProperty({ type: [ResultLever] })
  primary_levers?: ResultLever[];

  @ApiProperty({ type: [ResultLever] })
  contributor_levers?: ResultLever[];

  @ApiProperty({
    type: ResultSdg,
    isArray: true,
    name: 'result_sdgs',
  })
  result_sdgs?: ResultSdg[];

  @ApiProperty({
    type: ResultLever,
    isArray: true,
  })
  research_areas?: ResultLever[];

  @ApiProperty({
    type: ResultStrategicObjective,
    isArray: true,
  })
  strategic_objectives?: ResultStrategicObjective[];

  @ApiProperty({
    type: ResultImpactOutcome,
    isArray: true,
  })
  impact_outcomes?: ResultImpactOutcome[];

  /** Portfolio 2026 OICR: result_lever_sdg_targets rows with a null lever foreign key. */
  @ApiProperty({
    type: ResultLeverSdgTarget,
    isArray: true,
    required: false,
  })
  result_sdg_targets?: ResultLeverSdgTarget[];
}

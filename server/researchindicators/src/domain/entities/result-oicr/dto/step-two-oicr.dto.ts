import { ApiProperty } from '@nestjs/swagger/dist/decorators';
import { ResultInitiative } from '../../result-initiatives/entities/result-initiative.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';

export class StepTwoOicrDto {
  @ApiProperty({ type: [ResultInitiative] })
  initiatives: ResultInitiative[];
  @ApiProperty({ type: [ResultLever] })
  primary_lever: ResultLever[];
  @ApiProperty({ type: [ResultLever] })
  contributor_lever: ResultLever[];
}

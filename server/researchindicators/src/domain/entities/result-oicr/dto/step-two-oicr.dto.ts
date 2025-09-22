import { ApiProperty } from '@nestjs/swagger/dist/decorators';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';

export class StepTwoOicrDto {
  @ApiProperty({ type: [ResultLever] })
  primary_lever: ResultLever[];
  @ApiProperty({ type: [ResultLever] })
  contributor_lever: ResultLever[];
}

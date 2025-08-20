import { ResultInitiative } from '../../result-initiatives/entities/result-initiative.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';

export class StepTwoOicrDto {
  initiatives: ResultInitiative[];
  primary_lever: ResultLever[];
  contributor_lever: ResultLever[];
}

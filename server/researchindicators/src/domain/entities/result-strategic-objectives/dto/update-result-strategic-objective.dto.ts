import { PartialType } from '@nestjs/swagger';
import { CreateResultStrategicObjectiveDto } from './create-result-strategic-objective.dto';

export class UpdateResultStrategicObjectiveDto extends PartialType(
  CreateResultStrategicObjectiveDto,
) {}

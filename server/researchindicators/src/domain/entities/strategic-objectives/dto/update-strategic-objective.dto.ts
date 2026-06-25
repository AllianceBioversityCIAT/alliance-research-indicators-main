import { PartialType } from '@nestjs/swagger';
import { CreateStrategicObjectiveDto } from './create-strategic-objective.dto';

export class UpdateStrategicObjectiveDto extends PartialType(
  CreateStrategicObjectiveDto,
) {}

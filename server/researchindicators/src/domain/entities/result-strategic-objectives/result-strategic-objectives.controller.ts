import { Controller } from '@nestjs/common';
import { ResultStrategicObjectivesService } from './result-strategic-objectives.service';

@Controller('result-strategic-objectives')
export class ResultStrategicObjectivesController {
  constructor(
    private readonly resultStrategicObjectivesService: ResultStrategicObjectivesService,
  ) { }
}

import { Controller } from '@nestjs/common';
import { ResultLeverStrategicOutcomeService } from './result-lever-strategic-outcome.service';

@Controller('result-lever-strategic-outcome')
export class ResultLeverStrategicOutcomeController {
  constructor(
    private readonly resultLeverStrategicOutcomeService: ResultLeverStrategicOutcomeService,
  ) {}
}

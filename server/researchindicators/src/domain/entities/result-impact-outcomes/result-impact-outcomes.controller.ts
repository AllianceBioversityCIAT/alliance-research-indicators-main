import { Controller } from '@nestjs/common';
import { ResultImpactOutcomesService } from './result-impact-outcomes.service';

@Controller('result-impact-outcomes')
export class ResultImpactOutcomesController {
  constructor(private readonly resultImpactOutcomesService: ResultImpactOutcomesService) { }
}

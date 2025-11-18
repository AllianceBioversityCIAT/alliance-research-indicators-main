import { Controller } from '@nestjs/common';
import { ResultImpactAreaGlobalTargetsService } from './result-impact-area-global-targets.service';

@Controller('result-impact-area-global-targets')
export class ResultImpactAreaGlobalTargetsController {
  constructor(
    private readonly resultImpactAreaGlobalTargetsService: ResultImpactAreaGlobalTargetsService,
  ) {}
}

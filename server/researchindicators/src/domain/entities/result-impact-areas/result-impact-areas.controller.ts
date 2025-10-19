import { Controller } from '@nestjs/common';
import { ResultImpactAreasService } from './result-impact-areas.service';

@Controller('result-impact-areas')
export class ResultImpactAreasController {
  constructor(
    private readonly resultImpactAreasService: ResultImpactAreasService,
  ) {}
}

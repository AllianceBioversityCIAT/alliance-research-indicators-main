import { Controller } from '@nestjs/common';
import { ResultRegionsService } from './result-regions.service';
@Controller('result-regions')
export class ResultRegionsController {
  constructor(private readonly resultRegionsService: ResultRegionsService) {}
}

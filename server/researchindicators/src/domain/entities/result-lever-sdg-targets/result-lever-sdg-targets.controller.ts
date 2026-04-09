import { Controller } from '@nestjs/common';
import { ResultLeverSdgTargetsService } from './result-lever-sdg-targets.service';

@Controller('result-lever-sdg-targets')
export class ResultLeverSdgTargetsController {
  constructor(
    private readonly resultLeverSdgTargetsService: ResultLeverSdgTargetsService,
  ) {}
}

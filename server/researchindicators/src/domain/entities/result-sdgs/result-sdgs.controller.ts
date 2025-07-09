import { Controller } from '@nestjs/common';
import { ResultSdgsService } from './result-sdgs.service';

@Controller('result-sdgs')
export class ResultSdgsController {
  constructor(private readonly resultSdgsService: ResultSdgsService) {}
}

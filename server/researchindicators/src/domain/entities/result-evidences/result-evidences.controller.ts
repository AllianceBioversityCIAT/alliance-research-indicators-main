import { Controller } from '@nestjs/common';
import { ResultEvidencesService } from './result-evidences.service';
@Controller('result-evidences')
export class ResultEvidencesController {
  constructor(
    private readonly resultEvidencesService: ResultEvidencesService,
  ) {}
}

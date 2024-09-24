import { Controller } from '@nestjs/common';
import { ResultInstitutionsService } from './result-institutions.service';

@Controller('result-institutions')
export class ResultInstitutionsController {
  constructor(
    private readonly resultInstitutionsService: ResultInstitutionsService,
  ) {}
}

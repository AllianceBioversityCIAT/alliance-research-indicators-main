import { Controller } from '@nestjs/common';
import { ResultInstitutionTypesService } from './result-institution-types.service';

@Controller()
export class ResultInstitutionTypesController {
  constructor(
    private readonly resultInstitutionTypesService: ResultInstitutionTypesService,
  ) {}
}

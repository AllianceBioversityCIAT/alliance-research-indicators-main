import { Controller } from '@nestjs/common';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';
@Controller('clarisa-institution-types')
export class ClarisaInstitutionTypesController {
  constructor(
    private readonly clarisaInstitutionTypesService: ClarisaInstitutionTypesService,
  ) {}
}

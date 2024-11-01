import { Controller } from '@nestjs/common';
import { ClarisaInstitutionLocationsService } from './clarisa-institution-locations.service';

@Controller('clarisa-institution-locations')
export class ClarisaInstitutionLocationsController {
  constructor(
    private readonly clarisaInstitutionLocationsService: ClarisaInstitutionLocationsService,
  ) {}
}

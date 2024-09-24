import { Controller } from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
@Controller('clarisa-institutions')
export class ClarisaInstitutionsController {
  constructor(
    private readonly clarisaInstitutionsService: ClarisaInstitutionsService,
  ) {}
}

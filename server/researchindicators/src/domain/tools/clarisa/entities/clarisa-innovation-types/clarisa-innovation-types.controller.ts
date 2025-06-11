import { Controller } from '@nestjs/common';
import { ClarisaInnovationTypesService } from './clarisa-innovation-types.service';

@Controller('clarisa-innovation-types')
export class ClarisaInnovationTypesController {
  constructor(
    private readonly clarisaInnovationTypesService: ClarisaInnovationTypesService,
  ) {}
}

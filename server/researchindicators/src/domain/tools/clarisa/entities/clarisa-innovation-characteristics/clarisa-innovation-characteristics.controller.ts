import { Controller } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
@Controller('clarisa-innovation-characteristics')
export class ClarisaInnovationCharacteristicsController {
  constructor(
    private readonly clarisaInnovationCharacteristicsService: ClarisaInnovationCharacteristicsService,
  ) {}
}

import { Controller } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../../shared/global-dto/base-controller';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInnovationCharacteristicsController extends BaseController<ClarisaInnovationCharacteristicsService> {
  constructor(service: ClarisaInnovationCharacteristicsService) {
    super(service, 'Innovation characteristics');
  }
}

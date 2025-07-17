import { Controller } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../../shared/global-dto/base-controller';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInnovationReadinessLevelsController extends BaseController<ClarisaInnovationReadinessLevelsService> {
  constructor(service: ClarisaInnovationReadinessLevelsService) {
    super(service, 'Innovation readiness levels');
  }
}

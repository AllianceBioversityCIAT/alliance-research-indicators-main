import { Controller } from '@nestjs/common';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../../shared/global-dto/base-controller';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInnovationUseLevelsController extends BaseController<ClarisaInnovationUseLevelsService> {
  constructor(service: ClarisaInnovationUseLevelsService) {
    super(service, 'Innovation use levels');
  }
}

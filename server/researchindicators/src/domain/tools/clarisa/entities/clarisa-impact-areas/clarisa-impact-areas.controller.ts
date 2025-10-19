import { Controller } from '@nestjs/common';
import { ClarisaImpactAreasService } from './clarisa-impact-areas.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../../shared/global-dto/base-controller';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaImpactAreasController extends BaseController<ClarisaImpactAreasService> {
  constructor(service: ClarisaImpactAreasService) {
    super(service, 'Impact Area');
  }
}

import { Controller } from '@nestjs/common';
import { ClarisaInnovationTypesService } from './clarisa-innovation-types.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../../shared/global-dto/base-controller';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInnovationTypesController extends BaseController<ClarisaInnovationTypesService> {
  constructor(service: ClarisaInnovationTypesService) {
    super(service, 'Innovation types');
  }
}

import { Controller } from '@nestjs/common';
import { ClarisaActorTypesService } from './clarisa-actor-types.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../../../shared/global-dto/base-controller';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaActorTypesController extends BaseController<ClarisaActorTypesService> {
  constructor(service: ClarisaActorTypesService) {
    super(service, 'Actor types');
  }
}

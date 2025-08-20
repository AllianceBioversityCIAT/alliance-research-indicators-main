import { Controller } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { BaseController } from '../../../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInitiativesController extends BaseController<ClarisaInitiativesService> {
  constructor(service: ClarisaInitiativesService) {
    super(service, 'Initiative');
  }
}

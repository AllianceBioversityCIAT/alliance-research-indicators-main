import { Controller } from '@nestjs/common';
import { ClarisaGlobalTargetsService } from './clarisa-global-targets.service';
import { BaseController } from '../../../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaGlobalTargetsController extends BaseController<ClarisaGlobalTargetsService> {
  constructor(service: ClarisaGlobalTargetsService) {
    super(service, 'Clarisa Global Target');
  }
}

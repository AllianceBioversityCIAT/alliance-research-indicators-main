import { Controller } from '@nestjs/common';
import { MaturityLevelService } from './maturity-level.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Maturity Levels')
@ApiBearerAuth()
export class MaturityLevelController extends BaseController<MaturityLevelService> {
  constructor(service: MaturityLevelService) {
    super(service, 'Maturity levels');
  }
}

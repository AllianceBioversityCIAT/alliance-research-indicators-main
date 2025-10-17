import { Controller } from '@nestjs/common';
import { InformativeRolesService } from './informative-roles.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Informative Roles')
@Controller()
@ApiBearerAuth()
export class InformativeRolesController extends BaseController<InformativeRolesService> {
  constructor(service: InformativeRolesService) {
    super(service, 'Informative Role');
  }
}

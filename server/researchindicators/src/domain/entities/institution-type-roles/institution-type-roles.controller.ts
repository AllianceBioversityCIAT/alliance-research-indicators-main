import { Controller } from '@nestjs/common';
import { InstitutionTypeRolesService } from './institution-type-roles.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../shared/global-dto/base-controller';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class InstitutionTypeRolesController extends BaseController<InstitutionTypeRolesService> {
  constructor(service: InstitutionTypeRolesService) {
    super(service, 'Institution type roles');
  }
}

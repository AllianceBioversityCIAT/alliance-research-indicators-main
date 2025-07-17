import { Controller } from '@nestjs/common';
import { ActorRolesService } from './actor-roles.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../shared/global-dto/base-controller';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class ActorRolesController extends BaseController<ActorRolesService> {
  constructor(service: ActorRolesService) {
    super(service, 'Actor roles');
  }
}

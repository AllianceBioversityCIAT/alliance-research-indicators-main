import { Controller } from '@nestjs/common';
import { InnovationDevAnticipatedUsersService } from './innovation-dev-anticipated-users.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../shared/global-dto/base-controller';

@ApiTags('Results Innovation Development')
@Controller()
@ApiBearerAuth()
export class InnovationDevAnticipatedUsersController extends BaseController<InnovationDevAnticipatedUsersService> {
  constructor(service: InnovationDevAnticipatedUsersService) {
    super(service, 'Innovation development anticipated users');
  }
}

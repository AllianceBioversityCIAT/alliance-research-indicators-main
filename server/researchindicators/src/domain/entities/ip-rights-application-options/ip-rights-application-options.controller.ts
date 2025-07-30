import { Controller } from '@nestjs/common';
import { IpRightsApplicationOptionsService } from './ip-rights-application-options.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Ip Rights Application Options')
@Controller()
@ApiBearerAuth()
export class IpRightsApplicationOptionsController extends BaseController<IpRightsApplicationOptionsService> {
  constructor(service: IpRightsApplicationOptionsService) {
    super(service, 'IP Rights Application Options');
  }
}

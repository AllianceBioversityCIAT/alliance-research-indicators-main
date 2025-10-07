import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AllianceUserStaffGroupsService } from './alliance-user-staff-groups.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ResponseUtils } from '../../shared/utils/response.utils';

@Controller()
export class AllianceUserStaffGroupsController extends BaseController<AllianceUserStaffGroupsService> {
  constructor(service: AllianceUserStaffGroupsService) {
    super(service, 'AllianceUserStaffGroup');
  }

  @Get('map')
  async findAllMap() {
    return this.service.findAllMap().then((res) =>
      ResponseUtils.format({
        data: res,
        description: 'Alliance User Staff Groups mapped by Alliance User Staff',
        status: HttpStatus.OK,
      }),
    );
  }
}

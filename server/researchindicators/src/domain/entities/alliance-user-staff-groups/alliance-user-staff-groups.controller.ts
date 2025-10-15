import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { AllianceUserStaffGroupsService } from './alliance-user-staff-groups.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { isEmpty } from '../../shared/utils/object.utils';
import { StaffGroupsEnum } from '../staff-groups/enum/staff-groups.enum';

@ApiTags('Alliance User Staff')
@ApiBearerAuth()
@Controller()
export class AllianceUserStaffGroupsController extends BaseController<AllianceUserStaffGroupsService> {
  constructor(service: AllianceUserStaffGroupsService) {
    super(service, 'AllianceUserStaffGroup');
  }

  @ApiQuery({
    name: 'groupId',
    required: false,
    type: Number,
    enum: StaffGroupsEnum,
    description: 'Filter by Staff Group ID',
  })
  @Get('map')
  async findAllMap(@Query('groupId') groupId?: number) {
    const groupIdParam = isEmpty(groupId) ? undefined : +groupId;
    return this.service.findAllMap(groupIdParam).then((res) =>
      ResponseUtils.format({
        data: res,
        description: 'Alliance User Staff Groups mapped by Alliance User Staff',
        status: HttpStatus.OK,
      }),
    );
  }
}

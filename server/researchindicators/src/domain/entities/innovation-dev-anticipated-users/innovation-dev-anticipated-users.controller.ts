import { Controller, Get, Param, HttpStatus } from '@nestjs/common';
import { InnovationDevAnticipatedUsersService } from './innovation-dev-anticipated-users.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Results Innovation Development')
@Controller()
@ApiBearerAuth()
export class InnovationDevAnticipatedUsersController {
  constructor(private readonly service: InnovationDevAnticipatedUsersService) {}

  @Get()
  async find() {
    return this.service.findAll().then((levers) =>
      ResponseUtils.format({
        description: 'Innovation anticipated users found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findOne<number>(+id).then((levers) =>
      ResponseUtils.format({
        description: 'Innovation anticipated user found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }
}

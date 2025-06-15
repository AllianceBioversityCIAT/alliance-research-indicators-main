import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ActorRolesService } from './actor-roles.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class ActorRolesController {
  constructor(private readonly service: ActorRolesService) {}

  @Get()
  async find() {
    return this.service.findAll().then((levers) =>
      ResponseUtils.format({
        description: 'Actor roles found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findOne<number>(+id).then((levers) =>
      ResponseUtils.format({
        description: 'Actor role found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }
}

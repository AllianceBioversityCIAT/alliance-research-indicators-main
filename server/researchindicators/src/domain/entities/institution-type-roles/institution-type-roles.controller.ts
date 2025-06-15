import { Controller, Get, Param, HttpStatus } from '@nestjs/common';
import { InstitutionTypeRolesService } from './institution-type-roles.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class InstitutionTypeRolesController {
  constructor(private readonly service: InstitutionTypeRolesService) {}

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

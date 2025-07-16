import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaInnovationTypesService } from './clarisa-innovation-types.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInnovationTypesController {
  constructor(private readonly service: ClarisaInnovationTypesService) {}

  @Get()
  async find() {
    return this.service.findAll().then((levers) =>
      ResponseUtils.format({
        description: 'Innovation characteristics found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findOne<number>(+id).then((levers) =>
      ResponseUtils.format({
        description: 'Innovation characteristic found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }
}

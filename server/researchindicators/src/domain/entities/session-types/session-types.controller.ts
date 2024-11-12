import { Controller, Get, Param } from '@nestjs/common';
import { SessionTypesService } from './session-types.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller()
export class SessionTypesController {
  constructor(private readonly sessionTypesService: SessionTypesService) {}

  @ApiOperation({ summary: 'Get all session types' })
  @Get()
  async findAll() {
    return this.sessionTypesService.findAll().then((sessionTypes) =>
      ResponseUtils.format({
        description: 'Session types found',
        status: 200,
        data: sessionTypes,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a session type by id' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the session type id',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sessionTypesService.findOne(+id).then((sessionType) =>
      ResponseUtils.format({
        description: 'Session type found',
        status: 200,
        data: sessionType,
      }),
    );
  }
}

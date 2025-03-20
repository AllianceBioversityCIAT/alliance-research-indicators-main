import { Controller, Get, Param } from '@nestjs/common';
import { SessionFormatsService } from './session-formats.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller()
export class SessionFormatsController {
  constructor(private readonly sessionFormatsService: SessionFormatsService) {}

  @ApiOperation({ summary: 'Get all session formats' })
  @Get()
  findAll() {
    return this.sessionFormatsService.findAll().then((data) =>
      ResponseUtils.format({
        description: 'Session formats found',
        status: 200,
        data,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a session format by id' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the session format id',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionFormatsService.findOne(+id).then((data) =>
      ResponseUtils.format({
        description: 'Session format found',
        status: 200,
        data,
      }),
    );
  }
}

import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { SessionLengthsService } from './session-lengths.service';
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
export class SessionLengthsController {
  constructor(private readonly sessionLengthsService: SessionLengthsService) {}

  @ApiOperation({ summary: 'Get all session lengths' })
  @Get()
  async findAll() {
    return this.sessionLengthsService.findAll().then((sessionLengths) =>
      ResponseUtils.format({
        description: 'Session lengths found',
        status: HttpStatus.OK,
        data: sessionLengths,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a session length by id' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the session length id',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sessionLengthsService.findOne(+id).then((sessionLength) =>
      ResponseUtils.format({
        description: 'Session length found',
        status: HttpStatus.OK,
        data: sessionLength,
      }),
    );
  }
}

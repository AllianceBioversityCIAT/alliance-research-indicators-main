import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { SessionPurposesService } from './session-purposes.service';
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
export class SessionPurposesController {
  constructor(
    private readonly sessionPurposesService: SessionPurposesService,
  ) {}

  @ApiOperation({ summary: 'Get all session purposes' })
  @Get()
  async findAll() {
    return await this.sessionPurposesService.findAll().then((sessionPurposes) =>
      ResponseUtils.format({
        description: 'Session purposes found',
        status: HttpStatus.OK,
        data: sessionPurposes,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a session purpose by id' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the session purpose id',
  })
  @Get(':id')
  async findOne(@Param() id: string) {
    return await this.sessionPurposesService
      .findOne(+id)
      .then((sessionPurpose) =>
        ResponseUtils.format({
          description: 'Session purpose found',
          status: HttpStatus.OK,
          data: sessionPurpose,
        }),
      );
  }
}

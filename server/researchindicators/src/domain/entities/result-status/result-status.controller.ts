import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ResultStatusService } from './result-status.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class ResultStatusController {
  constructor(private readonly resultStatusService: ResultStatusService) {}

  @ApiOperation({ summary: 'Find all result status' })
  @Get()
  async find() {
    return this.resultStatusService.findAll().then((result) =>
      ResponseUtils.format({
        description: 'Result status found',
        status: HttpStatus.OK,
        data: result,
      }),
    );
  }

  @ApiOperation({ summary: 'Find result status by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.resultStatusService.findOne(+id).then((result) =>
      ResponseUtils.format({
        description: 'Result status found',
        status: HttpStatus.OK,
        data: result,
      }),
    );
  }
}

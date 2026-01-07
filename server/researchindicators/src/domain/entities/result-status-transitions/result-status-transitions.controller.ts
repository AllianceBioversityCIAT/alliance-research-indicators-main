import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ResultStatusTransitionsService } from './result-status-transitions.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class ResultStatusTransitionsController {
  constructor(
    private readonly resultStatusTransitionsService: ResultStatusTransitionsService,
  ) {}

  @Get('next-statuses/:fromStatusId')
  @ApiOperation({
    deprecated: true,
  })
  async findNextStatuses(@Param('fromStatusId') fromStatusId: number) {
    return this.resultStatusTransitionsService
      .findNextStatuses(fromStatusId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Next statuses retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }
}

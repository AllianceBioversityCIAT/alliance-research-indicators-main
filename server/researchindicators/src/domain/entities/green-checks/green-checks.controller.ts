import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { GreenChecksService } from './green-checks.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class GreenChecksController {
  constructor(private readonly greenChecksService: GreenChecksService) {}

  @Get(':resultId(\\d+)')
  async findGreenChecksByResultId(@Param('resultId') resultId: string) {
    return this.greenChecksService.findByResultId(+resultId).then((result) =>
      ResponseUtils.format({
        data: result,
        description: 'Green checks found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Patch('change/status')
  @ApiQuery({
    name: 'resultId',
    description: 'Result id',
    type: 'number',
    required: true,
  })
  @ApiQuery({
    name: 'status',
    description: 'Status',
    type: 'string',
    required: true,
  })
  @ApiQuery({
    name: 'comment',
    description: 'Comment',
    type: 'string',
    required: false,
  })
  async submitResult(
    @Query('resultId') resultId: string,
    @Query('comment') comment: string,
    @Query('status') statusId: string,
  ) {
    return this.greenChecksService
      .changeStatus(+resultId, +statusId, comment)
      .then(() =>
        ResponseUtils.format({
          description: 'Status changed to ' + ResultStatusEnum[+statusId],
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('history/:resultId(\\d+)')
  async findSubmissionHistoryByResultId(@Param('resultId') resultId: string) {
    return this.greenChecksService
      .getSubmissionHistory(+resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Submission history found',
          status: HttpStatus.OK,
        }),
      );
  }
}

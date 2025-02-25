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
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

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

  @Patch('submit/:resultId(\\d+)')
  @ApiParam({
    name: 'resultId',
    description: 'Result id',
    type: 'number',
    required: true,
  })
  @ApiQuery({
    name: 'comment',
    description: 'Comment',
    type: 'string',
    required: false,
  })
  async submitResult(
    @Param('resultId') resultId: string,
    @Query('comment') comment: string,
  ) {
    return this.greenChecksService
      .submmitedAndUnsubmmitedProcess(+resultId, comment)
      .then(() =>
        ResponseUtils.format({
          description: 'Result submitted',
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

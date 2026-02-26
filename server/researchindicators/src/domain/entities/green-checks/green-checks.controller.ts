import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { GreenChecksService } from './green-checks.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import {
  GetResultVersion,
  ParamOrQueryEnum,
} from '../../shared/decorators/versioning.decorator';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ReviewDto } from '../result-oicr/dto/review.dto';
import { OptionalBody } from './dto/optional-body.dto';

@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class GreenChecksController {
  constructor(
    private readonly greenChecksService: GreenChecksService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @Get(RESULT_CODE)
  @GetResultVersion()
  async findGreenChecksByResultId() {
    return this.greenChecksService
      .findByResultId(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Green checks found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch('change/status')
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
  @ApiBody({ type: ReviewDto })
  @GetResultVersion(ParamOrQueryEnum.QUERY)
  async submitResult(
    @Query('comment') comment: string,
    @Query('status') statusId: string,
    @Body() body: OptionalBody,
  ) {
    return this.greenChecksService
      .statusManagement(this._resultsUtil.resultId, +statusId, comment, body)
      .then(() =>
        ResponseUtils.format({
          description: 'Status changed to ' + ResultStatusEnum[+statusId],
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(`history/${RESULT_CODE}`)
  @GetResultVersion()
  async findSubmissionHistoryByResultId() {
    return this.greenChecksService
      .getSubmissionHistory(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Submission history found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch(`new-reporting-cycle/${RESULT_CODE}/year/:newReportYear([0-9]{4})`)
  @ApiParam({
    name: 'newReportYear',
    type: Number,
    required: true,
    description: 'The year for the new reporting cycle',
  })
  @GetResultVersion(ParamOrQueryEnum.PARAM)
  async newReportingCycle(@Param('newReportYear') reportYear: string) {
    return this.greenChecksService
      .newReportingCycle(this._resultsUtil.resultCode, +reportYear)
      .then(() =>
        ResponseUtils.format({
          description: 'New reporting cycle created',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch(
    `change/status/date/${RESULT_CODE}/submission-history/:submissionHistoryId([0-9]+)`,
  )
  @ApiParam({
    name: 'submissionHistoryId',
    type: Number,
    required: true,
    description: 'The ID of the submission history',
  })
  @ApiQuery({
    name: 'newDate',
    type: Date,
    required: true,
    description: 'The new date',
  })
  @GetResultVersion(ParamOrQueryEnum.PARAM)
  async changeStatusDate(
    @Param('submissionHistoryId') submissionHistoryId: string,
    @Query('newDate') newDate: string,
  ) {
    return this.greenChecksService
      .updateChageStatusDate(
        this._resultsUtil.resultId,
        +submissionHistoryId,
        new Date(newDate),
      )
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Status date changed',
          status: HttpStatus.OK,
        }),
      );
  }
}

import {
  Controller,
  Get,
  HttpStatus,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { GreenChecksService } from './green-checks.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import {
  GetResultVersion,
  ParamOrQueryEnum,
} from '../../shared/decorators/versioning.decorator';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';

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
  @GetResultVersion(ParamOrQueryEnum.QUERY)
  async submitResult(
    @Query('comment') comment: string,
    @Query('status') statusId: string,
  ) {
    return this.greenChecksService
      .changeStatus(this._resultsUtil.resultId, +statusId, comment)
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
}

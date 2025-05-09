import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { CreateResultPolicyChangeDto } from './dto/create-result-policy-change.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';

@ApiTags('Policy Change')
@UseInterceptors(SetUpInterceptor)
@ApiBearerAuth()
@Controller()
export class ResultPolicyChangeController {
  constructor(
    private readonly resultPolicyChangeService: ResultPolicyChangeService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @UseGuards(ResultStatusGuard)
  @GetResultVersion()
  @Patch(`by-result-id/${RESULT_CODE}`)
  async updateByResultId(
    @Body() CreatePolicyChange: CreateResultPolicyChangeDto,
  ) {
    return this.resultPolicyChangeService
      .update(this._resultsUtil.resultId, CreatePolicyChange)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result policy change updated',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @GetResultVersion()
  @Get(`by-result-id/${RESULT_CODE}`)
  async getByResultId() {
    return this.resultPolicyChangeService
      .findPolicyChange(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result policy change found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }
}

import {
  Controller,
  Get,
  Body,
  Patch,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import { ResultInnovationDevService } from './result-innovation-dev.service';
import { CreateResultInnovationDevDto } from './dto/create-result-innovation-dev.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';

@ApiTags('Results Innovation Development')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ResultInnovationDevController {
  constructor(
    private readonly resultInnovationDevService: ResultInnovationDevService,
    private readonly _currentResult: ResultsUtil,
  ) {}

  @Patch(`${RESULT_CODE}`)
  @GetResultVersion()
  create(@Body() createResultInnovationDevDto: CreateResultInnovationDevDto) {
    return this.resultInnovationDevService
      .update(this._currentResult.resultId, createResultInnovationDevDto)
      .then((res) =>
        ResponseUtils.format({
          description: 'Result Innovation Development created successfully',
          data: res,
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(`${RESULT_CODE}`)
  @GetResultVersion()
  findOne() {
    return this.resultInnovationDevService
      .findOne(this._currentResult.resultId)
      .then((res) =>
        ResponseUtils.format({
          description: 'Result Innovation Development retrieved successfully',
          data: res,
          status: HttpStatus.OK,
        }),
      );
  }
}

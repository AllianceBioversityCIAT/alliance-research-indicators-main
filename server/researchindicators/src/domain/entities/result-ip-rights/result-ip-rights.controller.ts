import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ResultIpRightsService } from './result-ip-rights.service';
import { UpdateIpRightDto } from './dto/update-ip-right.dto';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';

@ApiTags('Intellectual Property Rights')
@UseInterceptors(SetUpInterceptor)
@Controller()
@ApiBearerAuth()
@Controller('ip-rights')
export class ResultIpRightsController {
  constructor(
    private readonly _resultIpRightsService: ResultIpRightsService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @Get(RESULT_CODE)
  @GetResultVersion()
  findByResultId() {
    return this._resultIpRightsService
      .findByResultId(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result intellectual property rights found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @Patch(RESULT_CODE)
  @GetResultVersion()
  update(@Body() updateData: UpdateIpRightDto) {
    return this._resultIpRightsService
      .update(this._resultsUtil.resultId, updateData)
      .then(() =>
        ResponseUtils.format({
          description: 'Result intellectual property rights updated',
          status: HttpStatus.OK,
        }),
      );
  }
}

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { ResultIpRightsService } from '../result-ip-rights/result-ip-rights.service';
import { UpdateIpRightDto } from '../result-ip-rights/dto/update-ip-right.dto';

@ApiTags('Result Capacity Sharing')
@UseInterceptors(SetUpInterceptor)
@Controller()
@ApiBearerAuth()
export class ResultCapSharingIpController {
  constructor(
    private readonly _resultIpRightsService: ResultIpRightsService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @Get(RESULT_CODE)
  @GetResultVersion()
  @ApiOperation({
    deprecated: true,
  })
  findByResultId() {
    return this._resultIpRightsService
      .findByResultId(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result capacity sharing ip found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @Patch(RESULT_CODE)
  @GetResultVersion()
  @ApiOperation({
    deprecated: true,
  })
  update(@Body() updateData: UpdateIpRightDto) {
    return this._resultIpRightsService
      .update(this._resultsUtil.resultId, updateData)
      .then(() =>
        ResponseUtils.format({
          description: 'Result capacity sharing ip updated',
          status: HttpStatus.OK,
        }),
      );
  }
}

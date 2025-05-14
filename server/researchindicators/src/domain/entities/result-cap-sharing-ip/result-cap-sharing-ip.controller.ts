import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ResultCapSharingIpService } from './result-cap-sharing-ip.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdateResultCapSharingIpDto } from './dto/update-result-cap-sharing-ip.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';

@ApiTags('Result Capacity Sharing')
@UseInterceptors(SetUpInterceptor)
@Controller()
@ApiBearerAuth()
export class ResultCapSharingIpController {
  constructor(
    private readonly resultCapSharingIpService: ResultCapSharingIpService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @Get(RESULT_CODE)
  @GetResultVersion()
  findByResultId() {
    return this.resultCapSharingIpService
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
  update(@Body() updateData: UpdateResultCapSharingIpDto) {
    return this.resultCapSharingIpService
      .update(this._resultsUtil.resultId, updateData)
      .then(() =>
        ResponseUtils.format({
          description: 'Result capacity sharing ip updated',
          status: HttpStatus.OK,
        }),
      );
  }
}

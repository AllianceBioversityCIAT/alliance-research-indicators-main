import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateResultCapacitySharingDto } from './dto/update-result-capacity-sharing.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';

@ApiTags('Result Capacity Sharing')
@UseInterceptors(SetUpInterceptor)
@Controller()
@ApiBearerAuth()
export class ResultCapacitySharingController {
  constructor(
    private readonly resultCapacitySharingService: ResultCapacitySharingService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @UseGuards(ResultStatusGuard)
  @GetResultVersion()
  @Patch(`by-result-id/${RESULT_CODE}`)
  async updateResultCapacitySharing(
    @Body() capacitySharing: UpdateResultCapacitySharingDto,
  ) {
    return this.resultCapacitySharingService
      .update(this._resultsUtil.resultId, capacitySharing)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result capacity sharing updated',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @GetResultVersion()
  @Get(`by-result-id/${RESULT_CODE}`)
  async getCapacitySharing() {
    return this.resultCapacitySharingService
      .findByResultId(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result capacity sharing found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }
}

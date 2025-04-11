import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateResultCapacitySharingDto } from './dto/update-result-capacity-sharing.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

@ApiTags('Result Capacity Sharing')
@Controller()
@ApiBearerAuth()
export class ResultCapacitySharingController {
  constructor(
    private readonly resultCapacitySharingService: ResultCapacitySharingService,
  ) {}

  @UseGuards(ResultStatusGuard)
  @Patch('by-result-id/:resultId(\\d+)')
  async updateResultCapacitySharing(
    @Param('resultId') resultId: string,
    @Body() capacitySharing: UpdateResultCapacitySharingDto,
  ) {
    return this.resultCapacitySharingService
      .update(+resultId, capacitySharing)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result capacity sharing updated',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @Get('by-result-id/:resultId(\\d+)')
  async getCapacitySharing(@Param('resultId') resultId: string) {
    return this.resultCapacitySharingService
      .findByResultId(+resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result capacity sharing found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }
}

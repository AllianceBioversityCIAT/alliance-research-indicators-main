import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { ResultCapSharingIpService } from './result-cap-sharing-ip.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdateResultCapSharingIpDto } from './dto/update-result-cap-sharing-ip.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Result Capacity Sharing')
@Controller()
@ApiBearerAuth()
export class ResultCapSharingIpController {
  constructor(
    private readonly resultCapSharingIpService: ResultCapSharingIpService,
  ) {}

  @Get(':resultId(\\d+)')
  findByResultId(@Param('resultId') resultId: string) {
    return this.resultCapSharingIpService
      .findByResultId(+resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result capacity sharing ip found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @Patch(':resultId(\\d+)')
  update(
    @Param('resultId') resultId: string,
    @Body() updateData: UpdateResultCapSharingIpDto,
  ) {
    return this.resultCapSharingIpService
      .update(+resultId, updateData)
      .then(() =>
        ResponseUtils.format({
          description: 'Result capacity sharing ip updated',
          status: HttpStatus.OK,
        }),
      );
  }
}

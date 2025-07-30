import {
  Controller,
  Get,
  Query,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TipIntegrationService } from './tip-integration.service';
import { TipIprDataDto } from './dto/tip-ipr-data.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('TIP Integration')
@Controller('tip-integration')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
export class TipIntegrationController {
  constructor(private readonly tipIntegrationService: TipIntegrationService) {}

  @MessagePattern('tip.get-ipr-data')
  async handleGetIprData(): Promise<TipIprDataDto[]> {
    return this.tipIntegrationService.getAllIprData();
  }

  @ApiOperation({ summary: 'Get all IPR data for TIP integration' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit the number of results returned',
  })
  @Get('ipr-data')
  async getIprDataRest(@Query('limit') limit?: number) {
    return this.tipIntegrationService
      .getAllIprData({ take: limit ? Number(limit) : undefined })
      .then((data) =>
        ResponseUtils.format({
          description: 'IPR data found successfully',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }
}

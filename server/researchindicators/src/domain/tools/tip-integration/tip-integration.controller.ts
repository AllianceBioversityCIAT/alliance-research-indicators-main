import {
  Controller,
  Get,
  Query,
  UseInterceptors,
  HttpStatus,
  Patch,
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
import {
  QueryIndicators,
  QueryIndicatorsEnum,
} from '../../entities/indicators/enum/indicators.enum';

@ApiTags('TIP Integration')
@Controller()
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
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by report year',
  })
  @ApiQuery({
    name: 'product_type',
    type: 'number',
    required: false,
    enum: QueryIndicatorsEnum,
  })
  @Get('ipr-data')
  async getIprDataRest(
    @Query('year') year?: number,
    @Query('product_type') productType?: QueryIndicatorsEnum,
  ) {
    const productTypeEnum = QueryIndicators.getFromName(productType)?.value;
    return this.tipIntegrationService
      .getAllIprData({
        year: year ? Number(year) : undefined,
        productType: productTypeEnum,
      })
      .then((data) =>
        ResponseUtils.format({
          description: 'IPR data found successfully',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }

  @Patch('ipr-data/sync')
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
  })
  @ApiOperation({ summary: 'Sync IPR data with TIP' })
  async syncIprData(@Query('year') year?: string) {
    return this.tipIntegrationService
      .getKnowledgeProductsByYear(Number(year))
      .then((data) =>
        ResponseUtils.format({
          description: 'IPR data synced successfully',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }
}

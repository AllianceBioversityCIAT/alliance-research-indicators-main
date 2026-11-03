import {
  ConflictException,
  Controller,
  Get,
  Query,
  UseInterceptors,
  HttpStatus,
  Patch,
  DefaultValuePipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TipIntegrationService } from './tip-integration.service';
import { TipIprDataDto } from './dto/tip-ipr-data.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  QueryIndicators,
  QueryIndicatorsEnum,
} from '../../entities/indicators/enum/indicators.enum';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';

@ApiTags('TIP Integration')
@Controller()
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
export class TipIntegrationController {
  private readonly logger = new LoggerUtil({
    name: TipIntegrationController.name,
  });

  constructor(private readonly tipIntegrationService: TipIntegrationService) {}

  @MessagePattern('tip.get-ipr-data')
  async handleGetIprData(): Promise<TipIprDataDto[]> {
    return this.tipIntegrationService.getAllIprData();
  }

  @MessagePattern('tip-clone-knowledge-products')
  async handleTipCloneKnowledgeProducts(
    @Payload() payload?: { year?: number },
  ) {
    await this.tipIntegrationService.getKnowledgeProductsByYear(
      reportingYearFromClonePayload(payload),
    );
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
  @ApiQuery({
    name: 'async',
    required: false,
    type: String,
    enum: TrueFalseEnum,
  })
  @ApiOperation({ summary: 'Sync IPR data with TIP' })
  async syncIprData(
    @Query('year') year?: string,
    @Query('async', new DefaultValuePipe(TrueFalseEnum.FALSE))
    asyncProcess?: TrueFalseEnum,
  ) {
    if (asyncProcess == TrueFalseEnum.TRUE) {
      this.tipIntegrationService
        .getKnowledgeProductsByYear(year ? +year : undefined)
        .catch((error: unknown) => {
          if (error instanceof ConflictException) {
            this.logger.warn(error.message);
            return;
          }
          if (error instanceof Error) {
            this.logger.error(error.message, error.stack);
            return;
          }
          this.logger.error(String(error));
        });
      return ResponseUtils.format({
        data: 'IPR data synced asynchronously',
        description: 'IPR data synced asynchronously',
        status: HttpStatus.OK,
      });
    }

    return this.tipIntegrationService
      .getKnowledgeProductsByYear(year ? +year : undefined)
      .then((data) =>
        ResponseUtils.format({
          description: 'IPR data synced successfully',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }
}

/**
 * `emitToPattern` JSON.stringifies the body, so the RMQ handler receives a
 * string. A finite number (or a numeric string) is the only year we forward.
 */
function reportingYearFromClonePayload(payload: unknown): number | undefined {
  let body: unknown = payload;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body) as unknown;
    } catch {
      return undefined;
    }
  }
  if (body === null || typeof body !== 'object') {
    return undefined;
  }
  const raw = (body as { year?: unknown }).year;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const coerced = Number(raw.trim());
    return Number.isFinite(coerced) ? coerced : undefined;
  }
  return undefined;
}

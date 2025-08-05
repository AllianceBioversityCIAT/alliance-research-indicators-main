import { Injectable } from '@nestjs/common';
import { TipIprDataDto } from './dto/tip-ipr-data.dto';
import { ResultsService } from '../../entities/results/results.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { tipIntegrationMapper } from './mapper/tip-integration.mapper';

@Injectable()
export class TipIntegrationService {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly resultsService: ResultsService,
  ) {}

  async getAllIprData(options?: {
    year?: number;
    productType?: number;
  }): Promise<TipIprDataDto[]> {
    const results = await this.resultsService.findResultTIPData({
      year: options?.year,
      productType: options?.productType,
    });

    return results.map((result) =>
      tipIntegrationMapper(result, this.appConfig),
    );
  }
}

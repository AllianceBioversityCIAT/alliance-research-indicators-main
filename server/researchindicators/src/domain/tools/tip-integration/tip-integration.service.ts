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

  async getAllIprData(options?: { take?: number }): Promise<TipIprDataDto[]> {
    const results = await this.resultsService.findResultTIPData({
      take: options?.take,
    });

    return results.map((result) =>
      tipIntegrationMapper(result, this.appConfig),
    );
  }
}

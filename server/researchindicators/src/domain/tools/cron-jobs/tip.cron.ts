import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TipIntegrationService } from '../tip-integration/tip-integration.service';
import { LoggerUtil } from '../../shared/utils/logger.util';

@Injectable()
export class TipCron {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: TipCron.name,
  });
  constructor(private readonly _tipIntegrationService: TipIntegrationService) {
    this.logger._verbose('TipCron initialized');
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async cloneNormalEntities() {
    [2025, 2026].forEach(async (year) => {
      await this._tipIntegrationService.getKnowledgeProductsByYear(year);
    });
  }
}

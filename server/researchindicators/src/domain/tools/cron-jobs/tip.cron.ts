import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TipIntegrationService } from '../tip-integration/tip-integration.service';

@Injectable()
export class TipCron {
  constructor(private readonly _tipIntegrationService: TipIntegrationService) {}

  @Cron(CronExpression.EVERY_WEEKEND)
  async cloneNormalEntities() {
    this._tipIntegrationService.getKnowledgeProductsByYear(2025);
  }
}

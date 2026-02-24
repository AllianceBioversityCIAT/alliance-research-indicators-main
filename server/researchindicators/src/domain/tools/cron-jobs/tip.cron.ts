import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SelfApp } from '../broker/self.app';
import { LoggerUtil } from '../../shared/utils/logger.util';

const TIP_SYNC_YEARS = [2025, 2026];

@Injectable()
export class TipCron {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: TipCron.name,
  });
  constructor(private readonly _selfApp: SelfApp) {
    this.logger._verbose('TipCron initialized');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  cloneNormalEntities(): void {
    this._selfApp.executeTipCloneKnowledgeProducts(TIP_SYNC_YEARS);
  }
}

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SelfApp } from '../broker/self.app';
import { LoggerUtil } from '../../shared/utils/logger.util';

@Injectable()
export class TipCron {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: TipCron.name,
  });
  constructor(private readonly _selfApp: SelfApp) {
    this.logger._verbose('TipCron initialized');
  }

  @Cron('0 0 * * 0') // Every Sunday at midnight
  cloneNormalEntities(): void {
    this._selfApp.executeTipCloneKnowledgeProducts();
  }
}

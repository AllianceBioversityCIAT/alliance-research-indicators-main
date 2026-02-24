import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncProcessLogStaleService } from '../../entities/sync-process-log/sync-process-log-stale.service';
import { LoggerUtil } from '../../shared/utils/logger.util';

@Injectable()
export class SyncProcessLogCron {
  private readonly logger = new LoggerUtil({
    name: SyncProcessLogCron.name,
  });

  constructor(
    private readonly syncProcessLogStaleService: SyncProcessLogStaleService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markStaleInProgressAsFailed(): Promise<void> {
    this.logger.debug(
      'Running cron: mark stale IN_PROGRESS sync logs as FAILED',
    );
    const { updated } =
      await this.syncProcessLogStaleService.markStaleInProgressAsFailed();
    this.logger.debug(
      `Sync process log stale job finished. Updated: ${updated}`,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { DataSource, LessThan } from 'typeorm';
import { SyncProcessLog } from './entities/sync-process-log.entity';
import { SyncProcessStatusEnum } from './enum/sync-process.enum';
import { LoggerUtil } from '../../shared/utils/logger.util';

const STALE_HOURS = 24;

@Injectable()
export class SyncProcessLogStaleService {
  private readonly logger = new LoggerUtil({
    name: SyncProcessLogStaleService.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Marks all sync process logs that are IN_PROGRESS and older than 24 hours as FAILED.
   */
  async markStaleInProgressAsFailed(): Promise<{ updated: number }> {
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
    const repo = this.dataSource.getRepository(SyncProcessLog);
    const result = await repo.update(
      {
        process_status: SyncProcessStatusEnum.IN_PROGRESS,
        created_at: LessThan(cutoff),
      },
      { process_status: SyncProcessStatusEnum.FAILED },
    );
    const updated = result.affected ?? 0;
    if (updated > 0) {
      this.logger.log(
        `Marked ${updated} stale IN_PROGRESS sync process log(s) as FAILED (older than ${STALE_HOURS}h)`,
      );
    }
    return { updated };
  }
}

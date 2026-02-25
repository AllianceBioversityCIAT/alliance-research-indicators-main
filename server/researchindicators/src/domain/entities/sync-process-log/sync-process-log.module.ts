import { Module } from '@nestjs/common';
import { SyncProcessLogService } from './sync-process-log.service';
import { SyncProcessLogController } from './sync-process-log.controller';
import { SyncProcessLogStaleService } from './sync-process-log-stale.service';

@Module({
  controllers: [SyncProcessLogController],
  providers: [SyncProcessLogService, SyncProcessLogStaleService],
  exports: [SyncProcessLogService, SyncProcessLogStaleService],
})
export class SyncProcessLogModule {}

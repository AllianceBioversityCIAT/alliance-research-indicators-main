import { Module } from '@nestjs/common';
import { SyncProcessLogService } from './sync-process-log.service';
import { SyncProcessLogController } from './sync-process-log.controller';

@Module({
  controllers: [SyncProcessLogController],
  providers: [SyncProcessLogService],
  exports: [SyncProcessLogService],
})
export class SyncProcessLogModule {}

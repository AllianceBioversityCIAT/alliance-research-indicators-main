import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GlobalUtilsModule } from '../../shared/utils/global-utils.module';
import { SyncProcessLogModule } from '../../entities/sync-process-log/sync-process-log.module';
import { SelfApp } from '../broker/self.app';
import { TipCron } from './tip.cron';
import { SyncProcessLogCron } from './sync-process-log.cron';

@Module({
  imports: [
    GlobalUtilsModule,
    SyncProcessLogModule,
    ScheduleModule.forRoot({
      cronJobs: true,
    }),
  ],
  providers: [SelfApp, TipCron, SyncProcessLogCron],
})
export class CronModule {}

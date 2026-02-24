import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GlobalUtilsModule } from '../../shared/utils/global-utils.module';
import { SelfApp } from '../broker/self.app';
import { TipCron } from './tip.cron';

@Module({
  imports: [
    GlobalUtilsModule,
    ScheduleModule.forRoot({
      cronJobs: true,
    }),
  ],
  providers: [SelfApp, TipCron],
})
export class CronModule {}

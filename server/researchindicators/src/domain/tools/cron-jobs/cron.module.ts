import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TipIntegrationModule } from '../tip-integration/tip-integration.module';
import { TipCron } from './tip.cron';

@Module({
  imports: [
    TipIntegrationModule,
    ScheduleModule.forRoot({
      cronJobs: true,
    }),
  ],
  providers: [TipCron],
})
export class CronModule { }

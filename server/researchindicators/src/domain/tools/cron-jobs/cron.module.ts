import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TipIntegrationModule } from '../tip-integration/tip-integration.module';

@Module({
  imports: [
    TipIntegrationModule,
    ScheduleModule.forRoot({
      cronJobs: true,
    }),
  ],
  providers: [],
})
export class CronModule {}

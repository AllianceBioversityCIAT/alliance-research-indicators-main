import { Module } from '@nestjs/common';
import { ClarisaCron } from './clarisa.cron';
import { AgressoToolsModule } from '../agresso/agresso-tools.module';
import { AgressoCron } from './agresso.cron';
import { ScheduleModule } from '@nestjs/schedule';
import { SelfApp } from '../broker/self.app';

@Module({
  imports: [
    AgressoToolsModule,
    ScheduleModule.forRoot({
      cronJobs: true,
    }),
  ],
  providers: [ClarisaCron, AgressoCron, SelfApp],
})
export class CronModule {}

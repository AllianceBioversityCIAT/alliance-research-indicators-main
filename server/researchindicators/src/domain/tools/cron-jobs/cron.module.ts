import { Global, Module } from '@nestjs/common';
import { ClarisaCron } from './clarisa.cron';
import { ClarisaModule } from '../clarisa/clarisa.module';
import { AgressoModule } from '../agresso/agresso.module';
import { AgressoCron } from './agresso.cron';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [ClarisaModule, AgressoModule, ScheduleModule.forRoot()],
  providers: [ClarisaCron, AgressoCron],
  exports: [ClarisaCron, AgressoCron],
})
export class CronModule {}

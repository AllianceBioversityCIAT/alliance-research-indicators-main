import { Global, Module } from '@nestjs/common';
import { ClarisaCron } from './clarisa.cron';
import { ClarisaModule } from '../clarisa/clarisa.module';
import { AgressoToolsModule } from '../agresso/agresso-tools.module';
import { AgressoCron } from './agresso.cron';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [ClarisaModule, AgressoToolsModule, ScheduleModule.forRoot()],
  providers: [ClarisaCron, AgressoCron],
  exports: [ClarisaCron, AgressoCron],
})
export class CronModule {}

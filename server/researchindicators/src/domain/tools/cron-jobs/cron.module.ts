import { Module } from '@nestjs/common';
import { ClarisaCron } from './clarisa.cron';
import { ClarisaModule } from '../clarisa/clarisa.module';

@Module({
  imports: [ClarisaModule],
  providers: [ClarisaCron],
  controllers: [],
})
export class CronModule {}

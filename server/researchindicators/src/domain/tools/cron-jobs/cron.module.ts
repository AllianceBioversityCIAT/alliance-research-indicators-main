import { Module } from '@nestjs/common';
import { ClarisaCron } from './clarisa.cron';
import { ClarisaModule } from '../clarisa/clarisa.module';
import { AgressoModule } from '../agresso/agresso.module';

@Module({
  imports: [ClarisaModule, AgressoModule],
  providers: [ClarisaCron],
  controllers: [],
})
export class CronModule {}

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../entities/app-config/app-config.module';
import { PrmsNormalizerService } from './prms-normalizer.service';

@Module({
  imports: [HttpModule, AppConfigModule],
  providers: [PrmsNormalizerService],
  exports: [PrmsNormalizerService],
})
export class PrmsNormalizerModule {}

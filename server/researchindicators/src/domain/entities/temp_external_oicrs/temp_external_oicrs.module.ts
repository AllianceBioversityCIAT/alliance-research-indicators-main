import { Module } from '@nestjs/common';
import { TempExternalOicrsService } from './temp_external_oicrs.service';
import { TempExternalOicrsController } from './temp_external_oicrs.controller';

@Module({
  controllers: [TempExternalOicrsController],
  providers: [TempExternalOicrsService],
  exports: [TempExternalOicrsService],
})
export class TempExternalOicrsModule {}

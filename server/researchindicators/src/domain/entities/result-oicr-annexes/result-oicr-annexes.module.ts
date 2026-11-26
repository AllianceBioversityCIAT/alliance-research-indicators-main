import { Module } from '@nestjs/common';
import { ResultOicrAnnexesService } from './result-oicr-annexes.service';

@Module({
  providers: [ResultOicrAnnexesService],
  exports: [ResultOicrAnnexesService],
})
export class ResultOicrAnnexesModule {}

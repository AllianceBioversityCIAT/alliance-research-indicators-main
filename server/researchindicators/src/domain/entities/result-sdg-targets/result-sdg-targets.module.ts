import { Module } from '@nestjs/common';
import { ResultSdgTargetsService } from './result-sdg-targets.service';

@Module({
  providers: [ResultSdgTargetsService],
  exports: [ResultSdgTargetsService],
})
export class ResultSdgTargetsModule {}

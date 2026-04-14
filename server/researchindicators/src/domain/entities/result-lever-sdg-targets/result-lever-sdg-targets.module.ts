import { Module } from '@nestjs/common';
import { ResultLeverSdgTargetsService } from './result-lever-sdg-targets.service';
import { ResultLeverSdgTargetsController } from './result-lever-sdg-targets.controller';

@Module({
  controllers: [ResultLeverSdgTargetsController],
  providers: [ResultLeverSdgTargetsService],
  exports: [ResultLeverSdgTargetsService],
})
export class ResultLeverSdgTargetsModule {}

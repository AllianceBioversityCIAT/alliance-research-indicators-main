import { Module } from '@nestjs/common';
import { LeverSdgTargetsService } from './lever-sdg-targets.service';
import { LeverSdgTargetsController } from './lever-sdg-targets.controller';

@Module({
  controllers: [LeverSdgTargetsController],
  providers: [LeverSdgTargetsService],
  exports: [LeverSdgTargetsService],
})
export class LeverSdgTargetsModule {}

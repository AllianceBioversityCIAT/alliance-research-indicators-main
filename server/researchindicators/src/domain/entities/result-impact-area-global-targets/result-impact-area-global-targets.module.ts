import { Module } from '@nestjs/common';
import { ResultImpactAreaGlobalTargetsService } from './result-impact-area-global-targets.service';
import { ResultImpactAreaGlobalTargetsController } from './result-impact-area-global-targets.controller';

@Module({
  controllers: [ResultImpactAreaGlobalTargetsController],
  providers: [ResultImpactAreaGlobalTargetsService],
  exports: [ResultImpactAreaGlobalTargetsService],
})
export class ResultImpactAreaGlobalTargetsModule {}

import { Module } from '@nestjs/common';
import { ImpactAreaScoreService } from './impact-area-score.service';
import { ImpactAreaScoreController } from './impact-area-score.controller';

@Module({
  controllers: [ImpactAreaScoreController],
  providers: [ImpactAreaScoreService],
  exports: [ImpactAreaScoreService],
})
export class ImpactAreaScoreModule {}

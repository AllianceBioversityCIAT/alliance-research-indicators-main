import { Module } from '@nestjs/common';
import { ResultImpactOutcomesService } from './result-impact-outcomes.service';
import { ResultImpactOutcomesController } from './result-impact-outcomes.controller';

@Module({
  controllers: [ResultImpactOutcomesController],
  providers: [ResultImpactOutcomesService],
  exports: [ResultImpactOutcomesService],
})
export class ResultImpactOutcomesModule { }

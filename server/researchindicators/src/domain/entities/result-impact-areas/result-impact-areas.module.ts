import { Module } from '@nestjs/common';
import { ResultImpactAreasService } from './result-impact-areas.service';
import { ResultImpactAreasController } from './result-impact-areas.controller';

@Module({
  controllers: [ResultImpactAreasController],
  providers: [ResultImpactAreasService],
  exports: [ResultImpactAreasService],
})
export class ResultImpactAreasModule {}

import { Module } from '@nestjs/common';
import { ResultStrategicObjectivesService } from './result-strategic-objectives.service';
import { ResultStrategicObjectivesController } from './result-strategic-objectives.controller';

@Module({
  controllers: [ResultStrategicObjectivesController],
  providers: [ResultStrategicObjectivesService],
  exports: [ResultStrategicObjectivesService],
})
export class ResultStrategicObjectivesModule {}

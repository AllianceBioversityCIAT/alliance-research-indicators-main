import { Module } from '@nestjs/common';
import { ResultLeverStrategicOutcomeService } from './result-lever-strategic-outcome.service';
import { ResultLeverStrategicOutcomeController } from './result-lever-strategic-outcome.controller';

@Module({
  controllers: [ResultLeverStrategicOutcomeController],
  providers: [ResultLeverStrategicOutcomeService],
})
export class ResultLeverStrategicOutcomeModule {}

import { Module } from '@nestjs/common';
import { LeverStrategicOutcomeService } from './lever-strategic-outcome.service';
import { LeverStrategicOutcomeController } from './lever-strategic-outcome.controller';

@Module({
  controllers: [LeverStrategicOutcomeController],
  providers: [LeverStrategicOutcomeService],
})
export class LeverStrategicOutcomeModule {}

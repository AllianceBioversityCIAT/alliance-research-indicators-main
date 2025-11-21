import { Module } from '@nestjs/common';
import { ResultStatusTransitionsService } from './result-status-transitions.service';
import { ResultStatusTransitionsController } from './result-status-transitions.controller';

@Module({
  controllers: [ResultStatusTransitionsController],
  providers: [ResultStatusTransitionsService],
  exports: [ResultStatusTransitionsService],
})
export class ResultStatusTransitionsModule {}

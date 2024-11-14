import { Module } from '@nestjs/common';
import { ResultStatusService } from './result-status.service';
import { ResultStatusController } from './result-status.controller';

@Module({
  controllers: [ResultStatusController],
  providers: [ResultStatusService],
})
export class ResultStatusModule {}

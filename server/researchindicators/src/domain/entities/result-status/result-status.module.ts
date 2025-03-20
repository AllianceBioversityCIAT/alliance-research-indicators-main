import { Module } from '@nestjs/common';
import { ResultStatusService } from './result-status.service';
import { ResultStatusController } from './result-status.controller';
import { ResultStatusRepository } from './repositories/result-status.repository';

@Module({
  controllers: [ResultStatusController],
  providers: [ResultStatusService, ResultStatusRepository],
  exports: [ResultStatusService, ResultStatusRepository],
})
export class ResultStatusModule {}

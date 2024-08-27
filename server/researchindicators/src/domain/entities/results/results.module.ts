import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ResultRepository } from './repositories/result.repository';

@Module({
  controllers: [ResultsController],
  providers: [ResultsService, ResultRepository],
  exports: [ResultsService, ResultRepository],
})
export class ResultsModule {}

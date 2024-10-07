import { Module } from '@nestjs/common';
import { ResultLeversService } from './result-levers.service';
import { ResultLeversController } from './result-levers.controller';
import { ResultLeversRepository } from './repositories/result-levers.repository';

@Module({
  controllers: [ResultLeversController],
  providers: [ResultLeversService, ResultLeversRepository],
  exports: [ResultLeversService, ResultLeversRepository],
})
export class ResultLeversModule {}

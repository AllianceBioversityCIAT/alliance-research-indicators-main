import { Module } from '@nestjs/common';
import { ResultInnovationDevService } from './result-innovation-dev.service';
import { ResultInnovationDevController } from './result-innovation-dev.controller';

@Module({
  controllers: [ResultInnovationDevController],
  providers: [ResultInnovationDevService],
  exports: [ResultInnovationDevService],
})
export class ResultInnovationDevModule {}

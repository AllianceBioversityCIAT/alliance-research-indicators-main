import { Module } from '@nestjs/common';
import { ResultSdgsService } from './result-sdgs.service';
import { ResultSdgsController } from './result-sdgs.controller';

@Module({
  controllers: [ResultSdgsController],
  providers: [ResultSdgsService],
  exports: [ResultSdgsService],
})
export class ResultSdgsModule {}

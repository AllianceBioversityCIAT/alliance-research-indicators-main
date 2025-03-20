import { Module } from '@nestjs/common';
import { ResultRegionsService } from './result-regions.service';
import { ResultRegionsController } from './result-regions.controller';

@Module({
  controllers: [ResultRegionsController],
  providers: [ResultRegionsService],
  exports: [ResultRegionsService],
})
export class ResultRegionsModule {}

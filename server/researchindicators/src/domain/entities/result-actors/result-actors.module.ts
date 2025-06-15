import { Module } from '@nestjs/common';
import { ResultActorsService } from './result-actors.service';
import { ResultActorsController } from './result-actors.controller';

@Module({
  controllers: [ResultActorsController],
  providers: [ResultActorsService],
  exports: [ResultActorsService],
})
export class ResultActorsModule {}

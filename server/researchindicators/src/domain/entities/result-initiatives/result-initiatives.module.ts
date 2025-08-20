import { Module } from '@nestjs/common';
import { ResultInitiativesService } from './result-initiatives.service';
import { ResultInitiativesController } from './result-initiatives.controller';

@Module({
  controllers: [ResultInitiativesController],
  providers: [ResultInitiativesService],
  exports: [ResultInitiativesService],
})
export class ResultInitiativesModule {}

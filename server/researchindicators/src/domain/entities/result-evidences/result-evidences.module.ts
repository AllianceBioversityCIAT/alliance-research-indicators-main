import { Module } from '@nestjs/common';
import { ResultEvidencesService } from './result-evidences.service';
import { ResultEvidencesController } from './result-evidences.controller';

@Module({
  controllers: [ResultEvidencesController],
  providers: [ResultEvidencesService],
})
export class ResultEvidencesModule {}

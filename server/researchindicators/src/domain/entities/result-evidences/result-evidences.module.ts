import { Module } from '@nestjs/common';
import { ResultEvidencesService } from './result-evidences.service';
import { ResultEvidencesController } from './result-evidences.controller';
import { ResultNotableReferencesModule } from '../result-notable-references/result-notable-references.module';

@Module({
  controllers: [ResultEvidencesController],
  providers: [ResultEvidencesService],
  exports: [ResultEvidencesService],
  imports: [ResultNotableReferencesModule],
})
export class ResultEvidencesModule {}

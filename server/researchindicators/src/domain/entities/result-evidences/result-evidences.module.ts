import { Module } from '@nestjs/common';
import { ResultEvidencesService } from './result-evidences.service';
import { ResultEvidencesController } from './result-evidences.controller';
import { ResultNotableReferencesModule } from '../result-notable-references/result-notable-references.module';
import { ResultOicrAnnexesModule } from '../result-oicr-annexes/result-oicr-annexes.module';

@Module({
  controllers: [ResultEvidencesController],
  providers: [ResultEvidencesService],
  exports: [ResultEvidencesService],
  imports: [ResultNotableReferencesModule, ResultOicrAnnexesModule],
})
export class ResultEvidencesModule {}

import { Module } from '@nestjs/common';
import { ResultInstitutionsModule } from '../../entities/result-institutions/result-institutions.module';
import { SaveResultService } from './save-all-sections.service';
import { ResultKnowledgeProductModule } from '../../entities/result-knowledge-product/result-knowledge-product.module';
import { ResultEvidencesModule } from '../../entities/result-evidences/result-evidences.module';
import { ResultsModule } from '../../entities/results/results.module';

@Module({
  imports: [
    ResultInstitutionsModule,
    ResultKnowledgeProductModule,
    ResultEvidencesModule,
    ResultsModule,
  ],
  providers: [SaveResultService],
  exports: [SaveResultService],
})
export class SaveAllSectionsModule {}

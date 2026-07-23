import { Module } from '@nestjs/common';
import { ResultInstitutionsModule } from '../../entities/result-institutions/result-institutions.module';
import { SaveResultService } from './save-all-sections.service';
import { ResultKnowledgeProductModule } from '../../entities/result-knowledge-product/result-knowledge-product.module';
import { ResultEvidencesModule } from '../../entities/result-evidences/result-evidences.module';
import { ResultsModule } from '../../entities/results/results.module';
import { ResultPolicyChangeModule } from '../../entities/result-policy-change/result-policy-change.module';
import { ResultCapacitySharingModule } from '../../entities/result-capacity-sharing/result-capacity-sharing.module';

@Module({
  imports: [
    ResultInstitutionsModule,
    ResultKnowledgeProductModule,
    ResultEvidencesModule,
    ResultsModule,
    ResultPolicyChangeModule,
    ResultCapacitySharingModule,
  ],
  providers: [SaveResultService],
  exports: [SaveResultService],
})
export class SaveAllSectionsModule {}

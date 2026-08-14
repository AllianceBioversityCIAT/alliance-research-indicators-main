import { Module } from '@nestjs/common';
import { ResultInstitutionsModule } from '../../entities/result-institutions/result-institutions.module';
import { SaveResultService } from './save-all-sections.service';
import { ResultKnowledgeProductModule } from '../../entities/result-knowledge-product/result-knowledge-product.module';
import { ResultEvidencesModule } from '../../entities/result-evidences/result-evidences.module';
import { ResultsModule } from '../../entities/results/results.module';
import { ResultPolicyChangeModule } from '../../entities/result-policy-change/result-policy-change.module';
import { ResultCapacitySharingModule } from '../../entities/result-capacity-sharing/result-capacity-sharing.module';
import { ResultInnovationDevModule } from '../../entities/result-innovation-dev/result-innovation-dev.module';
import { ResultIpRightsModule } from '../../entities/result-ip-rights/result-ip-rights.module';
import { ResultOpenSearchModule } from '../../tools/open-search/results/result.opensearch.module';
import { DuplicateResolutionRunner } from './duplicate-resolution-runner.service';
import { StarRelationshipService } from './star-relationship.service';

@Module({
  imports: [
    ResultInstitutionsModule,
    ResultKnowledgeProductModule,
    ResultEvidencesModule,
    ResultsModule,
    ResultPolicyChangeModule,
    ResultCapacitySharingModule,
    ResultInnovationDevModule,
    ResultIpRightsModule,
    // `OpenSearchResultApi`, which `DuplicateResolutionRunner` needs to drop a
    // hard-deleted row from the search index.
    ResultOpenSearchModule,
  ],
  // `SaveResultService` gained the cross-platform duplicate resolution
  // collaborators (results/cross-platform-duplicate-resolution). They are
  // declared HERE rather than in each consumer module (PRMS, TIP) because this
  // module is what owns `SaveResultService` — the consumers only import it.
  // `DuplicateCandidateRepository` arrives through `ResultsModule`, which
  // exports it, and `QueryService` through the `@Global()` `GlobalUtilsModule`.
  providers: [SaveResultService, StarRelationshipService, DuplicateResolutionRunner],
  exports: [SaveResultService],
})
export class SaveAllSectionsModule {}

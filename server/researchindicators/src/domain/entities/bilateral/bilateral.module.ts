import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultPoolFundingAlignment } from './entities/result-pool-funding-alignment.entity';
import { ResultPoolFundingAlignmentSp } from './entities/result-pool-funding-alignment-sp.entity';
import { ResultPoolFundingIndicatorMapping } from './entities/result-pool-funding-indicator-mapping.entity';
import { ResultPoolFundingAlignmentRepository } from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingAlignmentSpRepository } from './repositories/result-pool-funding-alignment-sp.repository';
import { ResultPoolFundingIndicatorMappingRepository } from './repositories/result-pool-funding-indicator-mapping.repository';
import { AgressoContractModule } from '../agresso-contract/agresso-contract.module';
import { ClarisaModule } from '../../tools/clarisa/clarisa.module';
import { ClarisaScienceProgramsModule } from '../../tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.module';
import { ClarisaProjectsModule } from '../../tools/clarisa/projects/clarisa-projects.module';
import { ClarisaCgiarEntitiesModule } from '../../tools/clarisa/cgiar-entities/clarisa-cgiar-entities.module';
import { PrmsTocModule } from '../../tools/prms-toc/prms-toc.module';
// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090 —
// lambda-toc client feeding the reshaped hlos-indicators read. PrmsTocModule
// stays wired until the gated T-10 cleanup (R-BIL-098).
import { TocIntegrationModule } from '../../tools/toc-integration/toc-integration.module';
import { BilateralProjectMappingModule } from '../bilateral-project-mapping/bilateral-project-mapping.module';
import { ResultsModule } from '../results/results.module';
import { ResultReviewHistoryModule } from '../result-review-history/result-review-history.module';
import { SocketModule } from '../../tools/socket/socket.module';
import { BilateralController } from './bilateral.controller';
import { BilateralService } from './bilateral.service';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { ResultUsersModule } from '../result-users/result-users.module';
import { NoopBilateralIndicatorTypeHandler } from './handlers/noop.handler';
import { ResultCapacitySharingModule } from '../result-capacity-sharing/result-capacity-sharing.module';
import { ResultInnovationDevModule } from '../result-innovation-dev/result-innovation-dev.module';
import { ResultKnowledgeProductModule } from '../result-knowledge-product/result-knowledge-product.module';
import { ResultPolicyChangeModule } from '../result-policy-change/result-policy-change.module';
import { CapacitySharingBilateralIndicatorTypeHandler } from './handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './handlers/knowledge-product.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from './handlers/policy-change.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResultPoolFundingAlignment,
      ResultPoolFundingAlignmentSp,
      ResultPoolFundingIndicatorMapping,
    ]),
    AgressoContractModule,
    ClarisaModule,
    ClarisaScienceProgramsModule,
    ClarisaProjectsModule,
    ClarisaCgiarEntitiesModule,
    PrmsTocModule,
    TocIntegrationModule,
    BilateralProjectMappingModule,
    ResultsModule,
    ResultReviewHistoryModule,
    SocketModule,
    ResultUsersModule,
    ResultCapacitySharingModule,
    ResultInnovationDevModule,
    ResultKnowledgeProductModule,
    ResultPolicyChangeModule,
  ],
  controllers: [BilateralController],
  providers: [
    BilateralService,
    ResultOwnerGuard,
    CapacitySharingBilateralIndicatorTypeHandler,
    InnovationDevelopmentBilateralIndicatorTypeHandler,
    KnowledgeProductBilateralIndicatorTypeHandler,
    PolicyChangeBilateralIndicatorTypeHandler,
    NoopBilateralIndicatorTypeHandler,
    ResultPoolFundingAlignmentRepository,
    ResultPoolFundingAlignmentSpRepository,
    ResultPoolFundingIndicatorMappingRepository,
  ],
  exports: [
    TypeOrmModule,
    ResultPoolFundingAlignmentRepository,
    ResultPoolFundingAlignmentSpRepository,
    ResultPoolFundingIndicatorMappingRepository,
    BilateralService,
    CapacitySharingBilateralIndicatorTypeHandler,
    InnovationDevelopmentBilateralIndicatorTypeHandler,
    KnowledgeProductBilateralIndicatorTypeHandler,
    PolicyChangeBilateralIndicatorTypeHandler,
    NoopBilateralIndicatorTypeHandler,
  ],
})
export class BilateralModule {}

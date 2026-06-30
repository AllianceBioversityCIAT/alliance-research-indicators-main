import { Module } from '@nestjs/common';
import { ResultSectionOrchestratorService } from './application/result-section-orchestrator.service';
import { AlignmentHandlerRegistry } from './sections/alignment/alignment-handler.registry';
import { Portfolio1AlignmentHandler } from './sections/alignment/portfolio-1/portfolio-1-alignment.handler';
import { Portfolio2AlignmentHandler } from './sections/alignment/portfolio-2/portfolio-2-alignment.handler';
import { ResultAlignmentOperationsService } from './sections/alignment/shared/result-alignment-operations.service';
import { ResultContractsModule } from '../../result-contracts/result-contracts.module';
import { ResultLeversModule } from '../../result-levers/result-levers.module';
import { ResultLeverStrategicOutcomeModule } from '../../result-lever-strategic-outcome/result-lever-strategic-outcome.module';
import { ResultLeverSdgTargetsModule } from '../../result-lever-sdg-targets/result-lever-sdg-targets.module';
import { ResultSdgsModule } from '../../result-sdgs/result-sdgs.module';
import { ResultStrategicObjectivesModule } from '../../result-strategic-objectives/result-strategic-objectives.module';
import { ResultImpactOutcomesModule } from '../../result-impact-outcomes/result-impact-outcomes.module';

@Module({
  imports: [
    ResultContractsModule,
    ResultLeversModule,
    ResultLeverStrategicOutcomeModule,
    ResultLeverSdgTargetsModule,
    ResultSdgsModule,
    ResultStrategicObjectivesModule,
    ResultImpactOutcomesModule,
  ],
  providers: [
    ResultAlignmentOperationsService,
    ResultSectionOrchestratorService,
    AlignmentHandlerRegistry,
    Portfolio1AlignmentHandler,
    Portfolio2AlignmentHandler,
  ],
  exports: [
    ResultAlignmentOperationsService,
    ResultSectionOrchestratorService,
    AlignmentHandlerRegistry,
  ],
})
export class PortfolioHandlersModule {}

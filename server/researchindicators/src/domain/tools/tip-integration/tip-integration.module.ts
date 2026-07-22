import { Module } from '@nestjs/common';
import { TipIntegrationController } from './tip-integration.controller';
import { TipIntegrationService } from './tip-integration.service';
import { ResultsModule } from '../../entities/results/results.module';
import { HttpModule } from '@nestjs/axios';
import { ClarisaRegionsModule } from '../clarisa/entities/clarisa-regions/clarisa-regions.module';
import { ClarisaLeversModule } from '../clarisa/entities/clarisa-levers/clarisa-levers.module';
import { ClarisaCountriesModule } from '../clarisa/entities/clarisa-countries/clarisa-countries.module';
import { ResultKnowledgeProductModule } from '../../entities/result-knowledge-product/result-knowledge-product.module';
import { TipIntegrationRepository } from './repository/tip-integration.repository';
import { SyncProcessLogModule } from '../../entities/sync-process-log/sync-process-log.module';
import { SaveResultService } from '../../shared/services/save-all-sections.service';
import { PrmsOpenSearchModule } from '../open-search/prms/prms.opensearch.module';
import { ClarisaSdgsModule } from '../clarisa/entities/clarisa-sdgs/clarisa-sdgs.module';

@Module({
  imports: [
    ResultsModule,
    HttpModule,
    ClarisaRegionsModule,
    ClarisaCountriesModule,
    ClarisaLeversModule,
    ResultKnowledgeProductModule,
    SyncProcessLogModule,
    PrmsOpenSearchModule,
    ClarisaSdgsModule,
  ],
  controllers: [TipIntegrationController],
  providers: [
    TipIntegrationService,
    TipIntegrationRepository,
    SaveResultService,
  ],
  exports: [TipIntegrationRepository, TipIntegrationService],
})
export class TipIntegrationModule {}

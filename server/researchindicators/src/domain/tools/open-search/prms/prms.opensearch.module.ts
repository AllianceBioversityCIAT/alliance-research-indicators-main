import { Module } from '@nestjs/common';
import { PrmsOpenSearchController } from './prms.opensearch.controller';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { HttpModule } from '@nestjs/axios';
import { ResultsModule } from '../../../entities/results/results.module';
import { ResultKnowledgeProductModule } from '../../../entities/result-knowledge-product/result-knowledge-product.module';
import { PooledFundingContractsModule } from '../../../entities/pooled-funding-contracts/pooled-funding-contracts.module';
import { ClarisaLeversModule } from '../../clarisa/entities/clarisa-levers/clarisa-levers.module';
import { SyncProcessLogModule } from '../../../entities/sync-process-log/sync-process-log.module';
import { SaveResultService } from '../../../shared/services/save-all-sections.service';
import { PrmsRepository } from './repositories/prms.repository';

@Module({
  controllers: [PrmsOpenSearchController],
  providers: [PrmsOpenSearchService, SaveResultService, PrmsRepository],
  exports: [PrmsOpenSearchService, PrmsRepository],
  imports: [
    HttpModule,
    ResultsModule,
    ResultKnowledgeProductModule,
    PooledFundingContractsModule,
    ClarisaLeversModule,
    SyncProcessLogModule,
  ],
})
export class PrmsOpenSearchModule {}

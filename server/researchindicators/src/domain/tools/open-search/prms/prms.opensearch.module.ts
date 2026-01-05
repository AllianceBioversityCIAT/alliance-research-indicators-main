import { Module } from '@nestjs/common';
import { PrmsOpenSearchController } from './prms.opensearch.controller';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { HttpModule } from '@nestjs/axios';
import { ResultsModule } from '../../../entities/results/results.module';
import { ResultKnowledgeProductModule } from '../../../entities/result-knowledge-product/result-knowledge-product.module';

@Module({
  controllers: [PrmsOpenSearchController],
  providers: [PrmsOpenSearchService],
  exports: [PrmsOpenSearchService],
  imports: [HttpModule, ResultsModule, ResultKnowledgeProductModule],
})
export class PrmsOpenSearchModule {}

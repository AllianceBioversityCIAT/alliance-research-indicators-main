import { Module } from '@nestjs/common';
import { ResultOpenSearchController } from './result.opensearch.controller';
import { OpenSearchResultApi } from './result.opensearch.api';
import { ResultsModule } from '../../../entities/results/results.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [ResultOpenSearchController],
  providers: [OpenSearchResultApi],
  exports: [OpenSearchResultApi],
  imports: [ResultsModule, HttpModule],
})
export class ResultOpenSearchModule {}

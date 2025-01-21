import { Module } from '@nestjs/common';
import { ResultOpenSearchController } from './result.opensearch.controller';
import { OpenSearchResultApi } from './result.opensearch.api';
import { HttpModule } from '@nestjs/axios';
import { ResultRepository } from '../../../entities/results/repositories/result.repository';

@Module({
  controllers: [ResultOpenSearchController],
  providers: [OpenSearchResultApi, ResultRepository],
  exports: [OpenSearchResultApi],
  imports: [HttpModule],
})
export class ResultOpenSearchModule {}

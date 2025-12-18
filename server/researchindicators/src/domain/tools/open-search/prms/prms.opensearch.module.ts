import { Module } from '@nestjs/common';
import { PrmsOpenSearchController } from './prms.opensearch.controller';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [PrmsOpenSearchController],
  providers: [PrmsOpenSearchService],
  exports: [PrmsOpenSearchService],
  imports: [HttpModule],
})
export class PrmsOpenSearchModule {}

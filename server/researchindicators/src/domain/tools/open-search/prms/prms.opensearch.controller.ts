import { Controller, Get } from '@nestjs/common';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('OpenSearch')
@Controller()
@ApiBearerAuth()
export class PrmsOpenSearchController {
  constructor(private readonly prmsService: PrmsOpenSearchService) {}

  @Get('fetch-prms-data')
  async fetchPrmsData() {
    return this.prmsService.getData();
  }
}

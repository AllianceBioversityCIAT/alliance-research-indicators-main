import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('OpenSearch')
@Controller()
@ApiBearerAuth()
export class PrmsOpenSearchController {
  constructor(private readonly prmsService: PrmsOpenSearchService) {}

  @Get('fetch-prms-data')
  @ApiQuery({
    name: 'year',
    required: true,
    type: Number,
  })
  async fetchPrmsData(@Query('year', ParseIntPipe) year: number) {
    return this.prmsService.getData(year);
  }
}

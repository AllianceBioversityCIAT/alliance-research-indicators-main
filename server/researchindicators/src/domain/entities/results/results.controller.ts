import { Controller, Get, Query } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Results')
@Controller()
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Is a reference to the page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Is a reference to the limit of items per page',
  })
  @ApiOperation({ summary: 'Find all results' })
  @Get()
  find(@Query('page') page: string, @Query('limit') limit: string) {
    return this.resultsService.findResults({ page: +page, limit: +limit });
  }
}

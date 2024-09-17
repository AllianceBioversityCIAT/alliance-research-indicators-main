import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateResultDto } from './dto/create-result.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';

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

  @ApiOperation({ summary: 'Create a result' })
  @Post()
  async createResult(@Body() createResult: CreateResultDto) {
    return this.resultsService.createResult(createResult).then((result) =>
      ResponseUtils.format({
        description: 'Result created',
        status: HttpStatus.CREATED,
        data: result,
      }),
    );
  }
}

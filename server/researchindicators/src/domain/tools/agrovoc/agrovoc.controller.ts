import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { AgrovocService } from './agrovoc.service';

@ApiTags('AGROVOC')
@ApiBearerAuth()
@Controller()
export class AgrovocController {
  constructor(private readonly agrovocService: AgrovocService) {}

  @ApiOperation({ summary: 'Search AGROVOC terms' })
  @ApiQuery({ name: 'query', required: true })
  @Get('search')
  search(@Query('query') query: string) {
    return this.agrovocService.search(query).then((data) =>
      ResponseUtils.format({
        description: 'AGROVOC terms found',
        status: 200,
        data,
      }),
    );
  }
}

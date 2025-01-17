import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { OpenSearchResultApi } from './result.opensearch.api';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../shared/utils/response.utils';

@ApiTags('OpenSearch')
@Controller()
@ApiBearerAuth()
export class ResultOpenSearchController {
  constructor(private readonly openSearchResultApi: OpenSearchResultApi) {}

  @Post('reset')
  async resetOpenSearch() {
    return this.openSearchResultApi.resetElasticData().then((response) =>
      ResponseUtils.format({
        description: 'Elastic data reset',
        status: HttpStatus.OK,
        data: response,
      }),
    );
  }

  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('sample-size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.openSearchResultApi
      .search(
        query,
        ['title', 'description', 'result_official_code'],
        [
          {
            title: { order: 'asc' },
          },
        ],
        size,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Results found',
          data: response,
          status: HttpStatus.OK,
        }),
      );
  }
}

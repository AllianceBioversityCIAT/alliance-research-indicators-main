import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaService } from './clarisa.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SearchToOpenSearchEnum } from './anum/path.enum';

@ApiBearerAuth()
@ApiTags('Clarisa')
@Controller()
export class ClarisaController {
  constructor(private readonly clarisaService: ClarisaService) {}

  @Get('clone/execute')
  runCloneClarisa() {
    this.clarisaService.cloneAllClarisaEntities();
    return ResponseUtils.format({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  }

  @ApiParam({
    name: 'search',
    required: true,
    description: 'Search term',
  })
  @ApiParam({
    name: 'scope',
    enum: SearchToOpenSearchEnum,
    required: true,
    description: 'Scope of the search',
  })
  @ApiOperation({
    summary:
      'This enpoint is in charge of the connection with CLARISA and allows the search of information in opensearch.',
  })
  @Get('opensearch/:scope/:search')
  async openSearch(
    @Param('search') search: string,
    @Param('scope') scope: SearchToOpenSearchEnum,
  ) {
    return this.clarisaService.searchToOS(search, scope).then((countries) =>
      ResponseUtils.format({
        description: 'Countries found',
        data: countries,
        status: HttpStatus.OK,
      }),
    );
  }
}

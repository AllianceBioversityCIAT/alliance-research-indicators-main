import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ClarisaService } from './clarisa.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SearchToOpenSearchEnum } from './anum/path.enum';
import { PartnerRequestCliDataDto } from '../dto/partner-request-cli-data.dto';
import { MessagePattern } from '@nestjs/microservices';
import { LoggerUtil } from '../../shared/utils/logger.util';

@ApiBearerAuth()
@ApiTags('Clarisa')
@Controller()
export class ClarisaController {
  private readonly logger = new LoggerUtil({ name: ClarisaController.name });
  constructor(private readonly clarisaService: ClarisaService) {}

  @Get('clone/execute')
  runCloneClarisa() {
    return this.executeCloneEntities('HTTP Request');
  }

  @MessagePattern('clone-normal-entities')
  executeCloneNormalEntities() {
    return this.executeCloneEntities('Queue Execution');
  }

  private executeCloneEntities(type: string) {
    this.logger._log(`Starting clone process for ${type}`);
    this.clarisaService.cloneAllClarisaEntities();
    return ResponseUtils.format({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  }

  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Country code',
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
  @Get('opensearch/:scope/search')
  async openSearch(
    @Query('query') query: string,
    @Query('country') isoAlpha2: string,
    @Param('scope') scope: SearchToOpenSearchEnum,
  ) {
    if (!query) {
      return ResponseUtils.format({
        description: 'Query is required',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    return this.clarisaService
      .searchToOS(query, isoAlpha2, scope)
      .then((countries) =>
        ResponseUtils.format({
          description: 'Countries found',
          data: countries,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({
    summary:
      'This enpoint is in charge of the connection with CLARISA and allows the creation of a partner request.',
  })
  @ApiBody({
    type: PartnerRequestCliDataDto,
  })
  @Post('partner-request/create')
  async partnerRequest(@Body() partnerRequest: PartnerRequestCliDataDto) {
    return this.clarisaService.partnerRequest(partnerRequest).then((response) =>
      ResponseUtils.format({
        description: 'Partner request created',
        data: response,
        status: HttpStatus.OK,
      }),
    );
  }
}

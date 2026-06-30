import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Version,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateResultDto } from './dto/create-result.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdateGeneralInformation } from './dto/update-general-information.dto';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { ResultAlignmentDto } from './dto/result-alignment.dto';
import { SaveGeoLocationDto } from './dto/save-geo-location.dto';
import { QueryParseBool } from '../../shared/pipes/query-parse-boolean.pipe';
import { ListParseToArrayPipe } from '../../shared/pipes/list-parse-array.pipe';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { ResultRawAi, RootAi } from './dto/result-ai.dto';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import {
  GetResultVersion,
  ParamOrQueryEnum,
} from '../../shared/decorators/versioning.decorator';
import { getPortfolio } from '../../shared/decorators/portfolio.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { ResultSortEnum } from './enum/result-sort.enum';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from './enum/reporting-platform.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultSectionOrchestratorService } from './portfolio-handlers/application/result-section-orchestrator.service';
import { PortfolioUtil } from '../../shared/utils/portfolio.util';
@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
@Controller()
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly _resultsUtil: ResultsUtil,
    private readonly _alignmentOrchestrator: ResultSectionOrchestratorService,
    private readonly portfolioUtil: PortfolioUtil,
  ) {}

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
  @ApiQuery({
    name: 'contracts',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description: 'Is a reference to the contract',
  })
  @ApiQuery({
    name: 'primary-contract',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description:
      'This parameter allows you to display the primary contract of the result.',
  })
  @ApiQuery({
    name: 'levers',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description:
      'This parameter allows you to display the levers to which the result is linked.',
  })
  @ApiQuery({
    name: 'primary-lever',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description:
      'This parameter allows you to display the primary lever of the result.',
  })
  @ApiQuery({
    name: 'indicators',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description:
      'This parameter allows you to display the indicators to which the result is linked.',
  })
  @ApiQuery({
    name: 'result-status',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description:
      'This parameter allows you to display the status of the result.',
  })
  @ApiQuery({
    name: 'audit-data',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description:
      'This parameter allows you to display the audit data of the result.',
  })
  @ApiQuery({
    name: 'audit-data-object',
    required: false,
    type: String,
    description: 'This parameter allows you to display the audit data object.',
    enum: TrueFalseEnum,
  })
  @ApiQuery({
    name: 'sort-order',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
    description: 'Is a reference to the sort order',
  })
  @ApiQuery({
    name: 'indicator-codes',
    required: false,
    type: String,
    description: 'Is a reference to the type of indicator',
  })
  @ApiQuery({
    name: 'contract-codes',
    required: false,
    type: String,
    description: 'filter by contract codes',
  })
  @ApiQuery({
    name: 'lever-codes',
    required: false,
    type: String,
    description: 'filter by lever codes',
  })
  @ApiQuery({
    name: 'status-codes',
    required: false,
    type: String,
    description: 'filter by status codes',
  })
  @ApiQuery({
    name: 'years',
    required: false,
    type: String,
    description: 'filter by years',
  })
  @ApiQuery({
    name: 'create-user-codes',
    required: false,
    type: String,
    description: 'filter by user codes',
  })
  @ApiQuery({
    name: 'result-codes',
    required: false,
    type: String,
    description: 'filter by result codes',
  })
  @ApiQuery({
    name: 'platform-code',
    required: false,
    type: String,
    description: 'filter by platform code',
  })
  @ApiQuery({
    name: 'filter-primary-contract',
    required: false,
    type: String,
    description: 'filter by primary contract',
  })
  @ApiOperation({ summary: 'Find all results' })
  @Get()
  async find(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('contracts', QueryParseBool) contracts: boolean,
    @Query('primary-contract', QueryParseBool) primaryContract: boolean,
    @Query('levers', QueryParseBool) levers: boolean,
    @Query('primary-lever', QueryParseBool) primaryLever: boolean,
    @Query('indicators', QueryParseBool) indicators: boolean,
    @Query('result-status', QueryParseBool) resultStatus: boolean,
    @Query('audit-data', QueryParseBool) auditData: boolean,
    @Query('audit-data-object', QueryParseBool) auditDataObject: boolean,
    @Query('sort-order') sortOrder: string,
    @Query('indicator-codes', ListParseToArrayPipe) resultIndicator: string[],
    @Query('contract-codes', ListParseToArrayPipe) contractCodes: string[],
    @Query('lever-codes', ListParseToArrayPipe) leverCodes: string[],
    @Query('status-codes', ListParseToArrayPipe) statusCodes: string[],
    @Query('create-user-codes', ListParseToArrayPipe) userCode: string[],
    @Query('years', ListParseToArrayPipe) years: string[],
    @Query('result-codes', ListParseToArrayPipe) resultCodes: string[],
    @Query('platform-code', ListParseToArrayPipe) platform_code: string[],
    @Query('filter-primary-contract', ListParseToArrayPipe)
    filterPrimaryContract: string[],
  ) {
    return this.resultsService
      .findResults({
        contracts: contracts,
        levers: levers,
        indicators: indicators,
        result_status: resultStatus,
        result_audit_data: auditData,
        primary_contract: primaryContract,
        primary_lever: primaryLever,
        result_audit_data_objects: auditDataObject,
        indicator_code: resultIndicator,
        page: +page,
        limit: +limit,
        sort_order: sortOrder,
        contract_codes: contractCodes,
        lever_codes: leverCodes,
        status_codes: statusCodes,
        user_codes: userCode,
        years: years,
        resultCodes: resultCodes,
        platform_code: platform_code,
        filter_primary_contract: filterPrimaryContract,
      })
      .then((el) =>
        ResponseUtils.format({
          description: 'Results found',
          status: HttpStatus.OK,
          data: el,
        }),
      );
  }

  @Get()
  @Version('2')
  @ApiOperation({ summary: 'Find all results v2' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Is a reference to the search',
  })
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
  @ApiQuery({
    name: 'sort-order',
    required: false,
    type: String,
    enum: ['DESC', 'ASC'],
    default: 'DESC',
    description: 'Is a reference to the sort order',
  })
  @ApiQuery({
    name: 'sort-field',
    required: false,
    type: String,
    enum: ResultSortEnum,
    description: 'Is a reference to the sort field',
  })
  @ApiQuery({
    name: 'status-codes',
    required: false,
    type: String,
    description: 'filter by status codes',
  })
  @ApiQuery({
    name: 'contract-codes',
    required: false,
    type: String,
    description: 'filter by contract codes',
  })
  @ApiQuery({
    name: 'years',
    required: false,
    type: String,
    description: 'filter by years',
  })
  @ApiQuery({
    name: 'platform-code',
    required: false,
    type: String,
    description: 'filter by platform code',
  })
  @ApiQuery({
    name: 'indicators',
    required: false,
    type: String,
    description: 'filter by indicators',
  })
  @ApiQuery({
    name: 'only-own-results',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description: 'filter by only own results',
  })
  async findResultv2(
    @Query('search') search: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sort-order', new DefaultValuePipe('DESC'))
    sortOrder: 'ASC' | 'DESC',
    @Query('sort-field', new DefaultValuePipe(ResultSortEnum.CODE))
    sortField: ResultSortEnum,
    @Query('status-codes', ListParseToArrayPipe)
    statusCodes: ResultStatusEnum[],
    @Query('contract-codes', ListParseToArrayPipe) contractCodes: string[],
    @Query('years', ListParseToArrayPipe) years: string[],
    @Query('platform-code', ListParseToArrayPipe)
    platformCode: ReportingPlatformEnum[],
    @Query('indicators', ListParseToArrayPipe)
    indicators: IndicatorsEnum[],
    @Query('only-own-results', QueryParseBool) onlyOwnResults: boolean,
  ) {
    return this.resultsService
      .findResultv2(
        search,
        { page: +page, limit: +limit },
        { field: sortField, order: sortOrder },
        {
          status: statusCodes,
          contracts: contractCodes,
          years: years,
          sources: platformCode,
          indicators: indicators,
          onlyOwnResults: onlyOwnResults,
        },
      )
      .then((el) =>
        ResponseUtils.format({
          description: 'Results found',
          status: HttpStatus.OK,
          data: el,
        }),
      );
  }

  @Get(`versions/${RESULT_CODE}`)
  @GetResultVersion()
  @ApiOperation({ summary: 'Find all results versions' })
  async findAllVersions() {
    return this.resultsService
      .findResultVersions(
        this._resultsUtil.resultCode,
        this._resultsUtil.platformCode,
      )
      .then((el) =>
        ResponseUtils.format({
          description: 'Results versions found',
          status: HttpStatus.OK,
          data: el,
        }),
      );
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

  @ApiOperation({ summary: 'Delete a result' })
  @GetResultVersion()
  @Delete(`${RESULT_CODE}/delete`)
  async deleteResult() {
    return this.resultsService
      .deleteResult(this._resultsUtil.resultId)
      .then(() =>
        ResponseUtils.format({
          description: 'Result deleted',
          status: HttpStatus.OK,
        }),
      );
  }

  @UseGuards(ResultStatusGuard)
  @ApiOperation({ summary: 'Update general information' })
  @GetResultVersion()
  @ApiQuery({
    name: 'return',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description: 'Is a reference to return data',
  })
  @Patch(`${RESULT_CODE}/general-information`)
  async updateGeneralInformation(
    @Query('return') returnData: TrueFalseEnum,
    @Body() generalInformation: UpdateGeneralInformation,
  ) {
    return this.resultsService
      .updateGeneralInfo(
        this._resultsUtil.resultId,
        generalInformation,
        returnData,
      )
      .then((result) =>
        ResponseUtils.format({
          description: 'General information was updated correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Find general information' })
  @GetResultVersion()
  @Get(`${RESULT_CODE}/general-information`)
  async findGeneralInformation() {
    return this.resultsService
      .findGeneralInfo(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'General information was found correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  //TODO: This post will remain open for comments while you review the new one related to the portfolio.
  /*@ApiOperation({ summary: 'Update alignments' })
  @GetResultVersion()
  @ApiQuery({
    name: 'return',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description: 'Is a reference to return data',
  })
  @UseGuards(ResultStatusGuard)
  @Patch(`${RESULT_CODE}/alignments`)
  async updateResultAlignments(
    @Query('return') returnData: TrueFalseEnum,
    @Body() generalInformation: ResultAlignmentDto,
  ) {
    return this.resultsService
      .updateResultAlignment(
        this._resultsUtil.resultId,
        generalInformation,
        returnData,
      )
      .then((result) =>
        ResponseUtils.format({
          description: 'Alignments was updated correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }*/

  //TODO: This post will remain open for comments while you review the new one related to the portfolio.
  /*@ApiOperation({ summary: 'Find alignments' })
  @GetResultVersion()
  @Get(`${RESULT_CODE}/alignments`)
  async findResultAlignments() {
    return this.resultsService
      .findResultAlignment(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'alignments was found correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }*/

  //TODO: This endpoint remains under observation until we decide to use it or not
  @ApiOperation({
    summary: 'Find alignments via portfolio handler orchestrator',
    description:
      'Same response shape as GET /alignments. Routes through PortfolioUtil and AlignmentHandlerRegistry.',
  })
  @GetResultVersion()
  @getPortfolio(ParamOrQueryEnum.QUERY, false)
  @Get(`${RESULT_CODE}/alignments`)
  async findResultAlignmentsHandlerFlow() {
    return this._alignmentOrchestrator
      .findAlignment(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'alignments was found correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  //TODO: This endpoint remains under observation until we decide to use it or not
  @ApiOperation({
    summary: 'Update alignments via portfolio handler orchestrator',
    description:
      'Same response shape as PATCH /alignments. Routes through PortfolioUtil and AlignmentHandlerRegistry.',
  })
  @GetResultVersion()
  @getPortfolio(ParamOrQueryEnum.QUERY, false)
  @ApiQuery({
    name: 'return',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description: 'Is a reference to return data',
  })
  @ApiBody({ type: ResultAlignmentDto })
  @UseGuards(ResultStatusGuard)
  @Patch(`${RESULT_CODE}/alignments`)
  async updateResultAlignmentsHandlerFlow(
    @Query('return') returnData: TrueFalseEnum,
    @Body() alignmentData: ResultAlignmentDto,
  ) {
    return this._alignmentOrchestrator
      .saveAlignment(this._resultsUtil.resultId, alignmentData, returnData)
      .then((result) =>
        ResponseUtils.format({
          description: 'Alignments was updated correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Validate result title' })
  @ApiQuery({
    name: 'title',
    required: true,
    type: String,
    description: 'The title to be validated',
  })
  @Get(`validate-title`)
  async validateResultTitle(@Query('title') title: string) {
    const isValid = await this.resultsService.validateResultTitle(title);
    return ResponseUtils.format({
      description: 'Result title validation',
      data: { isValid },
      status: HttpStatus.OK,
    });
  }

  @ApiOperation({ summary: 'Update metadata' })
  @GetResultVersion()
  @Get(`${RESULT_CODE}/metadata`)
  async findMetadata() {
    return this.resultsService
      .findMetadataResult(
        this._resultsUtil.resultId,
        this.portfolioUtil.portfolioId,
      )
      .then((result) =>
        ResponseUtils.format({
          description: 'Metadata was found correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Find general report' })
  @Get('general-report/all')
  async findGeneralReport() {
    return this.resultsService.generalReport().then((result) =>
      ResponseUtils.format({
        description: 'General report was found correctly',
        data: result,
        status: HttpStatus.OK,
      }),
    );
  }

  @ApiOperation({ summary: 'The result created from the ia is formalized' })
  @Post('ai/formalize')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async formalizeAIResult(@Body() resultAi: ResultRawAi) {
    return this.resultsService.formalizeResult(resultAi).then((data) =>
      ResponseUtils.format({
        data: data,
        description: data.error
          ? (data?.['message_error'] ?? 'Error creating AI Result')
          : 'AI Result created',
        status: data.error ? HttpStatus.BAD_REQUEST : HttpStatus.CREATED,
      }),
    );
  }

  @ApiOperation({ summary: 'Create results from AI bulk' })
  @Post('ai/formalize/bulk')
  @Roles(
    SecRolesEnum.TECHNICAL_SUPPORT,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.MEL_REGIONAL_EXPERT,
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiBody({ type: RootAi })
  async createResultFromAiBulk(
    @Body()
    data: RootAi,
  ) {
    return this.resultsService.createResultFromAiBulk(data).then((data) =>
      ResponseUtils.format({
        data: data,
        description: 'AI Results created',
        status: HttpStatus.CREATED,
      }),
    );
  }

  @ApiOperation({ summary: 'Save data for Geo Location' })
  @UseGuards(ResultStatusGuard)
  @GetResultVersion()
  @Patch(`${RESULT_CODE}/geo-location`)
  async saveGeoLocation(@Body() geoLocation: SaveGeoLocationDto) {
    return this.resultsService
      .saveGeoLocation(this._resultsUtil.resultId, geoLocation)
      .then((result) =>
        ResponseUtils.format({
          description: 'Geo Location was saved correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Find data for Geo Location' })
  @GetResultVersion()
  @Get(`${RESULT_CODE}/geo-location`)
  async findGeoLocation() {
    return this.resultsService
      .findGeoLocation(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Geo Location was found correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Find last updated results' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Is a reference to the limit of items per page',
  })
  @Get('last-updated/current-user')
  async findLastUpdatedResults(@Query('limit') limit: number = 3) {
    return this.resultsService
      .findLastUpdatedResultByCurrentUser(limit)
      .then((result) =>
        ResponseUtils.format({
          description: 'Results found',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }
}

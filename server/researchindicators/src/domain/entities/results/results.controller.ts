import {
  Body,
  Controller,
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
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
@Controller()
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly _resultsUtil: ResultsUtil,
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

  @Get(`versions/${RESULT_CODE}`)
  @GetResultVersion()
  @ApiOperation({ summary: 'Find all results versions' })
  async findAllVersions() {
    return this.resultsService
      .findResultVersions(this._resultsUtil.resultCode)
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

  @ApiOperation({ summary: 'Update alignments' })
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
  }

  @ApiOperation({ summary: 'Find alignments' })
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
      .findMetadataResult(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Metadata was found correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'The result created from the ia is formalized' })
  @Post('ai/formalize')
  async formalizeAIResult(@Body() resultAi: ResultRawAi) {
    return this.resultsService.formalizeResult(resultAi).then((data) =>
      ResponseUtils.format({
        data: data,
        description: data.error
          ? 'Error creating AI Result'
          : 'AI Result created',
        status: data.error ? HttpStatus.BAD_GATEWAY : HttpStatus.CREATED,
      }),
    );
  }

  @ApiOperation({ summary: 'Create results from AI bulk' })
  @Post('ai/formalize/bulk')
  @Roles(SecRolesEnum.DEVELOPER)
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
    return this.resultsService
      .createResultFromAiBulk(data.results)
      .then((data) =>
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

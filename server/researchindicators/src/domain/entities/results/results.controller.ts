import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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
import { ResultRawAi } from './dto/result-ai.dto';
@ApiTags('Results')
@ApiBearerAuth()
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
      })
      .then((el) =>
        ResponseUtils.format({
          description: 'Results found',
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
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @Delete(':resultId/delete')
  async deleteResult(@Param('resultId') resultId: string) {
    return this.resultsService.deleteResult(+resultId).then(() =>
      ResponseUtils.format({
        description: 'Result deleted',
        status: HttpStatus.OK,
      }),
    );
  }

  @UseGuards(ResultStatusGuard)
  @ApiOperation({ summary: 'Update general information' })
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @ApiQuery({
    name: 'return',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description: 'Is a reference to return data',
  })
  @Patch(':resultId/general-information')
  async updateGeneralInformation(
    @Param('resultId') resultId: string,
    @Query('return') returnData: TrueFalseEnum,
    @Body() generalInformation: UpdateGeneralInformation,
  ) {
    return this.resultsService
      .updateGeneralInfo(+resultId, generalInformation, returnData)
      .then((result) =>
        ResponseUtils.format({
          description: 'General information was updated correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Find general information' })
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @Get(':resultId/general-information')
  async findGeneralInformation(@Param('resultId') resultId: string) {
    return this.resultsService.findGeneralInfo(+resultId).then((result) =>
      ResponseUtils.format({
        description: 'General information was found correctly',
        data: result,
        status: HttpStatus.OK,
      }),
    );
  }

  @ApiOperation({ summary: 'Update alignments' })
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @ApiQuery({
    name: 'return',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    description: 'Is a reference to return data',
  })
  @UseGuards(ResultStatusGuard)
  @Patch(':resultId/alignments')
  async updateResultAlignments(
    @Param('resultId') resultId: string,
    @Query('return') returnData: TrueFalseEnum,
    @Body() generalInformation: ResultAlignmentDto,
  ) {
    return this.resultsService
      .updateResultAlignment(+resultId, generalInformation, returnData)
      .then((result) =>
        ResponseUtils.format({
          description: 'Alignments was updated correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Find alignments' })
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @Get(':resultId/alignments')
  async findResultAlignments(@Param('resultId') resultId: string) {
    return this.resultsService.findResultAlignment(+resultId).then((result) =>
      ResponseUtils.format({
        description: 'alignments was found correctly',
        data: result,
        status: HttpStatus.OK,
      }),
    );
  }

  @ApiOperation({ summary: 'Update metadata' })
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @Get(':resultId/metadata')
  async findMetadata(@Param('resultId') resultId: string) {
    return this.resultsService.findMetadataResult(+resultId).then((result) =>
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
        description: 'AI Result created',
        status: HttpStatus.CREATED,
      }),
    );
  }

  @ApiOperation({ summary: 'Save data for Geo Location' })
  @UseGuards(ResultStatusGuard)
  @Patch(':resultId/geo-location')
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  async saveGeoLocation(
    @Param('resultId') resultId: string,
    @Body() geoLocation: SaveGeoLocationDto,
  ) {
    return this.resultsService
      .saveGeoLocation(+resultId, geoLocation)
      .then((result) =>
        ResponseUtils.format({
          description: 'Geo Location was saved correctly',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiOperation({ summary: 'Find data for Geo Location' })
  @Get(':resultId/geo-location')
  @ApiParam({
    name: 'resultId',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  async findGeoLocation(@Param('resultId') resultId: string) {
    return this.resultsService.findGeoLocation(+resultId).then((result) =>
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

  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Is a reference to the year',
  })
  @Get('transform/result-code/:resultCode(\\d+)')
  async transformResultCode(
    @Param('resultCode') resultCode: string,
    @Query('year') year?: string,
  ) {
    return this.resultsService
      .getResultIdByOfficialCode(+resultCode, +year)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result code transformed',
          data: result,
          status: HttpStatus.OK,
        }),
      );
  }
}

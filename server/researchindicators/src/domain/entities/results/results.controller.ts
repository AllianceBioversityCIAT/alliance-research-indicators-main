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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateResultDto } from './dto/create-result.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdateGeneralInformation } from './dto/update-general-information.dto';
import { DataReturnEnum } from '../../shared/enum/queries.enum';
import { ResultAlignmentDto } from './dto/result-alignment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  QueryIndicators,
  QueryIndicatorsEnum,
} from '../indicators/enum/indicators.enum';
import { SaveGeoLocationDto } from './dto/save-geo-location.dto';
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
    name: 'type',
    required: false,
    type: String,
    enum: QueryIndicatorsEnum,
    description: 'Is a reference to the type of indicator',
  })
  @ApiOperation({ summary: 'Find all results' })
  @Get()
  async find(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('type') type: QueryIndicatorsEnum,
  ) {
    return this.resultsService
      .findResults(
        { page: +page, limit: +limit },
        QueryIndicators.getFromName(type)?.value,
      )
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
  @Delete(':id/delete')
  async deleteResult(@Param('resultId') resultId: string) {
    return this.resultsService.deleteResult(+resultId).then(() =>
      ResponseUtils.format({
        description: 'Result deleted',
        status: HttpStatus.OK,
      }),
    );
  }

  @ApiOperation({ summary: 'Update general information' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @ApiQuery({
    name: 'return',
    required: false,
    type: String,
    enum: DataReturnEnum,
    description: 'Is a reference to return data',
  })
  @Patch(':id/general-information')
  async updateGeneralInformation(
    @Param('id') resultId: string,
    @Query('return') returnData: DataReturnEnum,
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
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @Get(':id/general-information')
  async findGeneralInformation(@Param('id') resultId: string) {
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
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @ApiQuery({
    name: 'return',
    required: false,
    type: String,
    enum: DataReturnEnum,
    description: 'Is a reference to return data',
  })
  @Patch(':id/alignments')
  async updateResultAlignments(
    @Param('id') resultId: string,
    @Query('return') returnData: DataReturnEnum,
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
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @Get(':id/alignments')
  async findResultAlignments(@Param('id') resultId: string) {
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
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  @Get(':id/metadata')
  async findMetadata(@Param('id') resultId: string) {
    return this.resultsService.findMetadataResult(+resultId).then((result) =>
      ResponseUtils.format({
        description: 'Metadata was found correctly',
        data: result,
        status: HttpStatus.OK,
      }),
    );
  }

  @Post('ai/create')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async createAIResult(@UploadedFile() file: Express.Multer.File) {
    return this.resultsService.createResultFromAiRoar(file).then((data) =>
      ResponseUtils.format({
        data: data,
        description: 'AI Result created',
        status: HttpStatus.CREATED,
      }),
    );
  }

  @ApiOperation({ summary: 'Save data for Geo Location' })
  @Patch(':id/geo-location')
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  async saveGeoLocation(
    @Param('id') resultId: string,
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
  @Get(':id/geo-location')
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'Is a reference to the result id',
  })
  async findGeoLocation(@Param('id') resultId: string) {
    return this.resultsService.findGeoLocation(+resultId).then((result) =>
      ResponseUtils.format({
        description: 'Geo Location was found correctly',
        data: result,
        status: HttpStatus.OK,
      }),
    );
  }
}

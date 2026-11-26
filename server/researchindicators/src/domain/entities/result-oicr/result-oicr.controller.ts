import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Query,
  StreamableFile,
  UseInterceptors,
} from '@nestjs/common';
import { ResultOicrService } from './result-oicr.service';
import { OicrWordTemplateService } from './word-template/oicr-word-template.service';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetResultVersion,
  ParamOrQueryEnum,
} from '../../shared/decorators/versioning.decorator';
import {
  RESULT_CODE,
  RESULT_CODE_PARAM,
  ResultsUtil,
} from '../../shared/utils/results.util';
import { CreateResultOicrDto } from './dto/create-result-oicr.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdateOicrDto } from './dto/update-oicr.dto';
import { isEmpty } from '../../shared/utils/object.utils';
import { OicrCatalogsService } from './oicr-catalogs.service';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ResultOicrController {
  constructor(
    private readonly resultOicrService: ResultOicrService,
    private readonly resultUtil: ResultsUtil,
    private readonly oicrWordTemplateService: OicrWordTemplateService,
    private readonly oicrCatalogsService: OicrCatalogsService,
  ) {}

  @Get('catalogs/audiences')
  @ApiOperation({ summary: 'List the OICR audience catalog' })
  async getAudiencesCatalog() {
    return this.oicrCatalogsService.findAudiences().then((result) =>
      ResponseUtils.format({
        data: result,
        description: 'OICR audiences retrieved successfully',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get('catalogs/thematic-keywords')
  @ApiOperation({ summary: 'List the OICR thematic keywords catalog' })
  async getThematicKeywordsCatalog() {
    return this.oicrCatalogsService.findThematicKeywords().then((result) =>
      ResponseUtils.format({
        data: result,
        description: 'OICR thematic keywords retrieved successfully',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get('catalogs/quantification-unit-categories')
  @ApiOperation({
    summary: 'List the quantification unit categories catalog',
    description:
      'Macro-categories with their sub-categories; is_percentage marks units shown as a percentage.',
  })
  async getQuantificationUnitCategoriesCatalog() {
    return this.oicrCatalogsService
      .findQuantificationUnitCategories()
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Quantification unit categories retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch(`${RESULT_CODE}`)
  @GetResultVersion()
  @ApiBody({ type: UpdateOicrDto })
  async updateResultOicrSteps(@Body() data: UpdateOicrDto) {
    return this.resultOicrService
      .updateOicr(this.resultUtil.resultId, data)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Result OICR updated successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(`${RESULT_CODE}`)
  @GetResultVersion()
  async getResultOicrSteps() {
    return this.resultOicrService
      .findOicrs(this.resultUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Result OICR steps retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(`${RESULT_CODE}/modal`)
  @GetResultVersion()
  async getResultOicrModal() {
    return this.resultOicrService
      .findModal(this.resultUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Result OICR modal retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch()
  @GetResultVersion(ParamOrQueryEnum.QUERY)
  @ApiBody({ type: CreateResultOicrDto })
  async createResultOicr(
    @Body() data: CreateResultOicrDto,
    @Query(`${RESULT_CODE_PARAM}`) resultCode: string,
  ) {
    return this.resultOicrService
      .createOicr(
        data,
        undefined,
        ReportingPlatformEnum.STAR,
        this.resultUtil.nullResultId,
      )
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: isEmpty(resultCode)
            ? 'Result OICR created successfully'
            : 'Result OICR updated successfully',
          status: isEmpty(resultCode) ? HttpStatus.CREATED : HttpStatus.OK,
        }),
      );
  }

  @Get('word-template/' + RESULT_CODE)
  @GetResultVersion()
  @ApiOperation({ summary: 'Download the filled 2026 OICR Word template' })
  @ApiProduces(DOCX_MIME)
  @ApiOkResponse({
    description: 'Filled OICR Word document',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadWordTemplate(): Promise<StreamableFile> {
    const resultId = this.resultUtil.resultId;
    const indicatorId = this.resultUtil.indicatorId;
    const resultCode = this.resultUtil.resultCode;
    const document = await this.oicrWordTemplateService.download(
      resultId,
      indicatorId,
      resultCode,
    );
    return new StreamableFile(document, {
      type: DOCX_MIME,
      disposition: `attachment; filename="${oicrWordTemplateFilename(resultCode)}"`,
    });
  }

  @Get(`details/${RESULT_CODE}`)
  @GetResultVersion()
  async getWordTemplate() {
    return this.resultOicrService
      .getResultOicrDetailsByOfficialCode(this.resultUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Result OICR word template retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }
}

/** Server local clock: `STAR_OICR_<code>_<yyyyMMdd>_<HHmm>.docx`. */
function oicrWordTemplateFilename(
  resultCode: number,
  now = new Date(),
): string {
  const yyyy = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `STAR_OICR_${resultCode}_${yyyy}${month}${day}_${hours}${minutes}.docx`;
}

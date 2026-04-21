import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Query,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ReportsGenerationService } from './reports-generation.service';
import { ResultSortEnum } from '../results/enum/result-sort.enum';
import { ListParseToArrayPipe } from '../../shared/pipes/list-parse-array.pipe';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';
import { QueryParseBool } from '../../shared/pipes/query-parse-boolean.pipe';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { FullFiltersReportDto } from './dto/filters-report.dto';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
@Controller()
export class ReportsController {
  private readonly allowedWorkbookKeys = new Set(['star_results_metadata']);

  constructor(
    private readonly reportsGeneration: ReportsGenerationService,
    private readonly currentUser: CurrentUserUtil,
  ) {}

  @Get('resultCenter/xlsx')
  @ApiOperation({
    summary: 'Download a parameterized Excel workbook by workbook_key',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Is a reference to the search',
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
  async downloadWorkbook(
    @Query('search') search: string,
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
  ): Promise<StreamableFile> {
    const workbookKey = 'star_results_metadata';
    if (!this.allowedWorkbookKeys.has(workbookKey)) {
      throw new BadRequestException(
        `Unsupported workbook_key: ${workbookKey}. Allowed: ${[...this.allowedWorkbookKeys].join(', ')}`,
      );
    }
    const filters: FullFiltersReportDto = {
      filters: {
        search: search,
        statusCodes: statusCodes,
        contractCodes: contractCodes,
        years: years,
        platformCode: platformCode,
        indicators: indicators,
        onlyOwnResults: onlyOwnResults,
        currentUserId: this.currentUser.user_id,
      },
      sorting: {
        sortOrder: sortOrder,
        sortField: sortField,
      },
    };

    const buffer = await this.reportsGeneration.buildWorkbookXlsxBuffer(
      workbookKey,
      filters,
    );
    const date = new Date().toISOString().split('T')[0];
    const filename = `${workbookKey}_${date}.xlsx`;
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}

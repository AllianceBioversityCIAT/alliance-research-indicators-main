import {
  Controller,
  Body,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { ResultOwner } from '../../shared/decorators/result-owner.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ResultsUtil } from '../../shared/utils/results.util';
import { BilateralService } from './bilateral.service';
import { BilateralHlosIndicatorsResponse } from './dto/bilateral-hlos-indicators.response.dto';
import { ListIndicatorsQueryDto } from './dto/list-indicators-query.dto';
import { ContributionDto } from './dto/upsert-indicator-mapping.dto';
import { UpdatePoolFundingAlignmentDto } from './dto/update-pool-funding-alignment.dto';

type RequestWithUser = Request & { user?: User };

@ApiTags('Bilateral')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
@Controller()
export class BilateralController {
  constructor(
    private readonly bilateralService: BilateralService,
    private readonly resultsUtil: ResultsUtil,
  ) {}

  @Get()
  @Version('1')
  @GetResultVersion()
  @ApiOperation({ summary: 'Find pool funding alignment' })
  async getAlignment(@Req() request: RequestWithUser) {
    return this.bilateralService
      .getAlignment(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
        request.user,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Pool funding alignment found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('science-programs')
  @Version('1')
  @GetResultVersion()
  @ApiOperation({
    summary:
      'Get Science Programs linked to the result’s mapped bilateral project (R-BIL-076)',
  })
  async getScienceProgramsForResult() {
    return this.bilateralService
      .getScienceProgramsForResult(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Bilateral science programs found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090, R-BIL-091, R-BIL-097
  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090 (Swagger: design §5)
  //
  // No query params — per-SP, per-allowed-level ToC catalogs are sourced from
  // lambda-toc for the mapped bilateral project (frozen FE envelope, design
  // §5 / §6.1). Always 200 (empty catalogs included); 404 unknown result,
  // 503 cold-cache upstream failure.
  @Get('hlos-indicators')
  @Version('1')
  @GetResultVersion()
  @ApiOperation({
    summary:
      'Get the per-SP, per-allowed-level ToC catalogs for the mapped bilateral project (R-BIL-090)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BilateralHlosIndicatorsResponse,
    description:
      'Frozen FE envelope (design §5) inside the standard ServerResponseDto wrapper — empty catalogs are valid 200s (R-BIL-090 AC.5)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Result not found',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description:
      'lambda-toc unavailable with a cold catalog cache (NFR-BIL-090)',
  })
  async getHlosIndicatorsForResult() {
    return this.bilateralService
      .getHlosIndicatorsForResult(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Bilateral HLOs and indicators found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('indicators')
  @Version('1')
  @GetResultVersion()
  @ApiOperation({ summary: 'List pool funding indicators by selected SP' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'indicator-type', required: false, type: String })
  async listIndicators(
    @Req() request: RequestWithUser,
    @Query('search') search?: string,
    @Query('indicator-type') indicatorType?: string,
  ) {
    const query: ListIndicatorsQueryDto = {
      search,
      indicator_type: indicatorType,
    };

    return this.bilateralService
      .listIndicators(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
        query,
        request.user,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Pool funding indicators found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092..095, R-BIL-097
  // (Swagger only — route, guards, and roles unchanged. Body gains the
  // optional `toc_alignments[]` via the extended DTO; error statuses below
  // mirror the design §5 PATCH contract.)
  @Patch()
  @Version('1')
  @GetResultVersion()
  @ApiOperation({
    summary:
      'Update pool funding alignment (optionally with per-SP toc_alignments — R-BIL-092)',
  })
  @ApiBody({
    type: UpdatePoolFundingAlignmentDto,
    description:
      'Pool funding alignment payload. Optional toc_alignments[] upserts one ToC answer per sp_code; omitted = saved ToC rows untouched.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Validation failure — legacy errors.unknown_sp_codes (unchanged contract), or atomic per-alignment errors.toc_alignments[{ sp_code, field, error }] with error ∈ duplicate_sp_code | sp_not_selected | missing_required_fields | level_not_allowed | unknown_toc_result_id | unknown_indicator_id (R-BIL-094; nothing persisted, D-V2-8)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Result not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Result is PRMS-sourced or already synced to PRMS (unchanged contracts); or errors.code = toc_mapping_version_locked when toc_alignments is present and the result’s live version ≠ 2026 (R-BIL-097)',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description:
      'lambda-toc unavailable with a cold catalog cache during toc_alignments validation — nothing persisted (NFR-BIL-090)',
  })
  @Roles(
    SecRolesEnum.CONTRIBUTOR,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.SYSTEM_ADMIN,
  )
  @ResultOwner()
  @UseGuards(RolesGuard, ResultOwnerGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateAlignment(
    @Req() request: RequestWithUser,
    @Body() payload: UpdatePoolFundingAlignmentDto,
  ) {
    return this.bilateralService
      .updateAlignment(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
        payload,
        request.user,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Pool funding alignment updated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Post('indicators/:indicatorCode/contribution')
  @Version('1')
  @GetResultVersion()
  @ApiOperation({ summary: 'Create pool funding indicator contribution' })
  @ApiParam({ name: 'indicatorCode', type: String })
  @ApiQuery({ name: 'lever-code', required: true, type: String })
  @ApiBody({ type: ContributionDto })
  @Roles(
    SecRolesEnum.CONTRIBUTOR,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.SYSTEM_ADMIN,
  )
  @ResultOwner()
  @UseGuards(RolesGuard, ResultOwnerGuard)
  async createContribution(
    @Req() request: RequestWithUser,
    @Param('indicatorCode') indicatorCode: string,
    @Query('lever-code') leverCode: string,
    @Body() payload: ContributionDto,
  ) {
    return this.bilateralService
      .upsertContribution(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
        indicatorCode,
        payload,
        request.user,
        leverCode,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Pool funding indicator contribution saved',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Patch('indicators/:indicatorCode/contribution')
  @Version('1')
  @GetResultVersion()
  @ApiOperation({ summary: 'Update pool funding indicator contribution' })
  @ApiParam({ name: 'indicatorCode', type: String })
  @ApiQuery({ name: 'lever-code', required: true, type: String })
  @ApiBody({ type: ContributionDto })
  @Roles(
    SecRolesEnum.CONTRIBUTOR,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.SYSTEM_ADMIN,
  )
  @ResultOwner()
  @UseGuards(RolesGuard, ResultOwnerGuard)
  async updateContribution(
    @Req() request: RequestWithUser,
    @Param('indicatorCode') indicatorCode: string,
    @Query('lever-code') leverCode: string,
    @Body() payload: ContributionDto,
  ) {
    return this.bilateralService
      .upsertContribution(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
        indicatorCode,
        payload,
        request.user,
        leverCode,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Pool funding indicator contribution updated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Delete('indicators/:indicatorCode/contribution')
  @Version('1')
  @GetResultVersion()
  @ApiOperation({ summary: 'Delete pool funding indicator contribution' })
  @ApiParam({ name: 'indicatorCode', type: String })
  @ApiQuery({ name: 'lever-code', required: true, type: String })
  @Roles(
    SecRolesEnum.CONTRIBUTOR,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.SYSTEM_ADMIN,
  )
  @ResultOwner()
  @UseGuards(RolesGuard, ResultOwnerGuard)
  async deleteContribution(
    @Req() request: RequestWithUser,
    @Param('indicatorCode') indicatorCode: string,
    @Query('lever-code') leverCode: string,
  ) {
    return this.bilateralService
      .deleteContribution(
        this.resultsUtil.resultId,
        String(this.resultsUtil.resultCode),
        indicatorCode,
        request.user,
        leverCode,
      )
      .then(() =>
        ResponseUtils.format({
          description: 'Pool funding indicator contribution deleted',
          status: HttpStatus.OK,
          data: null,
        }),
      );
  }
}

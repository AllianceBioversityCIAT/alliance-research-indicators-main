import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequestWithUser } from '../../shared/global-dto/request-with-user.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { NotContributorOnlyGuard } from './guards/not-contributor-only.guard';
import { PooledFundingMonitorService } from './pooled-funding-monitor.service';
import {
  PfmProjectParamDto,
  PfmQueueQueryDto,
  PfmSummaryQueryDto,
} from './dto/pfm-query.dto';
import {
  PfmQueueResponseDto,
  PfmResultRowDto,
  PfmSummaryResponseDto,
} from './dto/pfm-response.dto';
import { PfmChipEnum } from './enum/pfm-chip.enum';
import { PfmScopeEnum } from './enum/pfm-scope.enum';
import { PfmStatusFilterEnum } from './enum/pfm-status-filter.enum';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05

const queryPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false,
});

const SCOPE_QUERY = {
  name: 'scope',
  required: false,
  enum: PfmScopeEnum,
  description: "'mine' (default) or 'all'",
} as const;

/**
 * Read-only monitor of Pool-funding results vs PRMS (R-PFM-014: GET only).
 * Unversioned: no `@Version`, mounted at `/api/pooled-funding-monitor` by
 * `main.routes.ts`. The PI scope comes from `request.user`, never from input.
 */
@ApiTags('Pooled Funding Monitor')
@ApiBearerAuth()
@UseGuards(NotContributorOnlyGuard)
@UsePipes(queryPipe)
@Controller()
export class PooledFundingMonitorController {
  constructor(private readonly service: PooledFundingMonitorService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Pooled funding monitor: KPIs, pipeline, SP coverage, monthly syncs',
  })
  @ApiQuery(SCOPE_QUERY)
  @ApiOkResponse({ type: PfmSummaryResponseDto })
  async getSummary(
    @Req() req: RequestWithUser,
    @Query() query: PfmSummaryQueryDto,
  ) {
    return ResponseUtils.format({
      description: 'Pooled funding monitor summary',
      status: HttpStatus.OK,
      data: await this.service.getSummary(req.user.sec_user_id, query.scope),
    });
  }

  @Get('queue')
  @ApiOperation({
    summary:
      'Pooled funding monitor: filter options, chip counts, project groups',
  })
  @ApiQuery(SCOPE_QUERY)
  @ApiQuery({ name: 'project', required: false, type: String })
  @ApiQuery({ name: 'sp', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: PfmStatusFilterEnum })
  @ApiQuery({ name: 'type', required: false, type: Number })
  @ApiQuery({ name: 'chip', required: false, enum: PfmChipEnum })
  @ApiOkResponse({ type: PfmQueueResponseDto })
  async getQueue(
    @Req() req: RequestWithUser,
    @Query() query: PfmQueueQueryDto,
  ) {
    return ResponseUtils.format({
      description: 'Pooled funding monitor queue',
      status: HttpStatus.OK,
      data: await this.service.getQueue(req.user.sec_user_id, query),
    });
  }

  @Get('queue/projects/:projectCode/results')
  @ApiOperation({
    summary:
      'Pooled funding monitor: ranked results of one project (404 when the project is outside the viewer scope)',
  })
  @ApiParam({ name: 'projectCode', type: String })
  @ApiQuery(SCOPE_QUERY)
  @ApiQuery({ name: 'project', required: false, type: String })
  @ApiQuery({ name: 'sp', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: PfmStatusFilterEnum })
  @ApiQuery({ name: 'type', required: false, type: Number })
  @ApiQuery({ name: 'chip', required: false, enum: PfmChipEnum })
  @ApiOkResponse({ type: [PfmResultRowDto] })
  async getProjectResults(
    @Req() req: RequestWithUser,
    @Param() params: PfmProjectParamDto,
    @Query() query: PfmQueueQueryDto,
  ) {
    return ResponseUtils.format({
      description: 'Pooled funding monitor project results',
      status: HttpStatus.OK,
      data: await this.service.getProjectResults(
        req.user.sec_user_id,
        params.projectCode,
        query,
      ),
    });
  }
}

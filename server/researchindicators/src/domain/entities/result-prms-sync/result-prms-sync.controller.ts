import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResultOwner } from '../../shared/decorators/result-owner.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ResultsUtil } from '../../shared/utils/results.util';
import {
  PRMS_SYNC_HTTP_DESCRIPTIONS,
  PrmsSyncResponseDto,
  PrmsSyncStatusDto,
} from './dto/prms-sync.dto';
import { ResultPrmsSyncStatusReader } from './result-prms-sync-status.reader';
import {
  PrmsSyncPersistedRefusalException,
  PrmsSyncResponseData,
  ResultPrmsSyncService,
} from './result-prms-sync.service';
import { PrmsSyncOutcome } from '../../tools/prms-normalizer/enum/prms-sync-outcome.enum';

const httpExceptionDescription = (error: HttpException): string => {
  const payload = error.getResponse();
  if (typeof payload === 'string') {
    return payload;
  }
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return message.map(String).join('; ');
    }
  }
  return error.message;
};

/**
 * Gate entries 1–2 write no log row (design.md §4 / JD-8). The envelope still
 * carries the full data contract so `attempt_number` is explicit `null`, never
 * absent and never `0`. `http_status` inside data is null: no PRMS call ran.
 */
const noRowRefusalData = (failureReason: string): PrmsSyncResponseData => ({
  outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
  attempt_number: null,
  http_status: null,
  request_id: null,
  prms_result_code: null,
  failure_reason: failureReason,
});

const isNoRowRefusalStatus = (status: number): boolean =>
  status === HttpStatus.NOT_FOUND || status === HttpStatus.CONFLICT;

const syncHttp = (
  data: PrmsSyncResponseData,
): { status: HttpStatus; description: string } => {
  switch (data.outcome) {
    case PrmsSyncOutcome.ACCEPTED:
      return {
        status: HttpStatus.OK,
        description: PRMS_SYNC_HTTP_DESCRIPTIONS.accepted,
      };
    case PrmsSyncOutcome.REJECTED_BY_PRMS:
    case PrmsSyncOutcome.AUTH_FAILED:
      return {
        status: HttpStatus.BAD_GATEWAY,
        description: PRMS_SYNC_HTTP_DESCRIPTIONS.rejectedByPrms,
      };
    case PrmsSyncOutcome.RETRYABLE:
    case PrmsSyncOutcome.TRANSPORT_FAILED:
    case PrmsSyncOutcome.UNKNOWN:
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        description: PRMS_SYNC_HTTP_DESCRIPTIONS.transportOrRetryable,
      };
    default:
      return {
        status: HttpStatus.OK,
        description: PRMS_SYNC_HTTP_DESCRIPTIONS.accepted,
      };
  }
};

// @sdd-spec docs/specs/bilateral/prms-sync/sync-engine — T-13 / R-PRMS-001, R-PRMS-014, NFR-PRMS-004
@ApiTags('Result PRMS Sync')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
@Controller()
export class ResultPrmsSyncController {
  constructor(
    private readonly resultPrmsSyncService: ResultPrmsSyncService,
    private readonly statusReader: ResultPrmsSyncStatusReader,
    private readonly resultsUtil: ResultsUtil,
  ) {}

  @Post()
  @GetResultVersion()
  @ApiOperation({
    summary: 'Send an Approved result to the PRMS Normalizer',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PrmsSyncResponseDto,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.accepted,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.notFound,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.conflict,
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.unprocessable,
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.rejectedByPrms,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.transportOrRetryable,
  })
  @Roles(
    SecRolesEnum.CONTRIBUTOR,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.SYSTEM_ADMIN,
  )
  @ResultOwner()
  @UseGuards(RolesGuard, ResultOwnerGuard)
  async sync() {
    try {
      const data = await this.resultPrmsSyncService.sync(
        this.resultsUtil.resultId,
      );
      const { status, description } = syncHttp(data);
      return ResponseUtils.format({
        description,
        status,
        data,
      });
    } catch (error) {
      if (error instanceof PrmsSyncPersistedRefusalException) {
        return ResponseUtils.format({
          description: httpExceptionDescription(error),
          status: error.getStatus(),
          data: error.responseData,
        });
      }
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const description = httpExceptionDescription(error);
        return ResponseUtils.format({
          description,
          status,
          ...(isNoRowRefusalStatus(status)
            ? { data: noRowRefusalData(description) }
            : {}),
        });
      }
      throw error;
    }
  }

  @Get()
  @GetResultVersion()
  @ApiOperation({
    summary: 'Read PRMS sync state and last attempt for a result',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PrmsSyncStatusDto,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.statusFound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: PRMS_SYNC_HTTP_DESCRIPTIONS.notFound,
  })
  @Roles(
    SecRolesEnum.CONTRIBUTOR,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.SYSTEM_ADMIN,
  )
  @ResultOwner()
  @UseGuards(RolesGuard, ResultOwnerGuard)
  async getStatus() {
    try {
      const data = await this.statusReader.getStatus(this.resultsUtil.resultId);
      return ResponseUtils.format({
        description: PRMS_SYNC_HTTP_DESCRIPTIONS.statusFound,
        status: HttpStatus.OK,
        data,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        return ResponseUtils.format({
          description: httpExceptionDescription(error),
          status: error.getStatus(),
        });
      }
      throw error;
    }
  }
}

import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppConfigService } from '../app-config/app-config.service';
import { AppConfigKey } from '../app-config/enum/app-config-key.enum';
import { PrmsNormalizerRequestDto } from '../../tools/prms-normalizer/dto/prms-normalizer.dto';
import { PrmsSyncOutcome } from '../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { interpretPrmsSyncResponse } from '../../tools/prms-normalizer/response/prms-sync-response.interpreter';
import { PayloadBuilder } from '../../tools/prms-normalizer/builders/payload.builder';
import { PrmsPayloadBuildError } from '../../tools/prms-normalizer/builders/common-fields.builder';
import { PrmsNormalizerService } from '../../tools/prms-normalizer/prms-normalizer.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PrmsWebhookDeliveryRepository } from '../prms-webhook/repositories/prms-webhook-delivery.repository';
import { evaluateSyncGate } from './eligibility/sync-gate';
import { ResultPrmsSyncAggregateRepository } from './repositories/result-prms-sync-aggregate.repository';
import { ResultPrmsSyncLogRepository } from './repositories/result-prms-sync-log.repository';
import {
  PRMS_SYNC_ALREADY_SYNCED,
  PRMS_SYNC_CLAIM_COLLISION,
  prmsSyncExpiryMessage,
} from './result-prms-sync.constants';

export interface PrmsSyncResponseData {
  outcome: PrmsSyncOutcome;
  attempt_number: number | null;
  http_status: number | null;
  request_id: string | null;
  prms_result_code: number | null;
  failure_reason: string | null;
}

/**
 * Gate entries 3–8 and post-claim payload-build refusals persist a
 * REFUSED_BY_STAR row (design.md §4 / §5.1). Carry the attempt_number the
 * write already produced — never recompute, never null, never 0.
 */
export const persistedStarRefusalData = (
  attemptNumber: number,
  failureReason: string,
): PrmsSyncResponseData => ({
  outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
  attempt_number: attemptNumber,
  http_status: null,
  request_id: null,
  prms_result_code: null,
  failure_reason: failureReason,
});

export class PrmsSyncPersistedRefusalException extends UnprocessableEntityException {
  constructor(readonly responseData: PrmsSyncResponseData) {
    super(responseData.failure_reason ?? 'Refused by STAR');
  }
}

export interface SyncOptions {
  now?: Date;
}

const KEY_FIELD = /api[_-]?key/i;

/**
 * DD-9 / NFR-PRMS-002: redact before the row is written, never at read time.
 */
export function redactPrmsPayload<T>(payload: T, apiKey?: string | null): T {
  const cloned = JSON.parse(JSON.stringify(payload)) as unknown;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
      )) {
        if (KEY_FIELD.test(key) || key.toLowerCase() === 'x-api-key') {
          out[key] = '[REDACTED]';
        } else {
          out[key] = walk(value);
        }
      }
      return out;
    }
    if (typeof node === 'string' && apiKey && node.includes(apiKey)) {
      return node.split(apiKey).join('[REDACTED]');
    }
    return node;
  };
  return walk(cloned) as T;
}

const throwHttp = (status: number, description: string): never => {
  if (status === HttpStatus.NOT_FOUND) {
    throw new NotFoundException(description);
  }
  if (status === HttpStatus.CONFLICT) {
    throw new ConflictException(description);
  }
  if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
    throw new UnprocessableEntityException(description);
  }
  throw new HttpException(description, status);
};

@Injectable()
export class ResultPrmsSyncService {
  private readonly logger = new LoggerUtil({
    name: ResultPrmsSyncService.name,
  });

  constructor(
    private readonly logRepository: ResultPrmsSyncLogRepository,
    private readonly aggregateRepository: ResultPrmsSyncAggregateRepository,
    private readonly payloadBuilder: PayloadBuilder,
    private readonly normalizer: PrmsNormalizerService,
    private readonly appConfigService: AppConfigService,
    private readonly appConfig: AppConfig,
    private readonly currentUser: CurrentUserUtil,
    private readonly outboundHistoryRepository: PrmsWebhookDeliveryRepository,
  ) {}

  async sync(
    resultId: number,
    options: SyncOptions = {},
  ): Promise<PrmsSyncResponseData> {
    const environment = this.appConfig.ARI_IS_PRODUCTION ? 'PROD' : 'TEST';
    const userId = this.currentUser.user_id;
    const snapshot = await this.logRepository.loadGateSnapshot(resultId);
    const gate = evaluateSyncGate(snapshot);

    if (!gate.allowed) {
      if (gate.persistsRow) {
        const inserted = await this.logRepository.insertRefusedByStar({
          resultId,
          environment,
          userId,
          failureReason: gate.description ?? 'Refused by STAR',
        });
        this.logAttempt({
          resultOfficialCode: snapshot.result_official_code,
          environment,
          prmsType: null,
          outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
          requestId: null,
        });
        throw new PrmsSyncPersistedRefusalException(
          persistedStarRefusalData(
            inserted.attemptNumber,
            gate.description ?? 'Refused by STAR',
          ),
        );
      }
      throwHttp(
        gate.httpStatus ?? HttpStatus.BAD_REQUEST,
        gate.description ?? 'Refused by STAR',
      );
    }

    const claim = await this.logRepository.claimAttempt(resultId, {
      environment,
      userId,
      now: options.now,
    });

    switch (claim.kind) {
      case 'not_found':
        throw new NotFoundException('Result not found');
      case 'already_synced':
        throw new ConflictException(PRMS_SYNC_ALREADY_SYNCED);
      case 'collision':
        throw new ConflictException(PRMS_SYNC_CLAIM_COLLISION);
      case 'expired':
        this.logger._warn(
          `Claim expiry: attempt ${claim.attemptNumber} for result ${claim.resultOfficialCode} settled to UNKNOWN`,
        );
        throw new ConflictException(
          prmsSyncExpiryMessage(claim.attemptNumber, claim.resultOfficialCode),
        );
      case 'claimed':
        break;
    }

    let payload: PrmsNormalizerRequestDto;
    try {
      const aggregate = await this.aggregateRepository.loadByResultId(resultId);
      if (!aggregate) {
        await this.settleAttempt(
          {
            attemptId: claim.attemptId,
            resultId,
            outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
            userId,
            failureReason: 'Result not found',
          },
          { resultOfficialCode: claim.resultOfficialCode, environment },
        );
        throw new NotFoundException('Result not found');
      }
      payload = this.payloadBuilder.build(aggregate);
    } catch (error) {
      if (error instanceof PrmsPayloadBuildError) {
        await this.settleAttempt(
          {
            attemptId: claim.attemptId,
            resultId,
            outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
            userId,
            failureReason: error.message,
          },
          { resultOfficialCode: claim.resultOfficialCode, environment },
        );
        throw new PrmsSyncPersistedRefusalException(
          persistedStarRefusalData(claim.attemptNumber, error.message),
        );
      }
      throw error;
    }

    const apiKeyConfig = await this.appConfigService.getEnv(
      AppConfigKey.ARI_CLARISA_API_KEY,
    );
    const apiKey = apiKeyConfig?.simple_value ?? null;
    const redactedPayload = redactPrmsPayload(payload, apiKey);
    const prmsType = payload.results[0]?.type ?? null;
    const externalReference = this.readExternalReference(payload);

    const transport = await this.normalizer.ingest(payload);
    const interpreted = interpretPrmsSyncResponse(transport, externalReference);

    await this.settleAttempt(
      {
        attemptId: claim.attemptId,
        resultId,
        outcome: interpreted.outcome,
        userId,
        httpStatus: interpreted.httpStatus,
        requestId: interpreted.requestId,
        requestPayload: redactedPayload as unknown as Record<string, unknown>,
        responseBody: interpreted.responseBody,
        failureReason: interpreted.failureReason,
        prmsType,
        externalReference,
        prmsResultCode: interpreted.prmsResultCode,
        prmsPhaseId: interpreted.prmsPhaseId,
      },
      { resultOfficialCode: claim.resultOfficialCode, environment },
    );

    if (interpreted.outcome === PrmsSyncOutcome.ACCEPTED) {
      await this.recordOutboundHistory({
        resultId,
        userId,
        environment,
        externalReference,
        prmsResultCode: interpreted.prmsResultCode,
        resultOfficialCode: claim.resultOfficialCode,
        resultYear: claim.resultYear,
      });
    }

    return {
      outcome: interpreted.outcome,
      attempt_number: claim.attemptNumber,
      http_status: interpreted.httpStatus,
      request_id: interpreted.requestId,
      prms_result_code: interpreted.prmsResultCode,
      failure_reason: interpreted.failureReason,
    };
  }

  /**
   * T-11 (Pivot decisions 2, 3, 5, 6): one `PENDING_REVIEW` history row
   * per successful push, written from STAR's own data — PRMS never sends
   * it. Guarded to ACCEPTED only by the caller; every other outcome
   * (AUTH_FAILED, TRANSPORT_FAILED, RETRYABLE, REFUSED_BY_STAR, UNKNOWN,
   * IN_FLIGHT) writes nothing here — *"para eso está la otra tabla de
   * logs."* This write must NEVER fail an already-successful push: caught
   * and logged at `error`, the same discipline T-09's
   * `PrmsWebhookDeliveryService` applies to its detached correlator.
   * Bypasses `recordDelivery`'s dedupe transaction entirely (decision 6)
   * — an outbound row has no `delivery_id` to dedupe on.
   */
  private async recordOutboundHistory(input: {
    resultId: number;
    userId: number | null;
    environment: string;
    externalReference: string | null;
    prmsResultCode: number | null;
    resultOfficialCode: number | null;
    resultYear: number;
  }): Promise<void> {
    try {
      await this.outboundHistoryRepository.recordOutboundPendingReview({
        resultId: input.resultId,
        userId: input.userId,
        occurredAt: new Date(),
        environment: input.environment,
        resultOfficialCode: input.externalReference,
        resultYear: input.resultYear,
        prmsResultCode: input.prmsResultCode,
      });
    } catch (error) {
      this.logger._error(
        `PENDING_REVIEW history write failed for result_official_code=${input.resultOfficialCode} prms_result_code=${input.prmsResultCode}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private readExternalReference(
    payload: PrmsNormalizerRequestDto,
  ): string | null {
    const data = payload.results[0]?.data;
    const value = data?.external_reference;
    return typeof value === 'string' ? value : null;
  }

  /**
   * Every settle path must honour a late return: write-nothing plus `_warn`
   * (R-PRMS-013 AC.4 / design.md §9). Terminal settles log via LoggerUtil
   * (NFR-PRMS-003).
   */
  private async settleAttempt(
    input: Parameters<ResultPrmsSyncLogRepository['settleIfInFlight']>[0],
    logContext: {
      resultOfficialCode: number | null;
      environment: string;
    },
  ): Promise<'settled' | 'late'> {
    const settleStatus = await this.logRepository.settleIfInFlight(input);
    const requestId = input.requestId ?? null;
    if (settleStatus === 'late') {
      this.logger._warn(
        `Late settle: result ${logContext.resultOfficialCode} requestId ${requestId} wrote nothing after expiry to UNKNOWN`,
      );
    } else {
      this.logAttempt({
        resultOfficialCode: logContext.resultOfficialCode,
        environment: logContext.environment,
        prmsType: input.prmsType ?? null,
        outcome: input.outcome,
        requestId,
      });
    }
    return settleStatus;
  }

  private logAttempt(fields: {
    resultOfficialCode: number | null;
    environment: string;
    prmsType: string | null;
    outcome: PrmsSyncOutcome;
    requestId: string | null;
  }): void {
    this.logger._log(
      `PRMS sync result_official_code=${fields.resultOfficialCode} environment=${fields.environment} prms_type=${fields.prmsType} outcome=${fields.outcome} requestId=${fields.requestId}`,
    );
  }
}

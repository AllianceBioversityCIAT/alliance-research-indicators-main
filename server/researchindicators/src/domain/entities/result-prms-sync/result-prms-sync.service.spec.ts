import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppConfigService } from '../app-config/app-config.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { PrmsNormalizerRequestDto } from '../../tools/prms-normalizer/dto/prms-normalizer.dto';
import { PrmsSyncOutcome } from '../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PRMS_RESULT_CODE_ABSENT } from '../../tools/prms-normalizer/response/prms-sync-response.interpreter';
import { PayloadBuilder } from '../../tools/prms-normalizer/builders/payload.builder';
import { PrmsPayloadBuildError } from '../../tools/prms-normalizer/builders/common-fields.builder';
import { PrmsNormalizerService } from '../../tools/prms-normalizer/prms-normalizer.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PrmsWebhookDeliveryRepository } from '../prms-webhook/repositories/prms-webhook-delivery.repository';
import { PrmsSyncGateFacts } from './repositories/result-prms-sync-log.repository';
import { ResultPrmsSyncAggregateRepository } from './repositories/result-prms-sync-aggregate.repository';
import { ResultPrmsSyncLogRepository } from './repositories/result-prms-sync-log.repository';
import {
  PRMS_SYNC_ALREADY_SYNCED,
  PRMS_SYNC_CLAIM_COLLISION,
  prmsSyncExpiryMessage,
} from './result-prms-sync.constants';
import {
  redactPrmsPayload,
  ResultPrmsSyncService,
  PrmsSyncPersistedRefusalException,
} from './result-prms-sync.service';

const API_KEY = 'super-secret-key-material';

const eligibleFacts = (
  overrides: Partial<PrmsSyncGateFacts> = {},
): PrmsSyncGateFacts => ({
  exists: true,
  result_id: 42,
  result_official_code: 1001,
  is_synced_to_prms: false,
  result_status_id: ResultStatusEnum.APPROVED,
  pool_funding_alignment_green: true,
  primary_contract: {
    agreement_id: 'C-POOL-001',
    is_pool_funding_contributor: true,
  },
  indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  prms_policy_type_id: null,
  ...overrides,
});

const envelope = (
  extra: Record<string, unknown> = {},
): PrmsNormalizerRequestDto => ({
  tenant: 'prms.result-management.api',
  op: 'dataset.ingest.requested',
  results: [
    {
      type: 'capacity_sharing',
      data: {
        external_reference: 'ARI-1001',
        ...extra,
      },
    },
  ],
});

describe('ResultPrmsSyncService', () => {
  let logRepository: {
    loadGateSnapshot: jest.Mock;
    claimAttempt: jest.Mock;
    settleIfInFlight: jest.Mock;
    insertRefusedByStar: jest.Mock;
  };
  let aggregateRepository: { loadByResultId: jest.Mock };
  let payloadBuilder: { build: jest.Mock };
  let normalizer: { ingest: jest.Mock };
  let appConfigService: { getEnv: jest.Mock };
  let outboundHistoryRepository: {
    recordOutboundPendingReview: jest.Mock;
    recordDelivery: jest.Mock;
  };
  let service: ResultPrmsSyncService;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logRepository = {
      loadGateSnapshot: jest.fn().mockResolvedValue(eligibleFacts()),
      claimAttempt: jest.fn().mockResolvedValue({
        kind: 'claimed',
        attemptId: 9,
        attemptNumber: 1,
        resultOfficialCode: 1001,
        resultYear: 2026,
      }),
      settleIfInFlight: jest.fn().mockResolvedValue('settled'),
      insertRefusedByStar: jest.fn().mockResolvedValue({
        attemptId: 3,
        attemptNumber: 1,
      }),
    };
    aggregateRepository = {
      loadByResultId: jest.fn().mockResolvedValue({ result_id: 42 }),
    };
    payloadBuilder = { build: jest.fn().mockReturnValue(envelope()) };
    normalizer = {
      ingest: jest.fn().mockResolvedValue({
        status: 200,
        body: {
          requestId: 'Root=req-1',
          results: [
            {
              success: true,
              external_reference: 'ARI-1001',
              result: { result_code: 9199 },
            },
          ],
        },
      }),
    };
    appConfigService = {
      getEnv: jest.fn().mockResolvedValue({ simple_value: API_KEY }),
    };
    outboundHistoryRepository = {
      recordOutboundPendingReview: jest.fn().mockResolvedValue(undefined),
      // Present only so a test can prove the dedupe transaction's own
      // method is never reached from this path (T-11, Pivot decision 6).
      recordDelivery: jest.fn(),
    };
    warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    logSpy = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);

    service = new ResultPrmsSyncService(
      logRepository as unknown as ResultPrmsSyncLogRepository,
      aggregateRepository as unknown as ResultPrmsSyncAggregateRepository,
      payloadBuilder as unknown as PayloadBuilder,
      normalizer as unknown as PrmsNormalizerService,
      appConfigService as unknown as AppConfigService,
      { ARI_IS_PRODUCTION: false } as unknown as AppConfig,
      { user_id: 7 } as unknown as CurrentUserUtil,
      outboundHistoryRepository as unknown as PrmsWebhookDeliveryRepository,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * K-004 failing input: second sync AFTER the first settles must be the
   * already-synced 409, not the collision 409.
   */
  it('returns the already-synced 409, not the collision 409, after a settled ACCEPTED', async () => {
    logRepository.loadGateSnapshot
      .mockResolvedValueOnce(eligibleFacts())
      .mockResolvedValueOnce(eligibleFacts({ is_synced_to_prms: true }));
    logRepository.claimAttempt.mockResolvedValueOnce({
      kind: 'claimed',
      attemptId: 9,
      attemptNumber: 1,
      resultOfficialCode: 1001,
      resultYear: 2026,
    });

    const first = await service.sync(42);
    expect(first.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(normalizer.ingest).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalled();

    let secondError: unknown;
    try {
      await service.sync(42);
    } catch (error) {
      secondError = error;
    }
    expect(secondError).toBeInstanceOf(ConflictException);
    expect((secondError as ConflictException).message).toBe(
      PRMS_SYNC_ALREADY_SYNCED,
    );
    expect((secondError as ConflictException).message).not.toBe(
      PRMS_SYNC_CLAIM_COLLISION,
    );
    expect(normalizer.ingest).toHaveBeenCalledTimes(1);
    expect(logRepository.claimAttempt).toHaveBeenCalledTimes(1);
  });

  it('expires an aged IN_FLIGHT, refuses 409 naming the attempt, and does not claim or send', async () => {
    logRepository.claimAttempt.mockResolvedValue({
      kind: 'expired',
      attemptId: 8,
      attemptNumber: 4,
      resultOfficialCode: 1001,
    });

    let expiryError: unknown;
    try {
      await service.sync(42);
    } catch (error) {
      expiryError = error;
    }
    expect(expiryError).toBeInstanceOf(ConflictException);
    expect((expiryError as ConflictException).message).toBe(
      prmsSyncExpiryMessage(4, 1001),
    );
    expect((expiryError as ConflictException).message).toMatch(
      /Attention required/,
    );
    expect((expiryError as ConflictException).message).toMatch(/attempt 4/);
    expect((expiryError as ConflictException).message).not.toMatch(
      /already in progress/i,
    );
    expect(normalizer.ingest).not.toHaveBeenCalled();
    expect(payloadBuilder.build).not.toHaveBeenCalled();
    expect(logRepository.claimAttempt).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/UNKNOWN/);
  });

  it('logs _warn and does not treat a late settle as a second write', async () => {
    logRepository.settleIfInFlight.mockResolvedValue('late');

    const result = await service.sync(42);

    expect(result.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/Late settle/);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/1001/);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/Root=req-1/);
  });

  it('redacts the API key before settle writes request_payload', async () => {
    payloadBuilder.build.mockReturnValue(
      envelope({ 'x-api-key': API_KEY, note: `using ${API_KEY}` }),
    );

    await service.sync(42);

    const settleArg = logRepository.settleIfInFlight.mock.calls[0][0];
    const payload = JSON.stringify(settleArg.requestPayload);
    expect(payload).not.toContain(API_KEY);
    expect(payload).toContain('[REDACTED]');
    expect(settleArg.requestPayload.results[0].data['x-api-key']).toBe(
      '[REDACTED]',
    );
  });

  it('persists REFUSED_BY_STAR only when the gate says persistsRow', async () => {
    logRepository.loadGateSnapshot.mockResolvedValue(
      eligibleFacts({ pool_funding_alignment_green: false }),
    );

    await expect(service.sync(42)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(logRepository.insertRefusedByStar).toHaveBeenCalledTimes(1);
    expect(normalizer.ingest).not.toHaveBeenCalled();

    logRepository.insertRefusedByStar.mockClear();
    logRepository.loadGateSnapshot.mockResolvedValue(
      eligibleFacts({ is_synced_to_prms: true }),
    );

    await expect(service.sync(42)).rejects.toMatchObject({
      message: PRMS_SYNC_ALREADY_SYNCED,
    });
    expect(logRepository.insertRefusedByStar).not.toHaveBeenCalled();
    expect(normalizer.ingest).not.toHaveBeenCalled();
  });

  it('propagates insertRefusedByStar attemptNumber on a persisted 422 refusal', async () => {
    logRepository.insertRefusedByStar.mockResolvedValue({
      attemptId: 11,
      attemptNumber: 5,
    });
    logRepository.loadGateSnapshot.mockResolvedValue(
      eligibleFacts({ pool_funding_alignment_green: false }),
    );

    let refusal: unknown;
    try {
      await service.sync(42);
    } catch (error) {
      refusal = error;
    }

    expect(refusal).toBeInstanceOf(PrmsSyncPersistedRefusalException);
    expect(refusal).toBeInstanceOf(UnprocessableEntityException);
    const data = (refusal as PrmsSyncPersistedRefusalException).responseData;
    expect(data.attempt_number).toBe(5);
    expect(data.attempt_number).not.toBeNull();
    expect(data.attempt_number).not.toBe(0);
    expect(data).toEqual({
      outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
      attempt_number: 5,
      http_status: null,
      request_id: null,
      prms_result_code: null,
      failure_reason: 'Pool Funding Alignment is not green-checked',
    });
    expect(logRepository.insertRefusedByStar).toHaveBeenCalledTimes(1);
    expect(normalizer.ingest).not.toHaveBeenCalled();
  });

  it('propagates the claimed attemptNumber on a post-claim payload-build 422', async () => {
    logRepository.claimAttempt.mockResolvedValue({
      kind: 'claimed',
      attemptId: 9,
      attemptNumber: 8,
      resultOfficialCode: 1001,
    });
    payloadBuilder.build.mockImplementation(() => {
      throw new PrmsPayloadBuildError(
        "Missing mandatory field 'title'",
        'title',
      );
    });

    let refusal: unknown;
    try {
      await service.sync(42);
    } catch (error) {
      refusal = error;
    }

    expect(refusal).toBeInstanceOf(PrmsSyncPersistedRefusalException);
    const data = (refusal as PrmsSyncPersistedRefusalException).responseData;
    expect(data.attempt_number).toBe(8);
    expect(data.attempt_number).not.toBeNull();
    expect(data.attempt_number).not.toBe(0);
    expect(data.failure_reason).toBe("Missing mandatory field 'title'");
    expect(logRepository.settleIfInFlight).toHaveBeenCalledTimes(1);
  });

  it('logs _warn when a missing-aggregate settle is late', async () => {
    aggregateRepository.loadByResultId.mockResolvedValue(null);
    logRepository.settleIfInFlight.mockResolvedValue('late');

    await expect(service.sync(42)).rejects.toBeInstanceOf(NotFoundException);
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/Late settle/);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/1001/);
    expect(normalizer.ingest).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs the REFUSED_BY_STAR attempt when payload build fails', async () => {
    payloadBuilder.build.mockImplementation(() => {
      throw new PrmsPayloadBuildError(
        "Missing mandatory field 'title'",
        'title',
      );
    });

    await expect(service.sync(42)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(logRepository.settleIfInFlight).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalled();
    expect(String(logSpy.mock.calls[0][0])).toMatch(/outcome=REFUSED_BY_STAR/);
    expect(String(logSpy.mock.calls[0][0])).toMatch(
      /result_official_code=1001/,
    );
    expect(normalizer.ingest).not.toHaveBeenCalled();
  });

  it('logs _warn when a build-failure settle is late', async () => {
    payloadBuilder.build.mockImplementation(() => {
      throw new PrmsPayloadBuildError(
        "Missing mandatory field 'title'",
        'title',
      );
    });
    logRepository.settleIfInFlight.mockResolvedValue('late');

    await expect(service.sync(42)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/Late settle/);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/1001/);
    expect(logSpy).not.toHaveBeenCalled();
    expect(normalizer.ingest).not.toHaveBeenCalled();
  });

  it('does not send when a live claim collides', async () => {
    logRepository.claimAttempt.mockResolvedValue({
      kind: 'collision',
      attemptNumber: 1,
      resultOfficialCode: 1001,
    });

    await expect(service.sync(42)).rejects.toMatchObject({
      message: PRMS_SYNC_CLAIM_COLLISION,
    });
    expect(normalizer.ingest).not.toHaveBeenCalled();
  });

  it('does not settle ACCEPTED when a 207 matching row failed after a successful earlier row', async () => {
    const body = {
      requestId: 'Root=two-row',
      results: [
        {
          success: true,
          external_reference: 'ARI-OTHER',
          result: { result_code: 1111 },
        },
        {
          success: false,
          external_reference: 'ARI-1001',
          error: 'Evidence link is not a valid URL',
        },
      ],
    };
    normalizer.ingest.mockResolvedValue({ status: 207, body });

    const result = await service.sync(42);

    expect(result.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    expect(result.prms_result_code).toBeNull();
    expect(result.request_id).toBe('Root=two-row');
    const settleArg = logRepository.settleIfInFlight.mock.calls[0][0];
    expect(settleArg.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    expect(settleArg.outcome).not.toBe(PrmsSyncOutcome.ACCEPTED);
    expect(settleArg.responseBody).toEqual(body);
    expect(settleArg.requestId).toBe('Root=two-row');
    expect(settleArg.prmsResultCode).toBeNull();
  });

  it('forwards requestId to settle on TRANSPORT_FAILED, AUTH_FAILED, RETRYABLE, and REJECTED_BY_PRMS', async () => {
    normalizer.ingest.mockResolvedValueOnce(null);
    await service.sync(42);
    expect(
      logRepository.settleIfInFlight.mock.calls[0][0].requestId,
    ).toBeNull();
    expect(logRepository.settleIfInFlight.mock.calls[0][0].outcome).toBe(
      PrmsSyncOutcome.TRANSPORT_FAILED,
    );

    logRepository.settleIfInFlight.mockClear();
    normalizer.ingest.mockResolvedValueOnce({
      status: 401,
      body: { requestId: 'Root=auth-1' },
    });
    await service.sync(42);
    expect(logRepository.settleIfInFlight.mock.calls[0][0].requestId).toBe(
      'Root=auth-1',
    );
    expect(logRepository.settleIfInFlight.mock.calls[0][0].outcome).toBe(
      PrmsSyncOutcome.AUTH_FAILED,
    );

    logRepository.settleIfInFlight.mockClear();
    normalizer.ingest.mockResolvedValueOnce({
      status: 503,
      body: { requestId: 'Root=svc-1' },
    });
    await service.sync(42);
    expect(logRepository.settleIfInFlight.mock.calls[0][0].requestId).toBe(
      'Root=svc-1',
    );
    expect(logRepository.settleIfInFlight.mock.calls[0][0].outcome).toBe(
      PrmsSyncOutcome.RETRYABLE,
    );

    logRepository.settleIfInFlight.mockClear();
    normalizer.ingest.mockResolvedValueOnce({
      status: 422,
      body: {
        requestId: 'Root=unprocessable-1',
        rejected: [{ external_reference: 'ARI-1001', reason: 'invalid title' }],
      },
    });
    await service.sync(42);
    expect(logRepository.settleIfInFlight.mock.calls[0][0].requestId).toBe(
      'Root=unprocessable-1',
    );
    expect(logRepository.settleIfInFlight.mock.calls[0][0].outcome).toBe(
      PrmsSyncOutcome.REJECTED_BY_PRMS,
    );
  });

  it('settles ACCEPTED with the PRMS result_code and records its absence when missing', async () => {
    const first = await service.sync(42);
    expect(first.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(first.prms_result_code).toBe(9199);
    expect(logRepository.settleIfInFlight.mock.calls[0][0].prmsResultCode).toBe(
      9199,
    );

    logRepository.settleIfInFlight.mockClear();
    normalizer.ingest.mockResolvedValueOnce({
      status: 200,
      body: {
        requestId: 'Root=no-code',
        results: [
          {
            success: true,
            external_reference: 'ARI-1001',
            resultId:
              'prms.result-management.api:capacity_sharing:dataset.ingest.requested:auto-deadbeef',
            result: { result_id: 11667 },
          },
        ],
      },
    });
    const second = await service.sync(42);
    expect(second.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(second.prms_result_code).toBeNull();
    expect(logRepository.settleIfInFlight.mock.calls[0][0].failureReason).toBe(
      PRMS_RESULT_CODE_ABSENT,
    );
  });

  it('settles RETRYABLE when a 207 row error is a downstream 5xx', async () => {
    normalizer.ingest.mockResolvedValue({
      status: 207,
      body: {
        requestId: 'Root=dd18-5xx',
        results: [
          {
            success: false,
            external_reference: 'ARI-1001',
            error: 'HTTP 502: Proxy Error',
          },
        ],
      },
    });

    const result = await service.sync(42);

    expect(result.outcome).toBe(PrmsSyncOutcome.RETRYABLE);
    expect(logRepository.settleIfInFlight.mock.calls[0][0].outcome).not.toBe(
      PrmsSyncOutcome.ACCEPTED,
    );
    expect(logRepository.settleIfInFlight.mock.calls[0][0].outcome).not.toBe(
      PrmsSyncOutcome.REJECTED_BY_PRMS,
    );
  });

  describe('T-11 — the outbound PENDING_REVIEW history write', () => {
    it('writes exactly ONE PENDING_REVIEW row, with the correct arguments, after an ACCEPTED push', async () => {
      const result = await service.sync(42);

      expect(result.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).toHaveBeenCalledTimes(1);

      // Disqualifier (KZ-001): assert the ARGUMENTS, not just that the
      // method was called. `RecordOutboundPendingReviewInput` structurally
      // has no `decision` / `justification` / `decidedAt` / `deliveryId` /
      // `rawBody` / `rawHeaders` / `reviewer*` fields at all — there is no
      // slot here to populate them with. That every one of them lands as a
      // NULL literal in the emitted INSERT is proven by the repository's
      // own spec (KZ-001: a property in generated SQL is asserted there).
      const arg =
        outboundHistoryRepository.recordOutboundPendingReview.mock.calls[0][0];
      expect(arg).toEqual({
        resultId: 42,
        userId: 7,
        occurredAt: expect.any(Date),
        environment: 'TEST',
        resultOfficialCode: 'ARI-1001',
        resultYear: 2026,
        prmsResultCode: 9199,
      });
      expect(Object.keys(arg).sort()).toEqual(
        [
          'resultId',
          'userId',
          'occurredAt',
          'environment',
          'resultOfficialCode',
          'resultYear',
          'prmsResultCode',
        ].sort(),
      );
    });

    it('Falsifier 1 — a throwing history write does NOT fail an otherwise-successful push, and is logged at error', async () => {
      outboundHistoryRepository.recordOutboundPendingReview.mockRejectedValueOnce(
        new Error('ER_LOCK_WAIT_TIMEOUT'),
      );

      const result = await service.sync(42);

      expect(result.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
      expect(result.prms_result_code).toBe(9199);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0][0])).toMatch(/PENDING_REVIEW/);
      expect(String(errorSpy.mock.calls[0][0])).toMatch(/1001/);
      expect(String(errorSpy.mock.calls[0][0])).toMatch(/ER_LOCK_WAIT_TIMEOUT/);
    });

    it('Falsifier 2 — AUTH_FAILED writes NO history row', async () => {
      normalizer.ingest.mockResolvedValueOnce({
        status: 401,
        body: { requestId: 'Root=auth-1' },
      });

      const result = await service.sync(42);

      expect(result.outcome).toBe(PrmsSyncOutcome.AUTH_FAILED);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).not.toHaveBeenCalled();
    });

    it('Falsifier 2 — TRANSPORT_FAILED writes NO history row', async () => {
      normalizer.ingest.mockResolvedValueOnce(null);

      const result = await service.sync(42);

      expect(result.outcome).toBe(PrmsSyncOutcome.TRANSPORT_FAILED);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).not.toHaveBeenCalled();
    });

    it('Falsifier 2 — RETRYABLE writes NO history row', async () => {
      normalizer.ingest.mockResolvedValueOnce({
        status: 503,
        body: { requestId: 'Root=svc-1' },
      });

      const result = await service.sync(42);

      expect(result.outcome).toBe(PrmsSyncOutcome.RETRYABLE);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).not.toHaveBeenCalled();
    });

    it("REJECTED_BY_PRMS writes NO history row (not in the task text's named list, but structurally never ACCEPTED)", async () => {
      normalizer.ingest.mockResolvedValueOnce({
        status: 422,
        body: {
          requestId: 'Root=unprocessable-1',
          rejected: [
            { external_reference: 'ARI-1001', reason: 'invalid title' },
          ],
        },
      });

      const result = await service.sync(42);

      expect(result.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).not.toHaveBeenCalled();
    });

    it('REFUSED_BY_STAR (gate refusal, persisted) writes NO history row', async () => {
      logRepository.loadGateSnapshot.mockResolvedValue(
        eligibleFacts({ pool_funding_alignment_green: false }),
      );

      await expect(service.sync(42)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).not.toHaveBeenCalled();
    });

    it('REFUSED_BY_STAR (missing aggregate) writes NO history row', async () => {
      aggregateRepository.loadByResultId.mockResolvedValue(null);

      await expect(service.sync(42)).rejects.toBeInstanceOf(NotFoundException);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).not.toHaveBeenCalled();
    });

    it('UNKNOWN (expired claim) writes NO history row', async () => {
      logRepository.claimAttempt.mockResolvedValue({
        kind: 'expired',
        attemptId: 8,
        attemptNumber: 4,
        resultOfficialCode: 1001,
      });

      await expect(service.sync(42)).rejects.toBeInstanceOf(ConflictException);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).not.toHaveBeenCalled();
    });

    // IN_FLIGHT is structurally excluded, not tested by mutation: the guard
    // reads the local `interpreted.outcome`, and
    // `interpretPrmsSyncResponse` (prms-sync-response.interpreter.ts) never
    // returns IN_FLIGHT under any status/body it handles — that value only
    // ever appears as the transient claim-row state
    // `result-prms-sync-log.repository.ts` writes at claim time. No call
    // through the real `sync()` path can make the guard observe it, so
    // there is no red/green mutation to run here; the exclusion is
    // structural, proven by reading the interpreter's exhaustive return
    // statements, not by a fixture.

    it('Falsifier 3 — TWO successful pushes for one result write TWO rows (not deduped)', async () => {
      const first = await service.sync(42);
      const second = await service.sync(42);

      expect(first.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
      expect(second.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
      expect(
        outboundHistoryRepository.recordOutboundPendingReview,
      ).toHaveBeenCalledTimes(2);
    });

    it('never calls recordDelivery — the dedupe transaction is not on this path (Pivot decision 6)', async () => {
      await service.sync(42);

      expect(outboundHistoryRepository.recordDelivery).not.toHaveBeenCalled();
    });
  });
});

describe('redactPrmsPayload', () => {
  it('strips key material from nested fields before any write', () => {
    const redacted = redactPrmsPayload(
      { headers: { 'x-api-key': API_KEY }, body: `token=${API_KEY}` },
      API_KEY,
    );
    expect(JSON.stringify(redacted)).not.toContain(API_KEY);
  });
});

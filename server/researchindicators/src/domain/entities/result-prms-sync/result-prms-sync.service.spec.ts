import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppConfigService } from '../app-config/app-config.service';
import { DegreesEnum } from '../degrees/enum/degrees.enum';
import { DeliveryModalityEnum } from '../delivery-modalities/enum/delivery-modalities.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { SessionLengthEnum } from '../session-lengths/enum/session-lengths.enum';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';
import { ClarisaGeoScopeEnum } from '../../tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { PrmsSyncAggregate } from '../../tools/prms-normalizer/dto/prms-sync-aggregate';
import { PrmsNormalizerRequestDto } from '../../tools/prms-normalizer/dto/prms-normalizer.dto';
import { PrmsSyncOutcome } from '../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PRMS_RESULT_CODE_ABSENT } from '../../tools/prms-normalizer/response/prms-sync-response.interpreter';
import { CapacitySharingBuilder } from '../../tools/prms-normalizer/builders/capacity-sharing.builder';
import {
  CommonFieldsBuilder,
  PrmsPayloadBuildError,
} from '../../tools/prms-normalizer/builders/common-fields.builder';
import { InnovationDevelopmentBuilder } from '../../tools/prms-normalizer/builders/innovation-development.builder';
import { InnovationUseBuilder } from '../../tools/prms-normalizer/builders/innovation-use.builder';
import { KnowledgeProductBuilder } from '../../tools/prms-normalizer/builders/knowledge-product.builder';
import { PayloadBuilder } from '../../tools/prms-normalizer/builders/payload.builder';
import { PolicyChangeBuilder } from '../../tools/prms-normalizer/builders/policy-change.builder';
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
  prms_sync_button_enabled: true,
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

  it('2025 vs 2026 is a reporting_year refusal: log insert not called and Normalizer not called', async () => {
    logRepository.loadGateSnapshot.mockResolvedValue(
      eligibleFacts({ report_year: 2025, reporting_year: 2026 }),
    );

    let refusal: unknown;
    try {
      await service.sync(42);
    } catch (error) {
      refusal = error;
    }

    expect(logRepository.insertRefusedByStar).not.toHaveBeenCalled();
    expect(normalizer.ingest).not.toHaveBeenCalled();
    expect(logRepository.claimAttempt).not.toHaveBeenCalled();
    expect(refusal).toBeInstanceOf(ConflictException);
    expect((refusal as ConflictException).message).toContain('2025');
    expect((refusal as ConflictException).message).toContain('2026');
  });

  it('already-synced 2025 is refused as not_already_synced, ahead of reporting_year', async () => {
    logRepository.loadGateSnapshot.mockResolvedValue(
      eligibleFacts({
        is_synced_to_prms: true,
        report_year: 2025,
        reporting_year: 2026,
      }),
    );

    await expect(service.sync(42)).rejects.toMatchObject({
      message: PRMS_SYNC_ALREADY_SYNCED,
    });
    expect(normalizer.ingest).not.toHaveBeenCalled();
    expect(logRepository.insertRefusedByStar).not.toHaveBeenCalled();
  });

  it('calls the Normalizer when report_year and reporting_year are absent', async () => {
    const result = await service.sync(42);

    expect(result.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(normalizer.ingest).toHaveBeenCalledTimes(1);
  });

  it('refuses a null result year against a non-2026 reporting year without a log row', async () => {
    logRepository.loadGateSnapshot.mockResolvedValue(
      eligibleFacts({ report_year: null, reporting_year: 2027 }),
    );

    let refusal: unknown;
    try {
      await service.sync(42);
    } catch (error) {
      refusal = error;
    }

    expect(refusal).toBeInstanceOf(ConflictException);
    expect((refusal as ConflictException).message).toContain('2027');
    expect(normalizer.ingest).not.toHaveBeenCalled();
    expect(logRepository.insertRefusedByStar).not.toHaveBeenCalled();
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

  it('passes the stored PRMS result code through to settle', async () => {
    aggregateRepository.loadByResultId.mockResolvedValue({
      result_id: 42,
      prms_result_code: 9475,
    });

    await service.sync(42);

    expect(
      logRepository.settleIfInFlight.mock.calls[0][0].storedPrmsResultCode,
    ).toBe(9475);
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
      // NULL results.platform_code is STAR. The history code is the bare
      // official code (1001), not the payload reference (ARI-1001).
      const arg =
        outboundHistoryRepository.recordOutboundPendingReview.mock.calls[0][0];
      expect(arg).toEqual({
        userId: 7,
        occurredAt: expect.any(Date),
        environment: 'TEST',
        platformCode: 'STAR',
        resultOfficialCode: '1001',
        resultYear: 2026,
        prmsResultCode: 9199,
      });
      expect(Object.keys(arg).sort()).toEqual(
        [
          'userId',
          'occurredAt',
          'environment',
          'platformCode',
          'resultOfficialCode',
          'resultYear',
          'prmsResultCode',
        ].sort(),
      );
    });

    it('a STAR push whose payload reference is the bare code binds that same code', async () => {
      aggregateRepository.loadByResultId.mockResolvedValue({
        result_id: 42,
        platform_code: 'STAR',
      });
      payloadBuilder.build.mockReturnValue(
        envelope({ external_reference: '1001' }),
      );
      normalizer.ingest.mockResolvedValue({
        status: 200,
        body: {
          requestId: 'Root=req-star',
          results: [
            {
              success: true,
              external_reference: '1001',
              result: { result_code: 9199 },
            },
          ],
        },
      });

      await service.sync(42);

      const arg =
        outboundHistoryRepository.recordOutboundPendingReview.mock.calls[0][0];
      // HEAD wrote the payload reference. For STAR that reference is the
      // bare code, so the bound code is byte-identical and the platform
      // column is the addition.
      expect(arg.platformCode).toBe('STAR');
      expect(arg.resultOfficialCode).toBe('1001');
    });

    it('a TIP push passes platform TIP and the bare code, not TIP-123', async () => {
      logRepository.claimAttempt.mockResolvedValue({
        kind: 'claimed',
        attemptId: 9,
        attemptNumber: 1,
        resultOfficialCode: 123,
        resultYear: 2026,
      });
      aggregateRepository.loadByResultId.mockResolvedValue({
        result_id: 42,
        platform_code: 'TIP',
      });
      payloadBuilder.build.mockReturnValue(
        envelope({ external_reference: 'TIP-123' }),
      );
      normalizer.ingest.mockResolvedValue({
        status: 200,
        body: {
          requestId: 'Root=req-tip',
          results: [
            {
              success: true,
              external_reference: 'TIP-123',
              result: { result_code: 9199 },
            },
          ],
        },
      });

      await service.sync(42);

      const arg =
        outboundHistoryRepository.recordOutboundPendingReview.mock.calls[0][0];
      expect(arg.platformCode).toBe('TIP');
      expect(arg.resultOfficialCode).toBe('123');
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

  describe('TIP_SYNC authorship and toc_mapping (R-TPP-004, R-TPP-005)', () => {
    const AUTHOR_A = {
      email: 'submitter.a@cgiar.org',
      first_name: 'Submitter',
      last_name: 'Alpha',
    };
    const STORED_B = {
      email: 'legacy.b@cgiar.org',
      first_name: 'Legacy',
      last_name: 'Beta',
    };
    const CREATED_AT = new Date('2024-03-01T10:00:00.000Z');
    const HISTORY_AT = new Date('2019-11-02T08:00:00.000Z');
    const TIP_TOC = {
      science_program_id: 'SP01',
      aow_compose_code: 'SP01-AOW05',
      result_title: 'TIP result title',
    };
    const STORED_ALIGNMENT_TITLE = 'STORED-ALIGNMENT-TITLE';

    const emptySlices = () => ({
      capacity_sharing: null,
      innovation_dev: null,
      policy_change: null,
      innovation_use: null,
      actors: [],
      institution_types: [],
      quantifications: [],
    });

    const buildableAggregate = (
      overrides: Partial<PrmsSyncAggregate> = {},
    ): PrmsSyncAggregate => ({
      result_id: 42,
      result_official_code: 1001,
      platform_code: ReportingPlatformEnum.STAR,
      prms_result_code: null,
      indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      created_at: CREATED_AT,
      title: 'TIP push fixture',
      description: 'A description the builder will accept',
      geo_scope_id: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      is_partner_not_applicable: true,
      created_by: STORED_B,
      submitted_by: {
        staff: STORED_B,
        submitted_date: HISTORY_AT,
        comment: 'approved in STAR',
      },
      lead_contact: STORED_B,
      primary_contract: {
        agreement_id: 'C-POOL-001',
        clarisa_project_short_name: 'B-C-POOL-001',
        clarisa_external_code: 'C-POOL-001',
        description: 'Pool grant',
        ubwClientDescription: 'ExCIAT',
        is_primary: true,
      },
      contracts: [],
      science_programs: [
        {
          sp_code: 'STORED-SP',
          sp_role: 'PRIMARY',
          toc_result_id: 77,
          toc_result_title: STORED_ALIGNMENT_TITLE,
          indicator_description: 'stored indicator',
          quantitative_contribution: 3,
          aligns_with_toc: true,
        },
      ],
      regions: [],
      countries: [],
      subnational_areas: [],
      partners: [],
      evidence: [],
      type_slices: {
        ...emptySlices(),
        capacity_sharing: {
          session_participants_female: 3,
          session_participants_male: 2,
          session_participants_non_binary: 0,
          degree_id: DegreesEnum.OTHER,
          session_length_id: SessionLengthEnum.SHORT_TERM,
          delivery_modality_id: DeliveryModalityEnum.VIRTUAL,
        },
      },
      ...overrides,
    });

    const tipKpAggregate = (): PrmsSyncAggregate =>
      buildableAggregate({
        result_official_code: 19191,
        platform_code: ReportingPlatformEnum.TIP,
        indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        evidence: [
          {
            link: 'https://hdl.handle.net/10568/148990',
            description: 'Handled',
            is_private: false,
          },
        ],
        type_slices: emptySlices(),
      });

    const realService = (): ResultPrmsSyncService =>
      new ResultPrmsSyncService(
        logRepository as unknown as ResultPrmsSyncLogRepository,
        aggregateRepository as unknown as ResultPrmsSyncAggregateRepository,
        new PayloadBuilder(
          new CommonFieldsBuilder(),
          new CapacitySharingBuilder(),
          new InnovationDevelopmentBuilder(),
          new PolicyChangeBuilder(),
          new InnovationUseBuilder(),
          new KnowledgeProductBuilder(),
        ),
        normalizer as unknown as PrmsNormalizerService,
        appConfigService as unknown as AppConfigService,
        { ARI_IS_PRODUCTION: false } as unknown as AppConfig,
        { user_id: 7 } as unknown as CurrentUserUtil,
        outboundHistoryRepository as unknown as PrmsWebhookDeliveryRepository,
      );

    const acceptIngest = (externalReference: string) => {
      normalizer.ingest.mockResolvedValue({
        status: 200,
        body: {
          requestId: 'Root=req-tip',
          results: [
            {
              success: true,
              external_reference: externalReference,
              result: { result_code: 9199 },
            },
          ],
        },
      });
    };

    const ingestedData = (): Record<string, unknown> => {
      const payload = normalizer.ingest.mock
        .calls[0][0] as PrmsNormalizerRequestDto;
      return payload.results[0].data as Record<string, unknown>;
    };

    const refusalReason = async (
      run: () => Promise<unknown>,
    ): Promise<string> => {
      let refusal: unknown;
      try {
        await run();
      } catch (error) {
        refusal = error;
      }
      expect(refusal).toBeInstanceOf(PrmsSyncPersistedRefusalException);
      return (
        (refusal as PrmsSyncPersistedRefusalException).responseData
          .failure_reason ?? ''
      );
    };

    it('uses the run author for created_by and submitted_by, not results.created_by (JD-7)', async () => {
      const snapshot = eligibleFacts({
        platform_code: 'TIP',
        result_status_id: ResultStatusEnum.COMPLETED_IN_TIP,
        indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        result_official_code: 19191,
      });
      logRepository.loadGateSnapshot.mockResolvedValue(snapshot);
      aggregateRepository.loadByResultId.mockResolvedValue(tipKpAggregate());
      acceptIngest('TIP-19191');

      const result = await realService().sync(42, {
        origin: 'TIP_SYNC',
        author: AUTHOR_A,
        tocMapping: TIP_TOC,
      });

      expect(snapshot.origin).toBe('TIP_SYNC');
      expect(result.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
      const data = ingestedData();
      expect(data.created_by).toEqual({
        email: AUTHOR_A.email,
        name: 'Submitter Alpha',
      });
      expect(data.submitted_by).toEqual({
        email: AUTHOR_A.email,
        name: 'Submitter Alpha',
        submitted_date: CREATED_AT.toISOString(),
      });
      expect(data.created_by).not.toEqual({
        email: STORED_B.email,
        name: 'Legacy Beta',
      });
      const toc = data.toc_mapping as Record<string, unknown>;
      expect(toc.science_program_id).toBe('SP01');
      expect(toc.aow_compose_code).toBe('SP01-AOW05');
      expect(JSON.stringify(data)).not.toContain(STORED_ALIGNMENT_TITLE);
      expect(JSON.stringify(data)).not.toContain('STORED-SP');
    });

    it('records REFUSED_BY_STAR and does not call PRMS when the author is null (R-TPP-005)', async () => {
      const snapshot = eligibleFacts({
        platform_code: 'TIP',
        result_status_id: ResultStatusEnum.COMPLETED_IN_TIP,
        indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      });
      logRepository.loadGateSnapshot.mockResolvedValue(snapshot);
      aggregateRepository.loadByResultId.mockResolvedValue(tipKpAggregate());

      const reason = await refusalReason(() =>
        realService().sync(42, {
          origin: 'TIP_SYNC',
          author: null,
          tocMapping: TIP_TOC,
        }),
      );

      expect(reason).toBe("Missing mandatory field 'created_by'");
      expect(normalizer.ingest).not.toHaveBeenCalled();
      expect(logRepository.settleIfInFlight).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
          failureReason: "Missing mandatory field 'created_by'",
        }),
      );
    });

    const expectStoredAlignmentNotEmitted = async (
      tocMapping: typeof TIP_TOC | null | undefined,
    ) => {
      logRepository.loadGateSnapshot.mockResolvedValue(
        eligibleFacts({
          platform_code: 'TIP',
          result_status_id: ResultStatusEnum.COMPLETED_IN_TIP,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        }),
      );
      aggregateRepository.loadByResultId.mockResolvedValue(tipKpAggregate());

      const options =
        tocMapping === undefined
          ? { origin: 'TIP_SYNC' as const, author: AUTHOR_A }
          : {
              origin: 'TIP_SYNC' as const,
              author: AUTHOR_A,
              tocMapping,
            };
      const reason = await refusalReason(() => realService().sync(42, options));

      expect(reason).toBe("Missing mandatory field 'toc_mapping'");
      expect(normalizer.ingest).not.toHaveBeenCalled();
      expect(JSON.stringify(normalizer.ingest.mock.calls)).not.toContain(
        STORED_ALIGNMENT_TITLE,
      );
      expect(JSON.stringify(normalizer.ingest.mock.calls)).not.toContain(
        'STORED-SP',
      );
    };

    it('refuses a missing tocMapping and never emits the stored alignment (JD-6)', async () => {
      await expectStoredAlignmentNotEmitted(undefined);
    });

    it('refuses a null tocMapping and never emits the stored alignment (JD-6)', async () => {
      await expectStoredAlignmentNotEmitted(null);
    });

    it('without origin leaves the snapshot unset, passes no overrides, and keeps submission_history submitted_by', async () => {
      const snapshot = eligibleFacts();
      logRepository.loadGateSnapshot.mockResolvedValue(snapshot);
      const aggregate = buildableAggregate();
      aggregateRepository.loadByResultId.mockResolvedValue(aggregate);
      acceptIngest('1001');

      const result = await realService().sync(42);

      expect(snapshot.origin).toBeUndefined();
      expect(result.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
      const data = ingestedData();
      expect(data.created_by).toEqual({
        email: STORED_B.email,
        name: 'Legacy Beta',
      });
      expect(data.submitted_by).toEqual({
        email: STORED_B.email,
        name: 'Legacy Beta',
        submitted_date: HISTORY_AT.toISOString(),
        comment: 'approved in STAR',
      });
      const toc = data.toc_mapping as Record<string, unknown>;
      expect(toc.science_program_id).toBe('STORED-SP');
      expect(toc.result_title).toBe(STORED_ALIGNMENT_TITLE);
      expect(toc.aow_compose_code).toBeUndefined();
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

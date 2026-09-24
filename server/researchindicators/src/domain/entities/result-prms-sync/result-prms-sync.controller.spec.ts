import {
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
} from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { RESULT_OWNER_KEY } from '../../shared/decorators/result-owner.decorator';
import { ROLES_KEY, RolesGuard } from '../../shared/guards/roles.guard';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { AppConfig } from '../../shared/utils/app-config.util';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ResultsUtil } from '../../shared/utils/results.util';
import { PayloadBuilder } from '../../tools/prms-normalizer/builders/payload.builder';
import { PrmsSyncOutcome } from '../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PrmsNormalizerService } from '../../tools/prms-normalizer/prms-normalizer.service';
import { PrmsWebhookDeliveryRepository } from '../prms-webhook/repositories/prms-webhook-delivery.repository';
import { AppConfigService } from '../app-config/app-config.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import {
  PRMS_SYNC_HTTP_DESCRIPTIONS,
  PrmsSyncLastAttemptDto,
  PrmsSyncResponseDto,
  PrmsSyncStatusDto,
} from './dto/prms-sync.dto';
import { ResultPrmsSyncAggregateRepository } from './repositories/result-prms-sync-aggregate.repository';
import { ResultPrmsSyncLogRepository } from './repositories/result-prms-sync-log.repository';
import { ResultPrmsSyncController } from './result-prms-sync.controller';
import { ResultPrmsSyncStatusReader } from './result-prms-sync-status.reader';
import {
  PrmsSyncPersistedRefusalException,
  persistedStarRefusalData,
  ResultPrmsSyncService,
} from './result-prms-sync.service';

/**
 * T-13 HTTP-edge coverage. Registration is NOT proven here — a mocked
 * provider graph stays green through a missing `entities.module.ts`
 * import (child guide §4). That gate lives in `entities.module.spec.ts`.
 */
describe('ResultPrmsSyncController', () => {
  const mutationRoles = [
    SecRolesEnum.CONTRIBUTOR,
    SecRolesEnum.CENTER_ADMIN,
    SecRolesEnum.SYSTEM_ADMIN,
  ];
  const reflector = new Reflector();
  const sync = jest.fn();
  const getStatus = jest.fn();
  const resultsUtil = { resultId: 42 } as unknown as ResultsUtil;
  let controller: ResultPrmsSyncController;

  beforeEach(async () => {
    sync.mockReset();
    getStatus.mockReset();
    const passthrough = { canActivate: () => true };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultPrmsSyncController],
      providers: [
        { provide: ResultPrmsSyncService, useValue: { sync } },
        { provide: ResultPrmsSyncStatusReader, useValue: { getStatus } },
        { provide: ResultsUtil, useValue: resultsUtil },
        mockPortfolioUtilProvider,
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(passthrough)
      .overrideGuard(ResultOwnerGuard)
      .useValue(passthrough)
      .compile();

    controller = module.get(ResultPrmsSyncController);
  });

  describe('DD-11 / DD-11b guard triad', () => {
    it.each(['sync', 'getStatus'] as const)(
      '%s carries Roles + ResultOwnerGuard and never ResultStatusGuard',
      (handler) => {
        const fn = ResultPrmsSyncController.prototype[handler];
        const guards: unknown[] =
          Reflect.getMetadata(GUARDS_METADATA, fn) ?? [];
        const roles = reflector.get<SecRolesEnum[]>(ROLES_KEY, fn);
        const owners = Reflect.getMetadata(RESULT_OWNER_KEY, fn);

        expect(roles).toEqual(mutationRoles);
        expect(owners).toBeDefined();
        expect(guards).toContain(RolesGuard);
        expect(guards).toContain(ResultOwnerGuard);
        expect(guards).not.toContain(ResultStatusGuard);
      },
    );

    it('class-level guards omit ResultStatusGuard and include RolesGuard + SetUpInterceptor', () => {
      const guards: unknown[] =
        Reflect.getMetadata(GUARDS_METADATA, ResultPrmsSyncController) ?? [];
      const interceptors: unknown[] =
        Reflect.getMetadata(INTERCEPTORS_METADATA, ResultPrmsSyncController) ??
        [];

      expect(guards).toContain(RolesGuard);
      expect(guards).not.toContain(ResultStatusGuard);
      expect(interceptors).toContain(SetUpInterceptor);
    });
  });

  describe('Swagger (R-PRMS-001 AC.2 / NFR-PRMS-004 / bearer lock)', () => {
    it('tags the controller and locks it with bearer auth', () => {
      const tags = Reflect.getMetadata(
        DECORATORS.API_TAGS,
        ResultPrmsSyncController,
      );
      const security = Reflect.getMetadata(
        DECORATORS.API_SECURITY,
        ResultPrmsSyncController,
      );

      expect(tags).toEqual(['Result PRMS Sync']);
      expect(security).toEqual([{ bearer: [] }]);
    });

    it('documents POST with distinct descriptions per error status', () => {
      const operation = Reflect.getMetadata(
        DECORATORS.API_OPERATION,
        ResultPrmsSyncController.prototype.sync,
      );
      const responses = Reflect.getMetadata(
        DECORATORS.API_RESPONSE,
        ResultPrmsSyncController.prototype.sync,
      ) as Record<string, { description?: string }>;

      expect(operation.summary).toBeDefined();
      const descriptions = [
        responses[String(HttpStatus.NOT_FOUND)]?.description,
        responses[String(HttpStatus.CONFLICT)]?.description,
        responses[String(HttpStatus.UNPROCESSABLE_ENTITY)]?.description,
        responses[String(HttpStatus.BAD_GATEWAY)]?.description,
        responses[String(HttpStatus.SERVICE_UNAVAILABLE)]?.description,
      ];

      expect(descriptions).toEqual([
        PRMS_SYNC_HTTP_DESCRIPTIONS.notFound,
        PRMS_SYNC_HTTP_DESCRIPTIONS.conflict,
        PRMS_SYNC_HTTP_DESCRIPTIONS.unprocessable,
        PRMS_SYNC_HTTP_DESCRIPTIONS.rejectedByPrms,
        PRMS_SYNC_HTTP_DESCRIPTIONS.transportOrRetryable,
      ]);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    });

    it('documents GET and omits request_payload from the status DTO', () => {
      const operation = Reflect.getMetadata(
        DECORATORS.API_OPERATION,
        ResultPrmsSyncController.prototype.getStatus,
      );
      const lastAttemptProps: string[] =
        Reflect.getMetadata(
          DECORATORS.API_MODEL_PROPERTIES_ARRAY,
          PrmsSyncLastAttemptDto.prototype,
        ) ?? [];
      const statusProps: string[] =
        Reflect.getMetadata(
          DECORATORS.API_MODEL_PROPERTIES_ARRAY,
          PrmsSyncStatusDto.prototype,
        ) ?? [];

      expect(operation.summary).toBeDefined();
      expect(lastAttemptProps.join(',')).not.toMatch(/request_payload/);
      expect(statusProps.join(',')).not.toMatch(/request_payload/);
    });
  });

  describe('POST / mapping', () => {
    const accepted = {
      outcome: PrmsSyncOutcome.ACCEPTED,
      attempt_number: 1,
      http_status: 200,
      request_id: 'req-ok',
      prms_result_code: 9001,
      failure_reason: null,
    };

    const expectNoRowRefusal = (
      data: PrmsSyncResponseDto,
      failureReason: string,
    ) => {
      expect(data).toEqual({
        outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
        attempt_number: null,
        http_status: null,
        request_id: null,
        prms_result_code: null,
        failure_reason: failureReason,
      });
      expect(Object.prototype.hasOwnProperty.call(data, 'attempt_number')).toBe(
        true,
      );
      expect(data.attempt_number).toBeNull();
      expect(data.attempt_number).not.toBe(0);
    };

    it('returns 200 with the accepted sync outcome', async () => {
      sync.mockResolvedValue(accepted);

      const response = await controller.sync();
      const data = response.data as PrmsSyncResponseDto;

      expect(sync).toHaveBeenCalledWith(42);
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.description).toBe(PRMS_SYNC_HTTP_DESCRIPTIONS.accepted);
      expect(data).toEqual(accepted);
    });

    it('returns the full data contract on a real 404 gate-entry-1 refusal with attempt_number null', async () => {
      sync.mockRejectedValue(
        new NotFoundException(PRMS_SYNC_HTTP_DESCRIPTIONS.notFound),
      );

      const response = await controller.sync();
      const data = response.data as PrmsSyncResponseDto;

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.description).toBe(PRMS_SYNC_HTTP_DESCRIPTIONS.notFound);
      expectNoRowRefusal(data, PRMS_SYNC_HTTP_DESCRIPTIONS.notFound);
    });

    it('maps REJECTED_BY_PRMS to 502 with the rejected description', async () => {
      sync.mockResolvedValue({
        ...accepted,
        outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
        http_status: 422,
        prms_result_code: null,
        failure_reason: 'bad evidence',
      });

      const response = await controller.sync();
      const data = response.data as PrmsSyncResponseDto;

      expect(response.status).toBe(HttpStatus.BAD_GATEWAY);
      expect(response.description).toBe(
        PRMS_SYNC_HTTP_DESCRIPTIONS.rejectedByPrms,
      );
      expect(data.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    });

    it('maps TRANSPORT_FAILED to 503 with the transport description', async () => {
      sync.mockResolvedValue({
        ...accepted,
        outcome: PrmsSyncOutcome.TRANSPORT_FAILED,
        http_status: null,
        prms_result_code: null,
        failure_reason: 'PRMS Normalizer returned no HTTP response',
      });

      const response = await controller.sync();

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.description).toBe(
        PRMS_SYNC_HTTP_DESCRIPTIONS.transportOrRetryable,
      );
    });

    it('returns the full data contract on a real 409 gate-entry-2 refusal with attempt_number null', async () => {
      sync.mockRejectedValue(
        new ConflictException('Result is already synced to PRMS'),
      );

      const response = await controller.sync();
      const data = response.data as PrmsSyncResponseDto;

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.description).toBe('Result is already synced to PRMS');
      expectNoRowRefusal(data, 'Result is already synced to PRMS');
    });

    it('returns the full data contract on a persisted 422 gate-entry-3–8 refusal with the real attempt_number', async () => {
      const failureReason = 'Pool Funding Alignment is not green-checked';
      const persistedAttemptNumber = 5;
      sync.mockRejectedValue(
        new PrmsSyncPersistedRefusalException(
          persistedStarRefusalData(persistedAttemptNumber, failureReason),
        ),
      );

      const response = await controller.sync();
      const data = response.data as PrmsSyncResponseDto;

      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(response.description).toBe(failureReason);
      expect(data).toEqual({
        outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
        attempt_number: persistedAttemptNumber,
        http_status: null,
        request_id: null,
        prms_result_code: null,
        failure_reason: failureReason,
      });
      expect(Object.prototype.hasOwnProperty.call(data, 'attempt_number')).toBe(
        true,
      );
      expect(data.attempt_number).toBe(persistedAttemptNumber);
      expect(data.attempt_number).not.toBeNull();
      expect(data.attempt_number).not.toBe(0);
      expect(data.attempt_number).toBeGreaterThan(0);
    });
  });

  describe('GET / status', () => {
    it('returns the read surface without a request_payload key', async () => {
      getStatus.mockResolvedValue({
        sync_state: 'never_synced',
        is_synced_to_prms: false,
        prms_result_code: null,
        last_attempt: null,
      });

      const response = await controller.getStatus();

      expect(getStatus).toHaveBeenCalledWith(42);
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.data).not.toHaveProperty('request_payload');
      expect(JSON.stringify(response.data)).not.toMatch(/request_payload/);
    });

    it('surfaces 404 when the reader cannot find the result', async () => {
      getStatus.mockRejectedValue(new NotFoundException('Result not found'));

      const response = await controller.getStatus();

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.description).toBe(PRMS_SYNC_HTTP_DESCRIPTIONS.notFound);
    });
  });

  /**
   * T-13d: the `{ provide: ResultPrmsSyncService, useValue: { sync } }`
   * module above can never exercise insertRefusedByStar. This block wires
   * a real service and mocks only persistence + outbound collaborators.
   */
  describe('POST / persisted 422 through real ResultPrmsSyncService', () => {
    const failureReason = 'Pool Funding Alignment is not green-checked';
    const persistedAttemptNumber = 5;
    let insertRefusedByStar: jest.Mock;
    let realServiceController: ResultPrmsSyncController;

    beforeEach(async () => {
      jest
        .spyOn(LoggerUtil.prototype, '_log')
        .mockImplementation(() => undefined);

      insertRefusedByStar = jest.fn().mockResolvedValue({
        attemptId: 11,
        attemptNumber: persistedAttemptNumber,
      });
      const logRepository = {
        loadGateSnapshot: jest.fn().mockResolvedValue({
          exists: true,
          result_id: 42,
          result_official_code: 1001,
          is_synced_to_prms: false,
          result_status_id: ResultStatusEnum.APPROVED,
          pool_funding_alignment_green: false,
          primary_contract: {
            agreement_id: 'C-POOL-001',
            is_pool_funding_contributor: true,
          },
          indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          prms_policy_type_id: null,
          prms_sync_button_enabled: true,
        }),
        claimAttempt: jest.fn(),
        settleIfInFlight: jest.fn(),
        insertRefusedByStar,
      };
      const service = new ResultPrmsSyncService(
        logRepository as unknown as ResultPrmsSyncLogRepository,
        {
          loadByResultId: jest.fn(),
        } as unknown as ResultPrmsSyncAggregateRepository,
        { build: jest.fn() } as unknown as PayloadBuilder,
        { ingest: jest.fn() } as unknown as PrmsNormalizerService,
        { getEnv: jest.fn() } as unknown as AppConfigService,
        { ARI_IS_PRODUCTION: false } as unknown as AppConfig,
        { user_id: 7 } as unknown as CurrentUserUtil,
        // T-11: this scenario is a gate refusal (pool_funding_alignment_green:
        // false) and never reaches the outbound history write.
        {
          recordOutboundPendingReview: jest.fn(),
        } as unknown as PrmsWebhookDeliveryRepository,
      );

      const passthrough = { canActivate: () => true };
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ResultPrmsSyncController],
        providers: [
          { provide: ResultPrmsSyncService, useValue: service },
          {
            provide: ResultPrmsSyncStatusReader,
            useValue: { getStatus: jest.fn() },
          },
          { provide: ResultsUtil, useValue: resultsUtil },
          mockPortfolioUtilProvider,
        ],
      })
        .overrideGuard(RolesGuard)
        .useValue(passthrough)
        .overrideGuard(ResultOwnerGuard)
        .useValue(passthrough)
        .compile();

      realServiceController = module.get(ResultPrmsSyncController);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('writes insertRefusedByStar and returns the six-field 422 with that attempt_number', async () => {
      const response = await realServiceController.sync();
      const data = response.data as PrmsSyncResponseDto;

      expect(insertRefusedByStar).toHaveBeenCalledTimes(1);
      expect(insertRefusedByStar).toHaveBeenCalledWith({
        resultId: 42,
        environment: 'TEST',
        userId: 7,
        failureReason,
      });
      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(response.description).toBe(failureReason);
      expect(data).toEqual({
        outcome: PrmsSyncOutcome.REFUSED_BY_STAR,
        attempt_number: persistedAttemptNumber,
        http_status: null,
        request_id: null,
        prms_result_code: null,
        failure_reason: failureReason,
      });
      expect(Object.prototype.hasOwnProperty.call(data, 'attempt_number')).toBe(
        true,
      );
      expect(data.attempt_number).toBe(persistedAttemptNumber);
      expect(data.attempt_number).not.toBeNull();
      expect(data.attempt_number).not.toBe(0);
    });
  });
});

import { ConflictException } from '@nestjs/common';
import { dataSource } from '../src/db/config/mysql/orm.test.config';
import { AppConfigService } from '../src/domain/entities/app-config/app-config.service';
import { IndicatorsEnum } from '../src/domain/entities/indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../src/domain/entities/result-status/enum/result-status.enum';
import { ResultPrmsSyncAggregateRepository } from '../src/domain/entities/result-prms-sync/repositories/result-prms-sync-aggregate.repository';
import {
  PrmsSyncGateFacts,
  ResultPrmsSyncLogRepository,
} from '../src/domain/entities/result-prms-sync/repositories/result-prms-sync-log.repository';
import { PRMS_SYNC_CLAIM_COLLISION } from '../src/domain/entities/result-prms-sync/result-prms-sync.constants';
import {
  PrmsSyncResponseData,
  ResultPrmsSyncService,
} from '../src/domain/entities/result-prms-sync/result-prms-sync.service';
import { PrmsNormalizerRequestDto } from '../src/domain/tools/prms-normalizer/dto/prms-normalizer.dto';
import { PrmsSyncOutcome } from '../src/domain/tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PayloadBuilder } from '../src/domain/tools/prms-normalizer/builders/payload.builder';
import { PrmsNormalizerService } from '../src/domain/tools/prms-normalizer/prms-normalizer.service';
import { AppConfig } from '../src/domain/shared/utils/app-config.util';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { PrmsWebhookDeliveryRepository } from '../src/domain/entities/prms-webhook/repositories/prms-webhook-delivery.repository';

// @sdd-spec docs/specs/bilateral/prms-sync/sync-engine — T-11 rework
//
// Behavioural proof (R-PRMS-013 AC.2 / DC-11 / design.md QA-7 / tasks.md T-11
// Done check 1): two ResultPrmsSyncService.sync calls started before either
// settles produce exactly one outbound POST, one ACCEPTED row, and one 409.
// A sequential second call after settle is a different 409 (already-synced)
// and does not exercise this class.
//
// Connection / setup / teardown pattern: same fail-loud DataSource contract
// as test/result-prms-sync-log-outcome.integration-spec.ts (real MySQL,
// no mock / in-memory fallback, beforeAll initialize, afterAll destroy).
// Datasource is the TEST scratch (`ARI_TEST_MYSQL_*` via orm.test.config).
// A missing scratch schema FAILS THIS FILE — it does not pending() or skip.
//
// KZ-017 — what this gate cannot reach:
// `npm test` (the unit suite: package.json jest config, rootDir "src",
// testRegex ".*\\.spec\\.ts$", no globalSetup, no DB bootstrap) NEVER runs
// this file. The integration config is a separate Jest project
// (test/jest-integration.json, rootDir ".", testRegex
// ".integration-spec.ts$"). The DC-11 concurrency proof is therefore a
// SEPARATE gate requiring `npm run test:integration` and a running scratch
// schema. Anyone reading only the unit suite's green does not have this proof.
//
// result_official_code band 917100 — outside the fixture bands 900_000–
// 900_600 documented in server/researchindicators/src/CLAUDE.md §9 FP-45,
// and distinct from T-03's 917000.

const DC11_OFFICIAL_CODE = 917100;
const REFUSAL_OFFICIAL_CODE = 917110;
const REQUEST_ID = 'Root=t11-dc11';

const envelope = (): PrmsNormalizerRequestDto => ({
  tenant: 'prms.result-management.api',
  op: 'dataset.ingest.requested',
  results: [
    {
      type: 'capacity_sharing',
      data: { external_reference: 'ARI-917100' },
    },
  ],
});

function readPayloadExternalReference(
  payload: PrmsNormalizerRequestDto,
): string {
  const value = payload.results[0]?.data?.external_reference;
  if (typeof value !== 'string') {
    throw new Error(
      'fixture payload is missing string data.external_reference',
    );
  }
  return value;
}

function acceptedIngestResponse(payload: PrmsNormalizerRequestDto) {
  return {
    status: 200,
    body: {
      requestId: REQUEST_ID,
      results: [
        {
          success: true,
          external_reference: readPayloadExternalReference(payload),
          result: { result_code: 9199 },
        },
      ],
    },
  };
}

const eligibleFacts = (
  resultId: number,
  officialCode: number,
): PrmsSyncGateFacts => ({
  exists: true,
  result_id: resultId,
  result_official_code: officialCode,
  is_synced_to_prms: false,
  result_status_id: ResultStatusEnum.APPROVED,
  pool_funding_alignment_green: true,
  primary_contract: {
    agreement_id: 'C-POOL-T11',
    is_pool_funding_contributor: true,
  },
  indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  prms_policy_type_id: null,
});

function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function insertResult(officialCode: number): Promise<number> {
  await dataSource.query(
    'INSERT INTO `results` (`result_official_code`, `result_status_id`, `is_active`, `is_snapshot`) VALUES (?, NULL, 1, 0)',
    [officialCode],
  );
  const rows = (await dataSource.query(
    'SELECT `result_id` AS resultId FROM `results` WHERE `result_official_code` = ?',
    [officialCode],
  )) as { resultId: number }[];
  expect(rows).toHaveLength(1);
  return Number(rows[0].resultId);
}

async function deleteByOfficialCode(officialCode: number): Promise<void> {
  const rows = (await dataSource.query(
    'SELECT `result_id` AS resultId FROM `results` WHERE `result_official_code` = ?',
    [officialCode],
  )) as { resultId: number }[];
  for (const row of rows) {
    await dataSource.query(
      'DELETE FROM `result_prms_sync_log` WHERE `result_id` = ?',
      [row.resultId],
    );
  }
  await dataSource.query(
    'DELETE FROM `results` WHERE `result_official_code` = ?',
    [officialCode],
  );
}

describe('T-11 — claim-then-settle live concurrency (DC-11 / QA-7)', () => {
  let dc11ResultId: number;
  let refusalResultId: number;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await deleteByOfficialCode(DC11_OFFICIAL_CODE);
    await deleteByOfficialCode(REFUSAL_OFFICIAL_CODE);
    dc11ResultId = await insertResult(DC11_OFFICIAL_CODE);
    refusalResultId = await insertResult(REFUSAL_OFFICIAL_CODE);
  }, 60000);

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }
    try {
      await deleteByOfficialCode(DC11_OFFICIAL_CODE);
      await deleteByOfficialCode(REFUSAL_OFFICIAL_CODE);
    } finally {
      await dataSource.destroy();
    }
  });

  it('connects via ARI_TEST_MYSQL_*, never ARI_MYSQL_*', async () => {
    expect(process.env.ARI_TEST_MYSQL_HOST).toBeTruthy();
    expect(process.env.ARI_TEST_MYSQL_HOST).not.toBe(
      process.env.ARI_MYSQL_HOST,
    );
    expect(process.env.ARI_TEST_MYSQL_NAME).toBe('ari_scratch_test');

    const rows = (await dataSource.query('SELECT DATABASE() AS db')) as {
      db: string;
    }[];
    expect(rows[0].db).toBe('ari_scratch_test');
  });

  it('two service.sync calls started before either settles produce one POST, one ACCEPTED row, and one 409', async () => {
    const logRepository = new ResultPrmsSyncLogRepository(dataSource);
    jest
      .spyOn(logRepository, 'loadGateSnapshot')
      .mockResolvedValue(eligibleFacts(dc11ResultId, DC11_OFFICIAL_CODE));

    const ingestStarted = deferred();
    const ingestRelease = deferred();
    const payload = envelope();
    const ingest = jest.fn(async () => {
      ingestStarted.resolve();
      await ingestRelease.promise;
      return acceptedIngestResponse(payload);
    });

    const service = new ResultPrmsSyncService(
      logRepository,
      {
        loadByResultId: jest
          .fn()
          .mockResolvedValue({ result_id: dc11ResultId }),
      } as unknown as ResultPrmsSyncAggregateRepository,
      {
        build: jest.fn().mockReturnValue(payload),
      } as unknown as PayloadBuilder,
      { ingest } as unknown as PrmsNormalizerService,
      {
        getEnv: jest.fn().mockResolvedValue({ simple_value: 'test-key' }),
      } as unknown as AppConfigService,
      { ARI_IS_PRODUCTION: false } as unknown as AppConfig,
      { user_id: 7 } as unknown as CurrentUserUtil,
      // T-11: not the concern of this concurrency proof — a no-op stub.
      {
        recordOutboundPendingReview: jest.fn().mockResolvedValue(undefined),
      } as unknown as PrmsWebhookDeliveryRepository,
    );

    const first = service.sync(dc11ResultId);
    const second = service.sync(dc11ResultId);
    let ingestWaitTimer: NodeJS.Timeout | undefined;
    await Promise.race([
      ingestStarted.promise,
      new Promise((_, reject) => {
        ingestWaitTimer = setTimeout(
          () =>
            reject(
              new Error('ingest never started — claim did not reach the send'),
            ),
          5000,
        );
      }),
    ]);
    if (ingestWaitTimer) {
      clearTimeout(ingestWaitTimer);
    }
    await new Promise((resolve) => setImmediate(resolve));
    ingestRelease.resolve();

    const settled = await Promise.allSettled([first, second]);
    const fulfilled = settled.filter(
      (item): item is PromiseFulfilledResult<PrmsSyncResponseData> =>
        item.status === 'fulfilled',
    );
    const rejected = settled.filter(
      (item): item is PromiseRejectedResult => item.status === 'rejected',
    );

    expect(ingest).toHaveBeenCalledTimes(1);
    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0].value.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect((rejected[0].reason as ConflictException).getStatus()).toBe(409);
    expect((rejected[0].reason as ConflictException).message).toBe(
      PRMS_SYNC_CLAIM_COLLISION,
    );

    const rows = (await dataSource.query(
      'SELECT `outcome` AS outcome FROM `result_prms_sync_log` WHERE `result_id` = ?',
      [dc11ResultId],
    )) as { outcome: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].outcome).toBe(PrmsSyncOutcome.ACCEPTED);
  });

  it('two concurrent REFUSED_BY_STAR inserts get distinct monotonic attempt_numbers', async () => {
    const logRepository = new ResultPrmsSyncLogRepository(dataSource);
    const [first, second] = await Promise.all([
      logRepository.insertRefusedByStar({
        resultId: refusalResultId,
        environment: 'TEST',
        userId: 7,
        failureReason: 'Pool Funding Alignment is not green-checked',
      }),
      logRepository.insertRefusedByStar({
        resultId: refusalResultId,
        environment: 'TEST',
        userId: 8,
        failureReason: 'Pool Funding Alignment is not green-checked',
      }),
    ]);

    const numbers = [first.attemptNumber, second.attemptNumber].sort(
      (left, right) => left - right,
    );
    expect(numbers).toEqual([1, 2]);
    expect(new Set(numbers).size).toBe(2);

    const rows = (await dataSource.query(
      'SELECT `attempt_number` AS attemptNumber FROM `result_prms_sync_log` WHERE `result_id` = ? ORDER BY `attempt_number` ASC',
      [refusalResultId],
    )) as { attemptNumber: number }[];
    expect(rows.map((row) => Number(row.attemptNumber))).toEqual([1, 2]);
  });
});

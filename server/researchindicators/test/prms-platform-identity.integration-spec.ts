import { DataSource } from 'typeorm';
import { dataSource } from '../src/db/config/mysql/orm.test.config';
import { DeliveryCorrelationOutcome } from '../src/domain/entities/prms-webhook/enum/delivery-correlation-outcome.enum';
import { DeliveryProcessingState } from '../src/domain/entities/prms-webhook/enum/delivery-processing-state.enum';
import {
  DeliveryCorrelationInput,
  DeliveryCorrelationResult,
  DeliveryCorrelatorService,
} from '../src/domain/entities/prms-webhook/delivery-correlator.service';
import { PoolFundingMappingApplyService } from '../src/domain/entities/prms-webhook/pool-funding-mapping-apply.service';
import {
  resolveActiveSnapshot,
  PoolFundingMappingDiffService,
} from '../src/domain/entities/prms-webhook/pool-funding-mapping-diff.service';
import { PrmsSyncHistoryReader } from '../src/domain/entities/result-prms-sync/prms-sync-history.reader';
import { ResultPrmsSyncLogRepository } from '../src/domain/entities/result-prms-sync/repositories/result-prms-sync-log.repository';
import { ResultPrmsSyncStatusReader } from '../src/domain/entities/result-prms-sync/result-prms-sync-status.reader';
import { ReportingPlatformEnum } from '../src/domain/entities/results/enum/reporting-platform.enum';
import { ReportingYearResolver } from '../src/domain/shared/utils/reporting-year.resolver';
import { TocIntegrationService } from '../src/domain/tools/toc-integration/toc-integration.service';
import { PrmsSyncOutcome } from '../src/domain/tools/prms-normalizer/enum/prms-sync-outcome.enum';
import {
  parsePrmsRef,
  prmsExternalReferenceSql,
  prmsRef,
} from '../src/domain/tools/prms-normalizer/reference/prms-external-reference';

// @sdd-spec docs/specs/changes/tip-prms-phase-2/prms-platform-identity — T-07
//
// Behavioural proof on a real MySQL schema (R-PPI-002, R-PPI-004, design §13):
// one official code, one reporting year, a live STAR row and a live TIP row.
// STAR owns a sync-log row and a history row. TIP's status, history and next
// attempt do not see them. `TIP-<code>` correlates to the TIP live row; the
// bare code correlates to STAR.
//
// The code is 917200, not the spec's illustrative 123. This file creates its
// own rows and must not depend on whatever official code 123 the Dev dump
// already holds (Leader narrowing, FP-45). `TIP-917200` / `917200` are the
// same pair the requirements call `TIP-123` / `123`.
//
// result_official_code band 917200–917230 — read from the sibling integration
// headers before assigning (FP-45): 917000
// (result-prms-sync-log-outcome.integration-spec.ts), 917100 and 917110
// (result-prms-sync-claim-concurrency.integration-spec.ts). Fixture bands
// 900_000–900_600 and the 901/902/971 catalogs stay untouched. 917210, 917220
// and 917230 are the advisory cases (NULL-platform live copy, TIP push, NULL
// snapshot lookup) so they cannot disturb the collision pair.
//
// Connection contract: same fail-loud DataSource as
// test/result-prms-sync-claim-concurrency.integration-spec.ts (real MySQL,
// orm.test.config, beforeAll initialize, afterAll destroy). A missing scratch
// schema FAILS THIS FILE. This file does not use the dropped `result_id`
// column those siblings still insert (P-17) and does not fix them.
//
// KZ-017 — what this gate cannot reach:
// `npm test` (rootDir "src", testRegex ".*\\.spec\\.ts$") NEVER runs this
// file. The integration config is test/jest-integration.json (testRegex
// ".integration-spec.ts$"). A green unit suite is not this proof.
// The correlator persists the matched row's reporting year, and both live
// rows share that year, so the year alone cannot tell TIP from STAR. The
// correlate cases therefore read the `result_id` MySQL returned from the
// correlator's live-row SELECT (the schema's answer), then compare it to the
// id this file inserted.

const YEAR = 2026;
const CODE = 917200;
const NULL_PUSH_CODE = 917210;
const TIP_PUSH_CODE = 917220;
const NULL_SNAPSHOT_CODE = 917230;
const BAND = [CODE, NULL_PUSH_CODE, TIP_PUSH_CODE, NULL_SNAPSHOT_CODE];

const STAR_ATTEMPT = 2;
const COLLISION_ATTEMPT = 9;
const NULL_PUSH_PRMS_CODE = 917211;
const TIP_PUSH_PRMS_CODE = 917221;
const SQL_SAMPLE_CODE = 123;

const STAR_LOG_REQUEST = 't07-ppi-star-log';
const COLLISION_LOG_REQUEST = 't07-ppi-collision-log';

describe('T-07 — PRMS platform identity on the TEST schema', () => {
  let statusReader: ResultPrmsSyncStatusReader;
  let historyReader: PrmsSyncHistoryReader;
  let logRepository: ResultPrmsSyncLogRepository;
  let correlator: DeliveryCorrelatorService;
  let userId: number;
  let starLiveId: number;
  let tipLiveId: number;
  let starOutboundId: number;
  let starDecisionId: number;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await cleanupBand();
    await ensureReportYear(YEAR);
    userId = await loadUserId();

    starLiveId = await insertResult({
      code: CODE,
      year: YEAR,
      platform: ReportingPlatformEnum.STAR,
      snapshot: false,
    });
    tipLiveId = await insertResult({
      code: CODE,
      year: YEAR,
      platform: ReportingPlatformEnum.TIP,
      snapshot: false,
    });

    await insertLog({
      platform: ReportingPlatformEnum.STAR,
      externalReference: prmsRef(ReportingPlatformEnum.STAR, CODE),
      attempt: STAR_ATTEMPT,
      outcome: PrmsSyncOutcome.ACCEPTED,
      requestId: STAR_LOG_REQUEST,
    });
    // Same external_reference the TIP reader computes (`TIP-<code>`), tagged
    // STAR. The prefixed reference already hides the legitimate STAR attempt
    // (bare code) from TIP. This row is what makes dropping the platform
    // predicate on LAST_ATTEMPT_SQL observable: without it, TIP status
    // returns attempt 9.
    await insertLog({
      platform: ReportingPlatformEnum.STAR,
      externalReference: prmsRef(ReportingPlatformEnum.TIP, CODE),
      attempt: COLLISION_ATTEMPT,
      outcome: PrmsSyncOutcome.ACCEPTED,
      requestId: COLLISION_LOG_REQUEST,
    });

    starOutboundId = await insertHistory({
      deliveryId: 't07-ppi-star-outbound',
      platform: ReportingPlatformEnum.STAR,
      officialCode: String(CODE),
      year: YEAR,
      outcome: DeliveryCorrelationOutcome.CORRELATED,
      eventSource: 'STAR',
      status: 'PENDING_REVIEW',
      processingState: DeliveryProcessingState.PROCESSED,
    });
    starDecisionId = await insertHistory({
      deliveryId: 't07-ppi-star-decision',
      platform: ReportingPlatformEnum.STAR,
      officialCode: String(CODE),
      year: YEAR,
      outcome: DeliveryCorrelationOutcome.CORRELATED,
      eventSource: 'PRMS',
      decision: 'APPROVE',
      processingState: DeliveryProcessingState.PROCESSED,
    });

    const years = new ReportingYearResolver(dataSource);
    statusReader = new ResultPrmsSyncStatusReader(dataSource);
    historyReader = new PrmsSyncHistoryReader(dataSource);
    logRepository = new ResultPrmsSyncLogRepository(dataSource, years);
    correlator = new DeliveryCorrelatorService(
      dataSource,
      new PoolFundingMappingDiffService(dataSource),
      new PoolFundingMappingApplyService(dataSource, unusedToc(), years),
    );
  }, 60000);

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }
    try {
      await cleanupBand();
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

  it('keeps TIP status and history empty and leaves the STAR rows unchanged (R-PPI-002)', async () => {
    const tipStatus = await statusReader.getStatus(tipLiveId);
    const starStatus = await statusReader.getStatus(starLiveId);
    const tipHistory = await historyReader.getHistory(tipLiveId);
    const starHistory = await historyReader.getHistory(starLiveId);

    expect(tipStatus.last_attempt).toBeNull();
    expect(tipStatus.last_decision).toBeNull();
    expect(tipStatus.is_synced_to_prms).toBe(false);
    expect(tipHistory.events).toEqual([]);
    expect(tipHistory.sync_count).toBe(0);

    expect(starStatus.last_attempt?.attempt_number).toBe(STAR_ATTEMPT);
    expect(starStatus.last_attempt?.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(starStatus.last_decision?.decision).toBe('APPROVE');
    expect(starHistory.sync_count).toBe(1);
    expect(starHistory.events.map((event) => event.id).sort()).toEqual(
      [starOutboundId, starDecisionId].sort(),
    );

    const claimed = await logRepository.claimAttempt(tipLiveId, {
      environment: 'TEST',
      userId,
    });
    expect(claimed.kind).toBe('claimed');
    if (claimed.kind !== 'claimed') {
      return;
    }
    expect(claimed.attemptNumber).toBe(1);
    expect(claimed.resultOfficialCode).toBe(CODE);
    expect(claimed.resultYear).toBe(YEAR);

    const starAfter = await statusReader.getStatus(starLiveId);
    expect(starAfter.last_attempt?.attempt_number).toBe(STAR_ATTEMPT);
    expect(starAfter.last_decision?.decision).toBe('APPROVE');
    const starHistoryAfter = await historyReader.getHistory(starLiveId);
    expect(starHistoryAfter.events.map((event) => event.id).sort()).toEqual(
      [starOutboundId, starDecisionId].sort(),
    );
  });

  it('correlates TIP-<code> to the TIP live row and the bare code to STAR (R-PPI-004)', async () => {
    const tipDeliveryId = await insertHistory({
      deliveryId: 't07-ppi-corr-tip',
      platform: null,
      officialCode: prmsRef(ReportingPlatformEnum.TIP, CODE),
      year: null,
      outcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
      eventSource: 'PRMS',
      processingState: DeliveryProcessingState.RECEIVED,
    });
    const starDeliveryId = await insertHistory({
      deliveryId: 't07-ppi-corr-star',
      platform: null,
      officialCode: prmsRef(ReportingPlatformEnum.STAR, CODE),
      year: null,
      outcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
      eventSource: 'PRMS',
      processingState: DeliveryProcessingState.RECEIVED,
    });

    const tipHit = await correlateObserving(correlator, {
      id: tipDeliveryId,
      delivery_id: 't07-ppi-corr-tip',
      result_official_code: prmsRef(ReportingPlatformEnum.TIP, CODE),
    });
    const starHit = await correlateObserving(correlator, {
      id: starDeliveryId,
      delivery_id: 't07-ppi-corr-star',
      result_official_code: prmsRef(ReportingPlatformEnum.STAR, CODE),
    });

    expect(tipHit.result.applied).toBe(true);
    if (tipHit.result.applied) {
      expect(tipHit.result.correlationOutcome).toBe(
        DeliveryCorrelationOutcome.CORRELATED,
      );
      expect(tipHit.result.officialCode).toBe(CODE);
      expect(tipHit.result.resultYear).toBe(YEAR);
    }
    expect(tipHit.liveResultId).toBe(tipLiveId);
    expect(tipHit.boundPlatform).toBe(ReportingPlatformEnum.TIP);

    expect(starHit.result.applied).toBe(true);
    if (starHit.result.applied) {
      expect(starHit.result.correlationOutcome).toBe(
        DeliveryCorrelationOutcome.CORRELATED,
      );
      expect(starHit.result.officialCode).toBe(CODE);
      expect(starHit.result.resultYear).toBe(YEAR);
    }
    expect(starHit.liveResultId).toBe(starLiveId);
    expect(starHit.boundPlatform).toBe(ReportingPlatformEnum.STAR);

    const starDecision = await historyRow(starDecisionId);
    expect(starDecision.correlation_outcome).toBe(
      DeliveryCorrelationOutcome.CORRELATED,
    );
    expect(Number(starDecision.result_year)).toBe(YEAR);
    expect(starDecision.platform_code).toBe(ReportingPlatformEnum.STAR);
    expect(starDecision.decision).toBe('APPROVE');
  });

  it('evaluates the reference SQL as prmsRef for every platform, and NULL as STAR (§7.5)', async () => {
    for (const platform of Object.values(ReportingPlatformEnum)) {
      const ref = await evaluateReferenceSql(platform, SQL_SAMPLE_CODE);
      expect(ref).toBe(prmsRef(platform, SQL_SAMPLE_CODE));
    }
    const nullPlatform = await evaluateReferenceSql(null, SQL_SAMPLE_CODE);
    expect(nullPlatform).toBe(
      prmsRef(ReportingPlatformEnum.STAR, SQL_SAMPLE_CODE),
    );
  });

  it('rejects official code 0 (design §7.1)', () => {
    expect(parsePrmsRef('0')).toBeNull();
    expect(parsePrmsRef('TIP-0')).toBeNull();
  });

  it('copies a NULL pushed platform onto the STAR live row and leaves TIP untouched', async () => {
    const pushedId = await insertResult({
      code: NULL_PUSH_CODE,
      year: YEAR,
      platform: null,
      snapshot: true,
    });
    const starId = await insertResult({
      code: NULL_PUSH_CODE,
      year: YEAR,
      platform: ReportingPlatformEnum.STAR,
      snapshot: false,
    });
    const tipId = await insertResult({
      code: NULL_PUSH_CODE,
      year: YEAR,
      platform: ReportingPlatformEnum.TIP,
      snapshot: false,
    });
    await settleAccepted(
      pushedId,
      NULL_PUSH_PRMS_CODE,
      prmsRef(ReportingPlatformEnum.STAR, NULL_PUSH_CODE),
    );

    expect(await prmsCodeOf(starId)).toBe(NULL_PUSH_PRMS_CODE);
    expect(await prmsCodeOf(tipId)).toBeNull();
  });

  it('leaves the same-code STAR live row untouched when the pushed row is TIP', async () => {
    const pushedId = await insertResult({
      code: TIP_PUSH_CODE,
      year: YEAR,
      platform: ReportingPlatformEnum.TIP,
      snapshot: true,
    });
    const starId = await insertResult({
      code: TIP_PUSH_CODE,
      year: YEAR,
      platform: ReportingPlatformEnum.STAR,
      snapshot: false,
    });
    const tipId = await insertResult({
      code: TIP_PUSH_CODE,
      year: YEAR,
      platform: ReportingPlatformEnum.TIP,
      snapshot: false,
    });
    await settleAccepted(
      pushedId,
      TIP_PUSH_PRMS_CODE,
      prmsRef(ReportingPlatformEnum.TIP, TIP_PUSH_CODE),
    );

    expect(await prmsCodeOf(tipId)).toBe(TIP_PUSH_PRMS_CODE);
    expect(await prmsCodeOf(starId)).toBeNull();
  });

  it('resolves a NULL platform snapshot from a STAR history row', async () => {
    const snapshotId = await insertResult({
      code: NULL_SNAPSHOT_CODE,
      year: YEAR,
      platform: null,
      snapshot: true,
    });
    const historyId = await insertHistory({
      deliveryId: 't07-ppi-null-snapshot',
      platform: ReportingPlatformEnum.STAR,
      officialCode: String(NULL_SNAPSHOT_CODE),
      year: YEAR,
      outcome: DeliveryCorrelationOutcome.CORRELATED,
      eventSource: 'STAR',
      status: 'PENDING_REVIEW',
      processingState: DeliveryProcessingState.PROCESSED,
    });
    const history = await historyRow(historyId);

    const matched = await resolveActiveSnapshot(
      (sql, params) => dataSource.query(sql, params),
      String(NULL_SNAPSHOT_CODE),
      YEAR,
      history.platform_code,
    );
    const missed = await resolveActiveSnapshot(
      (sql, params) => dataSource.query(sql, params),
      String(NULL_SNAPSHOT_CODE),
      YEAR,
      ReportingPlatformEnum.TIP,
    );

    expect(matched).toEqual({ ok: true, resultId: snapshotId });
    expect(missed.ok).toBe(false);
  });
});

async function cleanupBand(): Promise<void> {
  const codes = BAND.map(String);
  const references = BAND.flatMap((code) =>
    (Object.values(ReportingPlatformEnum) as ReportingPlatformEnum[]).map(
      (platform) => prmsRef(platform, code),
    ),
  );
  await dataSource.query(
    `DELETE FROM result_prms_sync_history
      WHERE delivery_id LIKE 't07-ppi-%'
         OR result_official_code IN (${placeholders(codes.length)})`,
    codes,
  );
  await dataSource.query(
    `DELETE FROM result_prms_sync_log
      WHERE request_id IN (?, ?)
         OR external_reference IN (${placeholders(references.length)})`,
    [STAR_LOG_REQUEST, COLLISION_LOG_REQUEST, ...references],
  );
  await dataSource.query(
    `DELETE FROM results
      WHERE result_official_code IN (${placeholders(BAND.length)})`,
    BAND,
  );
}

async function ensureReportYear(year: number): Promise<void> {
  await dataSource.query(
    `INSERT INTO report_years (report_year, is_active)
     SELECT ?, TRUE FROM DUAL
     WHERE NOT EXISTS (
       SELECT 1 FROM report_years WHERE report_year = ?
     )`,
    [year, year],
  );
}

async function loadUserId(): Promise<number> {
  const rows = (await dataSource.query(
    'SELECT sec_user_id AS id FROM sec_users ORDER BY sec_user_id ASC LIMIT 1',
  )) as { id: number }[];
  const id = Number(rows[0]?.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      'scratch schema has no sec_users row; claimAttempt cannot set created_by',
    );
  }
  return id;
}

async function insertResult(input: {
  code: number;
  year: number;
  platform: ReportingPlatformEnum | null;
  snapshot: boolean;
}): Promise<number> {
  const header = await dataSource.query(
    `INSERT INTO results
       (result_official_code, report_year_id, platform_code, is_snapshot,
        is_active, result_status_id, is_synced_to_prms)
     VALUES (?, ?, ?, ?, TRUE, NULL, FALSE)`,
    [input.code, input.year, input.platform, input.snapshot ? 1 : 0],
  );
  const id = insertIdOf(header);
  const rows = (await dataSource.query(
    `SELECT result_id AS resultId, platform_code AS platform
       FROM results WHERE result_id = ?`,
    [id],
  )) as { resultId: number; platform: string | null }[];
  expect(rows).toHaveLength(1);
  expect(rows[0].platform).toBe(input.platform);
  return Number(rows[0].resultId);
}

async function insertLog(input: {
  platform: ReportingPlatformEnum;
  externalReference: string;
  attempt: number;
  outcome: PrmsSyncOutcome;
  requestId: string;
}): Promise<void> {
  await dataSource.query(
    `INSERT INTO result_prms_sync_log
       (platform_code, external_reference, result_year, attempt_number,
        environment, outcome, request_id, is_active)
     VALUES (?, ?, ?, ?, 'TEST', ?, ?, TRUE)`,
    [
      input.platform,
      input.externalReference,
      YEAR,
      input.attempt,
      input.outcome,
      input.requestId,
    ],
  );
}

async function insertHistory(input: {
  deliveryId: string;
  platform: string | null;
  officialCode: string;
  year: number | null;
  outcome: DeliveryCorrelationOutcome;
  eventSource: 'STAR' | 'PRMS';
  status?: string | null;
  decision?: string | null;
  processingState: DeliveryProcessingState;
}): Promise<number> {
  const header = await dataSource.query(
    `INSERT INTO result_prms_sync_history
       (delivery_id, occurred_at, environment, correlation_outcome,
        platform_code, result_official_code, result_year, decision,
        decided_at, processing_state, event_source, status, is_active)
     VALUES (?, NOW(), 'TEST', ?, ?, ?, ?, ?,
             CASE WHEN ? IS NULL THEN NULL ELSE NOW() END,
             ?, ?, ?, TRUE)`,
    [
      input.deliveryId,
      input.outcome,
      input.platform,
      input.officialCode,
      input.year,
      input.decision ?? null,
      input.decision ?? null,
      input.processingState,
      input.eventSource,
      input.status ?? null,
    ],
  );
  return insertIdOf(header);
}

async function historyRow(id: number): Promise<{
  correlation_outcome: string;
  result_year: number | null;
  platform_code: string | null;
  decision: string | null;
}> {
  const rows = (await dataSource.query(
    `SELECT correlation_outcome, result_year, platform_code, decision
       FROM result_prms_sync_history WHERE id = ?`,
    [id],
  )) as {
    correlation_outcome: string;
    result_year: number | null;
    platform_code: string | null;
    decision: string | null;
  }[];
  expect(rows).toHaveLength(1);
  return rows[0];
}

async function settleAccepted(
  pushedResultId: number,
  prmsResultCode: number,
  externalReference: string,
): Promise<void> {
  const header = await dataSource.query(
    `INSERT INTO result_prms_sync_log
       (platform_code, external_reference, result_year, attempt_number,
        environment, outcome, request_id, is_active)
     VALUES (?, ?, ?, 1, 'TEST', ?, ?, TRUE)`,
    [
      externalReference.startsWith(`${ReportingPlatformEnum.TIP}-`)
        ? ReportingPlatformEnum.TIP
        : ReportingPlatformEnum.STAR,
      externalReference,
      YEAR,
      PrmsSyncOutcome.IN_FLIGHT,
      `t07-ppi-settle-${pushedResultId}`,
    ],
  );
  const repository = new ResultPrmsSyncLogRepository(
    dataSource,
    new ReportingYearResolver(dataSource),
  );
  const status = await repository.settleIfInFlight({
    attemptId: insertIdOf(header),
    resultId: pushedResultId,
    outcome: PrmsSyncOutcome.ACCEPTED,
    userId: (
      (await dataSource.query(
        'SELECT sec_user_id AS id FROM sec_users ORDER BY sec_user_id ASC LIMIT 1',
      )) as { id: number }[]
    )[0].id,
    externalReference,
    prmsResultCode,
    prmsPhaseId: null,
  });
  expect(status).toBe('settled');
}

async function prmsCodeOf(resultId: number): Promise<number | null> {
  const rows = (await dataSource.query(
    'SELECT prms_result_code AS code FROM results WHERE result_id = ?',
    [resultId],
  )) as { code: number | null }[];
  expect(rows).toHaveLength(1);
  return rows[0].code == null ? null : Number(rows[0].code);
}

async function evaluateReferenceSql(
  platform: ReportingPlatformEnum | null,
  code: number,
): Promise<string> {
  const rows = (await dataSource.query(
    `SELECT ${prmsExternalReferenceSql('platform_code', 'result_official_code')} AS ref
       FROM (SELECT ? AS platform_code, ? AS result_official_code) AS sample`,
    [platform, code],
  )) as { ref: string }[];
  return String(rows[0].ref);
}

interface ObservedCorrelation {
  result: DeliveryCorrelationResult;
  liveResultId: number | null;
  boundPlatform: string | null;
}

async function correlateObserving(
  correlator: DeliveryCorrelatorService,
  input: DeliveryCorrelationInput,
): Promise<ObservedCorrelation> {
  const original = dataSource.query.bind(dataSource);
  let liveResultId: number | null = null;
  let boundPlatform: string | null = null;
  dataSource.query = (async (query: string, parameters?: unknown[]) => {
    const rows = await original(query, parameters);
    if (
      typeof query === 'string' &&
      query.includes('is_snapshot = FALSE') &&
      query.includes('platform_code = ?')
    ) {
      const first = Array.isArray(rows)
        ? (rows[0] as { result_id?: unknown } | undefined)
        : undefined;
      liveResultId = first == null ? null : Number(first.result_id);
      boundPlatform =
        typeof parameters?.[0] === 'string' ? parameters[0] : null;
    }
    return rows;
  }) as DataSource['query'];
  try {
    const result = await correlator.correlate(input);
    return { result, liveResultId, boundPlatform };
  } finally {
    dataSource.query = original;
  }
}

function unusedToc(): TocIntegrationService {
  return {
    getTocResults: () =>
      Promise.reject(new Error('T-07 correlate fixture must not call ToC')),
  } as unknown as TocIntegrationService;
}

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number } | undefined)?.insertId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`insert did not return an id: ${JSON.stringify(result)}`);
  }
  return id;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

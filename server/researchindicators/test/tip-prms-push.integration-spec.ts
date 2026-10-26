import { dataSource } from '../src/db/config/mysql/orm.test.config';
import { AppConfigKey } from '../src/domain/entities/app-config/enum/app-config-key.enum';
import { IndicatorsEnum } from '../src/domain/entities/indicators/enum/indicators.enum';
import { PrmsWebhookDeliveryRepository } from '../src/domain/entities/prms-webhook/repositories/prms-webhook-delivery.repository';
import { ContractRolesEnum } from '../src/domain/entities/result-contracts/enum/contract-roles.enum';
import { ResultPrmsSyncAggregateRepository } from '../src/domain/entities/result-prms-sync/repositories/result-prms-sync-aggregate.repository';
import { ResultPrmsSyncLogRepository } from '../src/domain/entities/result-prms-sync/repositories/result-prms-sync-log.repository';
import {
  PrmsSyncPersistedRefusalException,
  ResultPrmsSyncService,
} from '../src/domain/entities/result-prms-sync/result-prms-sync.service';
import { ResultStatusEnum } from '../src/domain/entities/result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from '../src/domain/entities/results/enum/reporting-platform.enum';
import { UserRolesEnum } from '../src/domain/entities/user-roles/enum/user-roles.enum';
import { AppConfig } from '../src/domain/shared/utils/app-config.util';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { ReportingYearResolver } from '../src/domain/shared/utils/reporting-year.resolver';
import { ClarisaGeoScopeEnum } from '../src/domain/tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { CapacitySharingBuilder } from '../src/domain/tools/prms-normalizer/builders/capacity-sharing.builder';
import { CommonFieldsBuilder } from '../src/domain/tools/prms-normalizer/builders/common-fields.builder';
import { InnovationDevelopmentBuilder } from '../src/domain/tools/prms-normalizer/builders/innovation-development.builder';
import { InnovationUseBuilder } from '../src/domain/tools/prms-normalizer/builders/innovation-use.builder';
import { KnowledgeProductBuilder } from '../src/domain/tools/prms-normalizer/builders/knowledge-product.builder';
import { PayloadBuilder } from '../src/domain/tools/prms-normalizer/builders/payload.builder';
import { PolicyChangeBuilder } from '../src/domain/tools/prms-normalizer/builders/policy-change.builder';
import { PrmsNormalizerRequestDto } from '../src/domain/tools/prms-normalizer/dto/prms-normalizer.dto';
import { PrmsSyncOutcome } from '../src/domain/tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PrmsNormalizerService } from '../src/domain/tools/prms-normalizer/prms-normalizer.service';
import { prmsRef } from '../src/domain/tools/prms-normalizer/reference/prms-external-reference';
import { TipHandleRepository } from '../src/domain/tools/tip-integration/repository/tip-handle.repository';
import { TipTocMappingDto } from '../src/domain/tools/tip-integration/dto/response-year-tip.dto';

// @sdd-spec docs/specs/changes/tip-prms-phase-2/tip-prms-push — T-05
//
// Behavioural proof on the TEST container (Dev dump + pending migrations).
// result_official_code band 917400–917499. Sibling integration headers
// read before assigning (FP-45): 917000
// (result-prms-sync-log-outcome.integration-spec.ts), 917100 and 917110
// (result-prms-sync-claim-concurrency.integration-spec.ts), 917200–917230
// (prms-platform-identity.integration-spec.ts), 917300–917399
// (tip-versioning.integration-spec.ts). bilateral-primary-contributing-sp
// builds a private schema and does not reserve a results band. Fixture bands
// 900_000–906_000 stay untouched.
//
// The engine under test is the production ResultPrmsSyncService.sync,
// including loadGateSnapshot, the payload builder, claim, settle, and
// recordPrmsResultCodeOnLiveVersion. Only PrmsNormalizerService.ingest is
// stubbed, and it returns one ACCEPTED 207 row.
//
// KZ-017 — what this gate cannot reach:
// `npm test` (rootDir "src") never collects this file. A green unit suite
// is not this proof. The live PRMS TEST host is not called: ingest is
// stubbed, so an accepted code here is the stub's code written by the
// engine, not a code PRMS assigned. AppConfigService is not constructed
// (it needs a request-scoped CurrentUserUtil and AppConfigRepository);
// the API-key read is the same app_config row, and a missing row returns
// null, which sync already tolerates via `apiKeyConfig?.simple_value`.
// The secondary schema name on Dev is `alliancereportingdb`. That schema
// does not exist on this container, so the aggregate repository is given
// `ari_scratch_test` — the database this file is connected to. OpenSearch,
// RabbitMQ, and TipIntegrationModule's HTTP clients are not booted.
// Compiling TipIntegrationModule requires those clients (PrmsOpenSearchModule,
// HttpModule, ResultsModule) and is not a closed graph in this harness.

const BAND_LO = 917400;
const BAND_HI = 917499;
const YEAR = 2026;
const CODE = 917400;
const NULL_ACTOR_CODE = 917410;
const WITH_CODE = 917420;
const WITHOUT_CODE = 917421;
const STORED_PRMS_CODE = 917492;
const ACCEPTED_PRMS_CODE = 917491;
const SEEDED_ROW_COUNT = 6;

const CONTRACT_ID = 'T05-917400';
const CARNET = 'T05PUSH';
const OWNER_EMAIL = 't05-push@cgiar.org';
const HANDLE = 'https://hdl.handle.net/10568/t05-917400';
const NULL_ACTOR_HANDLE = 'https://hdl.handle.net/10568/t05-917410';
const EVIDENCE_ROLE = 1;

const APPROVED_REFUSAL =
  'Result is not Approved; only results with result_status_id = 6 can be sent to PRMS';
const MISSING_AUTHOR = "Missing mandatory field 'created_by'";

const TOC_MAPPING: TipTocMappingDto = {
  science_program_id: 'SP01',
  aow_compose_code: 'SP01-AOW05',
  toc_result_id: 917401,
  result_title: 'T05 TIP toc',
  result_indicator_description: 'T05 indicator',
  result_indicator_type_name: 'Number',
  target_contribution: 1,
};

const AUTHOR = {
  email: 't05-submitter@cgiar.org',
  first_name: 'Tip',
  last_name: 'Submitter',
};

type Row = Record<string, unknown>;

function assertScratchTarget(): void {
  const options = dataSource.options as {
    host?: string;
    port?: number;
    database?: string;
  };
  expect(options.host).toBe('127.0.0.1');
  expect(options.port).toBe(3307);
  expect(options.database).toBe('ari_scratch_test');
  expect(options.host).not.toBe('192.168.20.210');
  expect(options.database).not.toBe(process.env.ARI_MYSQL_NAME);
}

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number } | undefined)?.insertId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`insert did not return an id: ${JSON.stringify(result)}`);
  }
  return id;
}

function asCode(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function externalReferenceOf(payload: PrmsNormalizerRequestDto): string {
  const value = payload.results[0]?.data?.external_reference;
  if (typeof value !== 'string') {
    throw new Error('stub payload is missing data.external_reference');
  }
  return value;
}

describe('T-05 — TIP PRMS push on the TEST schema', () => {
  let logRepository: ResultPrmsSyncLogRepository;
  let tipHandles: TipHandleRepository;
  let service: ResultPrmsSyncService;
  let currentUser: CurrentUserUtil;
  let ingest: jest.Mock;
  let ownerId: number;
  let versionId: number;
  let tipLiveId: number;
  let starId: number;
  let nullActorVersionId: number;
  let withCodeId: number;
  let withoutCodeId: number;

  beforeAll(async () => {
    assertScratchTarget();
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const database = (await dataSource.query('SELECT DATABASE() AS db')) as {
      db: string;
    }[];
    expect(database[0].db).toBe('ari_scratch_test');

    await cleanupBand();
    ownerId = await ensureOwner();
    versionId = await insertEligibleVersion({
      code: CODE,
      handle: HANDLE,
      title: 'T05 TIP version',
    });
    tipLiveId = await insertShell({
      code: CODE,
      platform: ReportingPlatformEnum.TIP,
      snapshot: false,
      title: 'T05 TIP live',
    });
    starId = await insertShell({
      code: CODE,
      platform: ReportingPlatformEnum.STAR,
      snapshot: false,
      title: 'T05 STAR untouched',
    });
    nullActorVersionId = await insertEligibleVersion({
      code: NULL_ACTOR_CODE,
      handle: NULL_ACTOR_HANDLE,
      title: 'T05 null actor',
    });
    withCodeId = await insertShell({
      code: WITH_CODE,
      platform: ReportingPlatformEnum.TIP,
      snapshot: true,
      title: 'T05 already coded',
      prmsResultCode: STORED_PRMS_CODE,
    });
    withoutCodeId = await insertShell({
      code: WITHOUT_CODE,
      platform: ReportingPlatformEnum.TIP,
      snapshot: true,
      title: 'T05 no code',
    });

    const seeded = await countBand();
    expect(seeded).toBe(SEEDED_ROW_COUNT);

    const years = new ReportingYearResolver(dataSource);
    logRepository = new ResultPrmsSyncLogRepository(dataSource, years);
    tipHandles = new TipHandleRepository(dataSource);
    currentUser = new CurrentUserUtil(
      {} as ConstructorParameters<typeof CurrentUserUtil>[0],
    );
    ingest = jest.fn(async (payload: PrmsNormalizerRequestDto) => ({
      status: 207,
      body: {
        requestId: 't05-accepted-207',
        results: [
          {
            success: true,
            external_reference: externalReferenceOf(payload),
            result: { result_code: ACCEPTED_PRMS_CODE },
          },
        ],
      },
    }));
    const appConfig = {
      ARI_IS_PRODUCTION: false,
      ARI_SECONDARY_MYSQL_NAME: 'ari_scratch_test',
    } as AppConfig;
    service = new ResultPrmsSyncService(
      logRepository,
      new ResultPrmsSyncAggregateRepository(dataSource, appConfig),
      new PayloadBuilder(
        new CommonFieldsBuilder(),
        new CapacitySharingBuilder(),
        new InnovationDevelopmentBuilder(),
        new PolicyChangeBuilder(),
        new InnovationUseBuilder(),
        new KnowledgeProductBuilder(),
      ),
      { ingest } as unknown as PrmsNormalizerService,
      {
        getEnv: async (key: AppConfigKey) => {
          const rows = (await dataSource.query(
            'SELECT simple_value FROM app_config WHERE `key` = ? AND is_active = TRUE LIMIT 1',
            [key],
          )) as { simple_value: string | null }[];
          if (!rows[0]) {
            return null;
          }
          return { simple_value: rows[0].simple_value };
        },
      } as unknown as ConstructorParameters<typeof ResultPrmsSyncService>[4],
      appConfig,
      currentUser,
      new PrmsWebhookDeliveryRepository(dataSource),
    );
  }, 120000);

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

  it('connects via ARI_TEST_MYSQL_* and the seed count is not zero', async () => {
    assertScratchTarget();
    expect(process.env.ARI_TEST_MYSQL_HOST).toBe('127.0.0.1');
    expect(process.env.ARI_TEST_MYSQL_NAME).toBe('ari_scratch_test');
    expect(process.env.ARI_TEST_MYSQL_HOST).not.toBe(
      process.env.ARI_MYSQL_HOST,
    );
    expect(await countBand()).toBe(SEEDED_ROW_COUNT);
    expect(versionId).toBeGreaterThan(0);
    expect(tipLiveId).toBeGreaterThan(0);
    expect(starId).toBeGreaterThan(0);
  });

  it('loadGateSnapshot returns platform_code TIP for the version row (R-TPP-003)', async () => {
    const snapshot = await logRepository.loadGateSnapshot(versionId);
    expect(snapshot.exists).toBe(true);
    expect(snapshot.platform_code).toBe('TIP');
    expect(snapshot.result_status_id).toBe(ResultStatusEnum.COMPLETED_IN_TIP);
    expect(snapshot.indicator_id).toBe(IndicatorsEnum.KNOWLEDGE_PRODUCT);
    expect(snapshot.pool_funding_alignment_green).toBe(true);
    expect(snapshot.primary_contract?.is_pool_funding_contributor).toBe(true);
    expect(snapshot.report_year).toBe(YEAR);
  });

  it('idsWithPrmsCode returns only rows that already store a code (R-TPP-002)', async () => {
    await expect(tipHandles.idsWithPrmsCode([])).resolves.toEqual([]);
    const coded = await tipHandles.idsWithPrmsCode([
      withCodeId,
      withoutCodeId,
      versionId,
    ]);
    expect(coded).toEqual([withCodeId]);
    const stored = await readResult(withCodeId);
    const bare = await readResult(withoutCodeId);
    expect(asCode(stored.prms_result_code)).toBe(STORED_PRMS_CODE);
    expect(asCode(bare.prms_result_code)).toBeNull();
  });

  it('an ACCEPTED 207 writes the code on the TIP version and live row, and not on the STAR row (R-TPP-006)', async () => {
    const starBefore = await readResult(starId);
    currentUser.setSystemUser({ sec_user_id: ownerId }, true);
    const callsBefore = ingest.mock.calls.length;

    const response = await service.sync(versionId, {
      origin: 'TIP_SYNC',
      tocMapping: TOC_MAPPING,
      author: AUTHOR,
    });

    expect(response.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(response.prms_result_code).toBe(ACCEPTED_PRMS_CODE);
    expect(ingest.mock.calls.length).toBe(callsBefore + 1);

    const version = await readResult(versionId);
    const live = await readResult(tipLiveId);
    const star = await readResult(starId);
    expect(Number(version.is_synced_to_prms)).toBe(1);
    expect(asCode(version.prms_result_code)).toBe(ACCEPTED_PRMS_CODE);
    expect(asCode(live.prms_result_code)).toBe(ACCEPTED_PRMS_CODE);
    expect(live.platform_code).toBe(ReportingPlatformEnum.TIP);
    expect(Number(live.is_snapshot)).toBe(0);
    expect(asCode(star.prms_result_code)).toBeNull();
    expect(Number(star.is_synced_to_prms)).toBe(0);
    expect(star.platform_code).toBe(ReportingPlatformEnum.STAR);
    expect(star.title).toBe(starBefore.title);
    expect(asCode(star.result_official_code)).toBe(CODE);

    // [advisory-grade] a non-null actor is written onto the ACCEPTED log row.
    const acceptedLog = await latestLog(
      prmsRef(ReportingPlatformEnum.TIP, CODE),
      PrmsSyncOutcome.ACCEPTED,
    );
    expect(asCode(acceptedLog.created_by)).toBe(ownerId);
  });

  it('a null-author TIP sync records REFUSED_BY_STAR with created_by NULL (R-TPP-005, R-TPP-007)', async () => {
    currentUser.setSystemUser(null, true);
    const callsBefore = ingest.mock.calls.length;
    const reference = prmsRef(ReportingPlatformEnum.TIP, NULL_ACTOR_CODE);

    await expectRefusal(
      () =>
        service.sync(nullActorVersionId, {
          origin: 'TIP_SYNC',
          tocMapping: TOC_MAPPING,
          author: null,
        }),
      MISSING_AUTHOR,
    );

    expect(ingest.mock.calls.length).toBe(callsBefore);
    const log = await latestLog(reference, PrmsSyncOutcome.REFUSED_BY_STAR);
    expect(log.failure_reason).toBe(MISSING_AUTHOR);
    expect(log.created_by).toBeNull();
    expect(log.request_payload).toBeNull();
    const version = await readResult(nullActorVersionId);
    expect(Number(version.is_synced_to_prms)).toBe(0);
    expect(asCode(version.prms_result_code)).toBeNull();
    expect(await inFlightCount(reference)).toBe(0);
  });

  it('the same row with no origin makes no claim and is refused as not Approved (R-TPP-003)', async () => {
    currentUser.setSystemUser(null, true);
    const callsBefore = ingest.mock.calls.length;
    const reference = prmsRef(ReportingPlatformEnum.TIP, NULL_ACTOR_CODE);
    const logsBefore = await logCount(reference);
    const inFlightBefore = await inFlightCount(reference);

    await expectRefusal(
      () => service.sync(nullActorVersionId),
      APPROVED_REFUSAL,
    );

    expect(ingest.mock.calls.length).toBe(callsBefore);
    expect(await inFlightCount(reference)).toBe(inFlightBefore);
    expect(await logCount(reference)).toBe(logsBefore + 1);
    const log = await latestLog(reference, PrmsSyncOutcome.REFUSED_BY_STAR);
    expect(log.failure_reason).toBe(APPROVED_REFUSAL);
    expect(log.created_by).toBeNull();
    const version = await readResult(nullActorVersionId);
    expect(Number(version.is_synced_to_prms)).toBe(0);
  });
});

async function expectRefusal(
  run: () => Promise<unknown>,
  message: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(PrmsSyncPersistedRefusalException);
    const refusal = error as PrmsSyncPersistedRefusalException;
    expect(refusal.responseData.outcome).toBe(PrmsSyncOutcome.REFUSED_BY_STAR);
    expect(refusal.responseData.failure_reason).toBe(message);
    return;
  }
  throw new Error(`sync resolved; expected refusal "${message}"`);
}

async function countBand(): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT COUNT(*) AS c
       FROM results
      WHERE result_official_code BETWEEN ? AND ?`,
    [BAND_LO, BAND_HI],
  )) as Row[];
  return Number(rows[0].c);
}

async function readResult(resultId: number): Promise<Row> {
  const rows = (await dataSource.query(
    `SELECT result_id, result_official_code, platform_code, is_snapshot,
            is_synced_to_prms, prms_result_code, title, result_status_id
       FROM results
      WHERE result_id = ?`,
    [resultId],
  )) as Row[];
  expect(rows).toHaveLength(1);
  return rows[0];
}

async function latestLog(
  externalReference: string,
  outcome: PrmsSyncOutcome,
): Promise<Row> {
  const rows = (await dataSource.query(
    `SELECT id, outcome, failure_reason, created_by, request_payload
       FROM result_prms_sync_log
      WHERE platform_code = ?
        AND external_reference = ?
        AND result_year = ?
        AND outcome = ?
      ORDER BY id DESC
      LIMIT 1`,
    [ReportingPlatformEnum.TIP, externalReference, YEAR, outcome],
  )) as Row[];
  expect(rows).toHaveLength(1);
  return rows[0];
}

async function logCount(externalReference: string): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT COUNT(*) AS c
       FROM result_prms_sync_log
      WHERE platform_code = ?
        AND external_reference = ?
        AND result_year = ?`,
    [ReportingPlatformEnum.TIP, externalReference, YEAR],
  )) as Row[];
  return Number(rows[0].c);
}

async function inFlightCount(externalReference: string): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT COUNT(*) AS c
       FROM result_prms_sync_log
      WHERE platform_code = ?
        AND external_reference = ?
        AND result_year = ?
        AND outcome = ?`,
    [
      ReportingPlatformEnum.TIP,
      externalReference,
      YEAR,
      PrmsSyncOutcome.IN_FLIGHT,
    ],
  )) as Row[];
  return Number(rows[0].c);
}

async function ensureOwner(): Promise<number> {
  await dataSource.query(
    `INSERT INTO alliance_user_staff
       (carnet, first_name, last_name, email, is_active, created_at)
     VALUES (?, 'Tip', 'Push', ?, 1, NOW())
     ON DUPLICATE KEY UPDATE email = VALUES(email), is_active = 1`,
    [CARNET, OWNER_EMAIL],
  );
  const existing = (await dataSource.query(
    'SELECT sec_user_id AS id FROM sec_users WHERE email = ? LIMIT 1',
    [OWNER_EMAIL],
  )) as { id: number }[];
  if (existing[0]) {
    return Number(existing[0].id);
  }
  return insertIdOf(
    await dataSource.query(
      `INSERT INTO sec_users (email, first_name, last_name, carnet, is_active, created_at)
       VALUES (?, 'Tip', 'Push', ?, 1, NOW())`,
      [OWNER_EMAIL, CARNET],
    ),
  );
}

async function insertShell(input: {
  code: number;
  platform: ReportingPlatformEnum;
  snapshot: boolean;
  title: string;
  prmsResultCode?: number;
}): Promise<number> {
  return insertIdOf(
    await dataSource.query(
      `INSERT INTO results
         (result_official_code, report_year_id, platform_code, is_snapshot,
          is_active, title, result_status_id, is_synced_to_prms, prms_result_code)
       VALUES (?, ?, ?, ?, 1, ?, ?, 0, ?)`,
      [
        input.code,
        YEAR,
        input.platform,
        input.snapshot ? 1 : 0,
        input.title,
        ResultStatusEnum.COMPLETED_IN_TIP,
        input.prmsResultCode ?? null,
      ],
    ),
  );
}

async function insertEligibleVersion(input: {
  code: number;
  handle: string;
  title: string;
}): Promise<number> {
  const resultId = insertIdOf(
    await dataSource.query(
      `INSERT INTO results
         (result_official_code, title, description, indicator_id, result_status_id,
          platform_code, report_year_id, geo_scope_id, is_snapshot,
          is_synced_to_prms, is_partner_not_applicable, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1, 1, NOW())`,
      [
        input.code,
        input.title,
        'T05 synthetic TIP knowledge product. Not a real result.',
        IndicatorsEnum.KNOWLEDGE_PRODUCT,
        ResultStatusEnum.COMPLETED_IN_TIP,
        ReportingPlatformEnum.TIP,
        YEAR,
        ClarisaGeoScopeEnum.GLOBAL,
      ],
    ),
  );

  await dataSource.query(
    `INSERT INTO agresso_contracts
       (agreement_id, center_amount, center_amount_usd, grant_amount, grant_amount_usd,
        is_pool_funding_contributor, ubwClientDescription, description, is_active, created_at)
     VALUES (?, 0, 0, 0, 0, 1, 'ExCIAT', 'T05 synthetic pool contract', 1, NOW())
     ON DUPLICATE KEY UPDATE
       is_pool_funding_contributor = 1,
       ubwClientDescription = 'ExCIAT',
       is_active = 1`,
    [CONTRACT_ID],
  );
  await dataSource.query(
    `INSERT INTO result_contracts
       (result_id, contract_id, contract_role_id, is_primary, is_active, created_at)
     VALUES (?, ?, ?, 1, 1, NOW())`,
    [resultId, CONTRACT_ID, ContractRolesEnum.ALIGNMENT],
  );
  const alignmentId = insertIdOf(
    await dataSource.query(
      `INSERT INTO result_pool_funding_alignment
         (result_id, has_contribution, is_active, created_at)
       VALUES (?, 1, 1, NOW())`,
      [resultId],
    ),
  );
  await dataSource.query(
    `INSERT INTO result_pool_funding_alignment_sp
       (alignment_id, sp_code, sp_role, is_active, created_at)
     VALUES (?, 'SP01', 'PRIMARY', 1, NOW())`,
    [alignmentId],
  );
  await dataSource.query(
    `INSERT INTO result_pool_funding_toc_alignment
       (result_id, sp_code, aligns_with_toc, is_active, created_at)
     VALUES (?, 'SP01', 1, 1, NOW())`,
    [resultId],
  );
  await dataSource.query(
    `INSERT INTO result_evidences
       (result_id, evidence_description, evidence_url, evidence_role_id,
        is_private, is_active, created_at)
     VALUES (?, 'Handled', ?, ?, 0, 1, NOW())`,
    [resultId, input.handle, EVIDENCE_ROLE],
  );
  await dataSource.query(
    `INSERT INTO result_users
       (result_id, user_id, user_role_id, is_active, created_at)
     VALUES (?, ?, ?, 1, NOW())`,
    [resultId, CARNET, UserRolesEnum.MAIN_CONTACT],
  );
  return resultId;
}

async function cleanupBand(): Promise<void> {
  const ids = (await dataSource.query(
    `SELECT result_id AS id
       FROM results
      WHERE result_official_code BETWEEN ? AND ?`,
    [BAND_LO, BAND_HI],
  )) as { id: number }[];
  const list = ids.map((row) => Number(row.id)).filter((id) => id > 0);
  const references = [CODE, NULL_ACTOR_CODE, WITH_CODE, WITHOUT_CODE].flatMap(
    (code) => [
      prmsRef(ReportingPlatformEnum.TIP, code),
      prmsRef(ReportingPlatformEnum.STAR, code),
    ],
  );
  if (references.length > 0) {
    const refPlaceholders = references.map(() => '?').join(', ');
    await dataSource.query(
      `DELETE FROM result_prms_sync_log
        WHERE external_reference IN (${refPlaceholders})`,
      references,
    );
  }
  const codeTexts = [CODE, NULL_ACTOR_CODE, WITH_CODE, WITHOUT_CODE].map(
    String,
  );
  await dataSource.query(
    `DELETE FROM result_prms_sync_history
      WHERE result_official_code IN (${codeTexts.map(() => '?').join(', ')})`,
    codeTexts,
  );
  if (list.length > 0) {
    const placeholders = list.map(() => '?').join(', ');
    const alignmentRows = (await dataSource.query(
      `SELECT id FROM result_pool_funding_alignment WHERE result_id IN (${placeholders})`,
      list,
    )) as { id: number }[];
    const alignmentIds = alignmentRows
      .map((row) => Number(row.id))
      .filter((id) => id > 0);
    if (alignmentIds.length > 0) {
      await dataSource.query(
        `DELETE FROM result_pool_funding_alignment_sp
          WHERE alignment_id IN (${alignmentIds.map(() => '?').join(', ')})`,
        alignmentIds,
      );
    }
    for (const table of [
      'result_pool_funding_toc_alignment',
      'result_pool_funding_alignment',
      'result_evidences',
      'result_users',
      'result_contracts',
    ]) {
      await dataSource.query(
        `DELETE FROM ${table} WHERE result_id IN (${placeholders})`,
        list,
      );
    }
    await dataSource.query(
      `DELETE FROM results WHERE result_id IN (${placeholders})`,
      list,
    );
  }
  await dataSource.query(
    'DELETE FROM agresso_contracts WHERE agreement_id = ?',
    [CONTRACT_ID],
  );
  await dataSource.query('DELETE FROM sec_users WHERE email = ?', [
    OWNER_EMAIL,
  ]);
  await dataSource.query('DELETE FROM alliance_user_staff WHERE carnet = ?', [
    CARNET,
  ]);
}

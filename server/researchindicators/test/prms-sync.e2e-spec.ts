import 'dotenv/config';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { IndicatorsEnum } from '../src/domain/entities/indicators/enum/indicators.enum';
import { PolicyTypesEnum } from '../src/domain/entities/policy-types/enum/policy-types.enum';
import { ResultStatusEnum } from '../src/domain/entities/result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from '../src/domain/entities/results/enum/reporting-platform.enum';
import { AppConfigKey } from '../src/domain/entities/app-config/enum/app-config-key.enum';
import { ContractRolesEnum } from '../src/domain/entities/result-contracts/enum/contract-roles.enum';
import { UserRolesEnum } from '../src/domain/entities/user-roles/enum/user-roles.enum';
import { DegreesEnum } from '../src/domain/entities/degrees/enum/degrees.enum';
import { SessionLengthEnum } from '../src/domain/entities/session-lengths/enum/session-lengths.enum';
import { DeliveryModalityEnum } from '../src/domain/entities/delivery-modalities/enum/delivery-modalities.enum';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { JwtMiddleware } from '../src/domain/shared/middlewares/jwr.middleware';
import { ClarisaGeoScopeEnum } from '../src/domain/tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { PrmsSyncOutcome } from '../src/domain/tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PrmsNormalizerService } from '../src/domain/tools/prms-normalizer/prms-normalizer.service';

/**
 * T-14 — E2E: malformed-row proof (DC-3) + guard matrix.
 *
 * Boots the real AppModule (same bootstrap as
 * `test/results-ai-formalize-bulk.e2e-spec.ts`: JwtMiddleware prototype spy,
 * global `/api` prefix, URI versioning, no `defaultVersion`).
 *
 * Shared Dev MySQL is not used: it ETIMEDOUT from this host. The suite points
 * CORE at the disposable scratch TEST datasource (`ARI_TEST_MYSQL_*`) so we
 * can seed without touching the shared Dev database. Live ingest still goes
 * to the PRMS TEST Normalizer. Never PROD.
 *
 * K-004: `PRMS_E2E_K004_VALID=1 npm run test:e2e -- prms-sync` points the
 * malformed-row case at a valid https link. That run must go RED on the
 * DC-3 assertions. The committed default is the bad Drive link.
 */

const TEST_NORMALIZER_HOST =
  'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com';
const PROD_NORMALIZER_HOST =
  'https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com';

const abortUnlessExactly = (
  name: string,
  actual: string | undefined,
  expected: string,
): void => {
  if (actual !== expected) {
    throw new Error(
      `T-14 abort before app boot: ${name} must be exactly ${expected} (live TEST only; never PROD). Got: ${actual ?? '(unset)'}`,
    );
  }
};

const requireInherited = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `T-14 abort before app boot: ${name} is unset; refusing to inherit a CORE/PROD fallback`,
    );
  }
  return value;
};

process.env.ARI_IS_PRODUCTION = 'false';
abortUnlessExactly('ARI_IS_PRODUCTION', process.env.ARI_IS_PRODUCTION, 'false');

const incomingNormalizerHost = process.env.ARI_PRMS_NORMALIZER_HOST;
if (
  incomingNormalizerHost === PROD_NORMALIZER_HOST ||
  (Boolean(incomingNormalizerHost) &&
    incomingNormalizerHost !== TEST_NORMALIZER_HOST)
) {
  throw new Error(
    `T-14 abort before app boot: ARI_PRMS_NORMALIZER_HOST must be exactly ${TEST_NORMALIZER_HOST}; refusing ${incomingNormalizerHost}. Never PROD.`,
  );
}
process.env.ARI_PRMS_NORMALIZER_HOST = TEST_NORMALIZER_HOST;
abortUnlessExactly(
  'ARI_PRMS_NORMALIZER_HOST',
  process.env.ARI_PRMS_NORMALIZER_HOST,
  TEST_NORMALIZER_HOST,
);

process.env.ARI_MYSQL_HOST = requireInherited('ARI_TEST_MYSQL_HOST');
process.env.ARI_MYSQL_USER_NAME = requireInherited('ARI_TEST_MYSQL_USER_NAME');
process.env.ARI_MYSQL_USER_PASS = requireInherited('ARI_TEST_MYSQL_USER_PASS');
process.env.ARI_MYSQL_NAME = requireInherited('ARI_TEST_MYSQL_NAME');
process.env.DB_PORT = requireInherited('ARI_TEST_MYSQL_PORT');
process.env.ARI_SECONDARY_MYSQL_NAME = process.env.ARI_TEST_MYSQL_NAME;
abortUnlessExactly(
  'ARI_MYSQL_HOST',
  process.env.ARI_MYSQL_HOST,
  process.env.ARI_TEST_MYSQL_HOST,
);
abortUnlessExactly(
  'ARI_MYSQL_USER_NAME',
  process.env.ARI_MYSQL_USER_NAME,
  process.env.ARI_TEST_MYSQL_USER_NAME,
);
abortUnlessExactly(
  'ARI_MYSQL_NAME',
  process.env.ARI_MYSQL_NAME,
  process.env.ARI_TEST_MYSQL_NAME,
);
abortUnlessExactly(
  'ARI_SECONDARY_MYSQL_NAME',
  process.env.ARI_SECONDARY_MYSQL_NAME,
  process.env.ARI_TEST_MYSQL_NAME,
);
abortUnlessExactly(
  'DB_PORT',
  process.env.DB_PORT,
  process.env.ARI_TEST_MYSQL_PORT,
);
if (process.env.ARI_MYSQL_USER_PASS !== process.env.ARI_TEST_MYSQL_USER_PASS) {
  throw new Error(
    'T-14 abort before app boot: ARI_MYSQL_USER_PASS is not the TEST datasource password',
  );
}

if (!process.env.ARI_CLARISA_API_KEY) {
  throw new Error(
    'T-14 abort before app boot: ARI_CLARISA_API_KEY is unset; cannot authenticate to the TEST Normalizer',
  );
}

// Inherited, not set here, and they cannot redirect ingest (PrmsNormalizerService
// reads only ARI_PRMS_NORMALIZER_HOST): ARI_CLARISA_HOST, ARI_PRMS_TOC_HOST,
// ARI_TOC_INTEGRATION_HOST, ARI_MQ_HOST, ARI_MQ_USER, ARI_MQ_PASSWORD,
// ARI_PORT, ARI_SEE_ALL_LOGS, ARI_JWT_ACCESS_EXPIRES_IN, PRMS_E2E_K004_VALID.
// ARI_MYSQL_USER_PASS is copied from ARI_TEST_MYSQL_USER_PASS above (asserted
// equal via requireInherited); it is a secret, never logged.

const OFFICIAL_BAND_START = 910_150_901;
const OFFICIAL_BAND_END = OFFICIAL_BAND_START + 20;
const K004_VALID = process.env.PRMS_E2E_K004_VALID === '1';
/**
 * K-004 valid-link ingest persists in PRMS TEST with no remote delete.
 * `Date.now() % 11` reused eleven codes (910150911–910150921); a later
 * run then died as a duplicate, not on `expect(synced).toBe(false)`.
 *
 * Default (K004 unset) keeps the stable OFFICIAL_BAND_START — PRMS always
 * rejects the bad Drive link, so that code never persists.
 *
 * Valid mode packs millisecond + in-process seq into an unused 15-digit
 * band above the 900–904e12 fixture bands and below MAX_SAFE_INTEGER:
 * `6e15 + Date.now()*1000 + seq`. Adjacent milliseconds occupy disjoint
 * 1000-wide slots, so two sequential e2e boots cannot share a code
 * (boot ≫ 1 ms). Cleanup covers this band and the stable DC-3 band.
 */
const K004_UNIQUE_BAND = 6_000_000_000_000_000;
let k004OfficialSeq = 0;
function uniqueK004OfficialCode(): number {
  k004OfficialSeq += 1;
  const code = K004_UNIQUE_BAND + Date.now() * 1000 + k004OfficialSeq;
  if (!Number.isSafeInteger(code) || code < K004_UNIQUE_BAND) {
    throw new Error(
      `T-14 abort: K-004 official code ${code} is not a safe bigint integer`,
    );
  }
  return code;
}
const CODE = {
  dc3: K004_VALID ? uniqueK004OfficialCode() : OFFICIAL_BAND_START,
  guard: OFFICIAL_BAND_START + 1,
  kp: OFFICIAL_BAND_START + 2,
  oicr: OFFICIAL_BAND_START + 3,
  innovationUse: OFFICIAL_BAND_START + 4,
  policyType1: OFFICIAL_BAND_START + 5,
} as const;

const BAD_EVIDENCE_LINK =
  'https://drive.google.com/file/d/ARI-E2E-T14-REJECT/view';
const VALID_EVIDENCE_LINK = 'https://www.cgiar.org/research/';
const EVIDENCE_LINK = K004_VALID ? VALID_EVIDENCE_LINK : BAD_EVIDENCE_LINK;

const OWNER_CARNET = 'E2E14A';
const DENIED_CARNET = 'E2E14B';
const PRMS_ACCEPTED_EMAIL = 'ari-spike-tester@cgiar.org';
const PRMS_ACCEPTED_FIRST_NAME = 'ARI Spike';
const PRMS_ACCEPTED_LAST_NAME = 'Tester';
const CONTRACT_ID = 'E2E-T14-POOL';
const PRINCIPAL_EVIDENCE_ROLE = 1;

type Actor = {
  sec_user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  roles: SecRolesEnum[];
};

describe('PRMS sync e2e (T-14, DC-3 + guard matrix)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let ingestSpy: jest.SpyInstance;

  let owner: Actor;
  let deniedContributor: Actor;
  let currentActor: Actor;

  const ids: Record<string, number> = {};

  const q = async <T = unknown>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T> => dataSource.query(sql, params) as Promise<T>;

  const insertIdOf = (result: unknown): number => {
    if (Array.isArray(result)) {
      return Number((result[0] as { insertId?: number } | undefined)?.insertId);
    }
    return Number((result as { insertId?: number } | undefined)?.insertId);
  };

  const syncPath = (officialCode: number): string =>
    `/api/results/${officialCode}/prms-sync`;

  const alignmentPath = (officialCode: number): string =>
    `/api/v1/results/${officialCode}/pool-funding-alignment`;

  const asActor = (actor: Actor): void => {
    currentActor = actor;
  };

  beforeAll(async () => {
    jest
      .spyOn(JwtMiddleware.prototype, 'use')
      .mockImplementation(async (req: any, _res: any, next: any) => {
        req.user = currentActor;
        return next();
      });

    const { AppModule } = await import('../src/app.module');

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    ingestSpy = jest.spyOn(moduleFixture.get(PrmsNormalizerService), 'ingest');

    await seedCatalogs();
    await seedActors();
    await seedResults();
    asActor(owner);
  }, 120_000);

  afterEach(() => {
    ingestSpy.mockClear();
    asActor(owner);
  });

  afterAll(async () => {
    try {
      await cleanupBand();
    } finally {
      await app?.close();
    }
  });

  it('allowed: a CONTRIBUTOR who is on the result passes the owner guard', async () => {
    asActor(owner);
    const res = await request(app.getHttpServer())
      .post(syncPath(CODE.guard))
      .send();

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
    expect(ingestSpy).not.toHaveBeenCalled();
  });

  it('denied: a plain CONTRIBUTOR who is NOT on the result is rejected (never CENTER_ADMIN)', async () => {
    expect(deniedContributor.roles).toEqual([SecRolesEnum.CONTRIBUTOR]);
    expect(deniedContributor.roles).not.toContain(SecRolesEnum.CENTER_ADMIN);
    expect(deniedContributor.roles).not.toContain(SecRolesEnum.SYSTEM_ADMIN);

    asActor(deniedContributor);
    const res = await request(app.getHttpServer())
      .post(syncPath(CODE.guard))
      .send();

    expect(res.status).toBe(403);
    expect(ingestSpy).not.toHaveBeenCalled();
  });

  it('indicator_id 3, 5, 6 and PRMS policy type 1 are each refused with their own reason', async () => {
    asActor(owner);
    const kp = await request(app.getHttpServer())
      .post(syncPath(CODE.kp))
      .send();
    const oicr = await request(app.getHttpServer())
      .post(syncPath(CODE.oicr))
      .send();
    const innovationUse = await request(app.getHttpServer())
      .post(syncPath(CODE.innovationUse))
      .send();
    const policyType1 = await request(app.getHttpServer())
      .post(syncPath(CODE.policyType1))
      .send();

    expect(kp.status).toBe(422);
    expect(oicr.status).toBe(422);
    expect(innovationUse.status).toBe(422);
    expect(policyType1.status).toBe(422);

    const kpReason = String(kp.body.description);
    const oicrReason = String(oicr.body.description);
    const useReason = String(innovationUse.body.description);
    const policyReason = String(policyType1.body.description);

    expect(kpReason).toBe(
      'Indicator is unmappable to a PRMS type; Knowledge Product and OICR cannot be sent',
    );
    expect(oicrReason).toBe(
      'Indicator is unmappable to a PRMS type; Knowledge Product and OICR cannot be sent',
    );
    expect(useReason).toBe(
      'Innovation Use is gated: STAR holds no investment declarations (usd_budget / is_determined)',
    );
    expect(policyReason).toBe(
      'Policy type Program, Budget, or Investment is gated: STAR holds no status_amount or amount fields',
    );

    expect(new Set([kpReason, useReason, policyReason]).size).toBe(3);
    expect(ingestSpy).not.toHaveBeenCalled();
  });

  it('DC-3: a live 207 failed row (bad evidence link) leaves is_synced_to_prms false, records REJECTED_BY_PRMS, and keeps alignment PATCH writable', async () => {
    asActor(owner);
    const res = await request(app.getHttpServer())
      .post(syncPath(CODE.dc3))
      .send();

    const data = res.body?.data as
      | {
          outcome?: string;
          http_status?: number | null;
          request_id?: string | null;
          failure_reason?: string | null;
        }
      | undefined;

    const logRows = await q<
      Array<{
        outcome: string;
        http_status: number | null;
        request_id: string | null;
        response_body: unknown;
      }>
    >(
      `SELECT outcome, http_status, request_id, response_body
       FROM result_prms_sync_log
       WHERE result_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [ids.dc3],
    );
    // Evidence for the Leader report: requestId + failure cause. Never
    // contains <ARI_CLARISA_API_KEY> (NFR-PRMS-002).
    console.log(
      'T-14 DC-3 live PRMS row',
      JSON.stringify({
        evidenceLinkKind: K004_VALID ? 'valid' : 'bad',
        external_reference: String(CODE.dc3),
        envelopeStatus: res.status,
        outcome: data?.outcome,
        http_status: data?.http_status,
        request_id: data?.request_id,
        failure_reason: data?.failure_reason,
      }),
    );

    const flagRows = await q<Array<{ is_synced_to_prms: number | boolean }>>(
      `SELECT is_synced_to_prms FROM results WHERE result_id = ?`,
      [ids.dc3],
    );
    const synced = Boolean(flagRows[0]?.is_synced_to_prms);

    if (data?.outcome === PrmsSyncOutcome.RETRYABLE) {
      throw new Error(
        `DC-3 UNCOVERED: live ingest settled RETRYABLE (downstream 5xx inside the 207, DD-18). requestId=${data.request_id} http_status=${data.http_status} failure_reason=${data.failure_reason}`,
      );
    }

    // DC-3 discriminator must run before the 207 uncovered throw so a valid
    // K-004 ingest that reaches ACCEPTED fails here (synced true), not on a
    // prior transport/provisioning error (K-004 / KZ-014).
    expect(synced).toBe(false);

    if (data?.http_status !== 207) {
      throw new Error(
        `DC-3 UNCOVERED: live ingest did not return a failed row inside HTTP 207. status=${res.status} outcome=${data?.outcome} http_status=${data?.http_status} requestId=${data?.request_id} failure_reason=${data?.failure_reason} envelope_description=${res.body?.description}`,
      );
    }

    expect(data.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    expect(data.request_id).toEqual(expect.any(String));
    expect(String(data.failure_reason)).toMatch(
      /file storage platforms|Google Drive|not accepted as evidence/i,
    );
    expect(logRows[0].outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    expect(logRows[0].http_status).toBe(207);
    expect(logRows[0].request_id).toBe(data.request_id);
    expect(logRows[0].response_body).toEqual(expect.any(Object));

    asActor({
      ...owner,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });
    const patch = await request(app.getHttpServer())
      .patch(alignmentPath(CODE.dc3))
      .send({ has_contribution: false });

    console.log(
      'T-14 DC-3 alignment PATCH',
      JSON.stringify({
        status: patch.status,
        description: patch.body?.description,
      }),
    );

    expect(patch.status).not.toBe(409);
  }, 120_000);

  async function seedCatalogs(): Promise<void> {
    await q(
      `INSERT IGNORE INTO result_status (result_status_id, name, is_active, created_at)
       VALUES (?, 'Approved', 1, NOW()), (?, 'Draft', 1, NOW())`,
      [ResultStatusEnum.APPROVED, ResultStatusEnum.DRAFT],
    );
    await q(
      `INSERT IGNORE INTO indicators (indicator_id, name, indicator_type_id, is_active, created_at)
       VALUES
         (?, 'Capacity Sharing for Development', 1, 1, NOW()),
         (?, 'Policy Change', 1, 1, NOW()),
         (?, 'OICR', 1, 1, NOW())`,
      [
        IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        IndicatorsEnum.POLICY_CHANGE,
        IndicatorsEnum.OICR,
      ],
    );
    await q(
      `INSERT IGNORE INTO contract_roles (contract_role_id, name, is_active, created_at)
       VALUES (?, 'Alignment', 1, NOW())`,
      [ContractRolesEnum.ALIGNMENT],
    );
    await q(
      `INSERT IGNORE INTO user_roles (user_role_id, name, is_active, created_at)
       VALUES (?, 'Main Contact', 1, NOW())`,
      [UserRolesEnum.MAIN_CONTACT],
    );
    await q(
      `INSERT IGNORE INTO evidence_roles (evidence_role_id, name, is_active, created_at)
       VALUES (?, 'Principal Evidence', 1, NOW())`,
      [PRINCIPAL_EVIDENCE_ROLE],
    );
    await q(
      `INSERT IGNORE INTO degrees (degree_id, name, is_active, created_at)
       VALUES (?, 'Other', 1, NOW())`,
      [DegreesEnum.OTHER],
    );
    await q(
      `INSERT IGNORE INTO session_lengths (session_length_id, name, is_active, created_at)
       VALUES (?, 'Short-term', 1, NOW())`,
      [SessionLengthEnum.SHORT_TERM],
    );
    await q(
      `INSERT IGNORE INTO delivery_modalities (delivery_modality_id, name, is_active, created_at)
       VALUES (?, 'Virtual', 1, NOW())`,
      [DeliveryModalityEnum.VIRTUAL],
    );
    await q(
      `INSERT IGNORE INTO policy_types (policy_type_id, name, is_active, created_at)
       VALUES (?, 'Program, Budget, or Investment', 1, NOW())`,
      [PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT],
    );
    await q(
      `INSERT IGNORE INTO agresso_contracts
         (agreement_id, center_amount, center_amount_usd, grant_amount, grant_amount_usd,
          is_pool_funding_contributor, ubwClientDescription, description, is_active, created_at)
       VALUES (?, 0, 0, 0, 0, 1, 'ExCIAT', 'ARI T-14 E2E synthetic pool contract', 1, NOW())`,
      [CONTRACT_ID],
    );

    const apiKey = process.env.ARI_CLARISA_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ARI_CLARISA_API_KEY is unset; cannot authenticate to the TEST Normalizer',
      );
    }
    await q(
      `INSERT INTO app_config (\`key\`, simple_value, is_active, created_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE simple_value = VALUES(simple_value), is_active = 1`,
      [AppConfigKey.ARI_CLARISA_API_KEY, apiKey],
    );
  }

  async function seedActors(): Promise<void> {
    await q(
      `INSERT INTO alliance_user_staff (carnet, first_name, last_name, email, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE email = VALUES(email), first_name = VALUES(first_name), last_name = VALUES(last_name), is_active = 1`,
      [
        OWNER_CARNET,
        PRMS_ACCEPTED_FIRST_NAME,
        PRMS_ACCEPTED_LAST_NAME,
        PRMS_ACCEPTED_EMAIL,
      ],
    );
    await q(
      `INSERT INTO alliance_user_staff (carnet, first_name, last_name, email, is_active, created_at)
       VALUES (?, 'T14', 'Denied', 't14-denied@example.org', 1, NOW())
       ON DUPLICATE KEY UPDATE email = VALUES(email), is_active = 1`,
      [DENIED_CARNET],
    );

    const ownerRows = await q<Array<{ sec_user_id: number }>>(
      `SELECT sec_user_id FROM sec_users WHERE carnet = ? LIMIT 1`,
      [OWNER_CARNET],
    );
    if (ownerRows[0]) {
      ids.ownerUser = Number(ownerRows[0].sec_user_id);
    } else {
      ids.ownerUser = insertIdOf(
        await q(
          `INSERT INTO sec_users (email, first_name, last_name, carnet, is_active, created_at)
           VALUES (?, ?, ?, ?, 1, NOW())`,
          [
            PRMS_ACCEPTED_EMAIL,
            PRMS_ACCEPTED_FIRST_NAME,
            PRMS_ACCEPTED_LAST_NAME,
            OWNER_CARNET,
          ],
        ),
      );
    }

    const deniedRows = await q<Array<{ sec_user_id: number }>>(
      `SELECT sec_user_id FROM sec_users WHERE carnet = ? LIMIT 1`,
      [DENIED_CARNET],
    );
    if (deniedRows[0]) {
      ids.deniedUser = Number(deniedRows[0].sec_user_id);
    } else {
      ids.deniedUser = insertIdOf(
        await q(
          `INSERT INTO sec_users (email, first_name, last_name, carnet, is_active, created_at)
           VALUES ('t14-denied@example.org', 'T14', 'Denied', ?, 1, NOW())`,
          [DENIED_CARNET],
        ),
      );
    }

    if (ids.ownerUser) {
      await q(
        `UPDATE sec_users
         SET email = ?, first_name = ?, last_name = ?, is_active = 1
         WHERE sec_user_id = ?`,
        [
          PRMS_ACCEPTED_EMAIL,
          PRMS_ACCEPTED_FIRST_NAME,
          PRMS_ACCEPTED_LAST_NAME,
          ids.ownerUser,
        ],
      );
    }

    owner = {
      sec_user_id: ids.ownerUser,
      email: PRMS_ACCEPTED_EMAIL,
      first_name: PRMS_ACCEPTED_FIRST_NAME,
      last_name: PRMS_ACCEPTED_LAST_NAME,
      roles: [SecRolesEnum.CONTRIBUTOR],
    };
    deniedContributor = {
      sec_user_id: ids.deniedUser,
      email: 't14-denied@example.org',
      first_name: 'T14',
      last_name: 'Denied',
      roles: [SecRolesEnum.CONTRIBUTOR],
    };
  }

  async function seedResults(): Promise<void> {
    await cleanupBand();

    ids.dc3 = await insertResult({
      officialCode: CODE.dc3,
      indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      title: K004_VALID
        ? `ARI E2E T-14 DC-3 K004 ${CODE.dc3} synthetic capacity sharing (do not process)`
        : 'ARI E2E T-14 DC-3 synthetic capacity sharing (do not process)',
      description: K004_VALID
        ? `Synthetic T-14 K-004 valid-link probe ${CODE.dc3}. Not a real result.`
        : 'Synthetic T-14 malformed-row proof. Not a real result. Bad evidence link on purpose.',
      geoScopeId: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      alignmentYes: true,
    });
    await insertCapacitySharing(ids.dc3);
    await insertEvidence(ids.dc3, EVIDENCE_LINK);
    await insertLeadContact(ids.dc3);
    await insertApprovedHistory(ids.dc3);

    ids.guard = await insertResult({
      officialCode: CODE.guard,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      title: 'ARI E2E T-14 guard matrix',
      description: 'Synthetic T-14 guard result. Not a real result.',
      geoScopeId: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      alignmentYes: false,
    });

    ids.kp = await insertResult({
      officialCode: CODE.kp,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      title: 'ARI E2E T-14 KP refusal',
      description: 'Synthetic T-14 KP refusal. Not a real result.',
      geoScopeId: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      alignmentYes: false,
    });
    ids.oicr = await insertResult({
      officialCode: CODE.oicr,
      indicatorId: IndicatorsEnum.OICR,
      title: 'ARI E2E T-14 OICR refusal',
      description: 'Synthetic T-14 OICR refusal. Not a real result.',
      geoScopeId: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      alignmentYes: false,
    });
    ids.innovationUse = await insertResult({
      officialCode: CODE.innovationUse,
      indicatorId: IndicatorsEnum.INNOVATION_USE,
      title: 'ARI E2E T-14 Innovation Use refusal',
      description: 'Synthetic T-14 Innovation Use refusal. Not a real result.',
      geoScopeId: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      alignmentYes: false,
    });
    ids.policyType1 = await insertResult({
      officialCode: CODE.policyType1,
      indicatorId: IndicatorsEnum.POLICY_CHANGE,
      title: 'ARI E2E T-14 policy type 1 refusal',
      description: 'Synthetic T-14 policy-type-1 refusal. Not a real result.',
      geoScopeId: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      alignmentYes: false,
    });
    await q(
      `INSERT INTO result_policy_change (result_id, policy_type_id, is_active, created_at, created_by)
       VALUES (?, ?, 1, NOW(), ?)`,
      [
        ids.policyType1,
        PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT,
        ids.ownerUser,
      ],
    );
  }

  async function insertResult(input: {
    officialCode: number;
    indicatorId: number;
    title: string;
    description: string;
    geoScopeId: number;
    alignmentYes: boolean;
  }): Promise<number> {
    const resultId = insertIdOf(
      await q(
        `INSERT INTO results
         (result_official_code, title, description, indicator_id, result_status_id,
          platform_code, geo_scope_id, is_snapshot, is_synced_to_prms,
          is_partner_not_applicable, is_active, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 1, 1, NOW(), ?)`,
        [
          input.officialCode,
          input.title,
          input.description,
          input.indicatorId,
          ResultStatusEnum.APPROVED,
          ReportingPlatformEnum.STAR,
          input.geoScopeId,
          ids.ownerUser,
        ],
      ),
    );

    await q(
      `INSERT INTO result_contracts
         (result_id, contract_id, contract_role_id, is_primary, is_active, created_at, created_by)
       VALUES (?, ?, ?, 1, 1, NOW(), ?)`,
      [resultId, CONTRACT_ID, ContractRolesEnum.ALIGNMENT, ids.ownerUser],
    );

    const alignmentId = insertIdOf(
      await q(
        `INSERT INTO result_pool_funding_alignment
         (result_id, has_contribution, is_active, created_at, created_by)
       VALUES (?, ?, 1, NOW(), ?)`,
        [resultId, input.alignmentYes ? 1 : 0, ids.ownerUser],
      ),
    );

    if (input.alignmentYes) {
      await q(
        `INSERT INTO result_pool_funding_alignment_sp
           (alignment_id, sp_code, sp_role, is_active, created_at, created_by)
         VALUES (?, 'SP01', 'PRIMARY', 1, NOW(), ?)`,
        [alignmentId, ids.ownerUser],
      );
      await q(
        `INSERT INTO result_pool_funding_toc_alignment
           (result_id, sp_code, aligns_with_toc, toc_result_title, is_active, created_at, created_by)
         VALUES (?, 'SP01', 1, 'ARI E2E T-14 synthetic ToC', 1, NOW(), ?)`,
        [resultId, ids.ownerUser],
      );
    }

    return resultId;
  }

  async function insertCapacitySharing(resultId: number): Promise<void> {
    await q(
      `INSERT INTO result_capacity_sharing
         (result_id, degree_id, session_length_id, delivery_modality_id,
          session_participants_female, session_participants_male,
          session_participants_non_binary, is_active, created_at, created_by)
       VALUES (?, ?, ?, ?, 3, 2, 0, 1, NOW(), ?)`,
      [
        resultId,
        DegreesEnum.OTHER,
        SessionLengthEnum.SHORT_TERM,
        DeliveryModalityEnum.VIRTUAL,
        ids.ownerUser,
      ],
    );
  }

  async function insertEvidence(resultId: number, link: string): Promise<void> {
    await q(
      `INSERT INTO result_evidences
         (result_id, evidence_description, evidence_url, evidence_role_id,
          is_private, is_active, created_at, created_by)
       VALUES (?, 'ARI E2E T-14 evidence', ?, ?, 0, 1, NOW(), ?)`,
      [resultId, link, PRINCIPAL_EVIDENCE_ROLE, ids.ownerUser],
    );
  }

  async function insertLeadContact(resultId: number): Promise<void> {
    await q(
      `INSERT INTO result_users
         (result_id, user_id, user_role_id, is_active, created_at, created_by)
       VALUES (?, ?, ?, 1, NOW(), ?)`,
      [resultId, OWNER_CARNET, UserRolesEnum.MAIN_CONTACT, ids.ownerUser],
    );
  }

  async function insertApprovedHistory(resultId: number): Promise<void> {
    await q(
      `INSERT INTO submission_history
         (result_id, from_status_id, to_status_id, submission_comment,
          is_active, created_at, created_by)
       VALUES (?, ?, ?, 'ARI E2E T-14 synthetic approval', 1, NOW(), ?)`,
      [
        resultId,
        ResultStatusEnum.DRAFT,
        ResultStatusEnum.APPROVED,
        ids.ownerUser,
      ],
    );
  }

  async function deleteIgnoringMissing(
    sql: string,
    params: unknown[],
  ): Promise<void> {
    try {
      await q(sql, params);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR') {
        return;
      }
      throw err;
    }
  }

  async function cleanupBand(): Promise<void> {
    const rows = await q<Array<{ result_id: number }>>(
      `SELECT result_id FROM results
       WHERE result_official_code BETWEEN ? AND ?
          OR result_official_code BETWEEN ? AND ?`,
      [
        OFFICIAL_BAND_START,
        OFFICIAL_BAND_END,
        K004_UNIQUE_BAND,
        Number.MAX_SAFE_INTEGER,
      ],
    );
    const resultIds = rows.map((row) => Number(row.result_id));
    if (resultIds.length === 0) {
      return;
    }
    const list = resultIds;
    const placeholders = list.map(() => '?').join(',');
    const childTables = [
      'result_review_history',
      'result_prms_sync_log',
      'result_evidences',
      'result_users',
      'result_user_ai',
      'submission_history',
      'result_capacity_sharing',
      'result_policy_change',
      'result_innovation_dev',
      'result_innovation_use',
      'result_oicrs',
      'result_knowledge_products',
      'result_actors',
      'result_institution_types',
      'result_institutions',
      'result_institution_ai',
      'result_quantifications',
      'result_countries',
      'result_regions',
      'result_keywords',
      'result_languages',
      'result_levers',
      'result_sdgs',
      'result_tags',
      'result_initiatives',
      'result_impact_areas',
      'result_impact_outcomes',
      'result_strategic_objectives',
      'result_notable_references',
      'result_pool_funding_indicator_mapping',
      'result_pool_funding_toc_alignment',
      'bulk_upload_results',
      'project_indicators_results',
      'temp_result_ai',
    ];
    for (const table of childTables) {
      await deleteIgnoringMissing(
        `DELETE FROM ${table} WHERE result_id IN (${placeholders})`,
        list,
      );
    }
    await deleteIgnoringMissing(
      `DELETE FROM link_results WHERE result_id IN (${placeholders}) OR other_result_id IN (${placeholders})`,
      [...list, ...list],
    );
    await deleteIgnoringMissing(
      `DELETE FROM result_cap_sharing_ip WHERE result_cap_sharing_ip_id IN (${placeholders})`,
      list,
    );
    await deleteIgnoringMissing(
      `DELETE FROM result_ip_rights WHERE result_ip_rights_id IN (${placeholders})`,
      list,
    );
    const alignmentRows = await q<Array<{ id: number }>>(
      `SELECT id FROM result_pool_funding_alignment WHERE result_id IN (${list.map(() => '?').join(',')})`,
      list,
    );
    const alignmentIds = alignmentRows.map((row) => Number(row.id));
    if (alignmentIds.length > 0) {
      await q(
        `DELETE FROM result_pool_funding_alignment_sp WHERE alignment_id IN (${alignmentIds.map(() => '?').join(',')})`,
        alignmentIds,
      );
    }
    await q(
      `DELETE FROM result_pool_funding_alignment WHERE result_id IN (${list.map(() => '?').join(',')})`,
      list,
    );
    await q(
      `DELETE FROM result_contracts WHERE result_id IN (${list.map(() => '?').join(',')})`,
      list,
    );
    await q(
      `DELETE FROM results WHERE result_id IN (${list.map(() => '?').join(',')})`,
      list,
    );
  }
});

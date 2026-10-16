import { dataSource } from '../src/db/config/mysql/orm.test.config';
import { PrmsSyncOutcome } from '../src/domain/tools/prms-normalizer/enum/prms-sync-outcome.enum';

// @sdd-spec docs/specs/bilateral/prms-sync/sync-engine — T-03 rework
//
// Behavioural proof (R-PRMS-012 AC.3 / tasks.md T-03 Done check 3): the live
// scratch column `result_prms_sync_log.outcome` is varchar, not a MySQL ENUM.
// A future PRMS verdict therefore needs no DDL. The proof is INSERT of the
// string 'APPROVED_BY_SP' — deliberately not a PrmsSyncOutcome member — and
// READ-BACK of that exact string. A real ENUM rejects or truncates it
// (STRICT_TRANS_TABLES). That red was observed by ALTER TABLE ... ENUM then
// re-running this file (K-004); the ALTER is NOT in this spec.
//
// Connection / setup / teardown pattern: same fail-loud DataSource contract
// as test/bilateral-primary-contributing-sp.integration-spec.ts (real MySQL,
// no mock / in-memory fallback, beforeAll initialize, afterAll destroy).
// Datasource is the TEST scratch (`ARI_TEST_MYSQL_*` via orm.test.config),
// matching test/fixtures/smoke.fixture-spec.ts — NOT T13_MYSQL_*. T-13 owns
// an isolated container and drops its schema; this file must not, because
// the Leader already migrated ari_scratch_test and other tasks share it.
//
// KZ-017 — what this gate cannot reach:
// `npm test` (the unit suite: package.json jest config, rootDir "src",
// testRegex ".*\\.spec\\.ts$", no globalSetup, no DB bootstrap) NEVER runs
// this file. The integration config is a separate Jest project
// (test/jest-integration.json, rootDir ".", testRegex
// ".integration-spec.ts$"). The extensibility proof is therefore a SEPARATE
// gate requiring `npm run test:integration` and a running scratch schema.
// Anyone reading only the unit suite's green does not have this proof.
//
// result_official_code band 917000 — outside the fixture bands 900_000–
// 900_600 documented in server/researchindicators/src/CLAUDE.md §9 FP-45.

const FUTURE_VERDICT = 'APPROVED_BY_SP';
const RESULT_OFFICIAL_CODE = 917000;
const REQUEST_ID = 't03-approved-by-sp-extensibility';

describe('T-03 — result_prms_sync_log.outcome live-schema extensibility', () => {
  let resultId: number;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  }, 60000);

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }
    try {
      await dataSource.query(
        'DELETE FROM `result_prms_sync_log` WHERE `request_id` = ?',
        [REQUEST_ID],
      );
      await dataSource.query(
        'DELETE FROM `results` WHERE `result_official_code` = ?',
        [RESULT_OFFICIAL_CODE],
      );
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

  it('active column type is varchar(40), not ENUM (live information_schema)', async () => {
    const rows = (await dataSource.query(
      `SELECT COLUMN_TYPE AS columnType
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'result_prms_sync_log'
          AND column_name = 'outcome'`,
    )) as { columnType: string }[];

    expect(rows).toHaveLength(1);
    expect(rows[0].columnType.toLowerCase()).toBe('varchar(40)');
    expect(rows[0].columnType.toLowerCase()).not.toMatch(/^enum\(/);
  });

  it('inserts and reads back APPROVED_BY_SP — a verdict that is not a current PrmsSyncOutcome member, proving a future verdict needs no DDL', async () => {
    expect(
      (Object.values(PrmsSyncOutcome) as string[]).includes(FUTURE_VERDICT),
    ).toBe(false);

    // Scratch results table is empty. result_status_id defaults to 4, but
    // the live catalog only has 8/26/27/28 — inserting the default would
    // trip FK_f2652ffd1160a8da41e32a439c5. Column is nullable, so NULL
    // satisfies NOT-NULL on result_official_code without disabling any FK.
    // result_prms_sync_log.result_id FK is honoured: we insert a real
    // results row first, then the log row.
    await dataSource.query(
      'INSERT INTO `results` (`result_official_code`, `result_status_id`) VALUES (?, NULL)',
      [RESULT_OFFICIAL_CODE],
    );
    const resultRows = (await dataSource.query(
      'SELECT `result_id` AS resultId FROM `results` WHERE `result_official_code` = ?',
      [RESULT_OFFICIAL_CODE],
    )) as { resultId: number }[];
    expect(resultRows).toHaveLength(1);
    resultId = Number(resultRows[0].resultId);

    await dataSource.query(
      `INSERT INTO \`result_prms_sync_log\`
        (\`result_id\`, \`attempt_number\`, \`environment\`, \`outcome\`, \`request_id\`)
       VALUES (?, ?, ?, ?, ?)`,
      [resultId, 1, 'TEST', FUTURE_VERDICT, REQUEST_ID],
    );

    const logRows = (await dataSource.query(
      'SELECT `outcome` AS outcome FROM `result_prms_sync_log` WHERE `request_id` = ?',
      [REQUEST_ID],
    )) as { outcome: string }[];

    expect(logRows).toHaveLength(1);
    expect(logRows[0].outcome).toBe(FUTURE_VERDICT);
  });
});

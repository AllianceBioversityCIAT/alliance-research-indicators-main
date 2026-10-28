import 'dotenv/config';
import { DataSource } from 'typeorm';
import { effectivePoolFundingContributorSql } from '../src/domain/shared/utils/pool-funding.util';

// Integration case for R-APM-004 AC.1 and the scenario "prior-year rows are
// invisible, not gone".
//
// The fixture holds one active mapping row, for 2026, on a contract whose
// legacy is_pool_funding_contributor flag is 0. A fixture whose only row is
// the year under test cannot tell a scoped predicate from an unscoped one:
// the 2027 read is the discriminator, and its row is the other year.
//
// The SELECT is the real effectivePoolFundingContributorSql fragment. A
// TEMPORARY app_config, agresso_contracts and bilateral_project_mapping
// shadow the permanent tables on this one connection (PID_MYSQL_*, never
// ARI_MYSQL_*).

interface PidConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

function resolvePidConfig(): PidConnectionConfig {
  const password = process.env.PID_MYSQL_PASSWORD;
  if (!password) {
    throw new Error(
      'PID_MYSQL_PASSWORD is not set. This suite refuses to fall back to a ' +
        'committed default credential or to the shared DEV database. Set it ' +
        'to a local/scratch MySQL password before running (e.g. ' +
        '`PID_MYSQL_PASSWORD=<pass> npm run test:integration`).',
    );
  }
  return {
    host: process.env.PID_MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.PID_MYSQL_PORT || '3307', 10),
    username: process.env.PID_MYSQL_USER || 'root',
    password,
    database: process.env.PID_MYSQL_DATABASE || 'ari_scratch_test',
  };
}

const AGREEMENT_ID = 'AGR-YEAR-SCOPE';

describe('effectivePoolFundingContributorSql reporting year (real MySQL)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    const config = resolvePidConfig();
    dataSource = new DataSource({
      type: 'mysql',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      synchronize: false,
      migrationsRun: false,
      logging: false,
      extra: { connectionLimit: 1 },
    });
    await dataSource.initialize();
    await dataSource.query(
      `CREATE TEMPORARY TABLE app_config (
        \`key\` varchar(255) NOT NULL,
        simple_value text NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`key\`)
      )`,
    );
    await dataSource.query(
      `CREATE TEMPORARY TABLE agresso_contracts (
        agreement_id varchar(64) NOT NULL,
        is_pool_funding_contributor tinyint NULL,
        PRIMARY KEY (agreement_id)
      )`,
    );
    await dataSource.query(
      `CREATE TEMPORARY TABLE bilateral_project_mapping (
        agresso_agreement_id varchar(64) NOT NULL,
        is_active tinyint NOT NULL,
        reporting_year int NOT NULL
      )`,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM app_config');
    await dataSource.query('DELETE FROM agresso_contracts');
    await dataSource.query('DELETE FROM bilateral_project_mapping');
    await dataSource.query(
      'INSERT INTO agresso_contracts (agreement_id, is_pool_funding_contributor) VALUES (?, ?)',
      [AGREEMENT_ID, 0],
    );
    // The only mapping row is 2026. There is no 2027 row.
    await dataSource.query(
      'INSERT INTO bilateral_project_mapping (agresso_agreement_id, is_active, reporting_year) VALUES (?, ?, ?)',
      [AGREEMENT_ID, 1, 2026],
    );
  });

  async function setReportingYear(value: string): Promise<void> {
    await dataSource.query('DELETE FROM app_config');
    await dataSource.query(
      'INSERT INTO app_config (`key`, simple_value, is_active) VALUES (?, ?, ?)',
      ['ARI_PRMS_SYNC', value, 1],
    );
  }

  async function contributor(): Promise<number> {
    const rows: Array<{ is_pool_funding_contributor: string | number }> =
      await dataSource.query(
        `SELECT ${effectivePoolFundingContributorSql('ac')} AS is_pool_funding_contributor
         FROM agresso_contracts ac
         WHERE ac.agreement_id = ?`,
        [AGREEMENT_ID],
      );
    return Number(rows[0].is_pool_funding_contributor);
  }

  async function mappingRows(): Promise<
    Array<{ reporting_year: number; is_active: number }>
  > {
    const rows: Array<{ reporting_year: string | number; is_active: number }> =
      await dataSource.query(
        'SELECT reporting_year, is_active FROM bilateral_project_mapping WHERE agresso_agreement_id = ?',
        [AGREEMENT_ID],
      );
    return rows.map((row) => ({
      reporting_year: Number(row.reporting_year),
      is_active: Number(row.is_active),
    }));
  }

  it('treats a 2026 mapping as a contributor in 2026 and not in 2027, and leaves the row in place', async () => {
    await setReportingYear('2026');
    await expect(contributor()).resolves.toBe(1);

    await setReportingYear('2027');
    await expect(contributor()).resolves.toBe(0);

    await expect(mappingRows()).resolves.toEqual([
      { reporting_year: 2026, is_active: 1 },
    ]);

    await setReportingYear('2026');
    await expect(contributor()).resolves.toBe(1);
  });
});

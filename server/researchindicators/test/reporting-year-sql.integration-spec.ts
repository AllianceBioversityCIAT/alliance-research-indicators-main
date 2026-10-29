import 'dotenv/config';
import { DataSource } from 'typeorm';
import { currentReportingYearSql } from '../src/domain/shared/utils/reporting-year.resolver';

// Integration test: the exported currentReportingYearSql fragment against a
// REAL MySQL server.
//
// The fragment is the single definition of the reporting year. A unit test
// can only inspect its text. This suite executes that text, so a change to
// what the SQL evaluates to fails here (KZ-001).
//
// Fixtures are a TEMPORARY app_config, visible only on the connection that
// created it. The pool is pinned to one connection for that reason.
// PID_MYSQL_PASSWORD has no default and this file never reads ARI_MYSQL_*.

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

describe('currentReportingYearSql (real MySQL)', () => {
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
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM app_config');
  });

  async function insert(simpleValue: string, isActive: number): Promise<void> {
    await dataSource.query(
      'INSERT INTO app_config (`key`, simple_value, is_active) VALUES (?, ?, ?)',
      ['ARI_PRMS_SYNC', simpleValue, isActive],
    );
  }

  async function reportingYear(): Promise<number> {
    const rows: Array<{ reporting_year: string | number }> =
      await dataSource.query(
        `SELECT ${currentReportingYearSql} AS reporting_year`,
      );
    return Number(rows[0].reporting_year);
  }

  it("resolves active '2027' to 2027", async () => {
    await insert('2027', 1);
    await expect(reportingYear()).resolves.toBe(2027);
  });

  it("resolves active ' 2027 ' to 2027", async () => {
    await insert(' 2027 ', 1);
    await expect(reportingYear()).resolves.toBe(2027);
  });

  it("resolves active '2027\\n' to 2027", async () => {
    await insert('2027\n', 1);
    await expect(reportingYear()).resolves.toBe(2027);
  });

  it("resolves active '\\t2027' to 2027", async () => {
    await insert('\t2027', 1);
    await expect(reportingYear()).resolves.toBe(2027);
  });

  it("resolves active 'abc' to 2026", async () => {
    await insert('abc', 1);
    await expect(reportingYear()).resolves.toBe(2026);
  });

  it("resolves active '' to 2026", async () => {
    await insert('', 1);
    await expect(reportingYear()).resolves.toBe(2026);
  });

  it('resolves an inactive row to 2026', async () => {
    await insert('2027', 0);
    await expect(reportingYear()).resolves.toBe(2026);
  });

  it('resolves a missing row to 2026', async () => {
    await expect(reportingYear()).resolves.toBe(2026);
  });
});

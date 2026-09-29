import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PiDelegatesRepository } from '../src/domain/entities/pi-delegates/repositories/pi-delegates.repository';
import { AppConfig } from '../src/domain/shared/utils/app-config.util';

// Integration test: PiDelegatesRepository.isPiOrActiveDelegateOfProject()
// against a REAL MySQL server.
//
// WHY THIS SUITE EXISTS
// ---------------------
// This method is the sole project-scoped authorization gate for every
// pi-delegates write (create / revoke / bulk assign). It shipped with an
// unparenthesised `... LIMIT 1 UNION SELECT ...`, which MySQL rejects with
// ER_PARSE_ERROR — so every non-SYSTEM_ADMIN caller got a 500 instead of an
// authorization answer. A unit test over a mocked DataSource cannot catch
// that class of defect: the mock never parses the SQL. Only a real server
// can, which is what this suite does.
//
// The suite drives the SHIPPED repository method — it does not re-declare the
// query — so a future edit to the SQL is covered without touching this file.
//
// Fixtures are MySQL TEMPORARY tables, so the suite creates no persistent
// schema and leaves nothing behind when the connection closes. The pool is
// pinned to a single connection (`connectionLimit: 1`) because TEMPORARY
// tables are visible only to the connection that created them.
//
// Connection is parameterized via PID_MYSQL_* and, following the precedent of
// test/support/t13-data-source.ts, PID_MYSQL_PASSWORD has NO default: the
// suite fails loudly rather than reaching for ARI_MYSQL_* (DEV on-prem, a
// shared database) on its own.
//
//   PID_MYSQL_PASSWORD=<pass> npm run test:integration

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

const PI_USER_ID = 10;
const ACTIVE_DELEGATE_USER_ID = 20;
const INACTIVE_DELEGATE_USER_ID = 30;
const STRANGER_USER_ID = 99;
const PROJECT_ID = 'A15';
const OTHER_PROJECT_ID = 'B27';

describe('PiDelegatesRepository.isPiOrActiveDelegateOfProject (real MySQL)', () => {
  let dataSource: DataSource;
  let repository: PiDelegatesRepository;

  beforeAll(async () => {
    const config = resolvePidConfig();
    dataSource = new DataSource({
      type: 'mysql',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      entities: [
        `${__dirname}/../src/domain/entities/**/*.entity{.ts,.js}`,
        `${__dirname}/../src/domain/tools/clarisa/entities/**/*.entity{.ts,.js}`,
        `${__dirname}/../src/domain/shared/auxiliar/**/*.entity{.ts,.js}`,
        `${__dirname}/../src/domain/tools/open-search/prms/entities/*.entity{.ts,.js}`,
      ],
      synchronize: false,
      migrationsRun: false,
      logging: false,
      // Pinned to one connection so the TEMPORARY tables below stay visible.
      extra: { connectionLimit: 1 },
    });
    await dataSource.initialize();

    await dataSource.query(
      `CREATE TEMPORARY TABLE agresso_contracts (agreement_id VARCHAR(50), projectLeadId VARCHAR(50))`,
    );
    await dataSource.query(
      `CREATE TEMPORARY TABLE alliance_user_staff (carnet VARCHAR(50), email VARCHAR(120))`,
    );
    await dataSource.query(
      `CREATE TEMPORARY TABLE sec_users (sec_user_id INT, email VARCHAR(120))`,
    );
    await dataSource.query(
      `CREATE TEMPORARY TABLE pi_delegates (project_id VARCHAR(50), delegate_user_id INT, is_active TINYINT(1))`,
    );

    // PI branch: A15 is led by carnet C-PI -> pi@example.org -> sec_user 10.
    await dataSource.query(
      `INSERT INTO agresso_contracts VALUES ('${PROJECT_ID}', 'C-PI'), ('${OTHER_PROJECT_ID}', 'C-OTHER')`,
    );
    await dataSource.query(
      `INSERT INTO alliance_user_staff VALUES ('C-PI', 'pi@example.org')`,
    );
    await dataSource.query(
      `INSERT INTO sec_users VALUES (${PI_USER_ID}, 'pi@example.org')`,
    );
    // Delegate branch: 20 is active on A15, 30 was revoked, 99 was never one.
    await dataSource.query(
      `INSERT INTO pi_delegates VALUES ('${PROJECT_ID}', ${ACTIVE_DELEGATE_USER_ID}, 1),
                                       ('${PROJECT_ID}', ${INACTIVE_DELEGATE_USER_ID}, 0)`,
    );

    repository = new PiDelegatesRepository({} as AppConfig, dataSource);
  });

  afterAll(async () => {
    // TEMPORARY tables are dropped by MySQL when the connection closes.
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('parses on MySQL and authorizes the PI of the project', async () => {
    await expect(
      repository.isPiOrActiveDelegateOfProject(PROJECT_ID, PI_USER_ID),
    ).resolves.toBe(true);
  });

  it('authorizes an active delegate of the project', async () => {
    await expect(
      repository.isPiOrActiveDelegateOfProject(
        PROJECT_ID,
        ACTIVE_DELEGATE_USER_ID,
      ),
    ).resolves.toBe(true);
  });

  it('rejects a delegate whose delegation was revoked', async () => {
    await expect(
      repository.isPiOrActiveDelegateOfProject(
        PROJECT_ID,
        INACTIVE_DELEGATE_USER_ID,
      ),
    ).resolves.toBe(false);
  });

  it('rejects a user with no relationship to the project', async () => {
    await expect(
      repository.isPiOrActiveDelegateOfProject(PROJECT_ID, STRANGER_USER_ID),
    ).resolves.toBe(false);
  });

  it('does not leak authorization across projects', async () => {
    await expect(
      repository.isPiOrActiveDelegateOfProject(
        OTHER_PROJECT_ID,
        ACTIVE_DELEGATE_USER_ID,
      ),
    ).resolves.toBe(false);
    await expect(
      repository.isPiOrActiveDelegateOfProject(OTHER_PROJECT_ID, PI_USER_ID),
    ).resolves.toBe(false);
  });
});

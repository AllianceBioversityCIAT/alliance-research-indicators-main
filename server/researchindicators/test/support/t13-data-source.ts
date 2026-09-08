import 'dotenv/config';
import { DataSource } from 'typeorm';

// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-13
//
// Standalone, test-owned DataSource for the isolated local MySQL container
// the Leader provisioned for this task. Deliberately NOT `src/db/config/mysql
// /orm.config.ts` — that file's `getDataSource` only switches between the
// CORE (`ARI_MYSQL_*`, DEV on-prem) and TEST (`ARI_TEST_MYSQL_*`, unreachable
// RDS) targets, and production code must not be modified to add a third.
//
// Parameterized via `T13_MYSQL_*` env vars so this file is runnable in CI
// later without hardcoding one container; host/port/user/database default to
// match the container the Leader provisioned for this task (see task
// instructions). `T13_MYSQL_PASSWORD` has NO default and is required — see
// `resolveT13Config` below.
//
// **Hard prohibition, restated:** never default or fall back to
// `ARI_MYSQL_*` / `ARI_TEST_MYSQL_*`. If `T13_MYSQL_*` env vars are absent,
// the literal defaults below (the Leader's local container) are used —
// never DEV on-prem, never the RDS TEST target. The one exception is the
// password, which must never have a committed default at all (a hardcoded
// credential literal gets copied); it fails loudly instead.
//
// Entities mirror `orm.config.ts`'s glob exactly (same four patterns,
// relative path adjusted for this file's location under `test/support/`) so
// relation metadata (e.g. `ResultPoolFundingAlignment` → `Result`,
// `ResultReviewHistory` → `Result`) resolves without a partial graph.
export interface T13ConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function resolveT13Config(): T13ConnectionConfig {
  const password = process.env.T13_MYSQL_PASSWORD;
  if (!password) {
    throw new Error(
      'T13_MYSQL_PASSWORD is not set. This suite refuses to fall back to a ' +
        "committed default credential. Set it to the Leader's local " +
        'container password before running (e.g. `T13_MYSQL_PASSWORD=t13root ' +
        'npx jest --config test/jest-integration.json`).',
    );
  }
  return {
    host: process.env.T13_MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.T13_MYSQL_PORT || '33107', 10),
    username: process.env.T13_MYSQL_USER || 'root',
    password,
    database: process.env.T13_MYSQL_DATABASE || 'ari_t13',
  };
}

export function createT13DataSource(
  config: T13ConnectionConfig = resolveT13Config(),
): DataSource {
  return new DataSource({
    type: 'mysql',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: [
      `${__dirname}/../../src/domain/entities/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/tools/clarisa/entities/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/shared/auxiliar/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/tools/open-search/prms/entities/*.entity{.ts,.js}`,
    ],
    synchronize: false,
    migrationsRun: false,
    bigNumberStrings: false,
    logging: false,
    extra: {
      namedPlaceholders: true,
      charset: 'utf8mb4_unicode_520_ci',
    },
  });
}

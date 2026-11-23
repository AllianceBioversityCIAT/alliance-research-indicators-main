import 'reflect-metadata';
import 'dotenv/config';
import { Global, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, MigrationExecutor, QueryRunner } from 'typeorm';
import { StrategyFrameworkModule } from '../../src/domain/entities/strategy-framework/strategy-framework.module';
import { SetUpInterceptor } from '../../src/domain/shared/Interceptors/setup.interceptor';
import { CurrentUserUtil } from '../../src/domain/shared/utils/current-user.util';
import { CreateOdsAdminRole1795000000000 } from '../../src/db/migrations/1795000000000-createOdsAdminRole';
import { CreateFrameworkTables1795000000001 } from '../../src/db/migrations/1795000000001-createFrameworkTables';
import { CreateInstitutionalObjectives1795000000002 } from '../../src/db/migrations/1795000000002-createInstitutionalObjectives';
import { SeedStrategyFramework1795000000003 } from '../../src/db/migrations/1795000000003-seedStrategyFramework';

/**
 * Shared harness for the strategy-framework integration suites
 * (docs/specs/institutional-performance/strategy-framework, T-10).
 *
 * Evidence DB: local scratch `ARI_TEST_MYSQL_*` only. Suites insert portfolios
 * whose name starts with `__T10_` and delete exactly those rows in `afterAll`.
 * Portfolio 2 (the seed) is only read. A second database inside the same
 * container, `ari_scratch_stf_batch`, is created and dropped by the P-26
 * batch run so the scratch itself is never replayed or left pending.
 */

export const STF_PREFIX = '__T10_';
export const BATCH_DATABASE = 'ari_scratch_stf_batch';
export const SEEDED_PORTFOLIO_ID = 2;

const FOUR_MIGRATIONS = [
  CreateOdsAdminRole1795000000000,
  CreateFrameworkTables1795000000001,
  CreateInstitutionalObjectives1795000000002,
  SeedStrategyFramework1795000000003,
];

export const assertLocalTestDatabase = (label: string): void => {
  const host = process.env.ARI_TEST_MYSQL_HOST;
  const port = process.env.ARI_TEST_MYSQL_PORT;
  const database = process.env.ARI_TEST_MYSQL_NAME;
  console.log(`[${label}] resolved DB target: ${host}:${port}/${database}`);
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `${label}: ARI_TEST_MYSQL_HOST is "${host}", not local. Refusing to run.`,
    );
  }
  if (database !== 'ari_scratch_test') {
    throw new Error(
      `${label}: ARI_TEST_MYSQL_NAME is "${database}", not ari_scratch_test. Refusing to run.`,
    );
  }
};

export const createStfDataSource = async (
  label: string,
): Promise<DataSource> => {
  assertLocalTestDatabase(label);
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.ARI_TEST_MYSQL_HOST,
    port: parseInt(process.env.ARI_TEST_MYSQL_PORT, 10),
    username: process.env.ARI_TEST_MYSQL_USER_NAME,
    password: process.env.ARI_TEST_MYSQL_USER_PASS,
    database: process.env.ARI_TEST_MYSQL_NAME,
    entities: [
      `${__dirname}/../../src/domain/entities/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/tools/clarisa/entities/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/shared/auxiliar/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/tools/open-search/prms/entities/*.entity{.ts,.js}`,
    ],
    synchronize: false,
    migrationsRun: false,
    logging: false,
    extra: {
      connectionLimit: 12,
      charset: 'utf8mb4_0900_ai_ci',
    },
  });
  return dataSource.initialize();
};

export interface SeedRowCounts {
  levels: number;
  elements: number;
  objectives: number;
  links: number;
  responsibles: number;
}

export const countPortfolioRows = async (
  dataSource: DataSource,
  portfolioId: number,
): Promise<SeedRowCounts> => {
  const [row] = await dataSource.query(
    `SELECT
       (SELECT COUNT(*) FROM framework_levels WHERE portfolio_id = ?) AS levels,
       (SELECT COUNT(*) FROM framework_elements WHERE portfolio_id = ?) AS elements,
       (SELECT COUNT(*) FROM institutional_objectives WHERE portfolio_id = ?) AS objectives,
       (SELECT COUNT(*) FROM institutional_objective_elements ioe
          JOIN institutional_objectives io ON io.id = ioe.institutional_objective_id
         WHERE io.portfolio_id = ?) AS links,
       (SELECT COUNT(*) FROM framework_element_responsibles fer
          JOIN framework_elements fe ON fe.id = fer.element_id
         WHERE fe.portfolio_id = ?) AS responsibles`,
    [portfolioId, portfolioId, portfolioId, portfolioId, portfolioId],
  );
  return {
    levels: Number(row.levels),
    elements: Number(row.elements),
    objectives: Number(row.objectives),
    links: Number(row.links),
    responsibles: Number(row.responsibles),
  };
};

/** Inserts `__T10_` portfolios and deletes only the rows that hang off them. */
export class StrategyFrameworkFixtures {
  readonly portfolioIds: number[] = [];

  constructor(private readonly dataSource: DataSource) {}

  async portfolio(suffix: string): Promise<number> {
    const result = await this.dataSource.query(
      `INSERT INTO portfolios (name, description, start_year, end_year, is_active, created_at)
       VALUES (?, ?, 2026, 2030, 1, NOW())`,
      [`${STF_PREFIX}${suffix}`, 'T-10 fixture portfolio'],
    );
    const id = Number(result.insertId);
    this.portfolioIds.push(id);
    return id;
  }

  async cleanup(): Promise<void> {
    if (this.portfolioIds.length === 0) return;
    const ids = this.portfolioIds;
    const placeholders = ids.map(() => '?').join(', ');
    await this.dataSource.query(
      `DELETE fer FROM framework_element_responsibles fer
         JOIN framework_elements fe ON fe.id = fer.element_id
        WHERE fe.portfolio_id IN (${placeholders})`,
      ids,
    );
    await this.dataSource.query(
      `DELETE ioe FROM institutional_objective_elements ioe
         JOIN institutional_objectives io ON io.id = ioe.institutional_objective_id
        WHERE io.portfolio_id IN (${placeholders})`,
      ids,
    );
    await this.dataSource.query(
      `DELETE FROM institutional_objectives WHERE portfolio_id IN (${placeholders})`,
      ids,
    );
    for (const depth of [4, 3, 2, 1]) {
      await this.dataSource.query(
        `DELETE e FROM framework_elements e
           JOIN framework_levels l ON l.id = e.level_id
          WHERE e.portfolio_id IN (${placeholders}) AND l.depth = ?`,
        [...ids, depth],
      );
    }
    await this.dataSource.query(
      `DELETE FROM framework_levels WHERE portfolio_id IN (${placeholders})`,
      ids,
    );
    await this.dataSource.query(
      `DELETE FROM portfolios WHERE id IN (${placeholders}) AND name LIKE ?`,
      [...ids, `${STF_PREFIX}%`],
    );
    this.portfolioIds.length = 0;
  }
}

@Global()
@Module({
  providers: [{ provide: CurrentUserUtil, useValue: { user_id: 1 } }],
  exports: [CurrentUserUtil],
})
class StfTestGlobalModule {}

/**
 * Boots the real `StrategyFrameworkModule` on an already-open DataSource.
 * `JwtMiddleware` is a test middleware that sets `req.user` from
 * `x-test-roles`. `SetUpInterceptor` is a no-op. Scope (KZ-017): this is not
 * the full `AppModule` boot, so it does not prove `EntitiesModule` membership.
 */
export const bootStrategyFrameworkApp = async (
  dataSource: DataSource,
): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRootAsync({
        useFactory: () => ({
          type: 'mysql' as const,
          synchronize: false,
          migrationsRun: false,
          logging: false,
          retryAttempts: 1,
          autoLoadEntities: false,
          manualInitialization: true,
        }),
        dataSourceFactory: async () => dataSource,
      }),
      StfTestGlobalModule,
      StrategyFrameworkModule,
    ],
  })
    .overrideInterceptor(SetUpInterceptor)
    .useValue({ intercept: (_ctx, next) => next.handle() })
    .compile();

  const app = moduleRef.createNestApplication();
  app.use((req, _res, next) => {
    const header = req.headers['x-test-roles'];
    req.user = {
      sec_user_id: 1,
      roles: header ? JSON.parse(String(header)) : [],
    };
    next();
  });
  await app.init();
  return app;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Takes `SELECT … FOR UPDATE` on the portfolio, then calls `start` (which
 * must fire both requests before it awaits them), and commits only after
 * both are visible as lock waiters. A test that awaits the two calls one
 * after the other never reaches a waiter count of 2.
 */
export const whileHoldingPortfolio = async <T>(
  dataSource: DataSource,
  portfolioId: number,
  start: () => Promise<T>,
): Promise<{ result: T; releasedAt: number; waiters: number }> => {
  const holder = dataSource.createQueryRunner();
  await holder.connect();
  await holder.startTransaction();
  let waiters = 0;
  try {
    await holder.query(`SELECT id FROM portfolios WHERE id = ? FOR UPDATE`, [
      portfolioId,
    ]);
    const pending = start();
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      waiters = await portfolioWaiters(dataSource);
      if (waiters >= 2) break;
      await sleep(50);
    }
    const releasedAt = Date.now();
    await holder.commitTransaction();
    const result = await pending;
    return { result, releasedAt, waiters };
  } catch (error) {
    try {
      await holder.rollbackTransaction();
    } catch {
      /* the requests must not stay blocked if the poll throws */
    }
    throw error;
  } finally {
    await holder.release();
  }
};

const portfolioWaiters = async (dataSource: DataSource): Promise<number> => {
  const [locks] = await dataSource.query(
    `SELECT COUNT(*) AS n
       FROM performance_schema.data_lock_waits w
       JOIN performance_schema.data_locks blk
         ON blk.engine_lock_id = w.blocking_engine_lock_id
      WHERE blk.object_schema = DATABASE()
        AND blk.object_name = 'portfolios'`,
  );
  return Number(locks.n);
};

/**
 * Side schema for P-26. Copies only the tables the four migrations read or
 * reference. Does not replay the migration chain (the baseline replay fails
 * at `CreatePiDelegates1787600000000`). Drops any previous side schema first.
 */
export const prepareBatchDatabase = async (
  admin: DataSource,
): Promise<void> => {
  const source = process.env.ARI_TEST_MYSQL_NAME;
  await admin.query(`DROP DATABASE IF EXISTS \`${BATCH_DATABASE}\``);
  await admin.query(
    `CREATE DATABASE \`${BATCH_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  const like = async (table: string): Promise<void> => {
    await admin.query(
      `CREATE TABLE \`${BATCH_DATABASE}\`.\`${table}\` LIKE \`${source}\`.\`${table}\``,
    );
  };
  await like('portfolios');
  await admin.query(
    `INSERT INTO \`${BATCH_DATABASE}\`.portfolios SELECT * FROM \`${source}\`.portfolios WHERE id = 2`,
  );
  await like('sec_role_focus');
  await admin.query(
    `INSERT INTO \`${BATCH_DATABASE}\`.sec_role_focus SELECT * FROM \`${source}\`.sec_role_focus`,
  );
  await like('sec_roles');
  await admin.query(
    `INSERT INTO \`${BATCH_DATABASE}\`.sec_roles SELECT * FROM \`${source}\`.sec_roles`,
  );
  await like('alliance_user_staff');
};

export const dropBatchDatabase = async (admin: DataSource): Promise<void> => {
  await admin.query(`DROP DATABASE IF EXISTS \`${BATCH_DATABASE}\``);
};

export interface BatchFailureResult {
  threw: string;
  counts: SeedRowCounts;
  levelsTable: number;
}

/**
 * Runs the four strategy-framework migrations together (`transaction: all`)
 * on `ari_scratch_stf_batch`, throwing inside the third `framework_levels`
 * insert. The patch sits on `MysqlQueryRunner.prototype.query`, so it fires
 * on whichever runner the seed actually uses (dedicated or shared).
 */
export const runFourMigrationsWithInjectedSeedFailure =
  async (): Promise<BatchFailureResult> => {
    const dataSource = new DataSource({
      type: 'mysql',
      host: process.env.ARI_TEST_MYSQL_HOST,
      port: parseInt(process.env.ARI_TEST_MYSQL_PORT, 10),
      username: process.env.ARI_TEST_MYSQL_USER_NAME,
      password: process.env.ARI_TEST_MYSQL_USER_PASS,
      database: BATCH_DATABASE,
      entities: [],
      migrations: FOUR_MIGRATIONS,
      synchronize: false,
      migrationsRun: false,
      logging: false,
      extra: { connectionLimit: 4, charset: 'utf8mb4_0900_ai_ci' },
    });
    await dataSource.initialize();
    const probe = dataSource.createQueryRunner();
    const proto = Object.getPrototypeOf(probe) as QueryRunner & {
      query: (...args: unknown[]) => Promise<unknown>;
    };
    await probe.release();
    const original = proto.query;
    proto.query = async function patchedQuery(
      this: QueryRunner & { __stfLevelInserts?: number },
      ...args: unknown[]
    ) {
      const sql = typeof args[0] === 'string' ? args[0] : '';
      if (/INSERT INTO `framework_levels`/i.test(sql)) {
        this.__stfLevelInserts = (this.__stfLevelInserts ?? 0) + 1;
        if (this.__stfLevelInserts === 3) {
          await original.apply(this, args);
          throw new Error('injected seed failure');
        }
      }
      return original.apply(this, args);
    };
    let threw = '';
    try {
      const executor = new MigrationExecutor(dataSource);
      executor.transaction = 'all';
      try {
        await executor.executePendingMigrations();
      } catch (error) {
        threw = error instanceof Error ? error.message : String(error);
      }
      const counts = await countPortfolioRows(dataSource, SEEDED_PORTFOLIO_ID);
      const [table] = await dataSource.query(
        `SELECT COUNT(*) AS n FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_name = 'framework_levels'`,
      );
      return { threw, counts, levelsTable: Number(table.n) };
    } finally {
      proto.query = original;
      if (dataSource.isInitialized) await dataSource.destroy();
    }
  };

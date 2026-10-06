import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ControlListsController } from '../src/domain/entities/control-lists/control-lists.controller';
import { ControlListsService } from '../src/domain/entities/control-lists/control-lists.service';
import { ControlListCategoryRepository } from '../src/domain/entities/control-lists/repositories/control-list-category.repository';
import { ControlListRepository } from '../src/domain/entities/control-lists/repositories/control-list.repository';
import { ControlListValueRepository } from '../src/domain/entities/control-lists/repositories/control-list-value.repository';
import { ControlListUsageRegistry } from '../src/domain/entities/control-lists/control-list-usage.registry';
import { PortfoliosService } from '../src/domain/entities/portfolios/portfolios.service';
import { PortfoliosRepository } from '../src/domain/entities/portfolios/repositories/portfolios.repository';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { RolesGuard, ROLES_KEY } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../src/domain/shared/utils/results.util';
import { PortfolioUtil } from '../src/domain/shared/utils/portfolio.util';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';

/**
 * T-04 (docs/specs/institutional-performance/control-lists) — server
 * integration: the in-use protection (A9 inUse, A12 block, R-CTL-005) and
 * the consumer read (A13, R-CTL-006/007) against a REAL MySQL connection.
 *
 * Evidence DB (requester, 2026-10-01): the user's local development
 * database `ari_local_mysql`, 127.0.0.1:3306/stardb. `ARI_TEST_MYSQL_*`
 * resolve there (printed below). This suite:
 *  - creates its own scratch category/list/values (TEST_PREFIX below), never
 *    touching a seeded row;
 *  - creates ONE temporary consumer table with a plain FK to
 *    `control_list_values.id` `ON DELETE RESTRICT` (design §5 rule 5,
 *    D-CTL-3) to prove the DB backstop, and DROPs it in `afterAll` inside a
 *    try/finally so a failed assertion still cleans up;
 *  - registers ONE test `ControlListUsageProvider` on the REAL
 *    `ControlListUsageRegistry` instance resolved from the same module the
 *    controller/service use, reading its count from that temporary table.
 *
 * Scope note (KZ-017): same as the T-01/T-02/T-03 integration suites — a
 * test-only middleware stands in for `JwtMiddleware`; this does not reach
 * `ResponseInterceptor` / `GlobalExceptions` or Swagger (those are pinned at
 * the unit layer — `control-lists.global-exceptions.spec.ts`). The A13
 * CONTRIBUTOR test below proves the RBAC contract ("a non-admin role still
 * gets 200 through the real RolesGuard") — it does NOT prove an
 * unauthenticated request gets 401, because the test-only middleware always
 * sets `req.user`; that boundary is `JwtMiddleware`'s, which no T-0x
 * integration suite in this spec exercises.
 */
describe('Control Lists — usage: in-use protection and consumer read against real MySQL (T-04)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let registry: ControlListUsageRegistry;
  let portfolio2Id: number;
  let scratchCategoryId: number;
  let scratchListId: number;
  let scratchListKey: string;
  let valueInUseId: number;
  let valueNotInUseId: number;
  let valueInactiveId: number;

  const TEST_PREFIX = '__t04_itest__';
  const TEMP_TABLE = '__t04_itest_consumer';

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-usage.integration-spec] resolved DB target: ${host}:${port}/${database}`,
    );

    dataSource = new DataSource({
      type: 'mysql',
      host,
      port,
      username: process.env.ARI_TEST_MYSQL_USER_NAME,
      password: process.env.ARI_TEST_MYSQL_USER_PASS,
      database,
      entities: [
        `${__dirname}/../src/domain/entities/**/*.entity{.ts,.js}`,
        `${__dirname}/../src/domain/tools/clarisa/entities/**/*.entity{.ts,.js}`,
        `${__dirname}/../src/domain/shared/auxiliar/**/*.entity{.ts,.js}`,
        `${__dirname}/../src/domain/tools/open-search/prms/entities/*.entity{.ts,.js}`,
      ],
      synchronize: false,
      migrationsRun: false,
      logging: false,
      extra: { connectionLimit: 1 },
    });
    await dataSource.initialize();

    const [portfolio2] = await dataSource.query(
      `SELECT id FROM portfolios WHERE start_year = 2026 AND end_year = 2030 LIMIT 1`,
    );
    if (!portfolio2) {
      throw new Error(
        'Portfolio 2 (start_year=2026, end_year=2030) was not found on the ' +
          'resolved DB — this suite requires the pre-existing portfolios ' +
          'seed to already be applied.',
      );
    }
    portfolio2Id = Number(portfolio2.id);

    // Scratch category + list + 3 values, inserted directly (this suite is
    // about in-use/consumer-read behaviour, not category/list/value CRUD —
    // that is T-01/T-02/T-03's).
    scratchListKey = `${TEST_PREFIX}key_${Date.now()}`;

    const categoryInsert = await dataSource.query(
      `INSERT INTO control_list_categories (portfolio_id, name, display_order, is_active, created_at)
       VALUES (?, ?, 0, 1, NOW())`,
      [portfolio2Id, `${TEST_PREFIX}category_${Date.now()}`],
    );
    scratchCategoryId = Number(categoryInsert.insertId);

    const listInsert = await dataSource.query(
      `INSERT INTO control_lists (portfolio_id, category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, ?, 'T04', 0, 1, NOW())`,
      [portfolio2Id, scratchCategoryId, scratchListKey, `${TEST_PREFIX}list`],
    );
    scratchListId = Number(listInsert.insertId);

    const inUseInsert = await dataSource.query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, 'T04-01', ?, 1, 1, NOW())`,
      [scratchListId, `${TEST_PREFIX}in_use_value`],
    );
    valueInUseId = Number(inUseInsert.insertId);

    const notInUseInsert = await dataSource.query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, 'T04-02', ?, 2, 1, NOW())`,
      [scratchListId, `${TEST_PREFIX}not_in_use_value`],
    );
    valueNotInUseId = Number(notInUseInsert.insertId);

    const inactiveInsert = await dataSource.query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, 'T04-03', ?, 3, 0, NOW())`,
      [scratchListId, `${TEST_PREFIX}inactive_value`],
    );
    valueInactiveId = Number(inactiveInsert.insertId);

    // The temporary consumer table (D-CTL-3 backstop): a plain FK to
    // control_list_values.id, ON DELETE RESTRICT — the same shape a real
    // consumer (e.g. organizational-structure) would add in its own
    // migration.
    await dataSource.query(`DROP TABLE IF EXISTS ${TEMP_TABLE}`);
    await dataSource.query(
      `CREATE TABLE ${TEMP_TABLE} (
         id BIGINT AUTO_INCREMENT PRIMARY KEY,
         value_id BIGINT NOT NULL,
         CONSTRAINT fk_${TEMP_TABLE}_value FOREIGN KEY (value_id)
           REFERENCES control_list_values(id) ON DELETE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    // 3 rows reference valueInUseId (so its registered-provider count is 3);
    // valueNotInUseId and valueInactiveId have none.
    await dataSource.query(
      `INSERT INTO ${TEMP_TABLE} (value_id) VALUES (?), (?), (?)`,
      [valueInUseId, valueInUseId, valueInUseId],
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ControlListsController],
      providers: [
        ControlListsService,
        {
          provide: ControlListCategoryRepository,
          useFactory: () => new ControlListCategoryRepository(dataSource),
        },
        {
          provide: ControlListRepository,
          useFactory: () => new ControlListRepository(dataSource),
        },
        {
          provide: ControlListValueRepository,
          useFactory: () => new ControlListValueRepository(dataSource),
        },
        ControlListUsageRegistry,
        PortfoliosService,
        {
          provide: PortfoliosRepository,
          useFactory: () => new PortfoliosRepository(dataSource),
        },
        CurrentUserUtil,
        Reflector,
        RolesGuard,
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: PortfolioUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    // The SAME registry instance the controller/service resolve through DI
    // — registering here reaches getCategories/getValues/removeValue inside
    // the real app below (design §5 rule 5: "no request-scoped
    // dependency" — P-10 — is exactly what lets a single registration like
    // this reach every request).
    registry = moduleRef.get<ControlListUsageRegistry>(
      ControlListUsageRegistry,
    );
    registry.register({
      consumerName: 'T-04 Integration Test Consumer',
      listKeys: [scratchListKey],
      countByValueIds: async (valueIds: number[]) => {
        if (valueIds.length === 0) return {};
        const placeholders = valueIds.map(() => '?').join(',');
        const rows = await dataSource.query(
          `SELECT value_id, COUNT(*) as cnt FROM ${TEMP_TABLE} WHERE value_id IN (${placeholders}) GROUP BY value_id`,
          valueIds,
        );
        const counts: Record<number, number> = {};
        for (const row of rows) {
          counts[Number(row.value_id)] = Number(row.cnt);
        }
        return counts;
      },
    });

    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      const rolesHeader = req.headers['x-test-roles'];
      req.user = {
        sec_user_id: 1,
        roles: rolesHeader
          ? JSON.parse(rolesHeader as string)
          : [SecRolesEnum.CENTER_ADMIN],
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
      // valueInUseId may already be gone if the 409 test regressed and the
      // delete went through anyway; valueNotInUseId is deleted BY one of the
      // tests below (A12, not-in-use branch) — DELETE is a no-op on an
      // already-missing row either way, so this cleanup is unconditional and
      // idempotent.
      await dataSource.query(
        `DELETE FROM ${TEMP_TABLE} WHERE value_id IN (?, ?, ?)`,
        [valueInUseId, valueNotInUseId, valueInactiveId],
      );
      await dataSource.query(`DROP TABLE IF EXISTS ${TEMP_TABLE}`);
      await dataSource.query(
        `DELETE FROM control_list_values WHERE list_id = ?`,
        [scratchListId],
      );
      await dataSource.query(`DELETE FROM control_lists WHERE id = ?`, [
        scratchListId,
      ]);
      await dataSource.query(
        `DELETE FROM control_list_categories WHERE id = ?`,
        [scratchCategoryId],
      );
      // Belt-and-suspenders sweep by prefix, in case any id capture above
      // failed before assignment (mirrors the other T-0x integration
      // suites' final LIKE-prefix cleanup).
      await dataSource.query(
        `DELETE FROM control_list_values WHERE code LIKE 'T04-%' AND value LIKE '${TEST_PREFIX}%'`,
      );
      await dataSource.query(
        `DELETE FROM control_lists WHERE name LIKE '${TEST_PREFIX}%'`,
      );
      await dataSource.query(
        `DELETE FROM control_list_categories WHERE name LIKE '${TEST_PREFIX}%'`,
      );
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  it('declares NO roles metadata on GET /by-key/:listKey/values (A13, design §8 — any authenticated user)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ControlListsController.prototype.getValuesByKey,
    );
    expect(roles).toBeUndefined();
  });

  // The registered test provider drives inUse in A9 (tasks.md T-04 "Server
  // integration").
  it('A9 attaches the REAL registered-provider count per value (3 for the referenced value, 0 for the other)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/lists/${scratchListId}/values`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .expect(200);

    const values = response.body.data as Array<{ id: number; inUse: number }>;
    const inUseRow = values.find((v) => Number(v.id) === valueInUseId);
    const notInUseRow = values.find((v) => Number(v.id) === valueNotInUseId);

    expect(inUseRow?.inUse).toBe(3);
    expect(notInUseRow?.inUse).toBe(0);
  });

  // The registered test provider drives the 409 in A12 (tasks.md T-04
  // "Server integration"); falsifier 2 guard.
  it('A12 returns 409 naming the count and proposing deactivation for the in-use value, and deletes nothing', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/values/${valueInUseId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .expect(409);

    const errors = response.body?.errors ?? response.body?.message;
    expect(JSON.stringify(errors)).toMatch(/3/);
    expect(JSON.stringify(errors).toLowerCase()).toMatch(/deactivat/);

    const [row] = await dataSource.query(
      `SELECT id FROM control_list_values WHERE id = ?`,
      [valueInUseId],
    );
    expect(row).toBeDefined();
  });

  // D-CTL-3 / R-CTL-005 "The protection also holds at the database level":
  // even bypassing the service entirely with a raw DELETE, the consumer's
  // own FK (ON DELETE RESTRICT) blocks the physical delete.
  it('the DB itself (not just the service) refuses a raw physical delete of the in-use value', async () => {
    await expect(
      dataSource.query(`DELETE FROM control_list_values WHERE id = ?`, [
        valueInUseId,
      ]),
    ).rejects.toThrow();

    const [row] = await dataSource.query(
      `SELECT id FROM control_list_values WHERE id = ?`,
      [valueInUseId],
    );
    expect(row).toBeDefined();
  });

  // Falsifier 2 complement: a value with count 0 deletes normally (200).
  it('A12 returns 200 and deletes the NOT-in-use value', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/values/${valueNotInUseId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .expect(200);

    expect(Number(response.body?.data?.id)).toBe(valueNotInUseId);

    const [row] = await dataSource.query(
      `SELECT id FROM control_list_values WHERE id = ?`,
      [valueNotInUseId],
    );
    expect(row).toBeUndefined();
  });

  // R-CTL-006 "Ordered read" + R-CTL-007 "any authenticated user": a
  // CONTRIBUTOR (NOT Center Admin / System Admin) gets 200 through the real
  // route/pipe/guard (KZ-017: this is the one place that can prove
  // reachability end to end, not just the controller method in isolation).
  it('A13 returns 200 for an authenticated CONTRIBUTOR (not an admin role) through the real route/guard/pipe', async () => {
    const response = await request(app.getHttpServer())
      .get(`/by-key/${scratchListKey}/values`)
      .query({ portfolioId: portfolio2Id })
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]))
      .expect(200);

    const codes = (response.body.data as Array<{ code: string }>).map(
      (v) => v.code,
    );
    // valueInUseId was deleted above (409-blocked, still present);
    // valueNotInUseId was deleted by the previous test (gone); the
    // inactive one is excluded by the default activeOnly=true.
    expect(codes).toContain('T04-01');
    expect(codes).not.toContain('T04-02');
    expect(codes).not.toContain('T04-03');
  });

  // R-CTL-004 "Deactivate": activeOnly=false includes the inactive value.
  it('A13 includes the inactive value when activeOnly=false', async () => {
    const response = await request(app.getHttpServer())
      .get(`/by-key/${scratchListKey}/values`)
      .query({ portfolioId: portfolio2Id, activeOnly: 'false' })
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]))
      .expect(200);

    const codes = (response.body.data as Array<{ code: string }>).map(
      (v) => v.code,
    );
    expect(codes).toContain('T04-03');
  });

  // R-CTL-006 "unknown key for the portfolio → 404".
  it('A13 returns 404 for an unknown key in the portfolio', async () => {
    const response = await request(app.getHttpServer())
      .get(`/by-key/${TEST_PREFIX}unknown_key/values`)
      .query({ portfolioId: portfolio2Id })
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]))
      .expect(404);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();
  });
});

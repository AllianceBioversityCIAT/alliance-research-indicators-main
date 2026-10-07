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
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../src/domain/shared/utils/results.util';
import { PortfolioUtil } from '../src/domain/shared/utils/portfolio.util';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';

/**
 * T-02 (docs/specs/institutional-performance/control-lists) — server
 * integration, A7 immutable-key behaviour against a REAL MySQL connection
 * and the REAL `ValidationPipe`.
 *
 * Falsifiers 1/2 (tasks.md T-02) are both pipe-level concerns
 * (`forbidNonWhitelisted`), which a controller/service unit test cannot
 * exercise — those tests call the service method directly and never pass
 * through a `ValidationPipe`. This is therefore the ONLY place either
 * falsifier can turn red, per the task's own "Server integration" row.
 *
 * Evidence DB (requester, 2026-10-01): the user's local development
 * database `ari_local_mysql`, 127.0.0.1:3306/stardb. `ARI_TEST_MYSQL_*`
 * resolve there (printed below). Every row this file creates (one scratch
 * category, one scratch list) is deleted in `afterAll`; no existing table
 * is altered.
 *
 * Scope note (KZ-017): same as `control-lists-categories.integration-spec.ts`
 * — a test-only middleware stands in for `JwtMiddleware` (ROAR-issued JWTs
 * are out of local reach); this does not reach the global
 * `ResponseInterceptor` / `GlobalExceptions` envelope wiring or Swagger.
 */
describe('Control Lists — lists, immutable key against real MySQL (T-02)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let portfolio2Id: number;
  let scratchCategoryId: number;
  let scratchListId: number;
  // CR-2 (2026-10-07): scratch lists inserted with `is_system = 1`, used
  // only to prove A8 `removeList` no longer gates on the flag. Never the
  // real seeded lists.
  let scratchSystemEmptyListId: number | null;
  let scratchSystemWithValueListId: number;
  let scratchSystemValueId: number;

  const TEST_PREFIX = '__t02_itest__';

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-lists.integration-spec] resolved DB target: ${host}:${port}/${database}`,
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

    // Scratch category + list, inserted directly (this suite is about A7's
    // ValidationPipe behaviour, not category/list creation).
    const categoryInsert = await dataSource.query(
      `INSERT INTO control_list_categories (portfolio_id, name, display_order, is_active, created_at)
       VALUES (?, ?, 0, 1, NOW())`,
      [portfolio2Id, `${TEST_PREFIX}category_${Date.now()}`],
    );
    scratchCategoryId = Number(categoryInsert.insertId);

    const listInsert = await dataSource.query(
      `INSERT INTO control_lists (portfolio_id, category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, ?, 'SCR', 0, 1, NOW())`,
      [
        portfolio2Id,
        scratchCategoryId,
        `${TEST_PREFIX}key_${Date.now()}`,
        `${TEST_PREFIX}list`,
      ],
    );
    scratchListId = Number(listInsert.insertId);

    // CR-2 scratch rows: one empty seeded-style list (is_system = 1, no
    // values) and one seeded-style list with one value, both never touched
    // except by the CR-2 tests below.
    const systemEmptyListInsert = await dataSource.query(
      `INSERT INTO control_lists (portfolio_id, category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, ?, 'SCR', 1, 1, NOW())`,
      [
        portfolio2Id,
        scratchCategoryId,
        `${TEST_PREFIX}sys_empty_key_${Date.now()}`,
        `${TEST_PREFIX}sys_empty_list`,
      ],
    );
    scratchSystemEmptyListId = Number(systemEmptyListInsert.insertId);

    const systemWithValueListInsert = await dataSource.query(
      `INSERT INTO control_lists (portfolio_id, category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, ?, 'SCR', 1, 1, NOW())`,
      [
        portfolio2Id,
        scratchCategoryId,
        `${TEST_PREFIX}sys_val_key_${Date.now()}`,
        `${TEST_PREFIX}sys_val_list`,
      ],
    );
    scratchSystemWithValueListId = Number(systemWithValueListInsert.insertId);

    const systemValueInsert = await dataSource.query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, 'SCR-01', ?, 0, 1, NOW())`,
      [scratchSystemWithValueListId, `${TEST_PREFIX}sys_value`],
    );
    scratchSystemValueId = Number(systemValueInsert.insertId);

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
        PortfoliosService,
        {
          provide: PortfoliosRepository,
          useFactory: () => new PortfoliosRepository(dataSource),
        },
        CurrentUserUtil,
        // T-04 (consumer per the brief's forward pointer): ControlListsService
        // now depends on ControlListUsageRegistry. No providers are
        // registered in this suite — it is about the immutable list key,
        // not usage.
        ControlListUsageRegistry,
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
    if (scratchListId) {
      await dataSource.query(`DELETE FROM control_lists WHERE id = ?`, [
        scratchListId,
      ]);
    }
    // CR-2 scratch rows: `scratchSystemEmptyListId` is deleted BY its own
    // test (A8, 200) — a defensive no-op delete here handles a failed test
    // leaving it behind. `scratchSystemWithValueListId`'s 409 test deletes
    // nothing, so its value row then its list row are cleaned up here.
    if (scratchSystemEmptyListId) {
      await dataSource.query(`DELETE FROM control_lists WHERE id = ?`, [
        scratchSystemEmptyListId,
      ]);
    }
    if (scratchSystemValueId) {
      await dataSource.query(`DELETE FROM control_list_values WHERE id = ?`, [
        scratchSystemValueId,
      ]);
    }
    if (scratchSystemWithValueListId) {
      await dataSource.query(`DELETE FROM control_lists WHERE id = ?`, [
        scratchSystemWithValueListId,
      ]);
    }
    if (scratchCategoryId) {
      await dataSource.query(
        `DELETE FROM control_list_categories WHERE id = ?`,
        [scratchCategoryId],
      );
    }
    await dataSource.query(
      `DELETE FROM control_lists WHERE name LIKE '${TEST_PREFIX}%'`,
    );
    await dataSource.query(
      `DELETE FROM control_list_categories WHERE name LIKE '${TEST_PREFIX}%'`,
    );
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  // Falsifiers 1 & 2 (tasks.md T-02): accepting `listKey` in the update DTO,
  // or dropping `forbidNonWhitelisted`, would turn this 400 into a 200.
  it('returns 400 (not 200) when the PATCH body includes listKey, and the key stays unchanged', async () => {
    const [before] = await dataSource.query(
      `SELECT list_key FROM control_lists WHERE id = ?`,
      [scratchListId],
    );

    const response = await request(app.getHttpServer())
      .patch(`/lists/${scratchListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ name: 'Renamed', listKey: 'attempted.override' })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [after] = await dataSource.query(
      `SELECT list_key, name FROM control_lists WHERE id = ?`,
      [scratchListId],
    );
    expect(after.list_key).toBe(before.list_key);
    expect(after.name).not.toBe('Renamed');
  });

  it('returns 200 and updates the name when the PATCH body omits listKey', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/lists/${scratchListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ name: `${TEST_PREFIX}renamed` })
      .expect(200);

    expect(response.body?.data?.name).toBe(`${TEST_PREFIX}renamed`);

    const [after] = await dataSource.query(
      `SELECT name FROM control_lists WHERE id = ?`,
      [scratchListId],
    );
    expect(after.name).toBe(`${TEST_PREFIX}renamed`);
  });

  // Risk Reviewer defect 1 (T-02 rework attempt 2): on attempt-1 code,
  // `{categoryId: null}` passed `@IsOptional()` untouched, reached
  // `findActiveCategoryOrFail(null)`, and TypeORM's query builder drops a
  // `null` where-key entirely — `WHERE is_active = 1` with no id filter —
  // so the list was silently reassigned to the first active category
  // instead of rejecting the request. Observed red against attempt-1 before
  // the `@ValidateIf` fix (see report). Only a real `ValidationPipe` (this
  // suite, never a mocked service unit test) can prove the 400.
  it('returns 400 (not 200) when the PATCH body sets categoryId to null, and the list stays in its category', async () => {
    const [before] = await dataSource.query(
      `SELECT category_id FROM control_lists WHERE id = ?`,
      [scratchListId],
    );

    const response = await request(app.getHttpServer())
      .patch(`/lists/${scratchListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ categoryId: null })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [after] = await dataSource.query(
      `SELECT category_id FROM control_lists WHERE id = ?`,
      [scratchListId],
    );
    expect(Number(after.category_id)).toBe(Number(before.category_id));
  });

  // Risk Reviewer defect 2, list side. Measured against attempt-1 code
  // (not the originally-hypothesized 500/P-14): this Dev MySQL's
  // `sql_mode` is non-strict, so writing a literal `null` into the NOT
  // NULL `name` column did not raise errno 1048 — it silently coerced to
  // the column's implicit default (`''`) and attempt-1 returned a plain
  // 200 with the list renamed to an empty string. A 500 is exactly what
  // WOULD happen under a strict `sql_mode` (e.g. Prod, see P-14) — either
  // way, never the clean 400 asserted below, which the pipe now returns
  // before the write is attempted at all.
  it('returns 400 (not 500) when the PATCH body sets name to null, and the name stays unchanged', async () => {
    const [before] = await dataSource.query(
      `SELECT name FROM control_lists WHERE id = ?`,
      [scratchListId],
    );

    const response = await request(app.getHttpServer())
      .patch(`/lists/${scratchListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ name: null })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [after] = await dataSource.query(
      `SELECT name FROM control_lists WHERE id = ?`,
      [scratchListId],
    );
    expect(after.name).toBe(before.name);
  });

  // Risk Reviewer defect 3, list side: `description: ''` clears to stored
  // NULL, same normalization as categories.
  it('returns 200 and clears description (stored as NULL) when the PATCH body sets description to an empty string', async () => {
    // Give the scratch list a description to clear first — it was created
    // with none in `beforeAll`.
    await dataSource.query(
      `UPDATE control_lists SET description = ? WHERE id = ?`,
      ['to be cleared', scratchListId],
    );

    const response = await request(app.getHttpServer())
      .patch(`/lists/${scratchListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ description: '' })
      .expect(200);

    expect(response.body?.data?.description).toBeNull();

    const [after] = await dataSource.query(
      `SELECT description FROM control_lists WHERE id = ?`,
      [scratchListId],
    );
    expect(after.description).toBeNull();
  });

  // CR-2 / D-CTL-18 (2026-10-07): "system list cannot be deleted" is
  // removed — any list, seeded (`is_system = 1`) or created, can be
  // deleted once it has no values. This scratch list is NOT one of the
  // real seeded lists; it is inserted in `beforeAll` with `is_system = 1`
  // for this purpose only.
  it('returns 200 and physically deletes an empty seeded-style list (is_system = 1) — CR-2', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/lists/${scratchSystemEmptyListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .expect(200);

    expect(response.body?.data?.id).toBe(scratchSystemEmptyListId);

    const rows = await dataSource.query(
      `SELECT id FROM control_lists WHERE id = ?`,
      [scratchSystemEmptyListId],
    );
    expect(rows).toHaveLength(0);

    // Deleted by this test itself — afterAll's defensive cleanup is a
    // no-op for it; clear the var so a second accidental delete attempt
    // there is harmless either way.
    scratchSystemEmptyListId = null;
  });

  // CR-2: `is_system` grants no exemption from the values rule — a
  // seeded-style list WITH values is blocked the same way a custom list
  // with values is (409, nothing removed).
  it('returns 409 and deletes nothing for a seeded-style list (is_system = 1) with values — CR-2', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/lists/${scratchSystemWithValueListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .expect(409);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const rows = await dataSource.query(
      `SELECT id FROM control_lists WHERE id = ?`,
      [scratchSystemWithValueListId],
    );
    expect(rows).toHaveLength(1);

    const valueRows = await dataSource.query(
      `SELECT id FROM control_list_values WHERE id = ?`,
      [scratchSystemValueId],
    );
    expect(valueRows).toHaveLength(1);
  });
});

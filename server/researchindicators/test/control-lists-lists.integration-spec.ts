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
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';

/**
 * Control Lists — lists against a REAL MySQL connection and the REAL
 * `ValidationPipe` (docs/specs/changes/control-lists-global-scope, T-01; the
 * original T-02 cases of docs/specs/institutional-performance/control-lists
 * are kept).
 *
 * Falsifiers 1/2 of the original T-02 (accepting `listKey` in the update DTO,
 * dropping `forbidNonWhitelisted`) are pipe-level concerns a controller or
 * service unit test cannot exercise — those tests call the service method
 * directly and never pass through a `ValidationPipe`. This is therefore the
 * ONLY place either can turn red. The same holds for the stale `portfolioId`
 * on A6/A7 (R-CLG-001 AC.2).
 *
 * It also covers the DATABASE side of R-CLG-003/NFR-CLG-001: no `portfolio_id`
 * column on `control_lists`, a unique index on `list_key` (`Non_unique =
 * 0`), and raw duplicate `INSERT`s — a scratch key in another letter case and
 * the seeded `kpi.direction` key in another letter case — failing with errno
 * 1062. An HTTP duplicate would only prove the service pre-check, so the
 * uniqueness proof is the raw insert. R-CLG-003 *Move to any category* is
 * exercised against the real seeded category 2.
 *
 * Evidence DB: the requester's local database `ari_local_mysql`,
 * 127.0.0.1:3306/stardb. `ARI_TEST_MYSQL_*` resolve there (printed below) —
 * NOT a disposable schema. Every row this file creates (scratch categories and
 * lists, any stray row a missing index would let in) sits ABOVE the seeded id
 * ranges (categories 1-2, lists 1-6, values 1-23) and is deleted in
 * `afterAll`. This suite NEVER updates or deletes a seeded row; it only reads
 * them, or attempts an INSERT that must fail.
 *
 * Scope note (KZ-017): same as `control-lists-categories.integration-spec.ts`
 * — a test-only middleware stands in for `JwtMiddleware` (ROAR-issued JWTs
 * are out of local reach); this does not reach the global
 * `ResponseInterceptor` / `GlobalExceptions` envelope wiring or Swagger.
 */
describe('Control Lists — lists, immutable key and key uniqueness against real MySQL (T-01)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let scratchCategoryId: number;
  let scratchListId: number;
  // CR-2 (2026-10-07): scratch lists inserted with `is_system = 1`, used
  // only to prove A8 `removeList` no longer gates on the flag. Never the
  // real seeded lists.
  let scratchSystemEmptyListId: number | null;
  let scratchSystemWithValueListId: number;
  let scratchSystemValueId: number;
  // Rows created by the uniqueness/API tests below; removed by id in afterAll
  // (every id is above the seeded range).
  const createdListIds: number[] = [];

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

    // Scratch category + list, inserted directly (this suite is about A7's
    // ValidationPipe behaviour, not category/list creation).
    const categoryInsert = await dataSource.query(
      `INSERT INTO control_list_categories (name, display_order, is_active, created_at)
       VALUES (?, 0, 1, NOW())`,
      [`${TEST_PREFIX}category_${Date.now()}`],
    );
    scratchCategoryId = Number(categoryInsert.insertId);

    const listInsert = await dataSource.query(
      `INSERT INTO control_lists (category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, 'SCR', 0, 1, NOW())`,
      [
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
      `INSERT INTO control_lists (category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, 'SCR', 1, 1, NOW())`,
      [
        scratchCategoryId,
        `${TEST_PREFIX}sys_empty_key_${Date.now()}`,
        `${TEST_PREFIX}sys_empty_list`,
      ],
    );
    scratchSystemEmptyListId = Number(systemEmptyListInsert.insertId);

    const systemWithValueListInsert = await dataSource.query(
      `INSERT INTO control_lists (category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, 'SCR', 1, 1, NOW())`,
      [
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
        CurrentUserUtil,
        // ControlListsService depends on ControlListUsageRegistry. No
        // providers are registered in this suite — it is about the list key,
        // not usage.
        ControlListUsageRegistry,
        Reflector,
        RolesGuard,
      ],
    })
      // The controller's `@UseInterceptors(SetUpInterceptor)` only primes
      // per-request context this module never reads; replacing it keeps any
      // hand-wired provider it would need out of the suite.
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      const rolesHeader = req.headers['x-test-roles'];
      req.user = {
        sec_user_id: 1,
        roles: rolesHeader
          ? JSON.parse(rolesHeader as string)
          : [SecRolesEnum.TECHNICAL_SUPPORT],
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    // Every cleanup is by an id this suite created or by the unique scratch
    // prefix, and each statement is bounded above the seeded ranges.
    if (createdListIds.length > 0) {
      await dataSource.query(
        `DELETE FROM control_lists WHERE id IN (${createdListIds.join(',')}) AND id > 6`,
      );
    }
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
      `DELETE FROM control_lists WHERE name LIKE '${TEST_PREFIX}%' AND id > 6`,
    );
    await dataSource.query(
      `DELETE FROM control_list_categories WHERE name LIKE '${TEST_PREFIX}%' AND id > 2`,
    );
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  describe('schema (R-CLG-001 AC.1, R-CLG-003, NFR-CLG-001)', () => {
    it('has no portfolio_id column on control_lists', async () => {
      const columns = await dataSource.query(
        `SHOW COLUMNS FROM control_lists LIKE 'portfolio_id'`,
      );
      expect(columns).toHaveLength(0);
    });

    it('has a unique index on list_key only: uq_control_lists_key, Non_unique = 0', async () => {
      const rows: Array<{
        Non_unique: number | string;
        Column_name: string;
      }> = await dataSource.query(
        `SHOW INDEX FROM control_lists WHERE Key_name = 'uq_control_lists_key'`,
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].Non_unique)).toBe(0);
      expect(rows[0].Column_name).toBe('list_key');
    });

    // Raw INSERTs: the DATABASE refuses the duplicate, whatever the service
    // pre-check does. A stray row (only possible if the index is missing) is
    // recorded so afterAll removes it, and the errno assertion then fails.
    const insertRawList = async (
      listKey: string,
    ): Promise<number | undefined> => {
      try {
        const result = await dataSource.query(
          `INSERT INTO control_lists (category_id, list_key, name, code_prefix, is_system, is_active, created_at)
           VALUES (?, ?, ?, 'DUP', 0, 1, NOW())`,
          [scratchCategoryId, listKey, `${TEST_PREFIX}dup_list`],
        );
        createdListIds.push(Number(result.insertId));
        return undefined;
      } catch (error) {
        return (error as { errno?: number }).errno;
      }
    };

    it('rejects a raw INSERT of an existing scratch key in another letter case with errno 1062 (ER_DUP_ENTRY)', async () => {
      const [scratch] = await dataSource.query(
        `SELECT list_key FROM control_lists WHERE id = ?`,
        [scratchListId],
      );

      expect(await insertRawList(String(scratch.list_key).toUpperCase())).toBe(
        1062,
      );
    });

    it('rejects a raw INSERT of the seeded key kpi.direction in another letter case with errno 1062, adding no row', async () => {
      expect(await insertRawList('KPI.DIRECTION')).toBe(1062);

      const rows = await dataSource.query(
        `SELECT id FROM control_lists WHERE list_key = 'kpi.direction'`,
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].id)).toBe(2);
    });
  });

  // R-CLG-001 AC.2 / *Stale caller* · AND IT MUST NOT create or change any
  // row: the REAL pipe rejects `portfolioId` on A6 and A7.
  it('returns 400 (not 201) for a body carrying portfolioId on POST /lists, and creates nothing', async () => {
    const listKey = `${TEST_PREFIX}stale_${Date.now()}`;

    const response = await request(app.getHttpServer())
      .post('/lists')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({
        categoryId: scratchCategoryId,
        listKey,
        name: `${TEST_PREFIX}stale`,
        portfolioId: 2,
      })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();
    const rows = await dataSource.query(
      `SELECT id FROM control_lists WHERE list_key = ?`,
      [listKey],
    );
    expect(rows).toHaveLength(0);
  });

  it('returns 400 (not 200) for a body carrying portfolioId on PATCH /lists/:id, and changes nothing', async () => {
    const [before] = await dataSource.query(
      `SELECT name FROM control_lists WHERE id = ?`,
      [scratchListId],
    );

    await request(app.getHttpServer())
      .patch(`/lists/${scratchListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({ name: 'Renamed by a stale caller', portfolioId: 2 })
      .expect(400);

    const [after] = await dataSource.query(
      `SELECT name FROM control_lists WHERE id = ?`,
      [scratchListId],
    );
    expect(after.name).toBe(before.name);
  });

  // R-CLG-003 *Duplicate key* through the real API: another letter case of a
  // seeded key is a 409 naming `listKey`. This proves the SERVICE pre-check
  // only — the uniqueness guarantee is the raw-INSERT tests above.
  it('returns 409 for a duplicate of the seeded key kpi.direction in another letter case (pre-check only), creating nothing', async () => {
    const response = await request(app.getHttpServer())
      .post('/lists')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({
        categoryId: scratchCategoryId,
        listKey: 'kpi.direction',
        name: `${TEST_PREFIX}duplicate_key`,
      });

    if (response.body?.data?.id) {
      createdListIds.push(Number(response.body.data.id));
    }
    expect(response.status).toBe(409);

    const rows = await dataSource.query(
      `SELECT id FROM control_lists WHERE list_key = 'kpi.direction'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('returns 201 for a new key with no scope parameter (cleaned up)', async () => {
    const response = await request(app.getHttpServer())
      .post('/lists')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({
        categoryId: scratchCategoryId,
        listKey: `${TEST_PREFIX}created_${Date.now()}`,
        name: `${TEST_PREFIX}created`,
      });

    if (response.body?.data?.id) {
      createdListIds.push(Number(response.body.data.id));
    }
    expect(response.status).toBe(201);
    expect(Number(response.body.data.id)).toBeGreaterThan(6);
    expect(Object.keys(response.body.data)).not.toContain('portfolioId');
  });

  // R-CLG-003 *Move to any category*: the target is the real seeded category
  // 2, which this test only reads; the scratch list is moved back so the
  // suite leaves nothing behind.
  it('returns 200 when a list is moved to any other category (the seeded category 2), then moves it back', async () => {
    try {
      await request(app.getHttpServer())
        .patch(`/lists/${scratchListId}`)
        .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
        .send({ categoryId: 2 })
        .expect(200);

      const [moved] = await dataSource.query(
        `SELECT category_id FROM control_lists WHERE id = ?`,
        [scratchListId],
      );
      expect(Number(moved.category_id)).toBe(2);
    } finally {
      await dataSource.query(
        `UPDATE control_lists SET category_id = ? WHERE id = ? AND id > 6`,
        [scratchCategoryId, scratchListId],
      );
    }
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
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

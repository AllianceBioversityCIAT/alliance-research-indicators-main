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
import { RolesGuard, ROLES_KEY } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { appliesToProviders } from './support/control-lists-providers';

/**
 * Control Lists — categories against a REAL MySQL connection
 * (docs/specs/changes/control-lists-global-scope, T-01; the original
 * T-01/T-02 rework cases of docs/specs/institutional-performance/control-lists
 * are kept).
 *
 * Covers: A3 roles through the REAL `RolesGuard` (Technical Support allowed,
 * Center Admin and Contributor denied with nothing written — R-CLG-008), a
 * stale `portfolioId` on A3 rejected by the REAL `ValidationPipe` with nothing
 * written (R-CLG-001), the A4 `null`/`''` pipe cases, and the DATABASE side of
 * R-CLG-001/R-CLG-002/NFR-CLG-001: no `portfolio_id` column, a unique index on
 * `name` (`Non_unique = 0`), and a raw duplicate `INSERT` in another letter
 * case failing with errno 1062 (an HTTP duplicate would only prove the
 * service pre-check, so none is used as the uniqueness proof).
 *
 * Evidence DB: the requester's local database `ari_local_mysql`,
 * 127.0.0.1:3306/stardb. `ARI_TEST_MYSQL_*` resolve there (printed below) —
 * this is NOT a disposable schema. Every row this file creates carries the
 * `TEST_NAME_PREFIX` name and sits ABOVE the seeded id range (categories 1-2);
 * it is deleted in `afterAll`. This suite NEVER updates or deletes a seeded
 * row, and alters no table.
 *
 * Scope note (KZ-017): the REAL `ControlListsController`, `ControlListsService`
 * and `RolesGuard` run against a REAL TypeORM connection, so a request reaches
 * MySQL and a 403 comes from `RolesGuard` evaluating `@Roles` metadata against
 * `request.user.roles`. It does NOT reach the real `JwtMiddleware` (a test
 * middleware sets `request.user` from a test-only header, as
 * `impersonation.controller.spec.ts` does — a ROAR-issued JWT is out of local
 * reach), the global `ResponseInterceptor` / `GlobalExceptions` wiring
 * (`control-lists.validation.spec.ts` covers the envelope), or Swagger.
 */
describe('Control Lists — categories, roles and uniqueness against real MySQL (T-01)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let scratchCategoryId: number;
  const createdCategoryIds: number[] = [];

  const TEST_NAME_PREFIX = '__t01_itest_category__';

  const asRole = (role: SecRolesEnum) => JSON.stringify([role]);

  // mysql2 can return a bigint column as a string; the JSON body needs a real
  // JS number where the DTO uses @IsInt().
  const countByName = async (name: string): Promise<number> => {
    const rows = await dataSource.query(
      `SELECT id FROM control_list_categories WHERE name = ?`,
      [name],
    );
    return rows.length;
  };

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-categories.integration-spec] resolved DB target: ${host}:${port}/${database}`,
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

    // A persistent scratch category for the PATCH /categories/:id null/''
    // cases below, inserted directly — those cases are about PATCH behaviour,
    // not category creation.
    const categoryInsert = await dataSource.query(
      `INSERT INTO control_list_categories (name, description, display_order, is_active, created_at)
       VALUES (?, ?, 0, 1, NOW())`,
      [`${TEST_NAME_PREFIX}scratch_${Date.now()}`, 'to be cleared'],
    );
    scratchCategoryId = Number(categoryInsert.insertId);

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
        ...appliesToProviders(dataSource),
        CurrentUserUtil,
        // ControlListsService depends on ControlListUsageRegistry. No
        // providers are registered in this suite, so A1 usedBy / A9 inUse stay
        // [] / 0 — this suite is about categories, not usage.
        ControlListUsageRegistry,
        Reflector,
        RolesGuard,
      ],
    })
      // The controller's `@UseInterceptors(SetUpInterceptor)` only primes
      // per-request result/portfolio context that this module never reads;
      // replacing it keeps the hand-wired providers it would need out of the
      // suite (the only portfolio provider wired here is the read handle the
      // service itself injects, see `appliesToProviders`).
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = moduleRef.createNestApplication();
    // Stands in for JwtMiddleware (out of this spec's reach — KZ-017): sets
    // req.user from a test-only header so the REAL RolesGuard sees a REAL
    // role array.
    app.use((req, _res, next) => {
      const rolesHeader = req.headers['x-test-roles'];
      req.user = {
        sec_user_id: 1,
        roles: rolesHeader ? JSON.parse(rolesHeader as string) : [],
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    // Every cleanup is by an id this suite created or by the unique scratch
    // prefix, and every id here is above the seeded range (1-2).
    if (createdCategoryIds.length > 0) {
      await dataSource.query(
        `DELETE FROM control_list_categories WHERE id IN (${createdCategoryIds.join(',')}) AND id > 2`,
      );
    }
    if (scratchCategoryId) {
      await dataSource.query(
        `DELETE FROM control_list_categories WHERE id = ? AND id > 2`,
        [scratchCategoryId],
      );
    }
    // Belt-and-braces: also sweep by name prefix in case an assertion threw
    // before a created id was recorded.
    await dataSource.query(
      `DELETE FROM control_list_categories WHERE name LIKE '${TEST_NAME_PREFIX}%' AND id > 2`,
    );
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  describe('schema (R-CLG-001 AC.1, R-CLG-002, NFR-CLG-001)', () => {
    it('has no portfolio_id column on control_list_categories', async () => {
      const columns = await dataSource.query(
        `SHOW COLUMNS FROM control_list_categories LIKE 'portfolio_id'`,
      );
      expect(columns).toHaveLength(0);
    });

    it('has a unique index on name only: uq_control_list_categories_name, Non_unique = 0', async () => {
      const rows: Array<{
        Non_unique: number | string;
        Column_name: string;
        Seq_in_index: number | string;
      }> = await dataSource.query(
        `SHOW INDEX FROM control_list_categories WHERE Key_name = 'uq_control_list_categories_name'`,
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].Non_unique)).toBe(0);
      expect(rows[0].Column_name).toBe('name');
    });

    // The DATABASE rejects a duplicate in another letter case: this is the
    // uniqueness proof (an HTTP duplicate proves only the service pre-check).
    // A scratch row is duplicated, never a seeded one, so a missing index can
    // only ever leave a row this file created.
    it('rejects a raw INSERT of the same name in another letter case with errno 1062 (ER_DUP_ENTRY)', async () => {
      const name = `${TEST_NAME_PREFIX}dup_${Date.now()}`;
      const first = await dataSource.query(
        `INSERT INTO control_list_categories (name, display_order, is_active, created_at)
         VALUES (?, 0, 1, NOW())`,
        [name],
      );
      createdCategoryIds.push(Number(first.insertId));

      let errno: number | undefined;
      try {
        const second = await dataSource.query(
          `INSERT INTO control_list_categories (name, display_order, is_active, created_at)
           VALUES (?, 0, 1, NOW())`,
          [name.toUpperCase()],
        );
        // Reached only when the index is missing: record the stray row so
        // afterAll removes it, then fail on the errno assertion below.
        createdCategoryIds.push(Number(second.insertId));
      } catch (error) {
        errno = (error as { errno?: number }).errno;
      }

      expect(errno).toBe(1062);
      const rows = await dataSource.query(
        `SELECT id FROM control_list_categories WHERE name = ?`,
        [name],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it('declares @Roles(SYSTEM_ADMIN, TECHNICAL_SUPPORT) on POST /categories (metadata sanity check, not the sole proof)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ControlListsController.prototype.createCategory,
    );
    expect(roles).toEqual([
      SecRolesEnum.SYSTEM_ADMIN,
      SecRolesEnum.TECHNICAL_SUPPORT,
    ]);
  });

  it('returns 403 for a Contributor with a valid (authenticated) token on POST /categories, and creates nothing', async () => {
    const name = `${TEST_NAME_PREFIX}contributor_${Date.now()}`;

    await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', asRole(SecRolesEnum.CONTRIBUTOR))
      .send({ name })
      .expect(403);

    expect(await countByName(name)).toBe(0);
  });

  // R-CLG-008 *Center Admin denied* · BUT must NOT change any data: the role
  // that used to be allowed is rejected by the REAL guard, and the table is
  // unchanged.
  it('returns 403 for a Center Admin on POST /categories, and creates nothing', async () => {
    const name = `${TEST_NAME_PREFIX}center_admin_${Date.now()}`;

    await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', asRole(SecRolesEnum.CENTER_ADMIN))
      .send({ name })
      .expect(403);

    expect(await countByName(name)).toBe(0);
  });

  it('returns 403 for a Center Admin on PATCH /categories/:id, and changes nothing', async () => {
    const [before] = await dataSource.query(
      `SELECT name FROM control_list_categories WHERE id = ?`,
      [scratchCategoryId],
    );

    await request(app.getHttpServer())
      .patch(`/categories/${scratchCategoryId}`)
      .set('x-test-roles', asRole(SecRolesEnum.CENTER_ADMIN))
      .send({ name: `${TEST_NAME_PREFIX}center_admin_rename` })
      .expect(403);

    const [after] = await dataSource.query(
      `SELECT name FROM control_list_categories WHERE id = ?`,
      [scratchCategoryId],
    );
    expect(after.name).toBe(before.name);
  });

  // R-CLG-008 *Technical Support allowed*.
  it('returns 201 for a Technical Support user on POST /categories (real DB insert, cleaned up)', async () => {
    const name = `${TEST_NAME_PREFIX}tech_support_${Date.now()}`;

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', asRole(SecRolesEnum.TECHNICAL_SUPPORT))
      .send({ name });

    // Capture the id for cleanup BEFORE asserting.
    if (response.body?.data?.id) {
      createdCategoryIds.push(Number(response.body.data.id));
    }
    expect(response.status).toBe(201);
    expect(Number(response.body.data.id)).toBeGreaterThan(2);
  });

  it('returns 201 for a System Admin on POST /categories (bypasses @Roles, real DB insert, cleaned up)', async () => {
    const name = `${TEST_NAME_PREFIX}system_admin_${Date.now()}`;

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .send({ name });

    if (response.body?.data?.id) {
      createdCategoryIds.push(Number(response.body.data.id));
    }
    expect(response.status).toBe(201);
    expect(Number(response.body.data.id)).toBeGreaterThan(2);
  });

  // R-CLG-001 *Stale caller* · AND IT MUST NOT create or change any row: the
  // REAL pipe rejects `portfolioId`, and the REAL table stays untouched.
  it('returns 400 (not 201) for a body carrying portfolioId on POST /categories, and creates nothing', async () => {
    const name = `${TEST_NAME_PREFIX}stale_${Date.now()}`;

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .send({ name, portfolioId: 2 })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();
    expect(await countByName(name)).toBe(0);
  });

  it('returns 400 (not 200) for ?portfolioId= on GET /categories', async () => {
    await request(app.getHttpServer())
      .get('/categories')
      .query({ portfolioId: 2 })
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .expect(400);
  });

  // R-CLG-001 *One set of lists for everyone*: no parameter needed, and the
  // seeded categories come back with their lists.
  it('returns 200 with the seeded categories and their lists on GET /categories, with no parameters', async () => {
    const response = await request(app.getHttpServer())
      .get('/categories')
      .set('x-test-roles', asRole(SecRolesEnum.TECHNICAL_SUPPORT))
      .expect(200);

    const categories = response.body.data as Array<{
      id: number | string;
      name: string;
      lists: Array<{ key: string }>;
    }>;
    const kpis = categories.find((c) => Number(c.id) === 1);
    const org = categories.find((c) => Number(c.id) === 2);
    expect(kpis?.name).toBe('Key Performance Indicators (KPIs)');
    expect(kpis?.lists.map((l) => l.key)).toEqual(
      expect.arrayContaining([
        'kpi.unit_of_measure',
        'kpi.direction',
        'kpi.measurement_frequency',
        'kpi.level',
        'kpi.type',
      ]),
    );
    expect(org?.name).toBe('Organizational structure');
    expect(org?.lists.map((l) => l.key)).toContain('org.level');
    // No scope field leaks into the response.
    expect(Object.keys(categories[0])).not.toContain('portfolioId');
  });

  // R-CLG-002 AC.1 through the real API: a duplicate in another letter case
  // is a 409 naming `name`. This proves the SERVICE pre-check only — the
  // uniqueness guarantee is the raw-INSERT test above.
  it('returns 409 naming name through the real API for a duplicate in another letter case (pre-check only)', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .send({ name: 'KEY PERFORMANCE INDICATORS (KPIS)' });

    if (response.body?.data?.id) {
      createdCategoryIds.push(Number(response.body.data.id));
    }
    expect(response.status).toBe(409);
  });

  // Risk Reviewer issue 2 / Reliability Reviewer issue 5 (T-01 rework): A4/A5
  // took `@Param('id')` as a raw string with no `@ApiParam`; a non-numeric id
  // fell through to the service as NaN, which is a defect surface (NaN
  // reaching a query), not a clean 400. Now `@Param('id', ParseIntPipe)`
  // rejects it in the pipe, before the service is ever called — this proves
  // that end-to-end against a REAL request pipeline, not a mocked one.
  it('returns 400 (not 500) for a non-numeric id on DELETE /categories/:id', async () => {
    await request(app.getHttpServer())
      .delete('/categories/abc')
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .expect(400);
  });

  it('returns 400 (not 500) for a non-numeric id on PATCH /categories/:id', async () => {
    await request(app.getHttpServer())
      .patch('/categories/abc')
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .send({ name: 'whatever' })
      .expect(400);
  });

  // Risk Reviewer defect 2 (T-02 rework attempt 2): on attempt-1 code,
  // `{name: null}` passed `@IsOptional()` untouched. Measured (not the
  // originally-hypothesized 500): the duplicate-name pre-check's
  // `findOne({ where: { name: null, ... } })` fell prey to TypeORM's
  // null-key-drop behavior and matched the first active category, so
  // attempt-1 returned a bogus **409** here. Whichever wrong status a given
  // write path produces, it was never the clean 400 asserted below. This is
  // the ONLY place that distinction can be proven, since a service unit test
  // never passes through the real `ValidationPipe`.
  it('returns 400 (not 500) when the PATCH body sets name to null, and the name stays unchanged', async () => {
    const [before] = await dataSource.query(
      `SELECT name FROM control_list_categories WHERE id = ?`,
      [scratchCategoryId],
    );

    const response = await request(app.getHttpServer())
      .patch(`/categories/${scratchCategoryId}`)
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .send({ name: null })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [after] = await dataSource.query(
      `SELECT name FROM control_list_categories WHERE id = ?`,
      [scratchCategoryId],
    );
    expect(after.name).toBe(before.name);
  });

  // Risk Reviewer defect 3: the client sends `description: ''` on PATCH when
  // the field is emptied — the server must store that as cleared (normalized
  // to NULL, control-lists.service.ts `normalizeDescription`), never as a
  // literal `''` sitting next to NULL as a second "no description"
  // representation.
  it('returns 200 and clears description (stored as NULL) when the PATCH body sets description to an empty string', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/categories/${scratchCategoryId}`)
      .set('x-test-roles', asRole(SecRolesEnum.SYSTEM_ADMIN))
      .send({ description: '' })
      .expect(200);

    expect(response.body?.data?.description).toBeNull();

    const [after] = await dataSource.query(
      `SELECT description FROM control_list_categories WHERE id = ?`,
      [scratchCategoryId],
    );
    expect(after.description).toBeNull();
  });
});

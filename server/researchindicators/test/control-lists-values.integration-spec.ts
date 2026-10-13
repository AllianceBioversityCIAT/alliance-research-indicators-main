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

/**
 * Control Lists — values against a REAL MySQL connection
 * (docs/specs/changes/control-lists-global-scope, T-01; the original T-03
 * cases of docs/specs/institutional-performance/control-lists are kept):
 * the read-only permanent ID (D-CTL-14, falsifier 2), the list-has-values
 * delete block (forward pointer from T-02), and the real DB unique-index
 * backstop (P-4 disqualifier: "a uniqueness fixture must differ in letter
 * case, not only id").
 *
 * R-CLG-008 on A10/A12: a Technical Support token creates a value (201), a
 * Center Admin token is denied (403) by the REAL `RolesGuard` and nothing is
 * written.
 *
 * Evidence DB: the requester's local database `ari_local_mysql`,
 * 127.0.0.1:3306/stardb. `ARI_TEST_MYSQL_*` resolve there (printed below) —
 * NOT a disposable schema. This suite assumes the control-list migrations
 * (`1790900000000-1790900000002`) have been EXECUTED against this DB, so the
 * seeded `kpi.direction` list and its `DIR-01` value (R-CTL-010) are present
 * — the "real DB check" (disqualifier P-4) needs a row that genuinely exists,
 * not a scratch fixture, to prove the unique index is case-insensitive. Every
 * row THIS file creates (one scratch category/list/value, the values created
 * through the API) sits ABOVE the seeded id ranges (categories 1-2, lists
 * 1-6, values 1-23) and is deleted in `afterAll`. This suite NEVER updates or
 * deletes a seeded row; the seeded `DIR-01` row is only read, or the target of
 * an INSERT that must fail.
 *
 * Scope note (KZ-017): same as the lists/categories integration suites — a
 * test-only middleware stands in for `JwtMiddleware`; this does not reach
 * `ResponseInterceptor` / `GlobalExceptions` or Swagger.
 */
describe('Control Lists — values, roles, read-only id and DB uniqueness against real MySQL (T-01)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let kpiDirectionListId: number;
  let scratchCategoryId: number;
  let scratchListId: number;
  let scratchValueId: number;
  // Rework attempt 2 (Leader decision A10): values created by the new
  // empty/null-code-proposal tests below, against `scratchListId`
  // (code_prefix 'SCR') — cleaned up in `afterAll` alongside the other
  // scratch rows.
  const proposedValueIds: number[] = [];
  // Values created by the role-matrix tests (A10 as Technical Support / System
  // Admin), against the same scratch list.
  const roleValueIds: number[] = [];

  const TEST_PREFIX = '__t03_itest__';

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-values.integration-spec] resolved DB target: ${host}:${port}/${database}`,
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

    const [kpiDirection] = await dataSource.query(
      `SELECT id FROM control_lists WHERE list_key = 'kpi.direction' LIMIT 1`,
    );
    if (!kpiDirection) {
      throw new Error(
        'The seeded kpi.direction list was not found — this suite requires ' +
          '1790900000001-createControlLists.ts to already be applied.',
      );
    }
    kpiDirectionListId = Number(kpiDirection.id);

    const [dir01] = await dataSource.query(
      `SELECT id FROM control_list_values WHERE list_id = ? AND code = 'DIR-01' LIMIT 1`,
      [kpiDirectionListId],
    );
    if (!dir01) {
      throw new Error(
        'The seeded DIR-01 value was not found — this suite requires ' +
          '1790900000002-createControlListValues.ts to already be applied.',
      );
    }

    // Scratch category + list + value, inserted directly (this suite is
    // about A11/A8 behaviour, not category/list/value creation).
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

    const valueInsert = await dataSource.query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, ?, ?, 1, 1, NOW())`,
      [scratchListId, `${TEST_PREFIX}code`, `${TEST_PREFIX}value`],
    );
    scratchValueId = Number(valueInsert.insertId);

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
        // providers are registered in this suite, so every inUse stays 0 —
        // the real in-use-blocks-delete path is exercised by
        // control-lists-usage.integration-spec.ts.
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
    for (const id of [...proposedValueIds, ...roleValueIds]) {
      await dataSource.query(
        `DELETE FROM control_list_values WHERE id = ? AND id > 23`,
        [id],
      );
    }
    if (scratchValueId) {
      await dataSource.query(
        `DELETE FROM control_list_values WHERE id = ? AND id > 23`,
        [scratchValueId],
      );
    }
    if (scratchListId) {
      await dataSource.query(
        `DELETE FROM control_list_values WHERE list_id = ? AND id > 23`,
        [scratchListId],
      );
      await dataSource.query(
        `DELETE FROM control_lists WHERE id = ? AND id > 6`,
        [scratchListId],
      );
    }
    if (scratchCategoryId) {
      await dataSource.query(
        `DELETE FROM control_list_categories WHERE id = ? AND id > 2`,
        [scratchCategoryId],
      );
    }
    await dataSource.query(
      `DELETE FROM control_list_values WHERE code LIKE '${TEST_PREFIX}%' AND id > 23`,
    );
    await dataSource.query(
      `DELETE FROM control_lists WHERE name LIKE '${TEST_PREFIX}%' AND id > 6`,
    );
    await dataSource.query(
      `DELETE FROM control_list_categories WHERE name LIKE '${TEST_PREFIX}%' AND id > 2`,
    );
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('declares @Roles(SYSTEM_ADMIN, TECHNICAL_SUPPORT) on DELETE /values/:id (A12, metadata sanity check)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ControlListsController.prototype.removeValue,
    );
    expect(roles).toEqual([
      SecRolesEnum.SYSTEM_ADMIN,
      SecRolesEnum.TECHNICAL_SUPPORT,
    ]);
  });

  // R-CLG-008 *Technical Support allowed*: a Technical Support token creates
  // a value through the REAL guard and the REAL database (201), and a System
  // Admin bypasses the role list.
  it.each([
    ['TECHNICAL_SUPPORT', 'ts', SecRolesEnum.TECHNICAL_SUPPORT],
    ['SYSTEM_ADMIN', 'sa', SecRolesEnum.SYSTEM_ADMIN],
  ])(
    'returns 201 for %s on POST /lists/:id/values (A10)',
    async (name, tag, role) => {
      // The code stays within the column's 30 characters and outside the
      // proposal pattern of the scratch list (SCR-nn), so the proposal tests
      // below keep their deterministic SCR-01 / SCR-02.
      const response = await request(app.getHttpServer())
        .post(`/lists/${scratchListId}/values`)
        .set('x-test-roles', JSON.stringify([role]))
        .send({
          code: `${TEST_PREFIX}r_${tag}`,
          value: `${TEST_PREFIX}role_${name}_${Date.now()}`,
        });

      // Capture the id for cleanup BEFORE asserting.
      if (response.body?.data?.id) {
        roleValueIds.push(Number(response.body.data.id));
      }
      expect(response.status).toBe(201);
      expect(Number(response.body.data.listId)).toBe(scratchListId);
      expect(Number(response.body.data.id)).toBeGreaterThan(23);
    },
  );

  // R-CLG-008 *Center Admin denied* · BUT must NOT change any data, on the
  // value writes A10 (create), A11 (update) and A12 (delete).
  it('returns 403 for a Center Admin on A10, A11 and A12, and changes nothing', async () => {
    const code = `${TEST_PREFIX}center_admin_code`;
    const centerAdmin = JSON.stringify([SecRolesEnum.CENTER_ADMIN]);
    const [before] = await dataSource.query(
      `SELECT value, code FROM control_list_values WHERE id = ?`,
      [scratchValueId],
    );

    await request(app.getHttpServer())
      .post(`/lists/${scratchListId}/values`)
      .set('x-test-roles', centerAdmin)
      .send({ code, value: `${TEST_PREFIX}center_admin_value` })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/values/${scratchValueId}`)
      .set('x-test-roles', centerAdmin)
      .send({ value: `${TEST_PREFIX}center_admin_rename` })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/values/${scratchValueId}`)
      .set('x-test-roles', centerAdmin)
      .expect(403);

    const created = await dataSource.query(
      `SELECT id FROM control_list_values WHERE code = ?`,
      [code],
    );
    expect(created).toHaveLength(0);
    const [after] = await dataSource.query(
      `SELECT value, code FROM control_list_values WHERE id = ?`,
      [scratchValueId],
    );
    expect(after).toEqual(before);
  });

  // Falsifier 2 (tasks.md T-03) / D-CTL-14: whitelisting `id` in the update
  // DTO would turn this 400 into a 200. Like T-02's listKey falsifiers, this
  // is a pipe-level concern (`forbidNonWhitelisted`) that a mocked
  // controller/service unit test cannot exercise — only a real
  // `ValidationPipe` can (see `update-control-list-value.dto.spec.ts` for
  // the pipe-in-isolation version of the same proof).
  it('returns 400 (not 200) when the PATCH body includes id, and the id stays unchanged', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/values/${scratchValueId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({ id: 999999, value: 'Renamed' })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [after] = await dataSource.query(
      `SELECT id, value FROM control_list_values WHERE id = ?`,
      [scratchValueId],
    );
    expect(Number(after.id)).toBe(scratchValueId);
    expect(after.value).not.toBe('Renamed');
  });

  it('returns 200 and updates the value when the PATCH body omits id', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/values/${scratchValueId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({ value: `${TEST_PREFIX}renamed` })
      .expect(200);

    expect(response.body?.data?.value).toBe(`${TEST_PREFIX}renamed`);
    // The raw TypeORM connection in this suite returns a bigint PK as a
    // numeric string (driver default); the real app's orm.config.ts sets
    // bigNumberStrings: false, so production returns a JS number instead —
    // this assertion accepts either shape (same note as the lists suite).
    expect(Number(response.body?.data?.id)).toBe(scratchValueId);
  });

  // Forward pointer (T-02 execution.md): a list with values cannot be
  // deleted — 409, nothing removed.
  it('returns 409 (not 200) when deleting a list that still has values, and removes nothing', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/lists/${scratchListId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .expect(409);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [listRow] = await dataSource.query(
      `SELECT id FROM control_lists WHERE id = ?`,
      [scratchListId],
    );
    const [valueRow] = await dataSource.query(
      `SELECT id FROM control_list_values WHERE id = ?`,
      [scratchValueId],
    );
    expect(listRow).toBeDefined();
    expect(valueRow).toBeDefined();
  });

  // P-4 disqualifier (tasks.md T-03): "a uniqueness fixture differing only
  // in id, not in letter case, cannot prove case-insensitivity." This
  // inserts a LOWER-CASE collision directly against the REAL, SEEDED
  // DIR-01 row (R-CTL-010) — not a scratch fixture — so it proves the
  // unique index itself is case-insensitive (the explicit
  // utf8mb4_unicode_ci collation, design §3), independent of the service's
  // own pre-check. The insert is expected to throw, so nothing is written.
  it('rejects a raw INSERT of "dir-01" into the real seeded kpi.direction list (unique index, P-4)', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
         VALUES (?, 'dir-01', ?, 99, 1, NOW())`,
        [kpiDirectionListId, `${TEST_PREFIX}dir01_collision_${Date.now()}`],
      ),
    ).rejects.toThrow();

    const rows = await dataSource.query(
      `SELECT id FROM control_list_values WHERE list_id = ? AND LOWER(code) = 'dir-01'`,
      [kpiDirectionListId],
    );
    // Only the original seeded DIR-01 row — the lower-case insert above
    // must not have landed a second row.
    expect(rows).toHaveLength(1);
  });

  // Complements the raw-SQL check above by proving the SAME case-insensitive
  // collision end to end through the real API (ValidationPipe → service →
  // DB), against the real seeded list.
  it('returns 409 through the real API when creating "dir-01" in the real seeded kpi.direction list', async () => {
    const response = await request(app.getHttpServer())
      .post(`/lists/${kpiDirectionListId}/values`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({
        code: 'dir-01',
        value: `${TEST_PREFIX}api_collision_${Date.now()}`,
      })
      .expect(409);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const rows = await dataSource.query(
      `SELECT id FROM control_list_values WHERE list_id = ? AND LOWER(code) = 'dir-01'`,
      [kpiDirectionListId],
    );
    expect(rows).toHaveLength(1);
  });

  // Rework attempt 2 (Reviewer risk-lens FAIL, Leader decision A10):
  // attempt-1 code only proposed a code when `dto.code === undefined` —
  // `''` and a literal `null` both skipped the proposal and reached the
  // NOT NULL `code` column as-is (observed by the Reviewer as a stored
  // `''`, a raw 500, or a false 409). Against `scratchListId`
  // (code_prefix 'SCR', no pre-existing SCR-formatted codes), so the first
  // proposal is deterministically 'SCR-01' and the second 'SCR-02'.
  it('returns 201 with a proposed code when the body sends code: "" (A10, rework attempt 2)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/lists/${scratchListId}/values`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({ code: '', value: `${TEST_PREFIX}propose_empty_${Date.now()}` })
      .expect(201);

    // Cleanup-id capture happens BEFORE the assertion below, deliberately —
    // if this ever regresses and the assertion throws, the inserted row
    // must still be queued for the afterAll cleanup (verified during the
    // T-03 rework attempt 2 K-004 red-check: reverting the service fix and
    // re-running this exact test DOES insert a real row with code: '',
    // which only the pre-assertion push correctly queues for deletion).
    proposedValueIds.push(Number(response.body.data.id));
    expect(response.body?.data?.code).toBe('SCR-01');
  });

  it('returns 201 with a proposed code when the body sends code: null (A10, rework attempt 2)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/lists/${scratchListId}/values`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({ code: null, value: `${TEST_PREFIX}propose_null_${Date.now()}` })
      .expect(201);

    // Same defensive ordering as the code:'' case above.
    proposedValueIds.push(Number(response.body.data.id));
    expect(response.body?.data?.code).toBe('SCR-02');
  });

  // Leader-adjudicated forward pointer (T-03 rework attempt 2):
  // normalizeDescription() also runs on CREATE — this is the one
  // integration case for A10 the Leader's brief asked for, proving the
  // real DB column ends up NULL (not a stored ''), through the real
  // ValidationPipe → service → DB path.
  it('stores description as NULL (not "") when the body sends description: "" (A10, rework attempt 2)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/lists/${scratchListId}/values`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({
        value: `${TEST_PREFIX}propose_desc_${Date.now()}`,
        description: '',
      })
      .expect(201);

    proposedValueIds.push(Number(response.body.data.id));
    expect(response.body?.data?.description).toBeNull();

    const [row] = await dataSource.query(
      `SELECT description FROM control_list_values WHERE id = ?`,
      [response.body.data.id],
    );
    expect(row.description).toBeNull();
  });

  // Rework attempt 2 (Leader decision A11): unlike A10 above, an empty code
  // on UPDATE must 400, never blank the stored code.
  it('returns 400 (not 200) when the PATCH body sends code: "" (A11, rework attempt 2)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/values/${scratchValueId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({ code: '' })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [after] = await dataSource.query(
      `SELECT code FROM control_list_values WHERE id = ?`,
      [scratchValueId],
    );
    expect(after.code).toBe(`${TEST_PREFIX}code`);
  });

  it('returns 400 (not 200) when the PATCH body sends displayOrder: null (A11, rework attempt 2)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/values/${scratchValueId}`)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]))
      .send({ displayOrder: null })
      .expect(400);

    expect(response.body?.message ?? response.body?.errors).toBeDefined();

    const [after] = await dataSource.query(
      `SELECT display_order FROM control_list_values WHERE id = ?`,
      [scratchValueId],
    );
    expect(Number(after.display_order)).toBe(1);
  });
});

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
import { PortfoliosService } from '../src/domain/entities/portfolios/portfolios.service';
import { PortfoliosRepository } from '../src/domain/entities/portfolios/repositories/portfolios.repository';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { RolesGuard, ROLES_KEY } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../src/domain/shared/utils/results.util';
import { PortfolioUtil } from '../src/domain/shared/utils/portfolio.util';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';

/**
 * T-01 (docs/specs/institutional-performance/control-lists) — server
 * integration, A3 roles behaviour against a REAL MySQL connection.
 *
 * Evidence DB (requester, 2026-10-01): the user's local development
 * database `ari_local_mysql`, 127.0.0.1:3306/stardb. `ARI_TEST_MYSQL_*`
 * resolve there (verified by dotenv at run time, printed below) — this is
 * NOT a disposable schema, so every row this file creates is deleted in
 * `afterAll` and no existing table is altered.
 *
 * Scope note (KZ-017): this suite boots a real Nest application with the
 * REAL `ControlListsController`, `ControlListsService`, `RolesGuard` and a
 * REAL TypeORM connection to the resolved DB above — so a request genuinely
 * reaches MySQL and a 403 genuinely comes from `RolesGuard` evaluating
 * `@Roles` metadata against `request.user.roles`. It does NOT reach: the
 * real `JwtMiddleware` (a test middleware stands in, setting `request.user`
 * from a test-only header exactly as `impersonation.controller.spec.ts`
 * does — a ROAR-issued JWT is out of local reach), the global
 * `ResponseInterceptor` / `GlobalExceptions` envelope wiring, or Swagger
 * generation — those are e2e/manual concerns, not this file's.
 */
describe('Control Lists — categories, roles against real MySQL (T-01)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let portfolio2Id: number;
  const createdCategoryIds: number[] = [];

  const TEST_NAME_PREFIX = '__t01_itest_category__';

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

    // Portfolio 2 resolved by years, never by a literal id (P-6).
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
    // mysql2 can return a bigint column as a string depending on driver
    // config; the DTO's @IsInt() needs a real JS number in the JSON body.
    portfolio2Id = Number(portfolio2.id);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ControlListsController],
      providers: [
        ControlListsService,
        {
          provide: ControlListCategoryRepository,
          useFactory: () => new ControlListCategoryRepository(dataSource),
        },
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

    app = moduleRef.createNestApplication();
    // Stands in for JwtMiddleware (out of this spec's reach — KZ-017), same
    // technique as impersonation.controller.spec.ts: sets req.user from a
    // test-only header so the REAL RolesGuard sees a REAL role array.
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
    if (createdCategoryIds.length > 0) {
      await dataSource.query(
        `DELETE FROM control_list_categories WHERE id IN (${createdCategoryIds.join(',')})`,
      );
    }
    // Belt-and-braces: also sweep by name prefix in case an assertion threw
    // before a created id was recorded.
    await dataSource.query(
      `DELETE FROM control_list_categories WHERE name LIKE '${TEST_NAME_PREFIX}%'`,
    );
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('declares @Roles(CENTER_ADMIN, SYSTEM_ADMIN) on POST /categories (metadata sanity check, not the sole proof)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ControlListsController.prototype.createCategory,
    );
    expect(roles).toEqual([
      SecRolesEnum.CENTER_ADMIN,
      SecRolesEnum.SYSTEM_ADMIN,
    ]);
  });

  it('returns 403 for a Contributor with a valid (authenticated) token on POST /categories, and creates nothing', async () => {
    const name = `${TEST_NAME_PREFIX}contributor_${Date.now()}`;

    await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]))
      .send({ portfolioId: portfolio2Id, name })
      .expect(403);

    const rows = await dataSource.query(
      `SELECT id FROM control_list_categories WHERE name = ?`,
      [name],
    );
    expect(rows).toHaveLength(0);
  });

  it('returns 201 for a Center Admin on POST /categories (real DB insert, cleaned up)', async () => {
    const name = `${TEST_NAME_PREFIX}center_admin_${Date.now()}`;

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ portfolioId: portfolio2Id, name })
      .expect(201);

    // The raw TypeORM connection in this suite returns a bigint PK as a
    // numeric string (driver default); the real app's orm.config.ts sets
    // bigNumberStrings: false, so production returns a JS number instead —
    // this assertion accepts either shape.
    const createdId = response.body?.data?.id;
    expect(Number.isInteger(Number(createdId))).toBe(true);
    expect(Number(createdId)).toBeGreaterThan(0);
    createdCategoryIds.push(createdId);
  });

  it('returns 201 for a System Admin on POST /categories (bypasses @Roles, real DB insert, cleaned up)', async () => {
    const name = `${TEST_NAME_PREFIX}system_admin_${Date.now()}`;

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.SYSTEM_ADMIN]))
      .send({ portfolioId: portfolio2Id, name })
      .expect(201);

    const createdId = response.body?.data?.id;
    expect(Number.isInteger(Number(createdId))).toBe(true);
    expect(Number(createdId)).toBeGreaterThan(0);
    createdCategoryIds.push(createdId);
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
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .expect(400);
  });

  it('returns 400 (not 500) for a non-numeric id on PATCH /categories/:id', async () => {
    await request(app.getHttpServer())
      .patch('/categories/abc')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .send({ name: 'whatever' })
      .expect(400);
  });
});

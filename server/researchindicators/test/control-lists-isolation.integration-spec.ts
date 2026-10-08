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
 * Follow-up R-1 / R-5 (docs/specs/institutional-performance/control-lists,
 * validation-report.md) — server integration against the real local dev DB
 * (`ARI_TEST_MYSQL_*`):
 *
 *  - R-CTL-001 "must NOT return any category, list or value of another
 *    portfolio" + AC.2 "a value created under a list of Portfolio 2 cannot
 *    be read under Portfolio 1" (A1, A9, A13).
 *  - R-CTL-003 "Same key in two portfolios": two portfolios hold a list with
 *    the SAME list_key; each portfolio reads its own list.
 *  - R-CTL-007 "Allowed roles": SYSTEM_ADMIN and CENTER_ADMIN each create a
 *    value (A10 -> 201).
 *
 * Every row is scratch, tracked by id and deleted by id in `afterAll`
 * (try/finally); seeded and user rows are never modified.
 *
 * Scope note (KZ-017): a test-only middleware stands in for
 * `JwtMiddleware`; ResponseInterceptor / GlobalExceptions are not reached,
 * the controller's own `{ data }` wrapper is read via `body.data`;
 * BIGINT ids arrive as strings over the wire, so ids are compared via Number().
 */
describe('Control Lists — cross-portfolio isolation and role matrix against real MySQL (R-1, R-5)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TEST_PREFIX = '__r1_iso__';
  const sharedKey = `${TEST_PREFIX}key_${Date.now()}`;

  interface Scratch {
    portfolioId: number;
    categoryId: number;
    listId: number;
    valueId: number;
    valueText: string;
  }
  let p2: Scratch;
  let p1: Scratch;
  const createdValueIds: number[] = [];
  // Recorded right after each INSERT, so a partial `insertScratch` failure
  // (e.g. the list INSERT fails after the category's) still leaves every
  // created row reachable by `afterAll`.
  const scratchCategoryIds: number[] = [];
  const scratchListIds: number[] = [];

  const insertScratch = async (portfolioId: number): Promise<Scratch> => {
    const category = await dataSource.query(
      `INSERT INTO control_list_categories (portfolio_id, name, display_order, is_active, created_at)
       VALUES (?, ?, 0, 1, NOW())`,
      [portfolioId, `${TEST_PREFIX}category_${portfolioId}_${Date.now()}`],
    );
    const categoryId = Number(category.insertId);
    scratchCategoryIds.push(categoryId);
    const list = await dataSource.query(
      `INSERT INTO control_lists (portfolio_id, category_id, list_key, name, code_prefix, is_system, is_active, created_at)
       VALUES (?, ?, ?, ?, 'ISO', 0, 1, NOW())`,
      [portfolioId, categoryId, sharedKey, `${TEST_PREFIX}list_${portfolioId}`],
    );
    const listId = Number(list.insertId);
    scratchListIds.push(listId);
    const valueText = `${TEST_PREFIX}value_${portfolioId}`;
    const value = await dataSource.query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, ?, ?, 1, 1, NOW())`,
      [listId, `ISO-P${portfolioId}`, valueText],
    );
    return {
      portfolioId,
      categoryId,
      listId,
      valueId: Number(value.insertId),
      valueText,
    };
  };

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-isolation.integration-spec] resolved DB target: ${host}:${port}/${database}`,
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
        'Portfolio 2 (start_year=2026, end_year=2030) was not found on the resolved DB.',
      );
    }
    const portfolio2Id = Number(portfolio2.id);
    const [other] = await dataSource.query(
      `SELECT id FROM portfolios WHERE id <> ? ORDER BY id LIMIT 1`,
      [portfolio2Id],
    );
    if (!other) {
      throw new Error(
        'No second portfolio (id <> Portfolio 2) exists on the resolved DB — ' +
          'cross-portfolio isolation cannot be proven without one.',
      );
    }

    p2 = await insertScratch(portfolio2Id);
    p1 = await insertScratch(Number(other.id));

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
    try {
      for (const id of createdValueIds) {
        await dataSource.query(`DELETE FROM control_list_values WHERE id = ?`, [
          id,
        ]);
      }
      for (const listId of scratchListIds) {
        // By this scratch list's own id: also sweeps any value an API call
        // attached to it, if its id was not captured.
        await dataSource.query(
          `DELETE FROM control_list_values WHERE list_id = ?`,
          [listId],
        );
        await dataSource.query(`DELETE FROM control_lists WHERE id = ?`, [
          listId,
        ]);
      }
      for (const categoryId of scratchCategoryIds) {
        await dataSource.query(
          `DELETE FROM control_list_categories WHERE id = ?`,
          [categoryId],
        );
      }
    } finally {
      if (app) await app.close();
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  const asAdmin = (req: request.Test) =>
    req.set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]));

  it('A1: each portfolio returns only its own scratch category and list (R-CTL-001, AC.2)', async () => {
    const r1 = await asAdmin(
      request(app.getHttpServer())
        .get('/categories')
        .query({ portfolioId: p1.portfolioId }),
    ).expect(200);
    const r2 = await asAdmin(
      request(app.getHttpServer())
        .get('/categories')
        .query({ portfolioId: p2.portfolioId }),
    ).expect(200);

    const ids1 = r1.body.data.map((c: { id: number | string }) => Number(c.id));
    const ids2 = r2.body.data.map((c: { id: number | string }) => Number(c.id));
    expect(ids1).toContain(p1.categoryId);
    expect(ids1).not.toContain(p2.categoryId);
    expect(ids2).toContain(p2.categoryId);
    expect(ids2).not.toContain(p1.categoryId);

    const listIds1 = r1.body.data.flatMap(
      (c: { lists: { id: number | string }[] }) =>
        c.lists.map((l) => Number(l.id)),
    );
    const listIds2 = r2.body.data.flatMap(
      (c: { lists: { id: number | string }[] }) =>
        c.lists.map((l) => Number(l.id)),
    );
    expect(listIds1).toContain(p1.listId);
    expect(listIds1).not.toContain(p2.listId);
    expect(listIds2).toContain(p2.listId);
    expect(listIds2).not.toContain(p1.listId);
  });

  it('A13: by-key with the SAME key returns each portfolio its own value only (R-CTL-003, AC.2)', async () => {
    const r1 = await asAdmin(
      request(app.getHttpServer())
        .get(`/by-key/${sharedKey}/values`)
        .query({ portfolioId: p1.portfolioId }),
    ).expect(200);
    const r2 = await asAdmin(
      request(app.getHttpServer())
        .get(`/by-key/${sharedKey}/values`)
        .query({ portfolioId: p2.portfolioId }),
    ).expect(200);

    expect(
      r1.body.data.map((v: { id: number | string }) => Number(v.id)),
    ).toEqual([p1.valueId]);
    expect(
      r2.body.data.map((v: { id: number | string }) => Number(v.id)),
    ).toEqual([p2.valueId]);
    expect(r1.body.data[0].value).toBe(p1.valueText);
    expect(r2.body.data[0].value).toBe(p2.valueText);
  });

  it('A9: each list returns only its own value', async () => {
    const r1 = await asAdmin(
      request(app.getHttpServer()).get(`/lists/${p1.listId}/values`),
    ).expect(200);
    const r2 = await asAdmin(
      request(app.getHttpServer()).get(`/lists/${p2.listId}/values`),
    ).expect(200);

    expect(
      r1.body.data.map((v: { id: number | string }) => Number(v.id)),
    ).toEqual([p1.valueId]);
    expect(
      r2.body.data.map((v: { id: number | string }) => Number(v.id)),
    ).toEqual([p2.valueId]);
  });

  it.each([
    ['SYSTEM_ADMIN', SecRolesEnum.SYSTEM_ADMIN],
    ['CENTER_ADMIN', SecRolesEnum.CENTER_ADMIN],
  ])('A10: %s creates a value -> 201 (R-CTL-007)', async (name, role) => {
    const response = await request(app.getHttpServer())
      .post(`/lists/${p2.listId}/values`)
      .set('x-test-roles', JSON.stringify([role]))
      .send({ value: `${TEST_PREFIX}role_${name}_${Date.now()}` });

    // Capture the id for cleanup BEFORE asserting.
    if (response.body?.data?.id)
      createdValueIds.push(Number(response.body.data.id));
    expect(response.status).toBe(201);
    expect(Number(response.body.data.listId)).toBe(p2.listId);
  });
});

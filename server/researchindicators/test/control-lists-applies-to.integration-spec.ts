import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { ContextIdFactory, Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ControlListsController } from '../src/domain/entities/control-lists/control-lists.controller';
import { ControlListsService } from '../src/domain/entities/control-lists/control-lists.service';
import { ControlListValueLookupService } from '../src/domain/entities/control-lists/control-list-value-lookup.service';
import { ControlListCategoryRepository } from '../src/domain/entities/control-lists/repositories/control-list-category.repository';
import { ControlListRepository } from '../src/domain/entities/control-lists/repositories/control-list.repository';
import { ControlListValueRepository } from '../src/domain/entities/control-lists/repositories/control-list-value.repository';
import { ControlListUsageRegistry } from '../src/domain/entities/control-lists/control-list-usage.registry';
import { Portfolio } from '../src/domain/entities/portfolios/entities/portfolio.entity';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { appliesToProviders } from './support/control-lists-providers';

/**
 * Control Lists — values applicable per portfolio ("Applies to") against a
 * REAL MySQL connection (docs/specs/changes/control-lists-global-scope, T-02,
 * R-CLG-009).
 *
 * WHY real SQL (KZ-001, KZ-017): the A13 portfolio filter is
 * `list AND (activeOnly) AND (NOT EXISTS link OR EXISTS link for the
 * portfolio)`. Whether that `OR` widens the surrounding `AND`s is a property of
 * the GENERATED SQL, and a mocked `QueryBuilder` cannot represent it — a test
 * on the call sequence passes just the same for `A AND B OR C` as for
 * `A AND (B OR C)`. So the filter is proven here, on a fixture that cannot be
 * satisfied by "no filter at all" and cannot be satisfied by an `OR` that
 * widens:
 *   - UNRESTRICTED values (no links), active AND inactive;
 *   - values restricted to P1, to P2 and to both, active AND inactive;
 *   - a P1-restricted value in a DIFFERENT list (the canary that leaks when the
 *     `OR` escapes the `list_id` condition).
 * A fixture where every value is unrestricted is disqualified by the task: it
 * cannot tell a filter from no filter.
 *
 * Also proven here, on the database: the link table's shape (composite key,
 * `ON DELETE CASCADE` to the value, `RESTRICT` to the portfolio, no audit
 * columns), seeded values apply to all (AC.3), the value write is
 * all-or-nothing (AC.5, with the portfolio validation BYPASSED so the link
 * insert itself fails on its foreign key), deleting a value removes its links,
 * a links-only PATCH stamps the value's audit fields (D-CLG-12), and a
 * deactivated linked portfolio is hidden on read and never read as "all"
 * (D-CLG-14).
 *
 * Evidence DB: the requester's local database `ari_local_mysql`,
 * 127.0.0.1:3306/stardb (`ARI_TEST_MYSQL_*`, printed below) - NOT a disposable
 * schema. This suite assumes migrations `1790900000000-1790900000003` have
 * been EXECUTED. Every row THIS file creates (one scratch category, three
 * scratch lists, their values and links) sits ABOVE the seeded id ranges
 * (categories 1-2, lists 1-6, values 1-23) and is deleted in `afterAll`
 * (links cascade with their values); it NEVER updates or deletes a seeded row.
 * It reads the two lowest-id portfolios, requires them to be active, and the
 * ONE test that deactivates one of them restores its original `is_active` in
 * a `finally` (and `afterAll` restores both again, idempotently).
 *
 * Scope note (KZ-017): like the other control-lists integration suites, a
 * test-only middleware stands in for `JwtMiddleware`, and `GlobalExceptions` /
 * `ResponseInterceptor` / Swagger are NOT mounted here (they are pinned at the
 * unit layer). A request that fails with a non-HTTP error is therefore a bare
 * `500` in this harness; the atomicity tests call the service directly so they
 * can assert the database error itself.
 */
describe('Control Lists — Applies to: filter, writes, atomicity and soft-deleted portfolios against real MySQL (T-02, R-CLG-009)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let moduleRef: TestingModule;

  // Unique to this suite: the sibling suites clean up by `LIKE '<prefix>%'`
  // (`__t01_itest_category__`, `__t02_itest__`, `__t03_itest__`,
  // `__t04_itest__`), and jest runs the suites in parallel against one DB, so a
  // shared prefix would let one suite delete (or be blocked by) another's rows.
  const TEST_PREFIX = '__ap_itest__';
  const AUTH_TS = JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]);
  const AUTH_CONTRIBUTOR = JSON.stringify([SecRolesEnum.CONTRIBUTOR]);

  let p1: number;
  let p2: number;
  const originalIsActive = new Map<number, number>();

  let scratchCategoryId: number;
  let filterListId: number;
  let filterListKey: string;
  let otherListId: number;
  let writeListId: number;

  // Fixture keys, in the display order they are created in (1..7).
  const FIXTURE_KEYS = [
    'allActive',
    'allInactive',
    'p2Active',
    'p2Inactive',
    'p1Active',
    'p1Inactive',
    'bothActive',
  ] as const;
  type FixtureKey = (typeof FIXTURE_KEYS)[number];
  const fixture = {} as Record<FixtureKey, number>;
  let otherListP1ValueId: number;

  let codeSeq = 0;
  const nextCode = (tag: string) => `${TEST_PREFIX}${tag}_${++codeSeq}`;

  const insertValue = async (
    listId: number,
    code: string,
    opts: { active?: boolean; order?: number; name?: string } = {},
  ): Promise<number> => {
    const inserted = await dataSource.query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        listId,
        code,
        opts.name ?? `${code}_name`,
        opts.order ?? 0,
        opts.active === false ? 0 : 1,
      ],
    );
    return Number(inserted.insertId);
  };

  const link = (valueId: number, portfolioId: number) =>
    dataSource.query(
      `INSERT INTO control_list_value_portfolios (value_id, portfolio_id) VALUES (?, ?)`,
      [valueId, portfolioId],
    );

  const linkedPortfolioIds = async (valueId: number): Promise<number[]> => {
    const rows = await dataSource.query(
      `SELECT portfolio_id FROM control_list_value_portfolios WHERE value_id = ? ORDER BY portfolio_id`,
      [valueId],
    );
    return rows.map((row: { portfolio_id: string | number }) =>
      Number(row.portfolio_id),
    );
  };

  // `updated_at = updated_at` keeps the portfolio's own audit timestamp: this
  // suite is a guest on a shared local row and must not leave a trace on it.
  const setPortfolioActive = (id: number, active: number) =>
    dataSource.query(
      `UPDATE portfolios SET is_active = ?, updated_at = updated_at WHERE id = ?`,
      [active, id],
    );

  // A fresh Nest module over the same connection. `portfolioRepository`
  // overrides the READ handle on portfolios only (used by the atomicity tests
  // to bypass the "active portfolio" validation).
  const buildModule = (portfolioRepository?: unknown) => {
    const defaults = appliesToProviders(dataSource);
    const providers = portfolioRepository
      ? [
          ...defaults.filter(
            (provider) => provider.provide !== getRepositoryToken(Portfolio),
          ),
          {
            provide: getRepositoryToken(Portfolio),
            useValue: portfolioRepository,
          },
        ]
      : defaults;

    return Test.createTestingModule({
      controllers: [ControlListsController],
      providers: [
        ControlListsService,
        ControlListValueLookupService,
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
        ...providers,
        CurrentUserUtil,
        ControlListUsageRegistry,
        Reflector,
        RolesGuard,
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();
  };

  const idsOf = (body: { data: Array<{ id: number | string }> }): number[] =>
    body.data.map((value) => Number(value.id));

  const readByKey = (query: Record<string, string | number> = {}) =>
    request(app.getHttpServer())
      .get(`/by-key/${filterListKey}/values`)
      .set('x-test-roles', AUTH_CONTRIBUTOR)
      .query(query);

  beforeAll(async () => {
    const host = process.env.ARI_TEST_MYSQL_HOST;
    const port = parseInt(process.env.ARI_TEST_MYSQL_PORT, 10);
    const database = process.env.ARI_TEST_MYSQL_NAME;
    console.log(
      `[control-lists-applies-to.integration-spec] resolved DB target: ${host}:${port}/${database}`,
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
      // ONE connection: any query a value write issues OUTSIDE its transaction
      // while the transaction holds that connection can never be served and
      // times the test out instead of silently escaping the unit of work.
      extra: { connectionLimit: 1 },
    });
    await dataSource.initialize();

    const [table] = await dataSource.query(
      `SHOW TABLES LIKE 'control_list_value_portfolios'`,
    );
    if (!table) {
      throw new Error(
        'control_list_value_portfolios does not exist - this suite requires ' +
          '1790900000003-createControlListValuePortfolios.ts to already be applied.',
      );
    }

    // The two lowest-id portfolios; both must be active for the fixture to be
    // meaningful. Their original is_active is recorded and restored.
    const portfolios = await dataSource.query(
      `SELECT id, is_active FROM portfolios ORDER BY id LIMIT 2`,
    );
    if (portfolios.length < 2) {
      throw new Error('This suite needs at least two portfolios (P1 and P2).');
    }
    for (const row of portfolios) {
      originalIsActive.set(Number(row.id), Number(row.is_active));
    }
    p1 = Number(portfolios[0].id);
    p2 = Number(portfolios[1].id);
    if (originalIsActive.get(p1) !== 1 || originalIsActive.get(p2) !== 1) {
      throw new Error(
        `This suite needs portfolios ${p1} and ${p2} to start active (found ` +
          `${originalIsActive.get(p1)} / ${originalIsActive.get(p2)}); it will not run against a half-restored DB.`,
      );
    }

    const categoryInsert = await dataSource.query(
      `INSERT INTO control_list_categories (name, display_order, is_active, created_at)
       VALUES (?, 0, 1, NOW())`,
      [`${TEST_PREFIX}category_${Date.now()}`],
    );
    scratchCategoryId = Number(categoryInsert.insertId);

    const makeList = async (tag: string): Promise<[number, string]> => {
      const key = `${TEST_PREFIX}${tag}_${Date.now()}`;
      const inserted = await dataSource.query(
        `INSERT INTO control_lists (category_id, list_key, name, code_prefix, is_system, is_active, created_at)
         VALUES (?, ?, ?, 'TWO', 0, 1, NOW())`,
        [scratchCategoryId, key, `${TEST_PREFIX}${tag}`],
      );
      return [Number(inserted.insertId), key];
    };
    [filterListId, filterListKey] = await makeList('filter');
    [otherListId] = await makeList('other');
    [writeListId] = await makeList('write');

    // The filter fixture (see the suite header): unrestricted and restricted
    // values, active and inactive, in display order 1..7.
    const spec: Array<[FixtureKey, boolean, number[]]> = [
      ['allActive', true, []],
      ['allInactive', false, []],
      ['p2Active', true, [p2]],
      ['p2Inactive', false, [p2]],
      ['p1Active', true, [p1]],
      ['p1Inactive', false, [p1]],
      ['bothActive', true, [p1, p2]],
    ];
    for (const [index, [key, active, portfolioIds]] of spec.entries()) {
      fixture[key] = await insertValue(filterListId, nextCode(key), {
        active,
        order: index + 1,
      });
      for (const portfolioId of portfolioIds) {
        await link(fixture[key], portfolioId);
      }
    }
    // The canary: a P1-restricted, ACTIVE value of ANOTHER list.
    otherListP1ValueId = await insertValue(otherListId, nextCode('other'), {
      order: 1,
    });
    await link(otherListP1ValueId, p1);

    moduleRef = await buildModule();
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
    try {
      // Restore the portfolios FIRST: nothing else in this file may leave one
      // of them inactive.
      if (dataSource?.isInitialized) {
        for (const [id, active] of originalIsActive) {
          await setPortfolioActive(id, active);
        }
        // Links cascade with their values. Every delete is bounded above the
        // seeded ranges.
        await dataSource.query(
          `DELETE FROM control_list_values WHERE code LIKE '${TEST_PREFIX}%' AND id > 23`,
        );
        await dataSource.query(
          `DELETE FROM control_lists WHERE name LIKE '${TEST_PREFIX}%' AND id > 6`,
        );
        await dataSource.query(
          `DELETE FROM control_list_categories WHERE name LIKE '${TEST_PREFIX}%' AND id > 2`,
        );
      }
    } finally {
      if (app) await app.close();
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  // -------------------------------------------------------------------------
  // The table itself (R-CLG-006 AC.2, D-CLG-12, design §3)
  // -------------------------------------------------------------------------
  describe('the link table', () => {
    it('exists (SHOW TABLES LIKE returns one row)', async () => {
      const rows = await dataSource.query(
        `SHOW TABLES LIKE 'control_list_value_portfolios'`,
      );
      expect(rows).toHaveLength(1);
    });

    it('has exactly the two key columns - no audit columns (D-CLG-12)', async () => {
      const columns = await dataSource.query(
        `SHOW COLUMNS FROM control_list_value_portfolios`,
      );
      expect(columns.map((c: { Field: string }) => c.Field)).toEqual([
        'value_id',
        'portfolio_id',
      ]);
    });

    it('has the composite primary key (value_id, portfolio_id) and the portfolio index', async () => {
      const primary = await dataSource.query(
        `SHOW INDEX FROM control_list_value_portfolios WHERE Key_name = 'PRIMARY'`,
      );
      expect(
        primary
          .sort(
            (a: { Seq_in_index: number }, b: { Seq_in_index: number }) =>
              a.Seq_in_index - b.Seq_in_index,
          )
          .map((row: { Column_name: string }) => row.Column_name),
      ).toEqual(['value_id', 'portfolio_id']);

      const portfolioIndex = await dataSource.query(
        `SHOW INDEX FROM control_list_value_portfolios WHERE Key_name = 'idx_control_list_value_portfolios_portfolio'`,
      );
      expect(portfolioIndex).toHaveLength(1);
      expect(portfolioIndex[0].Column_name).toBe('portfolio_id');
      expect(Number(portfolioIndex[0].Non_unique)).toBe(1);
    });

    it('cascades from its value and restricts the portfolio (foreign key rules)', async () => {
      const rules = await dataSource.query(
        `SELECT REFERENCED_TABLE_NAME AS referenced, DELETE_RULE AS delete_rule
           FROM information_schema.REFERENTIAL_CONSTRAINTS
          WHERE CONSTRAINT_SCHEMA = DATABASE()
            AND TABLE_NAME = 'control_list_value_portfolios'
          ORDER BY REFERENCED_TABLE_NAME`,
      );
      expect(rules).toEqual([
        { referenced: 'control_list_values', delete_rule: 'CASCADE' },
        { referenced: 'portfolios', delete_rule: 'RESTRICT' },
      ]);
    });

    // R-CLG-009 AC.3: every seeded value applies to all portfolios.
    it('holds no link row for any seeded value (ids 1-23)', async () => {
      const [{ total }] = await dataSource.query(
        `SELECT COUNT(*) AS total FROM control_list_value_portfolios WHERE value_id <= 23`,
      );
      expect(Number(total)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // A13 - the filter, on real SQL
  // -------------------------------------------------------------------------
  describe('A13 — the portfolio filter on real SQL (R-CLG-009 AC.1)', () => {
    const cases: Array<
      [string, 'p1' | 'p2' | null, boolean | undefined, FixtureKey[]]
    > = [
      [
        'portfolio 1, activeOnly=true',
        'p1',
        true,
        ['allActive', 'p1Active', 'bothActive'],
      ],
      [
        'portfolio 1, activeOnly=false',
        'p1',
        false,
        ['allActive', 'allInactive', 'p1Active', 'p1Inactive', 'bothActive'],
      ],
      [
        'portfolio 2, activeOnly=true',
        'p2',
        true,
        ['allActive', 'p2Active', 'bothActive'],
      ],
      [
        'portfolio 2, activeOnly=false',
        'p2',
        false,
        ['allActive', 'allInactive', 'p2Active', 'p2Inactive', 'bothActive'],
      ],
      [
        'no portfolio, activeOnly=true',
        null,
        true,
        ['allActive', 'p2Active', 'p1Active', 'bothActive'],
      ],
      ['no portfolio, activeOnly=false', null, false, [...FIXTURE_KEYS]],
      [
        'portfolio 1, activeOnly omitted (defaults to true)',
        'p1',
        undefined,
        ['allActive', 'p1Active', 'bothActive'],
      ],
    ];

    it.each(cases)(
      'returns exactly the right values, in display order, for %s',
      async (_label, portfolio, activeOnly, expectedKeys) => {
        const query: Record<string, string | number> = {};
        if (portfolio) query.portfolioId = portfolio === 'p1' ? p1 : p2;
        if (activeOnly !== undefined) query.activeOnly = String(activeOnly);

        const response = await readByKey(query).expect(200);

        const returned = idsOf(response.body);
        expect(returned).toEqual(expectedKeys.map((key) => fixture[key]));
        // The canary lives in ANOTHER list and is restricted to P1: it must
        // never come back from this list's read, whatever the filter.
        expect(returned).not.toContain(otherListP1ValueId);
      },
    );

    // R-CLG-009 *No filter*: each value carries its Applies to set.
    it('returns every value with its Applies to set when no portfolio is given', async () => {
      const response = await readByKey({ activeOnly: 'false' }).expect(200);

      const byId = new Map<
        number,
        { appliesTo: number[]; appliesToAll: boolean }
      >(
        response.body.data.map(
          (v: {
            id: number | string;
            appliesTo: number[];
            appliesToAll: boolean;
          }) => [Number(v.id), v],
        ),
      );
      expect(byId.get(fixture.allActive)).toMatchObject({
        appliesTo: [],
        appliesToAll: true,
      });
      expect(byId.get(fixture.allInactive)).toMatchObject({
        appliesTo: [],
        appliesToAll: true,
      });
      expect(byId.get(fixture.p2Active)).toMatchObject({
        appliesTo: [p2],
        appliesToAll: false,
      });
      expect(byId.get(fixture.p1Inactive)).toMatchObject({
        appliesTo: [p1],
        appliesToAll: false,
      });
      expect(byId.get(fixture.bothActive)).toMatchObject({
        appliesTo: [p1, p2],
        appliesToAll: false,
      });
    });

    // R-CLG-009 AC.3 on the seeded list: nothing is restricted, so the filter
    // changes nothing for either portfolio.
    it('returns the same seeded kpi.direction values with or without a portfolio (seeded values apply to all)', async () => {
      const read = (query: Record<string, string | number>) =>
        request(app.getHttpServer())
          .get('/by-key/kpi.direction/values')
          .set('x-test-roles', AUTH_CONTRIBUTOR)
          .query(query)
          .expect(200);

      const unfiltered = await read({});
      const forP1 = await read({ portfolioId: p1 });
      const forP2 = await read({ portfolioId: p2 });

      const seeded = (body: { data: Array<{ id: number | string }> }) =>
        idsOf(body).filter((id) => id <= 23);
      expect(seeded(unfiltered.body).length).toBeGreaterThan(0);
      expect(seeded(forP1.body)).toEqual(seeded(unfiltered.body));
      expect(seeded(forP2.body)).toEqual(seeded(unfiltered.body));
      for (const value of unfiltered.body.data.filter(
        (v: { id: number | string }) => Number(v.id) <= 23,
      )) {
        expect(value).toMatchObject({ appliesTo: [], appliesToAll: true });
      }
    });

    // R-CLG-009 *Unknown portfolio*.
    it('answers 404 for a portfolio that does not exist', async () => {
      await readByKey({ portfolioId: 999999999 }).expect(404);
    });

    it('answers 400 for a malformed portfolioId', async () => {
      await readByKey({ portfolioId: 0 }).expect(400);
      await readByKey({ portfolioId: 'abc' }).expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // A9 - the admin read
  // -------------------------------------------------------------------------
  describe('A9 — GET /lists/:id/values shows Applies to', () => {
    it('attaches appliesTo / appliesToAll to every value, inactive ones included', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lists/${filterListId}/values`)
        .set('x-test-roles', AUTH_TS)
        .expect(200);

      const summary = response.body.data.map(
        (v: {
          id: number | string;
          appliesTo: number[];
          appliesToAll: boolean;
        }) => [Number(v.id), v.appliesTo, v.appliesToAll],
      );
      expect(summary).toEqual([
        [fixture.allActive, [], true],
        [fixture.allInactive, [], true],
        [fixture.p2Active, [p2], false],
        [fixture.p2Inactive, [p2], false],
        [fixture.p1Active, [p1], false],
        [fixture.p1Inactive, [p1], false],
        [fixture.bothActive, [p1, p2], false],
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // A10 / A11 / A12 - writing the set
  // -------------------------------------------------------------------------
  describe('A10/A11/A12 — writing Applies to', () => {
    const createValue = async (
      portfolioIds: number[] | undefined,
      tag: string,
    ): Promise<number> => {
      const code = nextCode(tag);
      const response = await request(app.getHttpServer())
        .post(`/lists/${writeListId}/values`)
        .set('x-test-roles', AUTH_TS)
        .send({ code, value: `${code}_name`, portfolioIds })
        .expect(201);
      return Number(response.body.data.id);
    };

    it('A10 stores the set it was given and returns it (appliesTo, appliesToAll: false)', async () => {
      const code = nextCode('a10');
      const response = await request(app.getHttpServer())
        .post(`/lists/${writeListId}/values`)
        .set('x-test-roles', AUTH_TS)
        .send({ code, value: `${code}_name`, portfolioIds: [p2, p1] })
        .expect(201);

      expect(response.body.data).toMatchObject({
        appliesTo: [p1, p2],
        appliesToAll: false,
      });
      expect(await linkedPortfolioIds(Number(response.body.data.id))).toEqual([
        p1,
        p2,
      ]);
    });

    it.each([
      ['omitted', undefined],
      ['an empty array', []],
    ])(
      'A10 stores no links when portfolioIds is %s (applies to all)',
      async (_label, portfolioIds) => {
        const id = await createValue(portfolioIds, 'a10all');

        expect(await linkedPortfolioIds(id)).toEqual([]);
        const response = await request(app.getHttpServer())
          .get(`/lists/${writeListId}/values`)
          .set('x-test-roles', AUTH_TS)
          .expect(200);
        const row = response.body.data.find(
          (v: { id: number | string }) => Number(v.id) === id,
        );
        expect(row).toMatchObject({ appliesTo: [], appliesToAll: true });
      },
    );

    it('A10 answers 400 (not 404) for an unknown portfolio id and creates nothing', async () => {
      const code = nextCode('a10bad');
      await request(app.getHttpServer())
        .post(`/lists/${writeListId}/values`)
        .set('x-test-roles', AUTH_TS)
        .send({ code, value: `${code}_name`, portfolioIds: [999999999] })
        .expect(400);

      const rows = await dataSource.query(
        `SELECT id FROM control_list_values WHERE code = ?`,
        [code],
      );
      expect(rows).toHaveLength(0);
    });

    it('A11 replaces the set, keeps it when portfolioIds is omitted, and clears it for []', async () => {
      const id = await createValue([p1], 'a11');
      const patch = (body: Record<string, unknown>) =>
        request(app.getHttpServer())
          .patch(`/values/${id}`)
          .set('x-test-roles', AUTH_TS)
          .send(body);

      // replace
      const replaced = await patch({ portfolioIds: [p2] }).expect(200);
      expect(replaced.body.data).toMatchObject({
        appliesTo: [p2],
        appliesToAll: false,
      });
      expect(await linkedPortfolioIds(id)).toEqual([p2]);

      // omitted: unchanged
      const untouched = await patch({ description: 'still p2' }).expect(200);
      expect(untouched.body.data.appliesTo).toEqual([p2]);
      expect(await linkedPortfolioIds(id)).toEqual([p2]);

      // [] clears: applies to all again
      const cleared = await patch({ portfolioIds: [] }).expect(200);
      expect(cleared.body.data).toMatchObject({
        appliesTo: [],
        appliesToAll: true,
      });
      expect(await linkedPortfolioIds(id)).toEqual([]);
    });

    // R-CLG-009 AC.4: an invalid write leaves the set exactly as it was.
    it('A11 answers 400 for an unknown portfolio id and leaves the set and the value untouched', async () => {
      const id = await createValue([p1], 'a11bad');

      await request(app.getHttpServer())
        .patch(`/values/${id}`)
        .set('x-test-roles', AUTH_TS)
        .send({ description: 'must not land', portfolioIds: [999999999] })
        .expect(400);

      expect(await linkedPortfolioIds(id)).toEqual([p1]);
      const [row] = await dataSource.query(
        `SELECT description FROM control_list_values WHERE id = ?`,
        [id],
      );
      expect(row.description).not.toBe('must not land');
    });

    // D-CLG-12: the link table has no audit columns, so a PATCH that changes
    // ONLY the set must still stamp the VALUE row's own audit fields.
    it("A11 stamps the value's audit fields on a links-only PATCH (D-CLG-12)", async () => {
      const id = await createValue([p1], 'a11audit');
      // Created by the API as user 1; blank the stamp so the PATCH's own write
      // is the only thing that can set it.
      await dataSource.query(
        `UPDATE control_list_values SET updated_by = NULL WHERE id = ?`,
        [id],
      );

      await request(app.getHttpServer())
        .patch(`/values/${id}`)
        .set('x-test-roles', AUTH_TS)
        .send({ portfolioIds: [p2] })
        .expect(200);

      const [row] = await dataSource.query(
        `SELECT updated_by FROM control_list_values WHERE id = ?`,
        [id],
      );
      expect(Number(row.updated_by)).toBe(1);
      expect(await linkedPortfolioIds(id)).toEqual([p2]);
    });

    // R-CLG-009: "Deleting a value removes its Applies to links with it."
    it('A12 removes the value and its links together (ON DELETE CASCADE)', async () => {
      const id = await createValue([p1, p2], 'a12');
      expect(await linkedPortfolioIds(id)).toEqual([p1, p2]);

      await request(app.getHttpServer())
        .delete(`/values/${id}`)
        .set('x-test-roles', AUTH_TS)
        .expect(200);

      expect(await linkedPortfolioIds(id)).toEqual([]);
      const rows = await dataSource.query(
        `SELECT id FROM control_list_values WHERE id = ?`,
        [id],
      );
      expect(rows).toHaveLength(0);
    });

    it('deleting one restricted value removes only its own links (a sibling keeps its)', async () => {
      const doomed = await insertValue(writeListId, nextCode('doomed'));
      const sibling = await insertValue(writeListId, nextCode('sibling'));
      await link(doomed, p1);
      await link(sibling, p1);

      await request(app.getHttpServer())
        .delete(`/values/${doomed}`)
        .set('x-test-roles', AUTH_TS)
        .expect(200);

      expect(await linkedPortfolioIds(doomed)).toEqual([]);
      expect(await linkedPortfolioIds(sibling)).toEqual([p1]);
    });
  });

  // -------------------------------------------------------------------------
  // Atomicity (R-CLG-009 *Partial save impossible*, AC.5; design §5 rule 4)
  // -------------------------------------------------------------------------
  describe('atomicity — the value and its links commit together or not at all (AC.5)', () => {
    // The "active portfolio" validation is BYPASSED: every id is claimed
    // active, so a non-existent portfolio id reaches the LINK INSERT and fails
    // on its foreign key (errno 1452) INSIDE the transaction.
    const everyIdIsActive = {
      find: async ({ where }: { where: { id: { value: number[] } } }) =>
        where.id.value.map((id) => ({ id })),
      findOne: async ({ where }: { where: { id: number } }) => ({
        id: where.id,
      }),
    };
    const MISSING_PORTFOLIO = 999999999;

    let bypassModule: TestingModule;
    let service: ControlListsService;

    beforeAll(async () => {
      bypassModule = await buildModule(everyIdIsActive);
      const contextId = ContextIdFactory.create();
      bypassModule.registerRequestByContextId(
        { user: { sec_user_id: 1, roles: [SecRolesEnum.TECHNICAL_SUPPORT] } },
        contextId,
      );
      service = await bypassModule.resolve(ControlListsService, contextId);
    });

    afterAll(async () => {
      await bypassModule?.close();
    });

    it('A11: a failing link insert leaves the value row, its audit stamp and its OLD links exactly as they were', async () => {
      const code = nextCode('atom');
      const id = await insertValue(writeListId, code, {
        name: 'atom-original',
      });
      await link(id, p1);
      const [before] = await dataSource.query(
        `SELECT value, description, updated_by FROM control_list_values WHERE id = ?`,
        [id],
      );

      await expect(
        service.updateValue(id, {
          value: 'atom-renamed',
          description: 'atom-described',
          portfolioIds: [MISSING_PORTFOLIO],
        }),
      ).rejects.toMatchObject({ errno: 1452 });

      const [after] = await dataSource.query(
        `SELECT value, description, updated_by FROM control_list_values WHERE id = ?`,
        [id],
      );
      expect(after.value).toBe('atom-original');
      expect(after).toEqual(before);
      // The DELETE of the old links ran inside the same transaction, so it was
      // rolled back too: the original set is still there.
      expect(await linkedPortfolioIds(id)).toEqual([p1]);
    });

    it('A10: a failing link insert leaves no value row behind', async () => {
      const code = nextCode('atomc');

      await expect(
        service.createValue(writeListId, {
          code,
          value: `${code}_name`,
          portfolioIds: [MISSING_PORTFOLIO],
        }),
      ).rejects.toMatchObject({ errno: 1452 });

      const rows = await dataSource.query(
        `SELECT id FROM control_list_values WHERE code = ?`,
        [code],
      );
      expect(rows).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Soft-deleted (deactivated) portfolios (R-CLG-009; design §3 J-9, D-CLG-14)
  // -------------------------------------------------------------------------
  describe('a deactivated linked portfolio (D-CLG-14)', () => {
    it('is hidden on read, never reads as "all", and 404s the filter and 400s the write', async () => {
      try {
        await setPortfolioActive(p2, 0);

        // A9: P2 is omitted. A value linked ONLY to P2 is offered nowhere
        // (`appliesTo: []`) but is NOT "all"; one linked to P1 and P2 keeps P1.
        const admin = await request(app.getHttpServer())
          .get(`/lists/${filterListId}/values`)
          .set('x-test-roles', AUTH_TS)
          .expect(200);
        const applies = new Map<
          number,
          { appliesTo: number[]; appliesToAll: boolean }
        >(
          admin.body.data.map(
            (v: {
              id: number | string;
              appliesTo: number[];
              appliesToAll: boolean;
            }) => [Number(v.id), v],
          ),
        );
        expect(applies.get(fixture.p2Active)).toMatchObject({
          appliesTo: [],
          appliesToAll: false,
        });
        expect(applies.get(fixture.bothActive)).toMatchObject({
          appliesTo: [p1],
          appliesToAll: false,
        });
        expect(applies.get(fixture.allActive)).toMatchObject({
          appliesTo: [],
          appliesToAll: true,
        });

        // A13 for the deactivated portfolio itself: 404.
        await readByKey({ portfolioId: p2 }).expect(404);

        // A13 for P1: a value whose only link is the inactive P2 must NOT be
        // returned (it is offered nowhere) - "no ACTIVE links" is not "all".
        const forP1 = await readByKey({
          portfolioId: p1,
          activeOnly: 'false',
        }).expect(200);
        const returned = idsOf(forP1.body);
        expect(returned).not.toContain(fixture.p2Active);
        expect(returned).not.toContain(fixture.p2Inactive);
        expect(returned).toEqual([
          fixture.allActive,
          fixture.allInactive,
          fixture.p1Active,
          fixture.p1Inactive,
          fixture.bothActive,
        ]);

        // A write may not name the deactivated portfolio: 400, nothing stored.
        const code = nextCode('inactive');
        await request(app.getHttpServer())
          .post(`/lists/${writeListId}/values`)
          .set('x-test-roles', AUTH_TS)
          .send({ code, value: `${code}_name`, portfolioIds: [p2] })
          .expect(400);
        const rows = await dataSource.query(
          `SELECT id FROM control_list_values WHERE code = ?`,
          [code],
        );
        expect(rows).toHaveLength(0);

        // The membership check (R-CLG-004) ignores Applies to altogether
        // (D-CLG-10): a value whose only link is the inactive P2 still passes.
        const lookup = moduleRef.get(ControlListValueLookupService);
        await expect(
          lookup.assertValueInList(fixture.p2Active, filterListKey),
        ).resolves.toMatchObject({ code: expect.stringContaining('p2Active') });
      } finally {
        await setPortfolioActive(p2, originalIsActive.get(p2));
      }

      // The portfolio is active again: the same values come back for P2.
      const [{ active }] = await dataSource.query(
        `SELECT is_active AS active FROM portfolios WHERE id = ?`,
        [p2],
      );
      expect(Number(active)).toBe(originalIsActive.get(p2));
      const forP2 = await readByKey({ portfolioId: p2 }).expect(200);
      expect(idsOf(forP2.body)).toContain(fixture.p2Active);
    });
  });

  // -------------------------------------------------------------------------
  // R-CLG-009 *Restricting a value already in use* - the membership check does
  // not look at portfolios (D-CLG-10).
  // -------------------------------------------------------------------------
  describe('the membership check ignores Applies to (D-CLG-10)', () => {
    it('passes for a value restricted to a portfolio the caller is not in', async () => {
      const lookup = moduleRef.get(ControlListValueLookupService);

      const value = await lookup.assertValueInList(
        fixture.p2Active,
        filterListKey,
      );

      expect(Number(value.id)).toBe(fixture.p2Active);
    });
  });
});

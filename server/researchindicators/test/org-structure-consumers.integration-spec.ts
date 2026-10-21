import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { OrganizationalStructureController } from '../src/domain/entities/organizational-structure/organizational-structure.controller';
import { OrgStructureService } from '../src/domain/entities/organizational-structure/organizational-structure.service';
import { OrgStructureReadService } from '../src/domain/entities/organizational-structure/org-structure-read.service';
import { OrgStructureClock } from '../src/domain/entities/organizational-structure/org-structure.clock';
import { OrgUnitUsageRegistry } from '../src/domain/entities/organizational-structure/org-unit-usage.registry';
import { OrgLevelUsageProvider } from '../src/domain/entities/organizational-structure/org-level-usage.provider';
import { OrgStructureWriteRepository } from '../src/domain/entities/organizational-structure/repositories/org-structure-write.repository';
import { OrgUnitRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit.repository';
import { OrgUnitVersionRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-version.repository';
import { OrgUnitDelegateRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-delegate.repository';
import { OrgUnitChangeLogRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-change-log.repository';
import { ControlListsController } from '../src/domain/entities/control-lists/control-lists.controller';
import { ControlListsService } from '../src/domain/entities/control-lists/control-lists.service';
import { ControlListUsageRegistry } from '../src/domain/entities/control-lists/control-list-usage.registry';
import { ControlListValueLookupService } from '../src/domain/entities/control-lists/control-list-value-lookup.service';
import { ControlListCategoryRepository } from '../src/domain/entities/control-lists/repositories/control-list-category.repository';
import { ControlListRepository } from '../src/domain/entities/control-lists/repositories/control-list.repository';
import { ControlListValueRepository } from '../src/domain/entities/control-lists/repositories/control-list-value.repository';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { appliesToProviders } from './support/control-lists-providers';
import { OrgTestConsumer } from './support/org-test-consumer';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_T04_PREFIX,
} from './support/org-structure-fixtures';

/**
 * Organizational Structure consumer contract and Control Lists wiring against
 * the REAL local MySQL (docs/specs/institutional-performance/
 * organizational-structure, T-04): C1 `resolve`, C2 `ancestors`, C3
 * `successors`, B8 linked data, the level provider registered in the real
 * Control Lists registry, and the errno 1451 backstop on a value delete.
 *
 * What lives in the database is asserted on real rows (KZ-001): which version
 * covers a year (SQL coverage), the per-VERSION level count (SQL `COUNT`), the
 * FK that makes a raw delete fail with errno 1451.
 *
 * Scope note (KZ-017): a test-only middleware stands in for `JwtMiddleware`
 * (so "unauthenticated -> 401" is NOT proven here), and `GlobalExceptions` /
 * `ResponseInterceptor` / Swagger are NOT mounted. The wire envelope of the
 * 1451 -> 409 mapping is pinned in `control-lists.global-exceptions.spec.ts`,
 * and the Swagger text on a booted app is quoted in execution.md.
 *
 * Isolation (KZ-005, suites run in parallel): every count asserted here is
 * scoped to rows this suite created. The only seeded value touched is `23`
 * (L4), and only to prove a DELETE of it is REFUSED - guarded below by reading
 * the real FK first, and re-checked after. The level-count and FK-backstop
 * proofs use a scratch `org.level` value above the seeded range instead, so a
 * regression there cannot delete a seeded row.
 *
 * Evidence DB: local `ARI_TEST_MYSQL_*` (the target is printed by the harness
 * and the host is refused unless local). Only `__T04_` entries/staff and one
 * scratch value are created, and removed in `afterAll`.
 */
describe('Organizational Structure — consumer contract and Control Lists wiring against real MySQL (T-04)', () => {
  let app: INestApplication;
  let backstopApp: INestApplication;
  let dataSource: DataSource;
  let fixtures: OrgFixtures;
  const today = 2026;

  const unitRegistry = new OrgUnitUsageRegistry();
  const consumer = new OrgTestConsumer();
  let readService: OrgStructureReadService;

  let scratchValueId: number;
  const SCRATCH_CODE = `${ORG_T04_PREFIX}LVL${Date.now()}`;

  let staffCarnet: string;
  let root: number;
  let deptA: number;
  let deptC: number;
  let u57: number; // L4: A in [2026,2029), C from 2029
  let ended: number; // active [2026,2027), inactive from 2027
  let gap: number; // [2026,2027) and [2029,open): the D-ORG-17 gap
  let removed: number; // [2026,2028), deleted from 2028
  let scratchTwoVersions: number; // two versions on the scratch level
  let scratchOneVersion: number; // one version on the scratch level
  let chain1: number;
  let chain2: number;
  let chain3: number;

  const as = (role: SecRolesEnum) => ({
    'x-test-roles': JSON.stringify([role]),
  });
  const admin = as(SecRolesEnum.CENTER_ADMIN);
  const systemAdmin = as(SecRolesEnum.SYSTEM_ADMIN);
  const contributor = as(SecRolesEnum.CONTRIBUTOR);
  const query = (sql: string, params: unknown[] = []) =>
    dataSource.query(sql, params);
  const http = () => request(app.getHttpServer());
  const resolve = (qs: string, headers = contributor) =>
    http().get(`/resolve${qs}`).set(headers);

  const testingModule = async (
    registry: ControlListUsageRegistry | Record<string, unknown>,
    withOrg: boolean,
  ): Promise<TestingModule> =>
    Test.createTestingModule({
      controllers: withOrg
        ? [OrganizationalStructureController, ControlListsController]
        : [ControlListsController],
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
        { provide: ControlListUsageRegistry, useValue: registry },
        ControlListValueLookupService,
        ...appliesToProviders(dataSource),
        {
          provide: CurrentUserUtil,
          useValue: { user_id: 4242, audit: () => ({}) },
        },
        Reflector,
        RolesGuard,
        ...(withOrg
          ? [
              OrgStructureService,
              OrgStructureReadService,
              OrgLevelUsageProvider,
              { provide: OrgUnitUsageRegistry, useValue: unitRegistry },
              {
                provide: OrgStructureClock,
                useValue: { currentYear: () => today },
              },
              {
                provide: OrgStructureWriteRepository,
                useFactory: () => new OrgStructureWriteRepository(dataSource),
              },
              {
                provide: OrgUnitRepository,
                useFactory: () => new OrgUnitRepository(dataSource),
              },
              {
                provide: OrgUnitVersionRepository,
                useFactory: () => new OrgUnitVersionRepository(dataSource),
              },
              {
                provide: OrgUnitDelegateRepository,
                useFactory: () => new OrgUnitDelegateRepository(dataSource),
              },
              {
                provide: OrgUnitChangeLogRepository,
                useFactory: () => new OrgUnitChangeLogRepository(dataSource),
              },
            ]
          : []),
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

  const bootstrap = async (moduleRef: TestingModule) => {
    const instance = moduleRef.createNestApplication();
    instance.use((req, _res, next) => {
      const rolesHeader = req.headers['x-test-roles'];
      req.user = {
        sec_user_id: 1,
        roles: rolesHeader ? JSON.parse(rolesHeader as string) : [],
      };
      next();
    });
    await instance.init();
    return instance;
  };

  beforeAll(async () => {
    dataSource = await createOrgTestDataSource('org-structure-consumers');
    fixtures = new OrgFixtures(dataSource, ORG_T04_PREFIX);

    // Guard before anything can touch value 23: the version -> level FK must be
    // ON DELETE RESTRICT, or a regression here could really delete a seeded value.
    const fk = await query(
      `SELECT rc.DELETE_RULE AS rule
         FROM information_schema.REFERENTIAL_CONSTRAINTS rc
         JOIN information_schema.KEY_COLUMN_USAGE kcu
           ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
          AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
        WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
          AND kcu.TABLE_NAME = 'org_unit_versions'
          AND kcu.COLUMN_NAME = 'level_value_id'
          AND kcu.REFERENCED_TABLE_NAME = 'control_list_values'`,
    );
    if (fk.length === 0 || fk[0].rule !== 'RESTRICT') {
      throw new Error(
        'org_unit_versions.level_value_id has no ON DELETE RESTRICT FK to control_list_values: refusing to run (value 23 would be at risk).',
      );
    }

    staffCarnet = await fixtures.staff('C1', 'Elena', 'Soto', true);

    const [orgLevelList] = await query(
      `SELECT id FROM control_lists WHERE list_key = 'org.level'`,
    );
    const scratchInsert = await query(
      `INSERT INTO control_list_values (list_id, code, value, display_order, is_active, created_at)
       VALUES (?, ?, ?, 99, 1, NOW())`,
      [orgLevelList.id, SCRATCH_CODE, `${SCRATCH_CODE} scratch level`],
    );
    scratchValueId = Number(scratchInsert.insertId);

    root = await fixtures.unit('C_ROOT', [
      { from: 2026, to: null, name: 'Alliance', levelId: 20 },
    ]);
    deptA = await fixtures.unit('C_DEPT_A', [
      { from: 2026, to: null, name: 'Dept A', levelId: 21, parentId: root },
    ]);
    deptC = await fixtures.unit('C_DEPT_C', [
      { from: 2026, to: null, name: 'Dept C', levelId: 21, parentId: root },
    ]);
    // The "KPI history continues through a move" fixture: a REAL move from 2029.
    u57 = await fixtures.unit('C_U57', [
      {
        from: 2026,
        to: 2029,
        name: 'Unit 57',
        levelId: 23,
        parentId: deptA,
        directorCarnet: staffCarnet,
      },
      {
        from: 2029,
        to: null,
        name: 'Unit 57',
        levelId: 23,
        parentId: deptC,
        directorCarnet: staffCarnet,
      },
    ]);
    await fixtures.delegate(u57, staffCarnet);

    ended = await fixtures.unit(
      'C_ENDED',
      [
        {
          from: 2026,
          to: 2027,
          name: 'Ended unit',
          levelId: 23,
          parentId: deptA,
        },
      ],
      { status: 'inactive', statusFromYear: 2027 },
    );
    gap = await fixtures.unit('C_GAP', [
      { from: 2026, to: 2027, name: 'Gap unit', levelId: 23, parentId: deptA },
      { from: 2029, to: null, name: 'Gap unit', levelId: 23, parentId: deptA },
    ]);
    removed = await fixtures.unit(
      'C_REMOVED',
      [{ from: 2026, to: 2028, name: 'Removed', levelId: 23, parentId: deptA }],
      { status: 'deleted', statusFromYear: 2028 },
    );

    // Level-count fixture: an entry with TWO versions on the scratch level and
    // another with one, so versions (3) and entries (2) differ.
    scratchTwoVersions = await fixtures.unit('C_SCR2', [
      {
        from: 2026,
        to: 2028,
        name: 'S2',
        levelId: scratchValueId,
        parentId: deptA,
      },
      {
        from: 2028,
        to: null,
        name: 'S2',
        levelId: scratchValueId,
        parentId: deptA,
      },
    ]);
    scratchOneVersion = await fixtures.unit('C_SCR1', [
      {
        from: 2026,
        to: null,
        name: 'S1',
        levelId: scratchValueId,
        parentId: deptA,
      },
    ]);

    // Successor chain chain1 -> chain2 -> chain3.
    chain3 = await fixtures.unit('C_CH3', [
      { from: 2026, to: null, name: 'Chain 3', levelId: 21, parentId: root },
    ]);
    chain2 = await fixtures.unit(
      'C_CH2',
      [{ from: 2026, to: 2028, name: 'Chain 2', levelId: 21, parentId: root }],
      { status: 'inactive', statusFromYear: 2028 },
    );
    chain1 = await fixtures.unit(
      'C_CH1',
      [{ from: 2026, to: 2027, name: 'Chain 1', levelId: 21, parentId: root }],
      { status: 'inactive', statusFromYear: 2027 },
    );
    await query(`UPDATE org_units SET successor_id = ? WHERE id = ?`, [
      chain2,
      chain1,
    ]);
    await query(`UPDATE org_units SET successor_id = ? WHERE id = ?`, [
      chain3,
      chain2,
    ]);

    // The test consumer: KPI values for 2026-2030 stored under ID u57 only.
    [10, 20, 30, 40, 50].forEach((value, index) =>
      consumer.add(u57, 2026 + index, value),
    );
    consumer.register(unitRegistry);

    // The REAL Control Lists registry; the level provider registers itself in
    // it from `onModuleInit` when `app.init()` runs.
    app = await bootstrap(
      await testingModule(new ControlListUsageRegistry(), true),
    );
    readService = app.get(OrgStructureReadService);

    // A second app whose registry reports 0 for everything: only the DB FK can
    // refuse the delete there (the errno 1451 backstop).
    backstopApp = await bootstrap(
      await testingModule(
        {
          getInUseCount: async () => 0,
          getInUseCounts: async (ids: number[]) =>
            new Map(ids.map((id) => [id, 0])),
          getConsumerNamesForKey: () => [],
          register: () => undefined,
        },
        false,
      ),
    );
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
      if (backstopApp) await backstopApp.close();
      if (fixtures?.unitIds.length) {
        // FORCE INDEX keeps this a PRIMARY-key range (a scan X-locks every row
        // until commit and deadlocked with parallel suites, T-05).
        const ids = fixtures.unitIds.map(() => '?').join(',');
        await dataSource.query(
          `UPDATE org_units FORCE INDEX (PRIMARY) SET successor_id = NULL WHERE id IN (${ids})`,
          fixtures.unitIds,
        );
      }
      await fixtures?.cleanup();
      if (scratchValueId) {
        await dataSource.query(
          `DELETE FROM control_list_values WHERE id = ? AND code = ?`,
          [scratchValueId, SCRATCH_CODE],
        );
      }
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  describe('R-ORG-010 — KPI history continues through a move', () => {
    it('all five years stay one series under ID 57 and a roll-up by department puts 2026-2028 under A and 2029-2030 under C, without rewriting a stored value', async () => {
      const storedBefore = JSON.stringify(consumer.values);

      expect(consumer.series(u57).map((v) => [v.year, v.value])).toEqual([
        [2026, 10],
        [2027, 20],
        [2028, 30],
        [2029, 40],
        [2030, 50],
      ]);
      // L2 (value id 21) is the department level.
      const rollUp = await consumer.rollUpByLevel(readService, 21);

      expect(rollUp).toEqual({
        [deptA]: [
          [2026, 10],
          [2027, 20],
          [2028, 30],
        ],
        [deptC]: [
          [2029, 40],
          [2030, 50],
        ],
      });
      expect(JSON.stringify(consumer.values)).toBe(storedBefore);
      // Only the entry id is stored with each value (R-ORG-010).
      expect(Object.keys(consumer.values[0]).sort()).toEqual([
        'unitId',
        'value',
        'year',
      ]);
    });
  });

  describe('C1 resolve over HTTP', () => {
    it('years before, at and after the move resolve the version of THAT year (parent A until 2028, C from 2029), for a Contributor', async () => {
      const byYear: Record<number, any> = {};
      for (const year of [2026, 2028, 2029, 2030]) {
        const res = await resolve(`?ids=${u57}&year=${year}`);
        expect(res.status).toBe(200);
        byYear[year] = res.body.data[0];
      }

      expect(byYear[2026].version).toMatchObject({
        from: 2026,
        to: 2029,
        parentId: deptA,
        parentName: 'Dept A',
        levelCode: 'L4',
      });
      expect(byYear[2028].version.parentId).toBe(deptA);
      expect(byYear[2029].version).toMatchObject({
        from: 2029,
        to: null,
        parentId: deptC,
      });
      expect(byYear[2030].version.parentId).toBe(deptC);
      expect(byYear[2026]).toMatchObject({
        id: u57,
        year: 2026,
        status: 'active',
      });
      expect(byYear[2026].version.director).toMatchObject({
        carnet: staffCarnet,
        name: 'Elena Soto',
      });
      expect(byYear[2026].delegates).toEqual([
        expect.objectContaining({ carnet: staffCarnet, name: 'Elena Soto' }),
      ]);
      expect(byYear[2026].version).not.toHaveProperty('id');
    });

    it('an entry ended in 2027: 2026 resolves with status active; 2027 has no version and reads inactive (status as of the year)', async () => {
      const in2026 = (await resolve(`?ids=${ended}&year=2026`)).body.data[0];
      const in2027 = (await resolve(`?ids=${ended}&year=2027`)).body.data[0];

      expect(in2026).toMatchObject({
        id: ended,
        status: 'active',
        statusFromYear: 2027,
      });
      expect(in2026.version).toMatchObject({ from: 2026, to: 2027 });
      expect(in2027).toMatchObject({
        id: ended,
        status: 'inactive',
        statusFromYear: 2027,
        version: null,
      });
    });

    it('a D-ORG-17 gap (inactive 2027, back in 2029): 2027 and 2028 are version null + inactive; 2029 resolves', async () => {
      const rows: Record<number, any> = {};
      for (const year of [2026, 2027, 2028, 2029]) {
        rows[year] = (await resolve(`?ids=${gap}&year=${year}`)).body.data[0];
      }
      expect(rows[2026].version).not.toBeNull();
      for (const year of [2027, 2028]) {
        expect(rows[year]).toMatchObject({ version: null, status: 'inactive' });
      }
      expect(rows[2029]).toMatchObject({ status: 'active' });
      expect(rows[2029].version).toMatchObject({ from: 2029, to: null });
    });

    it('a deleted entry reads deleted from its end year and resolves before it', async () => {
      const before = (await resolve(`?ids=${removed}&year=2027`)).body.data[0];
      const at = (await resolve(`?ids=${removed}&year=2028`)).body.data[0];
      expect(before).toMatchObject({ status: 'active' });
      expect(before.version).not.toBeNull();
      expect(at).toMatchObject({ status: 'deleted', version: null });
    });

    it('returns one row per id in request order in a single call, and defaults the year to the current one', async () => {
      const res = await resolve(`?ids=${deptC},${u57},${deptC}`);
      expect(res.status).toBe(200);
      expect(res.body.data.map((r: any) => r.id)).toEqual([deptC, u57]);
      expect(res.body.data[0].year).toBe(today);
    });

    it('one physically deleted id among existing ones: 200, its row is { id, missing: true } in its place, the others resolve (D-ORG-19)', async () => {
      const doomed = await fixtures.unit('C_DOOMED', [
        { from: 2026, to: null, name: 'Doomed', levelId: 23, parentId: deptA },
      ]);
      await query(`DELETE FROM org_units WHERE id = ?`, [doomed]);
      const [gone] = await query(`SELECT id FROM org_units WHERE id = ?`, [
        doomed,
      ]);
      expect(gone).toBeUndefined();

      const res = await resolve(`?ids=${u57},${doomed},${deptC}&year=2026`);

      expect(res.status).toBe(200);
      expect(res.body.data.map((r: any) => r.id)).toEqual([u57, doomed, deptC]);
      expect(res.body.data[1]).toEqual({ id: doomed, missing: true });
      expect(res.body.data[0].version).toMatchObject({ from: 2026 });
      expect(res.body.data[2]).toMatchObject({ id: deptC, status: 'active' });
      // A never-existing id behaves the same; C3 and C2 keep their 404.
      const never = await resolve('?ids=2147483000');
      expect(never.status).toBe(200);
      expect(never.body.data).toEqual([{ id: 2147483000, missing: true }]);
    });

    it('a year BEFORE the first version returns version null, status inactive and statusFromYear null (documented: not told apart from a gap year, D-ORG-19b)', async () => {
      const row = (await resolve(`?ids=${scratchOneVersion}&year=2025`)).body
        .data[0];
      expect(row).toMatchObject({
        id: scratchOneVersion,
        version: null,
        status: 'inactive',
        statusFromYear: null,
      });
    });

    it('no ids, more than 200 ids and a year out of range are 400', async () => {
      expect((await resolve('')).status).toBe(400);
      expect((await resolve('?ids=abc')).status).toBe(400);
      const tooMany = Array.from({ length: 201 }, (_, i) => i + 1).join(',');
      expect((await resolve(`?ids=${tooMany}`)).status).toBe(400);
      expect((await resolve(`?ids=${u57}&year=1999`)).status).toBe(400);
      expect((await resolve(`?ids=${u57}&portfolioId=1`)).status).toBe(400);
    });
  });

  describe('C2 ancestors and C3 successors over HTTP', () => {
    it('ancestors follow the structure of the asked year: 57 sits under A in 2028 and under C in 2029, up to the L1 root', async () => {
      const in2028 = await http()
        .get(`/units/${u57}/ancestors?year=2028`)
        .set(contributor);
      const in2029 = await http()
        .get(`/units/${u57}/ancestors?year=2029`)
        .set(contributor);

      expect(in2028.status).toBe(200);
      expect(in2028.body.data.map((n: any) => n.id)).toEqual([
        u57,
        deptA,
        root,
      ]);
      expect(in2029.body.data.map((n: any) => n.id)).toEqual([
        u57,
        deptC,
        root,
      ]);
      expect(in2029.body.data.map((n: any) => n.levelCode)).toEqual([
        'L4',
        'L2',
        'L1',
      ]);
    });

    it('400 when the entry is not covered that year (inside its gap, or after its end); 404 for an unknown entry', async () => {
      const get = (id: number, year: number) =>
        http().get(`/units/${id}/ancestors?year=${year}`).set(contributor);
      expect((await get(gap, 2028)).status).toBe(400);
      expect((await get(ended, 2027)).status).toBe(400);
      expect((await get(ended, 2026)).status).toBe(200);
      expect((await get(2147483000, 2026)).status).toBe(404);
    });

    it('successors list a two-step chain in order and exclude the entry; an entry with none returns []; unknown is 404', async () => {
      const chain = await http()
        .get(`/units/${chain1}/successors`)
        .set(contributor);
      expect(chain.status).toBe(200);
      expect(chain.body.data.map((n: any) => [n.id, n.status])).toEqual([
        [chain2, 'inactive'],
        [chain3, 'active'],
      ]);
      const none = await http()
        .get(`/units/${chain3}/successors`)
        .set(contributor);
      expect(none.body.data).toEqual([]);
      expect(
        (await http().get('/units/2147483000/successors').set(contributor))
          .status,
      ).toBe(404);
    });
  });

  describe('B8 linked data (R-ORG-013) and the registered test consumer (R-ORG-010 AC.2)', () => {
    it('returns the child count and the test consumer count; an entry nothing links to returns 0 and an empty list', async () => {
      const linked = await http().get(`/units/${u57}/linked-data`).set(admin);
      expect(linked.status).toBe(200);
      expect(linked.body.data).toEqual({
        childCount: 0,
        consumers: [{ consumer: 'Test consumer', count: 5 }],
      });

      const empty = await http().get(`/units/${chain3}/linked-data`).set(admin);
      expect(empty.body.data).toEqual({ childCount: 0, consumers: [] });
    });

    it('counts distinct CHILD ENTRIES that cover the current year or later: root has the departments and chain entries still under it', async () => {
      const res = await http().get(`/units/${deptC}/linked-data`).set(admin);
      // u57 moved under C from 2029 (open-ended): one child entry, however many versions.
      expect(res.body.data.childCount).toBe(1);
      const a = await http().get(`/units/${deptA}/linked-data`).set(admin);
      // Under A: u57 [2026,2029), ended [2026,2027) (ended before nothing: covers 2026), gap (two versions), removed, S2 (two), S1.
      expect(a.body.data.childCount).toBe(
        [u57, ended, gap, removed, scratchTwoVersions, scratchOneVersion]
          .length,
      );
    });

    it('is admin-only and 404 for an unknown entry', async () => {
      expect(
        (await http().get(`/units/${u57}/linked-data`).set(contributor)).status,
      ).toBe(403);
      expect(
        (await http().get('/units/2147483000/linked-data').set(admin)).status,
      ).toBe(404);
    });
  });

  describe('R-ORG-012 AC.1 — every handler of the controller, with a Contributor token', () => {
    const proto =
      OrganizationalStructureController.prototype as unknown as Record<
        string,
        (...args: unknown[]) => unknown
      >;
    const names = Object.getOwnPropertyNames(proto).filter(
      (n) => n !== 'constructor' && typeof proto[n] === 'function',
    );
    const consumerNames = ['resolve', 'getAncestors', 'getSuccessors'];

    it('B1-B13 (every non-consumer handler) answer 403 to a Contributor and leave every row as it was; C1-C3 answer 200', async () => {
      const methods: Record<number, string> = {
        [RequestMethod.GET]: 'get',
        [RequestMethod.POST]: 'post',
        [RequestMethod.PATCH]: 'patch',
        [RequestMethod.DELETE]: 'delete',
      };
      const ids = [u57, deptA, deptC, root];
      const ph = ids.map(() => '?').join(',');
      const snapshot = async () =>
        JSON.stringify([
          await query(
            `SELECT * FROM org_units WHERE id IN (${ph}) ORDER BY id`,
            ids,
          ),
          await query(
            `SELECT * FROM org_unit_versions WHERE org_unit_id IN (${ph}) ORDER BY id`,
            ids,
          ),
          await query(
            `SELECT COUNT(*) AS n FROM org_unit_change_log WHERE org_unit_id IN (${ph})`,
            ids,
          ),
        ]);
      const before = await snapshot();

      const outcomes: Array<[string, number]> = [];
      for (const name of names) {
        const method =
          methods[Reflect.getMetadata(METHOD_METADATA, proto[name])];
        const raw: string = Reflect.getMetadata(PATH_METADATA, proto[name]);
        let path = `/${raw.replace(':id', String(u57))}`;
        if (name === 'resolve') path += `?ids=${u57}&year=2026`;
        if (name === 'getChangeLog') path += `?unitId=${u57}`;
        if (name === 'searchStaff') path += '?search=el';
        if (name === 'getAncestors') path += '?year=2026';
        const res = await (http() as any)
          [method](path)
          .set(contributor)
          .send({});
        outcomes.push([name, res.status]);
      }

      expect(names.filter((n) => !consumerNames.includes(n))).toHaveLength(13);
      for (const [name, status] of outcomes) {
        if (consumerNames.includes(name))
          expect([name, status]).toEqual([name, 200]);
        else expect([name, status]).toEqual([name, 403]);
      }
      expect(await snapshot()).toBe(before);
    });
  });

  describe('R-ORG-011 — the level provider and the Control Lists wiring', () => {
    it('is registered exactly once in the real Control Lists registry: A1 `usedBy` for org.level lists the consumer once', async () => {
      const res = await http().get('/categories').set(systemAdmin);
      expect(res.status).toBe(200);
      const lists = res.body.data.flatMap((c: any) => c.lists);
      const orgLevel = lists.find((l: any) => l.key === 'org.level');
      expect(orgLevel.usedBy).toEqual(['Organizational Structure › Level']);
    });

    it('counts VERSIONS per level value, not entries: 2 entries with 3 versions on the scratch level read 3', async () => {
      const provider = app.get(OrgLevelUsageProvider);
      const registry = app.get(ControlListUsageRegistry);

      expect(await provider.countByValueIds([scratchValueId])).toEqual({
        [scratchValueId]: 3,
      });
      expect(await registry.getInUseCount(scratchValueId)).toBe(3);
      // Entries using it: 2 (the proof the count is not the entry count).
      const [entries] = await query(
        `SELECT COUNT(DISTINCT org_unit_id) AS n FROM org_unit_versions WHERE level_value_id = ?`,
        [scratchValueId],
      );
      expect(Number(entries.n)).toBe(2);
    });

    it('deleting the scratch level (in use) is refused with a 409 stating the count and proposing deactivation; the value stays', async () => {
      const res = await http()
        .delete(`/values/${scratchValueId}`)
        .set(systemAdmin);

      expect(res.status).toBe(409);
      expect(JSON.stringify(res.body)).toMatch(/3 record\(s\)/);
      expect(JSON.stringify(res.body)).toMatch(/deactivate/i);
      const [still] = await query(
        `SELECT id FROM control_list_values WHERE id = ?`,
        [scratchValueId],
      );
      expect(still).toBeDefined();
    });

    it("deleting seeded value 23 (L4 Unit) while fixture versions use it is refused with a 409 stating a count of at least this suite's 7 versions; the seeded value survives", async () => {
      const mine = (
        await query(
          `SELECT COUNT(*) AS n FROM org_unit_versions WHERE level_value_id = 23 AND org_unit_id IN (?, ?, ?, ?)`,
          [u57, ended, gap, removed],
        )
      )[0].n;

      const res = await http().delete('/values/23').set(systemAdmin);

      expect(res.status).toBe(409);
      const text = JSON.stringify(res.body);
      const count = Number(/referenced by (\d+) record/.exec(text)?.[1]);
      expect(count).toBeGreaterThanOrEqual(Number(mine));
      expect(text).toMatch(/deactivate/i);
      const [still] = await query(
        `SELECT id, code FROM control_list_values WHERE id = 23`,
      );
      expect(still).toMatchObject({ code: 'L4' });
    });

    it('FK backstop: with the registry forced to 0, a raw delete of a used value is the errno 1451 -> 409, never a 500, and the row stays', async () => {
      const res = await request(backstopApp.getHttpServer())
        .delete(`/values/${scratchValueId}`)
        .set(systemAdmin);

      expect(res.status).toBe(409);
      expect(JSON.stringify(res.body)).toMatch(/deactivate/i);
      const [still] = await query(
        `SELECT id FROM control_list_values WHERE id = ?`,
        [scratchValueId],
      );
      expect(still).toBeDefined();
    });
  });
});

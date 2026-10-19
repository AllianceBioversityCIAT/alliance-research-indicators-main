import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { OrganizationalStructureController } from '../src/domain/entities/organizational-structure/organizational-structure.controller';
import { OrgStructureService } from '../src/domain/entities/organizational-structure/organizational-structure.service';
import { OrgStructureReadService } from '../src/domain/entities/organizational-structure/org-structure-read.service';
import { OrgStructureClock } from '../src/domain/entities/organizational-structure/org-structure.clock';
import { isYearCovered } from '../src/domain/entities/organizational-structure/org-version-timeline.util';
import { OrgUnitRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit.repository';
import { OrgUnitVersionRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-version.repository';
import { OrgUnitDelegateRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-delegate.repository';
import { OrgUnitChangeLogRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-change-log.repository';
import { OrgUnitUsageRegistry } from '../src/domain/entities/organizational-structure/org-unit-usage.registry';
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_FIXTURE_PREFIX,
} from './support/org-structure-fixtures';

/**
 * Organizational Structure, year view (B1), years (B2) and one entry (B5)
 * against the REAL local MySQL (docs/specs/institutional-performance/
 * organizational-structure, T-01: R-ORG-004 read half, R-ORG-006, R-ORG-012,
 * R-ORG-016/017 read halves, NFR-ORG-004).
 *
 * KZ-001: the year-coverage predicate is a property of GENERATED SQL, so it is
 * asserted here, on the rows MySQL returns, never on the call sequence of a
 * mock. Every fixture entry has its OWN version ranges (a fixture where all
 * entries share one range cannot tell coverage from "return everything"), and
 * a table-driven sweep checks the SQL against the pure `isYearCovered` for
 * every year 2024-2030.
 *
 * Scope note (KZ-017): a test-only middleware stands in for `JwtMiddleware`
 * (sets `req.user` from `x-test-roles`), and `GlobalExceptions` /
 * `ResponseInterceptor` / Swagger are NOT mounted: this suite proves status
 * codes and `data`, not the wire envelope (pinned at the unit layer by
 * `organizational-structure.global-exceptions.spec.ts`). The clock is an
 * injected stub (tasks.md clock seam); `year` below is "today".
 *
 * Evidence DB: local `ari_local_mysql`; only `__T01_` fixtures are written and
 * deleted in `afterAll`. Control-list values 20-23 are READ, never changed.
 */
describe('Organizational Structure — year view, years and one entry against real MySQL (T-01)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fixtures: OrgFixtures;
  let today = 2026;

  // Fixture ids (suffix -> id) and staff carnets.
  const id: Record<string, number> = {};
  let dir: string;
  let delA: string;
  let delB: string;

  const asAdmin = {
    'x-test-roles': JSON.stringify([SecRolesEnum.CENTER_ADMIN]),
  };
  const asSystemAdmin = {
    'x-test-roles': JSON.stringify([SecRolesEnum.SYSTEM_ADMIN]),
  };
  const asContributor = {
    'x-test-roles': JSON.stringify([SecRolesEnum.CONTRIBUTOR]),
  };

  const ours = (rows: Array<{ code: string }>) =>
    rows.filter((r) => r.code.startsWith(ORG_FIXTURE_PREFIX));

  const view = async (year: number, includeEnded = false) => {
    const res = await request(app.getHttpServer())
      .get(`/units?year=${year}&includeEnded=${includeEnded}`)
      .set(asAdmin);
    expect(res.status).toBe(200);
    return ours(res.body.data) as Array<any>;
  };

  const codes = (rows: Array<{ code: string }>) =>
    rows.map((r) => r.code.replace(ORG_FIXTURE_PREFIX, '')).sort();

  beforeAll(async () => {
    dataSource = await createOrgTestDataSource('org-structure-year-view');
    fixtures = new OrgFixtures(dataSource);

    dir = await fixtures.staff('S1', 'Ana', 'Perez', true);
    delA = await fixtures.staff('S2', 'Luis', 'Gomez', false);
    delB = await fixtures.staff('S3', 'Marta', 'Ruiz', true);

    // Two parents, both open-ended from 2026.
    id.P1 = await fixtures.unit('P1', [
      { from: 2026, to: null, name: 'Parent One', levelId: 21 },
    ]);
    id.P2 = await fixtures.unit('P2', [
      { from: 2026, to: null, name: 'Parent Two', levelId: 21 },
    ]);
    // A: moved from P1 to P2 in 2027 (two versions, different parents), with a
    // director on the first version only.
    id.A = await fixtures.unit('A', [
      {
        from: 2026,
        to: 2027,
        name: 'Alpha',
        acronym: 'ALP',
        levelId: 22,
        parentId: id.P1,
        directorCarnet: dir,
      },
      {
        from: 2027,
        to: null,
        name: 'Alpha',
        acronym: 'ALP',
        levelId: 22,
        parentId: id.P2,
      },
    ]);
    // B: ended (deleted) from 2027; its only version is [2026, 2027).
    id.B = await fixtures.unit(
      'B',
      [{ from: 2026, to: 2027, name: 'Bravo', levelId: 23, parentId: id.P1 }],
      { status: 'deleted', statusFromYear: 2027 },
    );
    // C: created in 2028.
    id.C = await fixtures.unit('C', [
      { from: 2028, to: null, name: 'Charlie', levelId: 23, parentId: id.P2 },
    ]);
    // D: ended later, inactive from 2029 (one-year-overlap sweep).
    id.D = await fixtures.unit(
      'D',
      [{ from: 2027, to: 2029, name: 'Delta', levelId: 23, parentId: id.P1 }],
      { status: 'inactive', statusFromYear: 2029 },
    );
    // Delegates are the CURRENT list of an entry, not per year.
    await fixtures.delegate(id.A, delA);
    await fixtures.delegate(id.A, delB);

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationalStructureController],
      providers: [
        OrgStructureReadService,
        // T-02: the controller also takes the write service; these suites only
        // call the read handlers, so it gets inert collaborators.
        { provide: OrgStructureService, useValue: {} },
        { provide: OrgStructureClock, useValue: { currentYear: () => today } },
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
        OrgUnitUsageRegistry,
        Reflector,
        RolesGuard,
      ],
    })
      .overrideInterceptor(SetUpInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    app = moduleRef.createNestApplication();
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
    try {
      if (app) await app.close();
      await fixtures?.cleanup();
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  beforeEach(() => {
    today = 2026;
  });

  describe('year coverage on the rows MySQL returns (R-ORG-006 AC.1, AC.2)', () => {
    it('2026: A under P1, B (ended 2027) still present, C and D absent', async () => {
      const rows = await view(2026);

      expect(codes(rows)).toEqual(['A', 'B', 'P1', 'P2']);
      const a = rows.find((r) => r.code.endsWith('A'));
      expect(a.version).toMatchObject({
        from: 2026,
        to: 2027,
        parentId: id.P1,
      });
      expect(a.version.parentCode).toBe(`${ORG_FIXTURE_PREFIX}P1`);
      expect(a.version.parentName).toBe('Parent One');
      // D-ORG-4: the level label follows the value id (22 = L3), and the editable
      // display name comes separately from control_list_values.value.
      expect(a.version.levelCode).toBe('L3');
      expect(a.version.levelName).toEqual(expect.any(String));
    });

    it('2027: A has moved to P2, B is NOT shown (ended from 2027), D starts, C absent', async () => {
      const rows = await view(2027);

      expect(codes(rows)).toEqual(['A', 'D', 'P1', 'P2']);
      const a = rows.find((r) => r.code.endsWith('A'));
      expect(a.version).toMatchObject({
        from: 2027,
        to: null,
        parentId: id.P2,
      });
      expect(a.version.parentName).toBe('Parent Two');
    });

    it('2028: open-ended entries are still shown, C appears, B is gone (open-ended `to IS NULL` branch)', async () => {
      const rows = await view(2028);

      expect(codes(rows)).toEqual(['A', 'C', 'D', 'P1', 'P2']);
      for (const open of ['A', 'P1', 'P2', 'C']) {
        const row = rows.find((r) => r.code.endsWith(`_${open}`));
        expect(row.version.to).toBeNull();
      }
    });

    it('2029: D (version [2027, 2029)) is gone, boundary `to` excluded', async () => {
      const rows = await view(2029);

      expect(codes(rows)).toEqual(['A', 'C', 'P1', 'P2']);
    });

    it('with Show inactive/deleted, an entry ended in a later year appears in 2027 with its status and the year it took effect', async () => {
      const rows = await view(2027, true);

      expect(codes(rows)).toEqual(['A', 'B', 'D', 'P1', 'P2']);
      const b = rows.find((r) => r.code.endsWith('_B'));
      expect(b).toMatchObject({ status: 'deleted', statusFromYear: 2027 });
      expect(b.version).toMatchObject({ from: 2026, to: 2027, name: 'Bravo' });
      // Its parent is resolved at the last year it covered (2026).
      expect(b.version.parentName).toBe('Parent One');
    });

    it('an entry ended in 2029 shows as inactive in 2030 (includeEnded) and never twice', async () => {
      const rows = await view(2030, true);

      expect(codes(rows)).toEqual(['A', 'B', 'C', 'D', 'P1', 'P2']);
      expect(rows.filter((r) => r.code.endsWith('_D'))).toHaveLength(1);
      expect(rows.find((r) => r.code.endsWith('_D'))).toMatchObject({
        status: 'inactive',
        statusFromYear: 2029,
      });
    });

    it('includeEnded changes nothing for a year before any entry ended', async () => {
      expect(codes(await view(2026, true))).toEqual(codes(await view(2026)));
    });

    it('an entry created later is excluded from earlier years even with includeEnded', async () => {
      expect(codes(await view(2027, true))).not.toContain('C');
    });

    it('three years without change return the SAME version of an untouched entry (R-ORG-004)', async () => {
      const versions = [];
      for (const year of [2026, 2027, 2028]) {
        const rows = await view(year);
        versions.push(rows.find((r) => r.code.endsWith('_P1')).version);
      }
      expect(versions[0]).toEqual(versions[1]);
      expect(versions[1]).toEqual(versions[2]);
      expect(versions[0]).toMatchObject({ from: 2026, to: null });
    });

    it('agrees with the pure isYearCovered for every fixture entry and every year 2024-2030', async () => {
      const spans: Record<string, Array<[number, number | null]>> = {
        P1: [[2026, null]],
        P2: [[2026, null]],
        A: [
          [2026, 2027],
          [2027, null],
        ],
        B: [[2026, 2027]],
        C: [[2028, null]],
        D: [[2027, 2029]],
      };
      for (let year = 2024; year <= 2030; year++) {
        const expected = Object.entries(spans)
          .filter(([, versions]) =>
            versions.some(([from, to]) => isYearCovered(from, to, year)),
          )
          .map(([suffix]) => suffix)
          .sort();
        expect({ year, got: codes(await view(year)) }).toEqual({
          year,
          got: expected,
        });
      }
    });

    it('exactly one row per entry in any year (no duplicate through the parent join)', async () => {
      for (const year of [2026, 2027, 2028, 2029]) {
        const rows = await view(year, true);
        expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
      }
    });
  });

  describe('scheduled change (R-ORG-006 AC.3)', () => {
    it('scheduledFromYear is the smallest later version start; null when none', async () => {
      const rows2026 = await view(2026);
      expect(
        rows2026.find((r) => r.code.endsWith('_A')).scheduledFromYear,
      ).toBe(2027);
      expect(
        rows2026.find((r) => r.code.endsWith('_P1')).scheduledFromYear,
      ).toBeNull();
      const rows2027 = await view(2027);
      expect(
        rows2027.find((r) => r.code.endsWith('_A')).scheduledFromYear,
      ).toBeNull();
    });
  });

  describe('director joined from staff (R-ORG-016 read half)', () => {
    it('returns the carnet, the name and the email from the staff table, active', async () => {
      const a = (await view(2026)).find((r) => r.code.endsWith('_A'));
      expect(a.version.director).toEqual({
        carnet: dir,
        name: 'Ana Perez',
        email: 's1@example.org',
        isActiveStaff: true,
      });
      expect(
        (await view(2027)).find((r) => r.code.endsWith('_A')).version.director,
      ).toBeNull();
    });

    it('marks a director whose staff row later became inactive, still shown for the past year', async () => {
      await dataSource.query(
        `UPDATE alliance_user_staff SET is_active = 0 WHERE carnet = ?`,
        [dir],
      );
      try {
        const a = (await view(2026)).find((r) => r.code.endsWith('_A'));
        expect(a.version.director).toMatchObject({
          carnet: dir,
          name: 'Ana Perez',
          isActiveStaff: false,
        });
      } finally {
        await dataSource.query(
          `UPDATE alliance_user_staff SET is_active = 1 WHERE carnet = ?`,
          [dir],
        );
      }
    });
  });

  describe('delegates (R-ORG-017 read half)', () => {
    it('an entry with two delegate rows returns both, identically, in the 2026 AND 2027 views (current list, not per year)', async () => {
      const expected = [
        {
          carnet: delA,
          name: 'Luis Gomez',
          email: 's2@example.org',
          isActiveStaff: false,
        },
        {
          carnet: delB,
          name: 'Marta Ruiz',
          email: 's3@example.org',
          isActiveStaff: true,
        },
      ];
      for (const year of [2026, 2027]) {
        const a = (await view(year)).find((r) => r.code.endsWith('_A'));
        expect(a.delegates).toEqual(expected);
      }
    });

    it('an entry without delegates returns an empty list', async () => {
      const p1 = (await view(2026)).find((r) => r.code.endsWith('_P1'));
      expect(p1.delegates).toEqual([]);
    });
  });

  describe('years (B2)', () => {
    it('spans the earliest to the latest version start and contains the current year', async () => {
      const res = await request(app.getHttpServer()).get('/years').set(asAdmin);

      expect(res.status).toBe(200);
      expect(res.body.data.current).toBe(2026);
      expect(res.body.data.min).toBeLessThanOrEqual(2026);
      expect(res.body.data.max).toBeGreaterThanOrEqual(2028);
    });

    it('follows the injected clock: today in 2027 -> current 2027', async () => {
      today = 2027;
      const res = await request(app.getHttpServer()).get('/years').set(asAdmin);
      expect(res.body.data.current).toBe(2027);
      expect(res.body.data.min).toBeLessThanOrEqual(2026);
    });
  });

  describe('default year and range (B1)', () => {
    it('without `year`, the view is the current year of the clock', async () => {
      today = 2027;
      const res = await request(app.getHttpServer()).get('/units').set(asAdmin);
      expect(codes(ours(res.body.data))).toEqual(['A', 'D', 'P1', 'P2']);
    });

    it.each(['1999', '2037', '20277'])('year=%s -> 400', async (year) => {
      const res = await request(app.getHttpServer())
        .get(`/units?year=${year}`)
        .set(asAdmin);
      expect(res.status).toBe(400);
    });

    it('a stale portfolioId parameter -> 400 (R-ORG-001)', async () => {
      const res = await request(app.getHttpServer())
        .get('/units?year=2026&portfolioId=1')
        .set(asAdmin);
      expect(res.status).toBe(400);
    });
  });

  describe('one entry (B5)', () => {
    it('returns the entry with its versions oldest first, parents resolved and the delegates', async () => {
      const res = await request(app.getHttpServer())
        .get(`/units/${id.A}`)
        .set(asAdmin);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data).toMatchObject({
        id: id.A,
        code: `${ORG_FIXTURE_PREFIX}A`,
        status: 'active',
        statusFromYear: null,
        successorId: null,
      });
      expect(data.versions.map((v) => [v.from, v.to])).toEqual([
        [2026, 2027],
        [2027, null],
      ]);
      expect(data.versions.map((v) => v.parentName)).toEqual([
        'Parent One',
        'Parent Two',
      ]);
      expect(data.versions[0].director.carnet).toBe(dir);
      expect(data.delegates.map((d) => d.carnet)).toEqual([delA, delB]);
    });

    it('an ended entry reports its status and the year it took effect', async () => {
      const res = await request(app.getHttpServer())
        .get(`/units/${id.B}`)
        .set(asAdmin);
      expect(res.body.data).toMatchObject({
        status: 'deleted',
        statusFromYear: 2027,
      });
    });

    it('unknown id -> 404, non-numeric id -> 400', async () => {
      expect(
        (
          await request(app.getHttpServer())
            .get('/units/999999999')
            .set(asAdmin)
        ).status,
      ).toBe(404);
      expect(
        (await request(app.getHttpServer()).get('/units/abc').set(asAdmin))
          .status,
      ).toBe(400);
    });
  });

  describe('access control through the real RolesGuard (R-ORG-012 AC.1, NFR-ORG-004)', () => {
    it.each([['/units?year=2026'], ['/years'], ['/units/1']])(
      'a Contributor gets 403 on GET %s',
      async (path) => {
        const res = await request(app.getHttpServer())
          .get(path)
          .set(asContributor);
        expect(res.status).toBe(403);
      },
    );

    it('a Contributor gets 403 and receives no data', async () => {
      const res = await request(app.getHttpServer())
        .get('/units?year=2026')
        .set(asContributor);
      expect(res.body.data).toBeUndefined();
    });

    it.each([
      ['Center Admin', asAdmin],
      ['System Admin', asSystemAdmin],
    ])('%s gets 200 on B1, B2 and B5', async (_label, headers) => {
      for (const path of ['/units?year=2026', '/years', `/units/${id.P1}`]) {
        const res = await request(app.getHttpServer()).get(path).set(headers);
        expect(res.status).toBe(200);
      }
    });

    it('a Technical Support user (not granted, D-CTL-7) gets 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/years')
        .set({
          'x-test-roles': JSON.stringify([SecRolesEnum.TECHNICAL_SUPPORT]),
        });
      expect(res.status).toBe(403);
    });
  });
});

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
import { OrgStructureWriteRepository } from '../src/domain/entities/organizational-structure/repositories/org-structure-write.repository';
import { OrgUnitRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit.repository';
import { OrgUnitVersionRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-version.repository';
import { OrgUnitDelegateRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-delegate.repository';
import { ControlListValueLookupService } from '../src/domain/entities/control-lists/control-list-value-lookup.service';
import { ControlListRepository } from '../src/domain/entities/control-lists/repositories/control-list.repository';
import { ControlListValueRepository } from '../src/domain/entities/control-lists/repositories/control-list-value.repository';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_T02_PREFIX,
} from './support/org-structure-fixtures';

/**
 * Organizational Structure save engine (B3, B4, B9, B10) against the REAL
 * local MySQL (docs/specs/institutional-performance/organizational-structure,
 * T-02). The properties that live in generated SQL or in the database
 * (transaction rollback, case-insensitive unique code, the staff search
 * precedence, other entries' rows untouched, FK-resolved staff) are asserted
 * here on real rows, never on a mock (KZ-001).
 *
 * Scope note (KZ-017): a test-only middleware stands in for `JwtMiddleware`;
 * `GlobalExceptions` / `ResponseInterceptor` / Swagger are NOT mounted, so this
 * suite proves status codes, `data` and the Nest default error body, not the
 * wire envelope (pinned by the `*-exceptions.spec.ts` unit suites). The clock is
 * an injected stub; `today` is "now". Evidence DB: local `ari_local_mysql`; only
 * `__T01_` staff / `__T02_` entries are created and removed in `afterAll`;
 * control-list values 20-23 are READ only.
 */
describe('Organizational Structure — save engine against real MySQL (T-02)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fixtures: OrgFixtures;
  let writeRepo: OrgStructureWriteRepository;
  let today = 2026;
  let seq = 0;

  let dir: string;
  let del1: string;
  let del2: string;
  let root: number;
  let deptA: number;
  let deptC: number;

  const as = (role: SecRolesEnum) => ({
    'x-test-roles': JSON.stringify([role]),
  });
  const admin = as(SecRolesEnum.CENTER_ADMIN);
  const contributor = as(SecRolesEnum.CONTRIBUTOR);
  const code = (tag: string) => `${ORG_T02_PREFIX}${tag}${++seq}`;

  const post = (body: Record<string, unknown>, headers = admin) =>
    request(app.getHttpServer()).post('/units').set(headers).send(body);
  const patch = (id: number, body: Record<string, unknown>, headers = admin) =>
    request(app.getHttpServer()).patch(`/units/${id}`).set(headers).send(body);
  const created = async (body: Record<string, unknown>) => {
    const res = await post({ code: code('E'), appliesFromYear: 2026, ...body });
    expect(res.status).toBe(201);
    fixtures.unitIds.push(res.body.data.id);
    return res.body.data.id as number;
  };
  const query = (sql: string, params: unknown[] = []) =>
    dataSource.query(sql, params);
  const versionsOf = async (id: number) =>
    (
      await query(
        `SELECT valid_from_year AS f, valid_to_year AS t, parent_id AS p, name, director_carnet AS d
         FROM org_unit_versions WHERE org_unit_id = ? ORDER BY valid_from_year`,
        [id],
      )
    ).map((v: any) => ({ ...v, p: v.p === null ? null : Number(v.p) }));
  const logsOf = async (id: number) => {
    const rows = await query(
      `SELECT action, applies_from_year, backdated, changes, created_at,
              TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age
         FROM org_unit_change_log WHERE org_unit_id = ? ORDER BY id`,
      [id],
    );
    return rows.map((r: any) => ({
      ...r,
      changes:
        typeof r.changes === 'string' ? JSON.parse(r.changes) : r.changes,
    }));
  };
  const delegatesOf = async (id: number) =>
    (
      await query(
        `SELECT staff_carnet AS c FROM org_unit_delegates WHERE org_unit_id = ? ORDER BY id`,
        [id],
      )
    ).map((r: any) => r.c);
  const count = async (table: string) =>
    Number((await query(`SELECT COUNT(*) AS n FROM ${table}`))[0].n);
  const otherRows = (except: number) =>
    query(
      `SELECT * FROM org_unit_versions WHERE org_unit_id <> ? ORDER BY id`,
      [except],
    );
  const yearView = async (year: number) => {
    const res = await request(app.getHttpServer())
      .get(`/units?year=${year}`)
      .set(admin);
    expect(res.status).toBe(200);
    return res.body.data as any[];
  };

  beforeAll(async () => {
    dataSource = await createOrgTestDataSource('org-structure-save');
    fixtures = new OrgFixtures(dataSource);
    dir = await fixtures.staff('ZA', 'Ana', 'Pereira', true);
    del1 = await fixtures.staff('ZB', 'Luis', 'Gomez', true);
    del2 = await fixtures.staff('ZC', 'Marta', 'Ruiz', true);

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationalStructureController],
      providers: [
        OrgStructureService,
        OrgStructureReadService,
        { provide: OrgStructureClock, useValue: { currentYear: () => today } },
        { provide: CurrentUserUtil, useValue: { user_id: 4242 } },
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
          provide: ControlListRepository,
          useFactory: () => new ControlListRepository(dataSource),
        },
        {
          provide: ControlListValueRepository,
          useFactory: () => new ControlListValueRepository(dataSource),
        },
        ControlListValueLookupService,
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
    writeRepo = app.get(OrgStructureWriteRepository);

    // A small tree created through the write path: L1 root, two departments.
    root = await created({ levelId: 20, name: 'Alliance' });
    deptA = await created({ levelId: 21, name: 'Dept A', parentId: root });
    deptC = await created({ levelId: 21, name: 'Dept C', parentId: root });
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

  describe('create and move (R-ORG-004, R-ORG-009)', () => {
    it('create returns 201 with a system id, one row [2026, open) and ONE create log row', async () => {
      const id = await created({
        levelId: 23,
        name: 'Unit one',
        parentId: deptA,
        directorCarnet: dir,
      });
      expect(await versionsOf(id)).toEqual([
        expect.objectContaining({ f: 2026, t: null, p: deptA, d: dir }),
      ]);
      const logs = await logsOf(id);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        action: 'create',
        applies_from_year: 2026,
        backdated: 0,
      });
    });

    it('move from 2027 -> two rows with the right ranges; the year views follow; no other entry row changes (R-ORG-004 AC.3)', async () => {
      const id = await created({ levelId: 23, name: 'Mover', parentId: deptA });
      const before = JSON.stringify(await otherRows(id));

      const res = await patch(id, { parentId: deptC, appliesFromYear: 2027 });
      expect(res.status).toBe(200);
      expect((await versionsOf(id)).map((v: any) => [v.f, v.t, v.p])).toEqual([
        [2026, 2027, deptA],
        [2027, null, deptC],
      ]);
      expect(JSON.stringify(await otherRows(id))).toBe(before); // row CONTENTS, not counts

      const parentIn = async (year: number) =>
        (await yearView(year)).find((r) => r.id === id).version.parentId;
      expect(await parentIn(2026)).toBe(deptA);
      expect(await parentIn(2027)).toBe(deptC);

      const logs = await logsOf(id);
      expect(logs.map((l: any) => l.action)).toEqual(['create', 'new_version']);
      expect(logs[1]).toMatchObject({ applies_from_year: 2027, backdated: 0 });
    });

    it('a typo fix in the start year edits in place: still one row, the log keeps the old and new name', async () => {
      const id = await created({
        levelId: 23,
        name: 'Data Science',
        parentId: deptA,
      });
      expect(
        (await patch(id, { name: 'Data Sciences', appliesFromYear: 2026 }))
          .status,
      ).toBe(200);
      expect(await versionsOf(id)).toEqual([
        expect.objectContaining({ name: 'Data Sciences' }),
      ]);
      const [, edit] = await logsOf(id);
      expect(edit.action).toBe('edit_in_place');
      expect(edit.changes.name).toEqual({
        old: 'Data Science',
        new: 'Data Sciences',
      });
    });
  });

  describe('children keep a valid parent level (I-3 for children)', () => {
    it('L2 -> L1 PATCH with an L3 child is 400 naming `level` and the version rows of both entries are unchanged', async () => {
      const dept = await created({
        levelId: 21,
        name: 'Dept L2',
        parentId: root,
      });
      const office = await created({
        levelId: 22,
        name: 'Office L3',
        parentId: dept,
      });
      const before = JSON.stringify([
        await versionsOf(dept),
        await versionsOf(office),
        await otherRows(0),
      ]);

      const res = await patch(dept, {
        levelId: 20,
        parentId: null,
        appliesFromYear: 2026,
      });

      expect(res.status).toBe(400);
      expect(res.body.message.field).toBe('level');
      expect(res.body.message.description).toContain(`${ORG_T02_PREFIX}E`);
      expect(
        JSON.stringify([
          await versionsOf(dept),
          await versionsOf(office),
          await otherRows(0),
        ]),
      ).toBe(before);
      expect(await logsOf(dept)).toHaveLength(1);
    });
  });

  describe('save outcome on the wire (design 4)', () => {
    it('B9 reports create and B10 reports what it actually did, including null for a no-op', async () => {
      const make = await post({
        code: code('O'),
        levelId: 23,
        name: 'Outcome',
        parentId: deptA,
        appliesFromYear: 2026,
      });
      expect(make.status).toBe(201);
      fixtures.unitIds.push(make.body.data.id);
      expect(make.body.data.outcome).toEqual({
        action: 'create',
        appliesFromYear: 2026,
        backdated: false,
      });
      const id = make.body.data.id;

      const moved = await patch(id, { parentId: deptC, appliesFromYear: 2027 });
      expect(moved.body.data.outcome).toEqual({
        action: 'new_version',
        appliesFromYear: 2027,
        backdated: false,
      });
      const renamed = await patch(id, {
        name: 'Outcome 2',
        appliesFromYear: 2027,
      });
      expect(renamed.body.data.outcome.action).toBe('edit_in_place');
      const noop = await patch(id, {
        name: 'Outcome 2',
        appliesFromYear: 2027,
      });
      expect(noop.body.data.outcome).toEqual({
        action: null,
        appliesFromYear: null,
        backdated: false,
      });
      expect(await logsOf(id)).toHaveLength(3);
    });
  });

  describe('back-date (R-ORG-005)', () => {
    it('without the flag -> 400 and no row changes; with the flag the 2026 and 2027 views move and the log records the back-date', async () => {
      today = 2027;
      const id = await created({
        levelId: 23,
        name: 'Back',
        parentId: deptA,
        appliesFromYear: 2026,
        backdate: true,
      });
      const before = JSON.stringify(await versionsOf(id));

      const denied = await patch(id, {
        parentId: deptC,
        appliesFromYear: 2026,
      });
      expect(denied.status).toBe(400);
      expect(denied.body.message.field).toBe('backdate');
      expect(JSON.stringify(await versionsOf(id))).toBe(before);

      expect(
        (
          await patch(id, {
            parentId: deptC,
            appliesFromYear: 2026,
            backdate: true,
          })
        ).status,
      ).toBe(200);
      for (const year of [2026, 2027]) {
        expect(
          (await yearView(year)).find((r) => r.id === id).version.parentId,
        ).toBe(deptC);
      }
      const logs = await logsOf(id);
      const last = logs[logs.length - 1];
      expect(last).toMatchObject({
        action: 'edit_in_place',
        applies_from_year: 2026,
        backdated: 1,
      });
      expect(Number(last.age)).toBeLessThan(120); // created_at is "now", not the applies-from year
    });
  });

  describe('delegates (R-ORG-017)', () => {
    it('a delegates-only PATCH adds NO version row, replaces the delegate rows and writes exactly one delegates_change row with old and new', async () => {
      const id = await created({
        levelId: 23,
        name: 'Deleg',
        parentId: deptA,
        directorCarnet: dir,
        delegateCarnets: [del1],
      });
      const versionsBefore = JSON.stringify(await versionsOf(id));
      const rowsBefore = Number(
        (
          await query(
            `SELECT COUNT(*) AS n FROM org_unit_versions WHERE org_unit_id = ?`,
            [id],
          )
        )[0].n,
      );

      const res = await patch(id, { delegateCarnets: [del2] });
      expect(res.status).toBe(200);
      expect(
        Number(
          (
            await query(
              `SELECT COUNT(*) AS n FROM org_unit_versions WHERE org_unit_id = ?`,
              [id],
            )
          )[0].n,
        ),
      ).toBe(rowsBefore);
      expect(JSON.stringify(await versionsOf(id))).toBe(versionsBefore);
      expect(await delegatesOf(id)).toEqual([del2]);
      const logs = (await logsOf(id)).filter(
        (l: any) => l.action === 'delegates_change',
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].changes.delegates).toEqual({ old: [del1], new: [del2] });
      expect(logs[0].applies_from_year).toBeNull();
    });

    it('the director cannot be a delegate and the failed save changes nothing', async () => {
      const id = await created({
        levelId: 23,
        name: 'Overlap',
        parentId: deptA,
        directorCarnet: dir,
      });
      const res = await patch(id, { delegateCarnets: [dir] });
      expect(res.status).toBe(400);
      expect(res.body.message.field).toBe('delegates');
      expect(await delegatesOf(id)).toEqual([]);
      expect(await logsOf(id)).toHaveLength(1);
    });
  });

  describe('staff (R-ORG-016, P-14)', () => {
    it('an inactive director keeps resolving in the past version with the CURRENT name and email, and B4 stops offering them', async () => {
      const staff = await fixtures.staff('ZD', 'Elena', 'Zqdirect', true);
      const id = await created({
        levelId: 23,
        name: 'Staffed',
        parentId: deptA,
        directorCarnet: staff,
      });
      const search = async () =>
        (
          await request(app.getHttpServer())
            .get('/staff?search=Zqdirect')
            .set(admin)
        ).body.data as any[];
      expect((await search()).map((s) => s.carnet)).toEqual([staff]);

      await query(
        `UPDATE alliance_user_staff SET is_active = 0, first_name = 'Elenita' WHERE carnet = ?`,
        [staff],
      );
      try {
        const detail = (
          await request(app.getHttpServer()).get(`/units/${id}`).set(admin)
        ).body.data;
        expect(detail.versions[0].director).toMatchObject({
          carnet: staff,
          name: 'Elenita Zqdirect',
          isActiveStaff: false,
        });
        expect(await search()).toEqual([]);
      } finally {
        await query(
          `UPDATE alliance_user_staff SET is_active = 1, first_name = 'Elena' WHERE carnet = ?`,
          [staff],
        );
      }
      expect((await search()).map((s) => s.carnet)).toEqual([staff]);
    });

    it('B4 never returns an inactive person who matches ONLY by last name or ONLY by email (P-10 precedence, real SQL)', async () => {
      const act = await fixtures.staff('ZQ1', 'Alma', 'Zquark', true);
      const inLast = await fixtures.staff('ZQ2', 'Berta', 'Zquark', false);
      const inMail = await fixtures.staff('ZQ3', 'Carla', 'Other', false);
      const search = async (term: string) =>
        (
          await request(app.getHttpServer())
            .get(`/staff?search=${encodeURIComponent(term)}`)
            .set(admin)
        ).body.data.map((s: any) => s.carnet);

      expect(await search('Zquark')).toEqual([act]);
      expect(await search('Zquark')).not.toContain(inLast);
      expect(await search('zq3@example')).not.toContain(inMail);
      expect(await search('zq3@example')).toEqual([]);
    });

    it('B4 returns at most 20 rows and escapes LIKE wildcards', async () => {
      for (let i = 0; i < 21; i++) {
        await fixtures.staff(
          `Y${String(i).padStart(2, '0')}`,
          `Name${i}`,
          'Zybulk',
          true,
        );
      }
      const res = await request(app.getHttpServer())
        .get('/staff?search=Zybulk')
        .set(admin);
      expect(res.body.data).toHaveLength(20);
      const wild = await request(app.getHttpServer())
        .get('/staff?search=%25%25')
        .set(admin);
      expect(wild.body.data).toEqual([]); // a literal "%%", not "match everything"
    });

    it('B4 with one character -> 400', async () => {
      expect(
        (await request(app.getHttpServer()).get('/staff?search=a').set(admin))
          .status,
      ).toBe(400);
    });
  });

  describe('codes, levels and validation on the real database (R-ORG-002, R-ORG-003)', () => {
    it('a code owned by another entry, in any case and any status, is a 409 naming `code` (collation, not a mock)', async () => {
      const live = code('Dup');
      await created({
        code: live,
        levelId: 23,
        name: 'Owner',
        parentId: deptA,
      });
      const res = await post({
        code: live.toLowerCase(),
        levelId: 23,
        name: 'Clash',
        parentId: deptA,
        appliesFromYear: 2026,
      });
      expect(res.status).toBe(409);
      expect(res.body.message.field).toBe('code');

      const gone = code('Gone');
      const insert = await query(
        `INSERT INTO org_units (code, status, status_from_year, created_at) VALUES (?, 'deleted', 2027, NOW())`,
        [gone],
      );
      fixtures.unitIds.push(Number(insert.insertId));
      await fixtures.version(Number(insert.insertId), {
        from: 2026,
        to: 2027,
        name: 'Gone',
      });
      const deleted = await post({
        code: gone.toLowerCase(),
        levelId: 23,
        name: 'Clash',
        parentId: deptA,
        appliesFromYear: 2026,
      });
      expect(deleted.status).toBe(409);
    });

    it('B3 proposes ORG-(max+1) padded to 3, equal to an independent SQL formulation', async () => {
      const res = await request(app.getHttpServer())
        .get('/units/code-proposal')
        .set(admin);
      expect(res.status).toBe(200);
      const [{ next }] = await query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)), 0) + 1 AS next
           FROM org_units WHERE code REGEXP '^ORG-[0-9]+$'`,
      );
      expect(res.body.data.code).toBe(`ORG-${String(next).padStart(3, '0')}`);
    });

    it('levels: a value of another list, id 24 and a fabricated id are 400 naming `level`; the real lookup runs', async () => {
      const [other] = await query(
        `SELECT cv.id FROM control_list_values cv JOIN control_lists cl ON cl.id = cv.list_id
          WHERE cl.list_key <> 'org.level' LIMIT 1`,
      );
      for (const levelId of [
        other ? Number(other.id) : undefined,
        24,
        999999999,
      ].filter((v) => v !== undefined)) {
        const res = await post({
          code: code('L'),
          levelId,
          name: 'Bad level',
          parentId: deptA,
          appliesFromYear: 2026,
        });
        expect(res.status).toBe(400);
        expect(res.body.message.field).toBe('level');
      }
    });

    it('wrong parent level and a non-existent director are 400 and store nothing', async () => {
      const units = await count('org_units');
      const wrong = await post({
        code: code('P'),
        levelId: 20,
        name: 'L1 under L2',
        parentId: deptA,
        appliesFromYear: 2026,
      });
      expect([wrong.status, wrong.body.message.field]).toEqual([400, 'parent']);
      const ghost = await post({
        code: code('G'),
        levelId: 23,
        name: 'Ghost',
        parentId: deptA,
        directorCarnet: 'Z9999',
        appliesFromYear: 2026,
      });
      expect([ghost.status, ghost.body.message.field]).toEqual([
        400,
        'director',
      ]);
      expect(await count('org_units')).toBe(units);
    });

    it.each(['id', 'portfolioId', 'directorName', 'directorEmail'])(
      'a body with `%s` is a 400 and writes nothing',
      async (field) => {
        const units = await count('org_units');
        const res = await post({
          code: code('W'),
          levelId: 20,
          name: 'X',
          appliesFromYear: 2026,
          [field]: 1,
        });
        expect(res.status).toBe(400);
        expect(await count('org_units')).toBe(units);
      },
    );
  });

  describe('atomicity (I-5)', () => {
    it('a failure writing the log row rolls back the entry and its version (real transaction)', async () => {
      const units = await count('org_units');
      const versions = await count('org_unit_versions');
      const spy = jest
        .spyOn(writeRepo, 'insertLog')
        .mockRejectedValueOnce(new Error('forced log failure'));
      try {
        const res = await post({
          code: code('Tx'),
          levelId: 23,
          name: 'Rolled back',
          parentId: deptA,
          appliesFromYear: 2026,
        });
        expect(res.status).toBe(500);
      } finally {
        spy.mockRestore();
      }
      expect(await count('org_units')).toBe(units);
      expect(await count('org_unit_versions')).toBe(versions);
    });

    it('a failure writing the log row of a move leaves the versions as they were', async () => {
      const id = await created({ levelId: 23, name: 'Stays', parentId: deptA });
      const before = JSON.stringify(await versionsOf(id));
      const spy = jest
        .spyOn(writeRepo, 'insertLog')
        .mockRejectedValueOnce(new Error('forced log failure'));
      try {
        expect(
          (await patch(id, { parentId: deptC, appliesFromYear: 2027 })).status,
        ).toBe(500);
      } finally {
        spy.mockRestore();
      }
      expect(JSON.stringify(await versionsOf(id))).toBe(before);
      expect(await logsOf(id)).toHaveLength(1);
    });
  });

  describe('access (R-ORG-012)', () => {
    it('a Contributor gets 403 on B3, B4, B9 and B10 and nothing is written', async () => {
      const units = await count('org_units');
      const logs = await count('org_unit_change_log');
      const versions = await count('org_unit_versions');
      const id = deptA;

      expect(
        (
          await request(app.getHttpServer())
            .get('/units/code-proposal')
            .set(contributor)
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app.getHttpServer())
            .get('/staff?search=ab')
            .set(contributor)
        ).status,
      ).toBe(403);
      expect(
        (
          await post(
            { code: code('C'), levelId: 20, name: 'X', appliesFromYear: 2026 },
            contributor,
          )
        ).status,
      ).toBe(403);
      expect((await patch(id, { code: code('C2') }, contributor)).status).toBe(
        403,
      );

      expect(await count('org_units')).toBe(units);
      expect(await count('org_unit_change_log')).toBe(logs);
      expect(await count('org_unit_versions')).toBe(versions);
    });

    it('Center Admin and System Admin succeed on B9', async () => {
      const a = await post(
        {
          code: code('S'),
          levelId: 20,
          name: 'By admin',
          appliesFromYear: 2026,
        },
        admin,
      );
      const s = await post(
        {
          code: code('S'),
          levelId: 20,
          name: 'By system',
          appliesFromYear: 2026,
        },
        as(SecRolesEnum.SYSTEM_ADMIN),
      );
      expect([a.status, s.status]).toEqual([201, 201]);
      fixtures.unitIds.push(a.body.data.id, s.body.data.id);
    });
  });
});

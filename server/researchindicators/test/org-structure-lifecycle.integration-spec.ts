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
import { OrgUnitUsageRegistry } from '../src/domain/entities/organizational-structure/org-unit-usage.registry';
import { OrgStructureWriteRepository } from '../src/domain/entities/organizational-structure/repositories/org-structure-write.repository';
import { OrgUnitRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit.repository';
import { OrgUnitVersionRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-version.repository';
import { OrgUnitDelegateRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-delegate.repository';
import { OrgUnitChangeLogRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-change-log.repository';
import { ControlListValueLookupService } from '../src/domain/entities/control-lists/control-list-value-lookup.service';
import { ControlListRepository } from '../src/domain/entities/control-lists/repositories/control-list.repository';
import { ControlListValueRepository } from '../src/domain/entities/control-lists/repositories/control-list-value.repository';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { RolesGuard } from '../src/domain/shared/guards/roles.guard';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { OrgTestConsumer } from './support/org-test-consumer';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_T02_PREFIX,
} from './support/org-structure-fixtures';

/**
 * Organizational Structure lifecycle (B6, B7, B11, B12, B13) against the REAL
 * local MySQL (docs/specs/institutional-performance/organizational-structure,
 * T-03). What lives in the database is asserted on real rows, never on a mock
 * (KZ-001): that a PHYSICAL delete removes the entry, its versions and its
 * delegates through the cascade but leaves the change log (no foreign key), that
 * a LOGICAL delete keeps everything, the children rule "from E" on versions that
 * move under an entry later, and that a blocked action leaves every row as it
 * was.
 *
 * Scope note (KZ-017): a test-only middleware stands in for `JwtMiddleware`;
 * `GlobalExceptions` / `ResponseInterceptor` / Swagger are NOT mounted, so this
 * suite proves status codes, `data` and the Nest default error body, not the
 * wire envelope (pinned by `organizational-structure.lifecycle-wire.spec.ts`).
 * The clock is an injected stub (`today`). Evidence DB: local `127.0.0.1:3306/
 * stardb`; only `__T01_` staff and `__T02_LIF` entries are created and removed
 * in `afterAll`; control-list values 20-23 are READ only.
 */
describe('Organizational Structure — lifecycle against real MySQL (T-03)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fixtures: OrgFixtures;
  let today = 2026;
  let seq = 0;

  const registry = new OrgUnitUsageRegistry();
  const consumer = new OrgTestConsumer();

  let dir: string;
  let del1: string;
  let del2: string;
  let root: number;
  let deptA: number;

  const as = (role: SecRolesEnum) => ({
    'x-test-roles': JSON.stringify([role]),
  });
  const admin = as(SecRolesEnum.CENTER_ADMIN);
  const contributor = as(SecRolesEnum.CONTRIBUTOR);
  const code = () => `${ORG_T02_PREFIX}LIF${++seq}`;

  const http = () => request(app.getHttpServer());
  const post = (body: Record<string, unknown>, headers = admin) =>
    http().post('/units').set(headers).send(body);
  const patch = (id: number, body: Record<string, unknown>, headers = admin) =>
    http().patch(`/units/${id}`).set(headers).send(body);
  const inactivate = (
    id: number,
    body: Record<string, unknown>,
    headers = admin,
  ) => http().post(`/units/${id}/inactivate`).set(headers).send(body);
  const reactivate = (
    id: number,
    body: Record<string, unknown>,
    headers = admin,
  ) => http().post(`/units/${id}/reactivate`).set(headers).send(body);
  const del = (id: number, qs = '', headers = admin) =>
    http().delete(`/units/${id}${qs}`).set(headers);
  const history = (id: number, headers = admin) =>
    http().get(`/units/${id}/history`).set(headers);
  const changeLog = (qs: string, headers = admin) =>
    http().get(`/change-log${qs}`).set(headers);

  const created = async (body: Record<string, unknown>) => {
    const res = await post({
      code: code(),
      levelId: 23,
      name: 'Unit',
      parentId: deptA,
      appliesFromYear: 2026,
      ...body,
    });
    expect(res.status).toBe(201);
    fixtures.unitIds.push(res.body.data.id);
    return res.body.data.id as number;
  };
  const codeOf = async (id: number) =>
    (await query(`SELECT code FROM org_units WHERE id = ?`, [id]))[0]
      .code as string;
  const query = (sql: string, params: unknown[] = []) =>
    dataSource.query(sql, params);
  const rowOf = async (id: number) =>
    (await query(`SELECT * FROM org_units WHERE id = ?`, [id]))[0];
  const versionsOf = async (id: number) =>
    (
      await query(
        `SELECT valid_from_year AS f, valid_to_year AS t, parent_id AS p
           FROM org_unit_versions WHERE org_unit_id = ? ORDER BY valid_from_year`,
        [id],
      )
    ).map((v: any) => [v.f, v.t, v.p === null ? null : Number(v.p)]);
  const logsOf = async (id: number) => {
    const rows = await query(
      `SELECT action, applies_from_year, backdated, changes
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
  /** Every row that could change for these entries: units, versions, delegates, log. */
  const snapshot = async (ids: number[]) => {
    const ph = ids.map(() => '?').join(',');
    return JSON.stringify(
      await Promise.all([
        query(`SELECT * FROM org_units WHERE id IN (${ph}) ORDER BY id`, ids),
        query(
          `SELECT * FROM org_unit_versions WHERE org_unit_id IN (${ph}) ORDER BY id`,
          ids,
        ),
        query(
          `SELECT * FROM org_unit_delegates WHERE org_unit_id IN (${ph}) ORDER BY id`,
          ids,
        ),
        query(
          `SELECT * FROM org_unit_change_log WHERE org_unit_id IN (${ph}) ORDER BY id`,
          ids,
        ),
      ]),
    );
  };
  const yearView = async (year: number, includeEnded = false) => {
    const res = await http()
      .get(`/units?year=${year}&includeEnded=${includeEnded}`)
      .set(admin);
    expect(res.status).toBe(200);
    return res.body.data as any[];
  };

  beforeAll(async () => {
    dataSource = await createOrgTestDataSource('org-structure-lifecycle');
    fixtures = new OrgFixtures(dataSource);
    dir = await fixtures.staff('LA', 'Ana', 'Pereira', true);
    del1 = await fixtures.staff('LB', 'Luis', 'Gomez', true);
    del2 = await fixtures.staff('LC', 'Marta', 'Ruiz', true);

    // The test consumer of design 5.5 / R-ORG-008 "Linked records block".
    consumer.register(registry);

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationalStructureController],
      providers: [
        OrgStructureService,
        OrgStructureReadService,
        { provide: OrgUnitUsageRegistry, useValue: registry },
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
          provide: OrgUnitChangeLogRepository,
          useFactory: () => new OrgUnitChangeLogRepository(dataSource),
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

    root = await created({ levelId: 20, name: 'Alliance', parentId: null });
    deptA = await created({ levelId: 21, name: 'Dept A', parentId: root });
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
      if (fixtures?.unitIds.length) {
        // `successor_id` is RESTRICT: break the links before the rows go.
        // FORCE INDEX keeps this a PRIMARY-key range: as a table scan it
        // X-locks every row (the seeded 1..117 included) until commit and
        // deadlocked with parallel suites' FK checks (T-05).
        const ids = fixtures.unitIds.map(() => '?').join(',');
        await dataSource.query(
          `UPDATE org_units FORCE INDEX (PRIMARY) SET successor_id = NULL WHERE id IN (${ids})`,
          fixtures.unitIds,
        );
      }
      await fixtures?.cleanup();
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  beforeEach(() => {
    today = 2026;
  });

  describe('physical delete (R-ORG-008, R-ORG-009, NFR-ORG-003)', () => {
    it('an entry created this year: rows, versions and delegates are gone, the code is free, and the log keeps create AND delete_physical (B7), B6 is 404', async () => {
      const id = await created({
        name: 'Created by mistake',
        directorCarnet: dir,
        delegateCarnets: [del1],
      });
      const freedCode = await codeOf(id);
      expect(await delegatesOf(id)).toEqual([del1]);

      const res = await del(id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id,
        mode: 'physical',
        fromYear: null,
      });
      expect(await rowOf(id)).toBeUndefined();
      expect(await versionsOf(id)).toEqual([]);
      expect(await delegatesOf(id)).toEqual([]);

      const logs = await logsOf(id);
      expect(logs.map((l: any) => l.action)).toEqual([
        'create',
        'delete_physical',
      ]);
      expect(logs[1].changes).toMatchObject({
        code: { old: freedCode, new: null },
        name: { old: 'Created by mistake', new: null },
        directorCarnet: { old: dir, new: null },
        delegates: { old: [del1], new: [] },
      });

      const viaB7 = await changeLog(`?unitId=${id}`);
      expect(viaB7.status).toBe(200);
      expect(viaB7.body.data.map((r: any) => r.action)).toEqual([
        'delete_physical',
        'create',
      ]);
      expect(viaB7.body.data[0].changes.name).toEqual({
        old: 'Created by mistake',
        new: null,
      });

      const viaB6 = await history(id);
      expect(viaB6.status).toBe(404);
      expect(viaB6.body.message).toBe(`Organizational unit ${id} not found`);

      const again = await post({
        code: freedCode,
        levelId: 23,
        name: 'Again',
        parentId: deptA,
        appliesFromYear: 2026,
      });
      expect(again.status).toBe(201);
      fixtures.unitIds.push(again.body.data.id);
    });
  });

  describe('logical delete (R-ORG-008, R-ORG-006 AC.2)', () => {
    it('with the clock at 2027 an entry first seen in 2026 is NOT removed: marked deleted from 2027, kept in the 2026 view only, delegates stay', async () => {
      const id = await created({ name: 'Old unit', delegateCarnets: [del1] });
      today = 2027;

      const res = await del(id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id,
        mode: 'logical',
        fromYear: 2027,
      });
      expect(await rowOf(id)).toMatchObject({
        status: 'deleted',
        status_from_year: 2027,
      });
      expect(await versionsOf(id)).toEqual([[2026, 2027, deptA]]);
      expect(await delegatesOf(id)).toEqual([del1]);
      expect((await yearView(2026)).map((r) => r.id)).toContain(id);
      expect((await yearView(2027)).map((r) => r.id)).not.toContain(id);
      const withEnded = (await yearView(2027, true)).find((r) => r.id === id);
      expect(withEnded).toMatchObject({
        status: 'deleted',
        statusFromYear: 2027,
      });
      expect((await logsOf(id)).map((l: any) => l.action)).toEqual([
        'create',
        'delete_logical',
      ]);

      // R-ORG-004 bound: a deleted entry rejects every write (409), and reactivation (409).
      const edit = await patch(id, {
        name: 'X',
        appliesFromYear: 2026,
        backdate: true,
      });
      expect(edit.status).toBe(409);
      const back = await reactivate(id, { fromYear: 2027 });
      expect(back.status).toBe(409);
      expect(await rowOf(id)).toMatchObject({ status: 'deleted' });
    });
  });

  describe('inactivate with a successor and reactivate (R-ORG-007)', () => {
    it('Merge: from 2027 the old entry leaves the 2027 view, stays in 2026, and B5 returns the successor', async () => {
      const keep = await created({ name: 'ORG-060 analog' });
      const merged = await created({ name: 'ORG-061 analog' });

      const res = await inactivate(merged, {
        fromYear: 2027,
        successorId: keep,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: merged,
        status: 'inactive',
        statusFromYear: 2027,
        successorId: keep,
      });
      expect(await versionsOf(merged)).toEqual([[2026, 2027, deptA]]);
      expect((await yearView(2026)).map((r) => r.id)).toContain(merged);
      expect((await yearView(2027)).map((r) => r.id)).not.toContain(merged);
      expect((await yearView(2027)).map((r) => r.id)).toContain(keep);
      const b5 = await http().get(`/units/${merged}`).set(admin);
      expect(b5.body.data.successorId).toBe(keep);
    });

    it('Reactivate from 2028 adds ONE version, clears status and successor, and leaves 2027 without the entry', async () => {
      const keep = await created({ name: 'Successor' });
      const id = await created({ name: 'Comes back' });
      await inactivate(id, { fromYear: 2027, successorId: keep });

      const res = await reactivate(id, { fromYear: 2028 });

      expect(res.status).toBe(200);
      expect(await versionsOf(id)).toEqual([
        [2026, 2027, deptA],
        [2028, null, deptA],
      ]);
      expect(await rowOf(id)).toMatchObject({
        status: 'active',
        status_from_year: null,
        successor_id: null,
      });
      expect((await yearView(2026)).map((r) => r.id)).toContain(id);
      expect((await yearView(2027)).map((r) => r.id)).not.toContain(id);
      expect((await yearView(2028)).map((r) => r.id)).toContain(id);
      expect((await logsOf(id)).map((l: any) => l.action)).toEqual([
        'create',
        'inactivate',
        'reactivate',
      ]);
      expect((await reactivate(id, { fromYear: 2028 })).status).toBe(409);

      // The gap of inactive years is a 400 for a save, not a 500; the new version takes saves.
      const inGap = await patch(id, { name: 'X', appliesFromYear: 2027 });
      expect(inGap.status).toBe(400);
      expect(inGap.body.message.field).toBe('appliesFromYear');
      const fromBack = await patch(id, {
        name: 'Renamed',
        appliesFromYear: 2028,
      });
      expect(fromBack.status).toBe(200);
      expect(await versionsOf(id)).toEqual([
        [2026, 2027, deptA],
        [2028, null, deptA],
      ]);
    });

    // D-ORG-17 (T-03 review): an end at the version that follows an inactive gap
    // must not stretch the earlier version across it.
    it('ending from the year the entry came back after a gap is 400 (B11 and B13) and the 2027 and 2028 views still omit it', async () => {
      const id = await created({ name: 'Gap' });
      expect((await inactivate(id, { fromYear: 2027 })).status).toBe(200);
      expect((await reactivate(id, { fromYear: 2029 })).status).toBe(200);
      const versions = [
        [2026, 2027, deptA],
        [2029, null, deptA],
      ];
      expect(await versionsOf(id)).toEqual(versions);
      const before = await snapshot([id]);

      const viaB11 = await inactivate(id, { fromYear: 2029 });
      expect(viaB11.status).toBe(400);
      expect(viaB11.body.message.field).toBe('fromYear');
      today = 2029;
      const viaB13 = await del(id, '?fromYear=2029');
      expect(viaB13.status).toBe(400);
      expect(viaB13.body.message.field).toBe('fromYear');
      today = 2026;

      expect(await snapshot([id])).toBe(before);
      expect(await versionsOf(id)).toEqual(versions);
      for (const year of [2027, 2028]) {
        expect((await yearView(year)).map((r) => r.id)).not.toContain(id);
      }
      expect((await yearView(2026)).map((r) => r.id)).toContain(id);
    });

    it('deleting an inactive entry returns the end year it already had, whatever fromYear is asked for', async () => {
      const id = await created({ name: 'Inactive then deleted' });
      expect((await inactivate(id, { fromYear: 2027 })).status).toBe(200);
      today = 2028;

      const res = await del(id, '?fromYear=2030');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id, mode: 'logical', fromYear: 2027 });
      expect(await rowOf(id)).toMatchObject({
        status: 'deleted',
        status_from_year: 2027,
      });
      expect(await versionsOf(id)).toEqual([[2026, 2027, deptA]]);
    });

    it('a save from the year the entry ended is 400 naming appliesFromYear; from an earlier year it splits (R-ORG-004 bound)', async () => {
      const id = await created({ name: 'Ending' });
      await inactivate(id, { fromYear: 2028 });

      const atEnd = await patch(id, { name: 'X', appliesFromYear: 2028 });
      expect(atEnd.status).toBe(400);
      expect(atEnd.body.message.field).toBe('appliesFromYear');
      const before = await patch(id, { name: 'X', appliesFromYear: 2027 });
      expect(before.status).toBe(200);
      expect(await versionsOf(id)).toEqual([
        [2026, 2027, deptA],
        [2027, 2028, deptA],
      ]);
    });

    it('a successor of another level or not active that year is 400 naming `successor`, and nothing is written', async () => {
      const id = await created({ name: 'Needs successor' });
      const before = await snapshot([id, deptA]);

      const otherLevel = await inactivate(id, {
        fromYear: 2027,
        successorId: deptA,
      });
      expect(otherLevel.status).toBe(400);
      expect(otherLevel.body.message.field).toBe('successor');

      const ended = await created({ name: 'Ended early' });
      await inactivate(ended, { fromYear: 2027 });
      const notActive = await inactivate(id, {
        fromYear: 2027,
        successorId: ended,
      });
      expect(notActive.status).toBe(400);
      expect(notActive.body.message.field).toBe('successor');

      expect(await snapshot([id, deptA])).toBe(before);
    });
  });

  describe('children rule: active children FROM E (design 5.3, R-ORG-007)', () => {
    it('Active children block: 409 naming both units, and no version, status or log row changes', async () => {
      const parent = await created({
        levelId: 21,
        name: 'Dept B',
        parentId: root,
      });
      const c1 = await created({ name: 'Child one', parentId: parent });
      const c2 = await created({ name: 'Child two', parentId: parent });
      const ids = [parent, c1, c2];
      const before = await snapshot(ids);

      const res = await inactivate(parent, { fromYear: 2027 });

      expect(res.status).toBe(409);
      expect(res.body.message.description).toContain(await codeOf(c1));
      expect(res.body.message.description).toContain(await codeOf(c2));
      expect(await snapshot(ids)).toBe(before);
    });

    it('a child that moves under the entry only from 2028 blocks inactivating it from 2027; a child that left before E does not', async () => {
      const pX = await created({ levelId: 21, name: 'Dept X', parentId: root });
      const pY = await created({ levelId: 21, name: 'Dept Y', parentId: root });
      const mover = await created({ name: 'Mover', parentId: pY });
      expect(
        (await patch(mover, { parentId: pX, appliesFromYear: 2028 })).status,
      ).toBe(200);
      expect(await versionsOf(mover)).toEqual([
        [2026, 2028, pY],
        [2028, null, pX],
      ]);
      const before = await snapshot([pX, mover]);

      const blocked = await inactivate(pX, { fromYear: 2027 });

      expect(blocked.status).toBe(409);
      expect(blocked.body.message.description).toContain(await codeOf(mover));
      expect(await snapshot([pX, mover])).toBe(before);

      // Control: under pZ only in [2026, 2027) -> covers no year from 2027.
      const pZ = await created({ levelId: 21, name: 'Dept Z', parentId: root });
      const leaver = await created({ name: 'Leaver', parentId: pZ });
      expect(
        (await patch(leaver, { parentId: pY, appliesFromYear: 2027 })).status,
      ).toBe(200);
      expect((await inactivate(pZ, { fromYear: 2027 })).status).toBe(200);
    });

    it('delete is blocked by children too (physical entry), and the rows stay', async () => {
      const parent = await created({
        levelId: 21,
        name: 'Dept D',
        parentId: root,
      });
      const child = await created({ name: 'Kid', parentId: parent });
      const before = await snapshot([parent, child]);
      const res = await del(parent);
      expect(res.status).toBe(409);
      expect(res.body.message.description).toContain(await codeOf(child));
      expect(await snapshot([parent, child])).toBe(before);
    });
  });

  describe('linked records block the delete, not the inactivate (R-ORG-008)', () => {
    it('a test consumer reporting 5 makes the delete a 409 stating 5 and proposing Inactivate; at 0 the delete goes through', async () => {
      const id = await created({ name: 'Linked' });
      consumer.setCount(id, 5);
      const before = await snapshot([id]);

      const blocked = await del(id);
      expect(blocked.status).toBe(409);
      expect(blocked.body.message.description).toContain('5');
      expect(blocked.body.message.description).toContain('Inactivate');
      expect(await snapshot([id])).toBe(before);

      const inactive = await inactivate(id, { fromYear: 2027 });
      expect(inactive.status).toBe(200);

      const other = await created({ name: 'Free' });
      consumer.setCount(other, 0);
      expect((await del(other)).status).toBe(200);
    });

    it('an entry named as successor by another cannot be physically deleted: 409, not a raw FK error', async () => {
      const successor = await created({ name: 'Successor' });
      const merged = await created({ name: 'Merged' });
      expect(
        (await inactivate(merged, { fromYear: 2027, successorId: successor }))
          .status,
      ).toBe(200);
      const before = await snapshot([successor, merged]);

      const res = await del(successor);

      expect(res.status).toBe(409);
      expect(res.body.message.description).toContain(await codeOf(merged));
      expect(await snapshot([successor, merged])).toBe(before);
    });
  });

  describe('back-date gate (R-ORG-005)', () => {
    it('with today in 2027, inactivating from 2026 needs backdate=true; with it the log says so', async () => {
      // An L1 (no parent), because a child's parent must cover every year of it.
      const id = await created({
        levelId: 20,
        parentId: null,
        name: 'Older',
        appliesFromYear: 2025,
        backdate: true,
      });
      today = 2027;
      const before = await snapshot([id]);

      const without = await inactivate(id, { fromYear: 2026 });
      expect(without.status).toBe(400);
      expect(without.body.message.field).toBe('backdate');
      expect(await snapshot([id])).toBe(before);

      const withFlag = await inactivate(id, { fromYear: 2026, backdate: true });
      expect(withFlag.status).toBe(200);
      const logs = await logsOf(id);
      expect(logs[logs.length - 1]).toMatchObject({
        action: 'inactivate',
        applies_from_year: 2026,
        backdated: 1,
      });
    });
  });

  describe('history (B6) and change log (B7), R-ORG-009, R-ORG-017', () => {
    it('Delegates shown in a past year: changing [B] to [C] puts one delegates_change row with both lists, the user and the time in B6', async () => {
      const id = await created({
        name: 'With delegates',
        delegateCarnets: [del1],
      });
      const edit = await patch(id, { delegateCarnets: [del2] });
      expect(edit.status).toBe(200);
      expect(edit.body.data.outcome.action).toBe('delegates_change');

      const res = await history(id);

      expect(res.status).toBe(200);
      expect(res.body.data.versions).toHaveLength(1);
      const [latest, first] = res.body.data.log;
      expect(first.action).toBe('create');
      expect(latest).toMatchObject({
        unitId: id,
        action: 'delegates_change',
        appliesFromYear: null,
        backdated: false,
        changes: { delegates: { old: [del1], new: [del2] } },
        createdBy: { id: 4242 },
      });
      expect(new Date(latest.createdAt).toString()).not.toBe('Invalid Date');
      // the past-year view still shows the CURRENT list
      expect(
        (await yearView(2026))
          .find((r) => r.id === id)
          .delegates.map((d: any) => d.carnet),
      ).toEqual([del2]);
    });

    it('B7 answers 400 without a numeric unitId and an empty list for an id that never existed', async () => {
      expect((await changeLog('')).status).toBe(400);
      expect((await changeLog('?unitId=abc')).status).toBe(400);
      const none = await changeLog('?unitId=987654321');
      expect(none.status).toBe(200);
      expect(none.body.data).toEqual([]);
    });
  });

  describe('Contributor is denied and nothing is written (R-ORG-012 AC.1)', () => {
    it('B6, B7, B11, B12, B13 are 403, and no row or log row changes', async () => {
      const id = await created({ name: 'Guarded' });
      const before = await snapshot([id]);

      const responses = await Promise.all([
        history(id, contributor),
        changeLog(`?unitId=${id}`, contributor),
        inactivate(id, { fromYear: 2027 }, contributor),
        reactivate(id, { fromYear: 2027 }, contributor),
        del(id, '', contributor),
      ]);

      expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403]);
      expect(await snapshot([id])).toBe(before);
    });
  });

  describe('log survival is not an artifact of the fixture', () => {
    it('after a physical delete the log table still holds rows for an id that org_units no longer has', async () => {
      const id = await created({ name: 'Gone for good' });
      expect((await del(id)).status).toBe(200);
      const [{ n }] = await query(
        `SELECT COUNT(*) AS n FROM org_unit_change_log l
          WHERE l.org_unit_id = ? AND NOT EXISTS (SELECT 1 FROM org_units u WHERE u.id = l.org_unit_id)`,
        [id],
      );
      expect(Number(n)).toBe(2);
    });
  });
});

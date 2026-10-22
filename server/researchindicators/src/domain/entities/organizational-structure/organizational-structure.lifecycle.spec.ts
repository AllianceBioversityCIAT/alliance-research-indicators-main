import { OrgStructureService } from './organizational-structure.service';
import { OrgUnitUsageRegistry } from './org-unit-usage.registry';
import { GraphVersion } from './org-hierarchy.util';
import { TimelineVersion } from './org-version-timeline.util';
import { LoggerUtil } from '../../shared/utils/logger.util';

const L1 = 20;
const L2 = 21;
const L4 = 23;

interface UnitRow {
  id: number;
  code: string;
  status: string;
  status_from_year: number | null;
  successor_id: number | null;
}

/**
 * In-memory stand-in for `OrgStructureWriteRepository` with REAL transaction
 * semantics (snapshot, restore on throw) and the cascade semantics of the
 * schema: deleting a unit removes its versions and delegates but NOT its log
 * rows (the log has no foreign key). It cannot show `FOR UPDATE`, collation or
 * real FK errors: `test/org-structure-lifecycle.integration-spec.ts` proves
 * those on the real database (KZ-001, KZ-017).
 */
class LifecycleStore {
  units = new Map<number, UnitRow>();
  versions: Array<TimelineVersion & { unitId: number }> = [];
  logs: Array<Record<string, any>> = [];
  writes = 0;
  nextVersionId = 1000;

  async transaction<T>(work: (m: unknown) => Promise<T>): Promise<T> {
    const snapshot = structuredClone({
      units: [...this.units],
      versions: this.versions,
      logs: this.logs,
    });
    try {
      return await work({});
    } catch (error) {
      this.units = new Map(snapshot.units);
      this.versions = snapshot.versions;
      this.logs = snapshot.logs;
      throw error;
    }
  }
  async lockUnit(_m: unknown, id: number) {
    const unit = this.units.get(id);
    return unit ? { ...unit } : null;
  }
  async findUnit(_m: unknown, id: number) {
    return this.units.get(id) ?? null;
  }
  async loadVersions(_m: unknown, unitId: number) {
    return this.versions
      .filter((v) => v.unitId === unitId)
      .map(({ unitId: _u, ...v }) => ({ ...v, delegates: [...v.delegates] }))
      .sort((a, b) => a.from - b.from);
  }
  async loadGraphVersions(): Promise<GraphVersion[]> {
    return this.versions.map((v) => ({
      unitId: v.unitId,
      from: v.from,
      to: v.to,
      parentId: v.parentId,
      levelId: v.levelId,
    }));
  }
  // A version row carries its delegate rows (D-ORG-24): insertVersion writes
  // the row with none, addDelegates writes them, deleteVersions drops them.
  async insertVersion(_m: unknown, unitId: number, v: TimelineVersion) {
    this.writes++;
    const id = this.nextVersionId++;
    this.versions.push({ ...v, delegates: [], id, unitId });
    return id;
  }
  async addDelegates(_m: unknown, versionId: number, carnets: string[]) {
    this.writes += carnets.length;
    this.versions.find((x) => x.id === versionId).delegates.push(...carnets);
  }
  async updateVersion(_m: unknown, v: TimelineVersion) {
    this.writes++;
    const { delegates: _delegates, ...fields } = v;
    Object.assign(
      this.versions.find((x) => x.id === v.id),
      fields,
    );
  }
  async deleteVersions(_m: unknown, unitId: number, ids: number[]) {
    this.writes += ids.length;
    this.versions = this.versions.filter(
      (v) => !(v.unitId === unitId && ids.includes(v.id)),
    );
  }
  async updateUnitStatus(
    _m: unknown,
    id: number,
    f: {
      status: string;
      statusFromYear: number | null;
      successorId: number | null;
    },
  ) {
    this.writes++;
    const unit = this.units.get(id);
    unit.status = f.status;
    unit.status_from_year = f.statusFromYear;
    unit.successor_id = f.successorId;
  }
  async deleteUnit(_m: unknown, id: number) {
    this.writes++;
    this.units.delete(id);
    this.versions = this.versions.filter((v) => v.unitId !== id);
  }
  async findSuccessorReferrers(_m: unknown, id: number) {
    return [...this.units.values()]
      .filter((u) => u.successor_id === id)
      .map((u) => ({ id: u.id, code: u.code }));
  }
  async insertLog(_m: unknown, entry: Record<string, any>) {
    this.writes++;
    this.logs.push(entry);
  }

  unit(
    id: number,
    code: string,
    versions: Array<Partial<TimelineVersion>>,
    status = 'active',
    statusFrom: number | null = null,
    successor: number | null = null,
  ) {
    this.units.set(id, {
      id,
      code,
      status,
      status_from_year: statusFrom,
      successor_id: successor,
    });
    for (const v of versions) {
      this.versions.push({
        unitId: id,
        id: this.nextVersionId++,
        from: 2026,
        to: null,
        name: code,
        acronym: null,
        levelId: L4,
        parentId: null,
        directorCarnet: null,
        delegates: [],
        ...v,
      });
    }
  }
  versionsOf(unitId: number) {
    return this.versions
      .filter((v) => v.unitId === unitId)
      .sort((a, b) => a.from - b.from);
  }
}

describe('OrgStructureService lifecycle (T-03: B11 inactivate, B12 reactivate, B13 delete)', () => {
  let store: LifecycleStore;
  let today: number;
  let registry: OrgUnitUsageRegistry;
  let service: OrgStructureService;
  const readService = {
    getUnitDetail: jest.fn(async (id: number) => ({ id })),
  };
  const logSpy = jest.spyOn(LoggerUtil.prototype, '_log').mockImplementation();
  const warnSpy = jest
    .spyOn(LoggerUtil.prototype, '_warn')
    .mockImplementation();
  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  const build = () => {
    service = new OrgStructureService(
      store as never,
      readService as never,
      {} as never,
      { currentYear: () => today },
      { user_id: 42 } as never,
      registry,
    );
  };

  /**
   * 1 Alliance (L1) · 2 Dept A, 3 Dept C (L2 under 1) · 4 ORG-061 and
   * 5 ORG-060 (L4 under 2), both open from 2026.
   */
  beforeEach(() => {
    store = new LifecycleStore();
    today = 2026;
    registry = new OrgUnitUsageRegistry();
    store.unit(1, 'ORG-001', [{ levelId: L1, name: 'Alliance' }]);
    store.unit(2, 'ORG-002', [{ levelId: L2, name: 'Dept A', parentId: 1 }]);
    store.unit(3, 'ORG-003', [{ levelId: L2, name: 'Dept C', parentId: 1 }]);
    store.unit(4, 'ORG-061', [{ name: 'Unit 61', parentId: 2 }]);
    store.unit(5, 'ORG-060', [{ name: 'Unit 60', parentId: 2 }]);
    store.writes = 0;
    jest.clearAllMocks();
    build();
  });

  const rejection = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      return error as { getStatus(): number; getResponse(): any };
    }
    throw new Error('expected a rejection');
  };
  const descriptionOf = (error: { getResponse(): any }) => {
    const body = error.getResponse();
    return typeof body === 'string' ? body : body.message.description;
  };
  const fieldOf = (error: { getResponse(): any }) =>
    error.getResponse().message.field;
  const checksum = () =>
    JSON.stringify([[...store.units], store.versions, store.logs]);
  /** Asserts the whole store is exactly as before AND nothing was written. */
  const expectUntouched = (before: string) => {
    expect(checksum()).toBe(before);
    expect(store.writes).toBe(0);
  };

  describe('B11 inactivate (R-ORG-007, design 5.4)', () => {
    it('Merge: ORG-061 from 2027 with successor ORG-060 ends its last version, marks it inactive and logs once', async () => {
      await service.inactivate(4, { fromYear: 2027, successorId: 5 });

      expect(store.versionsOf(4).map((v) => [v.from, v.to])).toEqual([
        [2026, 2027],
      ]);
      expect(store.units.get(4)).toMatchObject({
        status: 'inactive',
        status_from_year: 2027,
        successor_id: 5,
      });
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        unitId: 4,
        action: 'inactivate',
        appliesFromYear: 2027,
        backdated: false,
        userId: 42,
        changes: {
          status: { old: 'active', new: 'inactive' },
          statusFromYear: { old: null, new: 2027 },
          successorId: { old: null, new: 5 },
        },
      });
    });

    it('is allowed without a successor, and returns the B5 shape of the entry', async () => {
      const result = await service.inactivate(4, { fromYear: 2027 });
      expect(result).toEqual({ id: 4 });
      expect(store.units.get(4).successor_id).toBeNull();
    });

    it('is NOT blocked by linked records (they stay; consumers follow the successor)', async () => {
      registry.register({
        consumerName: 'KPI values',
        countByUnitIds: async (ids) => ({ [ids[0]]: 5 }),
      });
      await expect(
        service.inactivate(4, { fromYear: 2027, successorId: 5 }),
      ).resolves.toBeDefined();
      expect(store.units.get(4).status).toBe('inactive');
    });

    it('Active children block: 409 naming the children, and nothing changes', async () => {
      const before = checksum();
      const error = await rejection(service.inactivate(2, { fromYear: 2027 }));
      expect(error.getStatus()).toBe(409);
      expect(descriptionOf(error)).toContain('ORG-061');
      expect(descriptionOf(error)).toContain('ORG-060');
      expectUntouched(before);
    });

    // R-ORG-007 / design 5.3: "active children FROM E", not "at E". Disqualifier:
    // a fixture where every child is active in every year cannot tell them apart.
    describe('children rule is "from E", not "at E"', () => {
      beforeEach(() => {
        store.unit(7, 'ORG-007', [
          { levelId: L2, name: 'Dept X', parentId: 1 },
        ]);
        // 8 sits under Dept C until 2028, then MOVES UNDER 7 from 2028.
        store.unit(8, 'ORG-008', [
          { from: 2026, to: 2028, name: 'Mover', parentId: 3 },
          { from: 2028, to: null, name: 'Mover', parentId: 7 },
        ]);
        // 9 was under 7 only in [2026, 2027): it covers no year from 2027.
        store.unit(9, 'ORG-009', [
          { from: 2026, to: 2027, name: 'Left early', parentId: 7 },
          { from: 2027, to: null, name: 'Left early', parentId: 3 },
        ]);
        store.writes = 0;
      });

      it('the child that moves in from 2028 blocks inactivating the parent from 2027', async () => {
        const before = checksum();
        const error = await rejection(
          service.inactivate(7, { fromYear: 2027 }),
        );
        expect(error.getStatus()).toBe(409);
        expect(descriptionOf(error)).toContain('ORG-008');
        expect(descriptionOf(error)).not.toContain('ORG-009');
        expectUntouched(before);
      });

      it('a child whose version under the parent ends at E does not block (to > E is false)', async () => {
        store.versions = store.versions.filter((v) => v.unitId !== 8);
        store.unit(8, 'ORG-008', [{ name: 'Elsewhere', parentId: 3 }]);
        await expect(
          service.inactivate(7, { fromYear: 2027 }),
        ).resolves.toBeDefined();
      });
    });

    describe('successor (R-ORG-007 AC.3)', () => {
      it('of another level is 400 naming `successor`', async () => {
        const before = checksum();
        const error = await rejection(
          service.inactivate(4, { fromYear: 2027, successorId: 3 }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('successor');
        expectUntouched(before);
      });

      it('not active in the year is 400: a successor ended from 2027 is not active in 2027', async () => {
        store.unit(
          6,
          'ORG-006',
          [{ from: 2026, to: 2027, parentId: 2 }],
          'inactive',
          2027,
        );
        const error = await rejection(
          service.inactivate(4, { fromYear: 2027, successorId: 6 }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('successor');
      });

      it('active in the year but ended LATER is accepted: a successor ended from 2028 is active in 2027', async () => {
        store.unit(
          6,
          'ORG-006',
          [{ from: 2026, to: 2028, parentId: 2 }],
          'inactive',
          2028,
        );
        await expect(
          service.inactivate(4, { fromYear: 2027, successorId: 6 }),
        ).resolves.toBeDefined();
      });

      it('itself, or an unknown id, is 400 naming `successor`', async () => {
        for (const successorId of [4, 999]) {
          const error = await rejection(
            service.inactivate(4, { fromYear: 2027, successorId }),
          );
          expect(error.getStatus()).toBe(400);
          expect(fieldOf(error)).toBe('successor');
        }
      });
    });

    describe('year rules (design 5.4, D-ORG-11)', () => {
      it.each([2025, 2026])(
        'E = %i is not later than the first year: 400 naming fromYear',
        async (year) => {
          const error = await rejection(
            service.inactivate(4, { fromYear: year, backdate: true }),
          );
          expect(error.getStatus()).toBe(400);
          expect(fieldOf(error)).toBe('fromYear');
        },
      );

      // D-ORG-17 (T-03 review): E is where the entry came back after an inactive
      // period; stretching the earlier version to E would fill the gap.
      describe('ending at the version that follows an inactive gap', () => {
        beforeEach(() => {
          store.unit(6, 'ORG-006', [
            { from: 2026, to: 2027, parentId: 2 },
            { from: 2029, parentId: 2 },
          ]);
          store.writes = 0;
        });

        it('B11 is 400 naming fromYear, and no version, status or log row changes', async () => {
          const before = checksum();
          const error = await rejection(
            service.inactivate(6, { fromYear: 2029, backdate: true }),
          );
          expect(error.getStatus()).toBe(400);
          expect(fieldOf(error)).toBe('fromYear');
          expect(descriptionOf(error)).toContain('later year');
          expectUntouched(before);
        });

        it('B13 (logical, clock 2029) is 400 too, and nothing is written', async () => {
          today = 2029;
          build();
          const before = checksum();
          const error = await rejection(service.remove(6, {}));
          expect(error.getStatus()).toBe(400);
          expect(fieldOf(error)).toBe('fromYear');
          expectUntouched(before);
        });

        it('from a later year it works and the gap stays: [2026,2027) and [2029,2031)', async () => {
          await service.inactivate(6, { fromYear: 2031, backdate: true });
          expect(store.versionsOf(6).map((v) => [v.from, v.to])).toEqual([
            [2026, 2027],
            [2029, 2031],
          ]);
        });
      });

      it('a version scheduled after E: 400, nothing changes (D-ORG-11)', async () => {
        store.unit(6, 'ORG-006', [
          { from: 2026, to: 2028, parentId: 2 },
          { from: 2028, parentId: 3 },
        ]);
        store.writes = 0;
        const before = checksum();
        const error = await rejection(
          service.inactivate(6, { fromYear: 2027 }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('fromYear');
        expect(descriptionOf(error)).toContain('2028');
        expectUntouched(before);
      });

      it('a version that starts exactly at E is dropped and the log keeps it', async () => {
        store.unit(6, 'ORG-006', [
          { from: 2026, to: 2027, name: 'Old', parentId: 2 },
          { from: 2027, name: 'Dropped', parentId: 3 },
        ]);
        await service.inactivate(6, { fromYear: 2027 });

        expect(store.versionsOf(6).map((v) => [v.from, v.to, v.name])).toEqual([
          [2026, 2027, 'Old'],
        ]);
        const log = store.logs[0];
        expect(log.changes.droppedVersions.old).toEqual([
          expect.objectContaining({ from: 2027, name: 'Dropped', parentId: 3 }),
        ]);
      });

      it('the dropped version takes its delegates with it and the log keeps that list; the kept version keeps its own (D-ORG-24)', async () => {
        store.unit(6, 'ORG-006', [
          { from: 2026, to: 2027, parentId: 2, delegates: ['B2001'] },
          { from: 2027, parentId: 2, delegates: ['B2002', 'B2003'] },
        ]);
        await service.inactivate(6, { fromYear: 2027 });

        expect(store.versionsOf(6).map((v) => [v.from, v.delegates])).toEqual([
          [2026, ['B2001']],
        ]);
        expect(store.logs[0].changes.droppedVersions.old).toEqual([
          expect.objectContaining({
            from: 2027,
            delegates: ['B2002', 'B2003'],
          }),
        ]);
      });

      it.each([20277, 1999])(
        'a year outside 2000..current+10 (%i) is 400 naming fromYear',
        async (year) => {
          const error = await rejection(
            service.inactivate(4, { fromYear: year }),
          );
          expect(error.getStatus()).toBe(400);
          expect(fieldOf(error)).toBe('fromYear');
        },
      );
    });

    describe('back-date gate (R-ORG-005)', () => {
      beforeEach(() => {
        today = 2027;
        store.versions.find((v) => v.unitId === 4).from = 2025;
        build();
      });

      it('without the flag: 400 naming `backdate`, nothing changes', async () => {
        const before = checksum();
        const error = await rejection(
          service.inactivate(4, { fromYear: 2026 }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('backdate');
        expectUntouched(before);
      });

      it('with the flag: saved and logged with backdated = true', async () => {
        await service.inactivate(4, { fromYear: 2026, backdate: true });
        expect(store.logs[0]).toMatchObject({
          action: 'inactivate',
          appliesFromYear: 2026,
          backdated: true,
        });
      });
    });

    it('an already inactive entry is 409; a deleted one is 409; an unknown one is 404 with the plain string', async () => {
      store.unit(6, 'ORG-006', [{ to: 2027 }], 'inactive', 2027);
      store.unit(7, 'ORG-007', [{ to: 2027 }], 'deleted', 2027);
      const inactive = await rejection(
        service.inactivate(6, { fromYear: 2028 }),
      );
      expect(inactive.getStatus()).toBe(409);
      const deleted = await rejection(
        service.inactivate(7, { fromYear: 2028 }),
      );
      expect(deleted.getStatus()).toBe(409);
      const missing = await rejection(
        service.inactivate(404, { fromYear: 2027 }),
      );
      expect(missing.getStatus()).toBe(404);
      expect(missing.getResponse()).toMatchObject({
        message: 'Organizational unit 404 not found',
      });
    });

    it('logs info on a write and warns on a blocked action with the reason (design 9)', async () => {
      await service.inactivate(4, { fromYear: 2027 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'org_structure.inactivate id=4 applies_from=2027',
        ),
      );
      await rejection(service.inactivate(2, { fromYear: 2027 }));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /org_structure\.blocked action=inactivate status=409.*id=2.*reason=".*ORG-060/,
        ),
      );
    });

    it('a failure while writing the log rolls everything back (I-5)', async () => {
      const before = checksum();
      store.insertLog = async () => {
        throw new Error('log write failed');
      };
      await expect(service.inactivate(4, { fromYear: 2027 })).rejects.toThrow(
        'log write failed',
      );
      expect(checksum()).toBe(before);
    });
  });

  describe('B12 reactivate (R-ORG-007 AC.2, design 5.4)', () => {
    beforeEach(() => {
      store.unit(
        6,
        'ORG-006',
        [{ from: 2026, to: 2027, name: 'Last values', parentId: 2 }],
        'inactive',
        2027,
        5,
      );
      store.writes = 0;
    });

    it('from the year it ended adds ONE open version with the last values, clears status and successor, logs once', async () => {
      await service.reactivate(6, { fromYear: 2027 });

      expect(
        store.versionsOf(6).map((v) => [v.from, v.to, v.name, v.parentId]),
      ).toEqual([
        [2026, 2027, 'Last values', 2],
        [2027, null, 'Last values', 2],
      ]);
      expect(store.units.get(6)).toMatchObject({
        status: 'active',
        status_from_year: null,
        successor_id: null,
      });
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        action: 'reactivate',
        appliesFromYear: 2027,
        backdated: false,
        changes: {
          status: { old: 'inactive', new: 'active' },
          statusFromYear: { old: 2027, new: null },
          successorId: { old: 5, new: null },
        },
      });
    });

    it('from a later year leaves the years in between without a version', async () => {
      await service.reactivate(6, { fromYear: 2029 });
      expect(store.versionsOf(6).map((v) => [v.from, v.to])).toEqual([
        [2026, 2027],
        [2029, null],
      ]);
    });

    it('before the year it ended: 400 naming fromYear, nothing changes', async () => {
      const before = checksum();
      const error = await rejection(service.reactivate(6, { fromYear: 2026 }));
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('fromYear');
      expectUntouched(before);
    });

    it('a DELETED entry cannot be reactivated: 409 (R-ORG-008 AC.3)', async () => {
      store.unit(
        7,
        'ORG-007',
        [{ from: 2026, to: 2027, parentId: 2 }],
        'deleted',
        2027,
      );
      store.writes = 0;
      const before = checksum();
      const error = await rejection(service.reactivate(7, { fromYear: 2027 }));
      expect(error.getStatus()).toBe(409);
      expect(descriptionOf(error)).toContain('deleted');
      expectUntouched(before);
    });

    it('an active entry is 409 "already active"; an unknown one is 404', async () => {
      const active = await rejection(service.reactivate(4, { fromYear: 2027 }));
      expect(active.getStatus()).toBe(409);
      expect(descriptionOf(active)).toContain('already active');
      const missing = await rejection(
        service.reactivate(404, { fromYear: 2027 }),
      );
      expect(missing.getStatus()).toBe(404);
    });

    it('is 400 naming `parent` when the copied parent is not active from that year (I-3)', async () => {
      store.unit(
        8,
        'ORG-008',
        [{ from: 2026, to: 2027, levelId: L2, parentId: 1 }],
        'inactive',
        2027,
      );
      store.unit(
        9,
        'ORG-009',
        [{ from: 2026, to: 2027, parentId: 8 }],
        'inactive',
        2027,
      );
      store.writes = 0;
      const before = checksum();
      const error = await rejection(service.reactivate(9, { fromYear: 2027 }));
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('parent');
      expectUntouched(before);
    });

    it('copies the last version delegates (an inactive-staff one included) into the new version; the log carries them (D-ORG-24)', async () => {
      const last = store.versions.find((v) => v.unitId === 6);
      last.directorCarnet = 'A1';
      last.delegates = ['B2001', 'GONE'];
      await service.reactivate(6, { fromYear: 2027 });

      expect(
        store.versionsOf(6).map((v) => [v.from, v.directorCarnet, v.delegates]),
      ).toEqual([
        [2026, 'A1', ['B2001', 'GONE']],
        [2027, 'A1', ['B2001', 'GONE']],
      ]);
      expect(store.logs[0].changes.newVersion.new.delegates).toEqual([
        'B2001',
        'GONE',
      ]);
      // Independent rows: changing one version's list leaves the other alone.
      store.versionsOf(6)[1].delegates.push('X');
      expect(store.versionsOf(6)[0].delegates).toEqual(['B2001', 'GONE']);
    });

    it('back-date gate: with today in 2028, from 2027 needs the flag', async () => {
      today = 2028;
      build();
      const error = await rejection(service.reactivate(6, { fromYear: 2027 }));
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('backdate');
      await service.reactivate(6, { fromYear: 2027, backdate: true });
      expect(store.logs[0]).toMatchObject({ backdated: true });
    });

    it('a save with appliesFromYear inside the gap of a reactivated entry is a 400, not a 500', async () => {
      await service.reactivate(6, { fromYear: 2029 });
      const error = await rejection(
        service.update(6, { name: 'X', appliesFromYear: 2028 }),
      );
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('appliesFromYear');
    });

    it('a save after a reactivation with a gap works from the new version (the timeline allows the gap)', async () => {
      await service.reactivate(6, { fromYear: 2029 });
      await service.update(6, { name: 'Renamed', appliesFromYear: 2029 });
      expect(store.versionsOf(6).map((v) => [v.from, v.to, v.name])).toEqual([
        [2026, 2027, 'Last values'],
        [2029, null, 'Renamed'],
      ]);
    });
  });

  describe('B13 delete (R-ORG-008, design 5.5, D-ORG-13)', () => {
    describe('physical versus logical is decided by the FIRST version and the clock', () => {
      it('clock 2026, entry first seen in 2026: PHYSICAL — rows gone, log kept with the last values', async () => {
        store.logs.push({ unitId: 4, action: 'create' });
        const only = store.versions.find((v) => v.unitId === 4);
        only.directorCarnet = 'A1';
        only.delegates = ['B2001'];

        const result = await service.remove(4, {});

        expect(result).toEqual({ id: 4, mode: 'physical', fromYear: null });
        expect(store.units.has(4)).toBe(false);
        expect(store.versionsOf(4)).toEqual([]);
        expect(store.logs.map((l) => l.action)).toEqual([
          'create',
          'delete_physical',
        ]);
        expect(store.logs[1]).toMatchObject({
          unitId: 4,
          appliesFromYear: null,
          changes: {
            code: { old: 'ORG-061', new: null },
            name: { old: 'Unit 61', new: null },
            parentId: { old: 2, new: null },
            directorCarnet: { old: 'A1', new: null },
            delegates: { old: ['B2001'], new: [] },
          },
        });
      });

      it('clock 2027, SAME entry first seen in 2026: LOGICAL from 2027 — the row and its delegates stay', async () => {
        today = 2027;
        build();
        store.versions.find((v) => v.unitId === 4).delegates = ['B2001'];

        const result = await service.remove(4, {});

        expect(result).toEqual({ id: 4, mode: 'logical', fromYear: 2027 });
        expect(store.units.get(4)).toMatchObject({
          status: 'deleted',
          status_from_year: 2027,
          successor_id: null,
        });
        expect(store.versionsOf(4).map((v) => [v.from, v.to])).toEqual([
          [2026, 2027],
        ]);
        expect(store.versionsOf(4)[0].delegates).toEqual(['B2001']);
        expect(store.logs).toHaveLength(1);
        expect(store.logs[0]).toMatchObject({
          action: 'delete_logical',
          appliesFromYear: 2027,
          backdated: false,
          changes: {
            status: { old: 'active', new: 'deleted' },
            statusFromYear: { old: null, new: 2027 },
          },
        });
      });

      it('an entry first seen in a FUTURE year is physical too (D-ORG-13: current year or later)', async () => {
        store.unit(6, 'ORG-006', [{ from: 2028, parentId: 2 }]);
        expect(await service.remove(6, {})).toEqual({
          id: 6,
          mode: 'physical',
          fromYear: null,
        });
      });

      it('an entry first seen last year with the clock in 2026 is logical', async () => {
        store.unit(6, 'ORG-006', [{ from: 2025, parentId: 2 }]);
        expect(await service.remove(6, {})).toEqual({
          id: 6,
          mode: 'logical',
          fromYear: 2026,
        });
        expect(store.units.get(6)).toMatchObject({
          status: 'deleted',
          status_from_year: 2026,
        });
      });

      it('the code is free after a physical delete (R-ORG-002) and still owned after a logical one', async () => {
        const codeTaken = (code: string) =>
          [...store.units.values()].some((u) => u.code === code);
        await service.remove(4, {});
        expect(codeTaken('ORG-061')).toBe(false);
        today = 2027;
        build();
        await service.remove(5, {});
        expect(codeTaken('ORG-060')).toBe(true);
      });
    });

    describe('logical delete rules', () => {
      beforeEach(() => {
        today = 2027;
        build();
      });

      it('an explicit fromYear later than the first year is used', async () => {
        await service.remove(4, { fromYear: 2029 });
        expect(store.units.get(4)).toMatchObject({
          status: 'deleted',
          status_from_year: 2029,
        });
        expect(store.versionsOf(4).map((v) => [v.from, v.to])).toEqual([
          [2026, 2029],
        ]);
      });

      it('fromYear equal to the first year: 400 naming fromYear', async () => {
        const before = checksum();
        const error = await rejection(
          service.remove(4, { fromYear: 2026, backdate: true }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('fromYear');
        expectUntouched(before);
      });

      it('back-date gate: from 2026 on an entry first seen in 2025 needs the flag', async () => {
        store.unit(6, 'ORG-006', [{ from: 2025, parentId: 2 }]);
        store.writes = 0;
        const before = checksum();
        const error = await rejection(service.remove(6, { fromYear: 2026 }));
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('backdate');
        expectUntouched(before);
        await service.remove(6, { fromYear: 2026, backdate: true });
        expect(store.logs[0]).toMatchObject({
          action: 'delete_logical',
          appliesFromYear: 2026,
          backdated: true,
        });
      });

      it('a version scheduled after the end year: 400 (D-ORG-11)', async () => {
        store.unit(6, 'ORG-006', [
          { from: 2025, to: 2029, parentId: 2 },
          { from: 2029, parentId: 3 },
        ]);
        const error = await rejection(
          service.remove(6, { fromYear: 2028, backdate: false }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('fromYear');
      });

      it('an INACTIVE entry becomes deleted keeping its end year and dropping the successor', async () => {
        store.unit(
          6,
          'ORG-006',
          [{ from: 2025, to: 2027, parentId: 2 }],
          'inactive',
          2027,
          5,
        );
        const result = await service.remove(6, {
          fromYear: 2030,
          backdate: true,
        });
        // B13 reports the year actually written, not the one asked for
        expect(result).toEqual({ id: 6, mode: 'logical', fromYear: 2027 });
        expect(store.units.get(6)).toMatchObject({
          status: 'deleted',
          status_from_year: 2027,
          successor_id: null,
        });
        expect(store.versionsOf(6).map((v) => [v.from, v.to])).toEqual([
          [2025, 2027],
        ]);
        expect(store.logs[0]).toMatchObject({
          action: 'delete_logical',
          appliesFromYear: 2027,
        });
      });
    });

    describe('blockers come first and change nothing (R-ORG-008 AC.2)', () => {
      it('linked records: a consumer reporting 5 gives 409 whose text states 5 and proposes Inactivate', async () => {
        registry.register({
          consumerName: 'Test consumer',
          countByUnitIds: async (ids) => ({ [ids[0]]: 5 }),
        });
        const before = checksum();
        const error = await rejection(service.remove(4, {}));
        expect(error.getStatus()).toBe(409);
        expect(descriptionOf(error)).toContain('5');
        expect(descriptionOf(error)).toContain('Inactivate');
        expect(descriptionOf(error)).toContain('Test consumer');
        expectUntouched(before);
      });

      it('linked records block a LOGICAL delete as well', async () => {
        today = 2027;
        build();
        registry.register({
          consumerName: 'Test consumer',
          countByUnitIds: async (ids) => ({ [ids[0]]: 2 }),
        });
        const before = checksum();
        const error = await rejection(service.remove(4, {}));
        expect(error.getStatus()).toBe(409);
        expectUntouched(before);
      });

      it('the same consumer registered twice still reports 5, not 10', async () => {
        const provider = {
          consumerName: 'Test consumer',
          countByUnitIds: async (ids: number[]) => ({ [ids[0]]: 5 }),
        };
        registry.register(provider);
        registry.register(provider);
        const error = await rejection(service.remove(4, {}));
        expect(descriptionOf(error)).toContain('5 linked records');
        expect(descriptionOf(error)).not.toContain('10');
      });

      it('children (physical): 409 naming them', async () => {
        const before = checksum();
        const error = await rejection(service.remove(2, {}));
        expect(error.getStatus()).toBe(409);
        expect(descriptionOf(error)).toContain('ORG-061');
        expect(descriptionOf(error)).toContain('Move or inactivate');
        expectUntouched(before);
      });

      it('children (logical): 409 naming them', async () => {
        today = 2027;
        build();
        const before = checksum();
        const error = await rejection(service.remove(2, {}));
        expect(error.getStatus()).toBe(409);
        expect(descriptionOf(error)).toContain('ORG-060');
        expectUntouched(before);
      });

      it('a physical delete of an entry that is the successor of another is 409 (the successor FK is RESTRICT)', async () => {
        store.unit(
          6,
          'ORG-006',
          [{ from: 2025, to: 2026, parentId: 2 }],
          'inactive',
          2026,
          5,
        );
        store.writes = 0;
        const before = checksum();
        const error = await rejection(service.remove(5, {}));
        expect(error.getStatus()).toBe(409);
        expect(descriptionOf(error)).toContain('ORG-006');
        expectUntouched(before);
      });
    });

    it('a deleted entry cannot be deleted again: 409; an unknown one is 404 with the plain string', async () => {
      store.unit(6, 'ORG-006', [{ to: 2027 }], 'deleted', 2027);
      const deleted = await rejection(service.remove(6, {}));
      expect(deleted.getStatus()).toBe(409);
      const missing = await rejection(service.remove(404, {}));
      expect(missing.getStatus()).toBe(404);
      expect(missing.getResponse()).toMatchObject({
        message: 'Organizational unit 404 not found',
      });
    });

    it('logs info on each write and warns on a blocked delete with the reason', async () => {
      await service.remove(4, {});
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('org_structure.delete_physical id=4'),
      );
      await rejection(service.remove(2, {}));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /org_structure\.blocked action=delete status=409.*id=2/,
        ),
      );
    });
  });
});

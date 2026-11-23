import {
  ArgumentMetadata,
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import {
  OrgStructureService,
  proposeNextCode,
} from './organizational-structure.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { GraphVersion } from './org-hierarchy.util';
import { TimelineVersion } from './org-version-timeline.util';
import { LoggerUtil } from '../../shared/utils/logger.util';

const L1 = 20;
const L2 = 21;
const L3 = 22;
const L4 = 23;

/**
 * In-memory stand-in for `OrgStructureWriteRepository` with REAL transaction
 * semantics (snapshot, restore on throw), so "the log row never exists without
 * its change" (I-5, falsifier 6) is observable, and with a write counter so
 * "no repository write" is observable. The SQL itself is proven on the real
 * database by the integration suite (KZ-001, KZ-017): this fake cannot show
 * collation, `FOR UPDATE` or precedence.
 */
class FakeStore {
  units = new Map<
    number,
    {
      id: number;
      code: string;
      status: string;
      status_from_year: number | null;
    }
  >();
  versions: Array<TimelineVersion & { unitId: number }> = [];
  logs: Array<Record<string, any>> = [];
  staff = new Map<string, boolean>();
  writes = 0;
  nextId = 100;
  nextVersionId = 1000;
  failOnLog = false;
  insertUnitError: unknown = null;
  codeTakenOverride: boolean | null = null;

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
    return this.units.get(id) ?? null;
  }
  async findUnit(_m: unknown, id: number) {
    return this.units.get(id) ?? null;
  }
  async codeTaken(_m: unknown, code: string, excludeId?: number) {
    if (this.codeTakenOverride !== null) return this.codeTakenOverride;
    return [...this.units.values()].some(
      (u) => u.code.toLowerCase() === code.toLowerCase() && u.id !== excludeId,
    );
  }
  async findProposableCodes() {
    return [...this.units.values()].map((u) => u.code);
  }
  async insertUnit(_m: unknown, code: string) {
    this.writes++;
    if (this.insertUnitError) throw this.insertUnitError;
    const id = this.nextId++;
    this.units.set(id, { id, code, status: 'active', status_from_year: null });
    return id;
  }
  async updateUnitCode(_m: unknown, id: number, code: string) {
    this.writes++;
    this.units.get(id).code = code;
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
  // A version row carries its delegate rows here (D-ORG-24): insertVersion
  // writes the row with no delegates, addDelegates / replaceDelegates write them.
  async insertVersion(_m: unknown, unitId: number, v: TimelineVersion) {
    this.writes++;
    const id = this.nextVersionId++;
    this.versions.push({ ...v, delegates: [], id, unitId });
    return id;
  }
  async updateVersion(_m: unknown, v: TimelineVersion) {
    this.writes++;
    const row = this.versions.find((x) => x.id === v.id);
    const { delegates: _delegates, ...fields } = v;
    Object.assign(row, fields);
  }
  async addDelegates(_m: unknown, versionId: number, carnets: string[]) {
    this.writes += carnets.length;
    this.versions.find((x) => x.id === versionId).delegates.push(...carnets);
  }
  async replaceDelegates(_m: unknown, versionId: number, carnets: string[]) {
    this.writes += 1 + carnets.length;
    this.versions.find((x) => x.id === versionId).delegates = [...carnets];
  }
  async findStaff(_m: unknown, carnets: string[]) {
    return carnets
      .filter((c) => this.staff.has(c))
      .map((carnet) => ({ carnet, isActive: this.staff.get(carnet) }));
  }
  async insertLog(_m: unknown, entry: Record<string, any>) {
    this.writes++;
    if (this.failOnLog) throw new Error('log write failed');
    this.logs.push(entry);
  }
  unit(
    id: number,
    code: string,
    versions: Array<Partial<TimelineVersion>>,
    status = 'active',
    statusFrom: number | null = null,
  ) {
    this.units.set(id, { id, code, status, status_from_year: statusFrom });
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

describe('OrgStructureService (T-02: save engine, B3, B4, B9, B10)', () => {
  let store: FakeStore;
  let today: number;
  let service: OrgStructureService;
  const readService = {
    getUnitDetail: jest.fn(async (id: number) => ({ id })),
  };
  const registry = { getBreakdown: jest.fn().mockResolvedValue([]) };
  const lookup = {
    assertValueInList: jest.fn(async (id: number, key: string) => {
      const lists: Record<number, string> = {
        20: 'org.level',
        21: 'org.level',
        22: 'org.level',
        23: 'org.level',
        7: 'kpi.direction',
        24: 'other.list',
      };
      if (!lists[id]) throw new NotFoundException(`Value ${id} not found`);
      if (lists[id] !== key)
        throw new BadRequestException(
          `Value ${id} belongs to list "${lists[id]}", not "${key}"`,
        );
      return {};
    }),
  };
  const logSpy = jest.spyOn(LoggerUtil.prototype, '_log').mockImplementation();
  const warnSpy = jest
    .spyOn(LoggerUtil.prototype, '_warn')
    .mockImplementation();
  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  /** Structure: 1 L1; 2, 3 L2 under 1; 4 L4 "Data Science" under 2 (open from 2026); staff A1 B2 active, OLD inactive. */
  beforeEach(() => {
    store = new FakeStore();
    today = 2026;
    store.unit(1, 'ORG-001', [{ levelId: L1, name: 'Alliance' }]);
    store.unit(2, 'ORG-002', [{ levelId: L2, name: 'Dept A', parentId: 1 }]);
    store.unit(3, 'ORG-003', [{ levelId: L2, name: 'Dept C', parentId: 1 }]);
    store.unit(4, 'ORG-004', [
      { levelId: L4, name: 'Data Science', parentId: 2, directorCarnet: 'A1' },
    ]);
    store.staff.set('A1', true);
    store.staff.set('B2', true);
    store.staff.set('C3', true);
    store.staff.set('OLD', false);
    store.writes = 0;
    jest.clearAllMocks();
    service = new OrgStructureService(
      store as never,
      readService as never,
      lookup as never,
      { currentYear: () => today },
      { user_id: 42 } as never,
      registry as never,
    );
  });

  const create = (over: Partial<CreateOrgUnitDto> = {}) =>
    service.create({
      levelId: L4,
      name: 'New unit',
      parentId: 2,
      appliesFromYear: 2026,
      ...over,
    } as CreateOrgUnitDto);
  const update = (id: number, dto: UpdateOrgUnitDto) => service.update(id, dto);
  const snapshotOthers = (except: number) =>
    JSON.stringify(store.versions.filter((v) => v.unitId !== except));
  const rejection = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      return error as { getStatus(): number; getResponse(): any };
    }
    throw new Error('expected a rejection');
  };
  const fieldOf = (error: { getResponse(): any }) =>
    error.getResponse().message.field;

  describe('proposeNextCode (R-ORG-002, design 5.6)', () => {
    it('is ORG- + (highest suffix + 1), zero-padded to 3, over every code and case', () => {
      expect(proposeNextCode([])).toBe('ORG-001');
      expect(proposeNextCode(['ORG-001', 'org-117', 'ORG-050', 'X-9'])).toBe(
        'ORG-118',
      );
      expect(proposeNextCode(['ORG-999'])).toBe('ORG-1000');
    });
    it('B3 reads every code of every status through the store', async () => {
      store.unit(50, 'ORG-117', [{}], 'deleted', 2027);
      expect(await service.proposeCode()).toEqual({ code: 'ORG-118' });
    });
  });

  describe('B4 staff search', () => {
    it('joins first and last name and passes the 20-row limit', async () => {
      const searchActiveStaff = jest.fn().mockResolvedValue([
        {
          carnet: 'A1',
          first_name: 'Ana',
          last_name: ' Pérez ',
          email: 'a@x.org',
        },
        { carnet: 'B2', first_name: null, last_name: 'Solo', email: null },
      ]);
      const svc = new OrgStructureService(
        { searchActiveStaff } as never,
        readService as never,
        lookup as never,
        { currentYear: () => 2026 },
        {} as never,
        registry as never,
      );
      expect(await svc.searchStaff('pe')).toEqual([
        { carnet: 'A1', name: 'Ana Pérez', email: 'a@x.org' },
        { carnet: 'B2', name: 'Solo', email: null },
      ]);
      expect(searchActiveStaff).toHaveBeenCalledWith('pe', 20);
    });
  });

  describe('B9 create (R-ORG-002, 003, 005, 016)', () => {
    it('creates the first L1 of an empty module with no parent and proposes ORG-001', async () => {
      store = new FakeStore();
      service = new OrgStructureService(
        store as never,
        readService as never,
        lookup as never,
        { currentYear: () => 2026 },
        { user_id: 42 } as never,
        registry as never,
      );
      await service.create({
        levelId: L1,
        name: 'Alliance',
        appliesFromYear: 2026,
      } as CreateOrgUnitDto);
      expect([...store.units.values()].map((u) => u.code)).toEqual(['ORG-001']);
      expect(store.versions).toHaveLength(1);
      expect(store.versions[0]).toMatchObject({
        from: 2026,
        to: null,
        parentId: null,
      });
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        action: 'create',
        appliesFromYear: 2026,
        backdated: false,
      });
    });

    it('takes the proposed code over every existing code, including a deleted entry', async () => {
      store.unit(50, 'ORG-117', [{}], 'deleted', 2027);
      await create();
      expect([...store.units.values()].map((u) => u.code)).toContain('ORG-118');
    });

    it('rejects org-050 with 409 naming `code` because a deleted entry owns ORG-050', async () => {
      store.unit(50, 'ORG-050', [{}], 'deleted', 2027);
      const error = await rejection(create({ code: 'org-050' }));
      expect(error.getStatus()).toBe(409);
      expect(fieldOf(error)).toBe('code');
      expect(store.writes).toBe(0);
    });

    it('maps a duplicate-key race on the unique index to the same 409 when the pre-check was stubbed', async () => {
      store.codeTakenOverride = false;
      store.insertUnitError = Object.assign(new Error('Duplicate entry'), {
        errno: 1062,
      });
      const error = await rejection(create({ code: 'ORG-X' }));
      expect(error.getStatus()).toBe(409);
      expect(fieldOf(error)).toBe('code');
    });

    it('does not turn another key (the versions unique index) or another errno into a code 409', async () => {
      store.insertUnitError = Object.assign(new Error('x'), {
        errno: 1062,
        sqlMessage: "Duplicate entry for key 'uq_org_unit_versions_unit_from'",
      });
      await expect(create()).rejects.toMatchObject({ errno: 1062 });
      store.insertUnitError = Object.assign(new Error('boom'), { errno: 1213 });
      await expect(create()).rejects.toMatchObject({ errno: 1213 });
    });

    it('stores the canonical director carnet and writes ONE create log row', async () => {
      await create({ directorCarnet: 'A1' });
      expect(store.versions.at(-1)).toMatchObject({ directorCarnet: 'A1' });
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0].changes.directorCarnet).toEqual({
        old: null,
        new: 'A1',
      });
    });

    it('an L4 directly under a department (L2) is saved (201 scenario)', async () => {
      await expect(create({ parentId: 2 })).resolves.toBeDefined();
    });

    it.each([
      ['L1 with a parent', { levelId: L1, parentId: 2 }],
      ['L2 under an L2', { levelId: L2, parentId: 2 }],
      ['L4 under an L1', { levelId: L4, parentId: 1 }],
      ['L2 without a parent', { levelId: L2, parentId: undefined }],
    ])(
      'rejects %s with 400 naming `parent` and stores nothing',
      async (_l, over) => {
        const error = await rejection(
          create(over as Partial<CreateOrgUnitDto>),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('parent');
        expect(store.writes).toBe(0);
        expect(store.logs).toHaveLength(0);
      },
    );

    it('rejects a parent that does not exist with 404', async () => {
      await expect(create({ parentId: 999 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a parent that is not active in the covered years and names the years', async () => {
      store.unit(
        5,
        'ORG-005',
        [{ levelId: L2, parentId: 1, to: 2028 }],
        'inactive',
        2028,
      );
      const error = await rejection(
        create({ parentId: 5, appliesFromYear: 2029 }),
      );
      expect(error.getStatus()).toBe(400);
      expect(error.getResponse().message.description).toContain('2029 onward');
    });

    it.each([
      ['a value of kpi.direction', 7],
      ['a real value of another list', 24],
      ['a fabricated value id', 999],
    ])(
      'rejects %s as the level with 400 naming `level`',
      async (_l, levelId) => {
        const error = await rejection(create({ levelId }));
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('level');
        expect(store.writes).toBe(0);
      },
    );

    it('checks the level against org.level through the control-lists lookup', async () => {
      await create({ levelId: L4 });
      expect(lookup.assertValueInList).toHaveBeenCalledWith(L4, 'org.level');
    });

    it('rejects a level the lookup accepts but that has no hierarchy rules (id outside 20-23)', async () => {
      lookup.assertValueInList.mockResolvedValueOnce({});
      const error = await rejection(create({ levelId: 25 }));
      expect(fieldOf(error)).toBe('level');
    });

    it('rejects an unknown director carnet with 400 naming `director`', async () => {
      const error = await rejection(create({ directorCarnet: 'Z9999' }));
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('director');
    });

    it('applies the back-date gate with the clock at 2027: 2026 without the flag is 400 and stores nothing', async () => {
      today = 2027;
      const error = await rejection(create({ appliesFromYear: 2026 }));
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('backdate');
      expect(store.writes).toBe(0);
    });

    it('creating with a past first year AND the flag is a back-date, logged as such', async () => {
      today = 2027;
      await create({ appliesFromYear: 2026, backdate: true });
      expect(store.logs[0]).toMatchObject({
        action: 'create',
        appliesFromYear: 2026,
        backdated: true,
      });
    });

    it('a first year equal to or after the current year needs no flag and is not logged as a back-date', async () => {
      today = 2027;
      await create({ appliesFromYear: 2027 });
      await create({ appliesFromYear: 2028, name: 'Later' });
      expect(store.logs.map((l) => l.backdated)).toEqual([false, false]);
    });

    it('rejects a year outside 2000..current+10 naming `appliesFromYear`', async () => {
      const error = await rejection(create({ appliesFromYear: 20277 }));
      expect(fieldOf(error)).toBe('appliesFromYear');
    });

    it('rolls back everything when the log write fails (I-5: no version without its log row)', async () => {
      store.failOnLog = true;
      await expect(create()).rejects.toThrow('log write failed');
      expect(store.units.has(100)).toBe(false);
      expect(store.versions.some((v) => v.unitId === 100)).toBe(false);
      expect(store.logs).toHaveLength(0);
    });
  });

  describe('body validation through the REAL ValidationPipe (R-ORG-001, 002, 016, 017)', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const meta = (metatype: unknown): ArgumentMetadata => ({
      type: 'body',
      metatype: metatype as never,
    });
    const valid = {
      levelId: L4,
      name: 'N',
      parentId: 2,
      appliesFromYear: 2026,
    };

    it.each([
      ['id (R-ORG-002)', { id: 43 }],
      ['portfolioId (R-ORG-001)', { portfolioId: 1 }],
      ['directorName (R-ORG-016)', { directorName: 'Ana' }],
      ['directorEmail (R-ORG-016)', { directorEmail: 'a@x.org' }],
      ['delegateNames (R-ORG-017)', { delegateNames: ['Luis'] }],
      ['delegateEmails (R-ORG-017)', { delegateEmails: ['l@x.org'] }],
    ])(
      'rejects %s on B9 and on B10 with 400, and no repository write happens',
      async (_l, extra) => {
        await expect(
          pipe.transform({ ...valid, ...extra }, meta(CreateOrgUnitDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          pipe.transform(
            { name: 'N', appliesFromYear: 2026, ...extra },
            meta(UpdateOrgUnitDto),
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(store.writes).toBe(0);
      },
    );

    it('accepts the documented fields, and null to clear parent, acronym and director on B10', async () => {
      await expect(
        pipe.transform(valid, meta(CreateOrgUnitDto)),
      ).resolves.toBeDefined();
      await expect(
        pipe.transform(
          {
            parentId: null,
            acronym: null,
            directorCarnet: null,
            delegateCarnets: [],
            appliesFromYear: 2026,
          },
          meta(UpdateOrgUnitDto),
        ),
      ).resolves.toBeDefined();
    });

    it.each([
      [{ name: null }],
      [{ levelId: null }],
      [{ code: '' }],
      [{ delegateCarnets: ['', 'B2'] }],
      [{ delegateCarnets: 'B2' }],
    ])('rejects %j on B10', async (body) => {
      await expect(
        pipe.transform(body, meta(UpdateOrgUnitDto)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('B9 requires levelId, name and appliesFromYear, and trims a blank code to "propose"', async () => {
      await expect(
        pipe.transform({}, meta(CreateOrgUnitDto)),
      ).rejects.toBeInstanceOf(BadRequestException);
      const dto = (await pipe.transform(
        { ...valid, code: '   ' },
        meta(CreateOrgUnitDto),
      )) as CreateOrgUnitDto;
      expect(dto.code).toBeUndefined();
    });
  });

  describe('B10 update: versions (R-ORG-004, 005, 009)', () => {
    it('Move from next year: two versions [2026,2027) under A and [2027,open) under C, no other entry touched, one new_version log row', async () => {
      const before = snapshotOthers(4);
      await update(4, { parentId: 3, appliesFromYear: 2027 });
      expect(
        store.versionsOf(4).map((v) => [v.from, v.to, v.parentId]),
      ).toEqual([
        [2026, 2027, 2],
        [2027, null, 3],
      ]);
      expect(snapshotOthers(4)).toBe(before);
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        unitId: 4,
        action: 'new_version',
        appliesFromYear: 2027,
        backdated: false,
      });
      expect(store.logs[0].changes).toEqual({ parentId: { old: 2, new: 3 } });
    });

    it('Typo fix in the current version year: in place, no version added, old and new name logged', async () => {
      await update(4, { name: 'Data Sciences', appliesFromYear: 2026 });
      expect(store.versionsOf(4)).toHaveLength(1);
      expect(store.versionsOf(4)[0].name).toBe('Data Sciences');
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({ action: 'edit_in_place' });
      expect(store.logs[0].changes.name).toEqual({
        old: 'Data Science',
        new: 'Data Sciences',
      });
    });

    describe('A later deliberate change is kept (DIFFERENT values per version)', () => {
      beforeEach(() => {
        store.versions = store.versions.filter((v) => v.unitId !== 4);
        store.unit(4, 'ORG-004', [
          {
            from: 2026,
            to: 2028,
            levelId: L4,
            name: 'Data Science',
            parentId: 2,
            directorCarnet: 'A1',
          },
          {
            from: 2028,
            to: null,
            levelId: L4,
            name: 'Data & AI',
            parentId: 2,
            directorCarnet: 'B2',
          },
        ]);
      });

      it('a name fix from 2026 changes only [2026, 2028) and does not overwrite Data & AI', async () => {
        await update(4, { name: 'Data Sciences', appliesFromYear: 2026 });
        expect(store.versionsOf(4).map((v) => v.name)).toEqual([
          'Data Sciences',
          'Data & AI',
        ]);
      });

      it('a director change from 2026 reaches the version that held the old director and keeps the later one', async () => {
        await update(4, { directorCarnet: 'C3', appliesFromYear: 2026 });
        expect(store.versionsOf(4).map((v) => v.directorCarnet)).toEqual([
          'C3',
          'B2',
        ]);
      });
    });

    it('Back-date without the flag (clock 2027) is 400 and changes no version; with the flag the views move and the log says backdated', async () => {
      today = 2027;
      const before = JSON.stringify(store.versions);
      const error = await rejection(
        update(4, { parentId: 3, appliesFromYear: 2026 }),
      );
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('backdate');
      expect(JSON.stringify(store.versions)).toBe(before);

      await update(4, { parentId: 3, appliesFromYear: 2026, backdate: true });
      expect(store.versionsOf(4).map((v) => [v.from, v.parentId])).toEqual([
        [2026, 3],
      ]);
      expect(store.logs[0]).toMatchObject({
        action: 'edit_in_place',
        appliesFromYear: 2026,
        backdated: true,
      });
    });

    it('requires appliesFromYear when a versioned field is sent (delegates included, D-ORG-24), but not for code only', async () => {
      const error = await rejection(update(4, { name: 'X' }));
      expect(fieldOf(error)).toBe('appliesFromYear');
      const delegatesOnly = await rejection(
        update(4, { delegateCarnets: ['B2'] }),
      );
      expect(delegatesOnly.getStatus()).toBe(400);
      expect(fieldOf(delegatesOnly)).toBe('appliesFromYear');
      expect(store.writes).toBe(0);
      await expect(update(4, { code: 'ORG-444' })).resolves.toBeDefined();
    });

    it('rejects a year before the entry first year', async () => {
      const error = await rejection(
        update(4, { name: 'X', appliesFromYear: 2025, backdate: true }),
      );
      expect(fieldOf(error)).toBe('appliesFromYear');
      expect(store.writes).toBe(0);
    });

    it('rejects a year on or after the year an inactive entry ended', async () => {
      store.versions = store.versions.filter((v) => v.unitId !== 4);
      store.unit(
        4,
        'ORG-004',
        [{ from: 2026, to: 2028, parentId: 2 }],
        'inactive',
        2028,
      );
      const error = await rejection(
        update(4, { name: 'X', appliesFromYear: 2028 }),
      );
      expect(error.getStatus()).toBe(400);
      await expect(
        update(4, { name: 'X', appliesFromYear: 2027 }),
      ).resolves.toBeDefined();
    });

    it('a save that changes nothing writes nothing and logs nothing', async () => {
      await update(4, { name: 'Data Science', appliesFromYear: 2027 });
      expect(store.writes).toBe(0);
      expect(store.logs).toHaveLength(0);
    });

    it('404 for an unknown entry; 409 for a deleted one, with no write', async () => {
      await expect(update(999, { code: 'ORG-9' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      store.unit(60, 'ORG-060', [{ from: 2026, to: 2027 }], 'deleted', 2027);
      const error = await rejection(
        update(60, { delegateCarnets: ['B2'], appliesFromYear: 2026 }),
      );
      expect(error.getStatus()).toBe(409);
      expect(store.writes).toBe(0);
    });

    it('rejects a cycle that exists ONLY in a scheduled 2029 version, saving from 2027', async () => {
      // 6 is an L3 under 2 until 2029 and under 4 from 2029 (a stale edge stored when 4 was a valid parent).
      // Entry 4 is saved from 2027 as an L4 under 6: every version of 4 passes the level and activity
      // rules, and the loop 4 -> 6 -> 4 exists only from 2029.
      store.unit(6, 'ORG-006', [
        { from: 2026, to: 2029, levelId: L3, parentId: 2 },
        { from: 2029, to: null, levelId: L3, parentId: 4 },
      ]);
      const before = JSON.stringify(store.versions);
      const error = await rejection(
        update(4, { parentId: 6, appliesFromYear: 2027 }),
      );
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('parent');
      expect(error.getResponse().message.description).toContain('cycle');
      expect(error.getResponse().message.description).toContain('2029');
      expect(JSON.stringify(store.versions)).toBe(before);
    });

    it('rejects a wrong-level parent for the new version and stores no version', async () => {
      const error = await rejection(
        update(4, { parentId: 1, appliesFromYear: 2027 }),
      );
      expect(fieldOf(error)).toBe('parent');
      expect(store.versionsOf(4)).toHaveLength(1);
    });
  });

  describe('B10 update: code and logging (R-ORG-002, 009)', () => {
    it('a code-only change writes code_change, no version, no applies-from year', async () => {
      const versionsBefore = JSON.stringify(store.versions);
      await update(4, { code: 'ORG-444' });
      expect(JSON.stringify(store.versions)).toBe(versionsBefore);
      expect(store.units.get(4).code).toBe('ORG-444');
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        action: 'code_change',
        appliesFromYear: null,
        backdated: false,
      });
      expect(store.logs[0].changes.code).toEqual({
        old: 'ORG-004',
        new: 'ORG-444',
      });
    });

    it('rejects a code owned by another entry (any case) with 409 naming `code`; the same code on itself is a no-op', async () => {
      const error = await rejection(update(4, { code: 'org-003' }));
      expect(error.getStatus()).toBe(409);
      expect(fieldOf(error)).toBe('code');
      await update(4, { code: 'ORG-004' });
      expect(store.writes).toBe(0);
    });

    it('writes exactly one log row per action, and a combined save carries every change in that one row', async () => {
      await update(4, {
        name: 'N1',
        code: 'ORG-444',
        delegateCarnets: ['B2'],
        appliesFromYear: 2026,
      });
      expect(store.logs).toHaveLength(1);
      expect(Object.keys(store.logs[0].changes).sort()).toEqual([
        'code',
        'delegates',
        'name',
      ]);
      await update(4, { parentId: 3, appliesFromYear: 2027 });
      expect(store.logs).toHaveLength(2);
    });

    it('rolls back the version change when the log write fails', async () => {
      store.failOnLog = true;
      const before = JSON.stringify(store.versions);
      await expect(
        update(4, { parentId: 3, appliesFromYear: 2027 }),
      ).rejects.toThrow('log write failed');
      expect(JSON.stringify(store.versions)).toBe(before);
    });
  });

  describe('delegates (R-ORG-017, design 5.2 step 1)', () => {
    beforeEach(() => {
      store.staff.set('D1', true);
      store.staff.set('D2', true);
    });
    /** Entry 4 as a list of [from, to, delegates, director] per version. */
    const shape = (id: number) =>
      store
        .versionsOf(id)
        .map((v) => [v.from, v.to, v.delegates, v.directorCarnet]);
    /** Replace entry 4 with the given versions (director A1 unless stated). */
    const reset4 = (versions: Array<Partial<TimelineVersion>>) => {
      store.versions = store.versions.filter((v) => v.unitId !== 4);
      store.unit(4, 'ORG-004', versions);
    };

    it('Add delegates from 2027: [2026, 2027) keeps no delegates, [2027, open) gets both; ONE new_version row with the delegates diff; other entries untouched', async () => {
      const others = snapshotOthers(4);
      const res = await update(4, {
        delegateCarnets: ['B2', 'C3'],
        appliesFromYear: 2027,
      });
      expect(shape(4)).toEqual([
        [2026, 2027, [], 'A1'],
        [2027, null, ['B2', 'C3'], 'A1'],
      ]);
      expect(snapshotOthers(4)).toBe(others);
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        action: 'new_version',
        appliesFromYear: 2027,
      });
      expect(store.logs[0].changes.delegates).toEqual({
        old: [],
        new: ['B2', 'C3'],
      });
      expect(res.outcome).toEqual({
        action: 'new_version',
        appliesFromYear: 2027,
        backdated: false,
      });
    });

    it('the same change from 2026 edits [2026, open) in place: one edit_in_place row, no version added', async () => {
      await update(4, { delegateCarnets: ['B2'], appliesFromYear: 2026 });
      expect(shape(4)).toEqual([[2026, null, ['B2'], 'A1']]);
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        action: 'edit_in_place',
        appliesFromYear: 2026,
      });
    });

    it('A later deliberate list is kept: [B2] -> [D1] from 2026 leaves [2028, open) with [C3]', async () => {
      reset4([
        { from: 2026, to: 2028, directorCarnet: 'A1', delegates: ['B2'] },
        { from: 2028, directorCarnet: 'A1', delegates: ['C3'] },
      ]);
      await update(4, { delegateCarnets: ['D1'], appliesFromYear: 2026 });
      expect(shape(4)).toEqual([
        [2026, 2028, ['D1'], 'A1'],
        [2028, null, ['C3'], 'A1'],
      ]);
    });

    it('a later version holding the same list takes the new one, even written in another order', async () => {
      reset4([
        { from: 2026, to: 2028, directorCarnet: 'A1', delegates: ['B2', 'C3'] },
        { from: 2028, directorCarnet: 'A1', delegates: ['C3', 'B2'] },
      ]);
      await update(4, { delegateCarnets: ['D1'], appliesFromYear: 2026 });
      expect(shape(4).map((row) => row[2])).toEqual([['D1'], ['D1']]);
    });

    it('replace semantics: omitted = unchanged, [] clears from the year, the same set is a no-op', async () => {
      await update(4, { delegateCarnets: ['B2', 'C3'], appliesFromYear: 2026 });
      store.logs = [];
      await update(4, { name: 'N', appliesFromYear: 2026 });
      expect(shape(4)[0][2]).toEqual(['B2', 'C3']);
      store.logs = [];
      await update(4, { delegateCarnets: ['C3', 'B2'], appliesFromYear: 2026 });
      expect(store.logs).toHaveLength(0);
      await update(4, { delegateCarnets: [], appliesFromYear: 2026 });
      expect(shape(4)[0][2]).toEqual([]);
      expect(store.logs.at(-1).changes.delegates).toEqual({
        old: ['B2', 'C3'],
        new: [],
      });
    });

    it('applies the back-date gate to a delegates-only change (clock 2027)', async () => {
      today = 2027;
      const error = await rejection(
        update(4, { delegateCarnets: ['B2'], appliesFromYear: 2026 }),
      );
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('backdate');
      expect(store.writes).toBe(0);
      await update(4, {
        delegateCarnets: ['B2'],
        appliesFromYear: 2026,
        backdate: true,
      });
      expect(store.logs[0]).toMatchObject({
        action: 'edit_in_place',
        backdated: true,
      });
    });

    it.each([
      ['21 ids', Array.from({ length: 21 }, (_v, i) => `X${i}`)],
      ['a duplicate', ['B2', 'B2']],
      ['an unknown carnet', ['Z9999']],
      ['a newly added inactive staff member', ['OLD']],
    ])('%s -> 400 naming `delegates`, nothing written', async (_l, list) => {
      const before = JSON.stringify(store.versions);
      const error = await rejection(
        update(4, { delegateCarnets: list, appliesFromYear: 2026 }),
      );
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('delegates');
      expect(JSON.stringify(store.versions)).toBe(before);
      expect(store.logs).toHaveLength(0);
    });

    it('an inactive delegate already in the version list is kept on an unrelated save and on a list that still holds it; "newly added" is judged against the version at Y', async () => {
      reset4([
        { from: 2026, to: 2027, directorCarnet: 'A1', delegates: ['OLD'] },
        { from: 2027, directorCarnet: 'A1', delegates: [] },
      ]);
      await update(4, { name: 'Renamed', appliesFromYear: 2026 });
      expect(shape(4)[0][2]).toEqual(['OLD']);
      await update(4, {
        delegateCarnets: ['OLD', 'B2'],
        appliesFromYear: 2026,
      });
      expect(shape(4)[0][2]).toEqual(['OLD', 'B2']);
      // The 2027 version does not hold OLD, so adding it THERE is a new addition.
      const error = await rejection(
        update(4, { delegateCarnets: ['OLD'], appliesFromYear: 2027 }),
      );
      expect(fieldOf(error)).toBe('delegates');
    });

    describe('I-6 per version (D-ORG-24)', () => {
      beforeEach(() =>
        reset4([
          { from: 2026, to: 2028, directorCarnet: 'A1' },
          { from: 2028, directorCarnet: 'D1' },
        ]),
      );

      it('Director as delegate: allowed from 2028 (only [2028, open) holds A1), 400 naming `delegates` from 2026 with no version changed', async () => {
        await update(4, { delegateCarnets: ['A1'], appliesFromYear: 2028 });
        expect(shape(4)).toEqual([
          [2026, 2028, [], 'A1'],
          [2028, null, ['A1'], 'D1'],
        ]);

        reset4([
          { from: 2026, to: 2028, directorCarnet: 'A1' },
          { from: 2028, directorCarnet: 'D1' },
        ]);
        const before = JSON.stringify(store.versions);
        store.logs = [];
        const error = await rejection(
          update(4, { delegateCarnets: ['A1'], appliesFromYear: 2026 }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('delegates');
        expect(JSON.stringify(store.versions)).toBe(before);
        expect(store.logs).toHaveLength(0);
      });

      it('an overlap that exists ONLY in a propagated later version is still a 400 (D1 directs [2028, open), reached by propagation from 2026)', async () => {
        const before = JSON.stringify(store.versions);
        const error = await rejection(
          update(4, { delegateCarnets: ['D1'], appliesFromYear: 2026 }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('delegates');
        expect(error.getResponse().message.description).toContain('2028');
        expect(JSON.stringify(store.versions)).toBe(before);
      });
    });

    it('Delegate made director: 400 naming `director` from 2027 and, through propagation, from 2026', async () => {
      reset4([
        { from: 2026, to: 2027, directorCarnet: 'A1' },
        { from: 2027, directorCarnet: 'A1', delegates: ['B2'] },
      ]);
      const before = JSON.stringify(store.versions);
      for (const year of [2027, 2026]) {
        const error = await rejection(
          update(4, { directorCarnet: 'B2', appliesFromYear: year }),
        );
        expect(error.getStatus()).toBe(400);
        expect(fieldOf(error)).toBe('director');
      }
      expect(JSON.stringify(store.versions)).toBe(before);
    });

    it('one request that moves the director away from A1 and adds A1 as a delegate is ACCEPTED (overlap computed after the save)', async () => {
      await update(4, {
        directorCarnet: 'C3',
        delegateCarnets: ['A1'],
        appliesFromYear: 2026,
      });
      expect(shape(4)).toEqual([[2026, null, ['A1'], 'C3']]);
      expect(store.logs).toHaveLength(1);
    });

    it('B9 writes the delegates into the first version with a create diff, and rejects the director among them', async () => {
      await create({ directorCarnet: 'A1', delegateCarnets: ['B2', 'C3'] });
      expect(store.versions.at(-1)).toMatchObject({
        directorCarnet: 'A1',
        delegates: ['B2', 'C3'],
      });
      expect(store.logs[0].changes.delegates).toEqual({
        old: [],
        new: ['B2', 'C3'],
      });
      const error = await rejection(
        create({ directorCarnet: 'A1', delegateCarnets: ['A1'] }),
      );
      expect(fieldOf(error)).toBe('delegates');
    });

    it('never writes a delegates_change row, on any path', async () => {
      await update(4, { delegateCarnets: ['B2'], appliesFromYear: 2027 });
      await update(4, { delegateCarnets: ['C3'], appliesFromYear: 2026 });
      await update(4, { delegateCarnets: [], appliesFromYear: 2027 });
      await create({ delegateCarnets: ['B2'] });
      expect(store.logs.length).toBeGreaterThan(0);
      expect(store.logs.map((l) => l.action)).not.toContain('delegates_change');
    });
  });

  describe('level change keeps the children valid (I-3 for children, R-ORG-003)', () => {
    beforeEach(() => {
      store.unit(5, 'ORG-005', [{ levelId: L3, name: 'Office', parentId: 2 }]);
      store.unit(6, 'ORG-006', [{ levelId: L4, name: 'Unit', parentId: 5 }]);
      store.writes = 0;
    });

    it('L2 -> L1 with an L3 child is 400 naming `level` and the child code, and no version changes', async () => {
      const before = JSON.stringify(store.versions);
      const error = await rejection(
        update(2, { levelId: 20, parentId: null, appliesFromYear: 2026 }),
      );
      expect(error.getStatus()).toBe(400);
      expect(fieldOf(error)).toBe('level');
      expect(error.getResponse().message.description).toContain(
        'ORG-005 (2026 onward)',
      );
      expect(JSON.stringify(store.versions)).toBe(before);
      expect(store.writes).toBe(0);
      expect(store.logs).toHaveLength(0);
    });

    it('also rejects it as a scheduled change from 2028 and names only the years it would break', async () => {
      const error = await rejection(
        update(2, { levelId: 20, parentId: null, appliesFromYear: 2028 }),
      );
      expect(fieldOf(error)).toBe('level');
      expect(error.getResponse().message.description).toContain('2028 onward');
    });

    it('allows a level change every child still accepts (L3 -> L2 keeps its L4 child)', async () => {
      await expect(
        update(5, { levelId: L2, parentId: 1, appliesFromYear: 2026 }),
      ).resolves.toBeDefined();
      expect(store.versionsOf(5)[0].levelId).toBe(L2);
    });
  });

  describe('save outcome: the action the service actually logged (design 4)', () => {
    const twoVersions = () => {
      store.versions = store.versions.filter((v) => v.unitId !== 4);
      store.unit(4, 'ORG-004', [
        { from: 2026, to: 2028, levelId: L4, name: 'Old', parentId: 2 },
        { from: 2028, to: null, levelId: L4, name: 'Newer', parentId: 2 },
      ]);
    };

    it('create -> action create with the year and back-date flag', async () => {
      today = 2027;
      const res = await create({ appliesFromYear: 2026, backdate: true });
      expect(res.outcome).toEqual({
        action: 'create',
        appliesFromYear: 2026,
        backdated: true,
      });
    });

    it.each([
      [
        'a rename in the start year of the only version',
        { name: 'X', appliesFromYear: 2026 },
        'edit_in_place',
        2026,
      ],
      [
        'a move from a later year',
        { parentId: 3, appliesFromYear: 2027 },
        'new_version',
        2027,
      ],
      ['a code-only change', { code: 'ORG-444' }, 'code_change', null],
      [
        'a delegates-only change from a later year',
        { delegateCarnets: ['B2'], appliesFromYear: 2027 },
        'new_version',
        2027,
      ],
      [
        'a delegates-only change in the start year',
        { delegateCarnets: ['B2'], appliesFromYear: 2026 },
        'edit_in_place',
        2026,
      ],
    ])('%s -> %s', async (_l, dto, action, year) => {
      const res = await update(4, dto as UpdateOrgUnitDto);
      expect(res.outcome).toEqual({
        action,
        appliesFromYear: year,
        backdated: false,
      });
      expect(store.logs.at(-1).action).toBe(action);
    });

    it('two-version fixture: a rename applying from 2028 edits the 2028 version in place', async () => {
      twoVersions();
      const res = await update(4, { name: 'Renamed', appliesFromYear: 2028 });
      expect(res.outcome).toEqual({
        action: 'edit_in_place',
        appliesFromYear: 2028,
        backdated: false,
      });
    });

    it('two-version fixture: a rename applying from 2026 edits the 2026 version in place (not "new version")', async () => {
      twoVersions();
      const res = await update(4, { name: 'Renamed', appliesFromYear: 2026 });
      expect(res.outcome).toEqual({
        action: 'edit_in_place',
        appliesFromYear: 2026,
        backdated: false,
      });
    });

    it('a back-date reports backdated true', async () => {
      today = 2027;
      const res = await update(4, {
        parentId: 3,
        appliesFromYear: 2026,
        backdate: true,
      });
      expect(res.outcome).toEqual({
        action: 'edit_in_place',
        appliesFromYear: 2026,
        backdated: true,
      });
    });

    it('a code change together with a version change reports the VERSION action (the one row carries both)', async () => {
      const res = await update(4, {
        name: 'N',
        code: 'ORG-444',
        appliesFromYear: 2027,
      });
      expect(res.outcome.action).toBe('new_version');
      expect(store.logs).toHaveLength(1);
    });

    it('a no-op reports action null, no year, not back-dated, and logs nothing', async () => {
      const res = await update(4, {
        name: 'Data Science',
        appliesFromYear: 2027,
      });
      expect(res.outcome).toEqual({
        action: null,
        appliesFromYear: null,
        backdated: false,
      });
      expect(store.logs).toHaveLength(0);
    });
  });

  it('warns on a blocked write (design 9)', async () => {
    await rejection(update(4, { name: 'X' }));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('org_structure.blocked action=update status=400'),
    );
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrgStructureReadService } from './org-structure-read.service';
import { OrgStructureClock } from './org-structure.clock';
import { OrgResolvedUnit } from './organizational-structure.types';
import { YearViewRawRow } from './repositories/org-unit.repository';

/**
 * Read service unit tests. The repositories are mocked, so these pin the
 * service's OWN behavior: range validation against the injected clock, the
 * parameters handed to the repository, and the row mapping. They cannot show
 * which rows the database returns for a year (SQL coverage, KZ-001): that is
 * proven on the real database by
 * `test/org-structure-year-view.integration-spec.ts`.
 */
describe('OrgStructureReadService', () => {
  let service: OrgStructureReadService;
  let year: number;

  const unitRepo = {
    findYearViewRows: jest.fn(),
    findVersionStartBounds: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const versionRepo = {
    findDetailedByUnit: jest.fn(),
    findCoveringByUnits: jest.fn(),
    countChildEntries: jest.fn(),
  };
  const delegateRepo = { findStaffByUnitIds: jest.fn() };
  const changeLogRepo = { findRowsByUnit: jest.fn() };
  const registry = { getBreakdown: jest.fn() };
  const clock: OrgStructureClock = { currentYear: () => year };

  const rawRow = (over: Partial<YearViewRawRow> = {}): YearViewRawRow => ({
    id: '7',
    code: 'ORG-007',
    status: 'active',
    status_from_year: null,
    valid_from_year: 2026,
    valid_to_year: null,
    name: 'Data & AI',
    acronym: 'DAI',
    level_value_id: '23',
    level_code: 'L4',
    level_name: 'Unit',
    parent_id: '3',
    parent_code: 'ORG-003',
    parent_name: 'Science',
    director_carnet: 'A1234',
    director_first_name: 'Ana',
    director_last_name: 'Perez',
    director_email: 'ana@example.org',
    director_is_active: 1,
    scheduled_from_year: null,
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    year = 2026;
    unitRepo.findYearViewRows.mockResolvedValue([]);
    delegateRepo.findStaffByUnitIds.mockResolvedValue([]);
    service = new OrgStructureReadService(
      unitRepo as never,
      versionRepo as never,
      delegateRepo as never,
      clock,
      changeLogRepo as never,
      registry as never,
    );
  });

  describe('year range of the request (design 5.1)', () => {
    it.each([2000, 2026, 2036])('accepts %i with today in 2026', async (y) => {
      await expect(service.getYearView(y)).resolves.toEqual([]);
      expect(unitRepo.findYearViewRows).toHaveBeenCalledWith(y, false);
    });

    it.each([1999, 2037, 20277, 2026.5])(
      'rejects %s with a 400 naming `year`',
      async (y) => {
        const error = await service.getYearView(y).catch((e) => e);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toEqual({
          message: expect.objectContaining({ field: 'year' }),
        });
        expect(unitRepo.findYearViewRows).not.toHaveBeenCalled();
      },
    );

    it('moves the upper bound with the injected clock, not the machine date', async () => {
      year = 2027;
      await expect(service.getYearView(2037)).resolves.toEqual([]);
      await expect(service.getYearView(2038)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('getYearView', () => {
    it('defaults the year to the injected current year', async () => {
      year = 2027;
      await service.getYearView();
      expect(unitRepo.findYearViewRows).toHaveBeenCalledWith(2027, false);
    });

    it('passes includeEnded through', async () => {
      await service.getYearView(2026, true);
      expect(unitRepo.findYearViewRows).toHaveBeenCalledWith(2026, true);
    });

    it('maps a row: numbers, director joined from staff, parent, scheduled year', async () => {
      unitRepo.findYearViewRows.mockResolvedValue([
        rawRow({ scheduled_from_year: 2028 }),
      ]);

      const [row] = await service.getYearView(2026);

      expect(row).toEqual({
        id: 7,
        code: 'ORG-007',
        status: 'active',
        statusFromYear: null,
        version: {
          from: 2026,
          to: null,
          name: 'Data & AI',
          acronym: 'DAI',
          levelId: 23,
          levelCode: 'L4',
          levelName: 'Unit',
          parentId: 3,
          parentCode: 'ORG-003',
          parentName: 'Science',
          director: {
            carnet: 'A1234',
            name: 'Ana Perez',
            email: 'ana@example.org',
            isActiveStaff: true,
          },
        },
        delegates: [],
        scheduledFromYear: 2028,
      });
    });

    it('maps an L1 with no parent, no director and no scheduled change to nulls', async () => {
      unitRepo.findYearViewRows.mockResolvedValue([
        rawRow({
          parent_id: null,
          parent_code: null,
          parent_name: null,
          director_carnet: null,
          director_first_name: null,
          director_last_name: null,
          director_email: null,
          director_is_active: null,
          acronym: null,
        }),
      ]);

      const [row] = await service.getYearView(2026);

      expect(row.version.parentId).toBeNull();
      expect(row.version.director).toBeNull();
      expect(row.version.acronym).toBeNull();
      expect(row.scheduledFromYear).toBeNull();
    });

    // D-ORG-4: the level is keyed by the immutable seeded value id (20-23),
    // never by the admin-editable control-list code or name.
    it.each([
      [20, 'L1'],
      [21, 'L2'],
      [22, 'L3'],
      [23, 'L4'],
    ])(
      'derives levelCode from level_value_id %i, ignoring an edited list code (-> %s)',
      async (levelValueId, expected) => {
        unitRepo.findYearViewRows.mockResolvedValue([
          rawRow({
            level_value_id: levelValueId,
            level_code: 'DIV',
            level_name: 'Renamed by an admin',
          }),
        ]);

        const [row] = await service.getYearView(2026);

        expect(row.version.levelId).toBe(levelValueId);
        expect(row.version.levelCode).toBe(expected);
        expect(row.version.levelName).toBe('Renamed by an admin');
      },
    );

    it('gives a null levelCode to a value id outside 20-23 instead of echoing the editable code', async () => {
      unitRepo.findYearViewRows.mockResolvedValue([
        rawRow({ level_value_id: 99, level_code: 'L1' }),
      ]);
      const [row] = await service.getYearView(2026);
      expect(row.version.levelCode).toBeNull();
    });

    it('marks a director whose staff row is inactive (R-ORG-016 "Inactive staff")', async () => {
      unitRepo.findYearViewRows.mockResolvedValue([
        rawRow({ director_is_active: 0 }),
      ]);
      const [row] = await service.getYearView(2026);
      expect(row.version.director.isActiveStaff).toBe(false);
    });

    it('carries an ended entry status and the year it took effect', async () => {
      unitRepo.findYearViewRows.mockResolvedValue([
        rawRow({
          status: 'deleted',
          status_from_year: 2027,
          valid_to_year: 2027,
        }),
      ]);
      const [row] = await service.getYearView(2027, true);
      expect(row.status).toBe('deleted');
      expect(row.statusFromYear).toBe(2027);
      expect(row.version.to).toBe(2027);
    });

    it('attaches the CURRENT delegates of each entry, in order, with an inactive mark', async () => {
      unitRepo.findYearViewRows.mockResolvedValue([
        rawRow({ id: '7' }),
        rawRow({ id: '8', code: 'ORG-008' }),
      ]);
      delegateRepo.findStaffByUnitIds.mockResolvedValue([
        {
          org_unit_id: '7',
          staff_carnet: 'B2001',
          first_name: 'Luis',
          last_name: 'Gomez',
          email: 'luis@example.org',
          is_active: 1,
        },
        {
          org_unit_id: '7',
          staff_carnet: 'B2002',
          first_name: 'Marta',
          last_name: 'Ruiz',
          email: null,
          is_active: 0,
        },
      ]);

      const rows = await service.getYearView(2026);

      expect(delegateRepo.findStaffByUnitIds).toHaveBeenCalledWith([7, 8]);
      expect(rows[0].delegates.map((d) => d.carnet)).toEqual([
        'B2001',
        'B2002',
      ]);
      expect(rows[0].delegates[1]).toMatchObject({
        name: 'Marta Ruiz',
        email: null,
        isActiveStaff: false,
      });
      expect(rows[1].delegates).toEqual([]);
    });
  });

  describe('getYearRange (B2)', () => {
    it('on an empty database is the current year only', async () => {
      unitRepo.findVersionStartBounds.mockResolvedValue({
        min_year: null,
        max_year: null,
      });
      await expect(service.getYearRange()).resolves.toEqual({
        min: 2026,
        max: 2026,
        current: 2026,
      });
    });

    it('spans the earliest to the latest version start', async () => {
      unitRepo.findVersionStartBounds.mockResolvedValue({
        min_year: 2024,
        max_year: 2029,
      });
      await expect(service.getYearRange()).resolves.toEqual({
        min: 2024,
        max: 2029,
        current: 2026,
      });
    });

    it('always contains the current year, also when every version starts later or earlier', async () => {
      unitRepo.findVersionStartBounds.mockResolvedValue({
        min_year: 2028,
        max_year: 2028,
      });
      await expect(service.getYearRange()).resolves.toEqual({
        min: 2026,
        max: 2028,
        current: 2026,
      });
      unitRepo.findVersionStartBounds.mockResolvedValue({
        min_year: 2024,
        max_year: 2025,
      });
      await expect(service.getYearRange()).resolves.toEqual({
        min: 2024,
        max: 2026,
        current: 2026,
      });
    });
  });

  describe('getUnitDetail (B5)', () => {
    it('answers 404 for an unknown entry and reads nothing else', async () => {
      unitRepo.findOne.mockResolvedValue(null);
      await expect(service.getUnitDetail(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(versionRepo.findDetailedByUnit).not.toHaveBeenCalled();
    });

    it('returns the entry, its versions oldest first and its delegates', async () => {
      unitRepo.findOne.mockResolvedValue({
        id: '7',
        code: 'ORG-007',
        status: 'inactive',
        status_from_year: 2028,
        successor_id: '9',
      });
      versionRepo.findDetailedByUnit.mockResolvedValue([
        rawRow({ valid_to_year: 2027 }),
        rawRow({ valid_from_year: 2027, valid_to_year: 2028, name: 'DAI' }),
      ]);
      delegateRepo.findStaffByUnitIds.mockResolvedValue([
        {
          org_unit_id: '7',
          staff_carnet: 'B2001',
          first_name: 'Luis',
          last_name: 'Gomez',
          email: 'luis@example.org',
          is_active: 1,
        },
      ]);

      const detail = await service.getUnitDetail(7);

      expect(detail).toMatchObject({
        id: 7,
        code: 'ORG-007',
        status: 'inactive',
        statusFromYear: 2028,
        successorId: 9,
      });
      expect(detail.versions.map((v) => [v.from, v.to])).toEqual([
        [2026, 2027],
        [2027, 2028],
      ]);
      expect(detail.versions[0].director.carnet).toBe('A1234');
      expect(detail.versions[0].levelCode).toBe('L4');
      expect(detail.delegates).toHaveLength(1);
    });
  });

  describe('B6 history and B7 change log (T-03, R-ORG-009, R-ORG-017)', () => {
    const logRaw = (over: Record<string, unknown> = {}) => ({
      id: '9',
      org_unit_id: '57',
      action: 'delegates_change',
      applies_from_year: null,
      backdated: 0,
      changes: JSON.stringify({
        delegates: { old: ['B2001'], new: ['B2002'] },
      }),
      created_at: new Date('2026-10-19T10:00:00.000Z'),
      created_by: '4242',
      user_first_name: 'Hector',
      user_last_name: 'Tobon',
      user_email: 'h@example.org',
      ...over,
    });

    it('B6 returns the versions and the log rows mapped (parsed changes, who, when)', async () => {
      unitRepo.findOne.mockResolvedValue({ id: 57 });
      versionRepo.findDetailedByUnit.mockResolvedValue([]);
      changeLogRepo.findRowsByUnit.mockResolvedValue([logRaw()]);

      const history = await service.getUnitHistory(57);

      expect(history.versions).toEqual([]);
      expect(history.log).toEqual([
        {
          id: 9,
          unitId: 57,
          action: 'delegates_change',
          appliesFromYear: null,
          backdated: false,
          changes: { delegates: { old: ['B2001'], new: ['B2002'] } },
          createdAt: '2026-10-19T10:00:00.000Z',
          createdBy: { id: 4242, name: 'Hector Tobon', email: 'h@example.org' },
        },
      ]);
    });

    it('B6 for an id that does not exist (also a physically deleted one) is the same 404 string as B5, and reads no log', async () => {
      unitRepo.findOne.mockResolvedValue(null);
      await expect(service.getUnitHistory(118)).rejects.toThrow(
        new NotFoundException('Organizational unit 118 not found'),
      );
      expect(changeLogRepo.findRowsByUnit).not.toHaveBeenCalled();
    });

    it('B7 reads the log with NO existence check, and passes already-parsed JSON and a missing user through', async () => {
      changeLogRepo.findRowsByUnit.mockResolvedValue([
        logRaw({
          action: 'delete_physical',
          changes: { name: { old: 'X', new: null } },
          created_by: null,
          user_first_name: null,
          user_last_name: null,
          user_email: null,
          backdated: 1,
        }),
      ]);

      const rows = await service.getChangeLog(118);

      expect(unitRepo.findOne).not.toHaveBeenCalled();
      expect(rows[0]).toMatchObject({
        action: 'delete_physical',
        backdated: true,
        changes: { name: { old: 'X', new: null } },
        createdBy: { id: null, name: null, email: null },
      });
    });
  });
  // -------------------------------------------------------------------------
  // T-04: the consumer contract (R-ORG-010, D-ORG-17, D-ORG-18).
  //
  // Scope (KZ-017): the repositories are mocked, so these pin the service's OWN
  // decisions - status as of the year, the null-version row, 404 naming the
  // missing ids, the 200-id cap, chain walking. WHICH version the database
  // returns for a year is pinned on real rows by
  // `test/org-structure-consumers.integration-spec.ts` (KZ-001).
  // -------------------------------------------------------------------------
  describe('consumer contract (T-04)', () => {
    type UnitFixture = {
      id: number;
      code: string;
      status: 'active' | 'inactive' | 'deleted';
      status_from_year: number | null;
      successor_id: number | null;
    };
    const unit = (
      over: Partial<UnitFixture> & { id: number },
    ): UnitFixture => ({
      code: `ORG-${over.id}`,
      status: 'active',
      status_from_year: null,
      successor_id: null,
      ...over,
    });
    /** A covering-version raw row. */
    const covering = (
      unitId: number,
      over: Record<string, unknown> = {},
    ): Record<string, unknown> => ({
      ...rawRow({ id: String(unitId) }),
      org_unit_id: String(unitId),
      unit_code: `ORG-${unitId}`,
      ...over,
    });

    describe('resolve', () => {
      // Rows of existing ids only; the `missing` marker has its own tests.
      const resolveAll = async (ids: number[], y?: number) =>
        (await service.resolve(ids, y)) as OrgResolvedUnit[];

      it('years before the end resolve the covering version and the status AS OF that year, not the current one (entry ended in 2027)', async () => {
        const ended = unit({
          id: 57,
          status: 'inactive',
          status_from_year: 2027,
        });
        unitRepo.find.mockResolvedValue([ended]);
        versionRepo.findCoveringByUnits.mockImplementation(
          async (_ids: number[], y: number) =>
            y < 2027 ? [covering(57, { valid_to_year: 2027 })] : [],
        );

        const [in2026] = await resolveAll([57], 2026);
        const [in2027] = await resolveAll([57], 2027);

        expect(in2026).toMatchObject({
          id: 57,
          year: 2026,
          status: 'active',
          statusFromYear: 2027,
        });
        expect(in2026.version).toMatchObject({ from: 2026, to: 2027 });
        expect(in2027).toMatchObject({
          id: 57,
          year: 2027,
          status: 'inactive',
          version: null,
        });
      });

      it('a deleted entry reads deleted from its end year; a reactivation gap reads inactive (D-ORG-17, D-ORG-18)', async () => {
        unitRepo.find.mockResolvedValue([
          unit({ id: 61, status: 'deleted', status_from_year: 2028 }),
          // inactivated 2027, reactivated 2029: the stored status is active again
          unit({ id: 62 }),
        ]);
        versionRepo.findCoveringByUnits.mockImplementation(
          async (_ids: number[], y: number) =>
            y >= 2029 ? [covering(62, { valid_from_year: 2029 })] : [],
        );

        const at2028 = await resolveAll([61, 62], 2028);
        expect(at2028.map((r) => [r.id, r.status, r.version])).toEqual([
          [61, 'deleted', null],
          [62, 'inactive', null],
        ]);
        const at2029 = await resolveAll([62], 2029);
        expect(at2029[0]).toMatchObject({ status: 'active' });
        expect(at2029[0].version).not.toBeNull();
      });

      it('returns one row per id in request order, collapses duplicates, and carries the current delegates', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 2 }), unit({ id: 1 })]);
        versionRepo.findCoveringByUnits.mockResolvedValue([
          covering(1),
          covering(2),
        ]);
        delegateRepo.findStaffByUnitIds.mockResolvedValue([
          {
            org_unit_id: '2',
            staff_carnet: 'D1',
            first_name: 'Eva',
            last_name: 'Lopez',
            email: 'eva@example.org',
            is_active: 1,
          },
        ]);

        const rows = await resolveAll([2, 1, 2]);

        expect(rows.map((r) => r.id)).toEqual([2, 1]);
        expect(versionRepo.findCoveringByUnits).toHaveBeenCalledWith(
          [2, 1],
          2026,
        );
        expect(rows[0].delegates).toEqual([
          expect.objectContaining({ carnet: 'D1', name: 'Eva Lopez' }),
        ]);
        expect(rows[1].delegates).toEqual([]);
        expect(rows[0].version).not.toHaveProperty('id');
        expect(rows[0].year).toBe(2026);
      });

      it('an entry whose first version starts after the year is returned with a null version and status inactive (documented, D-ORG-19b: not told apart from a gap year)', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 70 })]);
        versionRepo.findCoveringByUnits.mockResolvedValue([]);

        const [row] = await resolveAll([70], 2026);

        expect(row).toMatchObject({
          id: 70,
          version: null,
          status: 'inactive',
          statusFromYear: null,
        });
      });

      it('an id that does not exist comes back as { id, missing: true } in its place, request order kept, the call succeeds and the others resolve (D-ORG-19)', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 1 }), unit({ id: 3 })]);
        versionRepo.findCoveringByUnits.mockResolvedValue([
          covering(1),
          covering(3),
        ]);

        const rows = await service.resolve([3, 999, 1, 999, 3]);

        expect(rows.map((r) => r.id)).toEqual([3, 999, 1]);
        expect(rows[1]).toEqual({ id: 999, missing: true });
        expect(rows[0]).toMatchObject({ id: 3, status: 'active' });
        expect(rows[2]).toMatchObject({ id: 1, status: 'active' });
        expect(rows[0]).not.toHaveProperty('missing');
      });

      it('when every id is missing the call still succeeds with only missing rows', async () => {
        unitRepo.find.mockResolvedValue([]);
        versionRepo.findCoveringByUnits.mockResolvedValue([]);
        await expect(service.resolve([8, 9])).resolves.toEqual([
          { id: 8, missing: true },
          { id: 9, missing: true },
        ]);
      });

      it('accepts exactly 200 ids and rejects 201, none and a non-integer with a 400 naming `ids`, before any read', async () => {
        const many = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
        unitRepo.find.mockResolvedValue(many(200).map((id) => unit({ id })));
        versionRepo.findCoveringByUnits.mockResolvedValue([]);
        await expect(service.resolve(many(200))).resolves.toHaveLength(200);

        unitRepo.find.mockClear();
        for (const bad of [many(201), [], [1, Number.NaN], [0], [1.5]]) {
          const error = await service.resolve(bad).catch((e) => e);
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.getResponse()).toEqual({
            message: expect.objectContaining({ field: 'ids' }),
          });
        }
        expect(unitRepo.find).not.toHaveBeenCalled();
      });

      it('rejects a year outside 2000 to current + 10 with a 400 naming `year`', async () => {
        const error = await service.resolve([1], 1999).catch((e) => e);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toEqual({
          message: expect.objectContaining({ field: 'year' }),
        });
      });
    });

    describe('ancestors', () => {
      const node = (id: number, parentId: number | null, levelId: number) =>
        covering(id, {
          level_value_id: String(levelId),
          level_name: `Level ${levelId}`,
          parent_id: parentId === null ? null : String(parentId),
          name: `Unit ${id}`,
        });

      it('walks from the entry up to L1 with the structure of the requested year, entry first', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 57 })]);
        const tree: Record<number, Record<string, unknown>> = {
          57: node(57, 30, 23),
          30: node(30, 10, 21),
          10: node(10, null, 20),
        };
        versionRepo.findCoveringByUnits.mockImplementation(
          async (ids: number[]) => [tree[ids[0]]],
        );

        const chain = await service.ancestors(57, 2029);

        expect(chain.map((n) => [n.id, n.levelCode, n.parentId])).toEqual([
          [57, 'L4', 30],
          [30, 'L2', 10],
          [10, 'L1', null],
        ]);
        expect(versionRepo.findCoveringByUnits).toHaveBeenNthCalledWith(
          2,
          [30],
          2029,
        );
      });

      it('across a move the chain follows the version of the asked year (A before 2029, C from 2029)', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 57 })]);
        versionRepo.findCoveringByUnits.mockImplementation(
          async (ids: number[], y: number) =>
            ids[0] === 57
              ? [node(57, y >= 2029 ? 33 : 31, 23)]
              : [node(ids[0], null, 21)],
        );

        expect((await service.ancestors(57, 2028))[1].id).toBe(31);
        expect((await service.ancestors(57, 2029))[1].id).toBe(33);
      });

      it('400 naming `year` when the entry is not covered that year; 404 when unknown; the lookup never starts for an unknown id', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 57 })]);
        versionRepo.findCoveringByUnits.mockResolvedValue([]);
        const notCovered = await service.ancestors(57, 2031).catch((e) => e);
        expect(notCovered).toBeInstanceOf(BadRequestException);
        expect(notCovered.getResponse()).toEqual({
          message: expect.objectContaining({ field: 'year' }),
        });

        versionRepo.findCoveringByUnits.mockClear();
        unitRepo.find.mockResolvedValue([]);
        await expect(service.ancestors(404, 2026)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(versionRepo.findCoveringByUnits).not.toHaveBeenCalled();
      });
    });

    describe('successors', () => {
      it('follows a two-step chain in order, excludes the entry itself, and stops at the end', async () => {
        const all: Record<number, UnitFixture> = {
          1: unit({
            id: 1,
            status: 'inactive',
            status_from_year: 2027,
            successor_id: 2,
          }),
          2: unit({
            id: 2,
            status: 'inactive',
            status_from_year: 2029,
            successor_id: 3,
          }),
          3: unit({ id: 3 }),
        };
        unitRepo.find.mockResolvedValue([all[1]]);
        unitRepo.findOne.mockImplementation(
          async ({ where }: { where: { id: number } }) => all[where.id] ?? null,
        );

        const chain = await service.successors(1);

        expect(chain.map((n) => [n.id, n.status, n.successorId])).toEqual([
          [2, 'inactive', 3],
          [3, 'active', null],
        ]);
      });

      it('an entry with no successor returns an empty chain; an unknown entry is a 404', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 5 })]);
        await expect(service.successors(5)).resolves.toEqual([]);
        unitRepo.find.mockResolvedValue([]);
        await expect(service.successors(6)).rejects.toBeInstanceOf(
          NotFoundException,
        );
      });

      it('stops on a cycle instead of looping', async () => {
        const a = unit({ id: 1, successor_id: 2 });
        const b = unit({ id: 2, successor_id: 1 });
        unitRepo.find.mockResolvedValue([a]);
        unitRepo.findOne.mockResolvedValue(b);
        await expect(service.successors(1)).resolves.toHaveLength(1);
      });
    });

    describe('assertExists', () => {
      it('passes for existing ids (duplicates collapsed) and for an empty list without reading', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 1 }), unit({ id: 2 })]);
        await expect(service.assertExists([1, 2, 2])).resolves.toBeUndefined();
        unitRepo.find.mockClear();
        await expect(service.assertExists([])).resolves.toBeUndefined();
        expect(unitRepo.find).not.toHaveBeenCalled();
      });

      it('throws the B5-style 404 naming every missing id', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 1 })]);
        await expect(service.assertExists([1, 2, 3])).rejects.toThrow(
          new NotFoundException('Organizational units 2, 3 not found'),
        );
      });
    });

    describe('getLinkedData (B8)', () => {
      it('returns the child count from the current year plus the registry breakdown', async () => {
        unitRepo.find.mockResolvedValue([unit({ id: 57 })]);
        versionRepo.countChildEntries.mockResolvedValue(4);
        registry.getBreakdown.mockResolvedValue([
          { consumer: 'Test consumer', count: 3 },
        ]);

        const data = await service.getLinkedData(57);

        expect(versionRepo.countChildEntries).toHaveBeenCalledWith(57, 2026);
        expect(registry.getBreakdown).toHaveBeenCalledWith(57);
        expect(data).toEqual({
          childCount: 4,
          consumers: [{ consumer: 'Test consumer', count: 3 }],
        });
      });

      it('404 for an unknown entry, reading neither children nor consumers', async () => {
        unitRepo.find.mockResolvedValue([]);
        await expect(service.getLinkedData(9)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(versionRepo.countChildEntries).not.toHaveBeenCalled();
        expect(registry.getBreakdown).not.toHaveBeenCalled();
      });
    });
  });
});

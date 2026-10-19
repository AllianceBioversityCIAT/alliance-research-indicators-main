import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrgStructureReadService } from './org-structure-read.service';
import { OrgStructureClock } from './org-structure.clock';
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
  };
  const versionRepo = { findDetailedByUnit: jest.fn() };
  const delegateRepo = { findStaffByUnitIds: jest.fn() };
  const changeLogRepo = { findRowsByUnit: jest.fn() };
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
});

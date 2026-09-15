import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultQuantificationsService } from './result-quantifications.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { QuantificationRolesEnum } from '../quantification-roles/enum/quantification-roles.enum';

describe('ResultQuantificationsService', () => {
  let service: ResultQuantificationsService;
  const mockFind = jest.fn();
  const mockUpdate = jest.fn();
  const mockSave = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultQuantificationsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              update: mockUpdate,
              save: mockSave,
              metadata: { primaryColumns: [{ propertyName: 'id' }] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: { audit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ResultQuantificationsService>(
      ResultQuantificationsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 93
  describe('upsertQuantificationsByRole', () => {
    it('should deactivate all records and return empty array when quantifications is empty', async () => {
      mockUpdate.mockResolvedValue({ affected: 1 });

      const result = await service.upsertQuantificationsByRole(10, [], 1);

      expect(mockUpdate).toHaveBeenCalledWith(
        { result_id: 10, quantification_role_id: 1, is_active: true },
        { is_active: false },
      );
      expect(result).toEqual([]);
    });

    it('should save new records and return active ones when matching key not found', async () => {
      mockFind.mockResolvedValue([]);
      mockSave.mockResolvedValue([
        { id: 1, quantification_number: 5, unit: 'ha', is_active: true },
      ]);

      const result = await service.upsertQuantificationsByRole(
        10,
        [{ quantification_number: 5, unit: 'ha' }],
        QuantificationRolesEnum.ACTUAL_COUNT,
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should reactivate existing matching record', async () => {
      const existing = {
        id: 1,
        quantification_number: 5,
        unit: 'ha',
        description: '',
        is_active: false,
      };
      mockFind.mockResolvedValue([existing]);
      mockSave.mockResolvedValue([{ ...existing, is_active: true }]);

      const result = await service.upsertQuantificationsByRole(
        10,
        [{ quantification_number: 5, unit: 'ha' }],
        QuantificationRolesEnum.ACTUAL_COUNT,
      );

      expect(result[0].is_active).toBe(true);
    });
  });

  // [CLAUDE/DONE] 94
  describe('findByResultIdAndRoles', () => {
    it('should return active quantifications for the given result and roles', async () => {
      const mockRecords = [
        { id: 1, quantification_role_id: QuantificationRolesEnum.ACTUAL_COUNT },
      ];
      mockFind.mockResolvedValue(mockRecords);

      const result = await service.findByResultIdAndRoles(10, [
        QuantificationRolesEnum.ACTUAL_COUNT,
      ]);

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          result_id: 10,
          quantification_role_id: expect.anything(),
          is_active: true,
        },
      });
      expect(result).toEqual(mockRecords);
    });

    it('should return empty array when no records match', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByResultIdAndRoles(99, [
        QuantificationRolesEnum.ACTUAL_COUNT,
      ]);

      expect(result).toEqual([]);
    });
  });

  // T-03 (docs/specs/changes/measure-number-signed-decimal, DD-13, R-MSD-011)
  // Every assertion below goes through the real, inherited
  // `upsertByCompositeKeys` — never by calling `createCustomValidation`
  // directly — because a direct call bypasses the very `dataRole`
  // forwarding this task adds at base-service.ts:134/:347 and would stay
  // green even if that forwarding were removed (KZ-001).
  describe('createCustomValidation (per-role rule map, via upsertByCompositeKeys)', () => {
    beforeEach(() => {
      mockFind.mockResolvedValue([]);
      mockSave.mockImplementation((data) =>
        Promise.resolve(
          (Array.isArray(data) ? data : [data]).map((item, index) => ({
            id: index + 1,
            is_active: true,
            ...item,
          })),
        ),
      );
    });

    it('accepts a signed decimal for role 3 (Innovation Use)', async () => {
      const result = await service.upsertByCompositeKeys(
        10,
        [{ quantification_number: -12.75, unit: 'ha', description: 'test' }],
        ['quantification_number', 'unit', 'description'],
        QuantificationRolesEnum.INNOVATION_USE,
      );

      expect(result).toHaveLength(1);
      expect(result[0].quantification_number).toBe(-12.75);
    });

    it.each([
      ['ACTUAL_COUNT', QuantificationRolesEnum.ACTUAL_COUNT],
      ['EXTRAPOLATE_ESTIMATES', QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES],
    ])(
      'rejects the same signed decimal for role %s with 400',
      async (_label, role) => {
        await expect(
          service.upsertByCompositeKeys(
            10,
            [
              {
                quantification_number: -12.75,
                unit: 'ha',
                description: 'test',
              },
            ],
            ['quantification_number', 'unit', 'description'],
            role,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockSave).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['ACTUAL_COUNT', QuantificationRolesEnum.ACTUAL_COUNT],
      ['EXTRAPOLATE_ESTIMATES', QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES],
      ['INNOVATION_USE', QuantificationRolesEnum.INNOVATION_USE],
    ])(
      'accepts null quantification_number on role %s (R-MSD-011 AC.6)',
      async (_label, role) => {
        const result = await service.upsertByCompositeKeys(
          10,
          [{ quantification_number: null, unit: 'ha', description: 'test' }],
          ['quantification_number', 'unit', 'description'],
          role,
        );

        expect(result).toHaveLength(1);
        expect(mockSave).toHaveBeenCalled();
      },
    );

    it('rejects a negative integer for the default role (new sign-axis tightening, RK-14)', async () => {
      await expect(
        service.upsertByCompositeKeys(
          10,
          [{ quantification_number: -1, unit: 'ha', description: 'test' }],
          ['quantification_number', 'unit', 'description'],
          QuantificationRolesEnum.ACTUAL_COUNT,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a fractional value for the default role', async () => {
      await expect(
        service.upsertByCompositeKeys(
          10,
          [{ quantification_number: 2.5, unit: 'ha', description: 'test' }],
          ['quantification_number', 'unit', 'description'],
          QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a role-3 value outside the DD-14 magnitude bound', async () => {
      await expect(
        service.upsertByCompositeKeys(
          10,
          [{ quantification_number: 549_755_813_888, unit: 'ha' }],
          ['quantification_number', 'unit', 'description'],
          QuantificationRolesEnum.INNOVATION_USE,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a role-3 value with more than 4 decimal places', async () => {
      await expect(
        service.upsertByCompositeKeys(
          10,
          [{ quantification_number: 1.23456, unit: 'ha' }],
          ['quantification_number', 'unit', 'description'],
          QuantificationRolesEnum.INNOVATION_USE,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // Reviewer FAIL, Issue 2: 3 of these 7 values — 0.07, 1.005, 0.0003 —
    // carry binary floating-point error that makes `value * 10000`
    // non-integral; 2.55, 0.0001 and ±549,755,813,887 multiply exactly and
    // stay green under the old predicate, which is why they are present as
    // controls rather than as the discriminating cases. This table is the
    // one that reddens under the old `Number.isInteger(value * 10000)`
    // predicate and stays green only under the round-trip fix. Asserted on
    // the persisted row through the real, inherited `upsertByCompositeKeys`
    // (KZ-001).
    it.each([
      [0.07],
      [1.005],
      [0.0003],
      [2.55],
      [0.0001],
      [549_755_813_887],
      [-549_755_813_887],
    ])(
      'accepts role-3 value %p on the 4-decimal grid despite binary floating-point error',
      async (value) => {
        const result = await service.upsertByCompositeKeys(
          10,
          [{ quantification_number: value, unit: 'ha', description: 'test' }],
          ['quantification_number', 'unit', 'description'],
          QuantificationRolesEnum.INNOVATION_USE,
        );

        expect(result).toHaveLength(1);
        expect(result[0].quantification_number).toBe(value);
      },
    );

    it.each([[1.23456], [0.00005], [1e-7]])(
      'rejects role-3 value %p with a fifth fractional digit',
      async (value) => {
        await expect(
          service.upsertByCompositeKeys(
            10,
            [
              {
                quantification_number: value,
                unit: 'ha',
                description: 'test',
              },
            ],
            ['quantification_number', 'unit', 'description'],
            QuantificationRolesEnum.INNOVATION_USE,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockSave).not.toHaveBeenCalled();
      },
    );

    it('selects the rule from the dataRole PARAMETER, never from a quantification_role_id on the payload (M-01)', async () => {
      // Simulates an OICR-shaped call: the real call site passes
      // dataRole = ACTUAL_COUNT (1), but the row itself — typed as the
      // full entity, per DD-13's own warning about `update-oicr.dto.ts` —
      // carries a client-supplied quantification_role_id of 3. If the map
      // were payload-keyed, this would buy the permissive role-3 rule and
      // -12.75 would be accepted; it must still be rejected as role 1.
      await expect(
        service.upsertByCompositeKeys(
          10,
          [
            {
              quantification_number: -12.75,
              unit: 'ha',
              description: 'test',
              quantification_role_id: QuantificationRolesEnum.INNOVATION_USE,
            },
          ],
          ['quantification_number', 'unit', 'description'],
          QuantificationRolesEnum.ACTUAL_COUNT,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockSave).not.toHaveBeenCalled();
    });
  });
});

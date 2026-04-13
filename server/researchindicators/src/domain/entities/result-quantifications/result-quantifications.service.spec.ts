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

    service = module.get<ResultQuantificationsService>(ResultQuantificationsService);
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
});

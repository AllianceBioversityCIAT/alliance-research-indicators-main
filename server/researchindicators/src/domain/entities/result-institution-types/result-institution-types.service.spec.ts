import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultInstitutionTypesService } from './result-institution-types.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { ClarisaInstitutionTypeEnum } from '../../tools/clarisa/entities/clarisa-institution-types/enum/clarisa-institution-type.enum';

describe('ResultInstitutionTypesService', () => {
  let service: ResultInstitutionTypesService;

  const mockUpdate = jest.fn();
  const mockFindOne = jest.fn();
  const mockSave = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1, created_by: 1 }),
  };

  const mockRepo = {
    find: jest.fn(),
    findOne: mockFindOne,
    save: mockSave,
    update: mockUpdate,
    metadata: {
      primaryColumns: [{ propertyName: 'result_institution_type_id' }],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInstitutionTypesService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue(mockRepo),
          },
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultInstitutionTypesService>(
      ResultInstitutionTypesService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 70
  describe('saveInnovationDev', () => {
    it('should call create for OTHER type institutions', async () => {
      const createSpy = jest
        .spyOn(service as any, 'create')
        .mockResolvedValue([{ result_institution_type_id: 1 }]);
      const mockManager = { getRepository: jest.fn() } as any;

      await service.saveInnovationDev(
        10,
        [
          {
            institution_type_id: ClarisaInstitutionTypeEnum.OTHER,
            institution_type_custom_name: 'Custom',
          } as any,
        ],
        mockManager,
      );

      expect(createSpy).toHaveBeenCalledWith(
        10,
        expect.any(Array),
        'institution_type_custom_name',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        mockManager,
        ['institution_type_id'],
      );
    });

    it('should call create for regular type institutions (non-OTHER, no sub_type)', async () => {
      const createSpy = jest
        .spyOn(service as any, 'create')
        .mockResolvedValue([{ result_institution_type_id: 2 }]);
      const mockManager = { getRepository: jest.fn() } as any;

      await service.saveInnovationDev(
        10,
        [
          {
            institution_type_id: 5,
            sub_institution_type_id: null,
          } as any,
        ],
        mockManager,
      );

      expect(createSpy).toHaveBeenCalledWith(
        10,
        expect.any(Array),
        'institution_type_id',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        mockManager,
        undefined,
        undefined,
        [],
      );
    });

    it('should not call create when data is empty', async () => {
      const createSpy = jest
        .spyOn(service as any, 'create')
        .mockResolvedValue([]);
      const mockManager = { getRepository: jest.fn() } as any;

      await service.saveInnovationDev(10, [], mockManager);

      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  // [CLAUDE/DONE] 71
  describe('customSaveInnovationDev', () => {
    it('should deactivate existing records and save new ones', async () => {
      const mockTempRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        save: jest.fn().mockResolvedValue([{ result_institution_type_id: 1 }]),
      };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockTempRepo),
      } as any;

      const data = [
        {
          institution_type_id: 5,
          sub_institution_type_id: null,
          is_organization_known: false,
        } as any,
      ];

      const result = await service.customSaveInnovationDev(
        10,
        data,
        mockManager,
      );

      expect(mockTempRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ result_id: 10, is_active: true }),
        { is_active: false },
      );
      expect(mockTempRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should deduplicate data before saving', async () => {
      const mockTempRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        save: jest.fn().mockResolvedValue([]),
      };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockTempRepo),
      } as any;

      const data = [
        {
          institution_type_id: 5,
          sub_institution_type_id: null,
          is_organization_known: false,
        } as any,
        {
          institution_type_id: 5,
          sub_institution_type_id: null,
          is_organization_known: false,
        } as any,
      ];

      await service.customSaveInnovationDev(10, data, mockManager);

      const savedData = mockTempRepo.save.mock.calls[0][0];
      expect(savedData).toHaveLength(1);
    });
  });
});

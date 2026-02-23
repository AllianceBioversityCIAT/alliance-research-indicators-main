import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResultInstitutionsService } from './result-institutions.service';
import { ResultInstitution } from './entities/result-institution.entity';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultCapacitySharing } from '../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { Result } from '../results/entities/result.entity';
import { SessionFormatEnum } from '../session-formats/enums/session-format.enum';

describe('ResultInstitutionsService', () => {
  let service: ResultInstitutionsService;
  let dataSource: DataSource; // eslint-disable-line @typescript-eslint/no-unused-vars
  let currentUserUtil: CurrentUserUtil; // eslint-disable-line @typescript-eslint/no-unused-vars
  let updateDataUtil: UpdateDataUtil; // eslint-disable-line @typescript-eslint/no-unused-vars

  const mockRepository = {
    metadata: {
      primaryColumns: [{ propertyName: 'result_institution_id' }],
    },
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn((entity) => {
      if (entity === ResultInstitution) {
        return mockRepository;
      }
      return mockRepository;
    }),
    transaction: jest.fn(),
  };

  const mockCurrentUserUtil = {
    getUserId: jest.fn().mockReturnValue(1),
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInstitutionsService,
        {
          provide: getRepositoryToken(ResultInstitution),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CurrentUserUtil,
          useValue: mockCurrentUserUtil,
        },
        {
          provide: UpdateDataUtil,
          useValue: mockUpdateDataUtil,
        },
      ],
    }).compile();

    service = module.get<ResultInstitutionsService>(ResultInstitutionsService);
    dataSource = module.get<DataSource>(DataSource);
    currentUserUtil = module.get<CurrentUserUtil>(CurrentUserUtil);
    updateDataUtil = module.get<UpdateDataUtil>(UpdateDataUtil);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findInstitutionsByRoleResult', () => {
    it('should find institutions by role and result', async () => {
      const resultId = 1;
      const institutionRoleId = InstitutionRolesEnum.PARTNERS;
      const expectedResult = [
        {
          result_institution_id: 1,
          result_id: resultId,
          institution_id: 1,
          institution_role_id: institutionRoleId,
          is_active: true,
        },
      ] as ResultInstitution[];

      mockRepository.find.mockResolvedValue(expectedResult);

      const result = await service.findInstitutionsByRoleResult(
        resultId,
        institutionRoleId,
      );

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          institution_role_id: institutionRoleId,
          result_id: resultId,
          is_active: true,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOneInstitutionByRoleResult', () => {
    it('should find one institution by role and result', async () => {
      const resultId = 1;
      const institutionRoleId = InstitutionRolesEnum.PARTNERS;
      const expectedResult = {
        result_institution_id: 1,
        result_id: resultId,
        institution_id: 1,
        institution_role_id: institutionRoleId,
        is_active: true,
      } as ResultInstitution;

      mockRepository.findOne.mockResolvedValue(expectedResult);

      const result = await service.findOneInstitutionByRoleResult(
        resultId,
        institutionRoleId,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          institution_role_id: institutionRoleId,
          result_id: resultId,
          is_active: true,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should find all institutions for a result without specific role', async () => {
      const resultId = 1;
      const mockInstitutions = [
        {
          result_institution_id: 1,
          result_id: resultId,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          is_active: true,
        } as ResultInstitution,
      ];

      mockRepository.find.mockResolvedValue(mockInstitutions);

      const result = await service.findAll(resultId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          result_id: resultId,
          is_active: true,
        },
        relations: {
          institution: {
            institution_type: true,
          },
        },
      });
      expect(result).toEqual({
        institutions: mockInstitutions,
      });
    });

    it('should find all institutions for a result with PARTNERS role', async () => {
      const resultId = 1;
      const mockInstitutions = [
        {
          result_institution_id: 1,
          result_id: resultId,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          is_active: true,
        } as ResultInstitution,
      ];

      mockRepository.find.mockResolvedValue(mockInstitutions);

      const result = await service.findAll(
        resultId,
        InstitutionRolesEnum.PARTNERS,
      );

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          result_id: resultId,
          is_active: true,
        },
        relations: {
          institution: {
            institution_type: true,
          },
        },
      });
      expect(result).toEqual({
        institutions: mockInstitutions,
        is_partner_not_applicable: undefined,
      });
    });

    it('should query and return is_partner_not_applicable when role is PARTNERS', async () => {
      const resultId = 1;
      const mockInstitutions = [
        {
          result_institution_id: 1,
          result_id: resultId,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          is_active: true,
        } as ResultInstitution,
      ];
      const mockCapacitySharing = {
        session_format_id: SessionFormatEnum.GROUP,
      };
      const mockResult = {
        is_partner_not_applicable: true,
      };

      mockRepository.find.mockResolvedValue(mockInstitutions);

      // Mock the Result repository to return the is_partner_not_applicable field
      const mockResultRepo = {
        ...mockRepository,
        findOne: jest.fn().mockResolvedValue(mockResult),
      };

      // Mock the capacity sharing repository call
      const mockCapacitySharingRepo = {
        ...mockRepository,
        findOne: jest.fn().mockResolvedValue(mockCapacitySharing),
      };

      mockDataSource.getRepository.mockImplementation((entity) => {
        if (entity === ResultCapacitySharing) {
          return mockCapacitySharingRepo;
        }
        if (entity === Result) {
          return mockResultRepo;
        }
        return mockRepository;
      });

      // Mock the filterInstitutions method
      const filterInstitutionsSpy = jest.spyOn(
        service as any,
        'filterInstitutions',
      );
      filterInstitutionsSpy.mockReturnValue(mockInstitutions);

      const result = await service.findAll(
        resultId,
        InstitutionRolesEnum.PARTNERS,
      );

      // Verify that the Result repository was called to get is_partner_not_applicable
      expect(mockResultRepo.findOne).toHaveBeenCalledWith({
        where: {
          result_id: resultId,
          is_active: true,
        },
        select: {
          is_partner_not_applicable: true,
        },
      });

      // Verify that is_partner_not_applicable is included in the response
      expect(result).toEqual({
        institutions: mockInstitutions,
        is_partner_not_applicable: true,
      });
    });

    it('should handle case when is_partner_not_applicable is null for PARTNERS role', async () => {
      const resultId = 1;
      const mockInstitutions = [
        {
          result_institution_id: 1,
          result_id: resultId,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          is_active: true,
        } as ResultInstitution,
      ];
      const mockCapacitySharing = {
        session_format_id: SessionFormatEnum.GROUP,
      };

      mockRepository.find.mockResolvedValue(mockInstitutions);

      // Mock the Result repository to return null (no result found)
      const mockResultRepo = {
        ...mockRepository,
        findOne: jest.fn().mockResolvedValue(null),
      };

      // Mock the capacity sharing repository call
      const mockCapacitySharingRepo = {
        ...mockRepository,
        findOne: jest.fn().mockResolvedValue(mockCapacitySharing),
      };

      mockDataSource.getRepository.mockImplementation((entity) => {
        if (entity === ResultCapacitySharing) {
          return mockCapacitySharingRepo;
        }
        if (entity === Result) {
          return mockResultRepo;
        }
        return mockRepository;
      });

      // Mock the filterInstitutions method
      const filterInstitutionsSpy = jest.spyOn(
        service as any,
        'filterInstitutions',
      );
      filterInstitutionsSpy.mockReturnValue(mockInstitutions);

      const result = await service.findAll(
        resultId,
        InstitutionRolesEnum.PARTNERS,
      );

      // Verify that the Result repository was called
      expect(mockResultRepo.findOne).toHaveBeenCalledWith({
        where: {
          result_id: resultId,
          is_active: true,
        },
        select: {
          is_partner_not_applicable: true,
        },
      });

      // Verify that is_partner_not_applicable is undefined when no result is found
      expect(result).toEqual({
        institutions: mockInstitutions,
        is_partner_not_applicable: undefined,
      });
    });

    it('should not query is_partner_not_applicable when role is not PARTNERS', async () => {
      const resultId = 1;
      const mockInstitutions = [
        {
          result_institution_id: 1,
          result_id: resultId,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.TRAINEE_AFFILIATION,
          is_active: true,
        } as ResultInstitution,
      ];

      mockRepository.find.mockResolvedValue(mockInstitutions);

      // Mock the Result repository
      const mockResultRepo = {
        ...mockRepository,
        findOne: jest.fn(),
      };

      mockDataSource.getRepository.mockImplementation((entity) => {
        if (entity === Result) {
          return mockResultRepo;
        }
        return mockRepository;
      });

      const result = await service.findAll(
        resultId,
        InstitutionRolesEnum.TRAINEE_AFFILIATION,
      );

      // Verify that the Result repository was NOT called when role is not PARTNERS
      expect(mockResultRepo.findOne).not.toHaveBeenCalled();

      // Verify that is_partner_not_applicable is undefined for non-PARTNERS roles
      expect(result).toEqual({
        institutions: mockInstitutions,
        is_partner_not_applicable: undefined,
      });
    });
  });

  describe('updatePartners', () => {
    it('should update partners when is_partner_not_applicable is false', async () => {
      const resultId = 1;
      const createDto: CreateResultInstitutionDto = {
        is_partner_not_applicable: false,
        institutions: [
          {
            result_institution_id: 1,
            result_id: resultId,
            institution_id: 1,
            institution_role_id: InstitutionRolesEnum.PARTNERS,
            is_active: true,
          } as ResultInstitution,
        ],
      };

      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue({}),
        }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockManager);
      });

      // Mock the create method
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue([]);

      await service.updatePartners(resultId, createDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.getRepository).toHaveBeenCalledWith(Result);
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
        mockManager,
      );
    });

    it('should update partners when is_partner_not_applicable is true', async () => {
      const resultId = 1;
      const createDto: CreateResultInstitutionDto = {
        is_partner_not_applicable: true,
        institutions: [
          {
            result_institution_id: 1,
            result_id: resultId,
            institution_id: 1,
            institution_role_id: InstitutionRolesEnum.PARTNERS,
            is_active: true,
          } as ResultInstitution,
        ],
      };

      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue({}),
        }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockManager);
      });

      // Mock the create method
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue([]);

      await service.updatePartners(resultId, createDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.getRepository).toHaveBeenCalledWith(Result);
      expect(createSpy).toHaveBeenCalledWith(
        resultId,
        [], // should be empty array when is_partner_not_applicable is true
        'institution_id',
        InstitutionRolesEnum.PARTNERS,
        mockManager,
      );
    });
  });

  describe('filterInstitutions', () => {
    it('should filter institutions for GROUP session format', () => {
      const institutions = [
        {
          result_institution_id: 1,
          result_id: 123,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          is_active: true,
        } as ResultInstitution,
        {
          result_institution_id: 2,
          result_id: 123,
          institution_id: 1,
          institution_role_id:
            InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
          is_active: true,
        } as ResultInstitution,
      ];

      const result = service['filterInstitutions'](
        institutions,
        SessionFormatEnum.GROUP,
      );

      expect(result).toHaveLength(1);
      expect(result[0].institution_role_id).toBe(
        InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
      );
    });

    it('should filter institutions for INDIVIDUAL session format', () => {
      const institutions = [
        {
          result_institution_id: 1,
          result_id: 123,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          is_active: true,
        } as ResultInstitution,
        {
          result_institution_id: 2,
          result_id: 123,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.TRAINEE_AFFILIATION,
          is_active: true,
        } as ResultInstitution,
      ];

      const result = service['filterInstitutions'](
        institutions,
        SessionFormatEnum.INDIVIDUAL,
      );

      expect(result).toHaveLength(1);
      expect(result[0].institution_role_id).toBe(
        InstitutionRolesEnum.TRAINEE_AFFILIATION,
      );
    });

    it('should filter institutions for default session format', () => {
      const institutions = [
        {
          result_institution_id: 1,
          result_id: 123,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.PARTNERS,
          is_active: true,
        } as ResultInstitution,
        {
          result_institution_id: 2,
          result_id: 123,
          institution_id: 1,
          institution_role_id: InstitutionRolesEnum.TRAINEE_AFFILIATION,
          is_active: true,
        } as ResultInstitution,
      ];

      const result = service['filterInstitutions'](institutions);

      expect(result).toHaveLength(1);
      expect(result[0].institution_role_id).toBe(InstitutionRolesEnum.PARTNERS);
    });
  });
});

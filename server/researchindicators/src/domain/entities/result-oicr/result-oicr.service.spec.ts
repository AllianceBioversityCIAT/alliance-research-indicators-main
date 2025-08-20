import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultOicrService } from './result-oicr.service';
import { ResultOicr } from './entities/result-oicr.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultTagsService } from '../result-tags/result-tags.service';
import { ResultUsersService } from '../result-users/result-users.service';
import { LinkResultsService } from '../link-results/link-results.service';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultInitiativesService } from '../result-initiatives/result-initiatives.service';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { ResultsService } from '../results/results.service';
import { StepOneOicrDto } from './dto/step-one-oicr.dto';
import { StepTwoOicrDto } from './dto/step-two-oicr.dto';
import { CreateStepsOicrDto } from './dto/create-steps-oicr.dto';
import { CreateResultOicrDto } from './dto/create-result-oicr.dto';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';

describe('ResultOicrService', () => {
  let service: ResultOicrService;
  let mockMainRepo: jest.Mocked<Repository<ResultOicr>>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockCurrentUser: jest.Mocked<CurrentUserUtil>;
  let mockResultTagsService: jest.Mocked<ResultTagsService>;
  let mockResultUsersService: jest.Mocked<ResultUsersService>;
  let mockLinkResultsService: jest.Mocked<LinkResultsService>;
  let mockUpdateDataUtil: jest.Mocked<UpdateDataUtil>;
  let mockResultInitiativesService: jest.Mocked<ResultInitiativesService>;
  let mockResultLeversService: jest.Mocked<ResultLeversService>;
  let mockResultsService: jest.Mocked<ResultsService>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    mockMainRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockMainRepo),
      transaction: jest.fn(),
    } as any;

    mockCurrentUser = {
      user_id: 123,
      audit: jest.fn(),
    } as any;

    mockResultTagsService = {
      create: jest.fn(),
      find: jest.fn(),
    } as any;

    mockResultUsersService = {
      create: jest.fn(),
      findUsersByRoleResult: jest.fn(),
    } as any;

    mockLinkResultsService = {
      create: jest.fn(),
      find: jest.fn(),
    } as any;

    mockUpdateDataUtil = {
      updateLastUpdatedDate: jest.fn(),
    } as any;

    mockResultInitiativesService = {
      create: jest.fn(),
      find: jest.fn(),
    } as any;

    mockResultLeversService = {
      create: jest.fn(),
      find: jest.fn(),
    } as any;

    mockResultsService = {
      createResult: jest.fn(),
      saveGeoLocation: jest.fn(),
      findGeoLocation: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultOicrService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: ResultTagsService, useValue: mockResultTagsService },
        { provide: ResultUsersService, useValue: mockResultUsersService },
        { provide: LinkResultsService, useValue: mockLinkResultsService },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        {
          provide: ResultInitiativesService,
          useValue: mockResultInitiativesService,
        },
        { provide: ResultLeversService, useValue: mockResultLeversService },
        { provide: ResultsService, useValue: mockResultsService },
      ],
    }).compile();

    service = module.get<ResultOicrService>(ResultOicrService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new ResultOicr', async () => {
      // Arrange
      const resultId = 123;
      const newResultOicr = { result_id: resultId };
      const savedResultOicr = { result_id: resultId, id: 1 };

      mockMainRepo.create.mockReturnValue(newResultOicr as any);
      mockMainRepo.save.mockResolvedValue(savedResultOicr as any);

      // Act
      const result = await service.create(resultId);

      // Assert
      expect(mockMainRepo.create).toHaveBeenCalledWith({ result_id: resultId });
      expect(mockMainRepo.save).toHaveBeenCalledWith(newResultOicr);
      expect(result).toEqual(savedResultOicr);
    });
  });

  describe('createOicr', () => {
    it('should create a complete OICR result with all steps', async () => {
      // Arrange
      const mockCreateData: CreateResultOicrDto = {
        base_information: {
          result_type_id: 1,
          title: 'Test Result',
          description: 'Test Description',
        } as any,
        step_one: {
          outcome_impact_statement: 'Test outcome',
          main_contact_person: { user_id: 123 },
          tagging: [{ tag_id: 1 }],
          linked_result: [{ other_result_id: 456 }],
        } as any,
        step_two: {
          initiatives: [{ clarisa_initiative_id: 1 }],
          primary_lever: [{ lever_id: 1 }],
          contributor_lever: [{ lever_id: 2 }],
        } as any,
        step_three: {
          geo_scope_id: 1,
          regions: [],
          countries: [],
        } as any,
        step_four: {
          general_comment: 'Test comment',
        },
      };

      const mockCreatedResult = { result_id: 123, id: 1 };
      const mockResultRepo = {
        update: jest.fn().mockResolvedValue(undefined),
      } as any;

      mockResultsService.createResult.mockResolvedValue(
        mockCreatedResult as any,
      );
      mockResultsService.saveGeoLocation.mockResolvedValue(undefined);
      mockMainRepo.update.mockResolvedValue(undefined);
      mockDataSource.getRepository.mockReturnValue(mockResultRepo);

      jest.spyOn(service, 'stepOneOicr').mockResolvedValue(undefined as any);
      jest.spyOn(service, 'stepTwoOicr').mockResolvedValue(undefined as any);

      // Act
      const result = await service.createOicr(mockCreateData);

      // Assert
      expect(mockResultsService.createResult).toHaveBeenCalledWith(
        mockCreateData.base_information,
      );
      expect(service.stepOneOicr).toHaveBeenCalledWith(
        mockCreateData.step_one,
        mockCreatedResult.result_id,
      );
      expect(service.stepTwoOicr).toHaveBeenCalledWith(
        mockCreateData.step_two,
        mockCreatedResult.result_id,
      );
      expect(mockResultsService.saveGeoLocation).toHaveBeenCalledWith(
        mockCreatedResult.result_id,
        mockCreateData.step_three,
      );
      expect(mockMainRepo.update).toHaveBeenCalledWith(
        mockCreatedResult.result_id,
        {
          general_comment: mockCreateData.step_four.general_comment,
        },
      );
      expect(mockResultRepo.update).toHaveBeenCalledWith(
        mockCreatedResult.result_id,
        {
          description: mockCreateData.step_one.outcome_impact_statement,
        },
      );
      expect(result).toEqual(mockCreatedResult);
    });

    it('should handle error when createResult fails', async () => {
      // Arrange
      const mockCreateData: CreateResultOicrDto = {
        base_information: {
          result_type_id: 1,
          title: 'Test Result',
        } as any,
        step_one: {} as any,
        step_two: {} as any,
        step_three: {} as any,
        step_four: { general_comment: 'Test' },
      };

      mockResultsService.createResult.mockRejectedValue(
        new Error('Create failed'),
      );

      // Act & Assert
      await expect(service.createOicr(mockCreateData)).rejects.toThrow(
        'Create failed',
      );
      expect(mockResultsService.createResult).toHaveBeenCalledWith(
        mockCreateData.base_information,
      );
    });
  });

  describe('createOicrSteps', () => {
    const resultId = 123;
    const mockData: CreateStepsOicrDto = {
      general_comment: 'Test comment',
    } as any;

    beforeEach(() => {
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);
    });

    it('should call stepOneOicr for step 1', async () => {
      // Arrange
      const step = 1;
      const stepOneResult = { success: true };
      jest
        .spyOn(service, 'stepOneOicr')
        .mockResolvedValue(stepOneResult as any);

      // Act
      const result = await service.createOicrSteps(resultId, mockData, step);

      // Assert
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
      );
      expect(service.stepOneOicr).toHaveBeenCalledWith(mockData, resultId);
      expect(result).toEqual(stepOneResult);
    });

    it('should call stepTwoOicr for step 2', async () => {
      // Arrange
      const step = 2;
      const stepTwoResult = { success: true };
      jest
        .spyOn(service, 'stepTwoOicr')
        .mockResolvedValue(stepTwoResult as any);

      // Act
      const result = await service.createOicrSteps(resultId, mockData, step);

      // Assert
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
      );
      expect(service.stepTwoOicr).toHaveBeenCalledWith(mockData, resultId);
      expect(result).toEqual(stepTwoResult);
    });

    it('should call saveGeoLocation for step 3', async () => {
      // Arrange
      const step = 3;
      const geoLocationResult = { success: true };
      mockResultsService.saveGeoLocation.mockResolvedValue(
        geoLocationResult as any,
      );

      // Act
      const result = await service.createOicrSteps(resultId, mockData, step);

      // Assert
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
      );
      expect(mockResultsService.saveGeoLocation).toHaveBeenCalledWith(
        resultId,
        mockData,
      );
      expect(result).toEqual(geoLocationResult);
    });

    it('should update general_comment for step 4', async () => {
      // Arrange
      const step = 4;
      const updateResult = { affected: 1 };
      mockMainRepo.update.mockResolvedValue(updateResult as any);

      // Act
      const result = await service.createOicrSteps(resultId, mockData, step);

      // Assert
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
      );
      expect(mockMainRepo.update).toHaveBeenCalledWith(resultId, {
        general_comment: mockData.general_comment,
      });
      expect(result).toEqual(updateResult);
    });

    it('should throw BadRequestException for invalid step', async () => {
      // Arrange
      const invalidStep = 5;

      // Act & Assert
      await expect(
        service.createOicrSteps(resultId, mockData, invalidStep),
      ).rejects.toThrow(BadRequestException);
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
      );
    });
  });

  describe('stepOneOicr', () => {
    it('should execute step one operations in transaction', async () => {
      // Arrange
      const resultId = 123;
      const mockEntityManager = {
        update: jest.fn(),
      } as any;

      const data: StepOneOicrDto = {
        main_contact_person: { user_id: 456 } as any,
        tagging: [{ tag_id: 1 }, { tag_id: 2 }] as any,
        linked_result: [{ other_result_id: 789 }] as any,
        outcome_impact_statement: 'Test statement',
      };

      const createdTags = [{ tag_id: 1 }, { tag_id: 2 }];
      const auditData = { updated_at: new Date() };

      // Mock the transaction to pass the mockEntityManager to the callback
      mockDataSource.transaction.mockImplementation((callback: any) => {
        return callback(mockEntityManager);
      });

      mockResultUsersService.create.mockResolvedValue(undefined);
      mockResultTagsService.create.mockResolvedValue(createdTags as any);
      mockLinkResultsService.create.mockResolvedValue(undefined);
      mockMainRepo.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);

      // Act
      await service.stepOneOicr(data, resultId);

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockResultUsersService.create).toHaveBeenCalledWith(
        resultId,
        { user_id: data.main_contact_person.user_id },
        'user_id',
        UserRolesEnum.MAIN_CONTACT,
        mockEntityManager,
      );
      expect(mockResultTagsService.create).toHaveBeenCalledWith(
        resultId,
        [{ tag_id: 1 }, { tag_id: 2 }],
        'tag_id',
        undefined,
        mockEntityManager,
      );
      expect(mockLinkResultsService.create).toHaveBeenCalledWith(
        resultId,
        [{ other_result_id: 789 }],
        'other_result_id',
        LinkResultRolesEnum.OICR_STEP_ONE,
        mockEntityManager,
      );
      expect(mockMainRepo.update).toHaveBeenCalledWith(resultId, {
        outcome_impact_statement: data.outcome_impact_statement,
        ...auditData,
      });
    });

    it('should handle empty linked results when no tags are created', async () => {
      // Arrange
      const resultId = 123;
      const mockEntityManager = {} as any;

      const data: StepOneOicrDto = {
        main_contact_person: { user_id: 456 } as any,
        tagging: [{ tag_id: 1 }] as any,
        linked_result: [{ other_result_id: 789 }] as any,
        outcome_impact_statement: 'Test statement',
      };

      const auditData = { updated_at: new Date() };

      // Mock the transaction to pass the mockEntityManager to the callback
      mockDataSource.transaction.mockImplementation((callback: any) => {
        return callback(mockEntityManager);
      });

      mockResultUsersService.create.mockResolvedValue(undefined);
      mockResultTagsService.create.mockResolvedValue([] as any); // No tags created
      mockLinkResultsService.create.mockResolvedValue(undefined);
      mockMainRepo.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);

      // Act
      await service.stepOneOicr(data, resultId);

      // Assert
      expect(mockLinkResultsService.create).toHaveBeenCalledWith(
        resultId,
        [], // Empty array because no tags were created
        'other_result_id',
        LinkResultRolesEnum.OICR_STEP_ONE,
        mockEntityManager,
      );
    });
  });

  describe('stepTwoOicr', () => {
    it('should execute step two operations in transaction', async () => {
      // Arrange
      const resultId = 123;
      const mockEntityManager = {} as any;

      const data: StepTwoOicrDto = {
        initiatives: [
          { clarisa_initiative_id: 1 },
          { clarisa_initiative_id: 2 },
        ] as any,
        primary_lever: [{ lever_id: '1' }] as any,
        contributor_lever: [{ lever_id: '2' }, { lever_id: '3' }] as any,
      };

      // Mock the transaction to pass the mockEntityManager to the callback
      mockDataSource.transaction.mockImplementation((callback: any) => {
        return callback(mockEntityManager);
      });

      mockResultInitiativesService.create.mockResolvedValue(undefined);
      mockResultLeversService.create.mockResolvedValue(undefined);

      // Act
      await service.stepTwoOicr(data, resultId);

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockResultInitiativesService.create).toHaveBeenCalledWith(
        resultId,
        [{ clarisa_initiative_id: 1 }, { clarisa_initiative_id: 2 }],
        'clarisa_initiative_id',
        undefined,
        mockEntityManager,
      );
      expect(mockResultLeversService.create).toHaveBeenCalledWith(
        resultId,
        [
          { lever_id: '1', is_primary: true },
          { lever_id: '2', is_primary: false },
          { lever_id: '3', is_primary: false },
        ],
        'lever_id',
        undefined,
        mockEntityManager,
        ['is_primary'],
      );
    });

    it('should handle empty arrays', async () => {
      // Arrange
      const resultId = 123;
      const mockEntityManager = {} as any;

      const data: StepTwoOicrDto = {
        initiatives: [],
        primary_lever: [],
        contributor_lever: [],
      };

      // Mock the transaction to pass the mockEntityManager to the callback
      mockDataSource.transaction.mockImplementation((callback: any) => {
        return callback(mockEntityManager);
      });

      mockResultInitiativesService.create.mockResolvedValue(undefined);
      mockResultLeversService.create.mockResolvedValue(undefined);

      // Act
      await service.stepTwoOicr(data, resultId);

      // Assert
      expect(mockResultInitiativesService.create).toHaveBeenCalledWith(
        resultId,
        [],
        'clarisa_initiative_id',
        undefined,
        mockEntityManager,
      );
      expect(mockResultLeversService.create).toHaveBeenCalledWith(
        resultId,
        [],
        'lever_id',
        undefined,
        mockEntityManager,
        ['is_primary'],
      );
    });
  });

  describe('findByResultIdAndSteps', () => {
    const resultId = 123;

    it('should call findStepOneIoicr for step 1', async () => {
      // Arrange
      const step = 1;
      const stepOneResult = {
        main_contact_person: { user_id: 456 },
        tagging: [{ tag_id: 1 }],
        linked_result: [{ other_result_id: 789 }],
        outcome_impact_statement: 'Test statement',
      };
      jest
        .spyOn(service as any, 'findStepOneIoicr')
        .mockResolvedValue(stepOneResult);

      // Act
      const result = await service.findByResultIdAndSteps(resultId, step);

      // Assert
      expect((service as any).findStepOneIoicr).toHaveBeenCalledWith(resultId);
      expect(result).toEqual(stepOneResult);
    });

    it('should call findStepTwoOicr for step 2', async () => {
      // Arrange
      const step = 2;
      const stepTwoResult = {
        initiatives: [{ clarisa_initiative_id: 1 }],
        primary_lever: [{ lever_id: '1', is_primary: true }],
        contributor_lever: [{ lever_id: '2', is_primary: false }],
      };
      jest
        .spyOn(service as any, 'findStepTwoOicr')
        .mockResolvedValue(stepTwoResult);

      // Act
      const result = await service.findByResultIdAndSteps(resultId, step);

      // Assert
      expect((service as any).findStepTwoOicr).toHaveBeenCalledWith(resultId);
      expect(result).toEqual(stepTwoResult);
    });

    it('should call findGeoLocation for step 3', async () => {
      // Arrange
      const step = 3;
      const geoLocationResult = {
        geo_scope_id: 1,
        countries: [],
        regions: [],
      };
      mockResultsService.findGeoLocation.mockResolvedValue(
        geoLocationResult as any,
      );

      // Act
      const result = await service.findByResultIdAndSteps(resultId, step);

      // Assert
      expect(mockResultsService.findGeoLocation).toHaveBeenCalledWith(resultId);
      expect(result).toEqual(geoLocationResult);
    });

    it('should return general_comment for step 4', async () => {
      // Arrange
      const step = 4;
      const generalComment = 'Test general comment';
      const oicrEntity = { general_comment: generalComment };
      mockMainRepo.findOne.mockResolvedValue(oicrEntity as any);

      // Act
      const result = await service.findByResultIdAndSteps(resultId, step);

      // Assert
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { result_id: resultId },
        select: { general_comment: true },
      });
      expect(result).toBe(generalComment);
    });

    it('should return empty string when no general_comment found for step 4', async () => {
      // Arrange
      const step = 4;
      mockMainRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByResultIdAndSteps(resultId, step);

      // Assert
      expect(result).toBe('');
    });

    it('should throw BadRequestException for invalid step', async () => {
      // Arrange
      const invalidStep = 5;

      // Act & Assert
      await expect(
        service.findByResultIdAndSteps(resultId, invalidStep),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findStepOneIoicr', () => {
    it('should find and return step one data', async () => {
      // Arrange
      const resultId = 123;
      const mockMainContactPerson = { user_id: 456 };
      const mockLinkedResults = [{ other_result_id: 789 }];
      const mockTagging = [{ tag_id: 1 }, { tag_id: 2 }];
      const mockOutcomeStatement = 'Test outcome statement';
      const mockOicrEntity = { outcome_impact_statement: mockOutcomeStatement };

      mockResultUsersService.findUsersByRoleResult.mockResolvedValue([
        mockMainContactPerson,
      ] as any);
      mockLinkResultsService.find.mockResolvedValue(mockLinkedResults as any);
      mockResultTagsService.find.mockResolvedValue(mockTagging as any);
      mockMainRepo.findOne.mockResolvedValue(mockOicrEntity as any);

      // Act
      const result = await (service as any).findStepOneIoicr(resultId);

      // Assert
      expect(mockResultUsersService.findUsersByRoleResult).toHaveBeenCalledWith(
        UserRolesEnum.MAIN_CONTACT,
        resultId,
      );
      expect(mockLinkResultsService.find).toHaveBeenCalledWith(
        resultId,
        LinkResultRolesEnum.OICR_STEP_ONE,
      );
      expect(mockResultTagsService.find).toHaveBeenCalledWith(resultId);
      expect(mockMainRepo.findOne).toHaveBeenCalledWith({
        where: { result_id: resultId, is_active: true },
        select: { outcome_impact_statement: true },
      });
      expect(result).toEqual({
        main_contact_person: mockMainContactPerson,
        linked_result: mockLinkedResults,
        tagging: mockTagging,
        outcome_impact_statement: mockOutcomeStatement,
      });
    });

    it('should handle missing data gracefully', async () => {
      // Arrange
      const resultId = 123;

      mockResultUsersService.findUsersByRoleResult.mockResolvedValue([]);
      mockLinkResultsService.find.mockResolvedValue([]);
      mockResultTagsService.find.mockResolvedValue([]);
      mockMainRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await (service as any).findStepOneIoicr(resultId);

      // Assert
      expect(result).toEqual({
        main_contact_person: undefined,
        linked_result: [],
        tagging: [],
        outcome_impact_statement: undefined,
      });
    });
  });

  describe('findStepTwoOicr', () => {
    it('should find and return step two data', async () => {
      // Arrange
      const resultId = 123;
      const mockInitiatives = [
        { clarisa_initiative_id: 1 },
        { clarisa_initiative_id: 2 },
      ];
      const mockAllLevers = [
        { lever_id: '1', is_primary: true },
        { lever_id: '2', is_primary: false },
        { lever_id: '3', is_primary: true },
        { lever_id: '4', is_primary: false },
      ];

      mockResultInitiativesService.find.mockResolvedValue(
        mockInitiatives as any,
      );
      mockResultLeversService.find.mockResolvedValue(mockAllLevers as any);

      // Act
      const result = await (service as any).findStepTwoOicr(resultId);

      // Assert
      expect(mockResultInitiativesService.find).toHaveBeenCalledWith(resultId);
      expect(mockResultLeversService.find).toHaveBeenCalledWith(resultId);
      expect(result).toEqual({
        initiatives: mockInitiatives,
        primary_lever: [
          { lever_id: '1', is_primary: true },
          { lever_id: '3', is_primary: true },
        ],
        contributor_lever: [
          { lever_id: '2', is_primary: false },
          { lever_id: '4', is_primary: false },
        ],
      });
    });

    it('should handle empty data', async () => {
      // Arrange
      const resultId = 123;

      mockResultInitiativesService.find.mockResolvedValue([]);
      mockResultLeversService.find.mockResolvedValue([]);

      // Act
      const result = await (service as any).findStepTwoOicr(resultId);

      // Assert
      expect(result).toEqual({
        initiatives: [],
        primary_lever: [],
        contributor_lever: [],
      });
    });
  });
});

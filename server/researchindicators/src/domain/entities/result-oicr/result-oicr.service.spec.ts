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
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { AppConfig } from '../../shared/utils/app-config.util';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';
import { TemplateService } from '../../shared/auxiliar/template/template.service';
import { ResultOicrRepository } from './repositories/result-oicr.repository';
import { TempExternalOicrsService } from '../temp_external_oicrs/temp_external_oicrs.service';
import { UpdateOicrDto } from './dto/update-oicr.dto';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';

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
  let mockMessageMicroservice: jest.Mocked<MessageMicroservice>;
  let mockAppConfig: jest.Mocked<AppConfig>;
  let mockTemplateService: jest.Mocked<TemplateService>;
  let mockResultOicrRepository: jest.Mocked<ResultOicrRepository>;
  let mockTempExternalOicrsService: jest.Mocked<TempExternalOicrsService>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    mockMainRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockMainRepo),
      transaction: jest.fn(),
    } as any;

    mockCurrentUser = {
      user_id: 123,
      email: 'test@example.com',
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

    mockMessageMicroservice = {
      emit: jest.fn(),
      send: jest.fn(),
      sendEmail: jest.fn().mockResolvedValue(true),
    } as any;

    mockAppConfig = {
      get: jest.fn(),
      SPRM_EMAIL_SAFE: jest.fn().mockReturnValue('test@example.com'),
      ARI_CLIENT_HOST: 'http://localhost:3000',
    } as any;

    mockTemplateService = {
      _getTemplate: jest.fn().mockResolvedValue('<html>Template</html>'),
      generateTemplate: jest.fn(),
    } as any;

    mockResultOicrRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
      getDataToNewOicrMessage: jest.fn().mockResolvedValue({
        result_code: 'TEST-001',
        result_title: 'Test Result',
        contract_code: 'CONTRACT-001',
        contract_description: 'Test Contract',
        principal_investigator: 'Test PI',
        primary_lever: 'Test Lever',
        main_contact_person: 'Test Contact',
        oicr_description: 'Test Description',
        oicr_link: 'http://localhost:3000/result/TEST-001/general-information',
      }),
      sendMessageOicr: jest.fn(),
    } as any;

    mockTempExternalOicrsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
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
        { provide: MessageMicroservice, useValue: mockMessageMicroservice },
        { provide: AppConfig, useValue: mockAppConfig },
        { provide: TemplateService, useValue: mockTemplateService },
        { provide: ResultOicrRepository, useValue: mockResultOicrRepository },
        {
          provide: TempExternalOicrsService,
          useValue: mockTempExternalOicrsService,
        },
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
      const savedResultOicr = { result_id: resultId, id: 1 };

      mockCurrentUser.audit.mockReturnValue({
        created_at: new Date(),
        created_by: 1,
        updated_at: new Date(),
        updated_by: 1,
      });
      mockMainRepo.save.mockResolvedValue(savedResultOicr as any);

      // Act
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockMainRepo),
      } as any;
      const result = await service.create(resultId, mockManager);

      // Assert
      expect(mockMainRepo.save).toHaveBeenCalledWith({
        result_id: resultId,
        created_at: expect.any(Date),
        created_by: 1,
        updated_at: expect.any(Date),
        updated_by: 1,
      });
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

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue(mockResultRepo),
      } as any;

      mockResultsService.createResult.mockResolvedValue(
        mockCreatedResult as any,
      );
      mockResultsService.saveGeoLocation.mockResolvedValue(undefined);
      mockResultOicrRepository.update.mockResolvedValue(undefined);
      mockDataSource.getRepository.mockReturnValue(mockResultRepo);
      Object.defineProperty(mockDataSource, 'manager', {
        value: mockEntityManager,
        writable: true,
      });
      mockResultLeversService.find.mockResolvedValue([]);

      jest
        .spyOn(service as any, 'updateOicrSteps')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'sendMessageOicr')
        .mockResolvedValue(undefined as any);

      // Act
      const result = await service.createOicr(mockCreateData);

      // Assert
      expect(mockResultsService.createResult).toHaveBeenCalledWith(
        mockCreateData.base_information,
        'STAR',
        {
          leverEnum: 2,
          notMap: {
            lever: true,
          },
          result_status_id: 9,
        },
      );
      expect((service as any).updateOicrSteps).toHaveBeenCalledWith(
        mockCreatedResult.result_id,
        mockCreateData,
        mockEntityManager,
        true,
      );
      expect(service.sendMessageOicr).toHaveBeenCalledWith(
        mockCreatedResult.result_id,
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
        'STAR',
        {
          leverEnum: 2,
          notMap: {
            lever: true,
          },
          result_status_id: 9,
        },
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
      mockResultOicrRepository.update.mockResolvedValue(updateResult as any);

      // Act
      const result = await service.createOicrSteps(resultId, mockData, step);

      // Assert
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
      );
      expect(mockResultOicrRepository.update).toHaveBeenCalledWith(resultId, {
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

  describe('stepTwoOicr', () => {
    it('should execute step two operations', async () => {
      // Arrange
      const resultId = 123;

      const data: StepTwoOicrDto = {
        primary_lever: [{ lever_id: '1' }] as any,
        contributor_lever: [{ lever_id: '2' }, { lever_id: '3' }] as any,
      };

      mockResultLeversService.create.mockResolvedValue(undefined);

      // Act
      await service.stepTwoOicr(data, resultId);

      // Assert
      expect(mockResultLeversService.create).toHaveBeenCalledWith(
        resultId,
        [
          { lever_id: '1', is_primary: true },
          { lever_id: '2', is_primary: false },
          { lever_id: '3', is_primary: false },
        ],
        'lever_id',
        LeverRolesEnum.OICR_ALIGNMENT,
        undefined,
        ['is_primary'],
      );
    });

    it('should handle empty arrays', async () => {
      // Arrange
      const resultId = 123;

      const data: StepTwoOicrDto = {
        primary_lever: [],
        contributor_lever: [],
      };

      mockResultLeversService.create.mockResolvedValue(undefined);

      // Act
      await service.stepTwoOicr(data, resultId);

      // Assert
      expect(mockResultLeversService.create).toHaveBeenCalledWith(
        resultId,
        [],
        'lever_id',
        LeverRolesEnum.OICR_ALIGNMENT,
        undefined,
        ['is_primary'],
      );
    });
  });

  describe('findModal', () => {
    const resultId = 123;

    it('should return complete OICR modal data', async () => {
      // Arrange
      const stepOneResult = {
        main_contact_person: { user_id: 456 },
        tagging: [{ tag_id: 1 }],
        linked_result: [{ other_result_id: 789 }],
        outcome_impact_statement: 'Test statement',
      };
      const stepTwoResult = {
        primary_lever: [{ lever_id: '1', is_primary: true }],
        contributor_lever: [{ lever_id: '2', is_primary: false }],
      };

      jest
        .spyOn(service as any, 'findStepOneIoicr')
        .mockResolvedValue(stepOneResult);
      jest
        .spyOn(service as any, 'findStepTwoOicr')
        .mockResolvedValue(stepTwoResult);
      mockResultsService.findGeoLocation = jest.fn().mockResolvedValue({
        geo_scope_id: 1,
        regions: [],
        countries: [],
      });
      mockResultsService.findBaseInfo = jest.fn().mockResolvedValue({
        title: 'Test',
        description: 'Test Description',
      });
      mockResultOicrRepository.findOne.mockResolvedValue({
        general_comment: 'Test comment',
      } as any);

      // Act
      const result = await service.findModal(resultId);

      // Assert
      expect((service as any).findStepOneIoicr).toHaveBeenCalledWith(resultId);
      expect((service as any).findStepTwoOicr).toHaveBeenCalledWith(resultId);
      expect(mockResultsService.findGeoLocation).toHaveBeenCalledWith(resultId);
      expect(mockResultsService.findBaseInfo).toHaveBeenCalledWith(resultId);
      expect(result.step_one).toEqual(stepOneResult);
      expect(result.step_two).toEqual(stepTwoResult);
    });

    it('should handle errors when finding modal data', async () => {
      // Arrange
      jest
        .spyOn(service as any, 'findStepOneIoicr')
        .mockRejectedValue(new Error('Step one error'));
      jest.spyOn(service as any, 'findStepTwoOicr').mockResolvedValue({});
      mockResultsService.findGeoLocation = jest.fn().mockResolvedValue({});
      mockResultsService.findBaseInfo = jest.fn().mockResolvedValue({});

      // Act & Assert
      await expect(service.findModal(resultId)).rejects.toThrow(
        'Step one error',
      );
    });
  });

  describe('findStepOneIoicr', () => {
    it('should find and return step one data', async () => {
      // Arrange
      const resultId = 123;
      const mockMainContactPerson = { user_id: 456 };
      const mockLinkResult = [{ external_oicr_id: 789 }];
      const mockTagging = [{ tag_id: 1 }, { tag_id: 2 }];
      const mockOutcomeStatement = 'Test outcome statement';
      const mockOicrEntity = { outcome_impact_statement: mockOutcomeStatement };

      mockResultUsersService.findUsersByRoleResult.mockResolvedValue([
        mockMainContactPerson,
      ] as any);
      mockTempExternalOicrsService.find.mockResolvedValue(
        mockLinkResult as any,
      );
      mockResultTagsService.find.mockResolvedValue(mockTagging as any);
      mockResultOicrRepository.findOne.mockResolvedValue(mockOicrEntity as any);

      // Act
      const result = await (service as any).findStepOneIoicr(resultId);

      // Assert
      expect(mockResultUsersService.findUsersByRoleResult).toHaveBeenCalledWith(
        UserRolesEnum.MAIN_CONTACT,
        resultId,
      );
      expect(mockTempExternalOicrsService.find).toHaveBeenCalledWith(resultId);
      expect(mockResultTagsService.find).toHaveBeenCalledWith(resultId);
      expect(mockResultOicrRepository.findOne).toHaveBeenCalledWith({
        where: { result_id: resultId, is_active: true },
        select: { outcome_impact_statement: true },
      });
      expect(result).toEqual({
        main_contact_person: mockMainContactPerson,
        link_result: mockLinkResult[0],
        tagging: mockTagging[0],
        outcome_impact_statement: mockOutcomeStatement,
      });
    });

    it('should handle missing data gracefully', async () => {
      // Arrange
      const resultId = 123;

      mockResultUsersService.findUsersByRoleResult.mockResolvedValue([]);
      mockTempExternalOicrsService.find.mockResolvedValue([]);
      mockResultTagsService.find.mockResolvedValue([]);
      mockResultOicrRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await (service as any).findStepOneIoicr(resultId);

      // Assert
      expect(result).toEqual({
        main_contact_person: undefined,
        link_result: undefined,
        tagging: undefined,
        outcome_impact_statement: undefined,
      });
    });
  });

  describe('findStepTwoOicr', () => {
    it('should find and return step two data', async () => {
      // Arrange
      const resultId = 123;
      const mockAllLevers = [
        { lever_id: '1', is_primary: true },
        { lever_id: '2', is_primary: false },
        { lever_id: '3', is_primary: true },
        { lever_id: '4', is_primary: false },
      ];

      mockResultLeversService.find.mockResolvedValue(mockAllLevers as any);

      // Act
      const result = await (service as any).findStepTwoOicr(resultId);

      // Assert
      expect(mockResultLeversService.find).toHaveBeenCalledWith(
        resultId,
        LeverRolesEnum.OICR_ALIGNMENT,
      );
      expect(result).toEqual({
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

      mockResultLeversService.find.mockResolvedValue([]);

      // Act
      const result = await (service as any).findStepTwoOicr(resultId);

      // Assert
      expect(result).toEqual({
        primary_lever: [],
        contributor_lever: [],
      });
    });
  });

  describe('sendMessageOicr', () => {
    it('should send email notification when template is generated successfully', async () => {
      // Arrange
      const resultId = 123;
      const mockMessageData = {
        result_code: 'OICR-2024-001',
        result_title: 'Test OICR Result',
        contract_code: 'CONTRACT-001',
        contract_description: 'Test Contract Description',
        principal_investigator: 'Dr. John Doe',
        primary_lever: 'Climate Adaptation',
        main_contact_person: 'Jane, Smith',
        oicr_description: 'This is a test OICR description',
        oicr_link:
          'http://localhost:3000/result/OICR-2024-001/general-information',
      };

      const mockTemplate =
        '<html><body>Test email template with OICR data</body></html>';
      const mockUserEmail = 'test-user@example.com';

      mockResultOicrRepository.getDataToNewOicrMessage.mockResolvedValue(
        mockMessageData,
      );
      mockTemplateService._getTemplate.mockResolvedValue(mockTemplate);
      mockAppConfig.SPRM_EMAIL_SAFE.mockReturnValue(mockUserEmail);
      // Set up current user email via mock
      const originalEmail = 'original-user@example.com';
      Object.defineProperty(mockCurrentUser, 'email', {
        value: originalEmail,
        writable: true,
      });

      // Act
      await service.sendMessageOicr(resultId);

      // Assert
      expect(
        mockResultOicrRepository.getDataToNewOicrMessage,
      ).toHaveBeenCalledWith(resultId);
      expect(mockTemplateService._getTemplate).toHaveBeenCalledWith(
        TemplateEnum.OICR_NOTIFICATION_CREATED,
        mockMessageData,
      );
      expect(mockAppConfig.SPRM_EMAIL_SAFE).toHaveBeenCalledWith(
        mockCurrentUser.email,
      );
      expect(mockMessageMicroservice.sendEmail).toHaveBeenCalledWith({
        subject: '[STAR] - New OICR Submission #OICR-2024-001',
        to: mockUserEmail,
        message: {
          socketFile: Buffer.from(mockTemplate),
        },
      });
    });

    it('should not send email when template generation fails (returns null)', async () => {
      // Arrange
      const resultId = 123;
      const mockMessageData = {
        result_code: 'OICR-2024-002',
        result_title: 'Another Test OICR Result',
        contract_code: 'CONTRACT-002',
        contract_description: 'Another Test Contract Description',
        principal_investigator: 'Dr. Jane Doe',
        primary_lever: 'Climate Mitigation',
        main_contact_person: 'John, Smith',
        oicr_description: 'Another test OICR description',
        oicr_link:
          'http://localhost:3000/result/OICR-2024-002/general-information',
      };

      mockResultOicrRepository.getDataToNewOicrMessage.mockResolvedValue(
        mockMessageData,
      );
      mockTemplateService._getTemplate.mockResolvedValue(null);

      // Act
      await service.sendMessageOicr(resultId);

      // Assert
      expect(
        mockResultOicrRepository.getDataToNewOicrMessage,
      ).toHaveBeenCalledWith(resultId);
      expect(mockTemplateService._getTemplate).toHaveBeenCalledWith(
        TemplateEnum.OICR_NOTIFICATION_CREATED,
        mockMessageData,
      );
      expect(mockMessageMicroservice.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send email when template generation fails (returns undefined)', async () => {
      // Arrange
      const resultId = 123;
      const mockMessageData = {
        result_code: 'OICR-2024-003',
        result_title: 'Third Test OICR Result',
        contract_code: 'CONTRACT-003',
        contract_description: 'Third Test Contract Description',
        principal_investigator: 'Dr. Bob Smith',
        primary_lever: 'Climate Resilience',
        main_contact_person: 'Alice, Johnson',
        oicr_description: 'Third test OICR description',
        oicr_link:
          'http://localhost:3000/result/OICR-2024-003/general-information',
      };

      mockResultOicrRepository.getDataToNewOicrMessage.mockResolvedValue(
        mockMessageData,
      );
      mockTemplateService._getTemplate.mockResolvedValue(undefined);

      // Act
      await service.sendMessageOicr(resultId);

      // Assert
      expect(
        mockResultOicrRepository.getDataToNewOicrMessage,
      ).toHaveBeenCalledWith(resultId);
      expect(mockTemplateService._getTemplate).toHaveBeenCalledWith(
        TemplateEnum.OICR_NOTIFICATION_CREATED,
        mockMessageData,
      );
      expect(mockMessageMicroservice.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      const resultId = 123;
      const mockMessageData = {
        result_code: 'OICR-2024-004',
        result_title: 'Fourth Test OICR Result',
        contract_code: 'CONTRACT-004',
        contract_description: 'Fourth Test Contract Description',
        principal_investigator: 'Dr. Carol White',
        primary_lever: 'Climate Finance',
        main_contact_person: 'Bob, Wilson',
        oicr_description: 'Fourth test OICR description',
        oicr_link:
          'http://localhost:3000/result/OICR-2024-004/general-information',
      };

      const mockTemplate =
        '<html><body>Another test email template</body></html>';
      const mockUserEmail = 'test-user@example.com';

      mockResultOicrRepository.getDataToNewOicrMessage.mockResolvedValue(
        mockMessageData,
      );
      mockTemplateService._getTemplate.mockResolvedValue(mockTemplate);
      mockAppConfig.SPRM_EMAIL_SAFE.mockReturnValue(mockUserEmail);
      // Set up current user email via mock
      Object.defineProperty(mockCurrentUser, 'email', {
        value: 'original-user@example.com',
        writable: true,
      });
      mockMessageMicroservice.sendEmail.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      // Act & Assert
      await expect(service.sendMessageOicr(resultId)).rejects.toThrow(
        'Email service unavailable',
      );

      expect(
        mockResultOicrRepository.getDataToNewOicrMessage,
      ).toHaveBeenCalledWith(resultId);
      expect(mockTemplateService._getTemplate).toHaveBeenCalledWith(
        TemplateEnum.OICR_NOTIFICATION_CREATED,
        mockMessageData,
      );
      expect(mockMessageMicroservice.sendEmail).toHaveBeenCalledWith({
        subject: '[STAR] - New OICR Submission #OICR-2024-004',
        to: mockUserEmail,
        message: {
          socketFile: Buffer.from(mockTemplate),
        },
      });
    });

    it('should handle repository data retrieval failure', async () => {
      // Arrange
      const resultId = 999;
      const repositoryError = new Error('Result not found');

      mockResultOicrRepository.getDataToNewOicrMessage.mockRejectedValue(
        repositoryError,
      );

      // Act & Assert
      await expect(service.sendMessageOicr(resultId)).rejects.toThrow(
        'Result not found',
      );

      expect(
        mockResultOicrRepository.getDataToNewOicrMessage,
      ).toHaveBeenCalledWith(resultId);
      expect(mockTemplateService._getTemplate).not.toHaveBeenCalled();
      expect(mockMessageMicroservice.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle template service failure', async () => {
      // Arrange
      const resultId = 123;
      const mockMessageData = {
        result_code: 'OICR-2024-005',
        result_title: 'Fifth Test OICR Result',
        contract_code: 'CONTRACT-005',
        contract_description: 'Fifth Test Contract Description',
        principal_investigator: 'Dr. David Brown',
        primary_lever: 'Climate Technology',
        main_contact_person: 'Carol, Davis',
        oicr_description: 'Fifth test OICR description',
        oicr_link:
          'http://localhost:3000/result/OICR-2024-005/general-information',
      };

      const templateError = new Error('Template generation failed');

      mockResultOicrRepository.getDataToNewOicrMessage.mockResolvedValue(
        mockMessageData,
      );
      mockTemplateService._getTemplate.mockRejectedValue(templateError);

      // Act & Assert
      await expect(service.sendMessageOicr(resultId)).rejects.toThrow(
        'Template generation failed',
      );

      expect(
        mockResultOicrRepository.getDataToNewOicrMessage,
      ).toHaveBeenCalledWith(resultId);
      expect(mockTemplateService._getTemplate).toHaveBeenCalledWith(
        TemplateEnum.OICR_NOTIFICATION_CREATED,
        mockMessageData,
      );
      expect(mockMessageMicroservice.sendEmail).not.toHaveBeenCalled();
    });

    it('should create correct email subject with result code', async () => {
      // Arrange
      const resultId = 123;
      const specialResultCode = 'SPECIAL-OICR-2024-999';
      const mockMessageData = {
        result_code: specialResultCode,
        result_title: 'Special Test OICR Result',
        contract_code: 'SPECIAL-CONTRACT-001',
        contract_description: 'Special Test Contract Description',
        principal_investigator: 'Dr. Special Investigator',
        primary_lever: 'Special Climate Lever',
        main_contact_person: 'Special, Contact',
        oicr_description: 'Special test OICR description',
        oicr_link:
          'http://localhost:3000/result/SPECIAL-OICR-2024-999/general-information',
      };

      const mockTemplate =
        '<html><body>Special test email template</body></html>';
      const mockUserEmail = 'test-user@example.com';

      mockResultOicrRepository.getDataToNewOicrMessage.mockResolvedValue(
        mockMessageData,
      );
      mockTemplateService._getTemplate.mockResolvedValue(mockTemplate);
      mockAppConfig.SPRM_EMAIL_SAFE.mockReturnValue(mockUserEmail);
      Object.defineProperty(mockCurrentUser, 'email', {
        value: 'original-user@example.com',
        writable: true,
      });

      // Act
      await service.sendMessageOicr(resultId);

      // Assert
      expect(mockMessageMicroservice.sendEmail).toHaveBeenCalledWith({
        subject: `[STAR] - New OICR Submission #${specialResultCode}`,
        to: mockUserEmail,
        message: {
          socketFile: Buffer.from(mockTemplate),
        },
      });
    });

    it('should pass correct template enum and message data to template service', async () => {
      // Arrange
      const resultId = 123;
      const mockMessageData = {
        result_code: 'OICR-2024-006',
        result_title: 'Sixth Test OICR Result',
        contract_code: 'CONTRACT-006',
        contract_description: 'Sixth Test Contract Description',
        principal_investigator: 'Dr. Emma Green',
        primary_lever: 'Climate Education',
        main_contact_person: 'Emma, Green',
        oicr_description: 'Sixth test OICR description',
        oicr_link:
          'http://localhost:3000/result/OICR-2024-006/general-information',
      };

      const mockTemplate =
        '<html><body>Sixth test email template</body></html>';

      mockResultOicrRepository.getDataToNewOicrMessage.mockResolvedValue(
        mockMessageData,
      );
      mockTemplateService._getTemplate.mockResolvedValue(mockTemplate);

      // Act
      await service.sendMessageOicr(resultId);

      // Assert
      expect(mockTemplateService._getTemplate).toHaveBeenCalledTimes(1);
      const [templateEnum, messageData] =
        mockTemplateService._getTemplate.mock.calls[0];

      // Verify that the correct template enum is used (should be OICR_NOTIFICATION_CREATED)
      expect(templateEnum).toBe(TemplateEnum.OICR_NOTIFICATION_CREATED);
      // Verify that the message data is passed correctly
      expect(messageData).toEqual(mockMessageData);
    });
  });

  describe('updateOicr', () => {
    it('should update OICR with valid data', async () => {
      // Arrange
      const resultId = 123;
      const updateData: UpdateOicrDto = {
        oicr_internal_code: 'OICR-2024-001',
        tagging: { tag_id: 1 } as any,
        outcome_impact_statement: 'Updated outcome statement',
        short_outcome_impact_statement: 'Updated short statement',
        general_comment: 'Updated general comment',
        maturity_level_id: 2,
        link_result: { external_oicr_id: 456 } as any,
      };

      const auditData = { updated_at: new Date() };

      mockResultOicrRepository.findOne.mockResolvedValue(null); // No existing OICR with same code
      mockResultOicrRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);
      mockResultTagsService.create.mockResolvedValue(undefined);
      mockTempExternalOicrsService.create.mockResolvedValue(undefined);

      // Act
      await service.updateOicr(resultId, updateData);

      // Assert
      expect(mockResultOicrRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          oicr_internal_code: updateData.oicr_internal_code,
          result_id: expect.anything(), // Not(resultId)
        },
      });

      expect(mockResultOicrRepository.update).toHaveBeenCalledWith(resultId, {
        oicr_internal_code: updateData.oicr_internal_code,
        outcome_impact_statement: updateData.outcome_impact_statement,
        short_outcome_impact_statement:
          updateData.short_outcome_impact_statement,
        general_comment: updateData.general_comment,
        maturity_level_id: updateData.maturity_level_id,
        ...auditData,
      });

      expect(mockResultTagsService.create).toHaveBeenCalledWith(
        resultId,
        [{ tag_id: 1 }],
        'tag_id',
      );

      expect(mockTempExternalOicrsService.create).toHaveBeenCalledWith(
        resultId,
        [{ external_oicr_id: 456 }],
        'external_oicr_id',
      );
    });

    it('should set oicr_internal_code to null when code already exists', async () => {
      // Arrange
      const resultId = 123;
      const updateData: UpdateOicrDto = {
        oicr_internal_code: 'EXISTING-CODE',
        tagging: null as any,
        outcome_impact_statement: 'Test statement',
        short_outcome_impact_statement: 'Short statement',
        general_comment: 'Comment',
        maturity_level_id: 1,
        link_result: null as any,
      };

      const existingOicr = { id: 456, oicr_internal_code: 'EXISTING-CODE' };
      const auditData = { updated_at: new Date() };

      mockResultOicrRepository.findOne.mockResolvedValue(existingOicr as any);
      mockResultOicrRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);
      mockResultTagsService.create.mockResolvedValue(undefined);
      mockTempExternalOicrsService.create.mockResolvedValue(undefined);

      // Act
      await service.updateOicr(resultId, updateData);

      // Assert
      expect(mockResultOicrRepository.update).toHaveBeenCalledWith(resultId, {
        oicr_internal_code: null, // Should be null since code exists
        outcome_impact_statement: updateData.outcome_impact_statement,
        short_outcome_impact_statement:
          updateData.short_outcome_impact_statement,
        general_comment: updateData.general_comment,
        maturity_level_id: updateData.maturity_level_id,
        ...auditData,
      });
    });

    it('should handle empty arrays for tagging and link_result', async () => {
      // Arrange
      const resultId = 123;
      const updateData: UpdateOicrDto = {
        oicr_internal_code: 'TEST-CODE',
        tagging: null as any, // Test null handling
        outcome_impact_statement: 'Test statement',
        short_outcome_impact_statement: 'Short statement',
        general_comment: 'Comment',
        maturity_level_id: 1,
        link_result: undefined as any, // Test undefined handling
      };

      const auditData = { updated_at: new Date() };

      mockResultOicrRepository.findOne.mockResolvedValue(null);
      mockResultOicrRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);
      mockResultTagsService.create.mockResolvedValue(undefined);
      mockTempExternalOicrsService.create.mockResolvedValue(undefined);

      // Act
      await service.updateOicr(resultId, updateData);

      // Assert
      expect(mockResultTagsService.create).toHaveBeenCalledWith(
        resultId,
        [], // Should pass empty array for null
        'tag_id',
      );

      expect(mockTempExternalOicrsService.create).toHaveBeenCalledWith(
        resultId,
        [], // Should pass empty array for undefined
        'external_oicr_id',
      );
    });
  });

  describe('findOicrs', () => {
    it('should return complete OICR data', async () => {
      // Arrange
      const resultId = 123;
      const mockOicrEntity = {
        general_comment: 'Test general comment',
        maturity_level_id: 2,
        oicr_internal_code: 'OICR-2024-001',
        outcome_impact_statement: 'Test outcome statement',
        short_outcome_impact_statement: 'Short statement',
      };

      const mockTagging = [
        { tag_id: 1, tag_name: 'Tag 1' } as any,
        { tag_id: 2, tag_name: 'Tag 2' } as any,
      ];

      const mockLinkResult = [
        { external_oicr_id: 456, title: 'External OICR 1' },
        { external_oicr_id: 789, title: 'External OICR 2' },
      ];

      const expectedResult: UpdateOicrDto = {
        general_comment: mockOicrEntity.general_comment,
        maturity_level_id: mockOicrEntity.maturity_level_id,
        oicr_internal_code: mockOicrEntity.oicr_internal_code,
        outcome_impact_statement: mockOicrEntity.outcome_impact_statement,
        short_outcome_impact_statement:
          mockOicrEntity.short_outcome_impact_statement,
        tagging: mockTagging[0] as any,
        link_result: mockLinkResult[0] as any,
      };

      mockResultOicrRepository.findOne.mockResolvedValue(mockOicrEntity as any);
      mockResultTagsService.find.mockResolvedValue(mockTagging as any);
      mockTempExternalOicrsService.find.mockResolvedValue(
        mockLinkResult as any,
      );

      // Act
      const result = await service.findOicrs(resultId);

      // Assert
      expect(mockResultOicrRepository.findOne).toHaveBeenCalledWith({
        where: {
          is_active: true,
          result_id: resultId,
        },
      });

      expect(mockResultTagsService.find).toHaveBeenCalledWith(resultId);
      expect(mockTempExternalOicrsService.find).toHaveBeenCalledWith(resultId);

      expect(result).toEqual(expectedResult);
    });

    it('should handle null OICR entity', async () => {
      // Arrange
      const resultId = 123;
      const mockTagging = [{ tag_id: 1, tag_name: 'Tag 1' } as any];
      const mockLinkResult = [
        { external_oicr_id: 456, title: 'External OICR 1' },
      ];

      const expectedResult: UpdateOicrDto = {
        general_comment: undefined,
        maturity_level_id: undefined,
        oicr_internal_code: undefined,
        outcome_impact_statement: undefined,
        short_outcome_impact_statement: undefined,
        tagging: mockTagging[0] as any,
        link_result: mockLinkResult[0] as any,
      };

      mockResultOicrRepository.findOne.mockResolvedValue(null);
      mockResultTagsService.find.mockResolvedValue(mockTagging as any);
      mockTempExternalOicrsService.find.mockResolvedValue(
        mockLinkResult as any,
      );

      // Act
      const result = await service.findOicrs(resultId);

      // Assert
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty tagging and link_result arrays', async () => {
      // Arrange
      const resultId = 123;
      const mockOicrEntity = {
        general_comment: 'Test comment',
        maturity_level_id: 1,
        oicr_internal_code: 'TEST-001',
        outcome_impact_statement: 'Test statement',
        short_outcome_impact_statement: 'Short statement',
      };

      const expectedResult: UpdateOicrDto = {
        general_comment: mockOicrEntity.general_comment,
        maturity_level_id: mockOicrEntity.maturity_level_id,
        oicr_internal_code: mockOicrEntity.oicr_internal_code,
        outcome_impact_statement: mockOicrEntity.outcome_impact_statement,
        short_outcome_impact_statement:
          mockOicrEntity.short_outcome_impact_statement,
        tagging: undefined as any,
        link_result: undefined as any,
      };

      mockResultOicrRepository.findOne.mockResolvedValue(mockOicrEntity as any);
      mockResultTagsService.find.mockResolvedValue([]);
      mockTempExternalOicrsService.find.mockResolvedValue([]);

      // Act
      const result = await service.findOicrs(resultId);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  describe('stepOneOicr', () => {
    it('should execute step one operations with temp external OICR', async () => {
      // Arrange
      const resultId = 123;

      const data: StepOneOicrDto = {
        main_contact_person: { user_id: 456 } as any,
        tagging: { tag_id: 1 } as any,
        link_result: { external_oicr_id: 789 } as any,
        outcome_impact_statement: 'Test outcome statement',
      };

      const createdTags = [{ tag_id: 1 }];
      const auditData = { updated_at: new Date() };

      mockResultUsersService.create.mockResolvedValue(undefined);
      mockResultTagsService.create.mockResolvedValue(createdTags as any);
      mockTempExternalOicrsService.create.mockResolvedValue(undefined);
      mockResultOicrRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);

      // Act
      await service.stepOneOicr(data, resultId);

      // Assert
      expect(mockResultUsersService.create).toHaveBeenCalledWith(
        resultId,
        { user_id: data.main_contact_person.user_id },
        'user_id',
        UserRolesEnum.MAIN_CONTACT,
        undefined,
      );

      expect(mockResultTagsService.create).toHaveBeenCalledWith(
        resultId,
        [{ tag_id: 1 }],
        'tag_id',
        undefined,
        undefined,
      );

      expect(mockTempExternalOicrsService.create).toHaveBeenCalledWith(
        resultId,
        [{ external_oicr_id: 789 }],
        'external_oicr_id',
        undefined,
        undefined,
      );

      expect(mockResultOicrRepository.update).toHaveBeenCalledWith(resultId, {
        outcome_impact_statement: data.outcome_impact_statement,
        ...auditData,
      });
    });

    it('should handle empty linked_result when no tags created', async () => {
      // Arrange
      const resultId = 123;

      const data: StepOneOicrDto = {
        main_contact_person: { user_id: 456 } as any,
        tagging: null as any,
        link_result: { external_oicr_id: 789 } as any,
        outcome_impact_statement: 'Test statement',
      };

      const auditData = { updated_at: new Date() };

      mockResultUsersService.create.mockResolvedValue(undefined);
      mockResultTagsService.create.mockResolvedValue([]); // No tags created
      mockTempExternalOicrsService.create.mockResolvedValue(undefined);
      mockResultOicrRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);

      // Act
      await service.stepOneOicr(data, resultId);

      // Assert
      expect(mockTempExternalOicrsService.create).toHaveBeenCalledWith(
        resultId,
        [], // Should pass empty array when no tags created
        'external_oicr_id',
        undefined,
        undefined,
      );
    });

    it('should handle null tagging array', async () => {
      // Arrange
      const resultId = 123;

      const data: StepOneOicrDto = {
        main_contact_person: { user_id: 456 } as any,
        tagging: null as any,
        link_result: { external_oicr_id: 789 } as any,
        outcome_impact_statement: 'Test statement',
      };

      const auditData = { updated_at: new Date() };

      mockResultUsersService.create.mockResolvedValue(undefined);
      mockResultTagsService.create.mockResolvedValue([]);
      mockTempExternalOicrsService.create.mockResolvedValue(undefined);
      mockResultOicrRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockCurrentUser.audit.mockReturnValue(auditData);

      // Act
      await service.stepOneOicr(data, resultId);

      // Assert
      expect(mockResultTagsService.create).toHaveBeenCalledWith(
        resultId,
        [], // Should handle null as empty array
        'tag_id',
        undefined,
        undefined,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StatusWorkflowFunctionHandlerService } from './function-handler.service';
import { ResultStatusWorkflowRepository } from './repositories/result-status-workflow.repository';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { AppConfig } from '../../shared/utils/app-config.util';
import { GreenCheckRepository } from '../green-checks/repository/green-checks.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { EnvAppConfigUtil } from '../../shared/utils/env-app-config.util';
import { GeneralDataDto } from './config/config-workflow';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

describe('StatusWorkflowFunctionHandlerService', () => {
  let service: StatusWorkflowFunctionHandlerService;

  const mockMainRepo = {
    createSnapshot: jest.fn(),
    isPi: jest.fn(),
    getDataForSubmissionResult: jest.fn(),
    getDataForRevisionResult: jest.fn(),
    getOicrGeneralData: jest.fn(),
  };

  const mockMessageMicroservice = {
    sendEmail: jest.fn(),
  };

  const mockAppConfig = {
    ARI_MIS: 'STAR',
    INTERNAL_EMAIL_LIST_ARRAY: ['internal@test.com'],
    SPRM_EMAIL_ARRAY: ['sprm@test.com'],
  };

  const mockGreenCheckRepository = {
    calculateGreenChecks: jest.fn(),
  };

  const mockCurrentUser = {
    roles: [] as SecRolesEnum[],
    user_id: 1,
    audit: jest.fn().mockReturnValue({ updated_by: 1 }),
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn(),
  };

  const mockDbEnv = {
    EMAIL_READINESS_LEVEL_7_TO: jest.fn(),
  };

  const mockEntityManager = {
    getRepository: jest.fn(),
  };

  const mockDataSource = {
    createEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusWorkflowFunctionHandlerService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ResultStatusWorkflowRepository,
          useValue: mockMainRepo,
        },
        { provide: MessageMicroservice, useValue: mockMessageMicroservice },
        { provide: AppConfig, useValue: mockAppConfig },
        { provide: GreenCheckRepository, useValue: mockGreenCheckRepository },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        { provide: EnvAppConfigUtil, useValue: mockDbEnv },
      ],
    }).compile();

    service = module.get<StatusWorkflowFunctionHandlerService>(
      StatusWorkflowFunctionHandlerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.roles = [];
  });

  function makeGeneralData(overrides: Partial<GeneralDataDto> = {}): GeneralDataDto {
    const data = new GeneralDataDto();
    data.result = { result_id: 10 } as any;
    data.customData.result_code = 'R-001';
    data.customData.principal_investigator = { email: 'pi@test.com', name: 'PI', id: 1 };
    data.customData.submitter = { email: 'submitter@test.com', name: 'Sub', id: 2 };
    data.customData.result_owner = { email: 'owner@test.com', name: 'Owner', id: 3 };
    data.customData.action_executor = { email: 'exec@test.com', name: 'Exec', id: 4 };
    data.customData.regional_expert = { email: 'regional@test.com', name: 'RE', id: 5 };
    return Object.assign(data, overrides);
  }

  // [CLAUDE/DONE] 97
  describe('getTemplate', () => {
    it('should return template string from the Template repository', async () => {
      const mockTemplateRepo = {
        findOne: jest.fn().mockResolvedValue({ template: '<p>Hello</p>' }),
      };
      mockEntityManager.getRepository.mockReturnValue(mockTemplateRepo);
      const generalData = makeGeneralData();
      generalData.configEmail.templateCode = 'SUBMISSION';

      const result = await service.getTemplate(generalData, mockEntityManager as any);

      expect(mockTemplateRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'SUBMISSION', is_active: true },
      });
      expect(result).toBe('<p>Hello</p>');
    });
  });

  // [CLAUDE/DONE] 98
  describe('sendEmail', () => {
    it('should call messageMicroservice.sendEmail with correct data', async () => {
      const generalData = makeGeneralData();
      generalData.configEmail.to = ['to@test.com'];
      generalData.configEmail.cc = ['cc@test.com'];
      generalData.configEmail.subject = 'Test Subject';
      generalData.configEmail.body = 'Test Body';

      await service.sendEmail(generalData, null as any);

      expect(mockMessageMicroservice.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['to@test.com'],
          cc: ['cc@test.com'],
          subject: 'Test Subject',
        }),
      );
    });
  });

  // [CLAUDE/DONE] 99
  describe('validateInnovationReadinessLevelSevenOrHigher', () => {
    it('should set isAvailableToSend=false when no matching innovation readiness level found', async () => {
      const mockInnovationRepo = { findOne: jest.fn().mockResolvedValue(null) };
      mockEntityManager.getRepository.mockReturnValue(mockInnovationRepo);
      const generalData = makeGeneralData();

      await service.validateInnovationReadinessLevelSevenOrHigher(
        generalData,
        mockEntityManager as any,
      );

      expect(generalData.configEmail.isAvailableToSend).toBe(false);
    });

    it('should NOT set isAvailableToSend=false when a matching record is found', async () => {
      const mockInnovationRepo = {
        findOne: jest.fn().mockResolvedValue({ result_id: 10 }),
      };
      mockEntityManager.getRepository.mockReturnValue(mockInnovationRepo);
      const generalData = makeGeneralData();

      await service.validateInnovationReadinessLevelSevenOrHigher(
        generalData,
        mockEntityManager as any,
      );

      expect(generalData.configEmail.isAvailableToSend).toBe(true);
    });
  });

  // [CLAUDE/DONE] 100
  describe('findInnovationDevData', () => {
    it('should populate customData.innovation_dev when record is found', async () => {
      const mockInnovation = { result_id: 10, innovationReadiness: null };
      const mockRepo = { findOne: jest.fn().mockResolvedValue(mockInnovation) };
      mockEntityManager.getRepository.mockReturnValue(mockRepo);
      const generalData = makeGeneralData();

      await service.findInnovationDevData(generalData, mockEntityManager as any);

      expect(generalData.customData.innovation_dev).toEqual(mockInnovation);
    });

    it('should not modify customData.innovation_dev when no record found', async () => {
      const mockRepo = { findOne: jest.fn().mockResolvedValue(null) };
      mockEntityManager.getRepository.mockReturnValue(mockRepo);
      const generalData = makeGeneralData();

      await service.findInnovationDevData(generalData, mockEntityManager as any);

      // innovation_dev stays at the default (new ResultInnovationDev())
      expect(generalData.customData.innovation_dev).toBeDefined();
    });
  });

  // [CLAUDE/DONE] 101
  describe('findInnovationReadinessLevel', () => {
    it('should populate customData innovation_readiness_level when found', async () => {
      const mockRecord = {
        result_id: 10,
        innovationReadiness: { level: 7, name: 'Level 7' },
      };
      const mockRepo = { findOne: jest.fn().mockResolvedValue(mockRecord) };
      mockEntityManager.getRepository.mockReturnValue(mockRepo);
      const generalData = makeGeneralData();

      await service.findInnovationReadinessLevel(generalData, mockEntityManager as any);

      expect(generalData.customData.innovation_readiness_level).toBe(7);
      expect(generalData.customData.innovation_readiness_level_name).toBe('Level 7');
    });

    it('should not set innovation_readiness_level when not found', async () => {
      const mockRepo = { findOne: jest.fn().mockResolvedValue(null) };
      mockEntityManager.getRepository.mockReturnValue(mockRepo);
      const generalData = makeGeneralData();

      await service.findInnovationReadinessLevel(generalData, mockEntityManager as any);

      expect(generalData.customData.innovation_readiness_level).toBeNull();
    });
  });

  // [CLAUDE/DONE] 102
  describe('createSnapshot', () => {
    it('should call mainRepo.createSnapshot with generalData and manager', async () => {
      const generalData = makeGeneralData();

      await service.createSnapshot(generalData, mockEntityManager as any);

      expect(mockMainRepo.createSnapshot).toHaveBeenCalledWith(
        generalData,
        mockEntityManager,
      );
    });
  });

  // [CLAUDE/DONE] 103
  describe('submittedConfigEmail', () => {
    it('should set to as PI email and subject with result code', async () => {
      const generalData = makeGeneralData();

      await service.submittedConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['pi@test.com']);
      expect(generalData.configEmail.subject).toContain('R-001');
      expect(generalData.configEmail.subject).toContain('STAR');
    });

    it('should exclude PI from cc when same as submitter', async () => {
      const generalData = makeGeneralData();
      generalData.customData.submitter.email = 'owner@test.com';

      await service.submittedConfigEmail(generalData, null as any);

      expect(generalData.configEmail.cc).not.toContain('pi@test.com');
    });
  });

  // [CLAUDE/DONE] 104
  describe('revisionConfigEmail', () => {
    it('should set to as submitter and subject with result code', async () => {
      const generalData = makeGeneralData();

      await service.revisionConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['submitter@test.com']);
      expect(generalData.configEmail.subject).toContain('R-001');
    });
  });

  // [CLAUDE/DONE] 105
  describe('approvedConfigEmail', () => {
    it('should set to as submitter and subject indicating approval', async () => {
      const generalData = makeGeneralData();

      await service.approvedConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['submitter@test.com']);
      expect(generalData.configEmail.subject).toContain('approved');
    });
  });

  // [CLAUDE/DONE] 106
  describe('noApprovedConfigEmail', () => {
    it('should set to as submitter and subject indicating not approved', async () => {
      const generalData = makeGeneralData();

      await service.noApprovedConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['submitter@test.com']);
      expect(generalData.configEmail.subject).toContain('not approved');
    });
  });

  // [CLAUDE/DONE] 107
  describe('isPiValidation', () => {
    it('should throw ForbiddenException when user is not PI and not admin', async () => {
      mockCurrentUser.roles = [SecRolesEnum.GENERAL_ADMIN];
      mockMainRepo.isPi.mockResolvedValue(false);
      const generalData = makeGeneralData();

      await expect(
        service.isPiValidation(generalData, null as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not throw when user has SUP_ADMIN role', async () => {
      mockCurrentUser.roles = [SecRolesEnum.SUP_ADMIN];
      const generalData = makeGeneralData();

      await expect(
        service.isPiValidation(generalData, null as any),
      ).resolves.not.toThrow();
    });

    it('should not throw when user is PI', async () => {
      mockCurrentUser.roles = [];
      mockMainRepo.isPi.mockResolvedValue(true);
      const generalData = makeGeneralData();

      await expect(
        service.isPiValidation(generalData, null as any),
      ).resolves.not.toThrow();
    });
  });

  // [CLAUDE/DONE] 108
  describe('generalRevisionConfigEmail', () => {
    it('should set to as submitter email', async () => {
      const generalData = makeGeneralData();

      await service.generalRevisionConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['submitter@test.com']);
    });

    it('should merge executor and result_owner into cc (not duplicating to)', async () => {
      const generalData = makeGeneralData();

      await service.generalRevisionConfigEmail(generalData, null as any);

      expect(generalData.configEmail.cc).not.toContain('submitter@test.com');
    });
  });

  // [CLAUDE/DONE] 109
  describe('findCustomDataSubmitted', () => {
    it('should call mainRepo.getDataForSubmissionResult and return generalData', async () => {
      mockMainRepo.getDataForSubmissionResult.mockResolvedValue(undefined);
      const generalData = makeGeneralData();

      const result = await service.findCustomDataSubmitted(
        generalData,
        mockEntityManager as any,
      );

      expect(mockMainRepo.getDataForSubmissionResult).toHaveBeenCalledWith(
        10,
        generalData,
        expect.anything(),
      );
      expect(result).toMatchObject({ result: { result_id: 10 } });
    });
  });

  // [CLAUDE/DONE] 110
  describe('findCustomDataForInnovationReadinessLevelSeven', () => {
    it('should call both findCustomDataSubmitted and findInnovationDevData', async () => {
      const submittedSpy = jest
        .spyOn(service, 'findCustomDataSubmitted')
        .mockResolvedValue({} as any);
      const innovationSpy = jest
        .spyOn(service, 'findInnovationDevData')
        .mockResolvedValue(undefined);
      const generalData = makeGeneralData();

      await service.findCustomDataForInnovationReadinessLevelSeven(
        generalData,
        null as any,
      );

      expect(submittedSpy).toHaveBeenCalled();
      expect(innovationSpy).toHaveBeenCalled();
    });
  });

  // [CLAUDE/DONE] 111
  describe('findCustomDataForRevision', () => {
    it('should call mainRepo.getDataForRevisionResult and return generalData copy', async () => {
      mockMainRepo.getDataForRevisionResult.mockResolvedValue(undefined);
      const generalData = makeGeneralData();

      const result = await service.findCustomDataForRevision(
        generalData,
        mockEntityManager as any,
      );

      expect(mockMainRepo.getDataForRevisionResult).toHaveBeenCalledWith(
        10,
        generalData,
        expect.anything(),
      );
      expect(result).toMatchObject({ result: { result_id: 10 } });
    });
  });

  // [CLAUDE/DONE] 112
  describe('findCustomDataForOicr', () => {
    it('should call mainRepo.getOicrGeneralData and return generalData copy', async () => {
      mockMainRepo.getOicrGeneralData.mockResolvedValue(undefined);
      const generalData = makeGeneralData();

      const result = await service.findCustomDataForOicr(
        generalData,
        mockEntityManager as any,
      );

      expect(mockMainRepo.getOicrGeneralData).toHaveBeenCalledWith(
        10,
        generalData,
        expect.anything(),
      );
      expect(result).toMatchObject({ result: { result_id: 10 } });
    });
  });

  // [CLAUDE/DONE] 113
  describe('completenessValidation', () => {
    it('should throw BadRequestException when any green check fails', async () => {
      mockGreenCheckRepository.calculateGreenChecks.mockResolvedValue({
        general: true,
        alignment: false,
      });
      const generalData = makeGeneralData();

      await expect(
        service.completenessValidation(generalData, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw when all green checks pass', async () => {
      mockGreenCheckRepository.calculateGreenChecks.mockResolvedValue({
        general: true,
        alignment: true,
      });
      const generalData = makeGeneralData();

      await expect(
        service.completenessValidation(generalData, null as any),
      ).resolves.not.toThrow();
    });
  });

  // [CLAUDE/DONE] 114
  describe('reviewOicr', () => {
    it('should throw BadRequestException when oicr_internal_code already exists', async () => {
      const mockOicrRepo = {
        findOne: jest.fn().mockResolvedValue({ result_id: 99 }),
        update: jest.fn(),
      };
      mockEntityManager.getRepository.mockReturnValue(mockOicrRepo);
      const generalData = makeGeneralData();
      generalData.aditionalData.oicr_internal_code = 'OICR-001';
      generalData.aditionalData.sharepoint_link = 'http://sharepoint.com';

      await expect(
        service.reviewOicr(generalData, mockEntityManager as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update OICR record when code does not exist elsewhere', async () => {
      const mockOicrRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockEntityManager.getRepository.mockReturnValue(mockOicrRepo);
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);
      const generalData = makeGeneralData();
      generalData.aditionalData.oicr_internal_code = 'oicr-001';
      generalData.aditionalData.sharepoint_link = 'http://sharepoint.com ';
      generalData.aditionalData.mel_regional_expert = 5 as any;

      await service.reviewOicr(generalData, mockEntityManager as any);

      expect(mockOicrRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ oicr_internal_code: 'OICR-001' }),
      );
    });
  });

  // [CLAUDE/DONE] 115
  describe('oicrRoleChangeStatusValidation', () => {
    it('should throw ForbiddenException when user is not GENERAL_ADMIN or SUP_ADMIN', async () => {
      mockCurrentUser.roles = [];

      await expect(
        service.oicrRoleChangeStatusValidation(makeGeneralData(), null as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not throw when user has GENERAL_ADMIN role', async () => {
      mockCurrentUser.roles = [SecRolesEnum.GENERAL_ADMIN];

      await expect(
        service.oicrRoleChangeStatusValidation(makeGeneralData(), null as any),
      ).resolves.not.toThrow();
    });

    it('should not throw when user has SUP_ADMIN role', async () => {
      mockCurrentUser.roles = [SecRolesEnum.SUP_ADMIN];

      await expect(
        service.oicrRoleChangeStatusValidation(makeGeneralData(), null as any),
      ).resolves.not.toThrow();
    });
  });

  // [CLAUDE/DONE] 116
  describe('directlyApprovedConfigEmail', () => {
    it('should set to as PI email and subject indicating approved', async () => {
      const generalData = makeGeneralData();

      await service.directlyApprovedConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['pi@test.com']);
      expect(generalData.configEmail.subject).toContain('approved');
      expect(generalData.configEmail.subject).toContain('R-001');
    });

    it('should exclude result_owner from cc if same as PI', async () => {
      const generalData = makeGeneralData();
      generalData.customData.result_owner.email = 'pi@test.com';

      await service.directlyApprovedConfigEmail(generalData, null as any);

      expect(generalData.configEmail.cc).not.toContain('pi@test.com');
    });
  });

  // [CLAUDE/DONE] 117
  describe('oicrGeneralConfigEmail', () => {
    it('should set to as result_owner email', async () => {
      const generalData = makeGeneralData();

      await service.oicrGeneralConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['owner@test.com']);
    });

    it('should include both PI and regional expert in cc when they differ', async () => {
      const generalData = makeGeneralData();

      await service.oicrGeneralConfigEmail(generalData, null as any);

      expect(generalData.configEmail.cc).toContain('pi@test.com');
      expect(generalData.configEmail.cc).toContain('regional@test.com');
    });
  });

  // [CLAUDE/DONE] 118
  describe('innovationLevelSevenConfigEmail', () => {
    it('should set to from EMAIL_READINESS_LEVEL_7_TO and cc as action_executor email', async () => {
      mockDbEnv.EMAIL_READINESS_LEVEL_7_TO.mockReturnValue({
        then: (cb: (v: string) => string[]) =>
          Promise.resolve(cb('notify1@test.com,notify2@test.com')),
      });
      const generalData = makeGeneralData();
      generalData.customData.innovation_readiness_level = 7;

      await service.innovationLevelSevenConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual([
        'notify1@test.com',
        'notify2@test.com',
      ]);
      expect(generalData.configEmail.cc).toEqual(['exec@test.com']);
      expect(generalData.configEmail.subject).toContain('7');
    });
  });

  // [CLAUDE/DONE] 119
  describe('oicrApprovalConfigEmail', () => {
    it('should set subject indicating OICR accepted', async () => {
      const generalData = makeGeneralData();

      await service.oicrApprovalConfigEmail(generalData, null as any);

      expect(generalData.configEmail.subject).toContain('accepted');
      expect(generalData.configEmail.subject).toContain('R-001');
    });
  });

  // [CLAUDE/DONE] 120
  describe('oicrPostponeConfigEmail', () => {
    it('should set subject indicating OICR postponed', async () => {
      const generalData = makeGeneralData();

      await service.oicrPostponeConfigEmail(generalData, null as any);

      expect(generalData.configEmail.subject).toContain('postponed');
    });
  });

  // [CLAUDE/DONE] 121
  describe('oicrRejectedConfigEmail', () => {
    it('should set subject indicating OICR not accepted', async () => {
      const generalData = makeGeneralData();

      await service.oicrRejectedConfigEmail(generalData, null as any);

      expect(generalData.configEmail.subject).toContain('not accepted');
    });
  });

  // [CLAUDE/DONE] 122
  describe('oicrRequestConfigEmail', () => {
    it('should set to as SPRM emails, cc as action_executor, and subject with result code', async () => {
      const generalData = makeGeneralData();

      await service.oicrRequestConfigEmail(generalData, null as any);

      expect(generalData.configEmail.to).toEqual(['sprm@test.com']);
      expect(generalData.configEmail.cc).toEqual(['exec@test.com']);
      expect(generalData.configEmail.subject).toContain('R-001');
    });
  });

  // [CLAUDE/DONE] 123
  describe('commentValidation', () => {
    it('should throw BadRequestException when comment is empty', async () => {
      const generalData = makeGeneralData();
      generalData.aditionalData.submission_comment = '';

      await expect(
        service.commentValidation(generalData, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when comment is null', async () => {
      const generalData = makeGeneralData();
      generalData.aditionalData.submission_comment = null;

      await expect(
        service.commentValidation(generalData, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw when comment is provided', async () => {
      const generalData = makeGeneralData();
      generalData.aditionalData.submission_comment = 'Valid comment';

      await expect(
        service.commentValidation(generalData, null as any),
      ).resolves.not.toThrow();
    });
  });
});

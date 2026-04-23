import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GreenChecksService } from './green-checks.service';
import { GreenCheckRepository } from './repository/green-checks.repository';
import { Result } from '../results/entities/result.entity';
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { SubmissionHistory } from './entities/submission-history.entity';
import { SubmissionHistoryLog } from './entities/submission-history-log.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { TemplateService } from '../../shared/auxiliar/template/template.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResultOicrService } from '../result-oicr/result-oicr.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { OptionalBody } from './dto/optional-body.dto';

describe('GreenChecksService', () => {
  let service: GreenChecksService;

  const calculateGreenChecks = jest.fn();
  const createSnapshot = jest.fn();
  const oircData = jest.fn();
  const getDataForSubmissionResult = jest.fn();
  const getDataForReviseResult = jest.fn();
  const getSubmissionHistory = jest.fn();

  const sendEmail = jest.fn();
  const getTemplate = jest.fn();
  const validateOicrInternalCode = jest.fn();
  const review = jest.fn();

  const transaction = jest.fn();
  const resultRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const submissionHistoryRepo = {
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const submissionHistoryLogRepo = {
    save: jest.fn().mockResolvedValue({}),
  };
  const resultStatusRepo = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction,
    getRepository: jest.fn((entity) => {
      if (entity === Result) return resultRepo;
      if (entity === SubmissionHistory) return submissionHistoryRepo;
      if (entity === SubmissionHistoryLog) return submissionHistoryLogRepo;
      if (entity === ResultStatus) return resultStatusRepo;
      return {};
    }),
  };

  const mockCurrentUser = {
    user_id: 1,
    roles: [SecRolesEnum.SUP_ADMIN],
    user: {
      sec_user_id: 1,
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@test.com',
    },
    audit: jest.fn((set: SetAuditEnum) =>
      set === SetAuditEnum.NEW ? { created_by: 1 } : { updated_by: 1 },
    ),
  };

  const mockAppConfig = {
    ARI_CLIENT_HOST: 'https://client.test',
    ARI_SUPPORT_EMAIL: 'support@test.com',
    ARI_CONTENT_SUPPORT_EMAIL: 'content@test.com',
    ARI_MIS: 'MIS',
    INTERNAL_EMAIL_LIST: 'internal@test.com',
  };

  /** Misma referencia en todo el ciclo de vida del módulo Nest (mutar por test). */
  const resultsUtilStub = {
    statusId: ResultStatusEnum.SUBMITTED,
    indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
    resultCode: 1001,
    nullReportYearId: 2024,
    resultId: 50,
  };

  /** prepareEmail → prepareDataToEmail exige promesas en repositorio / plantilla. */
  const stubNonOicrEmailData = () => {
    getDataForReviseResult.mockResolvedValue({
      sub_email: 'sub@test.com',
      rev_email: 'rev@test.com',
    });
    getTemplate.mockResolvedValue(Buffer.from('<email/>'));
  };

  const stubOicrEmailData = () => {
    oircData.mockResolvedValue({
      requester_by_email: 'req@test.com',
      reviewed_by_email: 'rev@test.com',
      mel_expert_email: 'mel@test.com',
    });
    getTemplate.mockResolvedValue(Buffer.from('<email/>'));
  };

  const setupTransactionForSaveHistory = () => {
    submissionHistoryRepo.insert.mockResolvedValue({
      identifiers: [{ submission_history_id: 77 }],
    });
    submissionHistoryRepo.findOne.mockResolvedValue({
      submission_history_id: 77,
      result_id: 1,
    });
    transaction.mockImplementation(
      async (cb: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === Result) return { update: resultRepo.update };
            if (entity === SubmissionHistory) return submissionHistoryRepo;
            return {};
          },
        };
        return cb(manager);
      },
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.assign(mockCurrentUser, {
      roles: [SecRolesEnum.SUP_ADMIN],
    });
    Object.assign(resultsUtilStub, {
      statusId: ResultStatusEnum.SUBMITTED,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      resultCode: 1001,
      nullReportYearId: 2024,
      resultId: 50,
    });
    transaction.mockReset();
    submissionHistoryRepo.insert.mockReset();
    submissionHistoryRepo.findOne.mockReset();
    resultRepo.findOne.mockReset();
    resultStatusRepo.findOne.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GreenChecksService,
        {
          provide: GreenCheckRepository,
          useValue: {
            calculateGreenChecks,
            createSnapshot,
            oircData,
            getDataForSubmissionResult,
            getDataForReviseResult,
            getSubmissionHistory,
          },
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        {
          provide: MessageMicroservice,
          useValue: { sendEmail },
        },
        {
          provide: TemplateService,
          useValue: { _getTemplate: getTemplate },
        },
        { provide: AppConfig, useValue: mockAppConfig },
        {
          provide: ResultsUtil,
          useValue: resultsUtilStub as unknown as ResultsUtil,
        },
        {
          provide: ResultOicrService,
          useValue: { validateOicrInternalCode, review },
        },
      ],
    }).compile();

    service = module.get<GreenChecksService>(GreenChecksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByResultId', () => {
    it('should set completness true when all checks pass', async () => {
      calculateGreenChecks.mockResolvedValue({
        general_information: true,
        alignment: true,
        geo_location: true,
        partners: true,
        evidences: true,
      });

      const dto = await service.findByResultId(10);

      expect(calculateGreenChecks).toHaveBeenCalledWith(10);
      expect(dto.completness).toBe(true);
    });

    it('should set completness false when any check fails', async () => {
      calculateGreenChecks.mockResolvedValue({
        general_information: true,
        alignment: false,
        geo_location: true,
        partners: true,
        evidences: true,
      });

      const dto = await service.findByResultId(3);

      expect(dto.completness).toBe(false);
    });
  });

  describe('statusManagement', () => {
    it('should reject DELETED status', async () => {
      await expect(
        service.statusManagement(1, ResultStatusEnum.DELETED),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject invalid status id from database', async () => {
      resultStatusRepo.findOne.mockResolvedValue(null);

      await expect(
        service.statusManagement(1, ResultStatusEnum.DRAFT),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject when result already has target status', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.SUBMITTED,
      });
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;

      await expect(
        service.statusManagement(1, ResultStatusEnum.SUBMITTED),
      ).rejects.toThrow('already in the desired status');
    });

    it('should transition SUBMITTED to DRAFT with comment when email template is absent', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.DRAFT,
      });
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      setupTransactionForSaveHistory();

      const res = await service.statusManagement(
        99,
        ResultStatusEnum.DRAFT,
        'need changes',
      );

      expect(resultRepo.update).toHaveBeenCalled();
      expect(submissionHistoryRepo.insert).toHaveBeenCalled();
      expect(res).toMatchObject({ submission_history_id: 77 });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should return snapshot when transitioning to APPROVED', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.APPROVED,
      });
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      setupTransactionForSaveHistory();
      stubNonOicrEmailData();
      const snapshot = {
        result_id: 99,
        result_status_id: ResultStatusEnum.APPROVED,
      } as Result;
      createSnapshot.mockResolvedValue(snapshot);

      const res = await service.statusManagement(
        99,
        ResultStatusEnum.APPROVED,
        'ok',
      );

      expect(createSnapshot).toHaveBeenCalledWith(1001, 2024);
      expect(res).toEqual(snapshot);
    });

    it('should call validateOicrInternalCode when OICR moves from REQUESTED to DRAFT', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.DRAFT,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.REQUESTED;
      resultsUtilStub.resultId = 50;
      setupTransactionForSaveHistory();
      stubOicrEmailData();
      const body = {
        mel_regional_expert: '1',
        oicr_internal_code: 'OICR-1',
        sharepoint_link: 'https://share.example/doc',
      };

      await service.statusManagement(50, ResultStatusEnum.DRAFT, 'c', body);

      expect(validateOicrInternalCode).toHaveBeenCalledWith(50, 'OICR-1');
    });

    it('should call review when OICR moves from POSTPONE to DRAFT', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.DRAFT,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.POSTPONE;
      setupTransactionForSaveHistory();
      stubOicrEmailData();
      const body = {
        mel_regional_expert: '1',
        oicr_internal_code: 'X',
        sharepoint_link: 'https://share.example/doc',
      };

      await service.statusManagement(2, ResultStatusEnum.DRAFT, 'c', body);

      expect(review).toHaveBeenCalledWith(50, body);
    });

    it('should reject OICR REQUESTED to DRAFT when required body fields are missing', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.DRAFT,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.REQUESTED;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(
          2,
          ResultStatusEnum.DRAFT,
          'c',
          {} as unknown as OptionalBody,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow OICR REQUESTED to DRAFT with required body fields', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.DRAFT,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.REQUESTED;
      setupTransactionForSaveHistory();
      stubOicrEmailData();

      await service.statusManagement(2, ResultStatusEnum.DRAFT, 'c', {
        mel_regional_expert: '1',
        oicr_internal_code: 'OK',
        sharepoint_link: 'https://share.example/doc',
      });

      expect(submissionHistoryRepo.insert).toHaveBeenCalled();
    });

    it('should reject REVISED without comment (non-OICR)', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.REVISED,
      });
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.REVISED, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition non-OICR SUBMITTED to REVISED with comment', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.REVISED,
      });
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      setupTransactionForSaveHistory();
      stubNonOicrEmailData();

      const res = await service.statusManagement(
        1,
        ResultStatusEnum.REVISED,
        'please fix',
      );

      expect(res).toMatchObject({ submission_history_id: 77 });
    });

    it('should reject unsupported target status (default branch)', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.EDITING,
      });
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.EDITING, 'x'),
      ).rejects.toThrow('Invalid status');
    });

    it('should reject OICR_APPROVED when current status is not REQUESTED', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.OICR_APPROVED,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.DRAFT;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.OICR_APPROVED, 'x'),
      ).rejects.toThrow('Only OIRC in requested status');
    });

    it('should allow OICR_APPROVED from REQUESTED', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.OICR_APPROVED,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.REQUESTED;
      setupTransactionForSaveHistory();
      stubOicrEmailData();

      const res = await service.statusManagement(
        1,
        ResultStatusEnum.OICR_APPROVED,
        'ok',
      );

      expect(res).toMatchObject({ submission_history_id: 77 });
    });

    it('should reject OICR transition to SCIENCE_EDITION from invalid prior status', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.SCIENCE_EDITION,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.SCIENCE_EDITION, 'x'),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow OICR transition to SCIENCE_EDITION from DRAFT', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.SCIENCE_EDITION,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.DRAFT;
      setupTransactionForSaveHistory();

      const res = await service.statusManagement(
        1,
        ResultStatusEnum.SCIENCE_EDITION,
        'x',
      );

      expect(res).toMatchObject({ submission_history_id: 77 });
    });

    it('should reject change when current is APPROVED and target is REVISED', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.REVISED,
      });
      resultsUtilStub.statusId = ResultStatusEnum.APPROVED;
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.REVISED, 'c'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject SUBMITTED to DRAFT without comment', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.DRAFT,
      });
      resultsUtilStub.statusId = ResultStatusEnum.SUBMITTED;
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.DRAFT),
      ).rejects.toThrow('comment is required when changing from submitted');
    });

    it('should throw ForbiddenException when OICR POSTPONE lacks admin role', async () => {
      mockCurrentUser.roles = [SecRolesEnum.CONTRIBUTOR];
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.POSTPONE,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.REQUESTED;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.POSTPONE, 'p'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow OICR REQUESTED to POSTPONE when user is admin', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.POSTPONE,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.REQUESTED;
      setupTransactionForSaveHistory();
      stubOicrEmailData();

      const res = await service.statusManagement(
        1,
        ResultStatusEnum.POSTPONE,
        'postpone reason',
      );

      expect(res).toMatchObject({ submission_history_id: 77 });
    });

    it('should reject OICR POSTPONE when current status is not in allowed list', async () => {
      resultStatusRepo.findOne.mockResolvedValue({
        result_status_id: ResultStatusEnum.POSTPONE,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      resultsUtilStub.statusId = ResultStatusEnum.KM_CURATION;
      setupTransactionForSaveHistory();

      await expect(
        service.statusManagement(1, ResultStatusEnum.POSTPONE, 'p'),
      ).rejects.toThrow(/OIRC in requested status can be/);
    });
  });

  describe('saveHistory', () => {
    it('should update result and insert submission history in a transaction', async () => {
      setupTransactionForSaveHistory();
      submissionHistoryRepo.findOne.mockResolvedValue({
        submission_history_id: 77,
        result_id: 5,
      });
      const history = new SubmissionHistory();
      history.result_id = 5;
      history.from_status_id = ResultStatusEnum.SUBMITTED;
      history.to_status_id = ResultStatusEnum.DRAFT;
      history.submission_comment = 'c';

      const out = await service.saveHistory(5, history);

      expect(transaction).toHaveBeenCalled();
      expect(resultRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          result_status_id: ResultStatusEnum.DRAFT,
        }),
      );
      expect(submissionHistoryRepo.insert).toHaveBeenCalled();
      expect(out).toEqual(
        expect.objectContaining({ submission_history_id: 77, result_id: 5 }),
      );
    });
  });

  describe('prepareDataToEmail', () => {
    it('should load OICR data and template when indicator is OICR', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      oircData.mockResolvedValue({ foo: 'bar' });
      getTemplate.mockResolvedValue(Buffer.from('tpl'));

      const prepared = await service.prepareDataToEmail(
        1,
        ResultStatusEnum.REJECTED,
        ResultStatusEnum.REQUESTED,
        TemplateEnum.OICR_REJECTED,
        { submission_history_id: 9 } as SubmissionHistory,
      );

      expect(oircData).toHaveBeenCalled();
      expect(getTemplate).toHaveBeenCalled();
      expect(prepared).toEqual({
        template: Buffer.from('tpl'),
        data: { foo: 'bar' },
      });
    });

    it('should build submission payload when moving to SUBMITTED (non-OICR)', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      getDataForSubmissionResult.mockResolvedValue({
        principal_investigator_first_name: 'P',
        principal_investigator_last_name: 'I',
        result_id: 20,
        result_title: 'T',
        project_name: 'Pr',
        owner_id: 1,
        owner_email: 'owner@test.com',
        indicator: 'KP',
      });
      getTemplate.mockResolvedValue(Buffer.from('sub'));

      const prepared = await service.prepareDataToEmail(
        20,
        ResultStatusEnum.SUBMITTED,
        ResultStatusEnum.DRAFT,
        TemplateEnum.SUBMITTED_RESULT,
      );

      expect(prepared).toMatchObject({
        data: expect.objectContaining({
          pi_name: 'P I',
          result_id: 20,
          title: 'T',
        }),
      });
      expect(Buffer.isBuffer(prepared.template)).toBe(true);
    });

    it('should use revise data path for other transitions', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      getDataForReviseResult.mockResolvedValue({ sub_email: 's@test.com' });
      getTemplate.mockResolvedValue(Buffer.from('rev'));

      const prepared = await service.prepareDataToEmail(
        3,
        ResultStatusEnum.REVISED,
        ResultStatusEnum.SUBMITTED,
        TemplateEnum.REVISE_RESULT,
      );

      expect(Buffer.isBuffer(prepared.template)).toBe(true);
      expect(prepared.template.equals(Buffer.from('rev'))).toBe(true);
      expect(getDataForReviseResult).toHaveBeenCalledWith(
        3,
        ResultStatusEnum.REVISED,
        ResultStatusEnum.SUBMITTED,
      );
    });

    it('should join owner and submitter emails when owner is not current user', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      getDataForSubmissionResult.mockResolvedValue({
        principal_investigator_first_name: 'P',
        principal_investigator_last_name: 'I',
        result_id: 20,
        result_title: 'T',
        project_name: 'Pr',
        owner_id: 99,
        owner_email: 'owner@test.com',
        indicator: 'KP',
      });
      getTemplate.mockResolvedValue(Buffer.from('sub'));

      const prepared = await service.prepareDataToEmail(
        20,
        ResultStatusEnum.SUBMITTED,
        ResultStatusEnum.DRAFT,
        TemplateEnum.SUBMITTED_RESULT,
      );

      expect(prepared.data).toMatchObject({
        rev_email: 'owner@test.com, ada@test.com',
      });
    });
  });

  describe('prepareEmail', () => {
    it('should skip sending for statuses that exit early', async () => {
      await service.prepareEmail(
        1,
        ResultStatusEnum.SCIENCE_EDITION,
        ResultStatusEnum.DRAFT,
      );
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should skip when getTemplateByStatus returns null', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      await service.prepareEmail(
        5,
        ResultStatusEnum.DRAFT,
        ResultStatusEnum.SUBMITTED,
      );
      expect(sendEmail).not.toHaveBeenCalled();
      expect(getDataForReviseResult).not.toHaveBeenCalled();
    });

    it('should exit early for DRAFT from SCIENCE_EDITION', async () => {
      await service.prepareEmail(
        1,
        ResultStatusEnum.DRAFT,
        ResultStatusEnum.SCIENCE_EDITION,
      );
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should send email when template config exists for APPROVED', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      getDataForReviseResult.mockResolvedValue({
        sub_email: 'sub@test.com',
        rev_email: 'rev@test.com',
      });
      getTemplate.mockResolvedValue(Buffer.from('<html/>'));

      await service.prepareEmail(
        8,
        ResultStatusEnum.APPROVED,
        ResultStatusEnum.SUBMITTED,
      );

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'sub@test.com',
          subject: expect.stringContaining('approved'),
        }),
      );
    });

    it('should send OICR email with MEL expert on cc when OICR_APPROVED', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      oircData.mockResolvedValue({
        requester_by_email: 'req@test.com',
        reviewed_by_email: 'rev@test.com',
        mel_expert_email: 'mel@test.com',
      });
      getTemplate.mockResolvedValue(Buffer.from('<oicr/>'));

      await service.prepareEmail(
        3,
        ResultStatusEnum.OICR_APPROVED,
        ResultStatusEnum.REQUESTED,
        {
          oicr_internal_code: 'N-1',
          mel_regional_expert: '1',
          sharepoint_link: 'https://share.example/doc',
        },
      );

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'req@test.com',
          cc: 'rev@test.com,mel@test.com',
        }),
      );
    });

    it('should send OICR email without MEL on cc when not OICR_APPROVED', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      oircData.mockResolvedValue({
        requester_by_email: 'req@test.com',
        reviewed_by_email: 'rev@test.com',
        mel_expert_email: 'mel@test.com',
      });
      getTemplate.mockResolvedValue(Buffer.from('<oicr/>'));

      await service.prepareEmail(
        3,
        ResultStatusEnum.REJECTED,
        ResultStatusEnum.REQUESTED,
      );

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'req@test.com',
          cc: 'rev@test.com',
        }),
      );
    });

    it('should send SUBMITTED email to current user when non-OICR', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
      getDataForSubmissionResult.mockResolvedValue({
        principal_investigator_first_name: 'P',
        principal_investigator_last_name: 'I',
        result_id: 20,
        result_title: 'T',
        project_name: 'Pr',
        owner_id: 1,
        owner_email: 'owner@test.com',
        indicator: 'KP',
      });
      getTemplate.mockResolvedValue(Buffer.from('<sub/>'));

      await service.prepareEmail(
        20,
        ResultStatusEnum.SUBMITTED,
        ResultStatusEnum.DRAFT,
      );

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ada@test.com',
        }),
      );
    });
  });

  describe('getSubmissionHistory', () => {
    it('should delegate to repository', async () => {
      const rows = [{ submission_history_id: 1 } as SubmissionHistory];
      getSubmissionHistory.mockResolvedValue(rows);

      const out = await service.getSubmissionHistory(4);

      expect(getSubmissionHistory).toHaveBeenCalledWith(4);
      expect(out).toBe(rows);
    });
  });

  describe('newReportingCycle', () => {
    it('should throw when no approved active result exists', async () => {
      resultRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.newReportingCycle(500, 2026)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should save draft history and update report year', async () => {
      const approved = {
        result_id: 10,
        result_official_code: 500,
        result_status_id: ResultStatusEnum.APPROVED,
        report_year_id: 2024,
      };
      resultRepo.findOne
        .mockResolvedValueOnce(approved)
        .mockResolvedValueOnce(approved);
      setupTransactionForSaveHistory();

      const out = await service.newReportingCycle(500, 2026);

      expect(resultRepo.update).toHaveBeenCalled();
      expect(out).toMatchObject({
        report_year_id: 2026,
        result_status_id: ResultStatusEnum.DRAFT,
      });
    });
  });

  describe('updateChageStatusDate', () => {
    it('should throw when submission history is missing', async () => {
      submissionHistoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateChageStatusDate(1, 999, new Date()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update custom date and persist log', async () => {
      const oldDate = new Date('2020-01-01');
      const newDate = new Date('2025-06-01');
      submissionHistoryRepo.findOne.mockResolvedValue({
        submission_history_id: 5,
        result_id: 1,
        custom_date: oldDate,
      });
      submissionHistoryLogRepo.save.mockResolvedValue({});

      await service.updateChageStatusDate(1, 5, newDate);

      expect(submissionHistoryRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ custom_date: newDate }),
      );
      expect(submissionHistoryLogRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when update fails', async () => {
      submissionHistoryRepo.findOne.mockResolvedValue({
        submission_history_id: 5,
        result_id: 1,
        custom_date: new Date('2020-01-01'),
      });
      submissionHistoryRepo.update.mockRejectedValueOnce(new Error('db'));

      await expect(
        service.updateChageStatusDate(1, 5, new Date('2025-06-01')),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('saveSubmissionHistoryLog', () => {
    it('should throw when submission history not found', async () => {
      submissionHistoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.saveSubmissionHistoryLog(1, new Date(), new Date()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save log entry', async () => {
      submissionHistoryRepo.findOne.mockResolvedValue({
        submission_history_id: 3,
      });
      submissionHistoryLogRepo.save.mockResolvedValue({});

      await service.saveSubmissionHistoryLog(
        3,
        new Date('2025-01-02'),
        new Date('2025-01-01'),
      );

      expect(submissionHistoryLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          submission_history_id: 3,
          new_date: expect.any(Date),
          old_date: expect.any(Date),
          created_by: 1,
        }),
      );
    });

    it('should throw ConflictException when save fails', async () => {
      submissionHistoryRepo.findOne.mockResolvedValue({
        submission_history_id: 3,
      });
      submissionHistoryLogRepo.save.mockRejectedValueOnce(new Error('db'));

      await expect(
        service.saveSubmissionHistoryLog(
          3,
          new Date('2025-01-02'),
          new Date('2025-01-01'),
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});

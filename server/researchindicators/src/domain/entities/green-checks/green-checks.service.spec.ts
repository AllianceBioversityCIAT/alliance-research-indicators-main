import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
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
  });
});

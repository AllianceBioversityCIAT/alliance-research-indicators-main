import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { LinkResultsService } from '../link-results/link-results.service';
import { ResultInstitutionsService } from '../result-institutions/result-institutions.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { PolicyStagesService } from '../policy-stages/policy-stages.service';
import { PolicyTypesService } from '../policy-types/policy-types.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';

describe('ResultPolicyChangeService', () => {
  let service: ResultPolicyChangeService;

  const mockFindOne = jest.fn();
  const mockSave = jest.fn();
  const mockUpdate = jest.fn();
  const mockResultFind = jest.fn();
  const mockTransaction = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1, created_by: 1 }),
  };

  const mockLinkResultsService = {
    create: jest.fn(),
    findAndDetails: jest.fn(),
  };

  const mockResultInstitutionsService = {
    create: jest.fn(),
    findInstitutionsByRoleResult: jest.fn(),
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn(),
  };

  const mockPolicyStagesService = {
    findByName: jest.fn(),
  };

  const mockPolicyTypesService = {
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultPolicyChangeService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: mockFindOne,
              find: mockResultFind,
              save: mockSave,
              update: mockUpdate,
            }),
            transaction: mockTransaction,
          },
        },
        { provide: LinkResultsService, useValue: mockLinkResultsService },
        {
          provide: ResultInstitutionsService,
          useValue: mockResultInstitutionsService,
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        { provide: PolicyStagesService, useValue: mockPolicyStagesService },
        { provide: PolicyTypesService, useValue: mockPolicyTypesService },
      ],
    }).compile();

    service = module.get<ResultPolicyChangeService>(ResultPolicyChangeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 89
  describe('create', () => {
    it('should throw ConflictException when policy change already exists', async () => {
      mockFindOne.mockResolvedValue({ result_id: 10 });

      await expect(service.create(10)).rejects.toThrow(ConflictException);
    });

    it('should save and return new policy change when it does not exist', async () => {
      const saved = { result_id: 10 };
      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(saved);

      const result = await service.create(10);

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  // [CLAUDE/DONE] 90
  describe('processedAiInfo', () => {
    it('should map raw AI data to CreateResultPolicyChangeDto', async () => {
      mockPolicyStagesService.findByName.mockResolvedValue({
        policy_stage_id: 1,
      });
      mockPolicyTypesService.findByName.mockResolvedValue({
        policy_type_id: 2,
      });

      const result = await service.processedAiInfo({
        evidence_for_stage: 'evidence',
        stage_in_policy_process: 'Stage 1',
        policy_type: 'Law',
      } as any);

      expect(result.evidence_stage).toBe('evidence');
      expect(result.policy_stage_id).toBe(1);
      expect(result.policy_type_id).toBe(2);
    });

    it('should return dto without policy_stage_id when stage string does not match regex', async () => {
      mockPolicyTypesService.findByName.mockResolvedValue(null);

      const result = await service.processedAiInfo({
        evidence_for_stage: 'evidence',
        stage_in_policy_process: 'No match here',
        policy_type: 'Unknown',
      } as any);

      expect(result.policy_stage_id).toBeUndefined();
      expect(result.policy_type_id).toBeUndefined();
    });
  });

  // [CLAUDE/DONE] 91
  describe('update', () => {
    it('should run transaction and call linkResultsService and resultInstitutionsService', async () => {
      mockTransaction.mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({ update: mockUpdate }),
        };
        return cb(mockManager);
      });
      mockLinkResultsService.create.mockResolvedValue(undefined);
      mockResultInstitutionsService.create.mockResolvedValue(undefined);
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);

      await service.update(10, {
        innovation_development: null,
        innovation_use: null,
        implementing_organization: [],
        policy_type_id: 1,
        policy_stage_id: 2,
        evidence_stage: 'ev',
      });

      expect(mockLinkResultsService.create).toHaveBeenCalled();
      expect(mockResultInstitutionsService.create).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          usd_amount: null,
          amount_status: null,
        }),
      );
    });

    it('should persist usd_amount and amount_status when policy_type_id is 3', async () => {
      mockTransaction.mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({ update: mockUpdate }),
        };
        return cb(mockManager);
      });
      mockLinkResultsService.create.mockResolvedValue(undefined);
      mockResultInstitutionsService.create.mockResolvedValue(undefined);
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);

      await service.update(10, {
        innovation_development: null,
        innovation_use: null,
        implementing_organization: [],
        policy_type_id: 3,
        policy_stage_id: 2,
        evidence_stage: 'ev',
        usd_amount: 1200,
        amount_status: 'Estimated',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          usd_amount: 1200,
          amount_status: 'Estimated',
        }),
      );
    });

    it('should persist zero and store a missing status as null', async () => {
      await service.update(10, {
        implementing_organization: [],
        policy_type_id: 3,
        policy_stage_id: 2,
        evidence_stage: 'ev',
        usd_amount: 0,
      } as any);

      expect(mockUpdate).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          usd_amount: 0,
          amount_status: null,
        }),
      );
    });

    it('should store an invalid amount status as null without rejecting the save', async () => {
      await service.update(10, {
        implementing_organization: [],
        policy_type_id: 3,
        policy_stage_id: 2,
        evidence_stage: 'ev',
        usd_amount: 10,
        amount_status: 'Maybe',
      } as any);

      expect(mockUpdate).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          usd_amount: 10,
          amount_status: null,
        }),
      );
    });

    const sectionDto = {
      implementing_organization: [],
      policy_type_id: 1,
      policy_stage_id: 2,
      evidence_stage: 'ev',
    };

    const armTransaction = () => {
      mockTransaction.mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({ update: mockUpdate }),
        };
        return cb(mockManager);
      });
      mockLinkResultsService.create.mockResolvedValue(undefined);
      mockResultInstitutionsService.create.mockResolvedValue(undefined);
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);
    };

    it('rejects innovation_use when the target is an Innovation Development result and writes nothing', async () => {
      armTransaction();
      mockResultFind.mockResolvedValue([
        { result_id: 22, indicator_id: IndicatorsEnum.INNOVATION_DEV },
      ]);

      const pending = service.update(10, {
        ...sectionDto,
        innovation_use: 22,
      } as any);

      await expect(pending).rejects.toThrow(BadRequestException);
      await expect(pending).rejects.toThrow(/innovation_use/);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects innovation_development when the target is an Innovation Use result and writes nothing', async () => {
      armTransaction();
      mockResultFind.mockResolvedValue([
        { result_id: 66, indicator_id: IndicatorsEnum.INNOVATION_USE },
      ]);

      const pending = service.update(10, {
        ...sectionDto,
        innovation_development: 66,
      } as any);

      await expect(pending).rejects.toThrow(BadRequestException);
      await expect(pending).rejects.toThrow(/innovation_development/);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects an unknown link id', async () => {
      armTransaction();
      mockResultFind.mockResolvedValue([]);

      const pending = service.update(10, {
        ...sectionDto,
        innovation_development: 404,
      } as any);

      await expect(pending).rejects.toThrow(BadRequestException);
      await expect(pending).rejects.toThrow(/innovation_development/);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('accepts null and absent links without looking up results', async () => {
      armTransaction();

      await expect(
        service.update(10, {
          ...sectionDto,
          innovation_development: null,
          innovation_use: null,
        }),
      ).resolves.toBeUndefined();

      await expect(
        service.update(10, { ...sectionDto } as any),
      ).resolves.toBeUndefined();

      expect(mockResultFind).not.toHaveBeenCalled();
    });

    it('saves a valid Innovation Development and Innovation Use pair', async () => {
      armTransaction();
      mockResultFind.mockResolvedValue([
        { result_id: 20, indicator_id: IndicatorsEnum.INNOVATION_DEV },
        { result_id: 60, indicator_id: IndicatorsEnum.INNOVATION_USE },
      ]);

      await service.update(10, {
        ...sectionDto,
        innovation_development: 20,
        innovation_use: 60,
      });

      expect(mockLinkResultsService.create.mock.calls[0][1]).toEqual([
        { other_result_id: 20 },
        { other_result_id: 60 },
      ]);
    });

    it('clears Innovation Use and sends only the Innovation Development id', async () => {
      armTransaction();
      mockResultFind.mockResolvedValue([
        { result_id: 20, indicator_id: IndicatorsEnum.INNOVATION_DEV },
      ]);

      await service.update(10, {
        ...sectionDto,
        innovation_development: 20,
        innovation_use: null,
      });

      expect(mockLinkResultsService.create.mock.calls[0][1]).toEqual([
        { other_result_id: 20 },
      ]);
    });

    it('accepts a correct indicator when the target is inactive or not approved', async () => {
      armTransaction();
      mockResultFind.mockImplementation(async (options) => {
        const where = options?.where ?? {};
        if (
          Object.prototype.hasOwnProperty.call(where, 'is_active') ||
          Object.prototype.hasOwnProperty.call(where, 'result_status_id')
        ) {
          return [];
        }
        return [
          {
            result_id: 70,
            indicator_id: IndicatorsEnum.INNOVATION_DEV,
            is_active: false,
            result_status_id: 7,
          },
        ];
      });

      await expect(
        service.update(10, {
          ...sectionDto,
          innovation_development: 70,
        } as any),
      ).resolves.toBeUndefined();
    });
  });

  // [CLAUDE/DONE] 92
  describe('findPolicyChange', () => {
    it('should return policy change dto combining mainRepo and services data', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 10,
        policy_type_id: 3,
        policy_stage_id: 2,
        evidence_stage: 'stage',
        usd_amount: '1500.00',
        amount_status: 'Confirmed',
      });
      mockResultInstitutionsService.findInstitutionsByRoleResult.mockResolvedValue(
        [],
      );
      mockLinkResultsService.findAndDetails.mockResolvedValue([
        {
          other_result_id: 5,
          other_result: { indicator_id: IndicatorsEnum.INNOVATION_DEV },
        },
        {
          other_result_id: 6,
          other_result: { indicator_id: IndicatorsEnum.INNOVATION_USE },
        },
      ]);

      const result = await service.findPolicyChange(10);

      expect(result.evidence_stage).toBe('stage');
      expect(result.innovation_development).toBe(5);
      expect(result.innovation_use).toBe(6);
      expect(result.usd_amount).toBe(1500);
      expect(result.amount_status).toBe('Confirmed');
    });

    it('should return undefined innovation links when no link results match', async () => {
      mockFindOne.mockResolvedValue(null);
      mockResultInstitutionsService.findInstitutionsByRoleResult.mockResolvedValue(
        [],
      );
      mockLinkResultsService.findAndDetails.mockResolvedValue([]);

      const result = await service.findPolicyChange(99);

      expect(result.innovation_development).toBeUndefined();
      expect(result.innovation_use).toBeUndefined();
    });
  });
});

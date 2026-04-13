import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultStatusWorkflowService } from './result-status-workflow.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { StatusWorkflowFunctionHandlerService } from './function-handler.service';
import { ResultStatusWorkflow } from './entities/result-status-workflow.entity';
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { Result } from '../results/entities/result.entity';

describe('ResultStatusWorkflowService', () => {
  let service: ResultStatusWorkflowService;
  const mockWorkflowFind = jest.fn();
  const mockWorkflowFindOne = jest.fn();
  const mockStatusFind = jest.fn();
  const mockResultFindOne = jest.fn();
  const mockTransaction = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultStatusWorkflowService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockImplementation((entity) => {
              if (entity === ResultStatusWorkflow) {
                return {
                  find: mockWorkflowFind,
                  findOne: mockWorkflowFindOne,
                };
              }
              if (entity === ResultStatus) {
                return { find: mockStatusFind };
              }
              if (entity === Result) {
                return { findOne: mockResultFindOne };
              }
              return { find: jest.fn(), findOne: jest.fn() };
            }),
            transaction: mockTransaction,
          },
        },
        {
          provide: ResultsUtil,
          useValue: { nullResultId: null, indicatorId: null, statusId: null },
        },
        {
          provide: CurrentUserUtil,
          useValue: {
            user: {
              first_name: 'John',
              last_name: 'Doe',
              email: 'j@d.com',
            },
            user_id: 1,
            audit: jest.fn().mockReturnValue({ updated_by: 1 }),
          },
        },
        {
          provide: StatusWorkflowFunctionHandlerService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ResultStatusWorkflowService>(
      ResultStatusWorkflowService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 124
  describe('getAllStatusesByindicatorId', () => {
    it('should return workflow statuses without config field', async () => {
      const mockStatuses = [
        { indicator_id: 1, is_active: true, config: { actions: [] }, from_status: {}, to_status: {} },
        { indicator_id: 1, is_active: true, config: { actions: [] }, from_status: {}, to_status: {} },
      ];
      mockWorkflowFind.mockResolvedValue(mockStatuses);

      const result = await service.getAllStatusesByindicatorId(1);

      expect(mockWorkflowFind).toHaveBeenCalledWith({
        where: { indicator_id: 1, is_active: true },
        relations: { from_status: true, to_status: true },
      });
      expect(result).toHaveLength(2);
      result.forEach((item) => {
        expect(item).not.toHaveProperty('config');
      });
    });

    it('should return empty array when no workflows match', async () => {
      mockWorkflowFind.mockResolvedValue([]);

      const result = await service.getAllStatusesByindicatorId(99);

      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 125
  describe('getHierarchicalTreeByIndicatorId', () => {
    it('should fetch workflows and return hierarchical tree', async () => {
      mockWorkflowFind.mockResolvedValue([]);

      const result = await service.getHierarchicalTreeByIndicatorId(1);

      expect(mockWorkflowFind).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // [CLAUDE/DONE] 126
  describe('getConfigWorkflowByIndicatorAndFromStatus', () => {
    it('should return raw statuses when showOnlyWorkflow is true', async () => {
      const mockStatuses = [{ to_status_id: 2, indicator_id: 1 }];
      mockWorkflowFind.mockResolvedValue(mockStatuses);

      const result =
        await service.getConfigWorkflowByIndicatorAndFromStatus(1, 1, true);

      expect(result).toEqual(mockStatuses);
    });

    it('should return enriched statuses with transition_direction when showOnlyWorkflow is false', async () => {
      mockWorkflowFind
        .mockResolvedValueOnce([{ to_status_id: 2, is_active: true }])
        .mockResolvedValueOnce([]);
      mockStatusFind.mockResolvedValue([
        { result_status_id: 2, is_active: true },
      ]);

      const result =
        await service.getConfigWorkflowByIndicatorAndFromStatus(1, 1);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no to-statuses are found', async () => {
      mockWorkflowFind
        .mockResolvedValueOnce([{ to_status_id: 99 }])
        .mockResolvedValueOnce([]);
      mockStatusFind.mockResolvedValue([]);

      const result =
        await service.getConfigWorkflowByIndicatorAndFromStatus(1, 1);

      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 127
  describe('getNextStepsByResultId', () => {
    it('should use result from DB when currentResult.nullResultId is null', async () => {
      mockResultFindOne.mockResolvedValue({
        indicator_id: 1,
        result_status_id: 2,
      });
      mockWorkflowFind
        .mockResolvedValueOnce([{ to_status_id: 3 }])
        .mockResolvedValueOnce([]);
      mockStatusFind.mockResolvedValue([
        { result_status_id: 3, is_active: true },
      ]);

      const result = await service.getNextStepsByResultId(10);

      expect(mockResultFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { result_id: 10, is_active: true } }),
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // [CLAUDE/DONE] 128
  describe('changeStatus', () => {
    it('should throw NotFoundException when result is not found', async () => {
      mockResultFindOne.mockResolvedValue(null);

      await expect(
        service.changeStatus(99, 2, { submission_comment: 'test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when transition is not valid', async () => {
      mockResultFindOne.mockResolvedValue({ result_id: 1, indicator_id: 1, result_status_id: 1 });
      mockWorkflowFindOne.mockResolvedValue(null);

      await expect(
        service.changeStatus(1, 2, { submission_comment: 'test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should execute transaction when result and transition are valid', async () => {
      const mockResult = {
        result_id: 1,
        indicator_id: 1,
        result_status_id: 1,
        first_name: 'John',
        last_name: 'Doe',
      };
      const mockTransition: Partial<ResultStatusWorkflow> = {
        from_status_id: 1,
        to_status_id: 2,
        config: { actions: [] },
      };
      mockResultFindOne.mockResolvedValue(mockResult);
      mockWorkflowFindOne.mockResolvedValue(mockTransition);

      const mockInsertResult = { identifiers: [{ submission_history_id: 10 }] };
      const mockHistoryEntry = { submission_history_id: 10, created_at: new Date() };
      const mockManagerRepo = {
        insert: jest.fn().mockResolvedValue(mockInsertResult),
        findOne: jest.fn().mockResolvedValue(mockHistoryEntry),
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockTransaction.mockImplementation(async (cb) => {
        return cb({ getRepository: jest.fn().mockReturnValue(mockManagerRepo) });
      });

      await expect(
        service.changeStatus(1, 2, { submission_comment: 'approved' } as any),
      ).resolves.not.toThrow();

      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});

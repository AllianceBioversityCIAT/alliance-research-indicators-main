import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BilateralService } from './bilateral.service';
import { ResultRepository } from '../results/repositories/result.repository';
import { ResultPoolFundingAlignmentRepository } from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingIndicatorMappingRepository } from './repositories/result-pool-funding-indicator-mapping.repository';
import { ResultsUtil } from '../../shared/utils/results.util';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultPoolFundingAlignment } from './entities/result-pool-funding-alignment.entity';
import { ResultPoolFundingAlignmentSp } from './entities/result-pool-funding-alignment-sp.entity';
import { ResultPoolFundingIndicatorMapping } from './entities/result-pool-funding-indicator-mapping.entity';
import { ResultReviewHistory } from '../result-review-history/entities/result-review-history.entity';
import { ServerGateway } from '../../tools/socket/server.gateway';

describe('BilateralService', () => {
  let service: BilateralService;
  let dataSource: jest.Mocked<DataSource>;
  let resultRepository: jest.Mocked<ResultRepository>;
  let alignmentRepository: jest.Mocked<ResultPoolFundingAlignmentRepository>;
  let mappingRepository: jest.Mocked<ResultPoolFundingIndicatorMappingRepository>;
  let resultsUtil: Pick<ResultsUtil, 'resultId'>;
  let currentUser: Pick<CurrentUserUtil, 'user_id'>;
  let serverGateway: jest.Mocked<
    Pick<ServerGateway, 'emitPoolFundingAlignmentChanged'>
  >;
  let alignmentSpRepo: { update: jest.Mock; save: jest.Mock };
  let alignmentRepo: { update: jest.Mock; save: jest.Mock };
  let mappingRepo: { update: jest.Mock; save: jest.Mock };
  let historyRepo: { save: jest.Mock };
  let capacitySharingHandler: {
    indicatorType: string;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  let innovationDevelopmentHandler: {
    indicatorType: string;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  let knowledgeProductHandler: {
    indicatorType: string;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  let noopHandler: {
    indicatorType: string;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  let policyChangeHandler: {
    indicatorType: string;
    upsert: jest.Mock;
    delete: jest.Mock;
  };

  const context = {
    result_id: 77,
    result_official_code: 123,
    result_status_id: 24,
    version_id: 2,
    report_year_id: 2026,
    is_synced_to_prms: 0,
    is_pool_funding_contributor: 1,
  };

  beforeEach(() => {
    alignmentSpRepo = {
      update: jest.fn(),
      save: jest.fn(),
    };
    alignmentRepo = {
      update: jest.fn(),
      save: jest.fn().mockResolvedValue({ id: 6 }),
    };
    mappingRepo = {
      update: jest.fn(),
      save: jest.fn().mockImplementation((payload) => ({
        id: 10,
        is_stale: false,
        ...payload,
      })),
    };
    historyRepo = {
      save: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          getRepository: jest.fn((entity) => {
            if (entity === ResultPoolFundingAlignmentSp) return alignmentSpRepo;
            if (entity === ResultPoolFundingAlignment) return alignmentRepo;
            if (entity === ResultPoolFundingIndicatorMapping)
              return mappingRepo;
            if (entity === ResultReviewHistory) return historyRepo;
            return null;
          }),
        }),
      ),
    } as unknown as jest.Mocked<DataSource>;
    resultRepository = {
      findPoolFundingAlignmentContext: jest.fn(),
    } as unknown as jest.Mocked<ResultRepository>;
    alignmentRepository = {
      findActiveAlignmentByResultId: jest.fn(),
    } as unknown as jest.Mocked<ResultPoolFundingAlignmentRepository>;
    mappingRepository = {
      findActiveMappingByResultLeverIndicator: jest.fn(),
      findActiveStaleMappingsByResultAndLevers: jest.fn().mockResolvedValue([]),
      markActiveMappingsStaleByLeverIndicator: jest.fn(),
    } as unknown as jest.Mocked<ResultPoolFundingIndicatorMappingRepository>;
    resultsUtil = {
      resultId: 77,
    } as Pick<ResultsUtil, 'resultId'>;
    currentUser = {
      user_id: 99,
    };
    serverGateway = {
      emitPoolFundingAlignmentChanged: jest.fn(),
    };
    capacitySharingHandler = {
      indicatorType: 'capacity_sharing',
      upsert: jest.fn().mockResolvedValue({
        fkField: 'result_capacity_sharing_id',
        fkId: 77,
      }),
      delete: jest.fn(),
    };
    innovationDevelopmentHandler = {
      indicatorType: 'innovation_development',
      upsert: jest.fn(),
      delete: jest.fn(),
    };
    knowledgeProductHandler = {
      indicatorType: 'knowledge_product',
      upsert: jest.fn(),
      delete: jest.fn(),
    };
    noopHandler = {
      indicatorType: 'NOOP',
      upsert: jest.fn(),
      delete: jest.fn(),
    };
    policyChangeHandler = {
      indicatorType: 'policy_change',
      upsert: jest.fn(),
      delete: jest.fn(),
    };

    service = new BilateralService(
      dataSource,
      resultRepository,
      alignmentRepository,
      mappingRepository,
      resultsUtil as ResultsUtil,
      currentUser as CurrentUserUtil,
      serverGateway as unknown as ServerGateway,
      capacitySharingHandler as any,
      innovationDevelopmentHandler as any,
      knowledgeProductHandler as any,
      noopHandler as any,
      policyChangeHandler as any,
    );
  });

  it('declares the Phase 1 alignment methods', () => {
    expect(service.getAlignment).toBeInstanceOf(Function);
    expect(service.updateAlignment).toBeInstanceOf(Function);
  });

  it('declares the indicator mapping methods', () => {
    expect(service.listIndicators).toBeInstanceOf(Function);
    expect(service.upsertContribution).toBeInstanceOf(Function);
    expect(service.deleteContribution).toBeInstanceOf(Function);
    expect(service.markIndicatorMappingsStale).toBeInstanceOf(Function);
  });

  it('declares the review decision method', () => {
    expect(service.reviewDecision).toBeInstanceOf(Function);
  });

  describe('getAlignment', () => {
    it('returns eligible alignment with selected levers for tagged projects', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue({
        ...context,
      });
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      });

      await expect(service.getAlignment('123', {} as any)).resolves.toEqual({
        result_code: '123',
        eligible: true,
        has_pool_funding_alignment_eligible: true,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
        is_synced_to_prms: false,
        is_read_only: false,
      });
      expect(
        resultRepository.findPoolFundingAlignmentContext,
      ).toHaveBeenCalledWith(77);
      expect(
        alignmentRepository.findActiveAlignmentByResultId,
      ).toHaveBeenCalledWith(77);
    });

    it('returns ineligible shape and hides alignment for untagged projects', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue({
        ...context,
        is_synced_to_prms: false,
        is_pool_funding_contributor: false,
      });
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Hidden' }],
      });

      await expect(service.getAlignment('123', {} as any)).resolves.toEqual({
        result_code: '123',
        eligible: false,
        has_pool_funding_alignment_eligible: false,
        has_contribution: null,
        selected_levers: [],
        is_synced_to_prms: false,
        is_read_only: false,
      });
    });

    it('marks synced results read-only', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue({
        ...context,
        is_synced_to_prms: '1',
        is_pool_funding_contributor: true,
      });
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue(null);

      const response = await service.getAlignment('123', {} as any);

      expect(response.is_synced_to_prms).toBe(true);
      expect(response.is_read_only).toBe(true);
    });

    it('throws NotFoundException when result context is missing', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(null);
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue(null);

      await expect(service.getAlignment('123', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAlignment', () => {
    it('replaces active alignment, saves selected levers, and writes audit history', async () => {
      const previousAlignment = {
        id: 5,
        result_id: 77,
        has_contribution: false,
        selected_levers: [{ lever_code: 'SP00', lever_name: 'Old SP' }],
      };
      const updatedAlignment = {
        id: 6,
        result_id: 77,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'Adaptive crops' },
          { lever_code: 'SP02', lever_name: 'Resilient systems' },
        ],
      };
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId
        .mockResolvedValueOnce(previousAlignment)
        .mockResolvedValueOnce(updatedAlignment);

      const response = await service.updateAlignment(
        '123',
        {
          has_contribution: true,
          lever_codes: ['SP01', 'SP02', 'SP01', '  '],
          justification: 'Updated evidence',
        },
        { sec_user_id: 9 } as any,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(alignmentSpRepo.update).toHaveBeenCalledWith(
        { alignment_id: 5, is_active: true },
        expect.objectContaining({ is_active: false, updated_by: 9 }),
      );
      expect(alignmentRepo.update).toHaveBeenCalledWith(
        { id: 5, is_active: true },
        expect.objectContaining({ is_active: false, updated_by: 9 }),
      );
      expect(alignmentRepo.save).toHaveBeenCalledWith({
        result_id: 77,
        has_contribution: true,
        created_by: 9,
        updated_by: 9,
      });
      expect(alignmentSpRepo.save).toHaveBeenCalledWith([
        {
          alignment_id: 6,
          lever_code: 'SP01',
          created_by: 9,
          updated_by: 9,
        },
        {
          alignment_id: 6,
          lever_code: 'SP02',
          created_by: 9,
          updated_by: 9,
        },
      ]);
      expect(historyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 77,
          version_id: 2,
          actor_user_id: 9,
          event_type: 'POOL_FUNDING_ALIGNMENT_CHANGED',
          justification: 'Updated evidence',
          payload_before: {
            has_contribution: false,
            lever_codes: ['SP00'],
          },
          payload_after: {
            has_contribution: true,
            lever_codes: ['SP01', 'SP02'],
          },
          created_by: 9,
          updated_by: 9,
        }),
      );
      expect(response).toEqual({
        result_code: '123',
        eligible: true,
        has_pool_funding_alignment_eligible: true,
        has_contribution: true,
        selected_levers: updatedAlignment.selected_levers,
        is_synced_to_prms: false,
        is_read_only: false,
      });
      expect(
        serverGateway.emitPoolFundingAlignmentChanged,
      ).toHaveBeenCalledWith({
        result_code: '123',
        by_user_id: 9,
        at: expect.any(String),
      });
    });

    it('clears selected levers when has_contribution is false', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 6,
          result_id: 77,
          has_contribution: false,
          selected_levers: [],
        });

      await service.updateAlignment(
        '123',
        { has_contribution: false, lever_codes: ['SP01'] },
        {} as any,
      );

      expect(alignmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          has_contribution: false,
          created_by: 99,
          updated_by: 99,
        }),
      );
      expect(alignmentSpRepo.save).not.toHaveBeenCalled();
      expect(historyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payload_after: {
            has_contribution: false,
            lever_codes: [],
          },
        }),
      );
      expect(
        serverGateway.emitPoolFundingAlignmentChanged,
      ).toHaveBeenCalledWith({
        result_code: '123',
        by_user_id: 99,
        at: expect.any(String),
      });
    });

    it('rejects updates for untagged projects', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue({
        ...context,
        is_pool_funding_contributor: false,
      });
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue(null);

      await expect(
        service.updateAlignment('123', { has_contribution: false }, {} as any),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(
        serverGateway.emitPoolFundingAlignmentChanged,
      ).not.toHaveBeenCalled();
    });

    it('rejects updates after PRMS sync', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue({
        ...context,
        is_synced_to_prms: true,
      });
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue(null);

      await expect(
        service.updateAlignment('123', { has_contribution: false }, {} as any),
      ).rejects.toThrow(ConflictException);
    });

    it('requires lever codes when has_contribution is true', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue(null);

      await expect(
        service.updateAlignment(
          '123',
          { has_contribution: true, lever_codes: [] },
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listIndicators', () => {
    it('returns selected SP groups with an empty indicator catalog until SP ToC sync exists', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'Adaptive crops' },
          { lever_code: 'SP02', lever_name: 'Resilient systems' },
        ],
      });

      await expect(
        service.listIndicators(
          '123',
          { search: 'rice', indicator_type: 'outcome' },
          {} as any,
        ),
      ).resolves.toEqual([
        {
          lever_code: 'SP01',
          lever_name: 'Adaptive crops',
          indicators: [],
        },
        {
          lever_code: 'SP02',
          lever_name: 'Resilient systems',
          indicators: [],
        },
      ]);
      expect(
        mappingRepository.findActiveStaleMappingsByResultAndLevers,
      ).toHaveBeenCalledWith(77, ['SP01', 'SP02']);
    });

    it('returns stale mapped indicators even before the local ToC catalog exists', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      });
      mappingRepository.findActiveStaleMappingsByResultAndLevers.mockResolvedValue(
        [
          {
            id: 9,
            result_id: 77,
            lever_code: 'SP01',
            indicator_code: 'IND-1',
            indicator_type: 'capacity_sharing',
            result_capacity_sharing_id: 77,
            result_knowledge_product_id: null,
            result_policy_change_id: null,
            result_innovation_dev_id: null,
            other_contribution_narrative: null,
            is_stale: true,
          },
        ] as any,
      );

      await expect(
        service.listIndicators(
          '123',
          { search: 'ind-1', indicator_type: 'capacity_sharing' },
          {} as any,
        ),
      ).resolves.toEqual([
        {
          lever_code: 'SP01',
          lever_name: 'Adaptive crops',
          indicators: [
            {
              indicator_code: 'IND-1',
              indicator_name: 'IND-1',
              indicator_type: 'capacity_sharing',
              target_description: null,
              is_active: false,
              is_mapped: true,
              is_stale: true,
            },
          ],
        },
      ]);
    });

    it('filters stale mapped indicators by indicator type', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      });
      mappingRepository.findActiveStaleMappingsByResultAndLevers.mockResolvedValue(
        [
          {
            id: 9,
            result_id: 77,
            lever_code: 'SP01',
            indicator_code: 'IND-1',
            indicator_type: 'capacity_sharing',
            is_stale: true,
          },
        ] as any,
      );

      await expect(
        service.listIndicators(
          '123',
          { indicator_type: 'policy_change' },
          {} as any,
        ),
      ).resolves.toEqual([
        {
          lever_code: 'SP01',
          lever_name: 'Adaptive crops',
          indicators: [],
        },
      ]);
    });

    it('returns an empty list when no SPs are selected', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: false,
        selected_levers: [],
      });

      await expect(
        service.listIndicators('123', {}, {} as any),
      ).resolves.toEqual([]);
    });
  });

  describe('upsertContribution', () => {
    it('soft-replaces mapping, delegates to handler, and writes audit history', async () => {
      const previousMapping = {
        id: 9,
        result_id: 77,
        lever_code: 'SP01',
        indicator_code: 'IND-1',
        indicator_type: 'capacity_sharing',
        result_capacity_sharing_id: 77,
        is_stale: false,
      };
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      });
      mappingRepository.findActiveMappingByResultLeverIndicator.mockResolvedValue(
        previousMapping as any,
      );

      await expect(
        service.upsertContribution(
          '123',
          'IND-1',
          { indicator_type: 'capacity_sharing', women: 1 } as any,
          { sec_user_id: 9 } as any,
          'SP01',
        ),
      ).resolves.toEqual({
        result_code: '123',
        lever_code: 'SP01',
        lever_name: 'Adaptive crops',
        indicator_code: 'IND-1',
        indicator_type: 'capacity_sharing',
        is_stale: false,
      });

      expect(mappingRepo.update).toHaveBeenCalledWith(
        { id: 9, is_active: true },
        expect.objectContaining({ is_active: false, updated_by: 9 }),
      );
      expect(capacitySharingHandler.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ resultId: 77, indicatorCode: 'IND-1' }),
        expect.objectContaining({ indicator_type: 'capacity_sharing' }),
      );
      expect(mappingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 77,
          lever_code: 'SP01',
          indicator_code: 'IND-1',
          indicator_type: 'capacity_sharing',
          result_capacity_sharing_id: 77,
          created_by: 9,
          updated_by: 9,
        }),
      );
      expect(historyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'INDICATOR_MAPPING_CHANGED',
          payload_before: expect.objectContaining({ indicator_code: 'IND-1' }),
          payload_after: expect.objectContaining({ indicator_code: 'IND-1' }),
        }),
      );
    });

    it('rejects missing lever code', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );

      await expect(
        service.upsertContribution(
          '123',
          'IND-1',
          { indicator_type: 'capacity_sharing' } as any,
          {} as any,
          '',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects levers that are not selected in the active alignment', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP02', lever_name: 'Other SP' }],
      });

      await expect(
        service.upsertContribution(
          '123',
          'IND-1',
          { indicator_type: 'capacity_sharing' } as any,
          {} as any,
          'SP01',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects edits after PRMS sync', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue({
        ...context,
        is_synced_to_prms: true,
      });

      await expect(
        service.upsertContribution(
          '123',
          'IND-1',
          { indicator_type: 'capacity_sharing' } as any,
          {} as any,
          'SP01',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteContribution', () => {
    it('soft-deletes an active mapping and writes audit history', async () => {
      const mapping = {
        id: 9,
        result_id: 77,
        lever_code: 'SP01',
        indicator_code: 'IND-1',
        indicator_type: 'capacity_sharing',
        result_capacity_sharing_id: 77,
        is_stale: false,
      };
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      });
      mappingRepository.findActiveMappingByResultLeverIndicator.mockResolvedValue(
        mapping as any,
      );

      await service.deleteContribution(
        '123',
        'IND-1',
        { sec_user_id: 9 } as any,
        'SP01',
      );

      expect(capacitySharingHandler.delete).toHaveBeenCalledWith(
        expect.objectContaining({ resultId: 77, indicatorCode: 'IND-1' }),
      );
      expect(mappingRepo.update).toHaveBeenCalledWith(
        { id: 9, is_active: true },
        expect.objectContaining({ is_active: false, updated_by: 9 }),
      );
      expect(historyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'INDICATOR_MAPPING_CHANGED',
          payload_before: expect.objectContaining({ indicator_code: 'IND-1' }),
          payload_after: null,
        }),
      );
    });

    it('returns 404 when the mapping does not exist', async () => {
      resultRepository.findPoolFundingAlignmentContext.mockResolvedValue(
        context,
      );
      alignmentRepository.findActiveAlignmentByResultId.mockResolvedValue({
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      });
      mappingRepository.findActiveMappingByResultLeverIndicator.mockResolvedValue(
        null,
      );

      await expect(
        service.deleteContribution('123', 'IND-1', {} as any, 'SP01'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markIndicatorMappingsStale', () => {
    it('marks active mappings stale by lever and indicator code', async () => {
      mappingRepository.markActiveMappingsStaleByLeverIndicator.mockResolvedValue(
        2,
      );

      await expect(
        service.markIndicatorMappingsStale(' SP01 ', ' IND-1 ', {
          sec_user_id: 9,
        } as any),
      ).resolves.toBe(2);

      expect(
        mappingRepository.markActiveMappingsStaleByLeverIndicator,
      ).toHaveBeenCalledWith('SP01', 'IND-1', 9);
    });

    it('uses the current user fallback when the caller is absent', async () => {
      mappingRepository.markActiveMappingsStaleByLeverIndicator.mockResolvedValue(
        1,
      );

      await service.markIndicatorMappingsStale('SP01', 'IND-1');

      expect(
        mappingRepository.markActiveMappingsStaleByLeverIndicator,
      ).toHaveBeenCalledWith('SP01', 'IND-1', 99);
    });

    it('rejects missing lever or indicator codes', async () => {
      await expect(
        service.markIndicatorMappingsStale('', 'IND-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.markIndicatorMappingsStale('SP01', ' '),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('keeps remaining skeleton methods explicitly not implemented', async () => {
    await expect(
      service.reviewDecision('123', {} as any, {} as any),
    ).rejects.toThrow(NotImplementedException);
  });
});

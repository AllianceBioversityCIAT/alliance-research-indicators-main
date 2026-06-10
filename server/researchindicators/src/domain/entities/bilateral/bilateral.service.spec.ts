import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BilateralService } from './bilateral.service';
import { ResultRepository } from '../results/repositories/result.repository';
import { ResultPoolFundingAlignmentRepository } from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingIndicatorMappingRepository } from './repositories/result-pool-funding-indicator-mapping.repository';
import { ServerGateway } from '../../tools/socket/server.gateway';
import { CapacitySharingBilateralIndicatorTypeHandler } from './handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './handlers/knowledge-product.handler';
import { NoopBilateralIndicatorTypeHandler } from './handlers/noop.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from './handlers/policy-change.handler';
import { ClarisaScienceProgramsService } from '../../tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaCgiarEntitiesService } from '../../tools/clarisa/cgiar-entities/clarisa-cgiar-entities.service';
import { PrmsTocService } from '../../tools/prms-toc/prms-toc.service';
import { TocIntegrationService } from '../../tools/toc-integration/toc-integration.service';
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.6 / NFR-BIL-070
//
// Canonical BilateralService spec. Covers:
//   - getAlignment        — happy / eligible-false / not-found
//   - toSelectedSciencePrograms (private)  — via getAlignment enrichment
//   - listIndicators      — empty / stale-mapping grouping / filter
//   - upsertContribution  — happy / unknown indicator type / lever not selected
//   - deleteContribution  — happy / 404 when no previous mapping
//
// The deep scenarios for the SP picker (R-BIL-076 + R-BIL-078) live in the
// focused-scope spec `bilateral.service.getScienceProgramsForResult.spec.ts`
// (T-15.11). PATCH validation lives in `bilateral.service.normalizeLeverCodes
// .spec.ts` (T-15.1). The source-based read-only gate lives in
// `bilateral.service.sourceReadOnlyGate.spec.ts` (T-15.2).

describe('BilateralService — canonical coverage (T-15.6)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const findStaleMappings = jest.fn();
  const findActiveMapping = jest.fn();
  const findAllCatalog = jest.fn();
  const transaction = jest.fn();
  const emit = jest.fn();

  // Mimic TypeORM's actual save: echo back the payload (merged with an id)
  // so `savedMapping` carries the lever_code / indicator_code / indicator_type
  // values the service later reads in `toMappingResponse`.
  const fakeRepo = {
    update: jest.fn(),
    save: jest
      .fn()
      .mockImplementation(async (payload: Record<string, unknown>) => ({
        id: 1,
        ...payload,
      })),
  };
  const fakeManager = {
    getRepository: () => fakeRepo as unknown as Repository<unknown>,
  } as unknown as EntityManager;

  const user: User = { sec_user_id: 42 } as User;

  // Sentinel handler used for upsertContribution happy path — NOOP-style
  // (no FK; narrative goes into `other_contribution_narrative`).
  const noopHandler = {
    indicatorType: 'NOOP',
    validate: jest.fn(),
    upsert: jest.fn().mockResolvedValue({ fkField: null, fkId: 0 }),
    delete: jest.fn(),
  };
  const capacitySharingHandler = {
    indicatorType: 'capacity_sharing',
    validate: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    transaction.mockImplementation(async (cb) => cb(fakeManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralService,
        { provide: DataSource, useValue: { transaction } },
        {
          provide: ResultRepository,
          useValue: { findPoolFundingAlignmentContext: findContext },
        },
        {
          provide: ResultPoolFundingAlignmentRepository,
          useValue: { findActiveAlignmentByResultId: findActiveAlignment },
        },
        {
          provide: ResultPoolFundingIndicatorMappingRepository,
          useValue: {
            findActiveStaleMappingsByResultAndLevers: findStaleMappings,
            findActiveMappingByResultLeverIndicator: findActiveMapping,
          },
        },
        {
          provide: ServerGateway,
          useValue: { emitPoolFundingAlignmentChanged: emit },
        },
        {
          provide: CapacitySharingBilateralIndicatorTypeHandler,
          useValue: capacitySharingHandler,
        },
        {
          provide: InnovationDevelopmentBilateralIndicatorTypeHandler,
          useValue: {
            indicatorType: 'innovation_development',
            upsert: jest.fn(),
            delete: jest.fn(),
            validate: jest.fn(),
          },
        },
        {
          provide: KnowledgeProductBilateralIndicatorTypeHandler,
          useValue: {
            indicatorType: 'knowledge_product',
            upsert: jest.fn(),
            delete: jest.fn(),
            validate: jest.fn(),
          },
        },
        { provide: NoopBilateralIndicatorTypeHandler, useValue: noopHandler },
        {
          provide: PolicyChangeBilateralIndicatorTypeHandler,
          useValue: {
            indicatorType: 'policy_change',
            upsert: jest.fn(),
            delete: jest.fn(),
            validate: jest.fn(),
          },
        },
        {
          provide: ClarisaScienceProgramsService,
          useValue: { findAll: findAllCatalog },
        },
        { provide: ClarisaProjectsService, useValue: {} },
        {
          provide: ClarisaCgiarEntitiesService,
          useValue: { getAreasOfWorkBySp: jest.fn() },
        },
        { provide: PrmsTocService, useValue: {} },
        { provide: TocIntegrationService, useValue: {} },
        { provide: BilateralProjectMappingService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // getAlignment
  // ---------------------------------------------------------------------------
  describe('getAlignment', () => {
    it('returns the full shape with enriched selected_science_programs', async () => {
      findContext.mockResolvedValueOnce({
        result_id: 19792,
        result_official_code: 19792,
        is_pool_funding_contributor: true,
        is_synced_to_prms: false,
        platform_code: 'STAR',
      });
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'SP01' },
          { lever_code: 'SP02', lever_name: 'SP02' },
        ],
      });
      findAllCatalog.mockResolvedValueOnce([
        {
          official_code: 'SP01',
          name: 'Breeding for Tomorrow',
          category: 'Science programs',
          color: '#ef4444',
          icon_key: 'SP01',
        },
        {
          official_code: 'SP02',
          name: 'Sustainable Farming',
          category: 'Science programs',
          color: '#84cc16',
          icon_key: 'SP02',
        },
      ]);

      const out = await service.getAlignment(19792, '19792', user);

      expect(out).toEqual({
        result_code: '19792',
        eligible: true,
        has_pool_funding_alignment_eligible: true,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'SP01' },
          { lever_code: 'SP02', lever_name: 'SP02' },
        ],
        selected_science_programs: [
          {
            code: 'SP01',
            name: 'Breeding for Tomorrow',
            category: 'Science programs',
            color: '#ef4444',
            icon_key: 'SP01',
          },
          {
            code: 'SP02',
            name: 'Sustainable Farming',
            category: 'Science programs',
            color: '#84cc16',
            icon_key: 'SP02',
          },
        ],
        is_synced_to_prms: false,
        is_read_only: false,
      });
    });

    it('hides the alignment payload when the result is not pool-funding-eligible', async () => {
      findContext.mockResolvedValueOnce({
        result_id: 19792,
        result_official_code: 19792,
        is_pool_funding_contributor: false,
        is_synced_to_prms: false,
      });
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });

      const out = await service.getAlignment(19792, '19792', user);

      expect(out.eligible).toBe(false);
      expect(out.has_contribution).toBeNull();
      expect(out.selected_levers).toEqual([]);
      expect(out.selected_science_programs).toEqual([]);
      // findAll on the catalog must NOT be called when there are no codes to enrich.
      expect(findAllCatalog).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the result is missing', async () => {
      findContext.mockResolvedValueOnce(null);
      await expect(
        service.getAlignment(999, '999', user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // listIndicators
  // ---------------------------------------------------------------------------
  describe('listIndicators', () => {
    const baseContext = {
      result_id: 19792,
      result_official_code: 19792,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
    };

    it('returns [] when alignment has no contribution', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: false,
        selected_levers: [],
      });

      const out = await service.listIndicators(19792, '19792', {}, user);
      expect(out).toEqual([]);
      expect(findStaleMappings).not.toHaveBeenCalled();
    });

    it('groups stale mappings by lever_code under each selected lever', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'SP01' },
          { lever_code: 'SP02', lever_name: 'SP02' },
        ],
      });
      findAllCatalog.mockResolvedValueOnce([]);
      findStaleMappings.mockResolvedValueOnce([
        {
          id: 1,
          result_id: 19792,
          lever_code: 'SP01',
          indicator_code: 'IND-A',
          indicator_type: 'output',
          is_stale: true,
        },
        {
          id: 2,
          result_id: 19792,
          lever_code: 'SP02',
          indicator_code: 'IND-B',
          indicator_type: 'outcome',
          is_stale: true,
        },
      ]);

      const out = await service.listIndicators(19792, '19792', {}, user);

      expect(out).toHaveLength(2);
      expect(out[0]).toMatchObject({
        lever_code: 'SP01',
        indicators: [
          expect.objectContaining({ indicator_code: 'IND-A', is_stale: true }),
        ],
      });
      expect(out[1]).toMatchObject({
        lever_code: 'SP02',
        indicators: [expect.objectContaining({ indicator_code: 'IND-B' })],
      });
    });

    it('filters by indicator_type when supplied', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findAllCatalog.mockResolvedValueOnce([]);
      findStaleMappings.mockResolvedValueOnce([
        {
          id: 1,
          result_id: 19792,
          lever_code: 'SP01',
          indicator_code: 'IND-A',
          indicator_type: 'output',
          is_stale: true,
        },
        {
          id: 2,
          result_id: 19792,
          lever_code: 'SP01',
          indicator_code: 'IND-B',
          indicator_type: 'outcome',
          is_stale: true,
        },
      ]);

      const out = await service.listIndicators(
        19792,
        '19792',
        { indicator_type: 'output' },
        user,
      );

      // Only the 'output' indicator survives the filter.
      expect(out[0].indicators.map((i) => i.indicator_code)).toEqual(['IND-A']);
    });
  });

  // ---------------------------------------------------------------------------
  // upsertContribution
  // ---------------------------------------------------------------------------
  describe('upsertContribution', () => {
    const baseContext = {
      result_id: 19792,
      result_official_code: 19792,
      version_id: 1,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
    };

    it('runs the transaction on the happy path', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findActiveMapping.mockResolvedValueOnce(null);

      const out = await service.upsertContribution(
        19792,
        '19792',
        'IND-001',
        { indicator_type: 'NOOP', narrative: 'x' } as never,
        user,
        'SP01',
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(noopHandler.upsert).toHaveBeenCalledTimes(1);
      expect(out).toMatchObject({
        result_code: '19792',
        lever_code: 'SP01',
        indicator_code: 'IND-001',
        indicator_type: 'NOOP',
      });
    });

    it('throws when the indicator_type does not match any registered handler', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });

      await expect(
        service.upsertContribution(
          19792,
          '19792',
          'IND-001',
          { indicator_type: 'NOT_A_REAL_TYPE' } as never,
          user,
          'SP01',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('throws when the lever is not part of the active alignment', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });

      let thrown: HttpException | undefined;
      try {
        await service.upsertContribution(
          19792,
          '19792',
          'IND-001',
          { indicator_type: 'NOOP' } as never,
          user,
          'SP99', // not in selected_levers
        );
      } catch (err) {
        thrown = err as HttpException;
      }

      expect(thrown).toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteContribution
  // ---------------------------------------------------------------------------
  describe('deleteContribution', () => {
    const baseContext = {
      result_id: 19792,
      result_official_code: 19792,
      version_id: 1,
      is_pool_funding_contributor: true,
      is_synced_to_prms: false,
      platform_code: 'STAR',
    };

    it('deletes the previous mapping and runs the transaction', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findActiveMapping.mockResolvedValueOnce({
        id: 7,
        result_id: 19792,
        lever_code: 'SP01',
        indicator_code: 'IND-001',
        indicator_type: 'NOOP',
      });

      await service.deleteContribution(19792, '19792', 'IND-001', user, 'SP01');

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(noopHandler.delete).toHaveBeenCalledTimes(1);
    });

    it('throws 404 when there is no mapping to delete', async () => {
      findContext.mockResolvedValueOnce(baseContext);
      findActiveAlignment.mockResolvedValueOnce({
        id: 1,
        result_id: 19792,
        has_contribution: true,
        selected_levers: [{ lever_code: 'SP01', lever_name: 'SP01' }],
      });
      findActiveMapping.mockResolvedValueOnce(null);

      await expect(
        service.deleteContribution(19792, '19792', 'IND-001', user, 'SP01'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});

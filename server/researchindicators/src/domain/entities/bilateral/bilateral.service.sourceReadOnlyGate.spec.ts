import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, HttpException } from '@nestjs/common';
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
import { UpdatePoolFundingAlignmentDto } from './dto/update-pool-funding-alignment.dto';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.2
//
// Covers the 4 R-BIL-071 scenarios:
//   1. PRMS-sourced result reads as `is_read_only: true`.
//   2. PRMS-sourced result rejects writes for SYSTEM_ADMIN with the
//      locked 409 wording.
//   3. STAR-sourced + synced result still hits the original R-BIL-015
//      "Result is already synced to PRMS" gate (regression check).
//   4. STAR-sourced, non-synced writes are allowed past both gates.
//
// Focused-scope spec — full BilateralService spec lands in T-15.6.

describe('BilateralService source-based read-only gate (T-15.2)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const emit = jest.fn();
  const transaction = jest.fn();

  const baseContext = (overrides: {
    platform_code: string | null;
    is_synced_to_prms?: boolean;
  }) => ({
    result_id: 19792,
    result_official_code: 19792,
    result_status_id: 1,
    version_id: 1,
    is_pool_funding_contributor: true,
    is_synced_to_prms: overrides.is_synced_to_prms ?? false,
    agresso_agreement_id: 'D527',
    platform_code: overrides.platform_code,
  });

  const fakeManager = {
    getRepository: () =>
      ({
        update: jest.fn(),
        save: jest.fn().mockResolvedValue({ id: 1 }),
      }) as unknown as Repository<unknown>,
  } as unknown as EntityManager;

  const systemAdmin: User = {
    sec_user_id: 1,
    // SYSTEM_ADMIN role won't matter — the gate runs server-side before
    // any role check would fire.
  } as User;

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
          useValue: {},
        },
        {
          provide: ServerGateway,
          useValue: { emitPoolFundingAlignmentChanged: emit },
        },
        { provide: CapacitySharingBilateralIndicatorTypeHandler, useValue: {} },
        {
          provide: InnovationDevelopmentBilateralIndicatorTypeHandler,
          useValue: {},
        },
        {
          provide: KnowledgeProductBilateralIndicatorTypeHandler,
          useValue: {},
        },
        { provide: NoopBilateralIndicatorTypeHandler, useValue: {} },
        { provide: PolicyChangeBilateralIndicatorTypeHandler, useValue: {} },
        {
          provide: ClarisaScienceProgramsService,
          useValue: { findAll: jest.fn().mockResolvedValue([]) },
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

    // Short-circuit downstream reads on the write tests so we only assert
    // gate behavior.
    jest.spyOn(service, 'getAlignment').mockResolvedValue({} as never);
    jest.spyOn(service, 'getScienceProgramsForResult').mockResolvedValue({
      result_code: '19792',
      mapping_status: 'mapped',
      clarisa_project: { id: 1, short_name: 'p' },
      science_programs: [
        {
          code: 'SP01',
          name: 'n',
          category: null,
          color: null,
          icon_key: null,
          allocation: 100,
        },
      ],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('R-BIL-071 scenario 1 — PRMS-sourced result reads as is_read_only:true', async () => {
    findContext.mockResolvedValueOnce(
      baseContext({ platform_code: 'PRMS', is_synced_to_prms: false }),
    );
    findActiveAlignment.mockResolvedValueOnce(null);
    // Drop the global spy on getAlignment for this scenario — we want the
    // real implementation here.
    (service.getAlignment as jest.Mock).mockRestore();

    const out = await service.getAlignment(19792, '19792', systemAdmin);

    expect(out.is_read_only).toBe(true);
    expect(out.is_synced_to_prms).toBe(false);
  });

  it('R-BIL-071 scenario 2 — PRMS-sourced result rejects writes for SYSTEM_ADMIN with locked wording', async () => {
    findContext.mockResolvedValueOnce(
      baseContext({ platform_code: 'PRMS', is_synced_to_prms: false }),
    );
    findActiveAlignment.mockResolvedValueOnce(null);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
    };

    let thrown: HttpException | undefined;
    try {
      await service.updateAlignment(19792, '19792', dto, systemAdmin);
    } catch (err) {
      thrown = err as HttpException;
    }

    expect(thrown).toBeInstanceOf(ConflictException);
    expect(thrown!.message).toBe(
      'Result is PRMS-sourced; bilateral alignment is read-only in STAR',
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('R-BIL-071 scenario 3 — STAR-sourced + synced still hits the existing R-BIL-015 gate', async () => {
    findContext.mockResolvedValueOnce(
      baseContext({ platform_code: 'STAR', is_synced_to_prms: true }),
    );
    findActiveAlignment.mockResolvedValueOnce(null);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
    };

    let thrown: HttpException | undefined;
    try {
      await service.updateAlignment(19792, '19792', dto, systemAdmin);
    } catch (err) {
      thrown = err as HttpException;
    }

    expect(thrown).toBeInstanceOf(ConflictException);
    // Regression: the existing wording — not the new T-15.2 wording.
    expect(thrown!.message).toBe('Result is already synced to PRMS');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('R-BIL-071 scenario 4 — STAR-sourced + non-synced writes succeed', async () => {
    findContext.mockResolvedValue(
      baseContext({ platform_code: 'STAR', is_synced_to_prms: false }),
    );
    findActiveAlignment.mockResolvedValue(null);

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, systemAdmin),
    ).resolves.toBeDefined();

    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

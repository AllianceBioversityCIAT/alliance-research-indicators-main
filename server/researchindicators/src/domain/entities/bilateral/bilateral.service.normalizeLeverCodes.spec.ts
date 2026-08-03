import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BilateralService } from './bilateral.service';
import { ResultRepository } from '../results/repositories/result.repository';
import { ResultPoolFundingAlignmentRepository } from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingIndicatorMappingRepository } from './repositories/result-pool-funding-indicator-mapping.repository';
import { ResultPoolFundingTocAlignmentRepository } from './repositories/result-pool-funding-toc-alignment.repository';
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
import { BilateralScienceProgramsResponse } from './dto/bilateral-science-programs.response.dto';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.1
//
// Covers the 4 R-BIL-070 scenarios:
//   1. Code is in the per-result list           → updateAlignment proceeds.
//   2. Code is not in the per-result list       → 400 with structured errors.
//   3. has_contribution = false                 → validation skipped.
//   4. Result is unmapped (empty per-result)    → any non-empty codes reject.
//
// Focused-scope spec — full BilateralService spec lands in T-15.6.

describe('BilateralService.normalizeLeverCodes — PATCH validation (T-15.1)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const emit = jest.fn();
  const transaction = jest.fn();

  const baseContext = {
    result_id: 19792,
    result_official_code: 19792,
    result_status_id: 1,
    version_id: 1,
    is_synced_to_prms: false,
    is_pool_funding_contributor: true,
    agresso_agreement_id: 'D527',
    platform_code: 'STAR',
  };

  const fakeManager = {
    getRepository: () =>
      ({
        update: jest.fn(),
        save: jest.fn().mockResolvedValue({ id: 1 }),
      }) as unknown as Repository<unknown>,
  } as unknown as EntityManager;

  const user: User = { sec_user_id: 42 } as User;

  const mappedSpResponse = (
    codes: string[],
  ): BilateralScienceProgramsResponse => ({
    result_code: '19792',
    mapping_status: 'mapped',
    clarisa_project: { id: 1, short_name: 'T-PJ-003262-...' },
    science_programs: codes.map((code) => ({
      code,
      name: `name-of-${code}`,
      category: 'Science programs',
      color: null,
      icon_key: null,
      allocation: 50,
    })),
  });

  const unmappedSpResponse = (): BilateralScienceProgramsResponse => ({
    result_code: '19792',
    mapping_status: 'unmapped',
    clarisa_project: null,
    science_programs: [],
  });

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
          // T-06 stub — new constructor dependency; legacy-body PATCHes only
          // hit the R-BIL-093 cascade pre-read (no active ToC rows here).
          provide: ResultPoolFundingTocAlignmentRepository,
          useValue: {
            findActiveByResultId: jest.fn().mockResolvedValue([]),
            upsertForSp: jest.fn(),
            deactivateForSps: jest.fn(),
          },
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

    // Short-circuit the getAlignment call at the end of updateAlignment so
    // the happy-path tests don't need to mock the full read chain.
    jest.spyOn(service, 'getAlignment').mockResolvedValue({} as never);
  });

  afterEach(() => jest.clearAllMocks());

  it('R-BIL-070 scenario 1 — code is in the per-result list → updateAlignment proceeds', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    jest
      .spyOn(service, 'getScienceProgramsForResult')
      .mockResolvedValueOnce(mappedSpResponse(['SP09', 'SP10']));

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP09'],
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    expect(service.getScienceProgramsForResult).toHaveBeenCalledWith(
      19792,
      '19792',
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('R-BIL-070 scenario 2 — unknown code → 400 with structured errors.unknown_sp_codes', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    jest
      .spyOn(service, 'getScienceProgramsForResult')
      .mockResolvedValueOnce(mappedSpResponse(['SP09', 'SP10']));

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP09', 'SP99'],
    };

    let thrown: HttpException | undefined;
    try {
      await service.updateAlignment(19792, '19792', dto, user);
    } catch (err) {
      thrown = err as HttpException;
    }

    expect(thrown).toBeInstanceOf(BadRequestException);
    const response = thrown!.getResponse() as {
      message: { description: string; unknown_sp_codes: string[] };
    };
    expect(response.message.description).toBe('Unknown Science Program codes');
    expect(response.message.unknown_sp_codes).toEqual(['SP99']);
    // No alignment row persisted on the rejection path.
    expect(transaction).not.toHaveBeenCalled();
  });

  it('R-BIL-070 scenario 3 — has_contribution=false skips validation', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    const validatorSpy = jest.spyOn(service, 'getScienceProgramsForResult');

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: false,
      sp_codes: ['SP99'],
    };

    await expect(
      service.updateAlignment(19792, '19792', dto, user),
    ).resolves.toBeDefined();

    expect(validatorSpy).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('R-BIL-070 scenario 4 — unmapped result rejects any non-empty sp_codes', async () => {
    findContext.mockResolvedValue(baseContext);
    findActiveAlignment.mockResolvedValue(null);
    jest
      .spyOn(service, 'getScienceProgramsForResult')
      .mockResolvedValueOnce(unmappedSpResponse());

    const dto: UpdatePoolFundingAlignmentDto = {
      has_contribution: true,
      sp_codes: ['SP01'],
    };

    let thrown: HttpException | undefined;
    try {
      await service.updateAlignment(19792, '19792', dto, user);
    } catch (err) {
      thrown = err as HttpException;
    }

    expect(thrown).toBeInstanceOf(BadRequestException);
    const response = thrown!.getResponse() as {
      message: { unknown_sp_codes: string[] };
    };
    expect(response.message.unknown_sp_codes).toEqual(['SP01']);
    expect(transaction).not.toHaveBeenCalled();
  });
});

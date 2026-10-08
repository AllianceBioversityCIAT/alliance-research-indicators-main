import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
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
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { UpdatePoolFundingAlignmentDto } from './dto/update-pool-funding-alignment.dto';

// @sdd-spec docs/specs/bilateral/pool-funding-reporting-year — T-04 / R-PRY-004
//
// Write guard: any Pool Funding PATCH whose result year is not the resolved
// reporting year is 409 pool_funding_year_locked, before contributor / synced
// checks and before the transaction or the socket emit. Source gates stay
// first. The legacy body (no toc_alignments) is locked too.

describe('BilateralService.updateAlignment — reporting-year write guard (T-04)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const emit = jest.fn();
  const transaction = jest.fn();
  const resolveYear = jest.fn();
  const save = jest.fn().mockResolvedValue({ id: 1 });

  const baseContext = (overrides: Partial<Record<string, unknown>> = {}) => ({
    result_id: 19792,
    result_official_code: 19792,
    result_status_id: 1,
    version_id: 1,
    report_year_id: 2026,
    indicator_id: 1,
    is_synced_to_prms: false,
    is_pool_funding_contributor: true,
    agresso_agreement_id: 'D527',
    platform_code: 'STAR',
    ...overrides,
  });

  const legacyBody: UpdatePoolFundingAlignmentDto = {
    has_contribution: true,
    sp_codes: ['SP01'],
    // Present so a guard moved to after the transaction would still reach
    // `save`. The correct guard rejects before Primary resolution uses it.
    primary_sp_code: 'SP01',
  };

  const fakeManager = {
    getRepository: () =>
      ({
        update: jest.fn(),
        save,
      }) as unknown as Repository<unknown>,
  } as unknown as EntityManager;

  const user: User = { sec_user_id: 42 } as User;

  const PRMS_LOCKED =
    'Result is PRMS-sourced; bilateral alignment is read-only in STAR';

  beforeEach(async () => {
    save.mockClear();
    save.mockResolvedValue({ id: 1 });
    resolveYear.mockResolvedValue(2026);
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
        { provide: ReportingYearResolver, useValue: { resolve: resolveYear } },
        {
          provide: TocIntegrationService,
          useValue: { getTocResults: jest.fn() },
        },
        { provide: BilateralProjectMappingService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);

    jest.spyOn(service, 'getScienceProgramsForResult').mockResolvedValue({
      result_code: '19792',
      mapping_status: 'mapped',
      clarisa_project: { id: 1, short_name: 'p' },
      science_programs: ['SP01'].map((code) => ({
        code,
        name: `name-of-${code}`,
        mapping_status: 'Confirmed',
        category: null,
        color: null,
        icon_key: null,
        allocation: 100,
      })),
    });
  });

  afterEach(() => jest.clearAllMocks());

  async function capture(
    run: () => Promise<unknown>,
  ): Promise<HttpException | undefined> {
    try {
      await run();
      return undefined;
    } catch (err) {
      return err as HttpException;
    }
  }

  function yearLock(thrown: HttpException | undefined): {
    code: string;
    description: string;
  } {
    expect(thrown).toBeInstanceOf(ConflictException);
    const response = thrown!.getResponse() as {
      message: { code: string; description: string };
    };
    return response.message;
  }

  it('legacy body on a 2025 result → 409 pool_funding_year_locked, save and socket not called (R-PRY-004)', async () => {
    findContext.mockResolvedValue(baseContext({ report_year_id: 2025 }));
    findActiveAlignment.mockResolvedValue(null);

    const thrown = await capture(() =>
      service.updateAlignment(19792, '19792', legacyBody, user),
    );

    const message = yearLock(thrown);
    expect(message.code).toBe('pool_funding_year_locked');
    expect(message.description).toBe(
      'Pool Funding is read-only: result year 2025 is not the reporting year 2026',
    );
    expect(save).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('2026 result with the same legacy body still writes (R-PRY-004 current year)', async () => {
    findContext.mockResolvedValue(baseContext({ report_year_id: 2026 }));
    findActiveAlignment.mockResolvedValue(null);

    await expect(
      service.updateAlignment(
        19792,
        '19792',
        {
          ...legacyBody,
          primary_sp_code: 'SP01',
        },
        user,
      ),
    ).resolves.toBeDefined();

    expect(save).toHaveBeenCalled();
    expect(emit).toHaveBeenCalled();
  });

  it('PRMS-sourced 2025 result keeps the PRMS 409, not the year code (source gates first)', async () => {
    findContext.mockResolvedValue(
      baseContext({ report_year_id: 2025, platform_code: 'PRMS' }),
    );
    findActiveAlignment.mockResolvedValue(null);

    const thrown = await capture(() =>
      service.updateAlignment(19792, '19792', legacyBody, user),
    );

    expect(thrown).toBeInstanceOf(ConflictException);
    expect(thrown!.message).toBe(PRMS_LOCKED);
    expect(save).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('2025 non-contributor gets the year 409, not the contributor 400', async () => {
    findContext.mockResolvedValue(
      baseContext({
        report_year_id: 2025,
        is_pool_funding_contributor: false,
      }),
    );
    findActiveAlignment.mockResolvedValue(null);

    const thrown = await capture(() =>
      service.updateAlignment(19792, '19792', legacyBody, user),
    );

    expect(thrown).not.toBeInstanceOf(BadRequestException);
    expect(yearLock(thrown).code).toBe('pool_funding_year_locked');
    expect(save).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('2025 synced result gets the year 409, not the already-synced conflict', async () => {
    findContext.mockResolvedValue(
      baseContext({ report_year_id: 2025, is_synced_to_prms: true }),
    );
    findActiveAlignment.mockResolvedValue(null);

    const thrown = await capture(() =>
      service.updateAlignment(19792, '19792', legacyBody, user),
    );

    expect(yearLock(thrown).code).toBe('pool_funding_year_locked');
    expect(thrown!.message).not.toBe('Result is already synced to PRMS');
    expect(save).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('resolver 2027 vs a 2026 result → 409 naming both years', async () => {
    resolveYear.mockResolvedValue(2027);
    findContext.mockResolvedValue(baseContext({ report_year_id: 2026 }));
    findActiveAlignment.mockResolvedValue(null);

    const thrown = await capture(() =>
      service.updateAlignment(19792, '19792', legacyBody, user),
    );

    const message = yearLock(thrown);
    expect(message.code).toBe('pool_funding_year_locked');
    expect(message.description).toBe(
      'Pool Funding is read-only: result year 2026 is not the reporting year 2027',
    );
    expect(save).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});

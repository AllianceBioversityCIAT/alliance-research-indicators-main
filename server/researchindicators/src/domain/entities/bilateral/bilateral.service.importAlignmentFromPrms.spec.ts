import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
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
import { ResultPoolFundingAlignment } from './entities/result-pool-funding-alignment.entity';
import { ResultPoolFundingAlignmentSp } from './entities/result-pool-funding-alignment-sp.entity';
import { ResultReviewHistory } from '../result-review-history/entities/result-review-history.entity';

// The one-off PRMS import (fetch-prms-data-as-star). It writes through the
// same persistAlignment as updateAlignment but runs none of its gates.
describe('BilateralService.importAlignmentFromPrms', () => {
  let service: BilateralService;
  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const emit = jest.fn();
  const getTocResults = jest.fn();
  const findActiveTocRows = jest.fn();
  const upsertForSp = jest.fn();
  const deactivateForSps = jest.fn();
  let writes: Map<unknown, { update: jest.Mock; save: jest.Mock }>;

  const repoFor = (entity: unknown) => {
    if (!writes.has(entity)) {
      writes.set(entity, {
        update: jest.fn(),
        save: jest.fn(async (value: unknown) =>
          Array.isArray(value) ? value : { id: 900, ...(value as object) },
        ),
      });
    }
    return writes.get(entity);
  };

  const transaction = jest.fn(async (work: (m: EntityManager) => unknown) =>
    work({ getRepository: repoFor } as unknown as EntityManager),
  );

  const input = {
    primarySpCode: 'SP06',
    contributingSpCodes: ['SP02'],
    toc: {
      level: 'OUTPUT' as const,
      title: '3.1.1. Institutional innovations and technical practices',
    },
  };

  beforeEach(async () => {
    writes = new Map();
    findActiveAlignment.mockResolvedValue(null);
    findActiveTocRows.mockResolvedValue([]);
    upsertForSp.mockResolvedValue({ id: 1 });
    deactivateForSps.mockResolvedValue(0);
    getTocResults.mockResolvedValue([
      {
        toc_result_id: 7169,
        title: '  3.1.1.  Institutional innovations and technical practices ',
      },
      { toc_result_id: 7188, title: 'Another HLO' },
    ]);

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
        { provide: ResultPoolFundingIndicatorMappingRepository, useValue: {} },
        {
          provide: ResultPoolFundingTocAlignmentRepository,
          useValue: {
            findActiveByResultId: findActiveTocRows,
            upsertForSp,
            deactivateForSps,
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
        { provide: ClarisaScienceProgramsService, useValue: {} },
        { provide: ClarisaProjectsService, useValue: {} },
        { provide: ClarisaCgiarEntitiesService, useValue: {} },
        { provide: PrmsTocService, useValue: {} },
        {
          provide: ReportingYearResolver,
          useValue: { resolve: jest.fn().mockResolvedValue(2026) },
        },
        { provide: TocIntegrationService, useValue: { getTocResults } },
        { provide: BilateralProjectMappingService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);
  });

  afterEach(() => jest.clearAllMocks());

  it('writes the alignment, its SPs and the ToC without running any updateAlignment gate', async () => {
    await service.importAlignmentFromPrms(34105, input, 42);

    // No context read means no source / version / contributor / synced gate.
    expect(findContext).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repoFor(ResultPoolFundingAlignment).save).toHaveBeenCalledWith({
      result_id: 34105,
      has_contribution: true,
      created_by: 42,
      updated_by: 42,
    });
    expect(repoFor(ResultPoolFundingAlignmentSp).save).toHaveBeenCalledWith([
      expect.objectContaining({
        alignment_id: 900,
        sp_code: 'SP06',
        sp_role: 'PRIMARY',
      }),
      expect.objectContaining({
        alignment_id: 900,
        sp_code: 'SP02',
        sp_role: 'CONTRIBUTING',
      }),
    ]);
    expect(getTocResults).toHaveBeenCalledWith('SP06', 'OUTPUT', 2026);
    expect(upsertForSp).toHaveBeenCalledWith(
      {
        result_id: 34105,
        sp_code: 'SP06',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 7169,
        toc_result_title:
          '3.1.1. Institutional innovations and technical practices',
      },
      42,
      expect.anything(),
    );
  });

  it('writes no review-history entry and emits no socket event', async () => {
    await service.importAlignmentFromPrms(34105, input, 42);

    expect(writes.has(ResultReviewHistory)).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it('keeps PRMS title and level with a null id when the catalog has no such title', async () => {
    getTocResults.mockResolvedValue([{ toc_result_id: 7188, title: 'Other' }]);

    await service.importAlignmentFromPrms(34105, input, null);

    expect(upsertForSp).toHaveBeenCalledWith(
      expect.objectContaining({
        toc_result_id: null,
        toc_result_title: input.toc.title,
        level: 'OUTPUT',
      }),
      null,
      expect.anything(),
    );
  });

  it('still writes the ToC when the catalog is down', async () => {
    getTocResults.mockRejectedValue(new Error('lambda-toc 503'));

    await service.importAlignmentFromPrms(34105, input, 42);

    expect(upsertForSp).toHaveBeenCalledWith(
      expect.objectContaining({ toc_result_id: null }),
      42,
      expect.anything(),
    );
  });

  it('replaces a previous alignment, as a re-run of the import does', async () => {
    findActiveAlignment.mockResolvedValue({ id: 55 });
    findActiveTocRows.mockResolvedValue([{ sp_code: 'SP06' }]);

    await service.importAlignmentFromPrms(34105, input, 42);

    expect(repoFor(ResultPoolFundingAlignmentSp).update).toHaveBeenCalledWith(
      { alignment_id: 55, is_active: true },
      expect.objectContaining({ is_active: false, updated_by: 42 }),
    );
    expect(repoFor(ResultPoolFundingAlignment).update).toHaveBeenCalledWith(
      { id: 55, is_active: true },
      expect.objectContaining({ is_active: false, updated_by: 42 }),
    );
    expect(deactivateForSps).not.toHaveBeenCalled();
  });

  it('without a ToC result saves the SPs and drops ToC rows left by an earlier run', async () => {
    findActiveTocRows.mockResolvedValue([{ sp_code: 'SP06' }]);

    await service.importAlignmentFromPrms(34105, { ...input, toc: null }, 42);

    expect(upsertForSp).not.toHaveBeenCalled();
    expect(getTocResults).not.toHaveBeenCalled();
    expect(deactivateForSps).toHaveBeenCalledWith(
      34105,
      ['SP06'],
      42,
      expect.anything(),
    );
    expect(repoFor(ResultPoolFundingAlignmentSp).save).toHaveBeenCalled();
  });

  it('lists the primary SP once even when PRMS repeats it as a contributor', async () => {
    await service.importAlignmentFromPrms(
      34105,
      { ...input, contributingSpCodes: ['SP06', 'SP02', 'SP02'] },
      42,
    );

    const rows = repoFor(ResultPoolFundingAlignmentSp).save.mock.calls[0][0];
    expect(rows.map((row: { sp_code: string }) => row.sp_code)).toEqual([
      'SP06',
      'SP02',
    ]);
  });
});

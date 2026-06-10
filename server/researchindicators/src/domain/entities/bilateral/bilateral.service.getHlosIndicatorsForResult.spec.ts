import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
import { TocResult } from '../../tools/toc-integration/dto/toc-integration.types';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090, R-BIL-091, R-BIL-097
//
// Focused spec for the reshaped BilateralService.getHlosIndicatorsForResult
// (frozen FE envelope, design §5 / §6.1). Minimal coverage for T-03 — the
// exhaustive R-BIL-090/091 AC matrix lands in T-04. Covers:
//
//   1. 404 when the result does not exist
//   2. Unmapped result → 'unmapped', catalogs: [], top-level fields present,
//      zero upstream ToC calls
//   3. Stale CLARISA project → 'unmapped' with the snapshot project ref
//   4. Mapped happy path → one catalogs[] entry per SP × allowed level, wire
//      mapping (aow_code / unit_of_measurement / single 2026 target), empty
//      upstream catalogs keep their level entry, no legacy keys
//   5. allowed_levels: [] (e.g. Knowledge Product) → catalogs: [], zero
//      upstream calls
//   6. version_locked flag off report_year_id vs MAPPABLE_LIVE_VERSION
//
// CLARISA + lambda-toc upstreams are stubbed — we don't go to the wire here.

const sp = (
  id: number,
  smoCode: string,
  portfolio = 'P25',
  status = 'Confirmed',
) => ({
  id: id + 1000,
  project_id: 1,
  program_id: id,
  allocation: 100,
  status,
  global_unit_object: {
    id,
    smo_code: smoCode,
    name: `Program ${smoCode}`,
    level: 1,
    parent_id: null,
    global_unit_type_id: 23,
    cgiar_entity_type_object: {
      code: 23,
      name: 'Science programs',
      prefix: 'SP',
    },
    portfolio_object: { id: 3, acronym: portfolio },
  },
});

const context = (overrides: Record<string, unknown> = {}) => ({
  result_id: 19792,
  result_official_code: 19792,
  report_year_id: 2026,
  indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  agresso_agreement_id: 'D527',
  ...overrides,
});

const tocResult = (
  spCode: string,
  id: number,
  overrides: Partial<TocResult> = {},
): TocResult => ({
  toc_result_id: id,
  toc_internal_id: `internal-${id}`,
  title: `ToC result ${id}`,
  description: `Description ${id}`,
  toc_type_id: 1,
  toc_level_id: 1,
  official_code: spCode,
  work_package_id: 'wp-1',
  wp_short_name: 'AOW01',
  phase: '2026',
  version_id: 'v1',
  indicators: [
    {
      indicator_id: id * 10,
      toc_result_indicator_id: `tri-${id}`,
      related_node_id: `node-${id}`,
      indicator_description: `Indicator for ${id}`,
      unit_messurament: 'Number',
      type_value: 'Custom',
      type_name: 'Custom type',
      location: null,
      targets: [
        { target_value: '5', target_date: '2025' },
        { target_value: '12', target_date: '2026' },
      ],
    },
  ],
  ...overrides,
});

describe('BilateralService.getHlosIndicatorsForResult (T-03)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveByAgreementId = jest.fn();
  const findProjectById = jest.fn();
  const getTocResultsForSps = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralService,
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        {
          provide: ResultRepository,
          useValue: { findPoolFundingAlignmentContext: findContext },
        },
        {
          provide: ResultPoolFundingAlignmentRepository,
          useValue: { findActiveAlignmentByResultId: jest.fn() },
        },
        { provide: ResultPoolFundingIndicatorMappingRepository, useValue: {} },
        { provide: ServerGateway, useValue: {} },
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
          useValue: { findAll: jest.fn() },
        },
        { provide: ClarisaProjectsService, useValue: { findProjectById } },
        {
          provide: ClarisaCgiarEntitiesService,
          useValue: { getAreasOfWorkBySp: jest.fn() },
        },
        { provide: PrmsTocService, useValue: {} },
        { provide: TocIntegrationService, useValue: { getTocResultsForSps } },
        {
          provide: BilateralProjectMappingService,
          useValue: { findActiveByAgreementId },
        },
      ],
    }).compile();

    service = module.get(BilateralService);
  });

  afterEach(() => jest.clearAllMocks());

  it('throws 404 when the result does not exist', async () => {
    findContext.mockResolvedValueOnce(null);
    await expect(
      service.getHlosIndicatorsForResult(999, '999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns "unmapped" with catalogs: [] and all top-level fields when the result has no agreement_id', async () => {
    findContext.mockResolvedValueOnce(context({ agresso_agreement_id: null }));

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out).toEqual({
      result_code: '19792',
      mapping_status: 'unmapped',
      clarisa_project: null,
      result_type: 'capacity_sharing',
      allowed_levels: ['OUTPUT'],
      version_locked: false,
      catalogs: [],
    });
    expect(findActiveByAgreementId).not.toHaveBeenCalled();
    expect(getTocResultsForSps).not.toHaveBeenCalled();
  });

  it('returns "unmapped" with the snapshot project ref when CLARISA no longer exposes the mapped project', async () => {
    findContext.mockResolvedValueOnce(context());
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 999,
      clarisa_project_short_name: 'snapshot',
    });
    findProjectById.mockResolvedValueOnce(null);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('unmapped');
    expect(out.clarisa_project).toEqual({ id: 999, short_name: 'snapshot' });
    expect(out.catalogs).toEqual([]);
    expect(getTocResultsForSps).not.toHaveBeenCalled();
  });

  it('assembles one catalogs[] entry per SP × allowed level with the frozen wire mapping (mapped happy path)', async () => {
    findContext.mockResolvedValueOnce(context());
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 22,
      clarisa_project_short_name: '1414-EC00 DESIRA',
    });
    findProjectById.mockResolvedValueOnce({
      id: 22,
      short_name: '1414-EC00 DESIRA',
      project_mappings_array: [sp(2, 'SP02'), sp(6, 'SP06')],
    });
    getTocResultsForSps.mockResolvedValueOnce(
      new Map([
        ['SP02:OUTPUT', [tocResult('SP02', 1)]],
        // Upstream {"response":[]} — the level entry MUST stay (AC.5).
        ['SP06:OUTPUT', []],
      ]),
    );

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(getTocResultsForSps).toHaveBeenCalledWith(
      ['SP02', 'SP06'],
      ['OUTPUT'],
    );
    expect(out.mapping_status).toBe('mapped');
    expect(out.clarisa_project).toEqual({
      id: 22,
      short_name: '1414-EC00 DESIRA',
    });
    expect(out.catalogs).toEqual([
      {
        sp_code: 'SP02',
        levels: [
          {
            level: 'OUTPUT',
            toc_results: [
              {
                toc_result_id: 1,
                title: 'ToC result 1',
                description: 'Description 1',
                aow_code: 'AOW01', // wp_short_name → aow_code
                indicators: [
                  {
                    indicator_id: 10,
                    indicator_description: 'Indicator for 1',
                    unit_of_measurement: 'Number', // renamed from unit_messurament
                    type_value: 'Custom', // unfiltered passthrough
                    target_value: '12', // single resolved 2026 target
                    target_year: 2026,
                  },
                ],
              },
            ],
          },
        ],
      },
      { sp_code: 'SP06', levels: [{ level: 'OUTPUT', toc_results: [] }] },
    ]);
    // No legacy keys anywhere (R-BIL-090 AC.2) and no raw targets array.
    expect(out).not.toHaveProperty('pairs');
    expect(out).not.toHaveProperty('aow_status');
    expect(
      out.catalogs[0].levels[0].toc_results[0].indicators[0],
    ).not.toHaveProperty('targets');
  });

  it('returns catalogs: [] with ZERO upstream calls when allowed_levels is empty (e.g. Knowledge Product)', async () => {
    findContext.mockResolvedValueOnce(
      context({ indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT }),
    );
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 22,
      clarisa_project_short_name: 'DESIRA',
    });
    findProjectById.mockResolvedValueOnce({
      id: 22,
      short_name: 'DESIRA',
      project_mappings_array: [sp(2, 'SP02')],
    });

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('mapped');
    expect(out.result_type).toBe('knowledge_product');
    expect(out.allowed_levels).toEqual([]);
    expect(out.catalogs).toEqual([]);
    expect(getTocResultsForSps).not.toHaveBeenCalled();
  });

  it('sets version_locked: true when the live version year differs from MAPPABLE_LIVE_VERSION', async () => {
    findContext.mockResolvedValueOnce(
      context({ report_year_id: 2025, agresso_agreement_id: null }),
    );

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.version_locked).toBe(true);
  });
});

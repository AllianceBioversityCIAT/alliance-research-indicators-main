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
import {
  TocIndicatorTarget,
  TocResult,
} from '../../tools/toc-integration/dto/toc-integration.types';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090, R-BIL-091, R-BIL-097
// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090, R-BIL-091, NFR-BIL-091
//
// Per-method spec for the reshaped BilateralService.getHlosIndicatorsForResult
// (frozen FE envelope, design §5 / §6.1 / §11). T-03 landed the base shape
// coverage; T-04 extends it to the full R-BIL-090/091 AC matrix. Covers:
//
//   1. 404 when the result does not exist (R-BIL-090 errors)
//   2. Unmapped result → 'unmapped', catalogs: [], top-level fields present,
//      zero upstream ToC calls (R-BIL-090 AC.4)
//   3. Stale CLARISA project → 'unmapped' with the snapshot project ref
//   4. Mapped happy path → one catalogs[] entry per SP × allowed level, wire
//      mapping (aow_code / unit_of_measurement / single 2026 target), empty
//      upstream catalogs keep their level entry (AC.5), no legacy keys (AC.2)
//   5. Handoff §2 fixture parity → SP01 OUTPUT payload mirrored VERBATIM
//      (toc_result 5187 / indicator 5972, 11-entry targets[]) maps to the
//      handoff §4 wire shape; indicator without a 2026 target resolves to
//      (null, 2026); the raw targets[] never reaches the wire (AC.3)
//   6. Multi-SP × multi-level (Policy Change: SP01+SP03 × OUTCOME+EOI) →
//      one catalogs[] entry per SP, one levels[] entry per allowed level,
//      EOI forces aow_code: null, single batched fan-out with exact args
//      (R-BIL-090 AC.1, R-BIL-091 AC.1, NFR-BIL-091)
//   7. allowed_levels: [] (Knowledge Product) → catalogs: [], ZERO
//      TocIntegrationService calls (R-BIL-091 AC.2)
//   8. version_locked flag off report_year_id vs MAPPABLE_LIVE_VERSION,
//      both branches (R-BIL-097 read flag)
//
// Fixture parity: the `handoffTocResult` builder mirrors the upstream payload
// in the STAR client handoff §2 (backend-handoff.md) — same field names AND
// values (incl. the upstream typo `unit_messurament`, `wp_short_name`,
// `type_value`, per-year 2020–2030 `targets[]`) so these tests and the FE
// Jest fixtures stay contract-identical (D-2 / requirements §11 D-2).
//
// CLARISA + lambda-toc upstreams are stubbed — we don't go to the wire here.
// `TocIntegrationService` is mocked directly: cache/parallelism internals are
// covered by `toc-integration.service.spec.ts`, not re-tested here.

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

// Handoff §2: "targets — per-year, 2020–2030" (11 entries). The 2026 entry
// carries the handoff's verbatim `{ "target_value": "10", "target_date":
// "2026" }`; the other ten years exist solely so AC.3 proves the raw array
// is resolved server-side and never reaches the wire.
const elevenYearTargets = (): TocIndicatorTarget[] =>
  Array.from({ length: 11 }, (_, i) => {
    const year = 2020 + i;
    return {
      target_value: year === 2026 ? '10' : String(i),
      target_date: String(year),
    };
  });

// Upstream payload mirrored VERBATIM from the STAR client handoff §2
// (lambda-toc GET …/category/OUTPUT/initiative/SP01) — fixture parity with
// the FE Jest fixtures. A second indicator without a 2026 target covers the
// `(target_value: null, target_year: 2026)` branch of R-BIL-090 AC.3.
const handoffTocResult = (): TocResult => ({
  toc_result_id: 5187,
  toc_internal_id: '3ca9f07b-…',
  title: 'HLO1.AOW1.IO1 Steer to impact',
  description: 'Market intelligence is packaged into…',
  toc_type_id: null,
  toc_level_id: null,
  official_code: 'SP01',
  work_package_id: 'd65e4401-…',
  wp_short_name: 'AOW01',
  phase: '99134294-…',
  version_id: '7e94b127-…',
  indicators: [
    {
      indicator_id: 5972,
      toc_result_indicator_id: '76f57e62-…',
      related_node_id: '70f1200f-…',
      indicator_description: 'Number of new market intelligence briefs',
      unit_messurament: 'Number',
      type_value: 'Number of knowledge products',
      type_name: 'Number of knowledge products',
      location: 'global',
      targets: elevenYearTargets(),
    },
    {
      // No 2026 entry in targets[] → resolves to (null, 2026).
      indicator_id: 5973,
      toc_result_indicator_id: '76f57e63-…',
      related_node_id: '70f12010-…',
      indicator_description: 'Number of events where Market Intelligence…',
      unit_messurament: 'Number',
      type_value: 'custom',
      type_name: 'custom',
      location: 'global',
      targets: [{ target_value: '5', target_date: '2025' }],
    },
  ],
});

describe('BilateralService.getHlosIndicatorsForResult (T-03/T-04)', () => {
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
    expect(out).not.toHaveProperty('no_aow_mappings');
    expect(
      out.catalogs[0].levels[0].toc_results[0].indicators[0],
    ).not.toHaveProperty('targets');
  });

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090 AC.3 (fixture parity: handoff §2 → §4)
  it('maps the handoff §2 SP01 OUTPUT payload to the handoff §4 wire shape — single 2026 target resolved, null when no 2026 target exists', async () => {
    findContext.mockResolvedValueOnce(context());
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 123,
      clarisa_project_short_name: 'EMBRAPA - …',
    });
    findProjectById.mockResolvedValueOnce({
      id: 123,
      short_name: 'EMBRAPA - …',
      project_mappings_array: [sp(1, 'SP01')],
    });
    getTocResultsForSps.mockResolvedValueOnce(
      new Map([['SP01:OUTPUT', [handoffTocResult()]]]),
    );

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('mapped');
    expect(out.clarisa_project).toEqual({
      id: 123,
      short_name: 'EMBRAPA - …',
    });
    // Deep equality is exhaustive: it also proves the 11-entry targets[]
    // and every other upstream-only field (unit_messurament, type_name,
    // toc_internal_id, …) never reach the wire (R-BIL-090 AC.3).
    expect(out.catalogs).toEqual([
      {
        sp_code: 'SP01',
        levels: [
          {
            level: 'OUTPUT',
            toc_results: [
              {
                toc_result_id: 5187,
                title: 'HLO1.AOW1.IO1 Steer to impact',
                description: 'Market intelligence is packaged into…',
                aow_code: 'AOW01', // wp_short_name → aow_code
                indicators: [
                  {
                    // Handoff §4 wire example, byte-identical.
                    indicator_id: 5972,
                    indicator_description:
                      'Number of new market intelligence briefs',
                    unit_of_measurement: 'Number',
                    type_value: 'Number of knowledge products',
                    target_value: '10', // resolved from the 11-entry targets[]
                    target_year: 2026,
                  },
                  {
                    indicator_id: 5973,
                    indicator_description:
                      'Number of events where Market Intelligence…',
                    unit_of_measurement: 'Number',
                    type_value: 'custom', // unfiltered passthrough (OQ-V2-2)
                    target_value: null, // no 2026 entry upstream
                    target_year: 2026,
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090 AC.1, R-BIL-091 AC.1, NFR-BIL-091
  it('returns one catalogs[] entry per SP and one levels[] entry per allowed level for Policy Change (SP01+SP03 × OUTCOME+EOI) via a single bounded fan-out', async () => {
    findContext.mockResolvedValueOnce(
      context({ indicator_id: IndicatorsEnum.POLICY_CHANGE }),
    );
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 22,
      clarisa_project_short_name: '1414-EC00 DESIRA',
    });
    findProjectById.mockResolvedValueOnce({
      id: 22,
      short_name: '1414-EC00 DESIRA',
      project_mappings_array: [sp(1, 'SP01'), sp(3, 'SP03')],
    });
    getTocResultsForSps.mockResolvedValueOnce(
      new Map([
        ['SP01:OUTCOME', [tocResult('SP01', 11)]],
        // Upstream wp_short_name present — EOI must still force null.
        ['SP01:EOI', [tocResult('SP01', 12)]],
        // Upstream {"response":[]} — the level entry MUST stay (AC.5).
        ['SP03:OUTCOME', []],
        ['SP03:EOI', [tocResult('SP03', 31)]],
      ]),
    );

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    // NFR-BIL-091: exactly ONE batched call carrying exactly (SPs, allowed
    // levels) — upstream fan-out is bounded by |SPs| × |allowed levels|
    // inside TocIntegrationService (parallelism/cache covered by its own
    // spec, not re-tested here).
    expect(getTocResultsForSps).toHaveBeenCalledTimes(1);
    expect(getTocResultsForSps).toHaveBeenCalledWith(
      ['SP01', 'SP03'],
      ['OUTCOME', 'EOI'],
    );

    expect(out.mapping_status).toBe('mapped');
    expect(out.result_type).toBe('policy_change');
    expect(out.allowed_levels).toEqual(['OUTCOME', 'EOI']);
    expect(out.version_locked).toBe(false); // report_year_id 2026 (R-BIL-097 AC.1)

    // One catalogs[] entry per SP, in deterministic SP order (AC.1) …
    expect(out.catalogs.map((c) => c.sp_code)).toEqual(['SP01', 'SP03']);
    // … each with one levels[] entry per allowed level, in rule order
    // (R-BIL-091 AC.1: catalogs for exactly OUTCOME + EOI).
    for (const catalog of out.catalogs) {
      expect(catalog.levels.map((l) => l.level)).toEqual(['OUTCOME', 'EOI']);
    }

    expect(out.catalogs[0].levels[0].toc_results[0].toc_result_id).toBe(11);
    // EOI level forces aow_code: null even when upstream carried a
    // wp_short_name (design §6.1 step 6).
    expect(out.catalogs[0].levels[1].toc_results[0].aow_code).toBeNull();
    // Empty upstream catalog for (SP03, OUTCOME) keeps its level entry with
    // toc_results: [] and the request is still a 200 (R-BIL-090 AC.5).
    expect(out.catalogs[1].levels[0].toc_results).toEqual([]);
    expect(out.catalogs[1].levels[1].toc_results[0].toc_result_id).toBe(31);
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
    // R-BIL-091 AC.2: zero TocIntegrationService calls — getTocResultsForSps
    // is the service's only entry point in this flow.
    expect(getTocResultsForSps).toHaveBeenCalledTimes(0);
  });

  it('sets version_locked: true when the live version year differs from MAPPABLE_LIVE_VERSION', async () => {
    findContext.mockResolvedValueOnce(
      context({ report_year_id: 2025, agresso_agreement_id: null }),
    );

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.version_locked).toBe(true);
  });
});

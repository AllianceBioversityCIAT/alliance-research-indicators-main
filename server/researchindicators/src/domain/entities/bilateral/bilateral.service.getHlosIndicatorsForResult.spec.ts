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
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import { PrmsTocPayload } from '../../tools/prms-toc/dto/prms-toc.types';
import { ClarisaAreaOfWork } from '../../tools/clarisa/cgiar-entities/dto/clarisa-cgiar-entity.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// Focused spec for BilateralService.getHlosIndicatorsForResult. The chain:
//   result → AGRESSO → bilateral_project_mapping → CLARISA project
//          → SP codes (from the project) × AOWs (from the cgiar-entities
//            catalog) → PRMS ToC per pair → keep only populated pairs.
//
// Covers:
//   1. Unmapped result (no agreement_id)              → aow_status: 'unmapped'
//   2. Mapped, no active bilateral_project_mapping    → 'unmapped'
//   3. Mapped project no longer exposed by CLARISA    → 'unmapped'
//   4. Mapped, project carries no Confirmed SP        → 'no_aow_mappings'
//   5. Mapped + SP×catalog AOWs with ToC data         → 'has_aow', pairs populated
//   6. Pairs PRMS has no data for are dropped
//   7. All derived pairs empty in PRMS                → 'no_aow_mappings'
//   8. Non-Confirmed / wrong-portfolio SPs filtered out
//
// CLARISA + PRMS upstreams are stubbed — we don't go to the wire here.

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

const catalog = (
  bySp: Record<string, string[]>,
): Map<string, ClarisaAreaOfWork[]> => {
  const map = new Map<string, ClarisaAreaOfWork[]>();
  for (const [program, aows] of Object.entries(bySp)) {
    map.set(
      program,
      aows.map((code) => ({
        code,
        name: `${code} name`,
        composite_code: `${program}-${code}`,
      })),
    );
  }
  return map;
};

const payload = (program: string, areaOfWork: string): PrmsTocPayload => ({
  compositeCode: `${program}-${areaOfWork}`,
  year: 2025,
  tocResultsOutcomes: [
    {
      toc_result_id: 1,
      category: 'OUTCOME',
      result_title: `Outcome for ${program}-${areaOfWork}`,
      indicators: [{ indicator_id: '1', indicator_description: 'one' }],
    },
  ],
  tocResultsOutputs: [
    {
      toc_result_id: 2,
      category: 'OUTPUT',
      result_title: `Output for ${program}-${areaOfWork}`,
      indicators: [],
    },
  ],
  metadata: { total: 2, outcomes: 1, outputs: 1 },
});

const emptyPayload = (program: string, areaOfWork: string): PrmsTocPayload => ({
  compositeCode: `${program}-${areaOfWork}`,
  tocResultsOutcomes: [],
  tocResultsOutputs: [],
  metadata: { total: 0, outcomes: 0, outputs: 0 },
});

describe('BilateralService.getHlosIndicatorsForResult (T-15.12)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveByAgreementId = jest.fn();
  const findProjectById = jest.fn();
  const getAreasOfWorkBySp = jest.fn();
  const getTocResultsForPairs = jest.fn();

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
          useValue: { getAreasOfWorkBySp },
        },
        { provide: PrmsTocService, useValue: { getTocResultsForPairs } },
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

  it('returns aow_status="unmapped" when the result has no agreement_id', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: null,
    });

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('unmapped');
    expect(out.aow_status).toBe('unmapped');
    expect(out.pairs).toEqual([]);
    expect(out.clarisa_project).toBeNull();
    expect(findActiveByAgreementId).not.toHaveBeenCalled();
    expect(getAreasOfWorkBySp).not.toHaveBeenCalled();
    expect(getTocResultsForPairs).not.toHaveBeenCalled();
  });

  it('returns aow_status="unmapped" when there is no active mapping row', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: 'ZZZ999',
    });
    findActiveByAgreementId.mockResolvedValueOnce(null);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.aow_status).toBe('unmapped');
    expect(out.clarisa_project).toBeNull();
    expect(getTocResultsForPairs).not.toHaveBeenCalled();
  });

  it('returns aow_status="unmapped" when the mapping points at a CLARISA project no longer exposed', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 999,
      clarisa_project_short_name: 'snapshot',
    });
    findProjectById.mockResolvedValueOnce(null);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('unmapped');
    expect(out.aow_status).toBe('unmapped');
    expect(out.clarisa_project).toEqual({ id: 999, short_name: 'snapshot' });
    expect(getTocResultsForPairs).not.toHaveBeenCalled();
  });

  it('returns aow_status="no_aow_mappings" when the project carries no Confirmed SP', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 1,
      clarisa_project_short_name: 'T-PJ-003262',
    });
    findProjectById.mockResolvedValueOnce({
      id: 1,
      short_name: 'T-PJ-003262',
      project_mappings_array: [], // no SP entries
    });
    getAreasOfWorkBySp.mockResolvedValueOnce(new Map());

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('mapped');
    expect(out.aow_status).toBe('no_aow_mappings');
    expect(out.pairs).toEqual([]);
    expect(out.clarisa_project).toEqual({ id: 1, short_name: 'T-PJ-003262' });
    expect(getTocResultsForPairs).not.toHaveBeenCalled();
  });

  it('pairs each project SP with its catalog AOWs and fans out to PRMS once per pair', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 22,
      clarisa_project_short_name: '1414-EC00 DESIRA',
    });
    findProjectById.mockResolvedValueOnce({
      id: 22,
      short_name: '1414-EC00 DESIRA',
      project_mappings_array: [sp(2, 'SP02'), sp(6, 'SP06')],
    });
    getAreasOfWorkBySp.mockResolvedValueOnce(
      catalog({ SP02: ['AOW03'], SP06: ['AOW01'] }),
    );
    getTocResultsForPairs.mockResolvedValueOnce([
      payload('SP02', 'AOW03'),
      payload('SP06', 'AOW01'),
    ]);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(getAreasOfWorkBySp).toHaveBeenCalledWith(['SP02', 'SP06']);
    expect(out.mapping_status).toBe('mapped');
    expect(out.aow_status).toBe('has_aow');
    expect(getTocResultsForPairs).toHaveBeenCalledWith([
      { program: 'SP02', areaOfWork: 'AOW03' },
      { program: 'SP06', areaOfWork: 'AOW01' },
    ]);
    expect(out.pairs).toHaveLength(2);
    expect(out.pairs[0]).toMatchObject({
      program: 'SP02',
      program_name: 'Program SP02', // SP display name from the project
      area_of_work: 'AOW03',
      area_of_work_name: 'AOW03 name', // AOW display name from the catalog
      composite_code: 'SP02-AOW03',
      metadata: { total: 2, outcomes: 1, outputs: 1 },
    });
    expect(out.pairs[0].outcomes).toHaveLength(1);
    expect(out.pairs[0].outputs).toHaveLength(1);
  });

  it('drops pairs PRMS has no ToC data for', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 22,
      clarisa_project_short_name: 'DESIRA',
    });
    findProjectById.mockResolvedValueOnce({
      id: 22,
      short_name: 'DESIRA',
      project_mappings_array: [sp(2, 'SP02')],
    });
    getAreasOfWorkBySp.mockResolvedValueOnce(
      catalog({ SP02: ['AOW01', 'AOW02', 'AOW03'] }),
    );
    getTocResultsForPairs.mockResolvedValueOnce([
      emptyPayload('SP02', 'AOW01'), // 404 → empty → dropped
      emptyPayload('SP02', 'AOW02'), // 404 → empty → dropped
      payload('SP02', 'AOW03'), // populated → kept
    ]);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.aow_status).toBe('has_aow');
    expect(out.pairs.map((p) => p.area_of_work)).toEqual(['AOW03']);
  });

  it('returns aow_status="no_aow_mappings" when PRMS has data for none of the derived pairs', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 22,
      clarisa_project_short_name: 'DESIRA',
    });
    findProjectById.mockResolvedValueOnce({
      id: 22,
      short_name: 'DESIRA',
      project_mappings_array: [sp(2, 'SP02')],
    });
    getAreasOfWorkBySp.mockResolvedValueOnce(catalog({ SP02: ['AOW09'] }));
    getTocResultsForPairs.mockResolvedValueOnce([
      emptyPayload('SP02', 'AOW09'),
    ]);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('mapped');
    expect(out.aow_status).toBe('no_aow_mappings');
    expect(out.pairs).toEqual([]);
  });

  it('filters out non-Confirmed and wrong-portfolio SPs before catalog lookup', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 19792,
      result_official_code: 19792,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 6,
      clarisa_project_short_name: 'L-LTG001',
    });
    findProjectById.mockResolvedValueOnce({
      id: 6,
      short_name: 'L-LTG001',
      project_mappings_array: [
        sp(1, 'SP01'), // Confirmed + P25 → kept
        sp(9, 'SP09', 'P25', 'Pending'), // not Confirmed → dropped
        sp(10, 'SP10', 'P22'), // wrong portfolio → dropped
      ],
    });
    getAreasOfWorkBySp.mockResolvedValueOnce(catalog({ SP01: ['AOW06'] }));
    getTocResultsForPairs.mockResolvedValueOnce([payload('SP01', 'AOW06')]);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(getAreasOfWorkBySp).toHaveBeenCalledWith(['SP01']);
    expect(out.pairs.map((p) => p.program)).toEqual(['SP01']);
    expect(out.pairs.map((p) => p.area_of_work)).toEqual(['AOW06']);
  });
});

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
import { PrmsTocService } from '../../tools/prms-toc/prms-toc.service';
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import { PrmsTocPayload } from '../../tools/prms-toc/dto/prms-toc.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// Focused spec for BilateralService.getHlosIndicatorsForResult. Covers:
//   1. Unmapped result (no agreement_id)        → aow_status: 'unmapped'
//   2. Mapped, but no active bilateral_project_mapping → 'unmapped'
//   3. Mapped, CLARISA project has only SP-level mappings → 'no_aow_mappings'
//   4. Mapped + AOWs present                    → 'has_aow', pairs ordered + populated
//   5. AOW with parent_id pointing outside the project mappings → skipped
//   6. Non-Confirmed AOW + wrong-portfolio AOW  → filtered out
//
// The PRMS upstream is stubbed via PrmsTocService — we don't go to the wire here.

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
    name: smoCode,
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

const aow = (
  id: number,
  smoCode: string,
  parentId: number,
  portfolio = 'P25',
  status = 'Confirmed',
) => ({
  id: id + 5000,
  project_id: 1,
  program_id: id,
  allocation: 100,
  status,
  global_unit_object: {
    id,
    smo_code: smoCode,
    name: smoCode,
    level: 2,
    parent_id: parentId,
    global_unit_type_id: 26,
    cgiar_entity_type_object: {
      code: 26,
      name: 'Key Area of Work',
      prefix: 'AOW',
    },
    portfolio_object: { id: 3, acronym: portfolio },
  },
});

const payload = (program: string, areaOfWork: string): PrmsTocPayload => ({
  compositeCode: `${program}-${areaOfWork}`,
  year: 2025,
  tocResultsOutcomes: [
    {
      toc_result_id: 1,
      category: 'OUTCOME',
      result_title: `Outcome for ${program}-${areaOfWork}`,
      indicators: [
        {
          indicator_id: '1',
          indicator_description: 'one',
        },
      ],
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

describe('BilateralService.getHlosIndicatorsForResult (T-15.12)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveByAgreementId = jest.fn();
  const findProjectById = jest.fn();
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
        {
          provide: ClarisaProjectsService,
          useValue: { findProjectById },
        },
        {
          provide: PrmsTocService,
          useValue: { getTocResultsForPairs },
        },
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

  it('returns aow_status="no_aow_mappings" when the CLARISA project carries only SP-level entries', async () => {
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
      project_mappings_array: [sp(275, 'SP09'), sp(276, 'SP10')],
    });

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('mapped');
    expect(out.aow_status).toBe('no_aow_mappings');
    expect(out.pairs).toEqual([]);
    expect(out.clarisa_project).toEqual({ id: 1, short_name: 'T-PJ-003262' });
    expect(getTocResultsForPairs).not.toHaveBeenCalled();
  });

  it('derives (parent_SP, AOW) pairs and fans out to PRMS once per pair', async () => {
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
        sp(267, 'SP01'),
        sp(275, 'SP09'),
        aow(412, 'AOW06', 267), // → (SP01, AOW06)
        aow(420, 'AOW01', 275), // → (SP09, AOW01)
      ],
    });
    getTocResultsForPairs.mockResolvedValueOnce([
      payload('SP01', 'AOW06'),
      payload('SP09', 'AOW01'),
    ]);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.mapping_status).toBe('mapped');
    expect(out.aow_status).toBe('has_aow');
    expect(getTocResultsForPairs).toHaveBeenCalledWith([
      { program: 'SP01', areaOfWork: 'AOW06' },
      { program: 'SP09', areaOfWork: 'AOW01' },
    ]);
    expect(out.pairs).toHaveLength(2);
    expect(out.pairs[0]).toMatchObject({
      program: 'SP01',
      area_of_work: 'AOW06',
      composite_code: 'SP01-AOW06',
      metadata: { total: 2, outcomes: 1, outputs: 1 },
    });
    expect(out.pairs[0].outcomes).toHaveLength(1);
    expect(out.pairs[0].outputs).toHaveLength(1);
  });

  it('skips AOWs whose parent_id does not match any SP in the same project', async () => {
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
        sp(267, 'SP01'),
        aow(412, 'AOW06', 267), // parent SP01 present → kept
        aow(421, 'AOW99', 9999), // parent missing → dropped
      ],
    });
    getTocResultsForPairs.mockResolvedValueOnce([payload('SP01', 'AOW06')]);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(getTocResultsForPairs).toHaveBeenCalledWith([
      { program: 'SP01', areaOfWork: 'AOW06' },
    ]);
    expect(out.pairs.map((p) => p.area_of_work)).toEqual(['AOW06']);
  });

  it('filters out non-Confirmed AOWs and wrong-portfolio AOWs', async () => {
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
        sp(267, 'SP01'),
        aow(412, 'AOW06', 267), // Confirmed + P25 → kept
        aow(413, 'AOW07', 267, 'P25', 'Pending'), // not Confirmed → dropped
        aow(414, 'AOW08', 267, 'P22'), // wrong portfolio → dropped
      ],
    });
    getTocResultsForPairs.mockResolvedValueOnce([payload('SP01', 'AOW06')]);

    const out = await service.getHlosIndicatorsForResult(19792, '19792');

    expect(out.pairs.map((p) => p.area_of_work)).toEqual(['AOW06']);
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
});

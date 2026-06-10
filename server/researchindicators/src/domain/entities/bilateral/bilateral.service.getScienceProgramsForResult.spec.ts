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

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.11
//
// Covers R-BIL-076 scenarios (mapped happy / unmapped / multi-portfolio
// filter / non-Confirmed filter) + R-BIL-078 (result→project resolution
// via mapping table) for BilateralService.getScienceProgramsForResult.
//
// This is a focused-scope spec for T-15.11. The full BilateralService
// spec (covering getAlignment / updateAlignment / etc.) lands in T-15.6.

describe('BilateralService.getScienceProgramsForResult (T-15.11)', () => {
  let service: BilateralService;

  const findContext = jest.fn();
  const findActiveByAgreementId = jest.fn();
  const findProjectById = jest.fn();
  const findAllCatalog = jest.fn();

  const baseProjectMapping = (
    smoCode: string,
    allocation = 50,
    portfolio = 'P25',
    status = 'Confirmed',
  ) => ({
    id: smoCode.charCodeAt(2),
    project_id: 1,
    program_id: 100 + smoCode.charCodeAt(2),
    allocation,
    status,
    global_unit_object: {
      id: 200 + smoCode.charCodeAt(2),
      smo_code: smoCode,
      name: `name-of-${smoCode}`,
      cgiar_entity_type_object: { code: 22, name: 'Science programs' },
      portfolio_object: { id: 3, acronym: portfolio },
    },
  });

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
          useValue: {
            findActiveAlignmentByResultId: jest.fn(),
          },
        },
        {
          provide: ResultPoolFundingIndicatorMappingRepository,
          useValue: {},
        },
        { provide: ServerGateway, useValue: { emit: jest.fn() } },
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
          useValue: { findAll: findAllCatalog },
        },
        {
          provide: ClarisaProjectsService,
          useValue: { findProjectById },
        },
        {
          provide: ClarisaCgiarEntitiesService,
          useValue: { getAreasOfWorkBySp: jest.fn() },
        },
        {
          provide: BilateralProjectMappingService,
          useValue: { findActiveByAgreementId },
        },
        { provide: PrmsTocService, useValue: {} },
        { provide: TocIntegrationService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);

    findAllCatalog.mockResolvedValue([
      {
        official_code: 'SP09',
        name: 'Scaling for Impact',
        category: 'Scaling programs',
        color: '#ec4899',
      },
      {
        official_code: 'SP10',
        name: 'Gender Equality and Inclusion',
        category: 'Accelerators',
        color: '#8b5cf6',
      },
    ]);
  });

  afterEach(() => jest.clearAllMocks());

  it('404s when the result does not exist', async () => {
    findContext.mockResolvedValueOnce(null);
    await expect(
      service.getScienceProgramsForResult(999, '999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns mapping_status="unmapped" when the result has no AGRESSO contract', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 1,
      result_official_code: 1001,
      agresso_agreement_id: null,
    });

    const out = await service.getScienceProgramsForResult(1, '1001');

    expect(out.mapping_status).toBe('unmapped');
    expect(out.science_programs).toEqual([]);
    expect(out.clarisa_project).toBeNull();
    expect(findActiveByAgreementId).not.toHaveBeenCalled();
  });

  it('returns mapping_status="unmapped" when no active bilateral_project_mapping exists', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 1,
      result_official_code: 1001,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce(null);

    const out = await service.getScienceProgramsForResult(1, '1001');

    expect(findActiveByAgreementId).toHaveBeenCalledWith('D527');
    expect(out.mapping_status).toBe('unmapped');
    expect(out.science_programs).toEqual([]);
    expect(findProjectById).not.toHaveBeenCalled();
  });

  it('returns mapping_status="unmapped" when mapping points at a project CLARISA no longer exposes', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 1,
      result_official_code: 1001,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 999,
      clarisa_project_short_name: 'snapshot-name',
    });
    findProjectById.mockResolvedValueOnce(null);

    const out = await service.getScienceProgramsForResult(1, '1001');

    expect(out.mapping_status).toBe('unmapped');
    expect(out.clarisa_project).toEqual({
      id: 999,
      short_name: 'snapshot-name',
    });
    expect(out.science_programs).toEqual([]);
  });

  it('returns the mapped project SPs filtered to Confirmed + P25, enriched from local catalog', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 1,
      result_official_code: 1001,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 1,
      clarisa_project_short_name: 'T-PJ-003262-...',
    });
    findProjectById.mockResolvedValueOnce({
      id: 1,
      short_name: 'T-PJ-003262-...',
      project_mappings_array: [
        baseProjectMapping('SP09', 25),
        baseProjectMapping('SP10', 75),
      ],
    });

    const out = await service.getScienceProgramsForResult(1, '1001');

    expect(out.mapping_status).toBe('mapped');
    expect(out.clarisa_project).toEqual({
      id: 1,
      short_name: 'T-PJ-003262-...',
    });
    expect(out.science_programs).toEqual([
      {
        code: 'SP09',
        name: 'name-of-SP09',
        category: 'Science programs',
        color: '#ec4899',
        icon_key: null, // T-15.4 hasn't landed yet
        allocation: 25,
      },
      {
        code: 'SP10',
        name: 'name-of-SP10',
        category: 'Science programs',
        color: '#8b5cf6',
        icon_key: null,
        allocation: 75,
      },
    ]);
  });

  it('excludes non-Confirmed mappings (R-BIL-076 scenario 4)', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 1,
      result_official_code: 1001,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 1,
      clarisa_project_short_name: 'p',
    });
    findProjectById.mockResolvedValueOnce({
      id: 1,
      short_name: 'p',
      project_mappings_array: [
        baseProjectMapping('SP09', 50, 'P25', 'Pending'),
        baseProjectMapping('SP10', 50, 'P25', 'Confirmed'),
      ],
    });

    const out = await service.getScienceProgramsForResult(1, '1001');

    expect(out.science_programs.map((p) => p.code)).toEqual(['SP10']);
  });

  it('excludes mappings outside the active portfolio (R-BIL-076 scenario 3)', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 1,
      result_official_code: 1001,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 1,
      clarisa_project_short_name: 'p',
    });
    findProjectById.mockResolvedValueOnce({
      id: 1,
      short_name: 'p',
      project_mappings_array: [
        baseProjectMapping('SP09', 50, 'P22', 'Confirmed'),
        baseProjectMapping('SP10', 50, 'P25', 'Confirmed'),
      ],
    });

    const out = await service.getScienceProgramsForResult(1, '1001');

    expect(out.science_programs.map((p) => p.code)).toEqual(['SP10']);
  });

  it('sorts science_programs by code so the FE picker is deterministic', async () => {
    findContext.mockResolvedValueOnce({
      result_id: 1,
      result_official_code: 1001,
      agresso_agreement_id: 'D527',
    });
    findActiveByAgreementId.mockResolvedValueOnce({
      clarisa_project_id: 1,
      clarisa_project_short_name: 'p',
    });
    findProjectById.mockResolvedValueOnce({
      id: 1,
      short_name: 'p',
      project_mappings_array: [
        baseProjectMapping('SP10', 50, 'P25', 'Confirmed'),
        baseProjectMapping('SP01', 50, 'P25', 'Confirmed'),
        baseProjectMapping('SP09', 50, 'P25', 'Confirmed'),
      ],
    });

    const out = await service.getScienceProgramsForResult(1, '1001');

    expect(out.science_programs.map((p) => p.code)).toEqual([
      'SP01',
      'SP09',
      'SP10',
    ]);
  });
});

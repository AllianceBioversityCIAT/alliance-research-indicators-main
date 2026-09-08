import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BilateralMappingCoverageService } from './bilateral-mapping-coverage.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';

// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-04 / R-CPA-004 / R-CPA-005
//
// Invariant, tier ordering, collision handling, absence guard, determinism,
// and single-query / no-write verification.

describe('BilateralMappingCoverageService', () => {
  let service: BilateralMappingCoverageService;
  let mockClarisaProjectsService: {
    listProjectsForCoverage: jest.Mock;
  };
  let mockAgressoRepo: {
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    insert: jest.Mock;
    remove: jest.Mock;
  };
  let mockDataSource: {
    getRepository: jest.Mock;
  };

  const makeContractQb = (contracts: Partial<AgressoContract>[] = []) => {
    const qb: Record<string, jest.Mock> = {};
    qb.select = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue(contracts);
    return qb;
  };

  beforeEach(async () => {
    mockClarisaProjectsService = {
      listProjectsForCoverage: jest.fn(),
    };

    mockAgressoRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeContractQb()),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
      remove: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockAgressoRepo),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralMappingCoverageService,
        {
          provide: ClarisaProjectsService,
          useValue: mockClarisaProjectsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get(BilateralMappingCoverageService);
    process.env.ARI_CLARISA_HOST = 'https://clarisatest-back.ciat.cgiar.org/';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tier classification & 4-tier fixture (R-CPA-004 AC.1 - AC.3)', () => {
    it('classifies exactly 1 contract in each of EXACT_CODE, NORMALIZED_CODE, FULL_NAME, UNRESOLVED with accurate percentages', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 101,
          short_name: 'P-101',
          external_code: 'A100',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Project One',
          source_of_funding: 'Bilateral',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
        {
          id: 102,
          short_name: 'P-102',
          external_code: 'C-A200',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Project Two',
          source_of_funding: 'Bilateral',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
        {
          id: 103,
          short_name: 'P-103',
          external_code: 'B-A300',
          source_center_acronym: 'BIOVERSITY',
          phase: 2026,
          full_name: 'Special Project Three Name',
          source_of_funding: 'window3',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
        {
          id: 104,
          short_name: 'P-104',
          external_code: 'C-A400',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Project Four',
          source_of_funding: 'BILATERAL',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
      ];

      const contracts: Partial<AgressoContract>[] = [
        {
          agreement_id: 'A100',
          funding_type: 'BILATERAL',
          short_title: 'Contract 1',
          description: 'Desc 1',
        },
        {
          agreement_id: 'A200',
          funding_type: 'BLR',
          short_title: 'Contract 2',
          description: 'Desc 2',
        },
        {
          agreement_id: 'NON_MATCHING_CODE_999',
          funding_type: 'BILATERAL',
          short_title: 'Special Project Three Name',
          description: 'Desc 3',
        },
        {
          agreement_id: 'COMPLETELY_UNRESOLVED',
          funding_type: 'BLR',
          short_title: 'Different Title',
          description: 'Different Desc',
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb(contracts),
      );

      const report = await service.getCoverageReport();

      expect(report.environment.upstream_contract_available).toBe(true);
      expect(report.environment.clarisa_host).toBe(
        'https://clarisatest-back.ciat.cgiar.org/',
      );
      expect(report.phase_used).toBe(2026);
      expect(report.agresso?.bilateral_contract_total).toBe(4);

      // Invariant & AC.1: Exactly 1 in each of the 4 resolvable tiers, 0 in AMBIGUOUS
      expect(report.resolution?.EXACT_CODE).toEqual({
        count: 1,
        percentage: 25,
        numerator: 1,
        denominator: 4,
      });
      expect(report.resolution?.NORMALIZED_CODE).toEqual({
        count: 1,
        percentage: 25,
        numerator: 1,
        denominator: 4,
      });
      expect(report.resolution?.FULL_NAME).toEqual({
        count: 1,
        percentage: 25,
        numerator: 1,
        denominator: 4,
      });
      expect(report.resolution?.UNRESOLVED).toEqual({
        count: 1,
        percentage: 25,
        numerator: 1,
        denominator: 4,
      });
      expect(report.resolution?.AMBIGUOUS).toEqual({
        count: 0,
        percentage: 0,
        numerator: 0,
        denominator: 4,
      });

      // Sum invariant (AC.3)
      const sum =
        (report.resolution?.EXACT_CODE.count ?? 0) +
        (report.resolution?.NORMALIZED_CODE.count ?? 0) +
        (report.resolution?.FULL_NAME.count ?? 0) +
        (report.resolution?.AMBIGUOUS.count ?? 0) +
        (report.resolution?.UNRESOLVED.count ?? 0);
      expect(sum).toBe(4);

      // Verify samples
      expect(report.samples?.EXACT_CODE).toEqual([
        {
          agreement_id: 'A100',
          clarisa_project_id: 101,
          matched_on: 'A100',
        },
      ]);
      expect(report.samples?.NORMALIZED_CODE).toEqual([
        {
          agreement_id: 'A200',
          clarisa_project_id: 102,
          matched_on: 'A200',
        },
      ]);
      expect(report.samples?.FULL_NAME).toEqual([
        {
          agreement_id: 'NON_MATCHING_CODE_999',
          clarisa_project_id: 103,
          matched_on: 'Special Project Three Name',
        },
      ]);
      expect(report.samples?.UNRESOLVED).toEqual([
        {
          agreement_id: 'COMPLETELY_UNRESOLVED',
          clarisa_project_id: null,
          matched_on: null,
        },
      ]);
      expect(report.samples?.AMBIGUOUS).toEqual([]);
    });
  });

  describe('First-hit-wins & dual-match contract (R-CPA-004 scenario)', () => {
    it('lands in EXACT_CODE only and is NOT counted in NORMALIZED_CODE when matching both', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 101,
          short_name: 'P-101',
          source_of_funding: 'Bilateral',
          external_code: 'A132',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Project X',
        },
        {
          id: 102,
          short_name: 'P-102',
          source_of_funding: 'Bilateral',
          external_code: 'C-A132',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Project Y',
        },
      ];

      const contracts: Partial<AgressoContract>[] = [
        {
          agreement_id: 'A132',
          funding_type: 'BILATERAL',
          short_title: 'Contract A132',
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb(contracts),
      );

      const report = await service.getCoverageReport();

      expect(report.resolution?.EXACT_CODE.count).toBe(1);
      expect(report.resolution?.NORMALIZED_CODE.count).toBe(0);
      expect(report.resolution?.AMBIGUOUS.count).toBe(0);
      expect(report.resolution?.UNRESOLVED.count).toBe(0);
      expect(report.samples?.EXACT_CODE[0]).toEqual({
        agreement_id: 'A132',
        clarisa_project_id: 101,
        matched_on: 'A132',
      });
      expect(report.samples?.NORMALIZED_CODE).toHaveLength(0);
    });
  });

  describe('Collision & ambiguity handling (R-CPA-003 scenario)', () => {
    it('classifies contract matching collided normalized code as AMBIGUOUS', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 501,
          short_name: 'P-501',
          source_of_funding: 'Bilateral',
          external_code: 'C-A500',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Project 501',
        },
        {
          id: 502,
          short_name: 'P-502',
          source_of_funding: 'Bilateral',
          external_code: 'A500',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Project 502',
        },
      ];

      // Contract B-A500 has no exact match in exactMap (which has C-A500 and A500),
      // normalizes to A500, which has collided in sliceProjects (501 & 502).
      const contracts: Partial<AgressoContract>[] = [
        {
          agreement_id: 'B-A500',
          funding_type: 'BILATERAL',
        },
        {
          agreement_id: 'A500',
          funding_type: 'BILATERAL',
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb(contracts),
      );

      const report = await service.getCoverageReport();

      // B-A500 -> AMBIGUOUS; A500 -> EXACT_CODE (against 502)
      expect(report.resolution?.EXACT_CODE.count).toBe(1);
      expect(report.resolution?.AMBIGUOUS.count).toBe(1);
      expect(report.resolution?.NORMALIZED_CODE.count).toBe(0);
      expect(report.normalization?.collision_count).toBe(1);
      expect(report.normalization?.collisions[0].normalizedCode).toBe('A500');
      expect(report.samples?.AMBIGUOUS[0]).toEqual({
        agreement_id: 'B-A500',
        clarisa_project_id: null,
        matched_on: 'A500',
      });
    });

    it('classifies contract as AMBIGUOUS when multiple projects share the same full_name', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 601,
          short_name: 'P-601',
          source_of_funding: 'Bilateral',
          external_code: 'C-X1',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Shared Title Across Projects',
        },
        {
          id: 602,
          short_name: 'P-602',
          source_of_funding: 'Bilateral',
          external_code: 'C-X2',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Shared Title Across Projects',
        },
      ];

      const contracts: Partial<AgressoContract>[] = [
        {
          agreement_id: 'NO_CODE_MATCH',
          funding_type: 'BILATERAL',
          short_title: 'Shared Title Across Projects',
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb(contracts),
      );

      const report = await service.getCoverageReport();

      expect(report.resolution?.FULL_NAME.count).toBe(0);
      expect(report.resolution?.AMBIGUOUS.count).toBe(1);
      expect(report.samples?.AMBIGUOUS[0].agreement_id).toBe('NO_CODE_MATCH');
    });
  });

  describe('Sum invariant assertion (DD-6)', () => {
    // The DD-6 invariant is unreachable through the public API because classification is total (every
    // contract lands in exactly one tier, UNRESOLVED being the catch-all). It is a defensive guard
    // against a future regression in the classifier, not a reachable branch. The sum equality it
    // protects is asserted positively by the tier tests, which satisfy R-CPA-004 AC.3.
    it('passes when tier sum equals total contracts', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-1',
          source_of_funding: 'Bilateral',
          external_code: 'A1',
          source_center_acronym: 'CIAT',
          phase: 2026,
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });
      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb([
          { agreement_id: 'A1', funding_type: 'BILATERAL' },
          { agreement_id: 'A2', funding_type: 'BILATERAL' },
        ]),
      );

      const report = await service.getCoverageReport();
      expect(report.agresso?.bilateral_contract_total).toBe(2);
      const sum =
        (report.resolution?.EXACT_CODE.count ?? 0) +
        (report.resolution?.NORMALIZED_CODE.count ?? 0) +
        (report.resolution?.FULL_NAME.count ?? 0) +
        (report.resolution?.AMBIGUOUS.count ?? 0) +
        (report.resolution?.UNRESOLVED.count ?? 0);
      expect(sum).toBe(2);
    });
  });

  describe('Determinism (NFR-CPA-001)', () => {
    it('produces deep-equal resolution results when run twice against one shared fixture', async () => {
      const fixedSlice: ClarisaProject[] = [
        {
          id: 101,
          short_name: 'P-101',
          source_of_funding: 'Bilateral',
          external_code: 'C-A100',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Determinism Project 1',
        },
        {
          id: 102,
          short_name: 'P-102',
          source_of_funding: 'Bilateral',
          external_code: 'B-A200',
          source_center_acronym: 'BIOVERSITY',
          phase: 2026,
          full_name: 'Determinism Project 2',
        },
      ];

      const fixedContracts: Partial<AgressoContract>[] = [
        { agreement_id: 'A100', funding_type: 'BILATERAL' },
        { agreement_id: 'A200', funding_type: 'BLR' },
        { agreement_id: 'UNMATCHED', funding_type: 'BILATERAL' },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValue({
        all: fixedSlice,
        slice: fixedSlice,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValue(
        makeContractQb(fixedContracts),
      );

      const report1 = await service.getCoverageReport(2026);
      const report2 = await service.getCoverageReport(2026);

      expect(report1.resolution).toEqual(report2.resolution);
      expect(report1.normalization).toEqual(report2.normalization);
      expect(report1.clarisa).toEqual(report2.clarisa);
      expect(report1.agresso).toEqual(report2.agresso);
    });
  });

  describe('Absence path (R-CPA-005 AC.1 - AC.5)', () => {
    it('nulls agresso, resolution, normalization, and samples when external_code is absent in all projects', async () => {
      const allProjectsWithoutExternalCode: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-1',
          source_center_acronym: 'CIAT',
          phase: 2026,
          full_name: 'Prod Project 1',
          source_of_funding: 'bilateral',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
        {
          id: 2,
          short_name: 'P-2',
          source_center_acronym: 'BIOVERSITY',
          phase: 2026,
          full_name: 'Prod Project 2',
          source_of_funding: 'window3',
          lead_institution_object: {
            id: 50,
            acronym: 'XYZ',
            name: 'Other',
          },
        },
        {
          id: 3,
          short_name: 'P-3',
          source_center_acronym: 'OTHER_CENTER',
          phase: 2025,
          full_name: 'Legacy Project 3',
          source_of_funding: 'bilateral',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
      ];

      const sliceProjects = allProjectsWithoutExternalCode.slice(0, 2);

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: allProjectsWithoutExternalCode,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      const report = await service.getCoverageReport();

      // AC.2: upstream_contract_available is false and host is named
      expect(report.environment.upstream_contract_available).toBe(false);
      expect(report.environment.clarisa_host).toBe(
        'https://clarisatest-back.ciat.cgiar.org/',
      );

      // AC.1 & AC.4: resolution, agresso, normalization, samples are strictly null (not 0 or [])
      expect(report.agresso).toBeNull();
      expect(report.resolution).toBeNull();
      expect(report.normalization).toBeNull();
      expect(report.samples).toBeNull();
      expect(JSON.stringify(report)).not.toContain('percentage');

      // AC.5: clarisa block is still populated
      expect(report.clarisa.slice_size).toBe(2);
      expect(report.clarisa.source_center_acronym).toEqual({
        CIAT: 1,
        BIOVERSITY: 1,
      });
      expect(report.clarisa.source_of_funding).toEqual({
        BILATERAL: 1,
        WINDOW3: 1,
      });
      expect(report.clarisa.external_code_populated).toEqual({
        populated: 0,
        empty: 2,
      });
      expect(report.clarisa.alliance_selector_agreement).toEqual({
        both_selectors: 1,
        spec_selector_only: 1,
        legacy_selector_only: 1,
      });

      // Verify no database query was executed on absence path
      expect(mockDataSource.getRepository).not.toHaveBeenCalled();
    });

    it('reports upstream_contract_available as true when external_code exists in all feed even if slice is empty', async () => {
      const allProjects: ClarisaProject[] = [
        {
          id: 999,
          short_name: 'P-999',
          source_center_acronym: 'OTHER',
          phase: 2025,
          full_name: 'Other Center Project',
          source_of_funding: 'Bilateral',
          external_code: 'A900',
          lead_institution_object: {
            id: 99,
            acronym: 'OTHER',
            name: 'Other Institution',
          },
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: allProjects,
        slice: [],
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb([]),
      );

      const report = await service.getCoverageReport();

      expect(report.environment.upstream_contract_available).toBe(true);
      expect(report.resolution).not.toBeNull();
      expect(report.agresso).not.toBeNull();
      expect(report.clarisa.slice_size).toBe(0);
    });
  });

  describe('Single query & no-write verification (NFR-CPA-003, R-CPA-007 AC.2)', () => {
    it('executes exactly one AGRESSO query and invokes zero write/mutation methods', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-1',
          source_of_funding: 'Bilateral',
          external_code: 'A100',
          source_center_acronym: 'CIAT',
          phase: 2026,
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      const qb = makeContractQb([
        { agreement_id: 'A100', funding_type: 'BILATERAL' },
      ]);
      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.getCoverageReport();

      // NFR-CPA-003: called exactly once
      expect(mockDataSource.getRepository).toHaveBeenCalledTimes(1);
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(
        AgressoContract,
      );
      expect(mockAgressoRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(qb.getMany).toHaveBeenCalledTimes(1);

      // R-CPA-007 AC.2: no mutation calls
      expect(mockAgressoRepo.save).not.toHaveBeenCalled();
      expect(mockAgressoRepo.update).not.toHaveBeenCalled();
      expect(mockAgressoRepo.delete).not.toHaveBeenCalled();
      expect(mockAgressoRepo.insert).not.toHaveBeenCalled();
      expect(mockAgressoRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('CLARISA splits & alliance selector agreement (AC.5, AC.6)', () => {
    it('calculates accurate splits for funding sources, mappings, descriptions, and selector agreement', async () => {
      const allProjects: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-1',
          external_code: 'C-A1',
          source_center_acronym: 'ciat ',
          phase: 2026,
          source_of_funding: ' bilateral ',
          project_mappings_array: [{ id: 10 } as any],
          description: 'Has Description',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
        {
          id: 2,
          short_name: 'P-2',
          external_code: 'B-A2',
          source_center_acronym: 'Bioversity',
          phase: '2026' as any,
          source_of_funding: 'window3',
          project_mappings_array: [],
          description: '',
          lead_institution_object: {
            id: 51,
            acronym: 'OTHER',
            name: 'Other',
          },
        },
        {
          id: 3,
          short_name: 'P-3',
          external_code: 'C-A3',
          source_center_acronym: 'CIAT',
          phase: 2026,
          source_of_funding: 'BILATERAL - RESTRICTED',
          project_mappings_array: undefined,
          description: undefined,
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
        {
          id: 4,
          short_name: 'P-4',
          external_code: 'X-A4',
          source_center_acronym: 'OTHER_NON_ALLIANCE',
          phase: 2026,
          source_of_funding: 'bilateral',
          lead_institution_object: {
            id: 49,
            acronym: 'ABC',
            name: 'Alliance',
          },
        },
      ];

      const sliceProjects = allProjects.slice(0, 3);

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: allProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb([]),
      );

      const report = await service.getCoverageReport(2026);

      expect(report.clarisa.slice_size).toBe(3);
      expect(report.clarisa.source_center_acronym).toEqual({
        CIAT: 2,
        BIOVERSITY: 1,
      });
      expect(report.clarisa.source_of_funding).toEqual({
        BILATERAL: 1,
        WINDOW3: 1,
        'BILATERAL - RESTRICTED': 1,
      });
      expect(report.clarisa.has_project_mappings).toEqual({
        with_mappings: 1,
        without_mappings: 2,
      });
      expect(report.clarisa.description_populated).toEqual({
        populated: 1,
        empty: 2,
      });
      expect(report.clarisa.external_code_populated).toEqual({
        populated: 3,
        empty: 0,
      });
      expect(report.clarisa.alliance_selector_agreement).toEqual({
        both_selectors: 2, // Projects 1 & 3
        spec_selector_only: 1, // Project 2
        legacy_selector_only: 1, // Project 4
      });
    });
  });

  describe('Edge cases & sample limits', () => {
    it('handles zero bilateral contracts gracefully with 0 totals and percentages', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-1',
          source_of_funding: 'Bilateral',
          external_code: 'A1',
          source_center_acronym: 'CIAT',
          phase: 2026,
        },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb([]),
      );

      const report = await service.getCoverageReport();

      expect(report.agresso?.bilateral_contract_total).toBe(0);
      expect(report.resolution?.EXACT_CODE).toEqual({
        count: 0,
        percentage: 0,
        numerator: 0,
        denominator: 0,
      });
      expect(report.resolution?.UNRESOLVED).toEqual({
        count: 0,
        percentage: 0,
        numerator: 0,
        denominator: 0,
      });
    });

    it('caps sample list to limitSamples parameter', async () => {
      const sliceProjects: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-1',
          source_of_funding: 'Bilateral',
          external_code: 'A1',
          source_center_acronym: 'CIAT',
          phase: 2026,
        },
        {
          id: 2,
          short_name: 'P-2',
          source_of_funding: 'Bilateral',
          external_code: 'A2',
          source_center_acronym: 'CIAT',
          phase: 2026,
        },
        {
          id: 3,
          short_name: 'P-3',
          source_of_funding: 'Bilateral',
          external_code: 'A3',
          source_center_acronym: 'CIAT',
          phase: 2026,
        },
      ];

      const contracts: Partial<AgressoContract>[] = [
        { agreement_id: 'A1', funding_type: 'BILATERAL' },
        { agreement_id: 'A2', funding_type: 'BILATERAL' },
        { agreement_id: 'A3', funding_type: 'BILATERAL' },
      ];

      mockClarisaProjectsService.listProjectsForCoverage.mockResolvedValueOnce({
        all: sliceProjects,
        slice: sliceProjects,
        phaseUsed: 2026,
      });

      mockAgressoRepo.createQueryBuilder.mockReturnValueOnce(
        makeContractQb(contracts),
      );

      const report = await service.getCoverageReport(2026, 2);

      expect(report.resolution?.EXACT_CODE.count).toBe(3);
      expect(report.samples?.EXACT_CODE).toHaveLength(2);
    });
  });
});

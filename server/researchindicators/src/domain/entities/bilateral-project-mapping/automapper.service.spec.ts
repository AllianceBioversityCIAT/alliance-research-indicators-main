import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AutomapperService } from './automapper.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-02 / R-CAM-001 (both
// scenarios; AC.2, AC.3, AC.4), NFR-CAM-001
//
// Fixtures pin a synthetic cohort — never a live CLARISA/AGRESSO count (D-7).
// The 198 figure below is a SYNTHETIC generated fixture, not the live 2026-08-19
// measurement; it exists only to prove the resolver scales cleanly across the
// eligible cohort's known prefix mix ({B-, C-}), not to assert reality.

describe('AutomapperService', () => {
  let service: AutomapperService;
  let mockClarisaProjectsService: { listBilateralProjects: jest.Mock };
  let mockAgressoRepo: { createQueryBuilder: jest.Mock };
  let mockDataSource: { getRepository: jest.Mock };

  const makeContractQb = (contracts: Partial<AgressoContract>[] = []) => {
    const qb: Record<string, jest.Mock> = {};
    qb.select = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue(contracts);
    return qb;
  };

  const project = (overrides: Partial<ClarisaProject> & { id: number }) => ({
    short_name: `SP-${overrides.id}`,
    full_name: `Synthetic Project ${overrides.id}`,
    source_of_funding: 'Bilateral',
    phase: 2026,
    ...overrides,
  });

  // A synthetic 198-project cohort with a {B-, C-} prefix mix, each with a
  // distinct derived id and a matching AGRESSO contract — the happy path at
  // the same order of magnitude as the measured cohort (R-CAM-001 AC.2).
  const buildFullCohort = (n: number): ClarisaProject[] =>
    Array.from({ length: n }, (_, i) => {
      const idx = i + 1;
      const prefix = idx % 3 === 0 ? 'B-' : 'C-';
      const code = `${prefix}P${String(idx).padStart(4, '0')}`;
      return project({ id: 2000 + idx, external_code: code });
    });

  const buildMatchingContracts = (n: number): Partial<AgressoContract>[] =>
    Array.from({ length: n }, (_, i) => ({
      agreement_id: `P${String(i + 1).padStart(4, '0')}`,
    }));

  beforeEach(async () => {
    mockClarisaProjectsService = {
      listBilateralProjects: jest.fn(),
    };
    mockAgressoRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeContractQb()),
    };
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockAgressoRepo),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomapperService,
        {
          provide: ClarisaProjectsService,
          useValue: mockClarisaProjectsService,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(AutomapperService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('R-CAM-001 AC.2 — the measured cohort resolves in full', () => {
    // KZ-001 guard: the 198/198 assertion below cannot, by itself, distinguish
    // real resolution from a stub that always says "found". The negative
    // fixtures elsewhere in this file (must-NOT-resolve cases) are what makes
    // the 198 figure meaningful — see the 'unresolved' and 'ambiguous' blocks,
    // and the case/whitespace-mismatch fixture below.
    it('resolves 198/198 with zero ambiguous and zero unresolved', async () => {
      const cohort = buildFullCohort(198);
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockAgressoRepo.createQueryBuilder.mockReturnValue(
        makeContractQb(buildMatchingContracts(198)),
      );

      const result = await service.resolve(2026);

      expect(result.resolved).toHaveLength(198);
      expect(result.ambiguous).toHaveLength(0);
      expect(result.unresolved).toHaveLength(0);
      // Every entry carries external_code, derived id, full_name and id (design §4) —
      // never a bare number.
      expect(result.resolved[0]).toEqual(
        expect.objectContaining({
          clarisaProjectId: expect.any(Number),
          clarisaProjectFullName: expect.stringContaining('Synthetic Project'),
          externalCode: expect.stringMatching(/^[BC]-P\d{4}$/),
          derivedContractId: expect.stringMatching(/^P\d{4}$/),
        }),
      );
    });
  });

  describe('R-CAM-001 AC.3 — ambiguity (grouping, step 4)', () => {
    it('lands a two-projects-one-contract collision in ambiguous, neither in resolved', async () => {
      const cohort: ClarisaProject[] = [
        project({ id: 1, external_code: 'B-D514' }), // normalizes to D514
        project({ id: 2, external_code: 'C-D514' }), // normalizes to D514 — collision
        project({ id: 3, external_code: 'C-A100' }), // clean, unrelated
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockAgressoRepo.createQueryBuilder.mockReturnValue(
        makeContractQb([{ agreement_id: 'D514' }, { agreement_id: 'A100' }]),
      );

      const result = await service.resolve();

      expect(result.ambiguous.map((c) => c.clarisaProjectId).sort()).toEqual([
        1, 2,
      ]);
      expect(result.resolved.map((c) => c.clarisaProjectId)).toEqual([3]);
      expect(
        result.resolved.find(
          (c) => c.clarisaProjectId === 1 || c.clarisaProjectId === 2,
        ),
      ).toBeUndefined();
      expect(result.unresolved).toHaveLength(0);
    });
  });

  describe('R-CAM-001 scenario 2 — unresolved (step 5, absent from AGRESSO)', () => {
    it('reports a project whose derived id has no AGRESSO contract as unresolved, WITH the derived id', async () => {
      const cohort: ClarisaProject[] = [
        project({ id: 5, external_code: 'C-NOPE' }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockAgressoRepo.createQueryBuilder.mockReturnValue(makeContractQb([]));

      const result = await service.resolve();

      expect(result.resolved).toHaveLength(0);
      expect(result.ambiguous).toHaveLength(0);
      expect(result.unresolved).toHaveLength(1);
      expect(result.unresolved[0]).toEqual(
        expect.objectContaining({
          clarisaProjectId: 5,
          derivedContractId: 'NOPE',
        }),
      );
    });

    it('never queries AGRESSO for a project with no derivable id, and reports it unresolved directly', async () => {
      const cohort: ClarisaProject[] = [
        project({ id: 6, external_code: null }),
        project({ id: 7, external_code: 'C-A900' }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockAgressoRepo.createQueryBuilder.mockReturnValue(
        makeContractQb([{ agreement_id: 'A900' }]),
      );

      const result = await service.resolve();

      expect(result.unresolved.map((c) => c.clarisaProjectId)).toEqual([6]);
      expect(result.resolved.map((c) => c.clarisaProjectId)).toEqual([7]);
    });
  });

  describe('R-CAM-001 AC.2/AC.3 — AGRESSO existence check is case/whitespace-insensitive', () => {
    it('resolves a project whose derived id matches an AGRESSO agreement_id only after case/whitespace normalization', async () => {
      // The SQL comparison (utf8mb4_unicode_520_ci, contract.agreement_id IN (:...ids))
      // is case-insensitive and, under PAD SPACE, trailing-space-insensitive —
      // NOT leading-space-insensitive. The fixture's leading space is deliberate
      // and goes beyond what the collation itself would forgive: it exercises
      // the trim() half of the JS-side normalization, while the lower-case
      // exercises the toUpperCase() half, so this one fixture reds if either
      // is dropped.
      const cohort: ClarisaProject[] = [
        project({ id: 50, external_code: 'B-D514' }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockAgressoRepo.createQueryBuilder.mockReturnValue(
        makeContractQb([{ agreement_id: ' d514 ' }]),
      );

      const result = await service.resolve();

      expect(result.resolved.map((c) => c.clarisaProjectId)).toEqual([50]);
      expect(result.unresolved).toHaveLength(0);
    });
  });

  describe('NFR-CAM-001 — the environment guard', () => {
    it('aborts when the cohort is non-empty and zero projects carry external_code', async () => {
      const cohort: ClarisaProject[] = [
        project({ id: 10, external_code: null }),
        project({ id: 11, external_code: undefined }),
        project({ id: 12, external_code: '' }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );

      await expect(service.resolve()).rejects.toThrow(
        UnprocessableEntityException,
      );
      // Writes nothing — proven by never reaching the AGRESSO lookup at all.
      expect(mockDataSource.getRepository).not.toHaveBeenCalled();
    });

    it('does NOT abort on an empty cohort (no eligible projects at all is a different case)', async () => {
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue([]);

      const result = await service.resolve();

      expect(result).toEqual({ resolved: [], ambiguous: [], unresolved: [] });
    });

    it('does NOT abort when at least one project in the cohort carries external_code', async () => {
      const cohort: ClarisaProject[] = [
        project({ id: 20, external_code: null }),
        project({ id: 21, external_code: 'C-A700' }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockAgressoRepo.createQueryBuilder.mockReturnValue(
        makeContractQb([{ agreement_id: 'A700' }]),
      );

      await expect(service.resolve()).resolves.toBeDefined();
    });
  });

  describe('R-CAM-001 AC.4 — no name/description comparison', () => {
    it('resolves purely from external_code, ignoring full_name entirely', async () => {
      const cohort: ClarisaProject[] = [
        project({
          id: 30,
          external_code: 'C-A800',
          full_name: 'Completely unrelated contract title text',
        }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      // The AGRESSO contract has a totally different "name" — if any name
      // comparison existed, this would still resolve only via the code.
      mockAgressoRepo.createQueryBuilder.mockReturnValue(
        makeContractQb([{ agreement_id: 'A800' }]),
      );

      const result = await service.resolve();

      expect(result.resolved.map((c) => c.clarisaProjectId)).toEqual([30]);
    });
  });

  describe('Eligibility comes from the shipped predicates only', () => {
    it('delegates entirely to ClarisaProjectsService.listBilateralProjects, passing phase through', async () => {
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue([]);

      await service.resolve(2026);

      expect(
        mockClarisaProjectsService.listBilateralProjects,
      ).toHaveBeenCalledWith({ phase: 2026 });
    });
  });

  describe('AGRESSO read path (DI shape, DD-11)', () => {
    it('reads via DataSource.getRepository(AgressoContract).createQueryBuilder — never a repository injection', async () => {
      const cohort: ClarisaProject[] = [
        project({ id: 40, external_code: 'C-A999' }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      const qb = makeContractQb([{ agreement_id: 'A999' }]);
      mockAgressoRepo.createQueryBuilder.mockReturnValue(qb);

      await service.resolve();

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(
        AgressoContract,
      );
      expect(mockAgressoRepo.createQueryBuilder).toHaveBeenCalledWith(
        'contract',
      );
      expect(qb.where).toHaveBeenCalledWith(
        'contract.agreement_id IN (:...ids)',
        { ids: ['A999'] },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'contract.is_active = :isActive',
        { isActive: true },
      );
    });
  });
});

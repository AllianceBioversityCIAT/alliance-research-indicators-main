import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AutomapperService, AutomapperCandidate } from './automapper.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { MappingSourceEnum } from './enum/mapping-source.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-02 / R-CAM-001 (both
// scenarios; AC.2, AC.3, AC.4), NFR-CAM-001 — and T-03 / R-CAM-002 (idempotency),
// R-CAM-003, R-CAM-005, NFR-CAM-002, NFR-CAM-004 (classify + apply, step 6).
//
// Fixtures pin a synthetic cohort — never a live CLARISA/AGRESSO count (D-7).
// The 198 figure below is a SYNTHETIC generated fixture, not the live 2026-08-19
// measurement; it exists only to prove the resolver scales cleanly across the
// eligible cohort's known prefix mix ({B-, C-}), not to assert reality.

const fakeUser = { sec_user_id: 77 } as User;

describe('AutomapperService', () => {
  let service: AutomapperService;
  let mockClarisaProjectsService: { listBilateralProjects: jest.Mock };
  let mockAgressoRepo: { createQueryBuilder: jest.Mock };
  let mockMappingRepo: { createQueryBuilder: jest.Mock };
  let txMappingRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockDataSource: { getRepository: jest.Mock; transaction: jest.Mock };

  const makeContractQb = (contracts: Partial<AgressoContract>[] = []) => {
    const qb: Record<string, jest.Mock> = {};
    qb.select = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue(contracts);
    return qb;
  };

  // Mirrors makeContractQb — the mapping table read in step 6 uses the same
  // where/andWhere/getMany shape as the AGRESSO lookup in step 5.
  //
  // Unlike a plain stub, `andWhere` here actually filters when called with
  // the is_active predicate — this is what makes the is_active gate
  // falsifiable in a mocked-repo unit test: if production code ever stops
  // calling `.andWhere('bpm.is_active = :isActive', { isActive: true })`,
  // `getMany()` starts returning inactive rows too, exactly as a real
  // MySQL query without that clause would.
  const makeMappingQb = (rows: Partial<BilateralProjectMapping>[] = []) => {
    const qb: Record<string, jest.Mock> = {};
    let filtered = rows;
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn(
      (clause: string, params?: Record<string, unknown>) => {
        if (
          clause === 'bpm.is_active = :isActive' &&
          params?.isActive === true
        ) {
          filtered = filtered.filter((r) => r.is_active !== false);
        }
        return qb;
      },
    );
    qb.getMany = jest.fn(async () => filtered);
    return qb;
  };

  const project = (overrides: Partial<ClarisaProject> & { id: number }) => ({
    short_name: `SP-${overrides.id}`,
    full_name: `Synthetic Project ${overrides.id}`,
    source_of_funding: 'Bilateral',
    phase: 2026,
    ...overrides,
  });

  // A resolved candidate, as produced by resolve() (T-02) — the input to
  // step 6 (T-03). Never construct classify()/apply() inputs any other way;
  // `resolved` is a superset that step 6 consumes, never a bucket it writes.
  const candidate = (
    clarisaProjectId: number,
    derivedContractId: string,
    fullName = `Synthetic Project ${clarisaProjectId}`,
    shortName = `SP-${clarisaProjectId}`,
  ): AutomapperCandidate => ({
    clarisaProjectId,
    clarisaProjectFullName: fullName,
    clarisaProjectShortName: shortName,
    externalCode: `C-${derivedContractId}`,
    derivedContractId,
  });

  // An existing bilateral_project_mapping row, as read back from the DB.
  const mappingRow = (
    overrides: Partial<BilateralProjectMapping> & { id: number },
  ): BilateralProjectMapping =>
    ({
      id: overrides.id,
      agresso_agreement_id: 'D000',
      clarisa_project_id: 0,
      clarisa_project_short_name: null,
      source: MappingSourceEnum.MANUAL,
      confidence_score: null,
      notes: null,
      is_active: true,
      ...overrides,
    }) as BilateralProjectMapping;

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
    mockMappingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeMappingQb()),
    };
    txMappingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeMappingQb()),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 999, ...x })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockDataSource = {
      // Discriminates by entity, the way DataSource.getRepository(Entity)
      // does for real — resolve() reads AgressoContract, classify() (preview)
      // reads BilateralProjectMapping directly.
      getRepository: jest.fn((entity: unknown) => {
        if (entity === AgressoContract) return mockAgressoRepo;
        if (entity === BilateralProjectMapping) return mockMappingRepo;
        throw new Error(`Unexpected entity requested: ${String(entity)}`);
      }),
      // apply() re-classifies inside a transaction (idempotency lives in
      // step 6, not in a transaction guard — design §5), so its writes go
      // through the transactional manager's repository, not mockMappingRepo.
      transaction: jest
        .fn()
        .mockImplementation(async (fn: (manager: unknown) => unknown) =>
          fn({ getRepository: jest.fn().mockReturnValue(txMappingRepo) }),
        ),
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

  // ---------------------------------------------------------------------
  // T-03 — classify() = design §5 step 6. Preview only, never writes.
  // ---------------------------------------------------------------------
  describe('classify (step 6) — no existing row', () => {
    it('classifies a candidate with no active mapping as toCreate', async () => {
      const resolved = [candidate(2001, 'D900')];
      mockMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb([]));

      const result = await service.classify(resolved);

      expect(result.toCreate.map((e) => e.clarisaProjectId)).toEqual([2001]);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.divergent).toHaveLength(0);
      expect(result.supersede).toHaveLength(0);
    });

    it('never touches the mapping table when resolved is empty', async () => {
      const result = await service.classify([]);

      expect(result).toEqual({
        toCreate: [],
        alreadyMapped: [],
        divergent: [],
        supersede: [],
      });
      expect(mockMappingRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('classify (step 6) — R-CAM-003 AC.3: matcher agrees, D514 → 1516', () => {
    it('classifies an active row pointing at the SAME project as alreadyMapped', async () => {
      const resolved = [candidate(1516, 'D514')];
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 4,
            agresso_agreement_id: 'D514',
            clarisa_project_id: 1516,
            source: MappingSourceEnum.MANUAL,
            is_active: true,
          }),
        ]),
      );

      const result = await service.classify(resolved);

      expect(result.alreadyMapped.map((e) => e.clarisaProjectId)).toEqual([
        1516,
      ]);
      expect(result.toCreate).toHaveLength(0);
      expect(result.divergent).toHaveLength(0);
      expect(result.supersede).toHaveLength(0);
    });
  });

  describe('classify (step 6) — R-CAM-003 AC.1/AC.2: MANUAL is immutable → divergent', () => {
    it('classifies an active MANUAL row pointing at a DIFFERENT project as divergent, not touched', async () => {
      const resolved = [candidate(1516, 'D514')]; // matcher derives 1516
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 1,
            agresso_agreement_id: 'D514',
            clarisa_project_id: 22, // the human mapped it to a different project
            source: MappingSourceEnum.MANUAL,
            is_active: true,
            notes: 'typed by admin',
          }),
        ]),
      );

      const result = await service.classify(resolved);

      expect(result.divergent.map((e) => e.clarisaProjectId)).toEqual([1516]);
      expect(result.toCreate).toHaveLength(0);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.supersede).toHaveLength(0);
    });

    it('classifies the three pre-2026 MANUAL rows (CLARISA ids 22, 138, 246) as divergent, none rewritten', async () => {
      const resolved = [
        candidate(1601, 'A22'),
        candidate(1602, 'A138'),
        candidate(1603, 'A246'),
      ];
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 1,
            agresso_agreement_id: 'A22',
            clarisa_project_id: 22,
            source: MappingSourceEnum.MANUAL,
            is_active: true,
          }),
          mappingRow({
            id: 2,
            agresso_agreement_id: 'A138',
            clarisa_project_id: 138,
            source: MappingSourceEnum.MANUAL,
            is_active: true,
          }),
          mappingRow({
            id: 3,
            agresso_agreement_id: 'A246',
            clarisa_project_id: 246,
            source: MappingSourceEnum.MANUAL,
            is_active: true,
          }),
        ]),
      );

      const result = await service.classify(resolved);

      expect(result.divergent.map((e) => e.clarisaProjectId).sort()).toEqual([
        1601, 1602, 1603,
      ]);
      expect(result.toCreate).toHaveLength(0);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.supersede).toHaveLength(0);
    });
  });

  describe('classify (step 6) — R-CAM-005: non-MANUAL row, different project → supersede', () => {
    it('classifies an active non-MANUAL row pointing at a different project as supersede', async () => {
      const resolved = [candidate(500, 'D514')];
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 7,
            agresso_agreement_id: 'D514',
            clarisa_project_id: 25, // an earlier-phase project
            source: MappingSourceEnum.DERIVED,
            is_active: true,
          }),
        ]),
      );

      const result = await service.classify(resolved);

      expect(result.supersede.map((e) => e.clarisaProjectId)).toEqual([500]);
      expect(result.toCreate).toHaveLength(0);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.divergent).toHaveLength(0);
    });
  });

  describe('classify (step 6) — case/whitespace symmetry with the mapping table (same fix as T-02)', () => {
    it('matches an existing row whose agresso_agreement_id differs only by case/whitespace', async () => {
      // Same normalization fix as T-02's AGRESSO-side lookup. NOTE: on THIS
      // table the leading-space half of the fixture is unreachable in
      // practice — the query's `IN (:...ids)` list carries only trimmed
      // derivedContractId values, and PAD SPACE does not fold a *leading*
      // space, so SQL itself would never hand back a row like ' d514 ' from
      // that IN-list. The fixture is kept anyway as a harmless superset (it
      // also exercises the JS-side trim()+toUpperCase() directly); this
      // comment exists so the next reader doesn't infer a leading-space row
      // is something this table actually has to handle end-to-end.
      const resolved = [candidate(1516, 'D514')];
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 4,
            agresso_agreement_id: ' d514 ',
            clarisa_project_id: 1516,
            source: MappingSourceEnum.MANUAL,
            is_active: true,
          }),
        ]),
      );

      const result = await service.classify(resolved);

      expect(result.alreadyMapped.map((e) => e.clarisaProjectId)).toEqual([
        1516,
      ]);
    });
  });

  describe('classify (step 6) — the is_active gate on the mapping-table read (KZ-001 recurrence 8)', () => {
    it('reads the mapping table with the is_active gate and the IN-list shape (argument-shape corroboration)', async () => {
      const resolved = [candidate(500, 'D514')];
      const qb = makeMappingQb([]);
      mockMappingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.classify(resolved);

      expect(qb.where).toHaveBeenCalledWith(
        'bpm.agresso_agreement_id IN (:...ids)',
        { ids: ['D514'] },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('bpm.is_active = :isActive', {
        isActive: true,
      });
    });

    it('picks the ACTIVE row, never a stale inactive one that shares the same agresso_agreement_id after a prior supersede', async () => {
      // After any supersede, exactly this shape exists in the real table:
      // one inactive MANUAL row and one active DERIVED row sharing the same
      // agresso_agreement_id. Without the is_active gate, Map.set's
      // last-write-wins would pick whichever row TypeORM happens to return
      // last — silently landing on alreadyMapped (skip) or supersede
      // (re-deactivating the dead row while bypassing the live one),
      // depending on row order. This is D-3/D-2, the spec's two highest-
      // severity defect classes (requirements.md §7), one recurrence of the
      // same gap T-02 closed on the AGRESSO side (KZ-001, recurrence 8).
      const resolved = [candidate(500, 'D514')];
      const inactiveOldRow = mappingRow({
        id: 22,
        agresso_agreement_id: 'D514',
        clarisa_project_id: 22,
        source: MappingSourceEnum.MANUAL,
        is_active: false,
      });
      const activeCurrentRow = mappingRow({
        id: 25,
        agresso_agreement_id: 'D514',
        clarisa_project_id: 25,
        source: MappingSourceEnum.DERIVED,
        is_active: true,
      });
      // Deliberately returned ACTIVE-first, INACTIVE-second: if the
      // production is_active `andWhere` is ever dropped, makeMappingQb's
      // getMany() stops filtering and returns BOTH rows in this order —
      // and the classify() Map's last-write-wins would then overwrite the
      // correct id-25 entry with the stale id-22 one, reddening this
      // assertion. With the gate in place, only activeCurrentRow survives
      // the mock's filter and id 25 is all the Map ever sees.
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([activeCurrentRow, inactiveOldRow]),
      );

      const result = await service.classify(resolved);

      expect(result.supersede).toHaveLength(1);
      expect(result.supersede[0]).toEqual(
        expect.objectContaining({
          clarisaProjectId: 500,
          existingMappingId: 25,
          existingClarisaProjectId: 25,
        }),
      );
      expect(result.toCreate).toHaveLength(0);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.divergent).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // T-03 — apply() = classify() re-run inside a transaction, then write.
  // ---------------------------------------------------------------------
  describe('apply — toCreate writes DERIVED rows with null confidence_score (NFR-CAM-002, NFR-CAM-004)', () => {
    it('creates a new row for a candidate with no existing mapping', async () => {
      const resolved = [candidate(800, 'D800')];
      txMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb([]));

      const result = await service.apply(resolved, fakeUser);

      expect(result.created).toBe(1);
      expect(result.alreadyMapped).toBe(0);
      expect(result.divergent).toBe(0);
      expect(result.superseded).toBe(0);
      expect(txMappingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agresso_agreement_id: 'D800',
          clarisa_project_id: 800,
          source: MappingSourceEnum.DERIVED,
          confidence_score: null,
          is_active: true,
        }),
      );
      expect(txMappingRepo.save).toHaveBeenCalledTimes(1);
      // Grep-gate corroboration in-test: no AI_* value is ever written.
      const [createArg] = txMappingRepo.create.mock.calls[0];
      expect(createArg.source).not.toBe(MappingSourceEnum.AI_SUGGESTED);
      expect(createArg.source).not.toBe(MappingSourceEnum.AI_AUTO);
    });

    it('writes clarisa_project_short_name from the SHORT name, never the full name', async () => {
      // Deliberately distinct short vs full name so the assertion cannot
      // pass by accident — the column's own comment says "Snapshot of
      // CLARISA short_name at mapping time (D-PI-11)".
      const resolved = [
        candidate(801, 'D801', 'The Full Synthetic Project Title', 'SP-801'),
      ];
      txMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb([]));

      await service.apply(resolved, fakeUser);

      expect(txMappingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clarisa_project_short_name: 'SP-801',
        }),
      );
      const [createArg] = txMappingRepo.create.mock.calls[0];
      expect(createArg.clarisa_project_short_name).not.toBe(
        'The Full Synthetic Project Title',
      );
    });
  });

  describe('apply — R-CAM-003: MANUAL rows are byte-identical after a run', () => {
    it('writes nothing when the candidate is divergent against an active MANUAL row', async () => {
      const existingManualRow = mappingRow({
        id: 1,
        agresso_agreement_id: 'D514',
        clarisa_project_id: 22,
        source: MappingSourceEnum.MANUAL,
        is_active: true,
        notes: 'typed by admin',
        clarisa_project_short_name: 'Old Project',
      });
      const snapshot = { ...existingManualRow };
      const resolved = [candidate(1516, 'D514')];
      txMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([existingManualRow]),
      );

      const result = await service.apply(resolved, fakeUser);

      expect(result.divergent).toBe(1);
      expect(result.created).toBe(0);
      expect(result.superseded).toBe(0);
      // No write call of any kind touched this row.
      expect(txMappingRepo.update).not.toHaveBeenCalled();
      expect(txMappingRepo.create).not.toHaveBeenCalled();
      expect(txMappingRepo.save).not.toHaveBeenCalled();
      // Field-by-field: the row object itself is untouched, not merely
      // "still present" — clarisa_project_id, source, notes, is_active and
      // agresso_agreement_id are asserted individually, per the task's
      // disqualifier for a presence-only assertion.
      expect(existingManualRow).toEqual(snapshot);
      expect(existingManualRow.clarisa_project_id).toBe(22);
      expect(existingManualRow.source).toBe(MappingSourceEnum.MANUAL);
      expect(existingManualRow.notes).toBe('typed by admin');
      expect(existingManualRow.is_active).toBe(true);
      expect(existingManualRow.agresso_agreement_id).toBe('D514');
    });
  });

  describe('apply — R-CAM-005: supersession creates two rows, never re-points the existing one', () => {
    it('deactivates the existing non-MANUAL row and creates a separate new active row', async () => {
      const resolved = [candidate(500, 'D514')];
      txMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 7,
            agresso_agreement_id: 'D514',
            clarisa_project_id: 25,
            source: MappingSourceEnum.DERIVED,
            is_active: true,
          }),
        ]),
      );

      const result = await service.apply(resolved, fakeUser);

      expect(result.superseded).toBe(1);
      expect(result.created).toBe(0);

      // The deactivate — targets the OLD row by id only.
      expect(txMappingRepo.update).toHaveBeenCalledTimes(1);
      const [updateCriteria, updatePayload] = txMappingRepo.update.mock
        .calls[0] as [Record<string, unknown>, Record<string, unknown>];
      expect(updateCriteria).toEqual({ id: 7 });
      expect(updatePayload).toEqual(
        expect.objectContaining({ is_active: false }),
      );
      // Never update agresso_agreement_id on the existing row (R-CAM-005 AC.2).
      expect(updatePayload).not.toHaveProperty('agresso_agreement_id');
      expect(updatePayload).not.toHaveProperty('clarisa_project_id');

      // The new row — a separate create()+save(), never the same row.
      expect(txMappingRepo.create).toHaveBeenCalledTimes(1);
      expect(txMappingRepo.save).toHaveBeenCalledTimes(1);
      expect(txMappingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agresso_agreement_id: 'D514',
          clarisa_project_id: 500,
          source: MappingSourceEnum.DERIVED,
          confidence_score: null,
          is_active: true,
        }),
      );
    });
  });

  describe('apply — R-CAM-002 AND IT MUST be idempotent', () => {
    it('applying the same resolved candidates twice does not grow the row count after the first apply', async () => {
      const resolved = [candidate(700, 'D700')];

      // First apply: nothing exists yet -> toCreate -> one save().
      txMappingRepo.createQueryBuilder.mockReturnValueOnce(makeMappingQb([]));
      const first = await service.apply(resolved, fakeUser);
      expect(first.created).toBe(1);
      expect(txMappingRepo.save).toHaveBeenCalledTimes(1);

      // Second apply, SAME candidates: the row now exists and is active, so
      // step 6 (re-run fresh inside the transaction) classifies it
      // alreadyMapped this time and writes nothing. This is what makes
      // idempotency come from step 6, not a transaction guard (design §5).
      txMappingRepo.createQueryBuilder.mockReturnValueOnce(
        makeMappingQb([
          mappingRow({
            id: 999,
            agresso_agreement_id: 'D700',
            clarisa_project_id: 700,
            source: MappingSourceEnum.DERIVED,
            is_active: true,
          }),
        ]),
      );
      const second = await service.apply(resolved, fakeUser);

      expect(second.created).toBe(0);
      expect(second.alreadyMapped).toBe(1);
      // Total create-writing calls across BOTH applies stayed at 1 — the row
      // count is unchanged after the first apply (R-CAM-002 AC.2).
      expect(txMappingRepo.save).toHaveBeenCalledTimes(1);
      expect(txMappingRepo.create).toHaveBeenCalledTimes(1);
    });
  });
});

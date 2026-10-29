import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { AutomapperService, AutomapperCandidate } from './automapper.service';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { MappingSourceEnum } from './enum/mapping-source.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-02 / R-CAM-001 (both
// scenarios; AC.2, AC.3, AC.4), NFR-CAM-001 — and T-03 / R-CAM-002 (idempotency),
// R-CAM-003, R-CAM-005, NFR-CAM-002, NFR-CAM-004 (classify + apply, step 6).
//
// Fixtures pin a synthetic cohort — never a live CLARISA/AGRESSO count (D-7).
// The 198 figure below is a SYNTHETIC generated fixture, not the live 2026-08-19
// measurement; it exists only to prove the resolver scales cleanly across the
// eligible cohort's known prefix mix ({B-, C-}), not to assert reality.

const fakeUser = { sec_user_id: 77 } as User;
const YEAR = 2026;

describe('AutomapperService', () => {
  let service: AutomapperService;
  let mockClarisaProjectsService: {
    listBilateralProjects: jest.Mock;
    getCacheFetchedAt: jest.Mock;
  };
  let mockAgressoRepo: { createQueryBuilder: jest.Mock };
  let mockMappingRepo: { createQueryBuilder: jest.Mock };
  let txMappingRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockDataSource: { getRepository: jest.Mock; transaction: jest.Mock };
  let mockReportingYearResolver: { resolve: jest.Mock };

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
  // Models Brackets execution and precedence: when `where(new Brackets(...))`
  // and `andWhere('bpm.is_active = :isActive', { isActive: true })` are called,
  // `getMany()` evaluates (id IN ids OR code IN codes) AND is_active = true,
  // ensuring inactive rows are filtered regardless of OR branch matching.
  const makeMappingQb = (rows: Partial<BilateralProjectMapping>[] = []) => {
    const qb: Record<string, jest.Mock> = {};
    let idFilter: number[] | null = null;
    let codeFilter: string[] | null = null;
    let agreementFilter: string[] | null = null;
    let activeFilter: boolean | null = null;
    let yearFilter: number | null = null;
    const sqlClauses: string[] = [];

    const executeBrackets = (brackets: Brackets) => {
      const innerClauses: string[] = [];
      const innerQb: Record<string, jest.Mock> = {};
      innerQb.where = jest.fn(
        (clause: string, params?: Record<string, unknown>) => {
          innerClauses.push(clause);
          if (
            clause === 'bpm.clarisa_project_id IN (:...ids)' &&
            Array.isArray(params?.ids)
          ) {
            idFilter = params.ids as number[];
          }
          return innerQb;
        },
      );
      innerQb.orWhere = jest.fn(
        (clause: string, params?: Record<string, unknown>) => {
          innerClauses.push(`OR ${clause}`);
          if (
            clause === 'bpm.clarisa_external_code IN (:...codes)' &&
            Array.isArray(params?.codes)
          ) {
            codeFilter = params.codes as string[];
          }
          return innerQb;
        },
      );
      brackets.whereFactory(innerQb as any);
      sqlClauses.push(`(${innerClauses.join(' ')})`);
    };

    qb.where = jest.fn(
      (
        clauseOrBrackets: string | Brackets,
        params?: Record<string, unknown>,
      ) => {
        if (clauseOrBrackets instanceof Brackets) {
          executeBrackets(clauseOrBrackets);
        } else if (typeof clauseOrBrackets === 'string') {
          sqlClauses.push(clauseOrBrackets);
          if (
            clauseOrBrackets === 'bpm.clarisa_project_id IN (:...ids)' &&
            Array.isArray(params?.ids)
          ) {
            idFilter = params.ids as number[];
          } else if (
            clauseOrBrackets === 'bpm.agresso_agreement_id IN (:...ids)' &&
            Array.isArray(params?.ids)
          ) {
            agreementFilter = params.ids as string[];
          }
        }
        return qb;
      },
    );

    qb.orWhere = jest.fn((clause: string, params?: Record<string, unknown>) => {
      sqlClauses.push(`OR ${clause}`);
      if (
        clause === 'bpm.clarisa_external_code IN (:...codes)' &&
        Array.isArray(params?.codes)
      ) {
        codeFilter = params.codes as string[];
      }
      return qb;
    });

    qb.andWhere = jest.fn(
      (clause: string, params?: Record<string, unknown>) => {
        sqlClauses.push(`AND ${clause}`);
        if (
          clause === 'bpm.is_active = :isActive' &&
          params?.isActive === true
        ) {
          activeFilter = true;
        }
        if (
          clause === 'bpm.reporting_year = :reportingYear' &&
          typeof params?.reportingYear === 'number'
        ) {
          yearFilter = params.reportingYear;
        }
        return qb;
      },
    );

    qb.getQuery = jest.fn(
      () =>
        `SELECT ... FROM bilateral_project_mapping bpm WHERE ${sqlClauses.join(' ')}`,
    );

    qb.getMany = jest.fn(async () => {
      let filtered = rows;
      if (idFilter !== null || codeFilter !== null) {
        const idSet = idFilter ? new Set(idFilter) : null;
        const codeSet = codeFilter ? new Set(codeFilter) : null;
        filtered = filtered.filter((r) => {
          const matchId =
            idSet &&
            r.clarisa_project_id !== undefined &&
            idSet.has(r.clarisa_project_id);
          const matchCode =
            codeSet &&
            r.clarisa_external_code &&
            codeSet.has(r.clarisa_external_code);
          return matchId || matchCode;
        });
      }
      if (agreementFilter !== null) {
        const agSet = new Set(
          agreementFilter.map((id) => id.trim().toUpperCase()),
        );
        filtered = filtered.filter(
          (r) =>
            r.agresso_agreement_id &&
            agSet.has(r.agresso_agreement_id.trim().toUpperCase()),
        );
      }
      if (activeFilter === true) {
        filtered = filtered.filter((r) => r.is_active === true);
      }
      if (yearFilter !== null) {
        filtered = filtered.filter((r) => r.reporting_year === yearFilter);
      }
      return filtered;
    });

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
      reporting_year: YEAR,
      ...overrides,
    }) as BilateralProjectMapping;

  const bindTxStore = (store: BilateralProjectMapping[]) => {
    let nextId = 9000;
    txMappingRepo.createQueryBuilder.mockImplementation(() =>
      makeMappingQb(store),
    );
    txMappingRepo.create.mockImplementation((row) => ({ ...row }));
    txMappingRepo.save.mockImplementation(async (row) => {
      const saved = { id: nextId++, ...row } as BilateralProjectMapping;
      store.push(saved);
      return saved;
    });
    txMappingRepo.update.mockImplementation(async (criteria, partial) => {
      const row = store.find((r) => r.id === (criteria as { id: number }).id);
      if (row) Object.assign(row, partial);
      return { affected: row ? 1 : 0 };
    });
  };

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
      getCacheFetchedAt: jest.fn().mockReturnValue(null),
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
    mockReportingYearResolver = {
      resolve: jest.fn().mockResolvedValue(YEAR),
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
        {
          provide: ReportingYearResolver,
          useValue: mockReportingYearResolver,
        },
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

      const result = await service.resolve();

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

      expect(result).toEqual({
        reportingYear: YEAR,
        resolved: [],
        ambiguous: [],
        unresolved: [],
      });
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
    it('passes the resolver year into listBilateralProjects once, under the phase option', async () => {
      mockReportingYearResolver.resolve.mockResolvedValue(2027);
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue([]);

      const result = await service.resolve();

      expect(mockReportingYearResolver.resolve).toHaveBeenCalledTimes(1);
      expect(
        mockClarisaProjectsService.listBilateralProjects,
      ).toHaveBeenCalledWith({ phase: 2027 });
      expect(result.reportingYear).toBe(2027);
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
  // T-04 — coverage() = design §4 GET .../coverage, R-CAM-004.
  // ---------------------------------------------------------------------
  describe('R-CAM-004 — coverage()', () => {
    it('AC.1/AC.2 — mapped + pending + inactive = reachable', async () => {
      const cohort = buildFullCohort(198); // ids 2001..2198
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      // 4 of the 198 eligible projects already carry an active mapping row.
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({ id: 1, clarisa_project_id: 2001, is_active: true }),
          mappingRow({ id: 2, clarisa_project_id: 2002, is_active: true }),
          mappingRow({ id: 3, clarisa_project_id: 2003, is_active: true }),
          mappingRow({ id: 4, clarisa_project_id: 2004, is_active: true }),
        ]),
      );

      const result = await service.coverage();

      expect(result.mapped + result.pending + result.inactive).toBe(
        result.reachable,
      );
      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 4,
        pending: 194,
        inactive: 0,
        reachable: 198,
      });
    });

    it('scopes the mapped-row read to the cohort ids — the IN-list clause that guarantees mapped <= reachable', async () => {
      // Argument-shape corroboration: Brackets match, current year, no
      // is_active predicate. The behavioural gate is the A1697 fixture.
      const cohort = buildFullCohort(3); // ids 2001, 2002, 2003
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      const qb = makeMappingQb([]);
      mockMappingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.coverage();

      expect(qb.where).toHaveBeenCalledWith(expect.any(Brackets));
      expect(qb.andWhere).toHaveBeenCalledWith(
        'bpm.reporting_year = :reportingYear',
        { reportingYear: YEAR },
      );
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'bpm.is_active = :isActive',
        expect.anything(),
      );
    });

    it('does NOT count an active mapping row for a project outside the cohort (IN-list scoping, behavioural)', async () => {
      // makeMappingQb applies Brackets matching and is_active filtering.
      // An active row for a project OUT of cohort (id 22) must not count.
      const cohort = [project({ id: 5001, external_code: 'C-Q1' })]; // reachable = 1
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );

      const rows = [
        mappingRow({
          id: 50,
          clarisa_project_id: 5001,
          clarisa_external_code: 'Q1',
          is_active: true,
        }), // in cohort
        mappingRow({
          id: 51,
          clarisa_project_id: 22,
          clarisa_external_code: 'OTHER',
          is_active: true,
        }), // OUT of cohort — must not count
      ];
      mockMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb(rows));

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 1,
        pending: 0,
        inactive: 0,
        reachable: 1,
      });
    });

    it('passes the resolver year into listBilateralProjects and returns it', async () => {
      mockReportingYearResolver.resolve.mockResolvedValue(2027);
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue([]);

      const result = await service.coverage();

      expect(mockReportingYearResolver.resolve).toHaveBeenCalledTimes(1);
      expect(
        mockClarisaProjectsService.listBilateralProjects,
      ).toHaveBeenCalledWith({ phase: 2027 });
      expect(result.reporting_year).toBe(2027);
    });

    it('zero-cohort — reachable 0 returned without dividing, mapping table never queried', async () => {
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue([]);

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 0,
        pending: 0,
        inactive: 0,
        reachable: 0,
      });
      expect(result.mapped + result.pending + result.inactive).toBe(
        result.reachable,
      );
      expect(mockMappingRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('counts an inactive current-year row as inactive, not pending', async () => {
      const cohort = [project({ id: 3001, external_code: 'C-Z1' })];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({ id: 9, clarisa_project_id: 3001, is_active: false }),
        ]),
      );

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 0,
        pending: 0,
        inactive: 1,
        reachable: 1,
      });
    });

    it('AC.3 — no figure is derived from the AGRESSO contract table', async () => {
      const cohort = buildFullCohort(5);
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb([]));

      const result = await service.coverage();

      expect(mockDataSource.getRepository).not.toHaveBeenCalledWith(
        AgressoContract,
      );
      expect(Object.keys(result).sort()).toEqual([
        'inactive',
        'mapped',
        'pending',
        'reachable',
        'reporting_year',
      ]);
    });

    it('counts project as mapped via clarisa_external_code even if numeric clarisa_project_id differs (R-PSP-005 AC.3)', async () => {
      // Feed has project with id 92 and external_code 'A1676'
      const cohort = [project({ id: 92, external_code: 'A1676' })];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      // DB has mapping row stored with old id 1403, but clarisa_external_code 'A1676'
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 1,
            clarisa_project_id: 1403,
            clarisa_external_code: 'A1676',
            is_active: true,
          }),
        ]),
      );

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 1,
        pending: 0,
        inactive: 0,
        reachable: 1,
      });
    });

    it('counts an inactive project-id match as inactive when no active row matches', async () => {
      // Cohort has project id 4001; DB only has an INACTIVE row with clarisa_project_id 4001.
      const cohort = [project({ id: 4001, external_code: 'C-W1' })];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 88,
            clarisa_project_id: 4001,
            clarisa_external_code: 'W1',
            is_active: false,
          }),
        ]),
      );

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 0,
        pending: 0,
        inactive: 1,
        reachable: 1,
      });
    });

    it('counts an inactive external-code match as inactive when no active row matches', async () => {
      // Cohort has project with external_code 'A999'; DB has only an INACTIVE row with that code.
      const cohort = [project({ id: 555, external_code: 'C-A999' })];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 89,
            clarisa_project_id: 8888, // different id
            clarisa_external_code: 'A999',
            is_active: false,
          }),
        ]),
      );

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 0,
        pending: 0,
        inactive: 1,
        reachable: 1,
      });
    });

    it('generates SQL with parentheses wrapping the OR before the year predicate', async () => {
      const cohort = [project({ id: 2001, external_code: 'C-P001' })];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      const qb = makeMappingQb([]);
      mockMappingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.coverage();

      const sql = qb.getQuery();
      expect(sql).toMatch(/WHERE \(.*OR.*\) AND .*reporting_year/);
      expect(sql).not.toMatch(/is_active/);
    });

    it('R-APM-009 AC.1 — 197 active, 1 inactive, 198 reachable → 197 / 0 / 1 / 198', async () => {
      const cohort = buildFullCohort(198);
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      const rows = cohort.map((p, index) =>
        mappingRow({
          id: index + 1,
          clarisa_project_id: p.id,
          is_active: index !== 0,
          source: MappingSourceEnum.DERIVED,
          reporting_year: YEAR,
        }),
      );
      mockMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb(rows));

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 197,
        pending: 0,
        inactive: 1,
        reachable: 198,
      });
      expect(result.mapped + result.pending + result.inactive).toBe(
        result.reachable,
      );
    });

    it('§6.4 mixed match — active by id wins over inactive by code', async () => {
      const cohort = [
        project({ id: 100, external_code: 'C-MIX1' }),
        project({ id: 200, external_code: 'C-ONLY-INACTIVE' }),
      ];
      mockClarisaProjectsService.listBilateralProjects.mockResolvedValue(
        cohort,
      );
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 1,
            clarisa_project_id: 100,
            clarisa_external_code: 'OTHER',
            is_active: true,
            reporting_year: YEAR,
          }),
          mappingRow({
            id: 2,
            clarisa_project_id: 999,
            clarisa_external_code: 'MIX1',
            is_active: false,
            reporting_year: YEAR,
          }),
          mappingRow({
            id: 3,
            clarisa_project_id: 888,
            clarisa_external_code: 'ONLY-INACTIVE',
            is_active: false,
            reporting_year: YEAR,
          }),
          mappingRow({
            id: 4,
            clarisa_project_id: 100,
            clarisa_external_code: 'PRIOR',
            is_active: true,
            reporting_year: 2025,
          }),
        ]),
      );

      const result = await service.coverage();

      expect(result).toEqual({
        reporting_year: YEAR,
        mapped: 1,
        pending: 0,
        inactive: 1,
        reachable: 2,
      });
    });
  });

  // ---------------------------------------------------------------------
  // T-03 — classify() = design §5 step 6. Preview only, never writes.
  // ---------------------------------------------------------------------
  describe('classify (step 6) — no existing row', () => {
    it('classifies a candidate with no active mapping as toCreate', async () => {
      const resolved = [candidate(2001, 'D900')];
      mockMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb([]));

      const result = await service.classify(resolved, YEAR);

      expect(result.toCreate.map((e) => e.clarisaProjectId)).toEqual([2001]);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.divergent).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.inactive).toHaveLength(0);
    });

    it('never touches the mapping table when resolved is empty', async () => {
      const result = await service.classify([], YEAR);

      expect(result).toEqual({
        toCreate: [],
        alreadyMapped: [],
        toUpdate: [],
        divergent: [],
        inactive: [],
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

      const result = await service.classify(resolved, YEAR);

      expect(result.alreadyMapped.map((e) => e.clarisaProjectId)).toEqual([
        1516,
      ]);
      expect(result.toCreate).toHaveLength(0);
      expect(result.divergent).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.inactive).toHaveLength(0);
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

      const result = await service.classify(resolved, YEAR);

      expect(result.divergent.map((e) => e.clarisaProjectId)).toEqual([1516]);
      expect(result.toCreate).toHaveLength(0);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.inactive).toHaveLength(0);
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

      const result = await service.classify(resolved, YEAR);

      expect(result.divergent.map((e) => e.clarisaProjectId).sort()).toEqual([
        1601, 1602, 1603,
      ]);
      expect(result.toCreate).toHaveLength(0);
      expect(result.alreadyMapped).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.inactive).toHaveLength(0);
    });
  });

  describe('§6.3 — one current-year row per bucket, sources varied', () => {
    it('lands each table row in exactly one bucket', async () => {
      const resolved = [
        candidate(1100, 'R1'),
        candidate(2100, 'R2'),
        candidate(3100, 'R3'),
        candidate(4100, 'R4'),
        candidate(5100, 'R5'),
        candidate(6100, 'R6'),
        candidate(7100, 'R7'),
      ];
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 2,
            agresso_agreement_id: 'R2',
            clarisa_project_id: 2100,
            source: MappingSourceEnum.DERIVED,
            is_active: true,
          }),
          mappingRow({
            id: 3,
            agresso_agreement_id: 'R3',
            clarisa_project_id: 31,
            source: MappingSourceEnum.AI_AUTO,
            is_active: true,
          }),
          mappingRow({
            id: 4,
            agresso_agreement_id: 'R4',
            clarisa_project_id: 41,
            source: MappingSourceEnum.MANUAL,
            is_active: true,
          }),
          mappingRow({
            id: 5,
            agresso_agreement_id: 'R5',
            clarisa_project_id: 5100,
            source: MappingSourceEnum.MANUAL,
            is_active: false,
          }),
          mappingRow({
            id: 6,
            agresso_agreement_id: 'R6',
            clarisa_project_id: 61,
            source: MappingSourceEnum.DERIVED,
            is_active: false,
          }),
          mappingRow({
            id: 7,
            agresso_agreement_id: 'R7',
            clarisa_project_id: 71,
            source: MappingSourceEnum.MANUAL,
            is_active: false,
          }),
        ]),
      );

      const result = await service.classify(resolved, YEAR);

      expect(result.toCreate.map((e) => e.derivedContractId)).toEqual(['R1']);
      expect(result.alreadyMapped.map((e) => e.derivedContractId)).toEqual([
        'R2',
      ]);
      expect(result.toUpdate.map((e) => e.derivedContractId)).toEqual(['R3']);
      expect(result.toUpdate[0].existingMappingId).toBe(3);
      expect(result.divergent.map((e) => e.derivedContractId).sort()).toEqual([
        'R4',
        'R7',
      ]);
      expect(result.inactive.map((e) => e.derivedContractId).sort()).toEqual([
        'R5',
        'R6',
      ]);
      expect(result.inactive.find((e) => e.derivedContractId === 'R5')).toEqual(
        expect.objectContaining({ refreshed: false, existingMappingId: 5 }),
      );
      expect(result.inactive.find((e) => e.derivedContractId === 'R6')).toEqual(
        expect.objectContaining({ refreshed: true, existingMappingId: 6 }),
      );
      const placed =
        result.toCreate.length +
        result.alreadyMapped.length +
        result.toUpdate.length +
        result.divergent.length +
        result.inactive.length;
      expect(placed).toBe(resolved.length);
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

      const result = await service.classify(resolved, YEAR);

      expect(result.alreadyMapped.map((e) => e.clarisaProjectId)).toEqual([
        1516,
      ]);
    });
  });

  describe('classify — current-year rows only, no is_active filter', () => {
    it('reads the agreement IN-list and the carried year, and does not filter is_active', async () => {
      const resolved = [candidate(500, 'D514')];
      const qb = makeMappingQb([]);
      mockMappingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.classify(resolved, YEAR);

      expect(qb.where).toHaveBeenCalledWith(
        'bpm.agresso_agreement_id IN (:...ids)',
        { ids: ['D514'] },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'bpm.reporting_year = :reportingYear',
        { reportingYear: YEAR },
      );
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'bpm.is_active = :isActive',
        expect.anything(),
      );
      expect(mockReportingYearResolver.resolve).not.toHaveBeenCalled();
    });

    it('does not see a prior-year row for the same agreement', async () => {
      const resolved = [candidate(500, 'D514')];
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 8,
            agresso_agreement_id: 'D514',
            clarisa_project_id: 500,
            source: MappingSourceEnum.DERIVED,
            is_active: false,
            reporting_year: 2025,
          }),
        ]),
      );

      const result = await service.classify(resolved, YEAR);

      expect(result.toCreate).toHaveLength(1);
      expect(result.inactive).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  // T-03 — apply() = classify() re-run inside a transaction, then write.
  // ---------------------------------------------------------------------
  describe('apply — toCreate writes DERIVED rows with null confidence_score (NFR-CAM-002, NFR-CAM-004)', () => {
    it('creates a new row for a candidate with no existing mapping', async () => {
      const resolved = [candidate(800, 'D800')];
      txMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb([]));

      const result = await service.apply(resolved, fakeUser, YEAR);

      expect(result.created).toBe(1);
      expect(result.alreadyMapped).toBe(0);
      expect(result.divergent).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.inactive).toBe(0);
      expect(txMappingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agresso_agreement_id: 'D800',
          clarisa_project_id: 800,
          clarisa_external_code: 'D800',
          source: MappingSourceEnum.DERIVED,
          reporting_year: YEAR,
          confidence_score: null,
          is_active: true,
        }),
      );
      expect(txMappingRepo.save).toHaveBeenCalledTimes(1);
      // Grep-gate corroboration in-test: no AI_* value is ever written.
      const [createArg] = txMappingRepo.create.mock.calls[0];
      expect(createArg.source).not.toBe(MappingSourceEnum.AI_SUGGESTED);
      expect(createArg.source).not.toBe(MappingSourceEnum.AI_AUTO);
      expect(createArg.clarisa_external_code).toBe('D800');
    });

    it('writes clarisa_project_short_name from the SHORT name, never the full name', async () => {
      // Deliberately distinct short vs full name so the assertion cannot
      // pass by accident — the column's own comment says "Snapshot of
      // CLARISA short_name at mapping time (D-PI-11)".
      const resolved = [
        candidate(801, 'D801', 'The Full Synthetic Project Title', 'SP-801'),
      ];
      txMappingRepo.createQueryBuilder.mockReturnValue(makeMappingQb([]));

      await service.apply(resolved, fakeUser, YEAR);

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

      const result = await service.apply(resolved, fakeUser, YEAR);

      expect(result.divergent).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.inactive).toBe(0);
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

  describe('apply — §6.3 rows 3 and 6 update in place and never write is_active', () => {
    it('row 3 keeps its id and refreshes CLARISA fields; a second Apply writes 0', async () => {
      const store = [
        mappingRow({
          id: 7,
          agresso_agreement_id: 'D514',
          clarisa_project_id: 25,
          clarisa_project_short_name: 'OLD',
          clarisa_external_code: 'OLD',
          source: MappingSourceEnum.AI_AUTO,
          is_active: true,
          reporting_year: YEAR,
        }),
      ];
      bindTxStore(store);
      const resolved = [candidate(500, 'D514', 'Full 500', 'SP-500')];

      const first = await service.apply(resolved, fakeUser, YEAR);

      expect(first.updated).toBe(1);
      expect(first.created).toBe(0);
      expect(store).toHaveLength(1);
      expect(store[0].id).toBe(7);
      expect(store[0].clarisa_project_id).toBe(500);
      expect(store[0].clarisa_project_short_name).toBe('SP-500');
      expect(store[0].clarisa_external_code).toBe('D514');
      expect(store[0].source).toBe(MappingSourceEnum.AI_AUTO);
      expect(store[0].is_active).toBe(true);
      expect(store[0].updated_by).toBe(fakeUser.sec_user_id);
      expect(txMappingRepo.save).not.toHaveBeenCalled();
      const [, payload] = txMappingRepo.update.mock.calls[0] as [
        { id: number },
        Record<string, unknown>,
      ];
      expect(payload).not.toHaveProperty('is_active');
      expect(payload).not.toHaveProperty('deleted_at');
      expect(payload).not.toHaveProperty('source');

      const second = await service.apply(resolved, fakeUser, YEAR);
      expect(second.updated).toBe(0);
      expect(second.alreadyMapped).toBe(1);
      expect(second.created).toBe(0);
      expect(txMappingRepo.update).toHaveBeenCalledTimes(1);
      expect(txMappingRepo.save).not.toHaveBeenCalled();
    });

    it('row 6 refreshes CLARISA fields and stays inactive', async () => {
      const deletedAt = new Date('2026-01-02T00:00:00.000Z');
      const store = [
        mappingRow({
          id: 66,
          agresso_agreement_id: 'R6',
          clarisa_project_id: 61,
          source: MappingSourceEnum.DERIVED,
          is_active: false,
          deleted_at: deletedAt,
          reporting_year: YEAR,
        }),
      ];
      bindTxStore(store);

      const result = await service.apply(
        [candidate(6100, 'R6', 'Full 6100', 'SP-6100')],
        fakeUser,
        YEAR,
      );

      expect(result.inactive).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.created).toBe(0);
      expect(store).toHaveLength(1);
      expect(store[0].id).toBe(66);
      expect(store[0].clarisa_project_id).toBe(6100);
      expect(store[0].is_active).toBe(false);
      expect(store[0].deleted_at).toEqual(deletedAt);
      expect(store[0].source).toBe(MappingSourceEnum.DERIVED);
    });
  });

  describe('apply — R-CAM-002 AND IT MUST be idempotent', () => {
    it('applying the same resolved candidates twice does not grow the row count after the first apply', async () => {
      const resolved = [candidate(700, 'D700')];

      // First apply: nothing exists yet -> toCreate -> one save().
      txMappingRepo.createQueryBuilder.mockReturnValueOnce(makeMappingQb([]));
      const first = await service.apply(resolved, fakeUser, YEAR);
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
      const second = await service.apply(resolved, fakeUser, YEAR);

      expect(second.created).toBe(0);
      expect(second.updated).toBe(0);
      expect(second.alreadyMapped).toBe(1);
      // Total create-writing calls across BOTH applies stayed at 1 — the row
      // count is unchanged after the first apply (R-CAM-002 AC.2).
      expect(txMappingRepo.save).toHaveBeenCalledTimes(1);
      expect(txMappingRepo.create).toHaveBeenCalledTimes(1);
      expect(txMappingRepo.update).not.toHaveBeenCalled();
    });
  });

  // @akili-spec docs/specs/bilateral/annualized-project-mapping — T-05 /
  // R-APM-005 scenario A1697. Apply ×3 must re-classify each time (KZ-015).
  describe('R-APM-005 scenario A1697 — inactive DERIVED row is not re-created', () => {
    it('Apply ×3 leaves exactly one current-year row, is_active false, deleted_at untouched', async () => {
      const deletedAt = new Date('2026-09-16T00:41:13.511Z');
      const store: BilateralProjectMapping[] = [
        mappingRow({
          id: 1697,
          agresso_agreement_id: 'A1697',
          clarisa_project_id: 501,
          clarisa_external_code: 'A1697',
          clarisa_project_short_name: 'SP-501',
          source: MappingSourceEnum.DERIVED,
          is_active: false,
          deleted_at: deletedAt,
          reporting_year: YEAR,
        }),
      ];
      bindTxStore(store);

      const resolved = [candidate(501, 'A1697')];
      await service.apply(resolved, fakeUser, YEAR);
      await service.apply(resolved, fakeUser, YEAR);
      await service.apply(resolved, fakeUser, YEAR);

      expect(store).toHaveLength(1);
      expect(store[0].id).toBe(1697);
      expect(store[0].is_active).toBe(false);
      expect(store[0].deleted_at).toEqual(deletedAt);
      expect(txMappingRepo.save).not.toHaveBeenCalled();
      expect(txMappingRepo.update).not.toHaveBeenCalled();
    });

    it('lists A1697 under inactive in the preview and not under toCreate', async () => {
      mockMappingRepo.createQueryBuilder.mockReturnValue(
        makeMappingQb([
          mappingRow({
            id: 1697,
            agresso_agreement_id: 'A1697',
            clarisa_project_id: 501,
            source: MappingSourceEnum.DERIVED,
            is_active: false,
            reporting_year: YEAR,
          }),
        ]),
      );

      const result = await service.classify([candidate(501, 'A1697')], YEAR);

      expect(result.inactive).toEqual([
        expect.objectContaining({
          derivedContractId: 'A1697',
          existingMappingId: 1697,
          refreshed: false,
          action: 'inactive',
        }),
      ]);
      expect(result.toCreate).toHaveLength(0);
    });
  });

  // @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 rework /
  // design.md §7, K-016. getFeedFetchedAt() is a thin passthrough to
  // ClarisaProjectsService.getCacheFetchedAt() — this is the ONLY thing
  // it does, so the gate is pure delegation, both branches.
  describe('getFeedFetchedAt (§7, K-016)', () => {
    it('returns whatever clarisaProjectsService.getCacheFetchedAt() returns', () => {
      mockClarisaProjectsService.getCacheFetchedAt.mockReturnValue(
        1_700_000_000_000,
      );

      expect(service.getFeedFetchedAt()).toBe(1_700_000_000_000);
      expect(mockClarisaProjectsService.getCacheFetchedAt).toHaveBeenCalled();
    });

    it('returns null when the underlying cache is cold', () => {
      mockClarisaProjectsService.getCacheFetchedAt.mockReturnValue(null);

      expect(service.getFeedFetchedAt()).toBeNull();
    });
  });

  // @akili-spec docs/specs/bilateral/annualized-project-mapping — T-06 /
  // R-APM-011 AC.5 and the scenario (deactivate → Apply → activate → Apply).
  // KZ-015: the transitions are the assertion, not a pre-built end state.
  describe('R-APM-011 scenario — deactivate, Apply, activate, Apply', () => {
    it('a row deactivated → Apply leaves it inactive → activate() → the next Apply classifies it normally, never creating a second row', async () => {
      const store: BilateralProjectMapping[] = [
        mappingRow({
          id: 42,
          agresso_agreement_id: 'X42',
          clarisa_project_id: 501,
          clarisa_external_code: 'X42',
          clarisa_project_short_name: 'SP-501',
          source: MappingSourceEnum.DERIVED,
          is_active: true,
          reporting_year: YEAR,
        }),
      ];
      bindTxStore(store);

      const repo = {
        findOne: jest.fn(
          async ({ where }: { where: { id: number } }) =>
            store.find((row) => row.id === where.id) ?? null,
        ),
        save: jest.fn(async (row: BilateralProjectMapping) => {
          const index = store.findIndex((item) => item.id === row.id);
          if (index >= 0) store[index] = row;
          else store.push(row);
          return row;
        }),
        createQueryBuilder: jest.fn(() => makeMappingQb(store)),
      };

      const mappingModule = await Test.createTestingModule({
        providers: [
          BilateralProjectMappingService,
          { provide: BilateralProjectMappingRepository, useValue: repo },
          { provide: DataSource, useValue: mockDataSource },
          {
            provide: ClarisaProjectsService,
            useValue: mockClarisaProjectsService,
          },
          {
            provide: ReportingYearResolver,
            useValue: mockReportingYearResolver,
          },
        ],
      }).compile();
      const mappingService = mappingModule.get(BilateralProjectMappingService);

      await mappingService.deactivate(42, fakeUser, 'admin decision');
      expect(store).toHaveLength(1);
      expect(store[0].is_active).toBe(false);
      expect(store[0].deleted_at).toBeInstanceOf(Date);

      const sameProject = [candidate(501, 'X42')];
      const firstApply = await service.apply(sameProject, fakeUser, YEAR);
      const secondApply = await service.apply(sameProject, fakeUser, YEAR);

      expect(firstApply.created).toBe(0);
      expect(firstApply.inactive).toBe(1);
      expect(secondApply.created).toBe(0);
      expect(secondApply.inactive).toBe(1);
      expect(store).toHaveLength(1);
      expect(store[0].id).toBe(42);
      expect(store[0].is_active).toBe(false);

      await mappingService.activate(42, fakeUser);
      expect(store[0].is_active).toBe(true);
      expect(store[0].deleted_at).toBeNull();
      expect(store).toHaveLength(1);

      const afterActivate = await service.apply(sameProject, fakeUser, YEAR);
      expect(afterActivate.alreadyMapped).toBe(1);
      expect(afterActivate.created).toBe(0);
      expect(afterActivate.updated).toBe(0);
      expect(store).toHaveLength(1);
      expect(store[0].id).toBe(42);
      expect(store[0].is_active).toBe(true);

      const differentProject = [candidate(900, 'X42', 'Full 900', 'SP-900')];
      const refreshed = await service.apply(differentProject, fakeUser, YEAR);
      expect(refreshed.updated).toBe(1);
      expect(refreshed.created).toBe(0);
      expect(store).toHaveLength(1);
      expect(store[0].id).toBe(42);
      expect(store[0].clarisa_project_id).toBe(900);
      expect(store[0].is_active).toBe(true);
      expect(store[0].source).toBe(MappingSourceEnum.DERIVED);
      expect(txMappingRepo.save).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClarisaProjectsModule } from './clarisa-projects.module';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { MappingPhaseResolver } from './mapping-phase.resolver';
import { ClarisaProject } from './dto/clarisa-project.types';

// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-03 / R-BAS-001, R-BAS-002, R-BAS-003, R-BAS-004, R-BAS-005, R-BAS-006, NFR-BAS-001
//
// Tests ClarisaProjectsService through the REAL compiled ClarisaProjectsModule (DD-5, J-F-2).
// Covers: bilateral selection predicates composition, phase resolver delegation,
// single science-programs computation, resilience, cache TTL, and observability.

const bilateralProject = (
  id: number,
  shortName: string,
  leadAcronym: string | null = 'ABC',
): ClarisaProject => ({
  id,
  short_name: shortName,
  source_of_funding: 'Bilateral',
  project_mappings_array: [],
  lead_institution_object:
    leadAcronym === null
      ? null
      : {
          id: 49,
          name: 'Alliance of Bioversity and CIAT',
          acronym: leadAcronym,
        },
});

const window3Project = (id: number, shortName: string): ClarisaProject => ({
  id,
  short_name: shortName,
  source_of_funding: 'Window 3',
  project_mappings_array: [],
});

describe('ClarisaProjectsService', () => {
  let service: ClarisaProjectsService;
  let phaseResolver: MappingPhaseResolver;
  let connectionGet: jest.Mock;
  let mockRepository: {
    findOne: jest.Mock;
  };
  let mockDataSource: {
    getRepository: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    // Build the REAL ClarisaProjectsModule to prove all module providers (including MappingPhaseResolver)
    // are properly registered in the module (Design §11 F-2 gate).
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClarisaProjectsModule,
        {
          module: class MockDbModule {},
          providers: [{ provide: DataSource, useValue: mockDataSource }],
          exports: [DataSource],
          global: true,
        },
      ],
    })
      .overrideProvider(HttpService)
      .useValue({ get: jest.fn(), post: jest.fn() })
      .compile();

    service = module.get(ClarisaProjectsService);
    phaseResolver = module.get(MappingPhaseResolver);

    // Replace the inner Clarisa connection with a stub.
    connectionGet = jest.fn();
    (service as unknown as { connection: { get: jest.Mock } }).connection = {
      get: connectionGet,
    };
    service.resetCacheForTests();
    phaseResolver.resetCacheForTests();
  });

  afterEach(() => jest.clearAllMocks());

  describe('Module Compilation & DI Architecture (NFR-BAS-001, DD-5)', () => {
    it('compiles the real ClarisaProjectsModule with MappingPhaseResolver in providers', () => {
      expect(service).toBeDefined();
      expect(phaseResolver).toBeDefined();
    });
  });

  describe('hasSciencePrograms (R-BAS-004, §7.3 Item 2)', () => {
    it('returns true when project has at least one Confirmed Science Program mapping (code 22)', () => {
      const project: ClarisaProject = {
        id: 1,
        short_name: 'P-WITH-SP',
        source_of_funding: 'Bilateral',
        project_mappings_array: [
          {
            id: 10,
            project_id: 1,
            program_id: 20,
            allocation: 50,
            status: 'Confirmed',
            global_unit_object: {
              id: 20,
              name: 'Plant Health',
              smo_code: 'SP01',
              cgiar_entity_type_object: {
                code: 22,
                name: 'Science programs',
              },
            },
          },
        ],
      };

      expect(service.hasSciencePrograms(project)).toBe(true);
    });

    it('returns true when mapping is Pending and entity code is 22 (R-PSP-003)', () => {
      const project: ClarisaProject = {
        id: 2,
        short_name: 'P-PENDING-SP',
        source_of_funding: 'Bilateral',
        project_mappings_array: [
          {
            id: 11,
            project_id: 2,
            program_id: 20,
            allocation: 50,
            status: 'Pending',
            global_unit_object: {
              id: 20,
              name: 'Plant Health',
              smo_code: 'SP01',
              cgiar_entity_type_object: {
                code: 22,
                name: 'Science programs',
              },
            },
          },
        ],
      };

      expect(service.hasSciencePrograms(project)).toBe(true);
    });

    it('returns false when mapping is Draft or Rejected even if entity code is 22', () => {
      const project: ClarisaProject = {
        id: 2,
        short_name: 'P-REJECTED-SP',
        source_of_funding: 'Bilateral',
        project_mappings_array: [
          {
            id: 11,
            project_id: 2,
            program_id: 20,
            allocation: 50,
            status: 'Rejected',
            global_unit_object: {
              id: 20,
              name: 'Plant Health',
              smo_code: 'SP01',
              cgiar_entity_type_object: {
                code: 22,
                name: 'Science programs',
              },
            },
          },
          {
            id: 12,
            project_id: 2,
            program_id: 21,
            allocation: 50,
            status: 'Draft',
            global_unit_object: {
              id: 21,
              name: 'Crops',
              smo_code: 'SP02',
              cgiar_entity_type_object: {
                code: 22,
                name: 'Science programs',
              },
            },
          },
        ],
      };

      expect(service.hasSciencePrograms(project)).toBe(false);
    });

    it('returns false when mapping is Confirmed but cgiar_entity_type_object code is not 22 (e.g. 26 for AOW)', () => {
      const project: ClarisaProject = {
        id: 3,
        short_name: 'P-AOW-MAPPING',
        source_of_funding: 'Bilateral',
        project_mappings_array: [
          {
            id: 13,
            project_id: 3,
            program_id: 30,
            allocation: 100,
            status: 'Confirmed',
            global_unit_object: {
              id: 30,
              name: 'Area of Work 1',
              smo_code: 'AOW01',
              cgiar_entity_type_object: {
                code: 26,
                name: 'Key Area of Work',
              },
            },
          },
        ],
      };

      expect(service.hasSciencePrograms(project)).toBe(false);
    });

    it('returns false when project_mappings_array is null, undefined, or empty', () => {
      expect(
        service.hasSciencePrograms({
          id: 4,
          short_name: 'P-EMPTY-1',
          source_of_funding: 'Bilateral',
          project_mappings_array: [],
        }),
      ).toBe(false);

      expect(
        service.hasSciencePrograms({
          id: 5,
          short_name: 'P-EMPTY-2',
          source_of_funding: 'Bilateral',
          project_mappings_array: undefined,
        }),
      ).toBe(false);
    });
  });

  describe('listBilateralProjects', () => {
    it('filters to bilateral-family funding led by the Alliance (ABC); the Window 3 row is dropped for lacking Alliance affiliation, not for its funding', async () => {
      connectionGet.mockResolvedValueOnce([
        bilateralProject(1, 'T-PJ-003262'),
        // Window 3 funding is now bilateral-family (R-W3B-001); this row stays
        // ineligible only because it carries no Alliance affiliation.
        window3Project(2, 'N-303008'),
        bilateralProject(3, '1078-CHI0'),
      ]);

      const out = await service.listBilateralProjects();

      expect(out.map((p) => p.id)).toEqual([1, 3]);
      expect(connectionGet).toHaveBeenCalledTimes(1);
      expect(connectionGet).toHaveBeenCalledWith('api/projects');
    });

    it('excludes bilateral projects led by other centers or without lead', async () => {
      connectionGet.mockResolvedValueOnce([
        bilateralProject(1, '3S-ASEAN'),
        bilateralProject(22, '1414-EC00 DESIRA', 'CIP'),
        bilateralProject(30, 'NO-LEAD', null),
      ]);

      const out = await service.listBilateralProjects();

      expect(out.map((p) => p.id)).toEqual([1]);
    });

    it('still resolves non-Alliance projects by id (existing mappings keep rendering)', async () => {
      connectionGet.mockResolvedValueOnce([
        bilateralProject(1, '3S-ASEAN'),
        bilateralProject(22, '1414-EC00 DESIRA', 'CIP'),
      ]);

      expect((await service.findProjectById(22))?.short_name).toBe(
        '1414-EC00 DESIRA',
      );
    });

    it('serves from cache on second call within TTL', async () => {
      connectionGet.mockResolvedValueOnce([bilateralProject(1, 'A')]);

      await service.listBilateralProjects();
      await service.listBilateralProjects();
      await service.findProjectById(1);

      expect(connectionGet).toHaveBeenCalledTimes(1);
    });

    it('bug-mode regression: returns all 30 eligible production-shaped projects across all 11 observed funding spellings without phase or source_center_acronym (R-W3B-001 admits 5 more W3 rows)', async () => {
      const allianceInstitution = {
        id: 49,
        name: 'Alliance of Bioversity and CIAT',
        acronym: 'ABC',
      };
      const allianceInstitutionLongAcronym = {
        id: 49,
        name: 'Alliance of Bioversity and CIAT',
        acronym: 'ABC - Bioversity (Alliance)',
      };

      const productionFixture: ClarisaProject[] = [
        // 1. One project with 'Bilateral' (the only 1 matched by pre-fix code)
        {
          id: 101,
          short_name: 'PROD-01',
          source_of_funding: 'Bilateral',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
        // 2..11. Ten projects with 'BILATERAL - RESTRICTED'
        ...Array.from({ length: 10 }, (_, i) => ({
          id: 200 + i,
          short_name: `PROD-BILATERAL-RESTRICTED-${i + 1}`,
          source_of_funding: 'BILATERAL - RESTRICTED',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        })),
        // 12..24. Thirteen projects with 'Bilateral - Restricted' (mix of ABC and ABC - Bioversity (Alliance))
        ...Array.from({ length: 13 }, (_, i) => ({
          id: 300 + i,
          short_name: `PROD-Bilateral-Restricted-${i + 1}`,
          source_of_funding: 'Bilateral - Restricted',
          lead_institution_object:
            i % 2 === 0 ? allianceInstitution : allianceInstitutionLongAcronym,
          project_mappings_array: [],
        })),
        // 25. One project with 'BILATERAL- RESTRICTED' (no space before dash)
        {
          id: 401,
          short_name: 'PROD-BILATERAL-NO-SPACE',
          source_of_funding: 'BILATERAL- RESTRICTED',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },

        // --- W3-FAMILY ROWS (eligible since R-W3B-001) ---
        {
          id: 501,
          short_name: 'PROD-W3-1',
          source_of_funding: 'Window 3',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
        {
          id: 502,
          short_name: 'PROD-W3-2',
          source_of_funding: 'Window 3 - Restricted',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
        {
          id: 503,
          short_name: 'PROD-W3-3',
          source_of_funding: 'WINDOW 3 - RESTRICTED',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
        {
          id: 504,
          short_name: 'PROD-W3-4',
          source_of_funding: 'Windows 3',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
        {
          id: 505,
          short_name: 'PROD-W3-5',
          source_of_funding: 'W3',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
        // --- NEGATIVE ROWS (Must be excluded) ---
        {
          id: 506,
          short_name: 'PROD-SRV',
          source_of_funding: 'SRV',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },

        // Null / whitespace funding (1 observed in production)
        {
          id: 601,
          short_name: 'PROD-NULL-FUNDING',
          source_of_funding: null as unknown as string,
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
        {
          id: 602,
          short_name: 'PROD-BLANK-FUNDING',
          source_of_funding: '   ',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },

        // Non-Alliance lead institutions
        {
          id: 701,
          short_name: 'PROD-IFPRI',
          source_of_funding: 'BILATERAL - RESTRICTED',
          lead_institution_object: {
            id: 2,
            name: 'International Food Policy Research Institute',
            acronym: 'IFPRI',
          },
          project_mappings_array: [],
        },
        {
          id: 702,
          short_name: 'PROD-ICARDA',
          source_of_funding: 'BILATERAL - RESTRICTED',
          lead_institution_object: {
            id: 3,
            name: 'International Center for Agricultural Research in the Dry Areas',
            acronym: 'ICARDA',
          },
          project_mappings_array: [],
        },
        {
          id: 703,
          short_name: 'PROD-IITA',
          source_of_funding: 'BILATERAL - RESTRICTED',
          lead_institution_object: {
            id: 4,
            name: 'International Institute of Tropical Agriculture',
            acronym: 'IITA',
          },
          project_mappings_array: [],
        },
        {
          id: 704,
          short_name: 'PROD-CIMMYT',
          source_of_funding: 'BILATERAL - RESTRICTED',
          lead_institution_object: {
            id: 5,
            name: 'International Maize and Wheat Improvement Center',
            acronym: 'CIMMYT',
          },
          project_mappings_array: [],
        },
        {
          id: 705,
          short_name: 'PROD-EMPTY-LEAD',
          source_of_funding: 'BILATERAL - RESTRICTED',
          lead_institution_object: {
            id: 6,
            name: 'Unknown Organization',
            acronym: '',
          },
          project_mappings_array: [],
        },
        {
          id: 706,
          short_name: 'PROD-NULL-LEAD',
          source_of_funding: 'BILATERAL - RESTRICTED',
          lead_institution_object: null,
          project_mappings_array: [],
        },

        // Non-Alliance source_center_acronym (even with lead ABC)
        {
          id: 801,
          short_name: 'PROD-IITA-CENTER',
          source_of_funding: 'BILATERAL - RESTRICTED',
          source_center_acronym: 'IITA',
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },

        // Different phase (2025 excluded when target is 2026)
        {
          id: 901,
          short_name: 'PROD-PHASE-2025',
          source_of_funding: 'BILATERAL - RESTRICTED',
          phase: 2025,
          lead_institution_object: allianceInstitution,
          project_mappings_array: [],
        },
      ];

      connectionGet.mockResolvedValueOnce(productionFixture);

      const out = await service.listBilateralProjects();

      expect(out).toHaveLength(30);
    });

    it('attaches has_science_programs boolean to each returned project (R-BAS-004)', async () => {
      const fixture: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-WITH-SP',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          project_mappings_array: [
            {
              id: 10,
              project_id: 1,
              program_id: 20,
              allocation: 50,
              status: 'Confirmed',
              global_unit_object: {
                id: 20,
                name: 'Plant Health',
                smo_code: 'SP01',
                cgiar_entity_type_object: {
                  code: 22,
                  name: 'Science programs',
                },
              },
            },
          ],
        },
        {
          id: 2,
          short_name: 'P-WITHOUT-SP',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          project_mappings_array: [],
        },
      ];

      connectionGet.mockResolvedValueOnce(fixture);

      const out = (await service.listBilateralProjects()) as Array<
        ClarisaProject & { has_science_programs: boolean }
      >;

      expect(out).toHaveLength(2);
      expect(out.find((p) => p.id === 1)?.has_science_programs).toBe(true);
      expect(out.find((p) => p.id === 2)?.has_science_programs).toBe(false);
    });

    it('filters to only projects with science programs when onlyWithSciencePrograms is true (R-BAS-004)', async () => {
      const fixture: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-WITH-SP',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          project_mappings_array: [
            {
              id: 10,
              project_id: 1,
              program_id: 20,
              allocation: 50,
              status: 'Confirmed',
              global_unit_object: {
                id: 20,
                name: 'Plant Health',
                smo_code: 'SP01',
                cgiar_entity_type_object: {
                  code: 22,
                  name: 'Science programs',
                },
              },
            },
          ],
        },
        {
          id: 2,
          short_name: 'P-WITHOUT-SP',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          project_mappings_array: [],
        },
      ];

      connectionGet.mockResolvedValueOnce(fixture);

      const out = await service.listBilateralProjects({
        onlyWithSciencePrograms: true,
      });

      expect(out).toHaveLength(1);
      expect(out[0].id).toBe(1);
    });

    it('filters by explicit phase option when passed in options (R-BAS-003)', async () => {
      const fixture: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-2025',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          phase: 2025,
        },
        {
          id: 2,
          short_name: 'P-2026',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          phase: 2026,
        },
      ];

      connectionGet.mockResolvedValueOnce(fixture);

      const out2025 = await service.listBilateralProjects({ phase: 2025 });
      expect(out2025.map((p) => p.id)).toEqual([1]);
    });

    it('logs a warning naming CLARISA host when zero projects are eligible (R-BAS-006)', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      connectionGet.mockResolvedValueOnce([
        // Window 3 funding is now bilateral-family (R-W3B-001); this row stays
        // ineligible only because it carries no Alliance affiliation.
        window3Project(2, 'N-303008'),
      ]);

      const out = await service.listBilateralProjects();

      expect(out).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Zero eligible bilateral projects found from CLARISA host',
        ),
      );

      warnSpy.mockRestore();
    });
  });

  // @akili-spec docs/specs/bilateral/clarisa-phase-config-variable — T-02 / R-CPC-003, NFR-CPC-002
  //
  // KZ-013: fixtures below encode the 2026-08-18 measurement — CLARISA test
  // served 299 projects, all `phase = 2025`; CLARISA production serves all
  // `phase = null`. If the upstream feed's shape changes, these tests keep
  // passing while reality diverges — see requirements.md K-013.
  describe('getEligiblePhases (R-CPC-003, NFR-CPC-002)', () => {
    it('offers only the phase actually present in the eligible cohort, not an ineligible year (R-CPC-003 scenario 1 — the trap)', async () => {
      connectionGet.mockResolvedValueOnce([
        // Eligible: Bilateral + Alliance, phase 2025 — the only phase that
        // should ever appear in the response.
        {
          id: 1,
          short_name: 'ELIGIBLE-2025-A',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          phase: 2025,
          project_mappings_array: [],
        },
        {
          id: 2,
          short_name: 'ELIGIBLE-2025-B',
          source_of_funding: 'BILATERAL - RESTRICTED',
          source_center_acronym: 'BIOVERSITY',
          phase: 2025,
          project_mappings_array: [],
        },
        // Ineligible (SRV funding — Window 3 no longer qualifies as ineligible
        // after R-W3B-001) but carries phase 2026. If the derivation were
        // circular (i.e. read from listBilateralProjects(), which already
        // applies matchesPhase) or derived from the FULL payload instead of
        // the eligible cohort, 2026 would leak into the result.
        {
          id: 3,
          short_name: 'INELIGIBLE-2026',
          source_of_funding: 'SRV',
          source_center_acronym: 'CIAT',
          phase: 2026,
          project_mappings_array: [],
        },
      ]);

      const result = await service.getEligiblePhases();

      expect(result.phases).toEqual([{ phase: 2025, count: 2 }]);
      expect(result.phases.some((p) => p.phase === 2026)).toBe(false);
    });

    it('omits a year whose projects exist but none are eligible (non-Alliance / non-bilateral)', async () => {
      connectionGet.mockResolvedValueOnce([
        // 2026 has projects, but none pass isBilateralFunding + isAllianceProject.
        {
          id: 10,
          short_name: 'NON-ALLIANCE-2026',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'IITA', // not an Alliance centre
          phase: 2026,
          project_mappings_array: [],
        },
        {
          id: 11,
          short_name: 'NON-BILATERAL-2026',
          source_of_funding: 'SRV', // not bilateral funding (Window 3 no longer qualifies after R-W3B-001)
          source_center_acronym: 'CIAT',
          phase: 2026,
          project_mappings_array: [],
        },
        // 2025 has one genuinely eligible project.
        {
          id: 12,
          short_name: 'ELIGIBLE-2025',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          phase: 2025,
          project_mappings_array: [],
        },
      ]);

      const result = await service.getEligiblePhases();

      expect(result.phases).toEqual([{ phase: 2025, count: 1 }]);
      expect(result.phases.some((p) => p.phase === 2026)).toBe(false);
    });

    it('returns an empty year set AND a non-zero absent-phase count when every eligible project has phase: null (production today, K-013)', async () => {
      connectionGet.mockResolvedValueOnce([
        {
          id: 20,
          short_name: 'PROD-NULL-1',
          source_of_funding: 'BILATERAL - RESTRICTED',
          source_center_acronym: 'CIAT',
          phase: null,
          project_mappings_array: [],
        },
        {
          id: 21,
          short_name: 'PROD-NULL-2',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'BIOVERSITY',
          phase: null,
          project_mappings_array: [],
        },
        // Ineligible project also without a phase — must NOT be counted.
        {
          id: 22,
          short_name: 'NON-ALLIANCE-NULL',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'IITA',
          phase: null,
          project_mappings_array: [],
        },
      ]);

      const result = await service.getEligiblePhases();

      expect(result.phases).toEqual([]);
      expect(result.phaseAbsentCount).toBe(2);
    });

    it('does NOT trigger an additional CLARISA call when served from a warm cache (NFR-CPC-002)', async () => {
      connectionGet.mockResolvedValueOnce([
        {
          id: 30,
          short_name: 'WARM-CACHE-2025',
          source_of_funding: 'Bilateral',
          source_center_acronym: 'CIAT',
          phase: 2025,
          project_mappings_array: [],
        },
      ]);

      // Warm the cache via a different consumer of getCachedAll().
      await service.listBilateralProjects();
      expect(connectionGet).toHaveBeenCalledTimes(1);

      // Phases request must be served from the same warm cache — no
      // additional upstream call.
      const result = await service.getEligiblePhases();

      expect(connectionGet).toHaveBeenCalledTimes(1);
      expect(result.phases).toEqual([{ phase: 2025, count: 1 }]);
    });
  });

  describe('findProjectById', () => {
    it('returns the project when found', async () => {
      connectionGet.mockResolvedValueOnce([
        bilateralProject(1, 'A'),
        bilateralProject(2, 'B'),
      ]);

      const out = await service.findProjectById(2);

      expect(out?.short_name).toBe('B');
    });

    it('returns null when not found', async () => {
      connectionGet.mockResolvedValueOnce([bilateralProject(1, 'A')]);
      expect(await service.findProjectById(999)).toBeNull();
    });

    it('returns null for non-numeric id', async () => {
      expect(await service.findProjectById(Number.NaN)).toBeNull();
      expect(connectionGet).not.toHaveBeenCalled();
    });
  });

  describe('resilience (NFR-BIL-073)', () => {
    it('serves stale cache on upstream error if cache is warm', async () => {
      // Warm the cache.
      connectionGet.mockResolvedValueOnce([bilateralProject(1, 'A')]);
      await service.listBilateralProjects();
      expect(connectionGet).toHaveBeenCalledTimes(1);

      // Force the cache to expire AND make the upstream fail.
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 10 * 60 * 1000);
      connectionGet.mockRejectedValueOnce(new Error('upstream timeout'));

      const out = await service.listBilateralProjects();

      expect(out).toHaveLength(1);
      expect(out[0].id).toBe(1);
    });

    it('throws ServiceUnavailableException on upstream error with cold cache', async () => {
      connectionGet.mockRejectedValueOnce(new Error('upstream down'));

      await expect(service.listBilateralProjects()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  // @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-01 / R-CPA-001
  describe('upstream fields contract (R-CPA-001)', () => {
    it('deserializes fields-absent payload and existing consumers return pre-change results (AC.1)', async () => {
      // Fields-absent fixture: objects literally omit external_code, phase, and source_center_acronym.
      const fieldsAbsentFixture: ClarisaProject[] = [
        {
          id: 101,
          short_name: 'P-LEGACY-01',
          source_of_funding: 'Bilateral',
          project_mappings_array: [],
          lead_institution_object: {
            id: 49,
            name: 'Alliance of Bioversity and CIAT',
            acronym: 'ABC',
          },
        },
        {
          id: 102,
          short_name: 'P-LEGACY-02',
          source_of_funding: 'SRV', // Window 3 no longer qualifies as ineligible after R-W3B-001
          project_mappings_array: [],
          lead_institution_object: {
            id: 49,
            name: 'Alliance of Bioversity and CIAT',
            acronym: 'ABC',
          },
        },
        {
          id: 103,
          short_name: 'P-LEGACY-03',
          source_of_funding: 'Bilateral',
          project_mappings_array: [],
          lead_institution_object: {
            id: 50,
            name: 'International Potato Center',
            acronym: 'CIP',
          },
        },
      ];

      connectionGet.mockResolvedValueOnce(fieldsAbsentFixture);

      // Verify listBilateralProjects consumer
      const bilateral = await service.listBilateralProjects();
      expect(bilateral.map((p) => p.id)).toEqual([101]);
      expect(bilateral[0].short_name).toBe('P-LEGACY-01');
      expect(bilateral[0].external_code).toBeUndefined();
      expect(bilateral[0].phase).toBeUndefined();
      expect(bilateral[0].source_center_acronym).toBeUndefined();

      // Verify findProjectById consumer (from cached data)
      const found = await service.findProjectById(103);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(103);
      expect(found?.short_name).toBe('P-LEGACY-03');
      expect(found?.external_code).toBeUndefined();
      expect(found?.phase).toBeUndefined();
      expect(found?.source_center_acronym).toBeUndefined();
    });

    it('exposes external_code, phase, and source_center_acronym when present upstream (AC.2)', async () => {
      const fieldsPresentFixture: ClarisaProject[] = [
        {
          id: 201,
          short_name: 'P-UPSTREAM-01',
          source_of_funding: 'Bilateral',
          external_code: 'B-1001',
          phase: 2026,
          source_center_acronym: 'CIAT',
          project_mappings_array: [],
          lead_institution_object: {
            id: 49,
            name: 'Alliance of Bioversity and CIAT',
            acronym: 'ABC',
          },
        },
        {
          id: 202,
          short_name: 'P-UPSTREAM-02',
          source_of_funding: 'Bilateral',
          external_code: null,
          phase: '2026',
          source_center_acronym: 'BIOVERSITY',
          project_mappings_array: [],
          lead_institution_object: {
            id: 49,
            name: 'Alliance of Bioversity and CIAT',
            acronym: 'ABC',
          },
        },
      ];

      connectionGet.mockResolvedValueOnce(fieldsPresentFixture);

      const bilateral = await service.listBilateralProjects();
      expect(bilateral.map((p) => p.id)).toEqual([201, 202]);
      expect(bilateral[0].external_code).toBe('B-1001');
      expect(bilateral[0].phase).toBe(2026);
      expect(bilateral[0].source_center_acronym).toBe('CIAT');
      expect(bilateral[1].external_code).toBeNull();
      expect(bilateral[1].phase).toBe('2026');
      expect(bilateral[1].source_center_acronym).toBe('BIOVERSITY');
    });

    it('regression: listBilateralProjects returns an identical pinned id set before and after change (AC.3)', async () => {
      const regressionFixture: ClarisaProject[] = [
        bilateralProject(501, 'P-ABC-1', 'ABC'),
        bilateralProject(502, 'P-CIP-1', 'CIP'),
        window3Project(503, 'P-W3-1'),
        bilateralProject(504, 'P-NO-LEAD', null),
        bilateralProject(505, 'P-ABC-2', 'ABC'),
      ];

      connectionGet.mockResolvedValueOnce(regressionFixture);

      const out = await service.listBilateralProjects();

      // Pins the exact expected project ids to go red if filtering logic changes
      expect(out.map((p) => p.id)).toEqual([501, 505]);
    });
  });

  // @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-02 / R-CPA-002
  describe('listProjectsForCoverage (R-CPA-002)', () => {
    it('includes mixed-case and whitespace-padded Alliance centres (ciat, Bioversity, CIAT ) (AC.1)', async () => {
      const mixedCaseFixture: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-CIAT-LOWER',
          source_center_acronym: 'ciat',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
        {
          id: 2,
          short_name: 'P-BIO-TITLE',
          source_center_acronym: 'Bioversity',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
        {
          id: 3,
          short_name: 'P-CIAT-SPACE',
          source_center_acronym: 'CIAT ',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
      ];

      connectionGet.mockResolvedValueOnce(mixedCaseFixture);

      const { all, slice, phaseUsed } = await service.listProjectsForCoverage();

      expect(all).toHaveLength(3);
      expect(slice.map((p) => p.id)).toEqual([1, 2, 3]);
      expect(phaseUsed).toBe(2026);
    });

    it('matches phase numerically across number and string representations and excludes wrong phase (AC.2)', async () => {
      const phaseFixture: ClarisaProject[] = [
        {
          id: 10,
          short_name: 'P-NUM-2026',
          source_center_acronym: 'CIAT',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
        {
          id: 20,
          short_name: 'P-STR-2026',
          source_center_acronym: 'BIOVERSITY',
          phase: '2026',
          source_of_funding: 'Bilateral',
        },
        {
          id: 30,
          short_name: 'P-NUM-2025',
          source_center_acronym: 'CIAT',
          phase: 2025,
          source_of_funding: 'Bilateral',
        },
      ];

      connectionGet.mockResolvedValueOnce(phaseFixture);

      const { all, slice, phaseUsed } =
        await service.listProjectsForCoverage(2026);

      expect(all).toHaveLength(3);
      expect(slice.map((p) => p.id)).toEqual([10, 20]);
      expect(phaseUsed).toBe(2026);
    });

    it('excludes projects from non-Alliance centres regardless of matching phase (AC.3)', async () => {
      const nonAllianceFixture: ClarisaProject[] = [
        {
          id: 40,
          short_name: 'P-CIP-2026',
          source_center_acronym: 'CIP',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
        {
          id: 41,
          short_name: 'P-IFPRI-2026',
          source_center_acronym: 'IFPRI',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
        {
          id: 42,
          short_name: 'P-ALLIANCE-2026',
          source_center_acronym: 'CIAT',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
      ];

      connectionGet.mockResolvedValueOnce(nonAllianceFixture);

      const { slice, phaseUsed } = await service.listProjectsForCoverage();

      expect(slice.map((p) => p.id)).toEqual([42]);
      expect(phaseUsed).toBe(2026);
    });

    it('resolves phase via ARI_CLARISA_PROJECTS_PHASE env var when caller phase is omitted (AC.4)', async () => {
      const multiPhaseFixture: ClarisaProject[] = [
        {
          id: 50,
          short_name: 'P-2025',
          source_center_acronym: 'CIAT',
          phase: 2025,
          source_of_funding: 'Bilateral',
        },
        {
          id: 51,
          short_name: 'P-2026',
          source_center_acronym: 'CIAT',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
      ];

      const originalEnv = process.env.ARI_CLARISA_PROJECTS_PHASE;
      try {
        process.env.ARI_CLARISA_PROJECTS_PHASE = '2025';
        connectionGet.mockResolvedValueOnce(multiPhaseFixture);

        const { slice, phaseUsed } = await service.listProjectsForCoverage();

        expect(slice.map((p) => p.id)).toEqual([50]);
        expect(phaseUsed).toBe(2025);
      } finally {
        if (originalEnv !== undefined) {
          process.env.ARI_CLARISA_PROJECTS_PHASE = originalEnv;
        } else {
          delete process.env.ARI_CLARISA_PROJECTS_PHASE;
        }
      }
    });

    it('allows caller argument to override ARI_CLARISA_PROJECTS_PHASE env var', async () => {
      const multiPhaseFixture: ClarisaProject[] = [
        {
          id: 60,
          short_name: 'P-2025',
          source_center_acronym: 'CIAT',
          phase: 2025,
          source_of_funding: 'Bilateral',
        },
        {
          id: 61,
          short_name: 'P-2026',
          source_center_acronym: 'BIOVERSITY',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
      ];

      const originalEnv = process.env.ARI_CLARISA_PROJECTS_PHASE;
      try {
        process.env.ARI_CLARISA_PROJECTS_PHASE = '2025';
        connectionGet.mockResolvedValueOnce(multiPhaseFixture);

        const { slice, phaseUsed } =
          await service.listProjectsForCoverage(2026);

        expect(slice.map((p) => p.id)).toEqual([61]);
        expect(phaseUsed).toBe(2026);
      } finally {
        if (originalEnv !== undefined) {
          process.env.ARI_CLARISA_PROJECTS_PHASE = originalEnv;
        } else {
          delete process.env.ARI_CLARISA_PROJECTS_PHASE;
        }
      }
    });

    it('rejects with BadRequestException when caller passes non-numeric phase argument', async () => {
      await expect(service.listProjectsForCoverage('abc')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.listProjectsForCoverage('abc')).rejects.toThrow(
        'Invalid phase "abc": must be a numeric value.',
      );
    });

    it('does NOT filter by source_of_funding or project_mappings_array, retaining window3 and empty mappings (DD-2)', async () => {
      const fundingFixture: ClarisaProject[] = [
        {
          id: 70,
          short_name: 'P-BILATERAL',
          source_center_acronym: 'CIAT',
          phase: 2026,
          source_of_funding: 'Bilateral',
          project_mappings_array: [],
        },
        {
          id: 71,
          short_name: 'P-WINDOW3',
          source_center_acronym: 'BIOVERSITY',
          phase: 2026,
          source_of_funding: 'Window 3',
          project_mappings_array: undefined,
        },
        {
          id: 72,
          short_name: 'P-OTHER-FUNDING',
          source_center_acronym: 'CIAT',
          phase: 2026,
          source_of_funding: 'BILATERAL - RESTRICTED',
          project_mappings_array: [],
        },
      ];

      connectionGet.mockResolvedValueOnce(fundingFixture);

      const { slice, phaseUsed } = await service.listProjectsForCoverage();

      expect(slice.map((p) => p.id)).toEqual([70, 71, 72]);
      expect(phaseUsed).toBe(2026);
    });

    it('returns unfiltered all payload, filtered slice, and resolved phaseUsed (DD-14)', async () => {
      const fullFixture: ClarisaProject[] = [
        {
          id: 80,
          short_name: 'P-ALLIANCE-2026',
          source_center_acronym: 'CIAT',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
        {
          id: 81,
          short_name: 'P-CIP-2026',
          source_center_acronym: 'CIP',
          phase: 2026,
          source_of_funding: 'Bilateral',
        },
        {
          id: 82,
          short_name: 'P-ALLIANCE-2025',
          source_center_acronym: 'BIOVERSITY',
          phase: 2025,
          source_of_funding: 'Bilateral',
        },
      ];

      connectionGet.mockResolvedValueOnce(fullFixture);

      const result = await service.listProjectsForCoverage(2026);

      expect(result.all).toHaveLength(3);
      expect(result.all.map((p) => p.id)).toEqual([80, 81, 82]);
      expect(result.slice).toHaveLength(1);
      expect(result.slice.map((p) => p.id)).toEqual([80]);
      expect(result.phaseUsed).toBe(2026);
    });
  });

  // @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 rework /
  // design.md §7, K-016. The falsifier this whole block exists to kill:
  // `getCacheFetchedAt() { return Date.now(); }` — every run report would
  // then claim a perfectly fresh feed regardless of the real cache age,
  // exactly the staleness lie K-016/RB-6 exist to surface. A Date.now()
  // stand-in also passes a naive "returns a number" test, so the gate here
  // is that the SAME stored value comes back across repeated calls (a
  // live Date.now() would drift), and that it is a timestamp from the
  // PAST relative to a later real Date.now() call.
  describe('getCacheFetchedAt (T-05 §7, K-016)', () => {
    it('returns null on a cold cache', () => {
      expect(service.getCacheFetchedAt()).toBeNull();
    });

    it('returns the recorded fetch time after the cache fills, unchanged across repeated calls within the TTL, and strictly before a later real Date.now()', async () => {
      const fetchTime = 1_700_000_000_000;
      connectionGet.mockResolvedValueOnce([bilateralProject(1, 'A')]);

      // Pin Date.now() ONLY for the duration of the cache-filling call, so
      // both listBilateralProjects()'s own Date.now() read and any ambient
      // phase-resolution Date.now() read see the same fixed instant —
      // avoids coupling this test to which of the two calls Date.now()
      // first internally. try/finally: if the awaited call ever throws
      // while the spy is installed, Date.now must not stay pinned for
      // every later test in this file (T-05 rework, closer #3).
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fetchTime);
      try {
        await service.listBilateralProjects();
      } finally {
        nowSpy.mockRestore();
      }

      const first = service.getCacheFetchedAt();
      const second = service.getCacheFetchedAt();

      // A live Date.now() stand-in would return a DIFFERENT value on each
      // call (real wall-clock time keeps advancing); the real cache-backed
      // getter returns the SAME stored fetchedAt both times.
      expect(first).toBe(fetchTime);
      expect(second).toBe(fetchTime);
      expect(second).toBeLessThan(Date.now());
    });
  });

  describe('Observability & Branch Logging (R-BAS-006, §7.3)', () => {
    it('logs debug with branch counts on cache refresh', async () => {
      const debugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation(() => {});

      const fixture: ClarisaProject[] = [
        {
          id: 1,
          short_name: 'P-1',
          source_center_acronym: 'CIAT',
          source_of_funding: 'Bilateral',
        },
        {
          id: 2,
          short_name: 'P-2',
          source_center_acronym: null,
          lead_institution_object: {
            id: 49,
            name: 'Alliance',
            acronym: 'ABC',
          },
          source_of_funding: 'Bilateral',
        },
      ];

      connectionGet.mockResolvedValueOnce(fixture);

      await service.listBilateralProjects();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'cache refreshed (2 projects: 1 via source_center_acronym, 1 via legacy lead acronym)',
        ),
      );

      debugSpy.mockRestore();
    });
  });
});

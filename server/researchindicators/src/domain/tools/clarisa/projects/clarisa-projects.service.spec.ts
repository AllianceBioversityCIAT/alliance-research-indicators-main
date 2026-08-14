import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProject } from './dto/clarisa-project.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.10 / NFR-BIL-073
//
// Covers: bilateral filter, cache hit, warm-cache-on-error, cold-503.
// The underlying Clarisa connection is a tiny class instantiated inside
// the service constructor with `new Clarisa(http)`. We stub the connection
// instance directly via the service's private field rather than mocking
// the whole HttpService — keeps the test focused on caching + resilience
// rather than HTTP wire details.

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
  let connectionGet: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaProjectsService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
      ],
    }).compile();

    service = module.get(ClarisaProjectsService);

    // Replace the inner Clarisa connection with a stub. The service holds
    // `private readonly connection: Clarisa`; we intercept the .get path
    // since that's the only method exercised here.
    connectionGet = jest.fn();
    (service as unknown as { connection: { get: jest.Mock } }).connection = {
      get: connectionGet,
    };
    service.resetCacheForTests();
  });

  afterEach(() => jest.clearAllMocks());

  describe('listBilateralProjects', () => {
    it('filters to source_of_funding === "Bilateral" led by the Alliance (ABC)', async () => {
      connectionGet.mockResolvedValueOnce([
        bilateralProject(1, 'T-PJ-003262'),
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
          source_of_funding: 'Window 3',
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

    it('rejects with BadRequestException when ARI_CLARISA_PROJECTS_PHASE env var is non-numeric', async () => {
      const originalEnv = process.env.ARI_CLARISA_PROJECTS_PHASE;
      try {
        process.env.ARI_CLARISA_PROJECTS_PHASE = 'invalid-phase';

        await expect(service.listProjectsForCoverage()).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.listProjectsForCoverage()).rejects.toThrow(
          'Invalid ARI_CLARISA_PROJECTS_PHASE "invalid-phase": must be a numeric value.',
        );
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
});

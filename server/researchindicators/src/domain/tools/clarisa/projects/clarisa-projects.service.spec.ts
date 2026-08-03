import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
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
});

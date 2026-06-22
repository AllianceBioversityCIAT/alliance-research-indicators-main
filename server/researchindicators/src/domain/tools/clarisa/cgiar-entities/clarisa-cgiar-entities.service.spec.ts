import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { ClarisaCgiarEntitiesService } from './clarisa-cgiar-entities.service';
import { ClarisaCgiarEntity } from './dto/clarisa-cgiar-entity.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / NFR-BIL-073
//
// Covers: SP→AOW grouping, active/level/type filtering, deterministic order,
// cache hit, warm-cache-on-error, cold-503. The underlying Clarisa connection
// is instantiated inside the constructor with `new Clarisa(http)`; we stub the
// connection instance directly, mirroring clarisa-projects.service.spec.ts.

const spEntity = (code: string): ClarisaCgiarEntity => ({
  code,
  name: `Program ${code}`,
  compose_code: code,
  level: 1,
  is_active: 1,
  entity_type: { code: 22, name: 'Science programs' },
});

const aowEntity = (
  parent: string,
  code: string,
  opts: { name?: string; isActive?: number | boolean } = {},
): ClarisaCgiarEntity => ({
  code,
  name: opts.name ?? code,
  compose_code: `${parent}-${code}`,
  level: 2,
  is_active: opts.isActive ?? 1,
  entity_type: { code: 26, name: 'Key Area of Work' },
  parent: { code: parent, name: `Program ${parent}` },
});

describe('ClarisaCgiarEntitiesService', () => {
  let service: ClarisaCgiarEntitiesService;
  let connectionGet: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaCgiarEntitiesService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
      ],
    }).compile();

    service = module.get(ClarisaCgiarEntitiesService);

    connectionGet = jest.fn();
    (service as unknown as { connection: { get: jest.Mock } }).connection = {
      get: connectionGet,
    };
    service.resetCacheForTests();
  });

  afterEach(() => jest.clearAllMocks());

  describe('getAreasOfWorkBySp', () => {
    it('groups active AOWs under their parent SP code, sorted by AOW code', async () => {
      connectionGet.mockResolvedValueOnce([
        spEntity('SP02'),
        aowEntity('SP02', 'AOW03', { name: 'Integrated Solutions' }),
        aowEntity('SP02', 'AOW01'),
        aowEntity('SP06', 'AOW02'),
      ]);

      const out = await service.getAreasOfWorkBySp(['SP02', 'SP06']);

      expect(connectionGet).toHaveBeenCalledWith(
        'api/cgiar-entities?version=2',
      );
      expect(out.get('SP02')).toEqual([
        { code: 'AOW01', name: 'AOW01', composite_code: 'SP02-AOW01' },
        {
          code: 'AOW03',
          name: 'Integrated Solutions',
          composite_code: 'SP02-AOW03',
        },
      ]);
      expect(out.get('SP06')).toEqual([
        { code: 'AOW02', name: 'AOW02', composite_code: 'SP06-AOW02' },
      ]);
    });

    it('omits SP codes that were not requested', async () => {
      connectionGet.mockResolvedValueOnce([
        aowEntity('SP02', 'AOW01'),
        aowEntity('SP06', 'AOW02'),
      ]);

      const out = await service.getAreasOfWorkBySp(['SP02']);

      expect([...out.keys()]).toEqual(['SP02']);
    });

    it('skips inactive AOWs, level-1 entries, and non-AOW entity types', async () => {
      connectionGet.mockResolvedValueOnce([
        spEntity('SP02'), // level 1 → not an AOW
        aowEntity('SP02', 'AOW01'),
        aowEntity('SP02', 'AOW09', { isActive: 0 }), // inactive → skip
        {
          code: 'X',
          name: 'Other',
          compose_code: 'SP02-X',
          level: 2,
          is_active: 1,
          entity_type: { code: 24, name: 'Accelerators' }, // not a Key Area of Work
          parent: { code: 'SP02', name: 'Program SP02' },
        } as ClarisaCgiarEntity,
      ]);

      const out = await service.getAreasOfWorkBySp(['SP02']);

      expect(out.get('SP02')?.map((a) => a.code)).toEqual(['AOW01']);
    });

    it('returns an empty map without fetching for empty input', async () => {
      const out = await service.getAreasOfWorkBySp([]);
      expect(out.size).toBe(0);
      expect(connectionGet).not.toHaveBeenCalled();
    });

    it('serves from cache on second call within TTL', async () => {
      connectionGet.mockResolvedValueOnce([aowEntity('SP02', 'AOW01')]);

      await service.getAreasOfWorkBySp(['SP02']);
      await service.getAreasOfWorkBySp(['SP02']);

      expect(connectionGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('resilience (NFR-BIL-073)', () => {
    it('serves stale cache on upstream error if cache is warm', async () => {
      connectionGet.mockResolvedValueOnce([aowEntity('SP02', 'AOW01')]);
      await service.getAreasOfWorkBySp(['SP02']);
      expect(connectionGet).toHaveBeenCalledTimes(1);

      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 10 * 60 * 1000);
      connectionGet.mockRejectedValueOnce(new Error('upstream timeout'));

      const out = await service.getAreasOfWorkBySp(['SP02']);
      expect(out.get('SP02')?.map((a) => a.code)).toEqual(['AOW01']);
    });

    it('throws ServiceUnavailableException on upstream error with cold cache', async () => {
      connectionGet.mockRejectedValueOnce(new Error('upstream down'));

      await expect(service.getAreasOfWorkBySp(['SP02'])).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});

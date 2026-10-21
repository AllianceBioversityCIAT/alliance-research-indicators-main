import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TocIntegrationService } from './toc-integration.service';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { TocIntegrationEnvelope, TocLevel } from './dto/toc-integration.types';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-01 / R-BIL-090, NFR-BIL-090..092
//
// Covers: happy path, cache hit + TTL expiry (fake timers), warm-stale serve
// on upstream failure (+ warn log), cold-cache 503 (+ error log), empty
// `{"response":[]}` caching, sps×levels fan-out call count, missing-host
// config 503. The upstream is a single no-auth GET — we stub HttpService.get
// and assert on call args and behavior.

const TTL_MS = 5 * 60 * 1000;

const envelopeFor = (
  sp: string,
  level: TocLevel,
  tocResultIds: number[] = [],
): TocIntegrationEnvelope => ({
  response: tocResultIds.map((id) => ({
    toc_result_id: id,
    toc_internal_id: `uuid-${id}`,
    title: `HLO1.AOW1.IO1 ToC result ${id}`,
    description: 'desc',
    toc_type_id: null,
    toc_level_id: null,
    official_code: sp,
    work_package_id: 'wp-uuid',
    wp_short_name: level === 'EOI' ? null : 'AOW01',
    phase: 'phase-uuid',
    version_id: 'version-uuid',
    indicators: [
      {
        indicator_id: id * 10,
        toc_result_indicator_id: `ind-uuid-${id}`,
        related_node_id: 'node-uuid',
        indicator_description: 'indicator desc',
        unit_messurament: 'Number',
        type_value: 'Number of knowledge products',
        type_name: 'Number of knowledge products',
        location: 'global',
        targets: [{ target_value: '10', target_date: '2026' }],
      },
    ],
  })),
});

describe('TocIntegrationService', () => {
  let service: TocIntegrationService;
  let httpGet: jest.Mock;
  const originalHost = process.env.ARI_TOC_INTEGRATION_HOST;

  beforeEach(async () => {
    process.env.ARI_TOC_INTEGRATION_HOST =
      'https://lambda-toc.clarisa.cgiar.org';
    httpGet = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TocIntegrationService,
        { provide: HttpService, useValue: { get: httpGet } },
      ],
    }).compile();

    service = module.get(TocIntegrationService);
    service.resetCacheForTests();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    process.env.ARI_TOC_INTEGRATION_HOST = originalHost;
  });

  describe('getTocResults', () => {
    it('calls the upstream with the right URL and returns the inner response array', async () => {
      httpGet.mockReturnValueOnce(
        of({ data: envelopeFor('SP01', 'OUTPUT', [5187]) }),
      );

      const out = await service.getTocResults('SP01', 'OUTPUT', 2026);

      expect(httpGet).toHaveBeenCalledTimes(1);
      expect(httpGet).toHaveBeenCalledWith(
        'https://lambda-toc.clarisa.cgiar.org/api/toc-integration/toc/results/category/OUTPUT/initiative/SP01?year=2026',
      );
      expect(out).toHaveLength(1);
      expect(out[0].toc_result_id).toBe(5187);
      expect(out[0].indicators[0].unit_messurament).toBe('Number');
    });

    // @sdd-spec docs/specs/bilateral/pool-funding-reporting-year — T-02 / R-PRY-002
    it('puts the caller year on the lambda-toc URL', async () => {
      httpGet.mockReturnValueOnce(
        of({ data: envelopeFor('SP01', 'OUTPUT', [5187]) }),
      );

      await service.getTocResults('SP01', 'OUTPUT', 2027);

      expect(httpGet).toHaveBeenCalledWith(
        'https://lambda-toc.clarisa.cgiar.org/api/toc-integration/toc/results/category/OUTPUT/initiative/SP01?year=2027',
      );
    });

    it('refetches when the year changes and returns that year payload', async () => {
      httpGet.mockImplementation((url: string) => {
        const year = new URL(url).searchParams.get('year');
        const id = year === '2027' ? 2027 : 2026;
        return of({ data: envelopeFor('SP01', 'OUTPUT', [id]) });
      });

      const yearA = await service.getTocResults('SP01', 'OUTPUT', 2026);
      const yearB = await service.getTocResults('SP01', 'OUTPUT', 2027);

      expect(httpGet).toHaveBeenCalledTimes(2);
      expect(yearA[0].toc_result_id).toBe(2026);
      expect(yearB[0].toc_result_id).toBe(2027);
    });

    it('serves from cache within TTL and refetches after TTL expiry (fake timers)', async () => {
      jest.useFakeTimers();
      httpGet.mockReturnValue(of({ data: envelopeFor('SP01', 'OUTPUT', [1]) }));

      await service.getTocResults('SP01', 'OUTPUT', 2026);
      expect(httpGet).toHaveBeenCalledTimes(1);

      // Fresh hit — within TTL, zero HTTP.
      jest.advanceTimersByTime(TTL_MS - 1000);
      await service.getTocResults('SP01', 'OUTPUT', 2026);
      expect(httpGet).toHaveBeenCalledTimes(1);

      // After >5 min total, the entry is stale — a new HTTP call is made.
      jest.advanceTimersByTime(2000);
      await service.getTocResults('SP01', 'OUTPUT', 2026);
      expect(httpGet).toHaveBeenCalledTimes(2);
    });

    it('keys cache per (sp, level) pair', async () => {
      httpGet
        .mockReturnValueOnce(of({ data: envelopeFor('SP01', 'OUTPUT', [1]) }))
        .mockReturnValueOnce(of({ data: envelopeFor('SP01', 'OUTCOME', [2]) }));

      const a = await service.getTocResults('SP01', 'OUTPUT', 2026);
      const b = await service.getTocResults('SP01', 'OUTCOME', 2026);

      expect(a[0].toc_result_id).toBe(1);
      expect(b[0].toc_result_id).toBe(2);
      expect(httpGet).toHaveBeenCalledTimes(2);
    });

    it('throws 503 when sp or level is missing', async () => {
      await expect(
        service.getTocResults('', 'OUTPUT', 2026),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(
        service.getTocResults('SP01', '' as TocLevel, 2026),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('throws 503 when ARI_TOC_INTEGRATION_HOST is missing', async () => {
      delete process.env.ARI_TOC_INTEGRATION_HOST;
      await expect(
        service.getTocResults('SP01', 'OUTPUT', 2026),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });

  describe('resilience (NFR-BIL-090/092)', () => {
    it('serves stale cache on upstream error if cache is warm and logs a warn with sp/level/status', async () => {
      jest.useFakeTimers();
      const warnSpy = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);

      httpGet.mockReturnValueOnce(
        of({ data: envelopeFor('SP01', 'OUTPUT', [1]) }),
      );
      await service.getTocResults('SP01', 'OUTPUT', 2026);
      expect(httpGet).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(TTL_MS + 1000);
      httpGet.mockReturnValueOnce(
        throwError(() => ({
          message: 'upstream timeout',
          response: { status: 502 },
        })),
      );

      const out = await service.getTocResults('SP01', 'OUTPUT', 2026);

      expect(out).toHaveLength(1);
      expect(out[0].toc_result_id).toBe(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sp=SP01'));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('level=OUTPUT'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('status=502'),
      );
    });

    it('throws ServiceUnavailableException on upstream error with cold cache and logs an error', async () => {
      const errorSpy = jest
        .spyOn(LoggerUtil.prototype, '_error')
        .mockImplementation(() => undefined);
      httpGet.mockReturnValueOnce(throwError(() => new Error('upstream down')));

      await expect(
        service.getTocResults('SP01', 'OUTPUT', 2026),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('cold cache'),
      );
    });

    it('caches an empty {"response":[]} payload as a valid empty catalog (no re-probe within TTL)', async () => {
      httpGet.mockReturnValueOnce(of({ data: { response: [] } }));

      const first = await service.getTocResults('SP01', 'EOI', 2026);
      const second = await service.getTocResults('SP01', 'EOI', 2026);

      expect(first).toEqual([]);
      expect(second).toEqual([]);
      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('treats a missing/non-array response as an upstream failure (cold cache → 503)', async () => {
      httpGet.mockReturnValueOnce(of({ data: {} as TocIntegrationEnvelope }));

      await expect(
        service.getTocResults('SP01', 'OUTPUT', 2026),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('getTocResultsForSps (NFR-BIL-091)', () => {
    it('fans out exactly sps×levels upstream calls and keys the map `${sp}:${level}`', async () => {
      httpGet.mockImplementation((url: string) => {
        const match = /category\/(\w+)\/initiative\/(\w+)/.exec(url);
        const [, level, sp] = match ?? [];
        return of({
          data: envelopeFor(sp, level as TocLevel, [sp === 'SP01' ? 1 : 3]),
        });
      });

      const out = await service.getTocResultsForSps(
        ['SP01', 'SP03'],
        ['OUTPUT', 'OUTCOME'],
        2026,
      );

      expect(httpGet).toHaveBeenCalledTimes(4);
      expect([...out.keys()].sort()).toEqual([
        'SP01:OUTCOME',
        'SP01:OUTPUT',
        'SP03:OUTCOME',
        'SP03:OUTPUT',
      ]);
      expect(out.get('SP01:OUTPUT')?.[0]?.official_code).toBe('SP01');
      expect(out.get('SP03:OUTCOME')?.[0]?.official_code).toBe('SP03');
    });

    it('respects the cache: a second fan-out within TTL performs zero HTTP calls', async () => {
      httpGet.mockImplementation(() =>
        of({ data: envelopeFor('SP01', 'OUTPUT', [1]) }),
      );

      await service.getTocResultsForSps(
        ['SP01', 'SP03'],
        ['OUTPUT', 'OUTCOME'],
        2026,
      );
      expect(httpGet).toHaveBeenCalledTimes(4);

      const out = await service.getTocResultsForSps(
        ['SP01', 'SP03'],
        ['OUTPUT', 'OUTCOME'],
        2026,
      );
      expect(httpGet).toHaveBeenCalledTimes(4);
      expect(out.size).toBe(4);
    });

    it('keeps the public Map key as sp:level for a non-default year', async () => {
      httpGet.mockImplementation((url: string) => {
        const year = new URL(url).searchParams.get('year');
        const id = year === '2027' ? 77 : 66;
        return of({ data: envelopeFor('SP01', 'OUTPUT', [id]) });
      });

      const out = await service.getTocResultsForSps(['SP01'], ['OUTPUT'], 2027);

      expect([...out.keys()]).toEqual(['SP01:OUTPUT']);
      expect(out.get('SP01:OUTPUT')?.[0].toc_result_id).toBe(77);
      expect(httpGet).toHaveBeenCalledWith(
        'https://lambda-toc.clarisa.cgiar.org/api/toc-integration/toc/results/category/OUTPUT/initiative/SP01?year=2027',
      );
    });

    it('returns an empty map for empty input without calling upstream', async () => {
      const noSps = await service.getTocResultsForSps([], ['OUTPUT'], 2026);
      const noLevels = await service.getTocResultsForSps(['SP01'], [], 2026);

      expect(noSps.size).toBe(0);
      expect(noLevels.size).toBe(0);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PrmsTocService } from './prms-toc.service';
import { PrmsTocEnvelope } from './dto/prms-toc.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / NFR-BIL-073
//
// Covers: happy path, cache hit, warm-cache-on-error, cold-503, batch helper,
// missing-host config 503. The upstream is a single GET against a public
// endpoint — we stub HttpService.get and assert on call args and behavior.

const envelopeFor = (
  program: string,
  areaOfWork: string,
  outcomeIds: number[] = [],
): PrmsTocEnvelope => ({
  response: {
    compositeCode: `${program}-${areaOfWork}`,
    year: 2025,
    tocResultsOutcomes: outcomeIds.map((id) => ({
      toc_result_id: id,
      category: 'OUTCOME',
      result_title: `Outcome ${id}`,
      indicators: [],
    })),
    tocResultsOutputs: [],
    metadata: {
      total: outcomeIds.length,
      outcomes: outcomeIds.length,
      outputs: 0,
    },
  },
  statusCode: 200,
  message: 'ok',
});

describe('PrmsTocService', () => {
  let service: PrmsTocService;
  let httpGet: jest.Mock;
  const originalHost = process.env.ARI_PRMS_TOC_HOST;

  beforeEach(async () => {
    process.env.ARI_PRMS_TOC_HOST = 'https://prtest-back.ciat.cgiar.org';
    httpGet = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrmsTocService,
        { provide: HttpService, useValue: { get: httpGet } },
      ],
    }).compile();

    service = module.get(PrmsTocService);
    service.resetCacheForTests();
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.ARI_PRMS_TOC_HOST = originalHost;
  });

  describe('getTocResults', () => {
    it('calls the upstream with the right URL + params and returns the inner response', async () => {
      httpGet.mockReturnValueOnce(
        of({ data: envelopeFor('SP02', 'AOW03', [6313]) }),
      );

      const out = await service.getTocResults('SP02', 'AOW03');

      expect(httpGet).toHaveBeenCalledTimes(1);
      expect(httpGet).toHaveBeenCalledWith(
        'https://prtest-back.ciat.cgiar.org/api/public-results-framework/toc-results',
        { params: { program: 'SP02', areaOfWork: 'AOW03' } },
      );
      expect(out.compositeCode).toBe('SP02-AOW03');
      expect(out.tocResultsOutcomes).toHaveLength(1);
      expect(out.tocResultsOutcomes?.[0]?.toc_result_id).toBe(6313);
    });

    it('serves from cache on second call within TTL', async () => {
      httpGet.mockReturnValueOnce(
        of({ data: envelopeFor('SP02', 'AOW03', [1]) }),
      );

      await service.getTocResults('SP02', 'AOW03');
      await service.getTocResults('SP02', 'AOW03');

      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('keys cache per (program, areaOfWork) pair', async () => {
      httpGet
        .mockReturnValueOnce(of({ data: envelopeFor('SP02', 'AOW03', [1]) }))
        .mockReturnValueOnce(of({ data: envelopeFor('SP09', 'AOW01', [2]) }));

      const a = await service.getTocResults('SP02', 'AOW03');
      const b = await service.getTocResults('SP09', 'AOW01');

      expect(a.compositeCode).toBe('SP02-AOW03');
      expect(b.compositeCode).toBe('SP09-AOW01');
      expect(httpGet).toHaveBeenCalledTimes(2);
    });

    it('trims whitespace on inputs', async () => {
      httpGet.mockReturnValueOnce(
        of({ data: envelopeFor('SP02', 'AOW03', [1]) }),
      );

      await service.getTocResults('  SP02 ', '  AOW03  ');

      expect(httpGet).toHaveBeenCalledWith(expect.any(String), {
        params: { program: 'SP02', areaOfWork: 'AOW03' },
      });
    });

    it('throws 503 when program or areaOfWork is missing', async () => {
      await expect(service.getTocResults('', 'AOW03')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(service.getTocResults('SP02', '')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('throws 503 when ARI_PRMS_TOC_HOST is missing', async () => {
      delete process.env.ARI_PRMS_TOC_HOST;
      await expect(
        service.getTocResults('SP02', 'AOW03'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });

  describe('resilience (NFR-BIL-073)', () => {
    it('serves stale cache on upstream error if cache is warm', async () => {
      httpGet.mockReturnValueOnce(
        of({ data: envelopeFor('SP02', 'AOW03', [1]) }),
      );
      await service.getTocResults('SP02', 'AOW03');
      expect(httpGet).toHaveBeenCalledTimes(1);

      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 10 * 60 * 1000);
      httpGet.mockReturnValueOnce(
        throwError(() => new Error('upstream timeout')),
      );

      const out = await service.getTocResults('SP02', 'AOW03');
      expect(out.compositeCode).toBe('SP02-AOW03');
      expect(out.tocResultsOutcomes).toHaveLength(1);
    });

    it('throws ServiceUnavailableException on upstream error with cold cache', async () => {
      httpGet.mockReturnValueOnce(throwError(() => new Error('upstream down')));

      await expect(
        service.getTocResults('SP02', 'AOW03'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('treats an empty response payload as an upstream failure', async () => {
      httpGet.mockReturnValueOnce(of({ data: {} as PrmsTocEnvelope }));

      await expect(
        service.getTocResults('SP02', 'AOW03'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('getTocResultsForPairs', () => {
    it('fans out one call per pair and preserves input order', async () => {
      httpGet
        .mockReturnValueOnce(of({ data: envelopeFor('SP02', 'AOW03', [1]) }))
        .mockReturnValueOnce(of({ data: envelopeFor('SP09', 'AOW01', [2]) }));

      const out = await service.getTocResultsForPairs([
        { program: 'SP02', areaOfWork: 'AOW03' },
        { program: 'SP09', areaOfWork: 'AOW01' },
      ]);

      expect(out.map((p) => p.compositeCode)).toEqual([
        'SP02-AOW03',
        'SP09-AOW01',
      ]);
      expect(httpGet).toHaveBeenCalledTimes(2);
    });

    it('returns [] for empty input without calling upstream', async () => {
      const out = await service.getTocResultsForPairs([]);
      expect(out).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });
});

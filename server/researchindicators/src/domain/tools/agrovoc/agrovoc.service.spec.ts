import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NEVER, of, throwError } from 'rxjs';
import { AppConfig } from '../../shared/utils/app-config.util';
import { AgrovocService } from './agrovoc.service';

describe('AgrovocService', () => {
  let service: AgrovocService;
  let http: { get: jest.Mock };
  const config: { ARI_AGROVOC_URL: string | undefined } = {
    ARI_AGROVOC_URL: 'https://agrovoc.fao.org/',
  };

  const searchUrl = 'https://agrovoc.fao.org/browse/rest/v1/search/';
  const beaParams = {
    params: { query: '*bea*', lang: 'en', maxhits: 1000 },
  };

  beforeEach(async () => {
    jest.useRealTimers();
    config.ARI_AGROVOC_URL = 'https://agrovoc.fao.org/';
    http = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgrovocService,
        { provide: HttpService, useValue: http },
        { provide: AppConfig, useValue: config },
      ],
    }).compile();

    service = module.get(AgrovocService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('calls the search URL with wildcard params when the host has a trailing slash', async () => {
    http.get.mockReturnValue(of({ data: { results: [] }, status: 200 }));

    await expect(service.search('bea')).resolves.toEqual([]);

    expect(http.get).toHaveBeenCalledWith(searchUrl, beaParams);
  });

  it('builds the same URL when the host has no trailing slash', async () => {
    config.ARI_AGROVOC_URL = 'https://agrovoc.fao.org';
    http.get.mockReturnValue(of({ data: { results: [] }, status: 200 }));

    await expect(service.search('bea')).resolves.toEqual([]);

    expect(http.get).toHaveBeenCalledWith(searchUrl, beaParams);
  });

  it.each(['be', '  ', '**'])(
    'rejects %p before calling AGROVOC',
    async (query) => {
      await expect(service.search(query)).rejects.toThrow(BadRequestException);
      expect(http.get).not.toHaveBeenCalled();
    },
  );

  it('rejects a query longer than 100 characters before calling AGROVOC', async () => {
    await expect(service.search('a'.repeat(101))).rejects.toThrow(
      BadRequestException,
    );
    expect(http.get).not.toHaveBeenCalled();
  });

  it('answers 503 and does not call upstream when the host is empty', async () => {
    config.ARI_AGROVOC_URL = '';
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(service.search('bea')).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(http.get).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ARI_AGROVOC_URL'),
    );
  });

  it('maps an upstream 503 to BadGatewayException and logs the query', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    http.get.mockReturnValue(throwError({ response: { status: 503 } }));

    await expect(service.search('bea')).rejects.toThrow(BadGatewayException);

    expect(http.get).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"query":"bea"'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"upstreamStatus":503'),
    );
  });

  it('maps a call that never answers to BadGatewayException', async () => {
    jest.useFakeTimers();
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    http.get.mockReturnValue(NEVER);

    const pending = service.search('training');
    // The extra millisecond rejects only when `timeout(15000)` never fires,
    // so a missing timeout fails this assertion instead of hanging.
    const guarded = new Promise((resolve, reject) => {
      pending.then(resolve, reject);
      setTimeout(() => {
        reject(new Error('upstream still pending after 15s'));
      }, 15_001);
    });
    const assertion = expect(guarded).rejects.toThrow(BadGatewayException);

    await jest.advanceTimersByTimeAsync(15_001);
    await assertion;

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"upstreamStatus":"timeout"'),
    );
  }, 1_000);

  it('maps a body without a results array to BadGatewayException', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    http.get.mockReturnValue(of({ data: {}, status: 200 }));

    await expect(service.search('bea')).rejects.toThrow(BadGatewayException);
    expect(http.get).toHaveBeenCalled();
  });

  it('returns an empty list when AGROVOC returns no results', async () => {
    http.get.mockReturnValue(of({ data: { results: [] }, status: 200 }));

    await expect(service.search('zzqqxx')).resolves.toEqual([]);
    expect(http.get).toHaveBeenCalled();
  });
});

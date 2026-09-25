import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { NEVER, of, throwError } from 'rxjs';
import { AppConfigService } from '../../entities/app-config/app-config.service';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PrmsNormalizerRequestDto } from './dto/prms-normalizer.dto';
import { PrmsNormalizerService } from './prms-normalizer.service';

describe('PrmsNormalizerService', () => {
  const testHost = 'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com';
  const prodHost = 'https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com';
  const apiKey = 'normalizer-secret-key';
  const envelope: PrmsNormalizerRequestDto = {
    tenant: 'prms.result-management.api',
    op: 'dataset.ingest.requested',
    results: [
      { type: 'capacity_sharing', data: { external_reference: 'ARI-1' } },
    ],
  };
  let httpService: { post: jest.Mock };
  let appConfigService: { getEnv: jest.Mock };
  let service: PrmsNormalizerService;

  const response = <T>(status: number, body: T): AxiosResponse<T> =>
    ({
      data: body,
      status,
      statusText: String(status),
      headers: {},
      config: {} as AxiosRequestConfig,
    }) as AxiosResponse<T>;

  beforeEach(() => {
    httpService = { post: jest.fn() };
    appConfigService = {
      getEnv: jest.fn().mockResolvedValue({ simple_value: apiKey }),
    };
    service = new PrmsNormalizerService(
      appConfigService as unknown as AppConfigService,
      httpService as unknown as HttpService,
      { ARI_PRMS_NORMALIZER_HOST: testHost } as AppConfig,
    );
    (service as any).user = 'normalizer-user';
    (service as any).pass = 'normalizer-password';
    (service as any).token = 'transport-token';
    service.ensureHeaders({ 'x-custom-header': 'kept' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([
    [401, { message: 'Unauthorized' }],
    [
      422,
      { rejected: [{ external_reference: 'ARI-1', reason: 'invalid title' }] },
    ],
    [503, { message: 'Service unavailable' }],
  ])(
    'returns the intact HTTP %i response body instead of null',
    async (status, body) => {
      httpService.post.mockReturnValue(of(response(status, body)));

      await expect(service.ingest(envelope)).resolves.toEqual({ status, body });
    },
  );

  it('returns null for a network error and never logs the API key', async () => {
    const errorSpy = jest
      .spyOn(LoggerUtil.prototype, 'error')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    httpService.post.mockReturnValue(
      throwError(() => new Error('network down')),
    );

    await expect(service.ingest(envelope)).resolves.toBeNull();

    const logged = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .map(String)
      .join(' ');
    expect(logged).not.toContain(apiKey);
  });

  it('does not include the API key in any Normalizer log line', async () => {
    const logSpy = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(LoggerUtil.prototype, 'error')
      .mockImplementation(() => undefined);
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);

    const logged = [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]
      .flat()
      .map(String)
      .join(' ');
    expect(logged).not.toContain(apiKey);
  });

  it('returns null when BaseApi times out after 30 seconds', async () => {
    jest.useFakeTimers();
    httpService.post.mockReturnValue(NEVER);

    const pending = service.ingest(envelope);
    await jest.advanceTimersByTimeAsync(30_000);

    await expect(pending).resolves.toBeNull();
  });

  it('reads the API key for every request', async () => {
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);
    await service.ingest(envelope);

    expect(appConfigService.getEnv).toHaveBeenCalledTimes(2);
    expect(appConfigService.getEnv).toHaveBeenCalledWith(
      AppConfigKey.ARI_CLARISA_API_KEY,
    );
  });

  it('passes the merged default config to httpService.post', async () => {
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);

    const configActuallyPassedToHttpPost = httpService.post.mock.calls[0][2];
    expect(configActuallyPassedToHttpPost.auth).toEqual({
      username: 'normalizer-user',
      password: 'normalizer-password',
    });
    expect(configActuallyPassedToHttpPost.headers).toMatchObject({
      Authorization: 'Bearer transport-token',
      'x-custom-header': 'kept',
      'x-api-key': apiKey,
    });
    expect(configActuallyPassedToHttpPost.httpsAgent).toBeDefined();
    expect(configActuallyPassedToHttpPost.validateStatus(401)).toBe(true);
  });

  it('uses the configured TEST host only', async () => {
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);

    const urlActuallyPassedToHttpPost = httpService.post.mock.calls[0][0];
    expect(urlActuallyPassedToHttpPost).toBe(`${testHost}/ingest`);
    expect(urlActuallyPassedToHttpPost).not.toContain(prodHost);
    // This proves config resolution only; it cannot prove deployment correctness.
  });

  it('fails loudly when the Normalizer host is not configured', async () => {
    const withoutHost = new PrmsNormalizerService(
      appConfigService as unknown as AppConfigService,
      httpService as unknown as HttpService,
      {} as AppConfig,
    );

    await expect(withoutHost.ingest(envelope)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(httpService.post).not.toHaveBeenCalled();
  });
});

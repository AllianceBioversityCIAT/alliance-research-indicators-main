import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom, of, throwError } from 'rxjs';
import { BaseApi } from './base-api';

class TestApi extends BaseApi {
  exposeConfig(): AxiosRequestConfig {
    return this._defaultConfig;
  }

  exposeGet<T>(endpoint: string, config?: AxiosRequestConfig) {
    return this.getRequest<T>(endpoint, config);
  }

  exposePost<D, R>(endpoint: string, data: D, config?: AxiosRequestConfig) {
    return this.postRequest<D, R>(endpoint, data, config);
  }

  exposePut<D, R>(endpoint: string, data: D, config?: AxiosRequestConfig) {
    return this.putRequest<D, R>(endpoint, data, config);
  }

  exposePatch<D, R>(endpoint: string, data: D, config?: AxiosRequestConfig) {
    return this.patchRequest<D, R>(endpoint, data, config);
  }

  exposeDelete<T>(endpoint: string, config?: AxiosRequestConfig) {
    return this.deleteRequest<T>(endpoint, config);
  }
}

describe('BaseApi', () => {
  let httpService: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };
  let api: TestApi;

  const ok = <T>(data: T): AxiosResponse<T> =>
    ({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    }) as AxiosResponse<T>;

  beforeEach(() => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };
    api = new TestApi(
      httpService as unknown as HttpService,
      'https://api.example.com',
      'TestApiCtx',
      'user',
      'pass',
      'tok',
    );
  });

  it('builds default config with auth, https agent and bearer token', () => {
    const cfg = api.exposeConfig();
    expect(cfg.auth).toEqual({ username: 'user', password: 'pass' });
    expect(cfg.headers?.Authorization).toBe('Bearer tok');
    expect(cfg.httpsAgent).toBeDefined();
  });

  it('performs GET/POST/PUT/PATCH/DELETE against composed URL', async () => {
    httpService.get.mockReturnValue(of(ok({ a: 1 })));
    httpService.post.mockReturnValue(of(ok({ b: 2 })));
    httpService.put.mockReturnValue(of(ok({ c: 3 })));
    httpService.patch.mockReturnValue(of(ok({ d: 4 })));
    httpService.delete.mockReturnValue(of(ok({ e: 5 })));

    await expect(
      firstValueFrom(api.exposeGet<{ a: number }>('v1/x')),
    ).resolves.toMatchObject({ data: { a: 1 } });
    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.example.com/v1/x',
      expect.any(Object),
    );

    await expect(
      firstValueFrom(api.exposePost('v1/p', { n: 1 })),
    ).resolves.toMatchObject({ data: { b: 2 } });
    expect(httpService.post).toHaveBeenCalledWith(
      'https://api.example.com/v1/p',
      { n: 1 },
      expect.any(Object),
    );

    await expect(
      firstValueFrom(api.exposePut('v1/u', { n: 2 })),
    ).resolves.toMatchObject({ data: { c: 3 } });
    await expect(
      firstValueFrom(api.exposePatch('v1/a', { n: 3 })),
    ).resolves.toMatchObject({ data: { d: 4 } });
    await expect(
      firstValueFrom(api.exposeDelete('v1/d')),
    ).resolves.toMatchObject({ data: { e: 5 } });
  });

  it('uses explicit config instead of default when provided', async () => {
    const custom = { headers: { 'X-Test': '1' } } as AxiosRequestConfig;
    httpService.get.mockReturnValue(of(ok(null)));

    await firstValueFrom(api.exposeGet('path', custom));

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.example.com/path',
      custom,
    );
  });

  it('maps axios errors to null and logs', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const axiosLike = Object.assign(new Error('boom'), {
      isAxiosError: true,
      response: { data: { code: 'x' } },
    });
    httpService.get.mockReturnValue(throwError(() => axiosLike));

    const out = await firstValueFrom(api.exposeGet('bad'));

    expect(out).toBeNull();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Axios error'),
    );
  });

  it('maps non-axios errors to null and logs', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    httpService.get.mockReturnValue(throwError(() => new Error('plain')));

    const out = await firstValueFrom(api.exposeGet('bad'));

    expect(out).toBeNull();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected error'),
    );
  });
});

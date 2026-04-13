import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { HttpStatus } from '@nestjs/common';
import { ResponseInterceptor } from './response.interceptor';
import { LoggerUtil } from '../utils/logger.util';

jest.mock('../utils/env.utils', () => ({
  ENV: { IS_PRODUCTION: true, SEE_ALL_LOGS: false },
}));

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  const nestContextStub = {
    getHandler: () => function handler() {},
    getClass: () => class Stub {},
  };

  beforeAll(() => {
    jest.spyOn(LoggerUtil.prototype, '_verbose').mockImplementation(() => undefined);
    jest.spyOn(LoggerUtil.prototype, '_warn').mockImplementation(() => undefined);
    jest.spyOn(LoggerUtil.prototype, '_error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  function httpContext() {
    const statusFn = jest.fn();
    return {
      context: {
        ...nestContextStub,
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
          getRequest: () => ({
            url: '/r',
            method: 'POST',
            socket: { remoteAddress: '::1' },
            user: { sec_user_id: 9 },
          }),
        }),
      } as any,
      statusFn,
    };
  }

  it('wraps ServiceResponseDto-like payloads for http', async () => {
    const { context, statusFn } = httpContext();
    const payload = {
      status: HttpStatus.OK,
      description: 'OK',
      data: { a: 1 },
    };
    const next = { handle: () => of(payload) };
    const out: any = await lastValueFrom(interceptor.intercept(context, next));
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.OK);
    expect(out.status).toBe(HttpStatus.OK);
    expect(out.description).toBe('OK');
    expect(out.data).toEqual({ a: 1 });
    expect(out.path).toBe('/r');
  });

  it('returns rpc payload unchanged inside map branch', async () => {
    const statusFn = jest.fn();
    const context = {
      ...nestContextStub,
      getType: () => 'rpc',
      switchToHttp: () => ({
        getResponse: () => ({ status: statusFn }),
        getRequest: () => ({
          url: '/x',
          method: 'GET',
          socket: {},
        }),
      }),
      switchToRpc: () => ({
        getContext: () => ({ getPattern: () => 'pattern' }),
      }),
    } as any;
    const raw = { custom: true };
    const next = { handle: () => of(raw) };
    const out = await lastValueFrom(interceptor.intercept(context, next));
    expect(out).toBe(raw);
  });
});

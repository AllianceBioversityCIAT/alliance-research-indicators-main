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
  let verboseSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const nestContextStub = {
    getHandler: () => function handler() {},
    getClass: () => class Stub {},
  };

  beforeAll(() => {
    verboseSpy = jest
      .spyOn(LoggerUtil.prototype, '_verbose')
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    verboseSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  function httpContext(requestOverrides: Record<string, unknown> = {}) {
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
            ...requestOverrides,
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

  // @akili-spec changes/profile-simulation — R-IMP-005/NFR-IMP-004 log
  // attribution.
  it('logs actorId + impersonationSessionId when req.actor is present (failing input: req.actor set, status 409)', async () => {
    const { context } = httpContext({
      actor: { sec_user_id: 900 },
      impersonation: { session_id: 'sess-1' },
    });
    const payload = { status: HttpStatus.CONFLICT, description: 'Conflict' };
    const next = { handle: () => of(payload) };
    await lastValueFrom(interceptor.intercept(context, next));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 9,
        actorId: 900,
        impersonationSessionId: 'sess-1',
      }),
    );
  });

  it('logs undefined actorId/impersonationSessionId when req.actor is absent (failing input: no req.actor, status 409)', async () => {
    const { context } = httpContext();
    const payload = { status: HttpStatus.CONFLICT, description: 'Conflict' };
    const next = { handle: () => of(payload) };
    await lastValueFrom(interceptor.intercept(context, next));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 9,
        actorId: undefined,
        impersonationSessionId: undefined,
      }),
    );
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

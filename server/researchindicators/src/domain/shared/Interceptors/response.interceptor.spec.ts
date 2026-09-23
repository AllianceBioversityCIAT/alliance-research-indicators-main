import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { HttpStatus } from '@nestjs/common';
import { ResponseInterceptor } from './response.interceptor';
import { ENV } from '../utils/env.utils';
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

  // Two features grew this helper independently: dev's impersonation
  // logging calls it with an overrides object, AC-1675's callback-path
  // redaction calls it with a url string. No call site combines both, so
  // one param discriminates by typeof rather than forcing every existing
  // call to change shape.
  function httpContext(
    urlOrOverrides: string | Record<string, unknown> = '/r',
    requestOverrides: Record<string, unknown> = {},
  ) {
    const url = typeof urlOrOverrides === 'string' ? urlOrOverrides : '/r';
    const overrides =
      typeof urlOrOverrides === 'string' ? requestOverrides : urlOrOverrides;
    const statusFn = jest.fn();
    return {
      context: {
        ...nestContextStub,
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
          getRequest: () => ({
            url,
            method: 'POST',
            socket: { remoteAddress: '::1' },
            user: { sec_user_id: 9 },
            ...overrides,
          }),
        }),
      } as any,
      statusFn,
    };
  }

  function loggedUrls(spy: jest.SpyInstance): unknown[] {
    return spy.mock.calls.map((call) => call[1]?.url);
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

  describe('DC-11 path redaction', () => {
    const prefix = '/api/prms-callback';
    const segment = 'segment-k7';
    const callbackUrl = `${prefix}/${segment}?q=1`;
    const otherUrl = '/api/results/99?q=1';
    let verbose: jest.SpyInstance;

    beforeEach(() => {
      verbose = jest.spyOn(LoggerUtil.prototype, '_verbose');
      verbose.mockClear();
      (ENV as unknown as { IS_PRODUCTION: boolean }).IS_PRODUCTION = false;
      (ENV as unknown as { SEE_ALL_LOGS: boolean }).SEE_ALL_LOGS = true;
    });

    afterEach(() => {
      (ENV as unknown as { IS_PRODUCTION: boolean }).IS_PRODUCTION = true;
      (ENV as unknown as { SEE_ALL_LOGS: boolean }).SEE_ALL_LOGS = false;
    });

    it('DC-11 (a) callback 2xx data.path and logger arguments stop at the route prefix', async () => {
      const { context, statusFn } = httpContext(callbackUrl);
      const payload = {
        status: HttpStatus.OK,
        description: 'stored',
        data: { ok: true },
      };
      const out: any = await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(payload) }),
      );

      expect(statusFn).toHaveBeenCalledWith(HttpStatus.OK);
      expect(out.status).toBe(HttpStatus.OK);
      expect(out.description).toBe('stored');
      expect(out.data).toEqual({ ok: true });
      expect(out.errors).toBeNull();
      expect(out.timestamp).toEqual(expect.any(String));
      expect(out.path).toBe(prefix);
      expect(out.path).not.toContain(segment);
      expect(loggedUrls(verbose)).toEqual([prefix]);
      expect(JSON.stringify(verbose.mock.calls)).not.toContain(segment);
    });

    it('DC-11 (b) a non-callback route keeps its real data.path and logger url', async () => {
      const { context } = httpContext(otherUrl);
      const payload = {
        status: HttpStatus.OK,
        description: 'ok',
        data: { id: 99 },
      };
      const out: any = await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(payload) }),
      );

      expect(out.path).toBe(otherUrl);
      expect(loggedUrls(verbose)).toEqual([otherUrl]);
    });

    it('DC-11 (c) mixed-case callback path is redacted in the emitted 2xx body', async () => {
      const mixed = `/API/PRMS-CALLBACK/${segment}`;
      const { context } = httpContext(mixed);
      const payload = {
        status: HttpStatus.OK,
        description: 'stored',
        data: { ok: true },
      };
      const out: any = await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(payload) }),
      );

      expect(out.path).toBe(prefix);
      expect(JSON.stringify(out)).not.toContain(segment);
      expect(loggedUrls(verbose)).toEqual([prefix]);
      expect(JSON.stringify(verbose.mock.calls)).not.toContain(segment);
    });

    it('a mixed-case non-callback route keeps its real data.path', async () => {
      const url = '/API/RESULTS/99?q=1';
      const { context } = httpContext(url);
      const payload = {
        status: HttpStatus.OK,
        description: 'ok',
        data: { id: 99 },
      };
      const out: any = await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(payload) }),
      );

      expect(out.path).toBe(url);
      expect(loggedUrls(verbose)).toEqual([url]);
    });
  });
});

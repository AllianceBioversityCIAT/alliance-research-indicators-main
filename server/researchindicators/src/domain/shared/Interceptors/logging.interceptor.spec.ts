import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggerUtil } from '../utils/logger.util';

jest.mock('../utils/env.utils', () => ({
  ENV: { SEE_ALL_LOGS: true },
}));

describe('LoggingInterceptor', () => {
  const interceptor = new LoggingInterceptor();
  let logSpy: jest.SpyInstance;

  const nestContextStub = {
    getHandler: () => function handler() {},
    getClass: () => class Stub {},
  };

  beforeEach(() => {
    logSpy = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('propagates http responses', async () => {
    const context = {
      ...nestContextStub,
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/test',
          socket: { remoteAddress: '127.0.0.1' },
          user: { sec_user_id: 42 },
        }),
      }),
    } as any;
    const next = { handle: () => of({ ok: true }) };
    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result).toEqual({ ok: true });
  });

  // @akili-spec changes/profile-simulation — R-IMP-005/NFR-IMP-004 log
  // attribution.
  it('logs actorId + impersonationSessionId when req.actor is present (failing input: req.actor set)', async () => {
    const context = {
      ...nestContextStub,
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'PATCH',
          url: '/results/123',
          socket: { remoteAddress: '127.0.0.1' },
          user: { sec_user_id: 55 },
          actor: { sec_user_id: 900 },
          impersonation: { session_id: 'sess-1' },
        }),
      }),
    } as any;
    const next = { handle: () => of({ ok: true }) };
    await lastValueFrom(interceptor.intercept(context, next));
    expect(logSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        userId: 55,
        actorId: 900,
        impersonationSessionId: 'sess-1',
      }),
    );
  });

  it('logs undefined actorId/impersonationSessionId when req.actor is absent (failing input: no req.actor)', async () => {
    const context = {
      ...nestContextStub,
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/results/123',
          socket: { remoteAddress: '127.0.0.1' },
          user: { sec_user_id: 55 },
        }),
      }),
    } as any;
    const next = { handle: () => of({ ok: true }) };
    await lastValueFrom(interceptor.intercept(context, next));
    expect(logSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        userId: 55,
        actorId: undefined,
        impersonationSessionId: undefined,
      }),
    );
  });

  it('propagates rpc responses', async () => {
    const context = {
      ...nestContextStub,
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => ({ getPattern: () => 'some.pattern' }),
      }),
    } as any;
    const next = { handle: () => of('rpc-result') };
    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result).toBe('rpc-result');
  });
});

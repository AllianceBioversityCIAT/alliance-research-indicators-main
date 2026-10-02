import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { ENV } from '../utils/env.utils';
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

  describe('DC-11 path redaction', () => {
    const prefix = '/api/prms-callback';
    const segment = 'segment-k7';
    let log: jest.SpyInstance;

    beforeEach(() => {
      log = jest
        .spyOn(LoggerUtil.prototype, '_log')
        .mockImplementation(() => undefined);
      (ENV as unknown as { SEE_ALL_LOGS: boolean }).SEE_ALL_LOGS = true;
    });

    afterEach(() => {
      (ENV as unknown as { SEE_ALL_LOGS: boolean }).SEE_ALL_LOGS = false;
      log.mockRestore();
    });

    it('logs the callback url truncated at the route prefix', async () => {
      const context = {
        ...nestContextStub,
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: `${prefix}/${segment}`,
            socket: { remoteAddress: '127.0.0.1' },
          }),
        }),
      } as any;
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of({ ok: true }) }),
      );

      expect(log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ url: prefix }),
      );
      expect(JSON.stringify(log.mock.calls)).not.toContain(segment);
    });

    it('DC-11 (c) mixed-case callback url is redacted in the log arguments', async () => {
      const mixed = `/API/PRMS-CALLBACK/${segment}`;
      const context = {
        ...nestContextStub,
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: mixed,
            socket: { remoteAddress: '127.0.0.1' },
          }),
        }),
      } as any;
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of({ ok: true }) }),
      );

      expect(log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ url: prefix }),
      );
      expect(JSON.stringify(log.mock.calls)).not.toContain(segment);
    });

    it('logs a non-callback url unchanged', async () => {
      const url = '/api/results/99?q=1';
      const context = {
        ...nestContextStub,
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url,
            socket: { remoteAddress: '127.0.0.1' },
          }),
        }),
      } as any;
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of({ ok: true }) }),
      );

      expect(log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ url }),
      );
    });

    it('does not redact an rpc pattern', async () => {
      const pattern = `${prefix}/${segment}`;
      const context = {
        ...nestContextStub,
        getType: () => 'rpc',
        switchToRpc: () => ({
          getContext: () => ({ getPattern: () => pattern }),
        }),
      } as any;
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of('rpc-result') }),
      );

      expect(log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ url: pattern }),
      );
    });
  });
});

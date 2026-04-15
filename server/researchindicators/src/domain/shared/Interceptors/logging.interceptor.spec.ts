import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

jest.mock('../utils/env.utils', () => ({
  ENV: { SEE_ALL_LOGS: false },
}));

describe('LoggingInterceptor', () => {
  const interceptor = new LoggingInterceptor();

  const nestContextStub = {
    getHandler: () => function handler() {},
    getClass: () => class Stub {},
  };

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

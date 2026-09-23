import {
  ExecutionContext,
  Logger,
  MiddlewareConsumer,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { AppModule } from '../../../../app.module';
import {
  CallbackSecretGuard,
  callbackSecretsMatch,
} from './callback-secret.guard';

jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    timingSafeEqual: jest.fn(
      (
        a: Parameters<typeof actual.timingSafeEqual>[0],
        b: Parameters<typeof actual.timingSafeEqual>[1],
      ) => actual.timingSafeEqual(a, b),
    ),
  };
});

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04 /
// R-PWH-004 AC.1, AC.5, AC.6 · exclusion array (P-7).

const CONFIGURED = 'configured-secret-value';
const GUESS = 'guess-not-the-secret';

describe('callbackSecretsMatch', () => {
  beforeEach(() => {
    (timingSafeEqual as jest.Mock).mockClear();
  });

  it('returns false without calling timingSafeEqual when lengths differ', () => {
    expect(callbackSecretsMatch(CONFIGURED, 'short')).toBe(false);
    expect(timingSafeEqual).not.toHaveBeenCalled();
  });

  it('does not throw when the supplied secret is a different length', () => {
    expect(() => callbackSecretsMatch(CONFIGURED, 'x')).not.toThrow();
    expect(callbackSecretsMatch('a', 'ab')).toBe(false);
    expect(timingSafeEqual).not.toHaveBeenCalled();
  });

  it('matches equal secrets and rejects a same-length mismatch', () => {
    expect(callbackSecretsMatch(CONFIGURED, CONFIGURED)).toBe(true);
    expect(timingSafeEqual).toHaveBeenCalledTimes(1);
    const sameLength = 'X'.repeat(CONFIGURED.length);
    expect(sameLength).not.toBe(CONFIGURED);
    expect(callbackSecretsMatch(CONFIGURED, sameLength)).toBe(false);
    expect(timingSafeEqual).toHaveBeenCalledTimes(2);
  });

  it('refuses when the configured secret is unset or empty, even if both sides are empty', () => {
    expect(callbackSecretsMatch(undefined, 'anything')).toBe(false);
    expect(callbackSecretsMatch('', '')).toBe(false);
    expect(callbackSecretsMatch('', 'anything')).toBe(false);
    expect(callbackSecretsMatch(CONFIGURED, undefined)).toBe(false);
  });
});

describe('CallbackSecretGuard', () => {
  const guard = new CallbackSecretGuard();
  const warnings: string[] = [];
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnings.length = 0;
    process.env.ARI_PRMS_WEBHOOK_SECRET = CONFIGURED;
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((message: unknown) => {
        warnings.push(String(message));
        return undefined as never;
      });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete process.env.ARI_PRMS_WEBHOOK_SECRET;
  });

  const contextFor = (secret: string | undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          params: { secret },
          socket: { remoteAddress: '203.0.113.9' },
          url: `/api/prms-callback/${secret ?? ''}`,
        }),
      }),
    }) as ExecutionContext;

  it('admits the configured secret', () => {
    expect(guard.canActivate(contextFor(CONFIGURED))).toBe(true);
    expect(warnings.join('\n')).not.toContain(CONFIGURED);
  });

  it('returns 404 for a wrong secret and does not log any part of the guess', () => {
    expect(() => guard.canActivate(contextFor(GUESS))).toThrow(
      NotFoundException,
    );
    const logged = warnings.join('\n');
    expect(logged).toContain('path=/api/prms-callback');
    expect(logged).toContain('source_ip=203.0.113.9');
    expect(logged).not.toContain(GUESS);
    expect(logged).not.toContain('guess-not');
  });

  it('returns 404 for a length mismatch instead of throwing from timingSafeEqual', () => {
    expect(() => guard.canActivate(contextFor('nope'))).toThrow(
      NotFoundException,
    );
  });

  it('refuses every request when ARI_PRMS_WEBHOOK_SECRET is unset', () => {
    delete process.env.ARI_PRMS_WEBHOOK_SECRET;
    expect(() => guard.canActivate(contextFor(CONFIGURED))).toThrow(
      NotFoundException,
    );
    expect(() => guard.canActivate(contextFor(''))).toThrow(NotFoundException);
    expect(() => guard.canActivate(contextFor(GUESS))).toThrow(
      NotFoundException,
    );
  });
});

describe('AppModule JwtMiddleware exclusion (R-PWH-004 AC.2 / AC.3)', () => {
  it('excludes prms-callback(.*) for every method and does not exclude prms-webhook', () => {
    const chain = {
      exclude: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };
    const consumer = {
      apply: jest.fn().mockReturnValue(chain),
    };
    new AppModule().configure(consumer as unknown as MiddlewareConsumer);

    const excluded = chain.exclude.mock.calls[0] as Array<{
      path: string;
      method: RequestMethod;
    }>;
    expect(excluded).toContainEqual({
      path: 'prms-callback(.*)',
      method: RequestMethod.ALL,
    });
    expect(excluded.map((entry) => entry.path)).not.toContain(
      'prms-webhook(.*)',
    );
    expect(excluded.map((entry) => entry.path)).not.toContain(
      '/prms-callback(.*)',
    );
  });
});

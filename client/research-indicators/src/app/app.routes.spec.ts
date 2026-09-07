import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { routes } from './app.routes';
import { CacheService } from '@services/cache/cache.service';
import { ImpersonationService } from '@services/impersonation.service';

/**
 * The guarded platform route has an empty path, so its `canMatch` runs for every url the
 * earlier routes did not take. These exercise the REAL route table — the unit tests in
 * roles.guard.spec.ts call the guard with a hand-built `Route`, so they cannot see which
 * urls the router actually hands it.
 */
describe('app.routes — unauthenticated deep links', () => {
  /**
   * `restoring` is stated explicitly rather than left to the real service's default: the guard
   * defers every decision until a profile-simulation restore settles, so a test that did not
   * pin it would be asserting against whichever path happened to run.
   */
  const navigate = async (path: string, isLoggedIn: boolean, restoring = false) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        {
          provide: CacheService,
          useValue: { isLoggedIn: signal(isLoggedIn), isValidatingToken: signal(false), dataCache: signal({}) }
        },
        {
          provide: ImpersonationService,
          useValue: { restoring: signal(restoring), active: signal(false), sessionId: () => null }
        }
      ]
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(path).catch(() => undefined);
    return router.url;
  };

  it('serves the public /reporting page to a logged-out visitor', async () => {
    await expect(navigate('/reporting', false)).resolves.toBe('/reporting');
  });

  it('serves the public /reporting page to a logged-in visitor', async () => {
    await expect(navigate('/reporting', true)).resolves.toBe('/reporting');
  });

  it('does not send a logged-out visitor of an unknown url to /login', async () => {
    // The reported defect: any url the router could not match was answered with the login
    // screen, so a public page one build behind — or a plain typo — read as "you must log in".
    const url = await navigate('/reporting-typo', false);

    expect(url).not.toContain('/login');
  });

  it('still deep-links a logged-out visitor of a PROTECTED page to /login with a returnUrl', async () => {
    await expect(navigate('/results-center', false)).resolves.toBe('/login?returnUrl=%2Fresults-center');
    await expect(navigate('/home', false)).resolves.toBe('/login?returnUrl=%2Fhome');
  });

  it('leaves the app root on the landing page rather than /login', async () => {
    await expect(navigate('/', false)).resolves.toBe('/');
  });

  it('keeps protected pages reachable when logged in', async () => {
    await expect(navigate('/results-center', true)).resolves.toBe('/results-center');
  });

  describe('while a profile simulation is being restored', () => {
    // The guard hands `decide()` to a promise in this state, so the deep-link rules above run
    // on a second, asynchronous code path. Both features land in the same `decide()`, and these
    // pin that: neither the unknown-url fallthrough nor the protected-page redirect may differ
    // depending on whether a restore was in flight.
    const settleAfterRestore = async (path: string, isLoggedIn: boolean) => {
      const restoring = signal(true);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter(routes),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideLocationMocks(),
          {
            provide: CacheService,
            useValue: { isLoggedIn: signal(isLoggedIn), isValidatingToken: signal(false), dataCache: signal({}) }
          },
          {
            provide: ImpersonationService,
            useValue: { restoring, active: signal(false), sessionId: () => null }
          }
        ]
      });
      const router = TestBed.inject(Router);
      const navigation = router.navigateByUrl(path).catch(() => undefined);
      restoring.set(false);
      await navigation;
      return router.url;
    };

    it('does not send an unknown url to /login once the restore settles', async () => {
      expect(await settleAfterRestore('/reporting-typo', false)).not.toContain('/login');
    });

    it('still deep-links a protected page to /login once the restore settles', async () => {
      expect(await settleAfterRestore('/results-center', false)).toBe('/login?returnUrl=%2Fresults-center');
    });

    it('serves the public /reporting page once the restore settles', async () => {
      expect(await settleAfterRestore('/reporting', false)).toBe('/reporting');
    });
  });
});

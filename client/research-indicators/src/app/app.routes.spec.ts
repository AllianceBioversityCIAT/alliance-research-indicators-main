import { TestBed } from '@angular/core/testing';
import { provideRouter, Route, Router, Routes } from '@angular/router';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { routes } from './app.routes';
import { CacheService } from '@services/cache/cache.service';
import { RolesService } from '@services/cache/roles.service';
import { centerAdminGuard } from '@guards/center-admin.guard';

/** Recursively finds a route declaration by its own `path`, independent of nesting depth. */
function findRouteByPath(routeList: Routes, path: string): Route | undefined {
  for (const route of routeList) {
    if (route.path === path) return route;
    if (route.children) {
      const found = findRouteByPath(route.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * The guarded platform route has an empty path, so its `canMatch` runs for every url the
 * earlier routes did not take. These exercise the REAL route table — the unit tests in
 * roles.guard.spec.ts call the guard with a hand-built `Route`, so they cannot see which
 * urls the router actually hands it.
 */
describe('app.routes — unauthenticated deep links', () => {
  const navigate = async (path: string, isLoggedIn: boolean) => {
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
});

/**
 * institutional-performance/control-lists T-01, judgment J-9 / falsifier 7.
 * R-CTL-007 AC.2 has two clauses — no menu item AND cannot open the route — this
 * covers the second one, which the re-cut tasks.md had dropped. KZ-017: a link that
 * compiles can still 404, so the resolved URL is asserted against the literal path
 * the sidebar uses (`/administration/center-admin/control-lists`, design §6.1),
 * not just "navigation did not throw".
 */
describe('app.routes — control-lists route declares canMatch (J-9)', () => {
  it('the control-lists route config declares canMatch: [centerAdminGuard]', () => {
    const route = findRouteByPath(routes, 'administration/center-admin/control-lists');
    expect(route).toBeTruthy();
    expect(route?.canMatch).toEqual([centerAdminGuard]);
  });

  const navigateAsCenterAdmin = async (canAccessCenterAdmin: boolean) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        {
          provide: CacheService,
          useValue: { isLoggedIn: signal(true), isValidatingToken: signal(false), dataCache: signal({}) }
        },
        { provide: RolesService, useValue: { canAccessCenterAdmin: () => canAccessCenterAdmin } }
      ]
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/administration/center-admin/control-lists').catch(() => undefined);
    return router.url;
  };

  it('rejects a resolved user without center-admin access (falsifier 7: removing canMatch would let this through)', async () => {
    await expect(navigateAsCenterAdmin(false)).resolves.toBe('/home');
  });

  it('admits Center Admin / System Admin to the exact path the sidebar link resolves to', async () => {
    await expect(navigateAsCenterAdmin(true)).resolves.toBe('/administration/center-admin/control-lists');
  });
});

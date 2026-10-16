import { TestBed } from '@angular/core/testing';
import { provideRouter, Route, Router, Routes } from '@angular/router';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { routes } from './app.routes';
import { CacheService } from '@services/cache/cache.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { appConfigurationGuard } from '@guards/app-configuration.guard';
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
 * changes/control-lists-global-scope T-01 (R-CLG-008 AC.3, D-CLG-7, KZ-017). Control Lists moved
 * from Center admin to System admin: a link that compiles can still 404, so the route table is
 * asserted directly — the new path with `appConfigurationGuard`, and the old path gone — and the
 * resolved URL is checked against the literal path the sidebar uses
 * (`/administration/configuration/control-lists`). The guard runs against a REAL `RolesService`
 * fed with role data, never a boolean stand-in.
 */
describe('app.routes — control-lists route (System admin)', () => {
  it('declares canMatch: [appConfigurationGuard] on administration/configuration/control-lists', () => {
    const route = findRouteByPath(routes, 'administration/configuration/control-lists');
    expect(route).toBeTruthy();
    expect(route?.canMatch).toEqual([appConfigurationGuard]);
  });

  it('no longer declares the old administration/center-admin/control-lists route', () => {
    expect(findRouteByPath(routes, 'administration/center-admin/control-lists')).toBeUndefined();
  });

  type RoleEntry = { role_id: number; role?: { focus_id?: number; sec_role_id?: number } };

  const navigateWithRoles = async (roleList: RoleEntry[], url: string) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        {
          provide: CacheService,
          useValue: {
            isLoggedIn: signal(true),
            isValidatingToken: signal(false),
            dataCache: signal({ user: { user_role_list: roleList } })
          }
        },
        { provide: CreateResultManagementService, useValue: { editingOicr: () => false } }
      ]
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url).catch(() => undefined);
    return router.url;
  };

  const SYSTEM_ADMIN: RoleEntry = { role_id: 1 };
  const TECHNICAL_SUPPORT: RoleEntry = { role_id: 7 };
  const CENTER_ADMIN: RoleEntry = { role_id: 9, role: { focus_id: 1, sec_role_id: 9 } };

  it('admits System Admin to the exact path the sidebar link resolves to', async () => {
    await expect(navigateWithRoles([SYSTEM_ADMIN], '/administration/configuration/control-lists')).resolves.toBe(
      '/administration/configuration/control-lists'
    );
  });

  it('admits Technical Support to the exact path the sidebar link resolves to', async () => {
    await expect(navigateWithRoles([TECHNICAL_SUPPORT], '/administration/configuration/control-lists')).resolves.toBe(
      '/administration/configuration/control-lists'
    );
  });

  it('sends Center Admin (role 9, focus 1) to /home (R-CLG-008: Center Admin denied)', async () => {
    await expect(navigateWithRoles([CENTER_ADMIN], '/administration/configuration/control-lists')).resolves.toBe('/home');
  });

  it('does not serve the old center-admin path to anyone, System Admin included', async () => {
    await expect(navigateWithRoles([SYSTEM_ADMIN], '/administration/center-admin/control-lists')).resolves.not.toBe(
      '/administration/center-admin/control-lists'
    );
  });
});

/**
 * institutional-performance/organizational-structure T-01 (R-ORG-012 AC.2, R-ORG-013, KZ-017).
 * The new Center admin item is its own route under the `path: ''` shell. The sidebar link is a
 * literal string, so the route table is asserted directly AND the router is asked to resolve that
 * exact link — a link that compiles can still 404 (NG04002). The guard runs against a REAL
 * `RolesService` fed with role data, never a boolean stand-in.
 */
describe('app.routes — organizational-structure route (Center admin)', () => {
  const SIDEBAR_LINK = '/administration/center-admin/organizational-structure';

  type RoleEntry = { role_id: number; role?: { focus_id?: number; sec_role_id?: number } };

  const navigateWithRoles = async (roleList: RoleEntry[], url: string) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        {
          provide: CacheService,
          useValue: {
            isLoggedIn: signal(true),
            isValidatingToken: signal(false),
            dataCache: signal({ user: { user_role_list: roleList } })
          }
        },
        { provide: CreateResultManagementService, useValue: { editingOicr: () => false } }
      ]
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url).catch(() => undefined);
    return router.url;
  };

  const SYSTEM_ADMIN: RoleEntry = { role_id: 1 };
  const CENTER_ADMIN: RoleEntry = { role_id: 9, role: { focus_id: 1, sec_role_id: 9 } };
  const CONTRIBUTOR_ONLY: RoleEntry = { role_id: 2 };

  it('declares canMatch: [centerAdminGuard] on administration/center-admin/organizational-structure', () => {
    const route = findRouteByPath(routes, 'administration/center-admin/organizational-structure');
    expect(route).toBeTruthy();
    expect(route?.canMatch).toEqual([centerAdminGuard]);
  });

  it('keeps the sidebar link equal to the declared route path', () => {
    expect(SIDEBAR_LINK).toBe(`/${findRouteByPath(routes, 'administration/center-admin/organizational-structure')?.path}`);
  });

  it('admits a Center Admin (role 9) to the exact path the sidebar link resolves to', async () => {
    await expect(navigateWithRoles([CENTER_ADMIN], SIDEBAR_LINK)).resolves.toBe(SIDEBAR_LINK);
  });

  it('admits a System Admin (role 1)', async () => {
    await expect(navigateWithRoles([SYSTEM_ADMIN], SIDEBAR_LINK)).resolves.toBe(SIDEBAR_LINK);
  });

  it('closes the route to a Contributor-only user (sent to /home)', async () => {
    await expect(navigateWithRoles([CONTRIBUTOR_ONLY], SIDEBAR_LINK)).resolves.toBe('/home');
  });
});

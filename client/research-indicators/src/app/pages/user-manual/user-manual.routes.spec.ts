import { Route } from '@angular/router';
import { routes } from '../../app.routes';
import { MANUAL_MODULES } from './data/manual-modules';
import { userManualRoutes } from './user-manual.routes';

/**
 * The manual is meant to be shareable: anybody holding a `/user-manual/...`
 * link must be able to read it, signed in or not. That property lives entirely
 * in how the route is declared, and it is the kind of thing a later tidy-up of
 * `app.routes.ts` can silently undo, so it is pinned here.
 */
describe('user manual routing', () => {
  const index = routes.findIndex(route => route.path === 'user-manual');
  const manualRoute = routes[index] as Route;

  it('is registered at /user-manual', () => {
    expect(index).toBeGreaterThan(-1);
    expect(manualRoute.loadChildren).toBeDefined();
  });

  it('carries no guard, so a signed-out reader is never sent to the login screen', () => {
    expect(manualRoute.canMatch).toBeUndefined();
    expect(manualRoute.canActivate).toBeUndefined();
    expect(manualRoute.canActivateChild).toBeUndefined();
    expect((manualRoute.data as { isLoggedIn?: boolean } | undefined)?.isLoggedIn).toBeUndefined();
  });

  /**
   * The authenticated shell is declared with an empty path, so it is offered
   * every URL the earlier routes did not take. Declaring the manual after it
   * would hand `/user-manual` to `rolesGuard` instead.
   */
  it('is declared ahead of the guarded application shell', () => {
    const guardedShell = routes.findIndex(route => route.path === '' && route.canMatch !== undefined);
    expect(guardedShell).toBeGreaterThan(-1);
    expect(index).toBeLessThan(guardedShell);
  });

  it('opens on the Home chapter and keeps no guard on its children', () => {
    const [shell] = userManualRoutes;
    const children = shell.children ?? [];
    expect(children[0]).toEqual(expect.objectContaining({ path: '', redirectTo: 'home' }));
    for (const child of children) {
      expect(child.canMatch).toBeUndefined();
      expect(child.canActivate).toBeUndefined();
    }
  });

  it('answers every module in the sidebar rather than 404ing on the unwritten ones', () => {
    const children = userManualRoutes[0].children ?? [];
    const explicit = new Set(children.map(child => child.path));
    const catchAll = children.some(child => child.path === ':slug');
    for (const module of MANUAL_MODULES) {
      expect(explicit.has(module.slug) || catchAll).toBe(true);
    }
  });
});

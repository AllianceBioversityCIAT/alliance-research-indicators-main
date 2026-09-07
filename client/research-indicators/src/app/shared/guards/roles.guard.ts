import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { CacheService } from '@services/cache/cache.service';
import { ImpersonationService } from '@services/impersonation.service';

function isUnauthenticatedAccessToAppRoot(router: Router): boolean {
  const nav = router.getCurrentNavigation();
  if (!nav?.extractedUrl) {
    return false;
  }
  const p = (router.serializeUrl(nav.extractedUrl) || '').split('?')[0].split('#')[0];
  return p === '' || p === '/';
}

/**
 * // @akili-spec changes/profile-simulation
 * Design §5 "Client restore" — polls `impersonation.restoring()` until it
 * settles. Deliberately NOT built on `toObservable`/`effect` (RxJS interop):
 * those require an injection context at the moment the internal `inject()`
 * runs, which a route-match-time guard cannot reliably guarantee across
 * Angular's async boundaries, and a plain signal read has no such
 * requirement.
 */
function waitForRestoreToSettle(impersonation: ImpersonationService): Promise<void> {
  return new Promise<void>(resolve => {
    const check = () => {
      if (!impersonation.restoring()) {
        resolve();
        return;
      }
      setTimeout(check, 0);
    };
    check();
  });
}

/**
 * Whether the requested URL actually names a page behind this guard.
 *
 * The guarded platform route is declared with an empty path, so `canMatch` runs for EVERY url
 * the earlier routes did not take — public pages and typos included. Redirecting all of those
 * to `/login` sends a logged-out visitor of `/reporting` (public) or `/typo` (nonexistent) to a
 * login screen for a page that never required one. Only a url that resolves to one of this
 * route's declared children is a genuine "log in first" case; anything else must fall through
 * so the landing/404 routes can answer it.
 *
 * A guarded route with no children is itself the protected page, so it always qualifies.
 */
function isDeclaredUnder(route: Route, segments: UrlSegment[]): boolean {
  const children = route.children;
  if (!children?.length || !segments.length) {
    return true;
  }

  const requestedFirstSegment = segments[0].path;
  return children.some(child => {
    const childFirstSegment = (child.path ?? '').split('/')[0];
    if (childFirstSegment === '') {
      return false;
    }
    // `:param` and `**` children accept any first segment.
    return childFirstSegment === '**' || childFirstSegment.startsWith(':') || childFirstSegment === requestedFirstSegment;
  });
}

export const rolesGuard: CanMatchFn = (route, segments) => {
  const cache = inject(CacheService);
  const router = inject(Router);
  const impersonation = inject(ImpersonationService);

  const decide = (): boolean | UrlTree => {
    const isLoggedIn = cache.isLoggedIn();
    const routeRequiresLoggedIn = (route.data as { isLoggedIn?: boolean })?.isLoggedIn === true;

    if (!isLoggedIn && routeRequiresLoggedIn) {
      if (isUnauthenticatedAccessToAppRoot(router)) {
        return false;
      }
      if (!isDeclaredUnder(route, segments)) {
        return false;
      }
      const pathFromSegments = segments.length ? '/' + segments.map(s => s.path).join('/') : '';
      const returnUrl = pathFromSegments || router.url || '/';
      return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
    }

    return isLoggedIn === (route.data as { isLoggedIn?: boolean })?.isLoggedIn || false;
  };

  // Design §5 "Client restore": no route resolves against a half-restored identity.
  if (impersonation.restoring()) {
    return waitForRestoreToSettle(impersonation).then(decide);
  }

  return decide();
};

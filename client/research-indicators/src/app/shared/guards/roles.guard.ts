import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
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

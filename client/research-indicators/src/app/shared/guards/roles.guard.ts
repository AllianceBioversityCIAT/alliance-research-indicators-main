import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { CacheService } from '@services/cache/cache.service';

function isUnauthenticatedAccessToAppRoot(router: Router): boolean {
  const nav = router.getCurrentNavigation();
  if (!nav?.extractedUrl) {
    return false;
  }
  const p = (router.serializeUrl(nav.extractedUrl) || '').split('?')[0].split('#')[0];
  return p === '' || p === '/';
}

export const rolesGuard: CanMatchFn = (route, segments) => {
  const cache = inject(CacheService);
  const router = inject(Router);
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

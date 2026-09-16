import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { CacheService } from '@services/cache/cache.service';
import { ApiService } from '@services/api.service';

/**
 * My PI Delegates only exists for someone who is the Principal Investigator of a
 * project or an active delegate on one. Everyone else is sent home instead of
 * landing on an empty module — the sidebar hides the entry point for the same
 * reason, and this closes the direct-URL path.
 *
 * A failed check denies access: an empty module is worse than a redirect.
 */
export const piDelegatesGuard: CanMatchFn = async () => {
  const cache = inject(CacheService);
  const api = inject(ApiService);
  const router = inject(Router);

  const userId = cache.dataCache().user?.sec_user_id;
  if (userId == null) {
    return router.createUrlTree(['/home']);
  }

  try {
    const res = await api.GET_PiDelegateAccess(Number(userId));
    return res.data?.has_access ? true : router.createUrlTree(['/home']);
  } catch {
    return router.createUrlTree(['/home']);
  }
};

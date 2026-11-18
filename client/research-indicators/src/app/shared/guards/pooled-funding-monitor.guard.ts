import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { ApiService } from '@services/api.service';
import { CacheService } from '@services/cache/cache.service';
import { RolesService } from '@services/cache/roles.service';
import { PoolFundingFlagsService } from '@services/pool-funding-flags.service';

/**
 * CGIAR Portfolio Contribution Monitor: any role other than Contributor, OR a Contributor who is
 * the PI or an active delegate of at least one project (the same rule as My PI Delegates), and only
 * while the POOL_FUNDING_SECTION_ENABLED flag is on (DD-PFM-11, DD-PFM-12). Everyone else is sent
 * home; the sidebar hides the entry point for the same reason and this closes the direct-URL path.
 * The flag read is fail-open (see PoolFundingFlagsService), so a failed flag read never locks anyone
 * out here; a failed PI/delegate check denies, as in the My PI Delegates guard. The server applies
 * the same rule on every endpoint.
 * @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-09
 */
export const pooledFundingMonitorGuard: CanMatchFn = async () => {
  const roles = inject(RolesService);
  const flags = inject(PoolFundingFlagsService);
  const cache = inject(CacheService);
  const api = inject(ApiService);
  const router = inject(Router);
  const home = router.createUrlTree(['/home']);

  await flags.load();
  if (!flags.sectionEnabled()) return home;
  if (roles.canAccessPooledFundingMonitor()) return true;

  const userId = cache.dataCache().user?.sec_user_id;
  if (userId == null) return home;
  try {
    const res = await api.GET_PiDelegateAccess(Number(userId));
    return res.data?.has_access ? true : home;
  } catch {
    return home;
  }
};

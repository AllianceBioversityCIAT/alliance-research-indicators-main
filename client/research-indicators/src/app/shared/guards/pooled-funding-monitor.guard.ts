import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { RolesService } from '@services/cache/roles.service';
import { PoolFundingFlagsService } from '@services/pool-funding-flags.service';

/**
 * Pooled Funding Contribution Monitor: any role other than Contributor, and only while the
 * POOL_FUNDING_SECTION_ENABLED flag is on (DD-PFM-11, DD-PFM-12). Everyone else is sent home;
 * the sidebar hides the entry point for the same reason and this closes the direct-URL path.
 * The flag read is fail-open (see PoolFundingFlagsService), so a failed read never locks anyone out here —
 * the server still refuses contributor-only credentials.
 * @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-09
 */
export const pooledFundingMonitorGuard: CanMatchFn = async () => {
  const roles = inject(RolesService);
  const flags = inject(PoolFundingFlagsService);
  const router = inject(Router);

  await flags.load();
  return roles.canAccessPooledFundingMonitor() && flags.sectionEnabled() ? true : router.createUrlTree(['/home']);
};

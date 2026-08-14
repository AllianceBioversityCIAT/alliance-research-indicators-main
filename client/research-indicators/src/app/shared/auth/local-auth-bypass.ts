import { CacheService } from '@services/cache/cache.service';
import { DataCache, UserCache } from '@interfaces/cache.interface';
import { environment } from '@envs/environment';

/**
 * LOCAL DEVELOPMENT ONLY — client-side counterpart to the server's
 * `ARI_LOCAL_AUTH_BYPASS` (`jwr.middleware.ts:38`).
 *
 * The two flags are INDEPENDENT and neither implies the other. The server flag
 * only skips JWT *validation* on incoming requests; it has no effect on the
 * client, where `rolesGuard` gates navigation on `cache.isLoggedIn()` — which
 * reads `localStorage.data`. With the server bypass on and this off, the app
 * still redirects to `/login` and dies at Cognito, which is exactly the state
 * this file exists to fix. Turning one on without the other is the mistake to
 * expect, so both log loudly.
 *
 * The seeded identity MIRRORS the server's injected user on purpose
 * (`sec_user_id: 1`, `local-dev@example.com`, SYSTEM_ADMIN). If they diverge,
 * the client renders one user's permissions while the API authorizes another's
 * — a confusing failure that looks like a permissions bug in the product.
 *
 * SAFETY: two independent conditions, both required.
 *   1. `environment.production === false`
 *   2. `environment.localAuthBypass === true`
 * Production builds set `production: true`, so this is inert there even if the
 * flag were somehow left on. It also never overwrites an existing session.
 */

/** SYSTEM_ADMIN — matches `RolesService.adminRoleId` (roles.service.ts:9). */
const SYSTEM_ADMIN_ROLE_ID = 1;

export function isLocalAuthBypassActive(): boolean {
  return environment.production === false && environment.localAuthBypass === true;
}

export function applyLocalAuthBypass(cache: CacheService): void {
  if (!isLocalAuthBypassActive()) return;

  // Never clobber a real session — if someone logged in properly against a
  // reachable Cognito, that session wins.
  if (cache.dataCache().access_token) {
    cache.isLoggedIn.set(true);
    return;
  }

  console.warn('[LOCAL_AUTH_BYPASS] Seeding a local dev session, skipping Cognito — DEV ONLY. ' + 'Mirrors the server bypass in jwr.middleware.ts.');

  const user: UserCache = {
    is_active: true,
    sec_user_id: 1,
    first_name: 'Local',
    last_name: 'Dev',
    roleName: 'System Admin',
    email: 'local-dev@example.com',
    status_id: 1,
    user_role_list: [
      {
        is_active: true,
        user_id: 1,
        role_id: SYSTEM_ADMIN_ROLE_ID,
        role: {
          is_active: true,
          justification_update: null,
          sec_role_id: SYSTEM_ADMIN_ROLE_ID,
          name: 'System Admin',
          focus_id: 1
        }
      }
    ]
  } as UserCache;

  const data: DataCache = Object.assign(new DataCache(), {
    // The server skips validation entirely, so the token only has to be present
    // for the interceptor to attach something. It is never parsed locally.
    access_token: 'local-auth-bypass',
    refresh_token: 'local-auth-bypass',
    user,
    // Far future, so the proactive-refresh path never fires and tries to reach
    // a Cognito that is not configured locally.
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365
  });

  localStorage.setItem('data', JSON.stringify(data));
  cache.dataCache.set(data);
  cache.isLoggedIn.set(true);
  cache.isValidatingToken.set(false);
}

import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { pooledFundingMonitorGuard } from './pooled-funding-monitor.guard';
import { ApiService } from '@services/api.service';
import { CacheService } from '@services/cache/cache.service';
import { RolesService } from '@services/cache/roles.service';
import { PoolFundingFlagsService } from '@services/pool-funding-flags.service';

// RolesService here is a useValue re-implementation of the rule (role_id !== 3), NOT the real service; the real
// computed is covered in roles.service.spec.ts. The router is a stub used only to recognise the redirect. Whether the route resolves is covered by pooled-funding-monitor.routes.spec.ts.
const HOME = { toString: () => '/home' } as UrlTree;

interface GuardOpts {
  /** has_access of GET_PiDelegateAccess: PI or active delegate of at least one project. */
  managesProject?: boolean;
  /** GET_PiDelegateAccess rejects. */
  accessFails?: boolean;
  userId?: number | null;
}

function runGuard(roleIds: number[], sectionEnabled: boolean, opts: GuardOpts = {}) {
  const load = jest.fn().mockResolvedValue(undefined);
  const GET_PiDelegateAccess = opts.accessFails
    ? jest.fn().mockRejectedValue(new Error('down'))
    : jest.fn().mockResolvedValue({ successfulRequest: true, data: { has_access: !!opts.managesProject } });
  const userId = opts.userId === undefined ? 42 : opts.userId;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: RolesService, useValue: { canAccessPooledFundingMonitor: () => roleIds.some(r => r !== 3) } },
      { provide: PoolFundingFlagsService, useValue: { load, sectionEnabled: signal(sectionEnabled) } },
      { provide: CacheService, useValue: { dataCache: signal({ user: userId == null ? undefined : { sec_user_id: userId } }) } },
      { provide: ApiService, useValue: { GET_PiDelegateAccess } },
      { provide: Router, useValue: { createUrlTree: jest.fn().mockReturnValue(HOME) } }
    ]
  });
  return {
    load,
    GET_PiDelegateAccess,
    result: TestBed.runInInjectionContext(() => pooledFundingMonitorGuard({ path: 'x' }, [])) as Promise<boolean | UrlTree>
  };
}

describe('pooledFundingMonitorGuard', () => {
  it('redirects a contributor-only user who is PI / delegate of nothing to /home', async () => {
    await expect(runGuard([3], true).result).resolves.toBe(HOME);
  });

  it('allows a contributor-only user who is PI or delegate of at least one project (same rule as My PI Delegates)', async () => {
    const { result, GET_PiDelegateAccess } = runGuard([3], true, { managesProject: true });
    await expect(result).resolves.toBe(true);
    // Own projects only: never the admin scope.
    expect(GET_PiDelegateAccess).toHaveBeenCalledWith(42);
  });

  it('denies a contributor-only user when the PI / delegate check fails', async () => {
    await expect(runGuard([3], true, { accessFails: true }).result).resolves.toBe(HOME);
  });

  it('denies a contributor-only user with no cached user id, without asking the server', async () => {
    const { result, GET_PiDelegateAccess } = runGuard([3], true, { userId: null, managesProject: true });
    await expect(result).resolves.toBe(HOME);
    expect(GET_PiDelegateAccess).not.toHaveBeenCalled();
  });

  it('allows a contributor who also holds another role, without the PI / delegate check', async () => {
    const { result, GET_PiDelegateAccess } = runGuard([3, 9], true);
    await expect(result).resolves.toBe(true);
    expect(GET_PiDelegateAccess).not.toHaveBeenCalled();
  });

  it('redirects a user with no roles who manages nothing', async () => {
    await expect(runGuard([], true).result).resolves.toBe(HOME);
  });

  it('redirects an allowed role when the POOL_FUNDING_SECTION_ENABLED flag is off (DD-PFM-12)', async () => {
    await expect(runGuard([9], false).result).resolves.toBe(HOME);
  });

  it('redirects a contributor PI too when the flag is off', async () => {
    await expect(runGuard([3], false, { managesProject: true }).result).resolves.toBe(HOME);
  });

  it('reads the flag before deciding', async () => {
    const { load, result } = runGuard([9], true);
    await result;
    expect(load).toHaveBeenCalledTimes(1);
  });
});

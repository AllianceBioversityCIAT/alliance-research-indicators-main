import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { pooledFundingMonitorGuard } from './pooled-funding-monitor.guard';
import { RolesService } from '@services/cache/roles.service';
import { PoolFundingFlagsService } from '@services/pool-funding-flags.service';

// RolesService here is a useValue re-implementation of the rule (role_id !== 3), NOT the real service; the real
// computed is covered in roles.service.spec.ts. The router is a stub used only to recognise the redirect. Whether the route resolves is covered by pooled-funding-monitor.routes.spec.ts.
const HOME = { toString: () => '/home' } as UrlTree;

function runGuard(roleIds: number[], sectionEnabled: boolean) {
  const load = jest.fn().mockResolvedValue(undefined);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: RolesService, useValue: { canAccessPooledFundingMonitor: () => roleIds.some(r => r !== 3) } },
      { provide: PoolFundingFlagsService, useValue: { load, sectionEnabled: signal(sectionEnabled) } },
      { provide: Router, useValue: { createUrlTree: jest.fn().mockReturnValue(HOME) } }
    ]
  });
  return {
    load,
    result: TestBed.runInInjectionContext(() => pooledFundingMonitorGuard({ path: 'x' }, [])) as Promise<boolean | UrlTree>
  };
}

describe('pooledFundingMonitorGuard', () => {
  it('redirects a contributor-only user to /home', async () => {
    await expect(runGuard([3], true).result).resolves.toBe(HOME);
  });

  it('allows a contributor who also holds another role', async () => {
    await expect(runGuard([3, 9], true).result).resolves.toBe(true);
  });

  it('redirects a user with no roles', async () => {
    await expect(runGuard([], true).result).resolves.toBe(HOME);
  });

  it('redirects an allowed role when the POOL_FUNDING_SECTION_ENABLED flag is off (DD-PFM-12)', async () => {
    await expect(runGuard([9], false).result).resolves.toBe(HOME);
  });

  it('reads the flag before deciding', async () => {
    const { load, result } = runGuard([9], true);
    await result;
    expect(load).toHaveBeenCalledTimes(1);
  });
});

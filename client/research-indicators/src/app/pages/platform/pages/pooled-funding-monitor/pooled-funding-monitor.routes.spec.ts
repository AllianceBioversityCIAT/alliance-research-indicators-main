import { Route } from '@angular/router';
import { routes } from '../../../../app.routes';
import { pooledFundingMonitorGuard } from '@guards/pooled-funding-monitor.guard';
import { rolesGuard } from '@guards/roles.guard';
import PooledFundingMonitorComponent from './pooled-funding-monitor.component';

// KZ-017: this walks the REAL route table and runs the REAL lazy import. It proves the path is
// registered, guarded and that its import resolves to the page. It CANNOT prove the router matches the
// URL at runtime (canMatch outcome, NG04002 from sibling ordering) or that the page renders in the
// browser; the running-app check at the HITL pause covers that.
function find(list: Route[], path: string): Route | undefined {
  for (const r of list) {
    if (r.path === path) return r;
    const hit = r.children ? find(r.children, path) : undefined;
    if (hit) return hit;
  }
  return undefined;
}

describe('pooled-funding-contribution-monitor route', () => {
  const route = find(routes, 'pooled-funding-contribution-monitor');

  it('is registered', () => {
    expect(route).toBeDefined();
  });

  it('is guarded by rolesGuard and the monitor guard', () => {
    expect(route?.canMatch).toEqual([rolesGuard, pooledFundingMonitorGuard]);
  });

  it('lazy-loads the page component', async () => {
    const loaded = await (route?.loadComponent as () => Promise<unknown>)();
    expect(loaded).toBe(PooledFundingMonitorComponent);
  });
});

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { appConfigurationGuard } from './app-configuration.guard';
import { RolesService } from '@services/cache/roles.service';
import { CacheService } from '@services/cache/cache.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

describe('appConfigurationGuard', () => {
  let roles: { canAccessAppConfiguration: jest.Mock };
  let router: { createUrlTree: jest.Mock };

  beforeEach(() => {
    roles = { canAccessAppConfiguration: jest.fn() };
    router = { createUrlTree: jest.fn(() => ({}) as UrlTree) };
    TestBed.configureTestingModule({
      providers: [
        { provide: RolesService, useValue: roles },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('allows access when user can manage app configuration', () => {
    roles.canAccessAppConfiguration.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => appConfigurationGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to home when user lacks access', () => {
    roles.canAccessAppConfiguration.mockReturnValue(false);
    TestBed.runInInjectionContext(() => appConfigurationGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
  });
});

/**
 * changes/control-lists-global-scope T-01 (R-CLG-008, J-10): Control Lists sits behind this guard,
 * so the role decision is exercised end to end with a REAL `RolesService` fed with role data —
 * a stubbed boolean would pass whatever `canAccessAppConfiguration` decides.
 */
describe('appConfigurationGuard with a real RolesService', () => {
  type RoleEntry = { role_id: number; role?: { focus_id?: number; sec_role_id?: number } };

  const run = (roleList: RoleEntry[]) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        RolesService,
        { provide: CacheService, useValue: { dataCache: signal({ user: { user_role_list: roleList } }) } },
        { provide: CreateResultManagementService, useValue: { editingOicr: () => false } }
      ]
    });
    return TestBed.runInInjectionContext(() => appConfigurationGuard({} as never, {} as never));
  };

  it('admits a user whose role list is [1] (System Admin)', () => {
    expect(run([{ role_id: 1 }])).toBe(true);
  });

  it('admits a user whose role list is [7] (Technical Support)', () => {
    expect(run([{ role_id: 7 }])).toBe(true);
  });

  it('denies a user whose role list is [9] with focus 1 (Center Admin) and redirects to /home', () => {
    const result = run([{ role_id: 9, role: { focus_id: 1, sec_role_id: 9 } }]);
    expect(result).not.toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/home');
  });

  it('denies a user with no roles', () => {
    expect(run([])).not.toBe(true);
  });
});

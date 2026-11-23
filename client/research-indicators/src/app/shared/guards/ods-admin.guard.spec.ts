import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { odsAdminGuard } from './ods-admin.guard';
import { RolesService } from '@services/cache/roles.service';
import { CacheService } from '@services/cache/cache.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

/**
 * The role decision is exercised with a real RolesService. A stubbed
 * `canAccessOdsAdmin` would pass whatever the stub returns and would not
 * show that Center Admin (9) is rejected while 1 and 11 are admitted.
 */
describe('odsAdminGuard', () => {
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
    return TestBed.runInInjectionContext(() => odsAdminGuard({} as never, []));
  };

  it('admits a user whose role list is [1] (System Admin)', () => {
    expect(run([{ role_id: 1 }])).toBe(true);
  });

  it('admits a user whose role list is [11] (ODS Admin)', () => {
    expect(run([{ role_id: 11 }])).toBe(true);
  });

  it('rejects a Center Admin (role 9, focus 1) and redirects to /home', () => {
    const result = run([{ role_id: 9, role: { focus_id: 1, sec_role_id: 9 } }]);
    expect(result).not.toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/home');
  });

  it('rejects a user with no roles and redirects to /home', () => {
    const result = run([]);
    expect(result).not.toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/home');
  });
});

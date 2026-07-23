import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { centerAdminGuard } from './center-admin.guard';
import { RolesService } from '@services/cache/roles.service';

describe('centerAdminGuard', () => {
  let roles: jest.Mocked<Pick<RolesService, 'canAccessCenterAdmin'>>;
  let router: Router;

  beforeEach(() => {
    roles = {
      canAccessCenterAdmin: jest.fn().mockReturnValue(true)
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: RolesService, useValue: roles },
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn((commands: unknown[]) => ({ commands })) }
        }
      ]
    });
    router = TestBed.inject(Router);
  });

  it('allows match when canAccessCenterAdmin is true', () => {
    const result = TestBed.runInInjectionContext(() => centerAdminGuard({} as any, []));
    expect(result).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to home when user cannot access center admin', () => {
    roles.canAccessCenterAdmin.mockReturnValue(false);
    TestBed.runInInjectionContext(() => centerAdminGuard({} as any, []));
    expect(router.createUrlTree).toHaveBeenCalledTimes(1);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
  });
});

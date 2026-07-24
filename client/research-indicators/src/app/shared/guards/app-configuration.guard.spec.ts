import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { appConfigurationGuard } from './app-configuration.guard';
import { RolesService } from '@services/cache/roles.service';

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

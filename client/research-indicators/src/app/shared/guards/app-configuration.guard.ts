import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { RolesService } from '@services/cache/roles.service';

export const appConfigurationGuard: CanMatchFn = () => {
  const roles = inject(RolesService);
  const router = inject(Router);
  if (roles.canAccessAppConfiguration()) {
    return true;
  }
  return router.createUrlTree(['/home']);
};

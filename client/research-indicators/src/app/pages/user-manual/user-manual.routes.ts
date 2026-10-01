import { Routes } from '@angular/router';

/**
 * Public routes for the STAR User Manual.
 *
 * Mounted at `/user-manual` in `app.routes.ts` ahead of the authenticated
 * shell, with no `rolesGuard`, so the manual is reachable signed in or out.
 */
export const userManualRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-manual.component'),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home-manual/home-manual.component'),
        data: { title: 'User manual - Home' }
      },
      {
        path: ':slug',
        loadComponent: () => import('./pages/coming-soon/coming-soon.component'),
        data: { title: 'User manual' }
      }
    ]
  }
];

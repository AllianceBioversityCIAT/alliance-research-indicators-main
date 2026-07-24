import { Routes } from '@angular/router';
import { rolesGuard } from '@guards/roles.guard';
import { centerAdminGuard } from '@guards/center-admin.guard';
import { appConfigurationGuard } from '@guards/app-configuration.guard';
import { resultExistsResolver } from '@pages/platform/pages/result/resolvers/result-exists.resolver';

const createResultData = () => ({
  title: 'Result Information'
});

export const routes: Routes = [
  {
    path: 'room/:id',
    loadComponent: () => import('./pages/room/room.component')
  },
  {
    path: 'fields',
    loadComponent: () => import('./pages/dynamic-fields/dynamic-fields.component')
  },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component')
  },

  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth.component')
  },
  {
    path: 'cache-test',
    loadComponent: () => import('./pages/cache-test/cache-test.component')
  },
  {
    path: 'oicr/download',
    loadComponent: () => import('./pages/oicr-download/oicr-download.component').then(m => m.default)
  },
  {
    path: 'reports/result/:id',
    loadComponent: () => import('./pages/star-report-viewer/star-report-viewer.component').then(m => m.default),
    canMatch: [rolesGuard],
    data: {
      isLoggedIn: true
    }
  },
  {
    path: '',
    loadComponent: () => import('@platform/platform.component'),
    canMatch: [rolesGuard],
    data: {
      isLoggedIn: true
    },
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'indicator/:id',
        loadComponent: () => import('@platform/pages/indicator/indicator.component'),
        data: {
          title: 'Indicator'
        }
      },
      {
        path: 'about-indicators',
        loadComponent: () => import('@platform/pages/about-indicators/about-indicators.component'),
        data: {
          title: 'About indicators'
        }
      },
      {
        path: 'load-results',
        loadComponent: () => import('@platform/pages/load-result/load-result.component')
      },
      {
        path: 'result/:id',
        loadComponent: () => import('@platform/pages/result/result.component'),
        resolve: {
          resultExists: resultExistsResolver
        },
        data: {
          showSectionHeaderActions: true
        },
        children: [
          {
            path: '',
            redirectTo: 'general-information',
            pathMatch: 'full'
          },
          {
            path: 'general-information',
            loadComponent: () => import('@platform/pages/result/pages/general-information/general-information.component'),
            data: createResultData()
          },
          {
            path: 'links-to-result',
            loadComponent: () => import('@platform/pages/result/pages/links-to-result/links-to-result.component'),
            data: createResultData()
          },
          {
            path: 'alliance-alignment',
            loadComponent: () => import('@platform/pages/result/pages/alliance-alignment/alliance-alignment.component'),
            data: createResultData()
          },
          {
            path: 'pool-funding-alignment',
            loadComponent: () => import('@platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component'),
            data: createResultData()
          },
          {
            path: 'partners',
            loadComponent: () => import('@platform/pages/result/pages/partners/partners.component'),
            data: createResultData()
          },
          {
            path: 'evidence',
            loadComponent: () => import('@platform/pages/result/pages/evidence/evidence.component'),
            data: createResultData()
          },
          {
            path: 'oicr-details',
            loadComponent: () => import('@platform/pages/result/pages/oicr-details/oicr-details.component'),
            data: createResultData()
          },
          {
            path: 'ip-rights',
            loadComponent: () => import('@platform/pages/result/pages/ip-rights/ip-rights.component'),
            data: createResultData()
          },
          {
            path: 'capacity-sharing',
            loadComponent: () => import('@platform/pages/result/pages/capacity-sharing/capacity-sharing.component'),
            data: createResultData()
          },
          {
            path: 'policy-change',
            loadComponent: () => import('@platform/pages/result/pages/policy-change/policy-change.component'),
            data: createResultData()
          },
          {
            path: 'innovation-details',
            loadComponent: () => import('@platform/pages/result/pages/innovation-details/innovation-details.component'),
            data: createResultData()
          },
          {
            path: 'geographic-scope',
            loadComponent: () => import('@platform/pages/result/pages/geographic-scope/geographic-scope.component'),
            data: createResultData()
          }
        ]
      },

      {
        path: 'home',
        loadComponent: () => import('@platform/pages/home/home.component'),
        data: {
          title: 'Home'
        }
      },
      {
        path: 'projects',
        loadComponent: () => import('@platform/pages/my-projects/my-projects.component'),
        data: {
          title: 'Projects',
          hideBackButton: true
        }
      },
      {
        path: 'results-center',
        loadComponent: () => import('@pages/platform/pages/results-center/results-center.component'),
        data: {
          title: 'Results Center'
        }
      },
      {
        path: 'search-a-result',
        loadComponent: () => import('./pages/platform/pages/search-a-result/search-a-result.component'),
        data: {
          title: 'Results List'
        }
      },
      {
        path: 'project-detail/:id',
        loadComponent: () => import('@platform/pages/project-detail/project-detail.component'),
        data: {
          title: 'Project Detail'
        },
        children: [
          {
            path: 'project-results',
            redirectTo: '../',
            pathMatch: 'full'
          },
          {
            path: 'project-dashboard',
            loadComponent: () =>
              import('@platform/pages/project-detail/components/project-dashboard/project-dashboard.component').then(
                m => m.ProjectDashboardComponent
              ),
            data: {
              title: 'Project Dashboard'
            }
          }
        ]
      },
      {
        path: 'about',
        loadComponent: () => import('@platform/pages/about/about.component'),
        data: {
          title: 'About'
        }
      },
      {
        path: 'notifications',
        loadComponent: () => import('@platform/pages/notifications/notifications.component'),
        data: {
          title: 'Notifications'
        }
      },
      {
        path: 'dashboard',
        loadComponent: () => import('@pages/platform/pages/dashboard/dashboard.component'),
        data: {
          title: 'Results Dashboard'
        }
      },
      {
        path: 'whats-new',
        loadComponent: () => import('@platform/pages/whats-new/whats-new.component'),
        data: {
          title: 'Release Notes'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('@platform/pages/whats-new/pages/whats-new-home/whats-new-home.component'),
            data: {
              title: 'Release Notes'
            }
          },
          {
            path: 'details/:id',
            loadComponent: () => import('@platform/pages/whats-new/pages/whats-new-details/whats-new-details.component'),
            data: {
              title: 'Release Notes'
            }
          }
        ]
      },
      {
        path: 'profile',
        loadComponent: () => import('@platform/pages/profile/profile.component'),
        data: {
          title: 'Profile'
        }
      },
      {
        path: 'administration/center-admin/bulk-upload',
        loadComponent: () =>
          import('@platform/pages/administration/center-admin/capacity-bulk-upload/capacity-bulk-upload.component').then(m => m.default),
        canMatch: [centerAdminGuard],
        data: {
          title: 'Bulk upload',
          isLoggedIn: true
        }
      },
      {
        path: 'administration/center-admin/agresso-pool-funding-tag',
        loadComponent: () =>
          import(
            '@platform/pages/administration/center-admin/agresso-pool-funding-tag/agresso-pool-funding-tag.component'
          ).then(m => m.default),
        canMatch: [centerAdminGuard],
        data: {
          title: 'AGRESSO Pool Funding Tag',
          isLoggedIn: true
        }
      },
      {
        path: 'administration/center-admin/sdg-management',
        loadComponent: () => import('@platform/pages/administration/center-admin/sdg-management/sdg-management.component').then(m => m.default),
        canMatch: [centerAdminGuard],
        data: {
          title: 'SDG Management',
          isLoggedIn: true
        }
      },
      {
        path: 'administration/center-admin/bilateral-mapping',
        loadComponent: () => import('@platform/pages/administration/center-admin/bilateral-mapping/bilateral-mapping.component').then(m => m.default),
        canMatch: [centerAdminGuard],
        data: {
          title: 'Bilateral Mapping',
          isLoggedIn: true
        }
      },
      {
        path: 'administration/center-admin/portfolio-management',
        loadComponent: () =>
          import('@platform/pages/administration/center-admin/portfolio-management/portfolio-management.component').then(m => m.default),
        canMatch: [centerAdminGuard],
        data: {
          title: 'Portfolio Management',
          isLoggedIn: true
        }
      },
      {
        path: 'administration/configuration/variables',
        loadComponent: () =>
          import('@platform/pages/administration/configuration/variable-configuration/variable-configuration.component').then(m => m.default),
        canMatch: [appConfigurationGuard],
        data: {
          title: 'Configuration variables',
          isLoggedIn: true
        }
      }
    ]
  },
  {
    path: '',
    loadComponent: () => import('@landing/landing.component'),
    canMatch: [rolesGuard],
    data: {
      isLoggedIn: false
    },
    children: [
      {
        path: '**',
        redirectTo: '',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'not-found',
    pathMatch: 'full'
  }
];

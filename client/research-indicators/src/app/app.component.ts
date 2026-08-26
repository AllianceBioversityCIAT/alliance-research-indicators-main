import { Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { environment } from '@envs/environment';
import { CacheService } from '@services/cache/cache.service';
import { MetadataPanelComponent } from '@components/metadata-panel/metadata-panel.component';
import { ActionsService } from './shared/services/actions.service';
import { GlobalAlertComponent } from './shared/components/global-alert/global-alert.component';
import { GlobalToastComponent } from './shared/components/global-toast/global-toast.component';
import { CopyTokenComponent } from './shared/components/copy-token/copy-token.component';
import { BugHerdService } from './shared/services/bug-herd.service';
import { ImpersonationService } from './shared/services/impersonation.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MetadataPanelComponent, GlobalAlertComponent, GlobalToastComponent, CopyTokenComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  cache = inject(CacheService);
  actions = inject(ActionsService);
  bugHerd = inject(BugHerdService);
  impersonation = inject(ImpersonationService);
  title = 'research-indicators';
  name = environment.name;
  route = inject(ActivatedRoute);

  constructor(private readonly router: Router) {
    window.addEventListener('popstate', () => {
      window.location.reload();
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const navType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navType.type === 'back_forward') {
          window.location.reload();
        }
      }
    });

    // @akili-spec changes/profile-simulation
    // Design §5 "Client restore": after CacheService's field-initializer hydration runs (above),
    // re-validate a persisted simulation with `/current`. Fire-and-forget — never block rendering.
    // `.catch` guards against an unhandled promise rejection surfacing as a runtime error.
    if (localStorage.getItem('impersonation')) {
      this.impersonation.restore().catch((error: unknown) => {
        console.error('Failed to restore impersonation session at bootstrap', error);
      });
    }
  }
}

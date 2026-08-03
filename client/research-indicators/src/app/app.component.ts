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

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MetadataPanelComponent, GlobalAlertComponent, GlobalToastComponent, CopyTokenComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  cache = inject(CacheService);
  actions = inject(ActionsService);
  bugHerd = inject(BugHerdService);
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
  }
}

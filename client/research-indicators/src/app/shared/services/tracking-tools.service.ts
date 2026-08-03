import { Injectable, inject } from '@angular/core';
import { ClarityService } from './clarity.service';
import { CacheService } from './cache/cache.service';
import { GoogleAnalyticsService } from './google-analytics.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HotjarService } from './hotjar.service';
import { BugHerdService } from './bug-herd.service';
@Injectable({
  providedIn: 'root'
})
export class TrackingToolsService {
  cache = inject(CacheService);
  clarity = inject(ClarityService);
  hotjar = inject(HotjarService);
  bugherd = inject(BugHerdService);
  googleAnalytics = inject(GoogleAnalyticsService);
  route = inject(ActivatedRoute);

  private readonly router = inject(Router);
  async init() {
    this.initAllTools();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.cache.currentUrlPath.set(event.urlAfterRedirects);
      this.updateAllTools(event.urlAfterRedirects);
      this.getCurrentTitle();

      if (this.cache.hasSmallScreen()) {
        this.cache.collapseSidebar();
      }
    });
  }

  private getCurrentTitle() {
    let currentRoute = this.route;
    this.cache.showSectionHeaderActions.set(false);
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
      if (currentRoute.snapshot.data['showSectionHeaderActions']) this.cache.showSectionHeaderActions.set(true);
    }
    const baseTitle = currentRoute.snapshot.data['title'] ?? '';
    this.cache.currentRouteTitle.set(baseTitle);
  }

  isTester() {
    if (localStorage.getItem('isTester') === 'true') return true;
    if (JSON.parse(localStorage.getItem('data') ?? '{}')?.user?.user_role_list?.find((role: { role_id: number }) => role.role_id === 8)) {
      localStorage.setItem('isTester', 'true');
      location.reload();
      return true;
    }

    return false;
  }

  initAllTools() {
    if (this.isTester()) return;
    this.clarity.init();
    this.googleAnalytics.init();
    this.hotjar.init();
  }

  updateAllTools(url: string) {
    if (this.isTester()) return;
    this.hotjar.updateState(url);
    this.clarity.updateState(url);
    this.googleAnalytics.updateState(url);
  }
}

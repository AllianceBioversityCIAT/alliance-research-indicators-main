import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const APP_TITLE = 'Research Indicators';

const RESULT_ROUTE_PATH = 'result/:id';

/**
 * Builds the browser tab title from the deepest route that declares one.
 * `data.pageTitle` wins over `data.title` because `title` also feeds the section header
 * (`CacheService.currentRouteTitle`), which on result pages must stay "Result Information".
 * Result pages are prefixed with the result code so several open results can be told apart.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(PageTitleStrategy.buildTitle(snapshot.root));
  }

  static buildTitle(root: ActivatedRouteSnapshot): string {
    let pageTitle: string | undefined;
    let resultCode: string | null = null;

    for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
      const routeTitle = route.data?.['pageTitle'] ?? route.data?.['title'];
      if (typeof routeTitle === 'string' && routeTitle.trim()) pageTitle = routeTitle.trim();
      if (route.routeConfig?.path === RESULT_ROUTE_PATH) resultCode = route.paramMap.get('id');
    }

    const page = [resultCode, pageTitle].filter(Boolean).join(' – ');
    return page ? `${page} | ${APP_TITLE}` : APP_TITLE;
  }
}

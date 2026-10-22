// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-09
//
// Page shell of the CGIAR Portfolio Contribution Monitor: header, scope toggle, KPI cards, the two
// tabs and the PI-empty / loading / error states. The tab bodies (coverage, queue) are filled by
// T-11..T-13. Read-only: no Sync button, no "PRMS sync" label (R-PFM-014). Tailwind only, no stylesheet.

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { isPfmMonitorEntryFromUrl } from '@shared/constants/result-entry-source';
import { resultCodeFromUrl } from './pfm-return-state';
import { RolesService } from '@shared/services/cache/roles.service';
import { PfmCoverageTabComponent } from './components/pfm-coverage-tab/pfm-coverage-tab.component';
import { PfmQueueTabComponent } from './components/pfm-queue-tab/pfm-queue-tab.component';
import { PFM_TABS, PfmScope, PfmTab } from './pfm.interfaces';
import { PfmStoreService } from './services/pfm-store.service';

@Component({
  selector: 'app-pooled-funding-monitor',
  standalone: true,
  imports: [PfmCoverageTabComponent, PfmQueueTabComponent],
  providers: [PfmStoreService],
  templateUrl: './pooled-funding-monitor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class PooledFundingMonitorComponent implements OnInit {
  readonly store = inject(PfmStoreService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly roles = inject(RolesService);
  private readonly router = inject(Router);

  /**
   * Leaving for a result opened from the queue (its link carries ?from=pfm-monitor): remember where the
   * user was, so the breadcrumb or browser Back brings them back to the same projects, pages and sort.
   */
  private readonly rememberOnLeave = this.router.events
    .pipe(
      filter((e): e is NavigationStart => e instanceof NavigationStart && isPfmMonitorEntryFromUrl(e.url)),
      takeUntilDestroyed()
    )
    .subscribe(e => this.store.saveReturnState(resultCodeFromUrl(e.url)));

  /** Back from a result: once its row is rendered (rows load lazily), bring it into view. */
  private readonly scrollBack = effect(() => {
    const code = this.store.focusResult();
    this.store.groupRows();
    if (!code) return;
    setTimeout(() => {
      const row = this.host.nativeElement.querySelector(`[data-result-code="${CSS.escape(code)}"]`);
      if (!row) return;
      row.scrollIntoView({ block: 'center' });
      this.store.focusResult.set(null);
    });
  });

  private static readonly MINE = { value: 'mine' as PfmScope, label: 'Only my results as PI' };
  private static readonly ALL = { value: 'all' as PfmScope, label: 'Whole portfolio' };
  /**
   * The whole portfolio is for every role other than Contributor. A Contributor reaches this page only
   * as PI or delegate of a project, so they get their own results only (owner 2026-10-21; the server
   * refuses scope=all for them). Admins see the whole portfolio first and open on it.
   */
  readonly canSeePortfolio = this.roles.canAccessPooledFundingMonitor();
  readonly scopes: { value: PfmScope; label: string }[] = !this.canSeePortfolio
    ? [PooledFundingMonitorComponent.MINE]
    : this.roles.isAdmin()
      ? [PooledFundingMonitorComponent.ALL, PooledFundingMonitorComponent.MINE]
      : [PooledFundingMonitorComponent.MINE, PooledFundingMonitorComponent.ALL];

  /**
   * Why the PI scope is empty. A user can lead or delegate projects none of which contributes to the
   * CGIAR Portfolio: telling them "you are not PI of any project" contradicts what they know.
   */
  readonly piEmptyMessage = computed(() =>
    this.store.summary()?.manages_any_project
      ? 'None of your projects contributes to the CGIAR Portfolio, so you have no results to report here.'
      : 'You are not PI or delegate of any project contributing to the CGIAR Portfolio.'
  );
  readonly tabs: { value: PfmTab; label: string }[] = [
    { value: 'coverage', label: 'Portfolio coverage' },
    { value: 'queue', label: 'Results queue' }
  ];

  /** PI scope, summary loaded, and the viewer is PI of nothing: show the empty state, never portfolio data. */
  readonly piEmpty = computed(() => {
    const summary = this.store.summary();
    return this.store.scope() === 'mine' && !this.store.summaryState().loading && summary?.scope === 'mine' && !summary.is_pi_of_any;
  });

  ngOnInit(): void {
    this.store.init({ defaultScope: this.roles.isAdmin() ? 'all' : 'mine', allowedScopes: this.scopes.map(s => s.value) });
  }

  selectScope(scope: PfmScope): void {
    this.store.setScope(scope);
  }

  selectTab(tab: PfmTab): void {
    this.store.setTab(tab);
  }

  /** WAI-ARIA tabs: arrows move + activate, Home/End jump. */
  onTabKeydown(event: KeyboardEvent, index: number): void {
    const last = PFM_TABS.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.store.setTab(PFM_TABS[next]);
    this.host.nativeElement.querySelector<HTMLElement>(`#pfm-tab-${PFM_TABS[next]}`)?.focus();
  }
}

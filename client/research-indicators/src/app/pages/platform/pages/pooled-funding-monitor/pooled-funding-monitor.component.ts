// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-09
//
// Page shell of the Pooled Funding Contribution Monitor: header, scope toggle, KPI cards, the two
// tabs and the PI-empty / loading / error states. The tab bodies (coverage, queue) are filled by
// T-11..T-13. Read-only: no Sync button, no "PRMS sync" label (R-PFM-014). Tailwind only, no stylesheet.

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject } from '@angular/core';
import { PfmKpiCardsComponent } from './components/pfm-kpi-cards/pfm-kpi-cards.component';
import { PFM_TABS, PfmScope, PfmTab } from './pfm.interfaces';
import { PfmStoreService } from './services/pfm-store.service';

@Component({
  selector: 'app-pooled-funding-monitor',
  standalone: true,
  imports: [PfmKpiCardsComponent],
  providers: [PfmStoreService],
  templateUrl: './pooled-funding-monitor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class PooledFundingMonitorComponent implements OnInit {
  readonly store = inject(PfmStoreService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly scopes: { value: PfmScope; label: string }[] = [
    { value: 'mine', label: 'Only my results as PI' },
    { value: 'all', label: 'Whole portfolio' }
  ];
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
    this.store.init();
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

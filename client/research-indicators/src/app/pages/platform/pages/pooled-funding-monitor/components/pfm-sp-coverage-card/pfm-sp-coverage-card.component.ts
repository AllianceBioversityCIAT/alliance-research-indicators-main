// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-007)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PfmScope, PfmSpCoverage } from '../../pfm.interfaces';

@Component({
  selector: 'app-pfm-sp-coverage-card',
  templateUrl: './pfm-sp-coverage-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmSpCoverageCardComponent {
  rows = input.required<PfmSpCoverage[]>();
  scope = input.required<PfmScope>();

  copy = computed(() =>
    this.scope() === 'all'
      ? { sub: 'Projects mapped to each program, and how many of them are already syncing', synced: 'Syncing to PRMS', unsynced: 'Not syncing' }
      : { sub: 'Your results mapped to each program, and how many are already synced to PRMS', synced: 'Synced to PRMS', unsynced: 'Not synced' }
  );

  /** Bar geometry only: outer = total / widest total, inner = synced / its own total. */
  view = computed(() => {
    const rows = this.rows();
    const max = Math.max(1, ...rows.map(r => r.total));
    return rows.map(r => ({
      ...r,
      wTotal: `${(r.total / max) * 100}%`,
      wSynced: `${r.total ? (r.synced / r.total) * 100 : 0}%`
    }));
  });
}

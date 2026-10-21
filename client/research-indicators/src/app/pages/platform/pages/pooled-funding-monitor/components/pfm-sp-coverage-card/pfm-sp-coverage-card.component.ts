// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-007)
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE, PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PFM_HELP } from '../../pfm-help';
import { PfmScope, PfmSpCoverage } from '../../pfm.interfaces';

@Component({
  selector: 'app-pfm-sp-coverage-card',
  imports: [TooltipModule],
  templateUrl: './pfm-sp-coverage-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmSpCoverageCardComponent {
  rows = input.required<PfmSpCoverage[]>();
  scope = input.required<PfmScope>();
  /** Opens the Results queue filtered by that Science Program. */
  openSp = output<string>();

  readonly help = PFM_HELP;
  readonly syncedFill = PFM_STATE.done.fill;
  readonly unsyncedFill = PFM_STATE_EMPTY;

  copy = computed(() =>
    this.scope() === 'all'
      ? { sub: 'Results mapped to each program, and how many are already in PRMS', synced: 'In PRMS', unsynced: 'Not in PRMS yet' }
      : { sub: 'Your results mapped to each program, and how many are already in PRMS', synced: 'In PRMS', unsynced: 'Not in PRMS yet' }
  );

  /**
   * Bar geometry. Each bar is as long as ITS total (total / widest total) and is drawn only by its own
   * two segments, synced + not synced = 100% of that bar: there is no track behind it, so no grey
   * filler that reads as a third state.
   */
  view = computed(() => {
    const rows = this.rows();
    const max = Math.max(1, ...rows.map(r => r.total));
    return rows.map(r => {
      const synced = Math.min(r.synced, r.total);
      return {
        ...r,
        unsynced: r.total - synced,
        wTotal: `${(r.total / max) * 100}%`,
        wSynced: `${r.total ? (synced / r.total) * 100 : 0}%`
      };
    });
  });
}

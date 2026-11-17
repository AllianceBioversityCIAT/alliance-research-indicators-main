// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-007)
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PfmEmptyStateComponent } from '../pfm-empty-state/pfm-empty-state.component';
import { PFM_HELP } from '../../pfm-help';
import { PfmScope, PfmSpCoverage } from '../../pfm.interfaces';

@Component({
  selector: 'app-pfm-sp-coverage-card',
  imports: [TooltipModule, PfmEmptyStateComponent],
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
  /** The section's dark navy (owner: not green here); the grey track is the program's total. */
  readonly syncedFill = 'var(--ac-pfm-accent-navy)';
  readonly unsyncedFill = PFM_STATE_EMPTY;

  copy = computed(() =>
    this.scope() === 'all'
      ? { sub: 'Results mapped to each program, and how many are already in PRMS', synced: 'In PRMS', unsynced: 'Not in PRMS yet' }
      : { sub: 'Your results mapped to each program, and how many are already in PRMS', synced: 'In PRMS', unsynced: 'Not in PRMS yet' }
  );

  /**
   * Bar geometry. Every bar has the same length = 100% of THAT program's results; it fills with the
   * share already in PRMS, so programs compare by how far along they are, not by size.
   */
  view = computed(() =>
    this.rows().map(r => {
      const synced = Math.min(r.synced, r.total);
      return { ...r, unsynced: r.total - synced, wSynced: `${r.total ? (synced / r.total) * 100 : 0}%` };
    })
  );
}

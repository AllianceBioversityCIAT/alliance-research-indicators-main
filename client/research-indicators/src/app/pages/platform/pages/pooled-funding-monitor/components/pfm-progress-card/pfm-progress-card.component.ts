// Coverage tab, first card: how much of what we must report is already in PRMS, with the two
// numbers that matter as buttons into the Results queue. Every number here is a quick view, so a
// click shows exactly that many results.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE, PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PFM_HELP } from '../../pfm-help';
import { PfmChip, PfmChipCounts, PfmScope } from '../../pfm.interfaces';

@Component({
  selector: 'app-pfm-progress-card',
  imports: [DecimalPipe, TooltipModule],
  templateUrl: './pfm-progress-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmProgressCardComponent {
  /** Quick-view counts of the scope: `synced` = in PRMS, `attention` = still on us. */
  counts = input.required<PfmChipCounts>();
  /** Results declared out of scope: they never go to PRMS and need nothing. */
  outOfScope = input(0);
  scope = input.required<PfmScope>();
  /** Opens the Results queue on that quick view. */
  open = output<PfmChip>();

  readonly help = PFM_HELP;
  /** The section's navy (owner: not green). */
  readonly navy = 'var(--ac-pfm-accent-navy)';
  readonly emptyFill = PFM_STATE_EMPTY;
  /** Marker colours: the palette's amber. */
  readonly pinFill = PFM_STATE.progress.fill;
  readonly pinFg = PFM_STATE.progress.fg;

  progress = computed(() => {
    const synced = this.counts().synced;
    const left = this.counts().attention;
    const total = synced + left;
    // Floor, so 99.6% never reads as finished while something is still left.
    const percent = total === 0 ? 0 : left === 0 ? 100 : Math.floor((synced / total) * 100);
    return { synced, left, total, percent, complete: total > 0 && left === 0, width: total ? `${(synced / total) * 100}%` : '0%' };
  });

  whose = computed(() => (this.scope() === 'all' ? 'all contributing projects' : 'your projects'));

  syncedTip = computed(() => `${this.progress().synced} ${this.progress().synced === 1 ? 'result' : 'results'} in PRMS. Click to see them.`);
  leftTip = computed(() => `${this.progress().left} ${this.progress().left === 1 ? 'result needs' : 'results need'} action. Click to see them.`);
  /** Marker position: the bar's content box starts 27px in (under the badge) and ends 3px before the edge. */
  markerLeft = computed(() => `calc(27px + (100% - 30px) * ${this.progress().total ? this.progress().synced / this.progress().total : 0})`);
}

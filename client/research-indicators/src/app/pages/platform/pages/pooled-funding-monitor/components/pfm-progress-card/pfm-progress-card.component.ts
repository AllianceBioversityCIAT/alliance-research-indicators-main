// Coverage tab, first card: how many results already have a decision (in PRMS, or declared no SP
// contribution), as one bar of two parts: done (one total) and still to do. Each part is a button to
// its quick view (owner): done -> Synced with PRMS, still to do -> Need attention.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE, PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PfmEmptyStateComponent } from '../pfm-empty-state/pfm-empty-state.component';
import { PfmChip, PfmChipCounts } from '../../pfm.interfaces';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

@Component({
  selector: 'app-pfm-progress-card',
  imports: [TooltipModule, PfmEmptyStateComponent],
  templateUrl: './pfm-progress-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmProgressCardComponent {
  /** Quick-view counts of the scope: `synced` + `no_sp` = done, `attention` = still on us. */
  counts = input.required<PfmChipCounts>();
  /** Opens the Results queue on that quick view. */
  open = output<PfmChip>();

  /** Done is ONE part in the palette's green (owner): in PRMS and no SP contribution are one total. */
  readonly doneFill = PFM_STATE.done.fill;
  readonly doneFg = PFM_STATE.done.fg;
  readonly emptyFill = PFM_STATE_EMPTY;

  progress = computed(() => {
    const synced = this.counts().synced;
    const noSp = this.counts().no_sp ?? 0;
    const left = this.counts().attention;
    const done = synced + noSp;
    const total = done + left;
    // Floor, so 99.6% never reads as finished while something is still left.
    const percent = total === 0 ? 0 : left === 0 ? 100 : Math.floor((done / total) * 100);
    return {
      done,
      left,
      total,
      percent,
      complete: total > 0 && left === 0,
      // Inside the green part when it is wide enough for "100%", else right after it.
      labelInside: percent >= 15,
      doneWidth: total ? `${(done / total) * 100}%` : '0%',
      doneTip: `${plural(done, 'result', 'results')} done: ${synced} in PRMS and ${noSp} with no SP contribution. Click to see the results synced with PRMS.`,
      leftTip: `${plural(left, 'result still needs', 'results still need')} action. Click to see them.`
    };
  });

}

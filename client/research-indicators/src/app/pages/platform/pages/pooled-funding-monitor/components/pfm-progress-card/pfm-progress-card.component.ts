// Coverage tab, first card: how many results already have a decision (in PRMS, or declared no SP
// contribution), as one bar. The bar is the click target: each part opens the Results queue on that
// view (Synced / No SP contribution / Need attention), which together partition every result.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PfmChip, PfmChipCounts, PfmScope } from '../../pfm.interfaces';

interface BarPart {
  chip: PfmChip;
  value: number;
  width: string;
  color: string | null;
  tip: string;
  testId: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

@Component({
  selector: 'app-pfm-progress-card',
  imports: [TooltipModule],
  templateUrl: './pfm-progress-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmProgressCardComponent {
  /** Quick-view counts of the scope: `synced` + `no_sp` = done, `attention` = still on us. */
  counts = input.required<PfmChipCounts>();
  scope = input.required<PfmScope>();
  /** Opens the Results queue on that view. */
  open = output<PfmChip>();

  /** The section's navy, and a lighter navy for "no SP contribution" (owner: not green). */
  readonly navy = 'var(--ac-pfm-accent-navy)';
  readonly lightNavy = 'var(--ac-pfm-month-4)';
  readonly emptyFill = PFM_STATE_EMPTY;

  progress = computed(() => {
    const synced = this.counts().synced;
    const noSp = this.counts().no_sp ?? 0;
    const left = this.counts().attention;
    const done = synced + noSp;
    const total = done + left;
    // Floor, so 99.6% never reads as finished while something is still left.
    const percent = total === 0 ? 0 : left === 0 ? 100 : Math.floor((done / total) * 100);
    const pct = (n: number) => (total ? `${(n / total) * 100}%` : '0%');
    const parts: BarPart[] = [
      { chip: 'synced', value: synced, width: pct(synced), color: this.navy, tip: `${plural(synced, 'result', 'results')} in PRMS. Click to see them.`, testId: 'pfm-progress-open-synced' },
      { chip: 'no_sp_contribution', value: noSp, width: pct(noSp), color: this.lightNavy, tip: `${plural(noSp, 'result', 'results')} with no SP contribution: nothing to do. Click to see them.`, testId: 'pfm-progress-open-no-sp' },
      { chip: 'need_attention', value: left, width: pct(left), color: null, tip: `${plural(left, 'result needs', 'results need')} action. Click to see them.`, testId: 'pfm-progress-open-attention' }
    ];
    return { done, left, total, percent, complete: total > 0 && left === 0, parts: parts.filter(p => p.value > 0) };
  });

  whose = computed(() => (this.scope() === 'all' ? 'all contributing projects' : 'your projects'));
}

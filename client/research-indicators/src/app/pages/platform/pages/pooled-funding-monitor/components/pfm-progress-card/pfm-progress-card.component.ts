// The first thing on the coverage tab (owner change request, CAMBIO 1): ONE progress bar.
// 100% = every monitored result has a decision: sent to PRMS or marked out of scope.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE, PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PFM_HELP } from '../../pfm-help';
import { PfmPipeline, PfmScope } from '../../pfm.interfaces';

@Component({
  selector: 'app-pfm-progress-card',
  imports: [DecimalPipe, TooltipModule],
  templateUrl: './pfm-progress-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmProgressCardComponent {
  pipeline = input.required<PfmPipeline>();
  scope = input.required<PfmScope>();

  readonly help = PFM_HELP;
  readonly doneFill = PFM_STATE.done.fill;
  readonly doneFg = PFM_STATE.done.fg;
  readonly emptyFill = PFM_STATE_EMPTY;

  progress = computed(() => {
    const p = this.pipeline();
    const total = p.total;
    const done = Math.min(total, p.in_prms + p.out_of_scope);
    const remaining = total - done;
    // Floor, so 99.6% never reads as a finished 100% while something is still pending.
    const percent = total === 0 ? 0 : remaining === 0 ? 100 : Math.floor((done / total) * 100);
    return { total, done, remaining, percent, complete: total > 0 && remaining === 0, width: total ? `${(done / total) * 100}%` : '0%' };
  });

  whose = computed(() => (this.scope() === 'all' ? 'Across all contributing projects' : 'Across your projects'));
}

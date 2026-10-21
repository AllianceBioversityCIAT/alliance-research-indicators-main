// Stacked bar + legend used by the coverage charts. The segments always add up to the whole bar
// (no filler), each state keeps its palette colour (PFM_STATE) and its plain-language tooltip.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE, PFM_STATE_EMPTY, PfmStateKey } from '@shared/constants/pfm-status-colors';

export interface PfmStateSegment {
  key: string;
  label: string;
  value: number;
  state: PfmStateKey;
  help: string;
}

@Component({
  selector: 'app-pfm-state-bar',
  imports: [DecimalPipe, TooltipModule],
  templateUrl: './pfm-state-bar.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmStateBarComponent {
  segments = input.required<PfmStateSegment[]>();
  /** Accessible name of the bar, e.g. "Our side: 108 results". */
  label = input.required<string>();

  readonly emptyFill = PFM_STATE_EMPTY;

  total = computed(() => this.segments().reduce((a, s) => a + s.value, 0));

  view = computed(() => {
    const total = this.total();
    return this.segments().map(s => ({
      ...s,
      fill: PFM_STATE[s.state].fill,
      fg: PFM_STATE[s.state].fg,
      share: total ? Math.round((s.value / total) * 100) : 0
    }));
  });

  /** Only non-zero states get a segment: a zero-width element would be noise for a screen reader. */
  bar = computed(() => this.view().filter(s => s.value > 0));
}

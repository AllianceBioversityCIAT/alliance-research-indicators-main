// Coverage tab, "What to do next": the three things left on our side, each one a quick view.
// Together they are exactly Need attention (Mapping pending + Ready to sync + Rejected), and a
// click opens the Results queue on that quick view.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PFM_STATE, PfmStateKey } from '@shared/constants/pfm-status-colors';
import { PfmChip, PfmChipCounts } from '../../pfm.interfaces';

interface NextStep {
  chip: PfmChip;
  count: keyof PfmChipCounts;
  title: string;
  hint: string;
  state: PfmStateKey;
  icon: string;
}

export const PFM_NEXT_STEPS: NextStep[] = [
  {
    chip: 'mapping_incomplete',
    count: 'mapping',
    title: 'Finish the mapping',
    hint: 'Complete the CGIAR Portfolio mapping of these results.',
    state: 'progress',
    icon: 'pi-pencil'
  },
  {
    chip: 'ready_to_sync',
    count: 'ready',
    title: 'Send to PRMS',
    hint: 'Their mapping is complete: they can be synced now.',
    state: 'ready',
    icon: 'pi-send'
  },
  {
    chip: 'rejected',
    count: 'prms_rejected',
    title: 'Fix and send again',
    hint: 'PRMS returned them. Check the reason and sync again.',
    state: 'alert',
    icon: 'pi-replay'
  }
];

@Component({
  selector: 'app-pfm-next-steps-card',
  imports: [DecimalPipe],
  templateUrl: './pfm-next-steps-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmNextStepsCardComponent {
  counts = input.required<PfmChipCounts>();
  /** Opens the Results queue on that quick view. */
  open = output<PfmChip>();

  steps = computed(() =>
    PFM_NEXT_STEPS.map(s => ({ ...s, value: this.counts()[s.count], fg: PFM_STATE[s.state].fg, fill: PFM_STATE[s.state].fill }))
  );
  allDone = computed(() => this.steps().every(s => s.value === 0));
}

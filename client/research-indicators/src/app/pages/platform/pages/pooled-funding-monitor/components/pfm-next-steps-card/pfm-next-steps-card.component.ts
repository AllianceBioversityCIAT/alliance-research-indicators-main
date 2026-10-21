// Coverage tab, "What to do next": the things left on our side, in the order they happen (PI
// approval, mapping, sync). A click opens the Results queue on that view. A result can be in more
// than one card (e.g. not approved yet AND mapping pending), so the cards do not add up.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PFM_STATE, PfmStateKey } from '@shared/constants/pfm-status-colors';
import { PfmEmptyStateComponent } from '../pfm-empty-state/pfm-empty-state.component';
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
    chip: 'awaiting_pi',
    count: 'awaiting_pi',
    title: 'Pending approval by the PI',
    hint: 'Not approved in STAR yet: the PI needs to approve them.',
    state: 'waiting',
    icon: 'pi-user'
  },
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
  }
];

@Component({
  selector: 'app-pfm-next-steps-card',
  imports: [DecimalPipe, PfmEmptyStateComponent],
  templateUrl: './pfm-next-steps-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmNextStepsCardComponent {
  counts = input.required<PfmChipCounts>();
  /** Opens the Results queue on that quick view. */
  open = output<PfmChip>();

  steps = computed(() =>
    PFM_NEXT_STEPS.map(s => ({ ...s, value: this.counts()[s.count] ?? 0, fg: PFM_STATE[s.state].fg, fill: PFM_STATE[s.state].fill }))
  );
  allDone = computed(() => this.steps().every(s => s.value === 0));
}

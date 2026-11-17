// Coverage tab, "What to do next": the things left on our side, in the order they happen (PI
// approval, mapping, sync). A click opens the Results queue on that view. A result can be in more
// than one card (e.g. not approved yet AND mapping pending), so the cards do not add up.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PFM_STATE, statusColor } from '@shared/constants/pfm-status-colors';
import { PfmEmptyStateComponent } from '../pfm-empty-state/pfm-empty-state.component';
import { PfmChip, PfmChipCounts } from '../../pfm.interfaces';

interface NextStep {
  chip: PfmChip;
  count: keyof PfmChipCounts;
  title: string;
  hint: string;
  /** Card colour: a status's own colour when the card stands for a status (Finish the mapping = mapping Pending). */
  color: string;
  icon: string;
}

export const PFM_NEXT_STEPS: NextStep[] = [
  {
    chip: 'awaiting_pi',
    count: 'awaiting_pi',
    title: 'Approve the results',
    hint: 'Not approved in STAR yet: the PI needs to approve them.',
    color: PFM_STATE.waiting.fill,
    icon: 'pi-user'
  },
  {
    chip: 'mapping_incomplete',
    count: 'mapping',
    title: 'Finish the mapping',
    hint: 'Complete the CGIAR Portfolio mapping of these results.',
    color: statusColor({ mapping: 'Pending' }),
    icon: 'pi-pencil'
  },
  {
    chip: 'ready_to_sync',
    count: 'ready',
    title: 'Send to PRMS',
    hint: 'Their mapping is complete: they can be synced now.',
    color: PFM_STATE.ready.fill,
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

  steps = computed(() => {
    const all = this.counts().all || 0;
    return PFM_NEXT_STEPS.map(s => {
      const value = this.counts()[s.count] ?? 0;
      const fg = s.color;
      const fill = s.color;
      return {
        ...s,
        value,
        fg,
        fill,
        // Soft card ground and outline mixed from the state token, so light and dark follow it.
        tint: `color-mix(in srgb, ${fill} 9%, var(--ac-pfm-surface))`,
        edge: `color-mix(in srgb, ${fill} 30%, var(--ac-pfm-surface))`,
        share: all ? Math.min(100, Math.round((value / all) * 100)) : 0
      };
    });
  });
  allDone = computed(() => this.steps().every(s => s.value === 0));
}

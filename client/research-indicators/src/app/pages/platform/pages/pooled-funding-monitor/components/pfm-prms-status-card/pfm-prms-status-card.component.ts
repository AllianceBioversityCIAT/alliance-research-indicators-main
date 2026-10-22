// Coverage tab, "PRMS status": a donut of everything that already has a decision — in PRMS
// (pending review / approved / rejected) plus no SP contribution — with the total in the middle.
// Each slice (and its legend row) opens the Results queue on exactly those results.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PfmStatusRef, statusColor } from '@shared/constants/pfm-status-colors';
import { PfmEmptyStateComponent } from '../pfm-empty-state/pfm-empty-state.component';
import { PfmChip, PfmPipeline } from '../../pfm.interfaces';

interface Slice {
  key: string;
  label: string;
  stage: string;
  chip: PfmChip;
  /** The status the slice stands for: its colour is that status's colour, the same as the table tag. */
  status: PfmStatusRef;
}

/** Order around the donut and in the legend; values come from the pipeline stages. */
export const PFM_PRMS_SLICES: Slice[] = [
  { key: 'approved', label: 'Approved by PRMS', stage: 'approved', chip: 'prms_approved', status: { prms: 'Approved' } },
  { key: 'pending_review', label: 'Pending review in PRMS', stage: 'pending_review', chip: 'prms_pending', status: { prms: 'Pending Review' } },
  { key: 'rejected', label: 'Rejected by PRMS', stage: 'rejected', chip: 'rejected', status: { prms: 'Rejected' } },
  { key: 'no_sp', label: 'No SP contribution', stage: 'no_sp_contribution', chip: 'no_sp_contribution', status: { mapping: 'No SP contribution' } }
];

/** Donut geometry (SVG user units). */
const R = 48;
const C = 2 * Math.PI * R;

@Component({
  selector: 'app-pfm-prms-status-card',
  imports: [DecimalPipe, TooltipModule, PfmEmptyStateComponent],
  templateUrl: './pfm-prms-status-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmPrmsStatusCardComponent {
  pipeline = input.required<PfmPipeline>();
  /** Opens the Results queue on that view. */
  /** Each slice opens its own view in the queue (shown there as a removable tag). */
  open = output<PfmChip>();

  readonly r = R;
  readonly circumference = C;

  slices = computed(() => {
    const stages = this.pipeline().stages;
    const raw = PFM_PRMS_SLICES.map(s => ({ ...s, value: stages.find(x => x.key === s.stage)?.value ?? 0 }));
    const total = raw.reduce((a, s) => a + s.value, 0);
    let offset = 0;
    return {
      total,
      items: raw.map(s => {
        const share = total ? s.value / total : 0;
        const item = {
          ...s,
          share: Math.round(share * 100),
          fill: statusColor(s.status),
          fg: statusColor(s.status),
          dash: `${share * C} ${C - share * C}`,
          dashOffset: -offset * C,
          tip: `${s.label}: ${s.value} (${Math.round(share * 100)}%). Click to see them.`,
          legendTip: `${s.label}: ${s.value} ${s.value === 1 ? 'result' : 'results'} (${Math.round(share * 100)}%)`
        };
        offset += share;
        return item;
      })
    };
  });
}

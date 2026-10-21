// Coverage tab, chart B (owner change request, CAMBIO 2): what happened to what we already sent:
// pending review / approved / rejected, why PRMS rejected, and which projects to contact.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE } from '@shared/constants/pfm-status-colors';
import { PFM_HELP } from '../../pfm-help';
import { PfmPipeline, PfmProjectProgress, PfmRejectionReason } from '../../pfm.interfaces';
import { PfmStateBarComponent, PfmStateSegment } from '../pfm-state-bar/pfm-state-bar.component';

/** How many reasons / projects to list before "and N more". */
export const PFM_PRMS_LIST_LIMIT = 5;

@Component({
  selector: 'app-pfm-prms-side-card',
  imports: [DecimalPipe, TooltipModule, PfmStateBarComponent],
  templateUrl: './pfm-prms-side-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmPrmsSideCardComponent {
  pipeline = input.required<PfmPipeline>();
  projects = input.required<PfmProjectProgress[]>();
  reasons = input.required<PfmRejectionReason[]>();

  readonly help = PFM_HELP;
  readonly alertFg = PFM_STATE.alert.fg;

  segments = computed<PfmStateSegment[]>(() => {
    const v = (key: string) => this.pipeline().stages.find(s => s.key === key)?.value ?? 0;
    return [
      { key: 'pending_review', label: 'Pending review in PRMS', value: v('pending_review'), state: 'waiting', help: PFM_HELP.pendingReview },
      { key: 'approved', label: 'Approved by PRMS', value: v('approved'), state: 'done', help: PFM_HELP.approved },
      { key: 'rejected', label: 'Rejected by PRMS', value: v('rejected'), state: 'alert', help: PFM_HELP.rejectedState }
    ];
  });

  sent = computed(() => this.pipeline().in_prms);
  barLabel = computed(() => `PRMS side: ${this.sent()} results sent`);

  topReasons = computed(() => this.reasons().slice(0, PFM_PRMS_LIST_LIMIT));
  moreReasons = computed(() => Math.max(0, this.reasons().length - PFM_PRMS_LIST_LIMIT));

  withRejections = computed(() =>
    this.projects()
      .filter(p => p.rejected > 0)
      .sort((a, b) => b.rejected - a.rejected || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
      .slice(0, PFM_PRMS_LIST_LIMIT)
  );
}

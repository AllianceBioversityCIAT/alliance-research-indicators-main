// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-006..008)
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PfmChip, PfmChipCounts, PfmScope, PfmSummary } from '../../pfm.interfaces';
import { PfmNextStepsCardComponent } from '../pfm-next-steps-card/pfm-next-steps-card.component';
import { PfmProgressCardComponent } from '../pfm-progress-card/pfm-progress-card.component';
import { PfmSpCoverageCardComponent } from '../pfm-sp-coverage-card/pfm-sp-coverage-card.component';
import { PfmSyncActivityCardComponent } from '../pfm-sync-activity-card/pfm-sync-activity-card.component';

/** What a click on a coverage chart opens in the Results queue. */
export interface PfmQueueTarget {
  chip?: PfmChip;
  sp?: string;
}

/**
 * Coverage tab, built to lead to action: how much is in PRMS, what to do next, then the Science
 * Program and sync-activity detail. Every number is a quick view (or an SP filter) and a click opens
 * the Results queue on it. Loading / error / Retry for the summary request live in the page panel.
 */
@Component({
  selector: 'app-pfm-coverage-tab',
  imports: [PfmProgressCardComponent, PfmNextStepsCardComponent, PfmSpCoverageCardComponent, PfmSyncActivityCardComponent],
  templateUrl: './pfm-coverage-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmCoverageTabComponent {
  summary = input.required<PfmSummary>();
  scope = input.required<PfmScope>();
  openQueue = output<PfmQueueTarget>();

  /** The scope's quick-view counts; a server without them falls back to the KPI figures. */
  counts = computed<PfmChipCounts>(() => {
    const s = this.summary();
    return (
      s.chip_counts ?? {
        all: s.kpis.monitored,
        attention: s.kpis.need_attention,
        mapping: 0,
        ready: 0,
        prms_rejected: 0,
        synced: s.kpis.synced
      }
    );
  });
}

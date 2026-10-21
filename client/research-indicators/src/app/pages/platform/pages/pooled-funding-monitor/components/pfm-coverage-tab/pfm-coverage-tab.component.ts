// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-006..008)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PfmScope, PfmSummary } from '../../pfm.interfaces';
import { PfmAllianceSideCardComponent } from '../pfm-alliance-side-card/pfm-alliance-side-card.component';
import { PfmPrmsSideCardComponent } from '../pfm-prms-side-card/pfm-prms-side-card.component';
import { PfmProgressCardComponent } from '../pfm-progress-card/pfm-progress-card.component';
import { PfmSpCoverageCardComponent } from '../pfm-sp-coverage-card/pfm-sp-coverage-card.component';
import { PfmSyncActivityCardComponent } from '../pfm-sync-activity-card/pfm-sync-activity-card.component';

/**
 * Coverage tab: the progress bar first (how far along we are), then our side vs. the PRMS side,
 * then the Science Program and sync-activity detail. Loading / error / Retry for the shared summary
 * request live in the page panel.
 */
@Component({
  selector: 'app-pfm-coverage-tab',
  imports: [PfmProgressCardComponent, PfmAllianceSideCardComponent, PfmPrmsSideCardComponent, PfmSpCoverageCardComponent, PfmSyncActivityCardComponent],
  templateUrl: './pfm-coverage-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmCoverageTabComponent {
  summary = input.required<PfmSummary>();
  scope = input.required<PfmScope>();

  /** Empty lists when the server does not send them yet (client deployed first). */
  projects = computed(() => this.summary().project_progress ?? []);
  reasons = computed(() => this.summary().prms_rejection_reasons ?? []);
}

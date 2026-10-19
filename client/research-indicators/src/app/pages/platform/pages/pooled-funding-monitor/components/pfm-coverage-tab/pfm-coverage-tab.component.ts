// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-006..008)
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PfmScope, PfmSummary } from '../../pfm.interfaces';
import { PfmPipelineCardComponent } from '../pfm-pipeline-card/pfm-pipeline-card.component';
import { PfmSpCoverageCardComponent } from '../pfm-sp-coverage-card/pfm-sp-coverage-card.component';
import { PfmSyncActivityCardComponent } from '../pfm-sync-activity-card/pfm-sync-activity-card.component';

/** Hosts the three coverage cards; loading / error / Retry for the shared summary request live in the page panel. */
@Component({
  selector: 'app-pfm-coverage-tab',
  imports: [PfmPipelineCardComponent, PfmSpCoverageCardComponent, PfmSyncActivityCardComponent],
  templateUrl: './pfm-coverage-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmCoverageTabComponent {
  summary = input.required<PfmSummary>();
  scope = input.required<PfmScope>();
}

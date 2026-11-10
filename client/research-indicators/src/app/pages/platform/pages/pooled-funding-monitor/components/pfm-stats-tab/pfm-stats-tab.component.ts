import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PfmScope, PfmSummary } from '../../pfm.interfaces';
import { PfmQueueTarget } from '../pfm-coverage-tab/pfm-coverage-tab.component';
import { PfmPrmsStatusCardComponent } from '../pfm-prms-status-card/pfm-prms-status-card.component';
import { PfmSpCoverageCardComponent } from '../pfm-sp-coverage-card/pfm-sp-coverage-card.component';
import { PfmSyncActivityCardComponent } from '../pfm-sync-activity-card/pfm-sync-activity-card.component';
import { PfmSyncedByTypeCardComponent } from '../pfm-synced-by-type-card/pfm-synced-by-type-card.component';

/**
 * Stats tab: the monitor's charts, two by two. A click on a Science Program or a PRMS status opens
 * the Results queue on it, as it did on the coverage tab. Loading / error / Retry live in the page panel.
 */
@Component({
  selector: 'app-pfm-stats-tab',
  imports: [PfmSpCoverageCardComponent, PfmPrmsStatusCardComponent, PfmSyncActivityCardComponent, PfmSyncedByTypeCardComponent],
  templateUrl: './pfm-stats-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmStatsTabComponent {
  summary = input.required<PfmSummary>();
  scope = input.required<PfmScope>();
  openQueue = output<PfmQueueTarget>();
}

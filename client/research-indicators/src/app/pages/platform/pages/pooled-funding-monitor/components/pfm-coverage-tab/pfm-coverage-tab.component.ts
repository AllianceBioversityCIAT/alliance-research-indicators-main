// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-006..008)
import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PfmChip, PfmChipCounts, PfmProjectsFilter, PfmScope, PfmSummary } from '../../pfm.interfaces';
import { PfmNextStepsCardComponent } from '../pfm-next-steps-card/pfm-next-steps-card.component';
import { PfmProgressCardComponent } from '../pfm-progress-card/pfm-progress-card.component';
import { PfmJourneyCardComponent } from '../pfm-journey-card/pfm-journey-card.component';
import { PfmPortfolioProjectsComponent } from '../pfm-portfolio-projects/pfm-portfolio-projects.component';

/** What a click on a coverage chart opens in the Results queue. */
export interface PfmQueueTarget {
  chip?: PfmChip;
  sp?: string;
}

/**
 * Coverage tab, built to lead to action: the journey of a result through five stages, each with
 * what to do next (the charts are in the Stats tab). A server without the journey yet keeps the
 * previous cards: how much is in PRMS and what to do next. Every number is a quick view (or an SP filter) and a click opens
 * the Results queue on it. Loading / error / Retry for the summary request live in the page panel.
 */
@Component({
  selector: 'app-pfm-coverage-tab',
  imports: [DecimalPipe, PfmProgressCardComponent, PfmNextStepsCardComponent, PfmJourneyCardComponent, PfmPortfolioProjectsComponent],
  templateUrl: './pfm-coverage-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmCoverageTabComponent {
  summary = input.required<PfmSummary>();
  scope = input.required<PfmScope>();
  openQueue = output<PfmQueueTarget>();

  /**
   * Selected stage of the journey (0-based; stage 1 shows the projects table) and that table's filter.
   * Two-way: the page keeps them, so leaving for the Results queue and coming back keeps the stage.
   */
  readonly stage = model(0);
  readonly projectsFilter = model<PfmProjectsFilter>('without');

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
        synced: s.kpis.synced,
        no_sp: s.pipeline.out_of_scope
      }
    );
  });
}

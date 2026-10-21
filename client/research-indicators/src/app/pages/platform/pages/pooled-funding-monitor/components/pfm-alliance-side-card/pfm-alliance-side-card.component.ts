// Coverage tab, chart A (owner change request, CAMBIO 2): what is still on OUR side, which
// projects are furthest behind, which have started, and whom to contact (the Lead PI).
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE, PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PFM_HELP } from '../../pfm-help';
import { PfmPipeline, PfmProjectProgress, PfmScope } from '../../pfm.interfaces';
import { PfmStateBarComponent, PfmStateSegment } from '../pfm-state-bar/pfm-state-bar.component';

/** How many "furthest behind" projects to list. */
export const PFM_BEHIND_LIMIT = 5;

@Component({
  selector: 'app-pfm-alliance-side-card',
  imports: [DecimalPipe, TooltipModule, PfmStateBarComponent],
  templateUrl: './pfm-alliance-side-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmAllianceSideCardComponent {
  pipeline = input.required<PfmPipeline>();
  projects = input.required<PfmProjectProgress[]>();
  scope = input.required<PfmScope>();

  readonly help = PFM_HELP;
  readonly doneFill = PFM_STATE.done.fill;
  readonly emptyFill = PFM_STATE_EMPTY;

  segments = computed<PfmStateSegment[]>(() => {
    const v = (key: string) => this.pipeline().stages.find(s => s.key === key)?.value ?? 0;
    return [
      { key: 'mapping_pending', label: 'Mapping pending', value: v('mapping_not_started'), state: 'todo', help: PFM_HELP.mappingPending },
      { key: 'mapping_incomplete', label: 'Mapping incomplete', value: v('mapping_incomplete'), state: 'progress', help: PFM_HELP.mappingIncompleteState },
      { key: 'ready_to_sync', label: 'Mapped, not synced yet', value: v('ready_to_sync'), state: 'ready', help: PFM_HELP.readyState },
      { key: 'synced', label: 'Synced to PRMS', value: this.pipeline().in_prms, state: 'done', help: PFM_HELP.sentToPrms },
      { key: 'out_of_scope', label: 'Out of scope', value: this.pipeline().out_of_scope, state: 'out', help: PFM_HELP.outOfScope }
    ];
  });

  barLabel = computed(() => `Our side: ${this.pipeline().total} results`);

  /** Started = at least one result mapped, sent or settled; otherwise everything is still to map. */
  started = computed(() => {
    const all = this.projects();
    const started = all.filter(p => p.done + p.ready > 0).length;
    return { started, notStarted: all.length - started, total: all.length };
  });

  behind = computed(() =>
    this.projects()
      .filter(p => p.remaining > 0)
      .slice(0, PFM_BEHIND_LIMIT)
      .map(p => ({ ...p, doneWidth: p.total ? `${(p.done / p.total) * 100}%` : '0%' }))
  );
}

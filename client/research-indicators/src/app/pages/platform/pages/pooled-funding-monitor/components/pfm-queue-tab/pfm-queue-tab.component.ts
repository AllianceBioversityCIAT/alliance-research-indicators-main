// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-12 (R-PFM-009, 010, 014..016)
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_STATE, statusColor } from '@shared/constants/pfm-status-colors';
import { PFM_HELP } from '../../pfm-help';
import { PfmChip, PfmChipCounts, PfmFilters } from '../../pfm.interfaces';
import { PfmProjectGroupComponent } from '../pfm-project-group/pfm-project-group.component';
import { PfmStoreService } from '../../services/pfm-store.service';

/** Sentinel of the "All …" option (a null model would render the placeholder instead of the option). */
const ALL = '__all__';

/** `dot` = the state colour of that view (same palette as the badges and charts); none for All.
 * Order (owner): All, Need attention, then the work in the order it happens. The coverage tab's
 * progress bar and "What to do next" cards open these same quick views. */
const CHIPS: { key: PfmChip; label: string; count: keyof PfmChipCounts; help: string; dot: string | null }[] = [
  { key: 'all', label: 'All results', count: 'all', help: PFM_HELP.allResults, dot: null },
  { key: 'need_attention', label: 'Need attention', count: 'attention', help: PFM_HELP.needAttention, dot: PFM_STATE.alert.fill },
  { key: 'awaiting_pi', label: 'Pending approval', count: 'awaiting_pi', help: PFM_HELP.pendingApproval, dot: PFM_STATE.waiting.fill },
  { key: 'mapping_incomplete', label: 'Mapping pending', count: 'mapping', help: PFM_HELP.mappingIncomplete, dot: statusColor({ mapping: 'Pending' }) },
  { key: 'ready_to_sync', label: 'Ready to sync', count: 'ready', help: PFM_HELP.readyToSync, dot: PFM_STATE.ready.fill },
  { key: 'synced', label: 'Synced with PRMS', count: 'synced', help: PFM_HELP.synced, dot: PFM_STATE.done.fill }
];

/** Views reachable from the coverage tab that are not shown as quick views. */
const HIDDEN_CHIP_LABELS: Partial<Record<PfmChip, string>> = {
  rejected: 'Rejected by PRMS',
  no_sp_contribution: 'No SP contribution',
  prms_pending: 'Pending review in PRMS',
  prms_approved: 'Approved by PRMS'
};

/** Filters, quick-view chips and footer of the Results queue. Groups render through `pfm-project-group` (T-13). */
@Component({
  selector: 'app-pfm-queue-tab',
  imports: [FormsModule, SelectModule, TooltipModule, PfmProjectGroupComponent],
  templateUrl: './pfm-queue-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmQueueTabComponent {
  readonly store = inject(PfmStoreService);
  readonly ALL = ALL;
  readonly chips = CHIPS;
  /**
   * A view that is no longer a quick view (Rejected by PRMS) but that the coverage tab still opens
   * ("Fix and send again"): shown as a removable tag so the queue never filters invisibly.
   */
  readonly hiddenChip = computed(() => {
    const key = this.store.chip();
    if (!key || CHIPS.some(c => c.key === key)) return null;
    return HIDDEN_CHIP_LABELS[key] ? { key, label: HIDDEN_CHIP_LABELS[key] } : null;
  });

  /** Last loaded queue: stays rendered (filters included) while a refetch is in flight. */
  readonly queue = computed(() => this.store.queue());
  /** The held queue belongs to a previous query while a refetch runs or has failed: show none of its numbers (NFR-PFM-006). */
  readonly stale = computed(() => this.store.queueState().loading || this.store.queueState().error);
  readonly activeChip = computed<PfmChip>(() => this.store.chip() ?? 'all');
  readonly projectOptions = computed(() => [
    { label: 'All projects', value: ALL },
    ...(this.queue()?.filter_options.projects ?? []).map(p => ({ label: `${p.code} — ${p.name}`, value: p.code }))
  ]);
  readonly spOptions = computed(() => [
    { label: 'All Science Programs', items: [{ label: 'All Science Programs', value: ALL }] },
    ...(this.queue()?.filter_options.science_programs ?? []).map(g => ({
      label: g.category,
      items: g.items.map(s => ({ label: `${s.code} — ${s.name}`, value: s.code }))
    }))
  ]);
  readonly typeOptions = computed(() => [
    { label: 'All types', value: ALL },
    ...(this.queue()?.filter_options.types ?? []).map(t => ({ label: t.name, value: t.id }))
  ]);

  readonly countLine = computed(() => {
    const t = this.queue()?.totals;
    if (!t) return '';
    const base = `Showing ${t.results} results across ${t.projects} ${t.projects === 1 ? 'project' : 'projects'}`;
    return this.store.scope() === 'all' ? `${base} · ${t.monitored_total} flagged portfolio-wide` : `${base} where you are PI`;
  });

  /** `(onChange)` fires on real changes only, so the store never refetches for a re-pick of the same value. */
  onFilter<K extends keyof PfmFilters>(key: K, value: PfmFilters[K] | typeof ALL): void {
    this.store.setFilter(key, (value === ALL ? null : value) as PfmFilters[K]);
  }

  selectChip(key: PfmChip): void {
    if (key === this.activeChip()) return;
    this.store.setChip(key === 'all' ? null : key);
  }
}

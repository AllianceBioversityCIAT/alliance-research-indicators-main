// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-12 (R-PFM-009, 010, 014..016)
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { PfmChip, PfmChipCounts, PfmFilters, PfmStatusFilter } from '../../pfm.interfaces';
import { PfmStoreService } from '../../services/pfm-store.service';

/** Sentinel of the "All …" option (a null model would render the placeholder instead of the option). */
const ALL = '__all__';

const CHIPS: { key: PfmChip; label: string; count: keyof PfmChipCounts }[] = [
  { key: 'all', label: 'All results', count: 'all' },
  { key: 'need_attention', label: 'Need attention', count: 'attention' },
  { key: 'mapping_incomplete', label: 'Mapping incomplete', count: 'mapping' },
  { key: 'ready_to_sync', label: 'Ready to sync', count: 'ready' },
  { key: 'awaiting_pi', label: 'Awaiting PI', count: 'pending' },
  { key: 'rejected', label: 'Rejected by PRMS', count: 'prms_rejected' },
  { key: 'synced', label: 'Synced with PRMS', count: 'synced' }
];

const STATUS_OPTIONS: { label: string; value: PfmStatusFilter | typeof ALL }[] = [
  { label: 'All statuses', value: ALL },
  { label: 'Ready to sync', value: 'ready_to_sync' },
  { label: 'Pool funding mapping pending', value: 'mapping_pending' },
  { label: 'Synced to PRMS', value: 'synced' },
  { label: 'Awaiting PI approval', value: 'awaiting_pi' },
  { label: 'Under review in STAR', value: 'under_review' },
  { label: 'Draft', value: 'draft' }
];

/** Legend of the PRMS bar colors (R-PFM-015). */
const LEGEND = [
  { label: 'Approved in PRMS', dot: 'bg-[var(--ac-pfm-seg-approved)]' },
  { label: 'Pending review', dot: 'bg-[var(--ac-pfm-seg-pending)]' },
  { label: 'Rejected', dot: 'bg-[var(--ac-pfm-seg-rejected)]' },
  { label: 'Not synced', dot: 'bg-[var(--ac-pfm-seg-not-started)]' }
];

/** Filters, quick-view chips and footer of the Results queue. T-13 replaces the groups slot with `pfm-project-group`. */
@Component({
  selector: 'app-pfm-queue-tab',
  imports: [FormsModule, SelectModule],
  templateUrl: './pfm-queue-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmQueueTabComponent {
  readonly store = inject(PfmStoreService);
  readonly ALL = ALL;
  readonly chips = CHIPS;
  readonly legend = LEGEND;
  readonly statusOptions = STATUS_OPTIONS;

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

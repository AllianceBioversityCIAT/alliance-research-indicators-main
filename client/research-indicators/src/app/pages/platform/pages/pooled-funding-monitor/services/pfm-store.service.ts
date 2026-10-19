// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-07
//
// Page-scoped store of the Pooled Funding Monitor (provide it in the page component, NOT
// `providedIn: 'root'`: it rewrites ?scope=&tab= and must not touch other routes).
// GET only (R-PFM-014). Every section loads and fails on its own (R-PFM-016).

import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@services/api.service';
import { rememberPfmScope } from '@shared/utils/pfm-last-scope.util';
import {
  PFM_SCOPES,
  PFM_TABS,
  PfmChip,
  PfmFilters,
  PfmQueue,
  PfmQueueQuery,
  PfmResultRow,
  PfmScope,
  PfmSectionState,
  PfmSummary,
  PfmTab
} from '../pfm.interfaces';

const EMPTY_FILTERS: PfmFilters = { project: null, sp: null, status: null, type: null };

@Injectable()
export class PfmStoreService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly scope = signal<PfmScope>('mine');
  readonly tab = signal<PfmTab>('coverage');
  readonly filters = signal<PfmFilters>({ ...EMPTY_FILTERS });
  /** Active quick-view chip; null = none. */
  readonly chip = signal<PfmChip | null>(null);

  readonly summary = signal<PfmSummary | null>(null);
  readonly queue = signal<PfmQueue | null>(null);
  /** Lazily fetched rows per project code; valid for the current (scope, filters, chip) key only. */
  readonly groupRows = signal<Record<string, PfmResultRow[]>>({});
  readonly openGroups = signal<ReadonlySet<string>>(new Set());

  readonly summaryState = signal<PfmSectionState>({ loading: false, error: false });
  readonly queueState = signal<PfmSectionState>({ loading: false, error: false });
  /** Per-group row loading / error, keyed by project code. */
  readonly groupState = signal<Record<string, PfmSectionState>>({});

  readonly query = computed<PfmQueueQuery>(() => ({ scope: this.scope(), ...this.filters(), chip: this.chip() }));

  // Stale-response guards: a slower old request must not overwrite a newer one.
  private summarySeq = 0;
  private queueSeq = 0;
  private rowsSeq = 0;
  private readonly rowsInFlight = new Set<string>();

  /**
   * Reads ?scope=&tab= once (unknown values fall back to defaults) and loads both sections.
   * `defaultScope` is the scope used when the URL carries no valid ?scope= (admins pass 'all', HITL 20).
   */
  init(opts: { defaultScope?: PfmScope } = {}): void {
    const params = this.route.snapshot.queryParamMap;
    const scope = params.get('scope');
    const tab = params.get('tab');
    if ((PFM_SCOPES as readonly string[]).includes(scope ?? '')) this.scope.set(scope as PfmScope);
    else if (opts.defaultScope) this.scope.set(opts.defaultScope);
    if ((PFM_TABS as readonly string[]).includes(tab ?? '')) this.tab.set(tab as PfmTab);
    rememberPfmScope(this.scope());
    void this.loadSummary();
    void this.loadQueue();
  }

  setScope(scope: PfmScope): void {
    rememberPfmScope(scope);
    if (scope === this.scope()) return;
    this.scope.set(scope);
    this.syncUrl();
    this.resetGroups();
    void this.loadSummary();
    void this.loadQueue();
  }

  setTab(tab: PfmTab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
    this.syncUrl();
  }

  /** Changing a filter clears the chip (R-PFM-009) and the cached group rows. */
  setFilter<K extends keyof PfmFilters>(key: K, value: PfmFilters[K]): void {
    this.filters.update(f => ({ ...f, [key]: value }));
    this.chip.set(null);
    this.resetGroups();
    void this.loadQueue();
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
    this.chip.set(null);
    this.resetGroups();
    void this.loadQueue();
  }

  setChip(chip: PfmChip | null): void {
    this.chip.set(chip);
    this.resetGroups();
    void this.loadQueue();
  }

  /** Expands / collapses a group; rows are fetched on first expand per key (R-PFM-011). */
  toggleGroup(code: string): void {
    const open = new Set(this.openGroups());
    if (open.has(code)) {
      open.delete(code);
      this.openGroups.set(open);
      return;
    }
    open.add(code);
    this.openGroups.set(open);
    void this.loadGroupRows(code);
  }

  retrySummary(): Promise<void> {
    return this.loadSummary();
  }

  retryQueue(): Promise<void> {
    return this.loadQueue();
  }

  retryGroup(code: string): Promise<void> {
    return this.loadGroupRows(code);
  }

  async loadSummary(): Promise<void> {
    const seq = ++this.summarySeq;
    this.summaryState.set({ loading: true, error: false });
    try {
      const res = await this.api.GET_PfmSummary(this.scope());
      if (seq !== this.summarySeq) return;
      if (res?.successfulRequest === false || !res?.data) throw new Error('summary');
      this.summary.set(res.data);
      this.summaryState.set({ loading: false, error: false });
    } catch {
      if (seq !== this.summarySeq) return;
      this.summaryState.set({ loading: false, error: true });
    }
  }

  async loadQueue(): Promise<void> {
    const seq = ++this.queueSeq;
    this.queueState.set({ loading: true, error: false });
    try {
      const res = await this.api.GET_PfmQueue(this.query());
      if (seq !== this.queueSeq) return;
      if (res?.successfulRequest === false || !res?.data) throw new Error('queue');
      this.queue.set(res.data);
      this.queueState.set({ loading: false, error: false });
    } catch {
      if (seq !== this.queueSeq) return;
      this.queueState.set({ loading: false, error: true });
    }
  }

  private async loadGroupRows(code: string): Promise<void> {
    if (this.groupRows()[code] || this.rowsInFlight.has(code)) return;
    const seq = this.rowsSeq;
    this.rowsInFlight.add(code);
    this.setGroupState(code, { loading: true, error: false });
    try {
      const res = await this.api.GET_PfmProjectResults(code, this.query());
      if (seq !== this.rowsSeq) return;
      if (res?.successfulRequest === false || !res?.data) throw new Error('rows');
      this.groupRows.update(m => ({ ...m, [code]: res.data }));
      this.setGroupState(code, { loading: false, error: false });
    } catch {
      if (seq !== this.rowsSeq) return;
      this.setGroupState(code, { loading: false, error: true });
    } finally {
      if (seq === this.rowsSeq) this.rowsInFlight.delete(code);
    }
  }

  private setGroupState(code: string, state: PfmSectionState): void {
    this.groupState.update(m => ({ ...m, [code]: state }));
  }

  /** The cached rows and open groups belong to the previous key. */
  private resetGroups(): void {
    this.rowsSeq++;
    this.rowsInFlight.clear();
    this.groupRows.set({});
    this.groupState.set({});
    this.openGroups.set(new Set());
  }

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { scope: this.scope(), tab: this.tab() },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}

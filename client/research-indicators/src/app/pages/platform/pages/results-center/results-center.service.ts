import { inject, Injectable, signal, effect, computed } from '@angular/core';
import { GetResultsService } from '../../../../shared/services/control-list/get-results.service';
import {
  GetResultsPaginationOptions,
  Result,
  ResultConfig,
  ResultFilter,
  ResultPortfolioListItem
} from '../../../../shared/interfaces/result/result.interface';
import { normalizeSnapshotYears } from '../../../../shared/interfaces/result/map-v2-result-list-item';
import { MenuItem } from 'primeng/api';
import { tableSortPathToApiSortField } from './result-table-sort.util';
import { CacheService } from '../../../../shared/services/cache/cache.service';
import { TableColumn } from './result-center.interface';
import { TableFilters } from './class/table.filters.class';
import { GetAllIndicators } from '../../../../shared/interfaces/get-all-indicators.interface';
import { Table, TableLazyLoadEvent } from 'primeng/table';
import { ApiService } from '../../../../shared/services/api.service';
import { MultiselectComponent } from '../../../../shared/components/custom-fields/multiselect/multiselect.component';
import type { ResultsCenterUrlState } from './url/results-center-url.codec';

interface ResultsCenterPersistedState {
  myResultsFilterItemId: string;
  tableFilters: TableFilters;
  resultsFilter: ResultFilter;
  appliedFilters: ResultFilter;
  searchInput: string;
  primaryContractId: string | null;
  resultsTablePaginatorFirst: number;
  resultsTablePaginatorRows: number;
  resultsTableSortField: string;
  resultsTableSortOrder: number;
}
@Injectable({
  providedIn: 'root'
})
export class ResultsCenterService {
  private readonly storagePrefix = 'results-center-view-state:';
  api = inject(ApiService);
  hasFilters = signal(false);
  showFiltersSidebar = signal(false);
  showConfigurationSidebar = signal(false);
  multiselectRefs = signal<Record<string, MultiselectComponent>>({});
  myResultsFilterItems: MenuItem[] = [
    { id: 'all', label: 'All Results' },
    { id: 'my', label: 'My Results' }
  ];
  myResultsFilterItem = signal<MenuItem | undefined>(this.myResultsFilterItems[0]);
  pinnedTab = signal<string>('all');
  /**
   * D-URL-15: monotonic counter expressing user intent to mutate filters.
   * The write effect's ONLY tracked dependency — it must advance for every
   * user-facing mutator and MUST NOT advance for load/restore/other-route paths.
   * See design.md §6.2 for the full increment / does-not-increment contract.
   */
  private readonly _userFilterMutations = signal(0);
  readonly userFilterMutations = this._userFilterMutations.asReadonly();
  loading = signal(false);
  list = signal<Result[]>([]);
  tableFilters = signal(new TableFilters());
  appliedFilters = signal<ResultFilter>({ 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': [] });
  searchInput = signal('');
  tableColumns = signal<TableColumn[]>([
    {
      field: 'result_platform',
      path: 'platform_code',
      header: 'Platform',
      maxWidth: 'max-w-[80px]',
      filter: true,
      hideIf: () => true,
      getValue: (result: Result) => result.result_platform
    },
    {
      field: 'result_official_code',
      path: 'result_official_code',
      header: 'Code',
      maxWidth: '!max-w-[125px]',
      minWidth: '!min-w-[125px]',
      filter: true,
      getValue: (result: Result) => result.result_official_code
    },
    {
      field: 'title',
      path: 'title',
      header: 'Title',
      minWidth: 'min-w-[200px]',
      maxWidth: 'max-w-[300px]',
      filter: true,
      getValue: (result: Result) => {
        const title = result.title;
        if (!title || typeof title !== 'string') return title;
        let end = title.length;
        while (end > 0 && title[end - 1] === '-') end--;
        return title.slice(0, end);
      }
    },
    {
      field: 'indicator_id',
      path: 'indicators.name',
      minWidth: 'min-w-[165px]',
      maxWidth: 'max-w-[165px]',
      header: 'Indicator',
      hideIf: computed(() =>
        this.api.indicatorTabs
          .lazy()
          .list()
          .some((indicator: GetAllIndicators) => indicator.active === true && indicator.indicator_id !== 0)
      ),
      getValue: (result: Result) => result.indicators?.name ?? '-'
    },
    {
      field: 'status',
      path: 'result_status.name',
      header: 'Status',
      minWidth: 'min-w-[140px]',
      maxWidth: 'max-w-[140px]',
      getValue: (result: Result) => result.result_status?.name ?? '-'
    },
    {
      field: 'project',
      path: 'result_contracts.contract_id',
      header: 'Reporting Project',
      maxWidth: 'max-w-[110px]',
      getValue: (result: Result) => {
        if (!result.result_contracts) return '-';
        const contracts = Array.isArray(result.result_contracts) ? result.result_contracts : [result.result_contracts];
        const primaryContract = contracts.find(
          (contract: { is_primary?: number | string; contract_id?: string }) => Number(contract.is_primary) === 1
        );
        return primaryContract?.contract_id ?? '-';
      }
    },
    {
      field: 'lever',
      path: 'primaryLeverSort',
      header: 'Primary Lever',
      maxWidth: 'max-w-[100px]',
      getValue: (result: Result) => {
        if (!result.result_levers || !Array.isArray(result.result_levers)) return '-';
        const primaryLevers = result.result_levers.filter(rl => rl.is_primary === 1);
        if (primaryLevers.length === 0) return '-';
        return primaryLevers
          .map(rl => rl.lever?.short_name)
          .filter(Boolean)
          .join(', ');
      }
    },
    {
      field: 'year',
      path: 'report_year_id',
      header: 'Live Version',
      maxWidth: 'max-w-[100px]',
      getValue: (result: Result) => result.report_year_id?.toString() ?? '-'
    },
    {
      field: 'versions',
      path: 'snapshot_years',
      maxWidth: 'max-w-[120px]',
      header: 'Approved Versions',
      getValue: (result: Result) => normalizeSnapshotYears(result.snapshot_years)
    },
    {
      field: 'creator',
      path: 'created_by_user.first_name',
      header: 'Creator',
      minWidth: 'min-w-[90px]',
      filter: true,
      filterPaths: ['_creatorFullName'],
      getValue: (result: Result) => (result.created_by_user ? `${result.created_by_user.first_name} ${result.created_by_user.last_name}` : '-')
    },
    {
      field: 'creation_date',
      path: 'created_at',
      header: 'Creation Date',
      minWidth: 'min-w-[110px]',
      maxWidth: 'max-w-[110px]',

      getValue: (result: Result) => (result.created_at ? new Date(result.created_at).toLocaleDateString() : '-')
    },
    {
      field: 'public_link',
      path: 'public_link',
      header: 'Link',
      minWidth: 'min-w-[90px]',
      maxWidth: 'max-w-[100px]',
      filter: true,
      hideFilterIf: () => true,
      getValue: (result: Result) => result.public_link ?? 'None'
    }
  ]);

  getAllPathsAsArray = computed(() =>
    this.tableColumns()
      .filter(column => column.filter)
      .flatMap(column => column.filterPaths ?? [column.path])
  );

  private getResearchAreasDisplay(result: Result): string {
    const directRows = this.asArray(result.result_research_areas ?? result.research_areas);
    const rows = directRows.length ? directRows : this.getResearchAreasFromResultLevers(result);
    const names = rows.map(row => this.getPortfolioItemLabel(row)).filter(Boolean);
    return names.length ? names.join(', ') : '-';
  }

  private getResearchAreasFromResultLevers(result: Result): ResultPortfolioListItem[] {
    if (!Array.isArray(result.result_levers)) return [];
    return result.result_levers.filter(row => this.isResearchAreaRow(row));
  }

  private isResearchAreaRow(row: ResultPortfolioListItem): boolean {
    const text = [row.type, row.group, row.category].filter(Boolean).join(' ').toLowerCase();
    return text.includes('research area') || text.includes('research_area') || text.includes('research-area');
  }

  private getPortfolioItemLabel(row: ResultPortfolioListItem): string {
    return (
      row.research_area?.short_name ??
      row.research_area?.name ??
      row.research_area?.full_name ??
      row.lever?.short_name ??
      row.lever?.name ??
      row.lever?.full_name ??
      row.short_name ??
      row.name ??
      row.full_name ??
      ''
    );
  }

  private asArray(rows: ResultPortfolioListItem[] | undefined): ResultPortfolioListItem[] {
    return Array.isArray(rows) ? rows : [];
  }

  /** Current page rows (search is applied server-side via `search` query param). */
  resultsListForTable = computed(() => this.list());

  resultsFilter = signal<ResultFilter>({ 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': [] });
  primaryContractId = signal<string | null>(null);
  resultsConfig = signal<ResultConfig>({
    indicators: true,
    'result-status': true,
    contracts: true,
    'primary-contract': false,
    'primary-lever': true,
    levers: true,
    'audit-data': true,
    'audit-data-object': true
  });
  showConfigurationsSidebar = signal(false);
  confirmFiltersSignal = signal(false);
  activeStateKey = signal<string | null>(null);

  getResultsService = inject(GetResultsService);
  cache = inject(CacheService);

  tableRef = signal<Table | undefined>(undefined);
  resultsTablePaginatorFirst = signal(0);
  resultsTablePaginatorRows = signal(10);
  resultsTableTotalRecords = signal(0);
  private lastSuccessfulResultsFetchKey: string | null = null;
  resultsTableSortField = signal<string>('result_official_code');
  resultsTableSortOrder = signal<-1 | 1>(-1);

  persistViewState = effect(() => {
    const activeKey = this.activeStateKey();
    if (!activeKey) {
      return;
    }

    const state: ResultsCenterPersistedState = {
      myResultsFilterItemId: this.myResultsFilterItem()?.id ?? 'all',
      tableFilters: this.tableFilters(),
      resultsFilter: this.resultsFilter(),
      appliedFilters: this.appliedFilters(),
      searchInput: this.searchInput(),
      primaryContractId: this.primaryContractId(),
      resultsTablePaginatorFirst: this.resultsTablePaginatorFirst(),
      resultsTablePaginatorRows: this.resultsTablePaginatorRows(),
      resultsTableSortField: this.resultsTableSortField(),
      resultsTableSortOrder: this.resultsTableSortOrder()
    };

    globalThis.sessionStorage?.setItem(this.getStorageKey(activeKey), JSON.stringify(state));
  });

  getActiveFilters = computed(() => {
    const filters: { label: string; value: string; id?: string | number }[] = [];
    const active = this.appliedFilters();

    if ((active['indicator-codes-tabs'] ?? []).length > 0) {
      filters.push({ label: 'INDICATOR TAB', value: 'Selected' });
    }

    if ((active['indicator-codes-filter'] ?? []).length > 0) {
      const selected = this.tableFilters().indicators as { indicator_id: number; name: string }[];
      selected.forEach(i => {
        if (i) filters.push({ label: 'INDICATOR', value: i.name ?? '', id: i.indicator_id });
      });
    }

    if ((active['status-codes'] ?? []).length > 0) {
      const selected = this.tableFilters().statusCodes;
      selected.forEach(s => {
        if (s) filters.push({ label: 'STATUS', value: s.name ?? '', id: s.result_status_id });
      });
    }

    if ((active['platform-code'] ?? []).length > 0) {
      const selected = this.tableFilters().sources ?? [];
      selected.forEach(s => {
        if (s) filters.push({ label: 'SOURCE', value: s.name ?? '', id: s.platform_code });
      });
    }

    if ((active['contract-codes'] ?? []).length > 0) {
      const selected = this.tableFilters().contracts;
      selected.forEach(c => {
        if (c) filters.push({ label: 'PROJECT', value: c.display_label || c.agreement_id, id: c.agreement_id });
      });
    }

    if ((active['lever-codes'] ?? []).length > 0) {
      const selected = this.tableFilters().levers;
      selected.forEach(l => {
        if (l) filters.push({ label: 'LEVER', value: l.short_name || l.name || '', id: l.id });
      });
    }

    if ((active['years'] ?? []).length > 0) {
      const selected = this.tableFilters().years;
      selected.forEach(y => {
        if (y) filters.push({ label: 'YEAR', value: String(y.report_year), id: y.report_year });
      });
    }

    return filters;
  });

  removeFilter(label: string, id?: string | number): void {
    if (label === 'INDICATOR TAB') {
      // D-URL-15: this delegated onSelectFilterTab(0) call is removeFilter's
      // single userFilterMutations bump for this branch — do not add another.
      this.onSelectFilterTab(0);
      return;
    }

    type Updater = (state: TableFilters) => void;
    const mkUpdater =
      <T>(key: keyof TableFilters, pred: (item: T) => boolean): Updater =>
      (state: TableFilters) => {
        const arr = (state[key] as unknown as T[]) ?? [];
        const nextValues = id == null ? [] : arr.filter(pred);
        (state as unknown as Record<string, unknown[]>)[key as string] = nextValues;
      };

    const map: Record<string, { update: Updater; ref?: keyof Record<string, MultiselectComponent>; key: keyof TableFilters }> = {
      INDICATOR: { update: mkUpdater<{ indicator_id: number }>('indicators', i => i?.indicator_id !== id), ref: 'indicator', key: 'indicators' },
      STATUS: { update: mkUpdater<{ result_status_id: number }>('statusCodes', s => s?.result_status_id !== id), ref: 'status', key: 'statusCodes' },
      SOURCE: { update: mkUpdater<{ platform_code: string }>('sources', s => s?.platform_code !== id), key: 'sources' },
      PROJECT: { update: mkUpdater<{ agreement_id: string }>('contracts', c => c?.agreement_id !== id), ref: 'project', key: 'contracts' },
      LEVER: { update: mkUpdater<{ id: number }>('levers', l => l?.id !== id), ref: 'lever', key: 'levers' },
      YEAR: { update: mkUpdater<{ report_year: number }>('years', y => y?.report_year !== id), ref: 'year', key: 'years' }
    };

    const handler = map[label];
    if (!handler) return;

    const currentState = this.tableFilters();
    const currentArray = (currentState[handler.key] as unknown[]) ?? [];
    const willBeEmpty = id == null || currentArray.length === 1;

    this.tableFilters.update(prev => {
      const next = { ...prev } as TableFilters;
      handler.update(next);
      return next;
    });

    const ref = handler.ref ? this.multiselectRefs()?.[handler.ref] : undefined;
    if (ref) {
      if (willBeEmpty || id == null) {
        if (typeof ref.clear === 'function') {
          ref.clear();
        }
      } else if (id != null && typeof ref.removeById === 'function') {
        ref.removeById(id);
      }
    }

    // D-URL-15: this delegated applyFilters() call is removeFilter's single
    // userFilterMutations bump for this branch — do not add another.
    this.applyFilters();
  }

  countFiltersSelected = computed(() => {
    const rf = this.resultsFilter();
    const total =
      (rf['indicator-codes-filter']?.length ?? 0) +
      (rf['status-codes']?.length ?? 0) +
      (rf['platform-code']?.length ?? 0) +
      (rf['contract-codes']?.length ?? 0) +
      (rf['lever-codes']?.length ?? 0) +
      (rf.years?.length ?? 0);
    return total > 0 ? total.toString() : undefined;
  });

  countTableFiltersSelected = computed(() => {
    const tf = this.tableFilters();
    const total =
      (tf.indicators?.length ?? 0) +
      (tf.statusCodes?.length ?? 0) +
      (tf.sources?.length ?? 0) +
      (tf.contracts?.length ?? 0) +
      (tf.levers?.length ?? 0) +
      (tf.years?.length ?? 0);
    return total > 0 ? total.toString() : undefined;
  });

  onChangeList = effect(
    () => {
      if (!this.api.indicatorTabs.lazy().isLoading()) {
        const restoredTabId = this.resultsFilter()['indicator-codes-tabs']?.[0] ?? 0;
        this.api.indicatorTabs.lazy().list.update(prev => {
          return [
            {
              name: 'All Indicators',
              indicator_id: 0,
              able: true,
              active: restoredTabId === 0
            },
            ...prev.map(indicator => ({
              ...indicator,
              able: [0, 1, 2, 3, 4, 5].includes(indicator.indicator_id),
              active: indicator.indicator_id === restoredTabId
            }))
          ];
        });
        this.onChangeList.destroy();
      }
    },
    {
      allowSignalWrites: true
    }
  );

  private invalidateResultsFetchDedupe(): void {
    this.lastSuccessfulResultsFetchKey = null;
  }

  /**
   * D-URL-15 — advances the `userFilterMutations` counter. Call this from a
   * user-facing mutator exactly once per invocation (design.md §6.2's table).
   * Internal delegations between mutators (e.g. `removeFilter` → `onSelectFilterTab`,
   * `clearAllFilters` → `onSelectFilterTab`) must bump through exactly one call site —
   * see the `skipBump` option on `onSelectFilterTab`.
   */
  noteUserFilterMutation(): void {
    this._userFilterMutations.update(count => count + 1);
  }

  invalidateResultsListFetchCache(): void {
    this.invalidateResultsFetchDedupe();
  }

  getExportResultFilter(): ResultFilter {
    const currentTab = this.myResultsFilterItem();
    const baseFilter = { ...this.resultsFilter() };

    if (currentTab?.id === 'my') {
      const userId = this.cache.dataCache().user.sec_user_id.toString();
      if (!baseFilter['create-user-codes'] || baseFilter['create-user-codes'].length === 0) {
        baseFilter['create-user-codes'] = [userId];
      }
    } else if (baseFilter['create-user-codes'] && baseFilter['create-user-codes'].length > 0) {
      baseFilter['create-user-codes'] = [];
    }

    const primaryContractId = this.primaryContractId();
    return primaryContractId ? ({ ...baseFilter, 'contract-codes': [primaryContractId] } as ResultFilter) : baseFilter;
  }

  getExportPaginationOptions(): Pick<GetResultsPaginationOptions, 'sortField' | 'sortOrder' | 'search'> {
    return {
      sortField: tableSortPathToApiSortField(this.resultsTableSortField()),
      sortOrder: this.resultsTableSortOrder() === 1 ? 'ASC' : 'DESC',
      search: this.searchInput().trim()
    };
  }

  async main() {
    this.loading.set(true);
    const primaryContractIdAtRequest = this.primaryContractId();
    const activeTabIdAtRequest = this.myResultsFilterItem()?.id;
    try {
      const currentTab = this.myResultsFilterItem();
      const baseFilter = { ...this.resultsFilter() };

      if (currentTab?.id === 'my') {
        const userId = this.cache.dataCache().user.sec_user_id.toString();
        if (!baseFilter['create-user-codes'] || baseFilter['create-user-codes'].length === 0) {
          baseFilter['create-user-codes'] = [userId];
          this.resultsFilter.update(prev => ({
            ...prev,
            'create-user-codes': [userId]
          }));
          this.appliedFilters.update(prev => ({
            ...prev,
            'create-user-codes': [userId]
          }));
        }
      } else if (baseFilter['create-user-codes'] && baseFilter['create-user-codes'].length > 0) {
        baseFilter['create-user-codes'] = [];
        this.resultsFilter.update(prev => ({
          ...prev,
          'create-user-codes': []
        }));
        this.appliedFilters.update(prev => ({
          ...prev,
          'create-user-codes': []
        }));
      }

      const primaryContractId = this.primaryContractId();
      const finalFilter = primaryContractId ? ({ ...baseFilter, 'contract-codes': [primaryContractId] } as ResultFilter) : baseFilter;

      const rows = this.resultsTablePaginatorRows();
      const first = this.resultsTablePaginatorFirst();
      const page = Math.floor(first / rows) + 1;

      const fetchKey = JSON.stringify({
        filter: finalFilter,
        page,
        limit: rows,
        sortField: tableSortPathToApiSortField(this.resultsTableSortField()),
        sortOrder: this.resultsTableSortOrder() === 1 ? 'ASC' : 'DESC',
        search: this.searchInput().trim(),
        resultsConfig: this.resultsConfig()
      });

      if (fetchKey === this.lastSuccessfulResultsFetchKey) {
        return;
      }

      const { results: rawResults, total } = await this.getResultsService.fetchPaginated(
        finalFilter,
        {
          page,
          limit: rows,
          sortField: tableSortPathToApiSortField(this.resultsTableSortField()),
          sortOrder: this.resultsTableSortOrder() === 1 ? 'ASC' : 'DESC',
          search: this.searchInput().trim()
        },
        this.resultsConfig()
      );

      const enhancedResults = rawResults.map(result => {
        const primaryLevers = Array.isArray(result.result_levers) ? result.result_levers.filter(rl => rl.is_primary === 1) : [];
        const primaryLeverSort =
          primaryLevers.length === 0
            ? ''
            : primaryLevers
                .map(rl => rl.lever?.short_name || '')
                .filter(Boolean)
                .join(', ')
                .toLowerCase();

        const user = result.created_by_user;
        const _creatorFullName = user ? this.buildSearchField(user.first_name ?? '', user.last_name ?? '') : '';

        return {
          ...result,
          primaryLeverSort,
          _creatorFullName
        } as Result & { primaryLeverSort: string; _creatorFullName: string };
      });

      const stillSameContext = this.primaryContractId() === primaryContractIdAtRequest && this.myResultsFilterItem()?.id === activeTabIdAtRequest;
      if (stillSameContext) {
        this.resultsTableTotalRecords.set(total);
        this.list.set(enhancedResults);
        this.lastSuccessfulResultsFetchKey = fetchKey;
      }
    } catch (error) {
      console.error('Error loading results:', error);
      this.lastSuccessfulResultsFetchKey = null;
      const stillSameContext = this.primaryContractId() === primaryContractIdAtRequest && this.myResultsFilterItem()?.id === activeTabIdAtRequest;
      if (stillSameContext) {
        this.resultsTableTotalRecords.set(0);
        this.list.set([]);
      }
    } finally {
      this.loading.set(false);
    }
  }
  handleResultsTableLazyLoad(event: TableLazyLoadEvent): void {
    const newRows = event.rows ?? this.resultsTablePaginatorRows();
    const previousFirst = this.resultsTablePaginatorFirst();
    const previousRows = this.resultsTablePaginatorRows();
    const total = this.resultsTableTotalRecords();
    const requestedFirst = event.first ?? 0;
    const nextFirst =
      previousRows === newRows
        ? this.clampPaginatorFirstToStandardGrid(requestedFirst, newRows, total)
        : this.alignResultsTableFirstAfterRowsChange(previousFirst, newRows, total);
    this.resultsTablePaginatorFirst.set(nextFirst);
    this.resultsTablePaginatorRows.set(newRows);
    if (event.sortField != null && event.sortField !== '') {
      this.resultsTableSortField.set(String(event.sortField));
      const order = event.sortOrder as number | undefined;
      this.resultsTableSortOrder.set(order === 1 ? 1 : -1);
    }
    void this.main();
  }

  /** Keeps `first` on a standard page boundary: multiples of `rows`, last page = floor((total-1)/rows)*rows. */
  private clampPaginatorFirstToStandardGrid(first: number, rows: number, total: number): number {
    const safeRows = rows > 0 ? rows : 10;
    let f = Math.floor((first ?? 0) / safeRows) * safeRows;
    if (total > 0) {
      const lastPageFirst = Math.max(0, Math.floor((total - 1) / safeRows) * safeRows);
      if (f > lastPageFirst) {
        f = lastPageFirst;
      }
    }
    return Math.max(0, f);
  }

  private alignResultsTableFirstAfterRowsChange(anchorFirst: number, newRows: number, total: number): number {
    const safeRows = newRows > 0 ? newRows : 10;
    const candidate = Math.floor(anchorFirst / safeRows) * safeRows;
    return this.clampPaginatorFirstToStandardGrid(candidate, newRows, total);
  }

  private resetResultsTablePaginatorToFirstPage(): void {
    this.resultsTablePaginatorFirst.set(0);
    const table = this.tableRef();
    if (table) {
      table.first = 0;
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      SUBMITTED: 'info',
      ACCEPTED: 'success',
      EDITING: 'warning'
    };
    return severityMap[status];
  }

  onActiveItemChange = (event: MenuItem): void => {
    this.invalidateResultsFetchDedupe();
    this.myResultsFilterItem.set(event);

    this.searchInput.set('');
    this.tableFilters.set(new TableFilters());

    this.resultsFilter.update(() => ({
      'create-user-codes': event.id === 'my' ? [this.cache.dataCache().user.sec_user_id.toString()] : [],
      'indicator-codes': [],
      'status-codes': [],
      'contract-codes': [],
      'platform-code': [],
      'lever-codes': [],
      years: [],
      'indicator-codes-filter': [],
      'indicator-codes-tabs': []
    }));

    this.onSelectFilterTab(0);
    this.cleanMultiselects();

    this.resultsTableSortField.set('result_official_code');
    this.resultsTableSortOrder.set(-1);
    const table = this.tableRef();
    if (table) {
      table.clear();
      table.sortField = 'result_official_code';
      table.sortOrder = -1;
    }
    this.resetResultsTablePaginatorToFirstPage();
  };

  showFilterSidebar(): void {
    this.showFiltersSidebar.set(true);
  }

  showConfigSidebar(): void {
    this.showConfigurationsSidebar.set(true);
  }

  applyFilters = () => {
    this.noteUserFilterMutation();
    this.invalidateResultsFetchDedupe();
    const currentTab = this.myResultsFilterItem();
    const preserveCreateUserCodes = currentTab?.id === 'my' ? this.resultsFilter()['create-user-codes'] || [] : [];

    this.resultsFilter.update(prev => ({
      ...prev,
      'lever-codes': this.tableFilters().levers.map(lever => lever.id),
      'status-codes': this.tableFilters().statusCodes.map(status => status.result_status_id),
      'platform-code': (this.tableFilters().sources ?? []).map(source => source.platform_code),
      years: this.tableFilters().years.map(year => year.report_year),
      'contract-codes': this.tableFilters().contracts.map(contract => contract.agreement_id),
      'indicator-codes-filter': this.tableFilters().indicators.map(indicator => indicator.indicator_id),
      'create-user-codes': preserveCreateUserCodes
    }));

    this.appliedFilters.update(prev => ({
      ...prev,
      'lever-codes': this.tableFilters().levers.map(lever => lever.id),
      'status-codes': this.tableFilters().statusCodes.map(status => status.result_status_id),
      'platform-code': (this.tableFilters().sources ?? []).map(source => source.platform_code),
      years: this.tableFilters().years.map(year => year.report_year),
      'contract-codes': this.tableFilters().contracts.map(contract => contract.agreement_id),
      'indicator-codes-filter': this.tableFilters().indicators.map(indicator => indicator.indicator_id),
      'create-user-codes': preserveCreateUserCodes
    }));

    this.resetResultsTablePaginatorToFirstPage();
    this.main();
  };

  onSelectFilterTab(indicatorId: number, options?: { skipMain?: boolean; skipBump?: boolean }) {
    if (!options?.skipBump) {
      this.noteUserFilterMutation();
    }
    this.invalidateResultsFetchDedupe();
    this.api.indicatorTabs.lazy().list.update(prev =>
      prev.map((item: GetAllIndicators) => ({
        ...item,
        active: item.indicator_id === indicatorId
      }))
    );

    const currentTab = this.myResultsFilterItem();
    const preserveCreateUserCodes = currentTab?.id === 'my' ? this.resultsFilter()['create-user-codes'] || [] : [];

    this.resultsFilter.update(prev => ({
      ...prev,
      'indicator-codes-tabs': indicatorId === 0 ? [] : [indicatorId],
      'indicator-codes-filter': [],
      'create-user-codes': preserveCreateUserCodes
    }));

    this.appliedFilters.update(prev => ({
      ...prev,
      'indicator-codes-tabs': indicatorId === 0 ? [] : [indicatorId],
      'indicator-codes-filter': [],
      'create-user-codes': preserveCreateUserCodes
    }));

    this.tableFilters.update(prev => ({
      ...prev,
      indicators: []
    }));
    if (!options?.skipMain) {
      void this.main();
    }
  }

  /**
   * D-URL: `seedFromUrl()` — one method, all state (design.md §7.1). Writes
   * `tableFilters`, `resultsFilter`, `appliedFilters` and the my/all scope
   * ATOMICALLY from one already-resolved `{ filters, scope }` pair (the
   * codec's own shape — `parse(paramMap)` from `results-center-url.codec.ts`,
   * with `scope` already defaulted by the caller per design §6.1 step 3).
   * Replaces the hand-duplicated multi-signal writes that make state desync
   * (design.md §8 D3) the recurring defect class here — `applyFilters`
   * hand-writes this same seven-key `ResultFilter` object twice into two
   * signals (design §7.1); this method builds it once and uses it for both.
   *
   * Order matters and mirrors every existing mutator (`applyFilters:692`,
   * `onSelectFilterTab:726`, `clearAllFilters:838`):
   *
   * 1. `invalidateResultsFetchDedupe()` FIRST, before any signal is
   *    written. `lastSuccessfulResultsFetchKey` survives across component
   *    instances on this root singleton; skipping this makes `main()`
   *    early-return and the user sees "filter applied, table unchanged"
   *    with no error anywhere (JD-21).
   * 2. `tableFilters` — option-**value**-only objects (D-URL-10):
   *    `{ result_status_id }`, `{ platform_code }`, `{ agreement_id }`,
   *    `{ report_year } `. Seeding the option's `optionLabel` key (`name` /
   *    `select_label`) would stop `MultiselectComponent`'s label backfill
   *    from ever running (it only backfills items *missing* the label key —
   *    `multiselect.component.ts:187-192`), freezing the seeded string as
   *    the chip label forever — the exact bug `applyStatusFilterFromHomeLink`
   *    has today (renders the literal `'Status'`).
   *    `tableFilters.indicators` is deliberately never written here —
   *    `indicator` seeds `indicator-codes-tabs` only, below (design §7.2's
   *    "indicator is deliberately absent from this table" blockquote): the
   *    indicator multiselect is `@if`-hidden whenever a tab is set
   *    (`table-filters-sidebar.component.html:2`), so a seeded entry would
   *    render no chip while still inflating `countTableFiltersSelected`.
   * 3. `resultsFilter` + `appliedFilters` — the wire keys, built as a single
   *    object and used for BOTH signals.
   * 4. `myResultsFilterItem` + `create-user-codes` — from the resolved
   *    my/all scope (never a `sec_user_id`-bearing token from the URL
   *    itself — NFR-RCU-003 — the scope is expressed purely as `'my' |
   *    'all'` and the id is resolved here, client-side, from the cache).
   *
   * MUST NOT call `noteUserFilterMutation()` (T-05): this is the read path,
   * not a user-facing mutation — bumping the counter here would fire the
   * write effect (design §6.2) immediately after load.
   *
   * A **presence** assertion here (the signals hold the right ids) cannot
   * prove the sidebar chip renders — the transient blank-label window
   * before the control list resolves is documented and expected (design
   * §7.2); the rendered proof belongs to T-11, taken after that resolution.
   */
  seedFromUrl(url: ResultsCenterUrlState): void {
    this.invalidateResultsFetchDedupe();

    const { filters, scope } = url;

    this.tableFilters.update(prev => ({
      ...prev,
      statusCodes: (filters.status ?? []).map(result_status_id => ({ result_status_id })),
      sources: (filters.source ?? []).map(platform_code => ({ platform_code })),
      contracts: (filters.contract ?? []).map(agreement_id => ({ agreement_id })),
      years: (filters.year ?? []).map(report_year => ({ report_year }))
      // `indicators` intentionally absent — see the doc comment above.
    }));

    const isMyScope = scope === 'my';
    const createUserCodes = isMyScope ? [this.cache.dataCache().user.sec_user_id.toString()] : [];

    // Built once, used for BOTH signals (design §7.1 — the fix for
    // `applyFilters`'s same-object-twice hazard).
    const seededFilter: ResultFilter = {
      'indicator-codes': [],
      'lever-codes': [],
      'indicator-codes-filter': [],
      'indicator-codes-tabs': filters.indicator !== undefined ? [filters.indicator] : [],
      'status-codes': filters.status ?? [],
      'contract-codes': filters.contract ?? [],
      'platform-code': filters.source ?? [],
      years: filters.year ?? [],
      'create-user-codes': createUserCodes
    };

    this.resultsFilter.set(seededFilter);
    this.appliedFilters.set(seededFilter);

    this.myResultsFilterItem.set(isMyScope ? this.myResultsFilterItems[1] : this.myResultsFilterItems[0]);
  }

  /** Fixed pending-revision table on project dashboard: status 5, current contract, all results. */
  initializeProjectDashboardResultsTable(contractId: string): void {
    this.invalidateResultsFetchDedupe();
    this.primaryContractId.set(contractId);
    this.myResultsFilterItem.set(this.myResultsFilterItems[0]);
    this.searchInput.set('');
    this.resultsTablePaginatorFirst.set(0);
    this.resultsTablePaginatorRows.set(10);
    this.resultsTableSortField.set('result_official_code');
    this.resultsTableSortOrder.set(-1);

    this.tableFilters.set(new TableFilters());
    this.tableFilters.update(prev => ({
      ...prev,
      statusCodes: [{ result_status_id: 5, name: 'Pending Revision' }]
    }));

    const fixedFilter: ResultFilter = {
      'indicator-codes': [],
      'lever-codes': [],
      'indicator-codes-tabs': [],
      'indicator-codes-filter': [],
      'status-codes': [5],
      'contract-codes': [],
      'platform-code': [],
      years: [],
      'create-user-codes': []
    };

    this.resultsFilter.set(fixedFilter);
    this.appliedFilters.set(fixedFilter);
    void this.main();
  }

  cleanFilters() {
    this.cleanMultiselects();
    this.resultsTableSortField.set('result_official_code');
    this.resultsTableSortOrder.set(-1);
    const table = this.tableRef();
    if (table) {
      table.sortField = 'result_official_code';
      table.sortOrder = -1;
    }
    this.resetResultsTablePaginatorToFirstPage();

    this.tableFilters.update(prev => ({
      ...prev,
      indicators: [],
      statusCodes: [],
      sources: [],
      years: [],
      contracts: [],
      levers: []
    }));
  }

  clearAllFilters() {
    this.invalidateResultsFetchDedupe();
    this.cleanMultiselects();

    this.tableFilters.set(new TableFilters());
    this.tableFilters.update(prev => ({
      ...prev,
      indicators: [],
      statusCodes: [],
      sources: [],
      years: [],
      contracts: [],
      levers: []
    }));

    const activeTab = this.myResultsFilterItem() ?? this.myResultsFilterItems[0];
    const createUserCodes = activeTab.id === 'my' ? [this.cache.dataCache().user.sec_user_id.toString()] : [];

    this.resultsFilter.set({
      'indicator-codes': [],
      'lever-codes': [],
      'indicator-codes-tabs': [],
      'indicator-codes-filter': [],
      'status-codes': [],
      'contract-codes': [],
      'platform-code': [],
      years: [],
      'create-user-codes': createUserCodes
    });

    this.appliedFilters.set({
      'indicator-codes': [],
      'lever-codes': [],
      'indicator-codes-tabs': [],
      'indicator-codes-filter': [],
      'status-codes': [],
      'contract-codes': [],
      'platform-code': [],
      years: [],
      'create-user-codes': createUserCodes
    });

    this.resultsConfig.set({
      indicators: true,
      'result-status': true,
      contracts: true,
      'primary-contract': false,
      'primary-lever': true,
      levers: true,
      'audit-data': true,
      'audit-data-object': true
    });

    this.searchInput.set('');

    // D-URL-15: clearAllFilters' single userFilterMutations bump comes from this
    // delegated onSelectFilterTab(0) call — do not add a second bump here.
    this.onSelectFilterTab(0);

    setTimeout(() => {
      this.cleanMultiselects();
    }, 0);

    this.resultsTableSortField.set('result_official_code');
    this.resultsTableSortOrder.set(-1);
    const table = this.tableRef();
    if (table) {
      table.clear();
      table.sortField = 'result_official_code';
      table.sortOrder = -1;
    }
    this.resetResultsTablePaginatorToFirstPage();
    this.main();
  }

  clearAllFiltersWithPreserve(preserveIndicatorCodes: readonly number[]): void {
    this.invalidateResultsFetchDedupe();
    this.tableFilters.set(new TableFilters());
    this.tableFilters.update(prev => ({
      ...prev,
      indicators: [],
      statusCodes: [],
      sources: [],
      years: [],
      contracts: [],
      levers: []
    }));

    const preserved = [...preserveIndicatorCodes];

    const withPreservedIndicators = (prev: ResultFilter) => ({
      ...prev,
      'indicator-codes-filter': [],
      'indicator-codes-tabs': preserved,
      'indicator-codes': [],
      'platform-code': [],
      'status-codes': [],
      'contract-codes': [],
      'lever-codes': [],
      years: [],
      'create-user-codes': []
    });

    this.resultsFilter.update(withPreservedIndicators);
    this.appliedFilters.update(withPreservedIndicators);

    // clear search input
    this.searchInput.set('');
    this.cleanMultiselects();
    this.resultsTableSortField.set('result_official_code');
    this.resultsTableSortOrder.set(-1);
    const table = this.tableRef();
    if (table) {
      table.clear();
      table.sortField = 'result_official_code';
      table.sortOrder = -1;
    }
    this.resetResultsTablePaginatorToFirstPage();
    // D-URL-15 / R3-1: clearAllFiltersWithPreserve must NOT advance userFilterMutations —
    // it is reached only from the modal / links-to-result flows, not a Results Center user action.
    this.onSelectFilterTab(0, { skipBump: true });
  }

  cleanMultiselects() {
    const refs = this.multiselectRefs();
    Object.values(refs).forEach(multiselect => {
      if (multiselect && typeof multiselect.clear === 'function') {
        try {
          multiselect.clear();
        } catch (error) {
          console.warn('Error clearing multiselect:', error);
        }
      }
    });
  }

  resetState() {
    this.clearAllFilters();
    this.list.set([]);
    this.loading.set(true);
    this.showFiltersSidebar.set(false);
    this.showConfigurationSidebar.set(false);
    this.multiselectRefs.set({});
    this.myResultsFilterItem.set(this.myResultsFilterItems[0]);
  }

  activateStatePersistence(key: string): void {
    this.activeStateKey.set(key);
  }

  deactivateStatePersistence(key: string): void {
    if (this.activeStateKey() === key) {
      this.activeStateKey.set(null);
    }
  }

  restorePersistedState(key: string): boolean {
    const rawState = globalThis.sessionStorage?.getItem(this.getStorageKey(key));
    if (!rawState) {
      return false;
    }

    try {
      const state = JSON.parse(rawState) as Partial<ResultsCenterPersistedState>;
      const selectedTab = this.myResultsFilterItems.find(item => item.id === state.myResultsFilterItemId) ?? this.myResultsFilterItems[0];
      const resultsFilter = this.toResultsFilter(state.resultsFilter);
      const appliedFilters = this.toResultsFilter(state.appliedFilters);
      const tableFilters = Object.assign(new TableFilters(), state.tableFilters ?? {});

      this.myResultsFilterItem.set(selectedTab);
      this.tableFilters.set(tableFilters);
      this.resultsFilter.set(resultsFilter);
      this.appliedFilters.set(appliedFilters);
      this.searchInput.set(state.searchInput ?? '');
      this.primaryContractId.set(state.primaryContractId ?? null);
      this.resultsTablePaginatorFirst.set(state.resultsTablePaginatorFirst ?? 0);
      this.resultsTablePaginatorRows.set(state.resultsTablePaginatorRows ?? 10);
      this.resultsTableSortField.set(state.resultsTableSortField ?? 'result_official_code');
      this.resultsTableSortOrder.set(state.resultsTableSortOrder === 1 ? 1 : -1);
      this.syncIndicatorTabSelection(resultsFilter['indicator-codes-tabs']?.[0] ?? 0);

      return true;
    } catch (error) {
      console.warn('Error restoring persisted results-center state:', error);
      globalThis.sessionStorage?.removeItem(this.getStorageKey(key));
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  private toResultsFilter(filter?: Partial<ResultFilter>): ResultFilter {
    return {
      'create-user-codes': filter?.['create-user-codes'] ?? [],
      'indicator-codes': filter?.['indicator-codes'] ?? [],
      'status-codes': filter?.['status-codes'] ?? [],
      'contract-codes': filter?.['contract-codes'] ?? [],
      'platform-code': filter?.['platform-code'] ?? [],
      'lever-codes': filter?.['lever-codes'] ?? [],
      years: filter?.years ?? [],
      'indicator-codes-filter': filter?.['indicator-codes-filter'] ?? [],
      'indicator-codes-tabs': filter?.['indicator-codes-tabs'] ?? []
    };
  }

  buildSearchField(...fields: string[]): string {
    const words = fields
      .join(' ')
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.toLowerCase());

    if (words.length === 0) return '';
    if (words.length === 1) return words[0];

    const permutations: string[] = [];

    const permute = (arr: string[], current: string[] = []) => {
      if (current.length >= 2) {
        permutations.push(current.join(' '));
      }
      for (let i = 0; i < arr.length; i++) {
        permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...current, arr[i]]);
      }
    };
    permute(words);

    return [...words, ...permutations].join(' | ');
  }

  private syncIndicatorTabSelection(indicatorId: number): void {
    this.api.indicatorTabs.lazy().list.update(prev =>
      prev.map((item: GetAllIndicators) => ({
        ...item,
        active: item.indicator_id === indicatorId
      }))
    );
  }
}

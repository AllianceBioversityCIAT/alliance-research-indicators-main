import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { ApiService } from './api.service';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';
import { MultiselectComponent } from '../components/custom-fields/multiselect/multiselect.component';
import { MenuItem } from 'primeng/api';
import { CacheService } from './cache/cache.service';
import { ContractsResponseWithMeta } from '../interfaces/contracts-response-with-meta.interface';

export class MyProjectsFilters {
  contractCode = '';
  projectName = '';
  principalInvestigator = '';
  levers: { id: number; short_name: string }[] = [];
  statusCodes: { name: string; value: string }[] = [];
  fundingTypes: { funding_type: string }[] = [];
  startDate = '';
  endDate = '';
  poolFundingOnly = false;
}

interface MyProjectsPersistedState {
  myProjectsFilterItemId: string;
  tableFilters: MyProjectsFilters;
  appliedFilters: MyProjectsFilters;
  searchInput: string;
}

@Injectable({
  providedIn: 'root'
})
export class MyProjectsService {
  private readonly storagePrefix = 'my-projects-view-state:';
  api = inject(ApiService);
  cache = inject(CacheService);

  list = signal<FindContracts[]>([]);
  loading = signal(true);
  isOpenSearch = signal(false);
  totalRecords = signal(0);

  tableFilters = signal(new MyProjectsFilters());
  appliedFilters = signal(new MyProjectsFilters());
  showFiltersSidebar = signal(false);
  multiselectRefs = signal<Record<string, MultiselectComponent>>({});
  searchInput = signal('');
  hasFilters = computed(() => {
    const filters = this.appliedFilters();
    const filterChecks = [
      filters.contractCode,
      filters.projectName,
      filters.principalInvestigator,
      filters.levers,
      filters.statusCodes,
      filters.fundingTypes,
      filters.startDate,
      filters.endDate
    ];
    return filterChecks.some(filter => this.isFilterActive(filter)) || filters.poolFundingOnly === true;
  });

  myProjectsFilterItems: MenuItem[] = [
    { id: 'all', label: 'All Projects' },
    { id: 'my', label: 'My Projects' }
  ];
  myProjectsFilterItem = signal<MenuItem | undefined>(this.myProjectsFilterItems[0]);
  activeStateKey = signal<string | null>(null);
  persistViewState = effect(() => {
    const activeKey = this.activeStateKey();
    if (!activeKey) {
      return;
    }

    const state: MyProjectsPersistedState = {
      myProjectsFilterItemId: this.myProjectsFilterItem()?.id ?? 'all',
      tableFilters: this.tableFilters(),
      appliedFilters: this.appliedFilters(),
      searchInput: this.searchInput()
    };

    globalThis.sessionStorage?.setItem(this.getStorageKey(activeKey), JSON.stringify(state));
  });

  private getBaseParams(): Record<string, unknown> {
    const currentTab = this.myProjectsFilterItem();
    return {
      'current-user': currentTab?.id === 'my',
      'with-indicators': false
    };
  }

  resetFilters(): void {
    this.tableFilters.set(new MyProjectsFilters());
    this.appliedFilters.set(new MyProjectsFilters());
    this.searchInput.set('');
    this.cleanMultiselects();
  }

  private isFilterActive(
    filterValue: string | { id: number; short_name: string }[] | { name: string; value: string }[] | { funding_type: string }[]
  ): boolean {
    if (Array.isArray(filterValue)) {
      return filterValue.length > 0;
    }
    return !!filterValue;
  }

  private getLeverDisplayName(item: FindContracts): string {
    if (item.levers) {
      const leversArray = Array.isArray(item.levers) ? item.levers : [item.levers];
      const names = leversArray.map(l => l.short_name).filter(Boolean);
      if (names.length) return names.join(', ');
    }
    if (item.lever_name) {
      return item.lever_name;
    }
    if (item.lever && typeof item.lever === 'object') {
      return item.lever.short_name || item.lever.name || '';
    }
    if (typeof item.lever === 'string') {
      return item.lever;
    }
    return '';
  }

  async main(params?: Record<string, unknown>) {
    this.loading.set(true);
    const activeTabIdAtRequest = this.myProjectsFilterItem()?.id;
    try {
      const finalParams: Record<string, unknown> = {
        'with-indicators': false,
        ...(params ?? {})
      };

      const orderFieldRaw = finalParams['order-field'];
      if (orderFieldRaw == null || orderFieldRaw === '') {
        finalParams['order-field'] = 'contract-code';
      }

      if (finalParams['direction'] == null || finalParams['direction'] === '') {
        finalParams['direction'] = 'DESC';
      }

      const response = await this.api.GET_FindContracts(finalParams);
      const listData = response?.data?.data;
      const metaTotalRaw = (response as ContractsResponseWithMeta)?.metadata?.total ?? response?.data?.metadata?.total;

      const stillSameTab = this.myProjectsFilterItem()?.id === activeTabIdAtRequest;
      if (!stillSameTab) return;

      if (listData && Array.isArray(listData)) {
        this.list.set(listData);
        const parsedTotal = metaTotalRaw === undefined || metaTotalRaw === null ? undefined : Number(metaTotalRaw);
        let totalValue = 0;

        if (listData.length === 0) {
          totalValue = 0;
        } else if (parsedTotal !== undefined && Number.isFinite(parsedTotal)) {
          totalValue = parsedTotal;
        } else {
          totalValue = listData.length;
        }

        this.totalRecords.set(totalValue);
        this.list.update(current =>
          current.map(item => ({
            ...item,
            full_name: `${item.agreement_id} ${item.projectDescription} ${item.description} ${item.project_lead_description}`,
            display_principal_investigator: item.principal_investigator || item.project_lead_description || '',
            display_lever_name: this.getLeverDisplayName(item)
          }))
        );
      } else {
        this.list.set([]);
        this.totalRecords.set(0);
      }
    } catch (e) {
      console.error('Failed to fetch find contracts:', e);
      if (this.myProjectsFilterItem()?.id === activeTabIdAtRequest) {
        this.list.set([]);
        this.totalRecords.set(0);
      }
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters = (pagination?: { page: number; limit: number; sortField?: string; sortOrder?: number; query?: string }) => {
    const filters = this.tableFilters();
    const params = this.getBaseParams();
    params['page'] = pagination?.page ?? 1;
    params['limit'] = pagination?.limit ?? 10;

    if (pagination?.query) {
      params['query'] = pagination.query;
    }

    if (filters.contractCode) {
      params['contract-code'] = filters.contractCode;
    }

    if (filters.projectName) {
      params['project-name'] = filters.projectName;
    }

    if (filters.principalInvestigator) {
      params['principal-investigator'] = filters.principalInvestigator;
    }

    if (filters.levers.length > 0) {
      params['lever'] = filters.levers.map(lever => lever.id).join(',');
    }

    if (filters.statusCodes.length > 0) {
      params['status'] = filters.statusCodes.map(status => status.value).join(',');
    }

    if (filters.fundingTypes.length > 0) {
      params['funding-type'] = filters.fundingTypes.map(fundingType => fundingType.funding_type).join(',');
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      params['start-date'] = startDate.toISOString().slice(0, 23);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      params['end-date'] = endDate.toISOString().slice(0, 23);
    }

    if (filters.poolFundingOnly) {
      params['pool-funding-contributor'] = true;
    }

    const sortField = pagination?.sortField;
    params['order-field'] = sortField != null && String(sortField).trim() !== '' ? sortField : 'contract-code';
    params['direction'] = pagination?.sortOrder === 1 ? 'ASC' : 'DESC';

    this.appliedFilters.set({ ...filters });

    this.main(params);
  };

  countFiltersSelected = computed(() => {
    const f = this.tableFilters();
    const total =
      (f.contractCode ? 1 : 0) +
      (f.projectName ? 1 : 0) +
      (f.principalInvestigator ? 1 : 0) +
      (f.levers?.length ?? 0) +
      (f.statusCodes?.length ?? 0) +
      (f.fundingTypes?.length ?? 0) +
      (f.startDate ? 1 : 0) +
      (f.endDate ? 1 : 0) +
      (f.poolFundingOnly ? 1 : 0);
    return total > 0 ? total.toString() : undefined;
  });

  getActiveFilters = computed(() => {
    const filters = this.appliedFilters();
    const items: { label: string; value: string; id?: string | number }[] = [];

    const formatDate = (iso: string): string => {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mm = months[d.getMonth()];
      const dd = d.getDate().toString().padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}, ${dd} /${yyyy}`;
    };

    if (filters.contractCode) items.push({ label: 'CONTRACT CODE', value: filters.contractCode });
    if (filters.projectName) items.push({ label: 'PROJECT NAME', value: filters.projectName });
    if (filters.principalInvestigator) items.push({ label: 'PRINCIPAL INVESTIGATOR', value: filters.principalInvestigator });

    if (Array.isArray(filters.statusCodes)) {
      filters.statusCodes.forEach(s => items.push({ label: 'STATUS', value: s.name, id: s.value }));
    }
    if (Array.isArray(filters.levers)) {
      filters.levers.forEach(l => items.push({ label: 'LEVER', value: l.short_name || l.id.toString(), id: l.id }));
    }
    if (Array.isArray(filters.fundingTypes)) {
      filters.fundingTypes.forEach(f => items.push({ label: 'FUNDING TYPE', value: f.funding_type, id: f.funding_type }));
    }
    if (filters.startDate) items.push({ label: 'START DATE', value: formatDate(filters.startDate) });
    if (filters.endDate) items.push({ label: 'END DATE', value: formatDate(filters.endDate) });
    if (filters.poolFundingOnly) {
      items.push({ label: 'CONTRIBUTING TO POOL FUNDING', value: 'Contributing to Pool Funding' });
    }

    return items;
  });

  removeFilter(label: string, id?: string | number): void {
    const mapping: Record<string, keyof MyProjectsFilters> = {
      'CONTRACT CODE': 'contractCode',
      'PROJECT NAME': 'projectName',
      'PRINCIPAL INVESTIGATOR': 'principalInvestigator',
      STATUS: 'statusCodes',
      LEVER: 'levers',
      'FUNDING TYPE': 'fundingTypes',
      'START DATE': 'startDate',
      'END DATE': 'endDate',
      'CONTRIBUTING TO POOL FUNDING': 'poolFundingOnly'
    };
    const key = mapping[label];
    if (!key) return;

    this.tableFilters.update(prev => {
      const next: MyProjectsFilters = { ...prev };
      switch (key) {
        case 'statusCodes':
          if (id == null) {
            next.statusCodes = [];
          } else {
            next.statusCodes = next.statusCodes.filter(s => s.value !== id);
          }
          break;
        case 'levers':
          if (id == null) {
            next.levers = [];
          } else {
            next.levers = next.levers.filter(l => l.id !== id);
          }
          break;
        case 'fundingTypes':
          if (id == null) {
            next.fundingTypes = [];
          } else {
            next.fundingTypes = next.fundingTypes.filter(f => f.funding_type !== id);
          }
          break;
        case 'contractCode':
          next.contractCode = '';
          break;
        case 'projectName':
          next.projectName = '';
          break;
        case 'principalInvestigator':
          next.principalInvestigator = '';
          break;
        case 'startDate':
          next.startDate = '';
          break;
        case 'endDate':
          next.endDate = '';
          break;
        case 'poolFundingOnly':
          next.poolFundingOnly = false;
          break;
      }
      return next;
    });

    const refs = this.multiselectRefs();
    const refKeyByLabel: Record<string, 'status' | 'lever' | 'fundingType'> = {
      STATUS: 'status',
      LEVER: 'lever',
      'FUNDING TYPE': 'fundingType'
    };
    const refKey = refKeyByLabel[label];
    const ref: MultiselectComponent | undefined = refKey ? refs[refKey] : undefined;
    if (ref && id != null && typeof ref.removeById === 'function') {
      try {
        ref.removeById(id);
      } catch {
        // noop
      }
    } else if (ref && id == null && typeof ref.clear === 'function') {
      try {
        ref.clear();
      } catch {
        // do nothing
      }
    }
  }

  onActiveItemChange = (event: MenuItem): void => {
    this.myProjectsFilterItem.set(event);
    this.resetFilters();
  };

  showFilterSidebar(): void {
    this.showFiltersSidebar.set(true);
  }

  cleanMultiselects() {
    const refs = this.multiselectRefs();
    if (refs && Object.keys(refs).length > 0) {
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
  }

  clearAllFilters() {
    this.resetFilters();
  }

  clearFilters() {
    this.resetFilters();
  }

  refresh() {
    this.main({ ...this.getBaseParams(), page: 1, limit: 10 });
  }

  resetState() {
    this.resetFilters();
    this.list.set([]);
    this.totalRecords.set(0);
    this.loading.set(true);
    this.isOpenSearch.set(false);
    this.showFiltersSidebar.set(false);
    this.multiselectRefs.set({});
    this.myProjectsFilterItem.set(this.myProjectsFilterItems[0]);
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
      const state = JSON.parse(rawState) as Partial<MyProjectsPersistedState>;
      const selectedTab = this.myProjectsFilterItems.find(item => item.id === state.myProjectsFilterItemId) ?? this.myProjectsFilterItems[0];

      this.myProjectsFilterItem.set(selectedTab);
      this.tableFilters.set(Object.assign(new MyProjectsFilters(), state.tableFilters ?? {}));
      this.appliedFilters.set(Object.assign(new MyProjectsFilters(), state.appliedFilters ?? {}));
      this.searchInput.set(state.searchInput ?? '');

      return true;
    } catch (error) {
      console.warn('Error restoring persisted my-projects state:', error);
      globalThis.sessionStorage?.removeItem(this.getStorageKey(key));
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }
}

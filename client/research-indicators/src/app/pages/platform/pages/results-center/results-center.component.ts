import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IndicatorsTabFilterComponent } from './components/indicators-tab-filter/indicators-tab-filter.component';
import { TableFiltersSidebarComponent } from './components/table-filters-sidebar/table-filters-sidebar.component';
import { TableConfigurationComponent } from './components/table-configuration/table-configuration.component';
import { ResultsCenterTableComponent } from './components/results-center-table/results-center-table.component';
import { ResultsCenterService } from './results-center.service';
import { CacheService } from '../../../../shared/services/cache/cache.service';
import { SectionSidebarComponent } from '../../../../shared/components/section-sidebar/section-sidebar.component';
import { ApiService } from '../../../../shared/services/api.service';
import { ActionsService } from '../../../../shared/services/actions.service';
import { MenuItem } from 'primeng/api';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-results-center',
  imports: [
    IndicatorsTabFilterComponent,
    ResultsCenterTableComponent,
    TableFiltersSidebarComponent,
    TableConfigurationComponent,
    SectionSidebarComponent,
    S3ImageUrlPipe
  ],
  templateUrl: './results-center.component.html',
  styleUrls: ['./results-center.component.scss']
})
export default class ResultsCenterComponent implements OnInit, OnDestroy {
  private readonly stateKey = 'results-center';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  api = inject(ApiService);
  resultsCenterService = inject(ResultsCenterService);
  cache = inject(CacheService);
  actions = inject(ActionsService);

  // Pin functionality
  pinnedTab = signal<string>('all');
  loadingPin = signal(false);
  tableId = 'result-table';

  orderedFilterItems = computed(() => {
    const pinnedTab = this.pinnedTab();
    if (pinnedTab === 'my') {
      return [
        {
          id: 'my',
          label: 'My Results'
        },
        {
          id: 'all',
          label: 'All Results'
        }
      ];
    } else {
      return [
        {
          id: 'all',
          label: 'All Results'
        },
        {
          id: 'my',
          label: 'My Results'
        }
      ];
    }
  });

  ngOnInit(): void {
    void this.initializeState();
  }

  ngOnDestroy(): void {
    this.resultsCenterService.deactivateStatePersistence(this.stateKey);
    this.resultsCenterService.showFiltersSidebar.set(false);
    this.resultsCenterService.showConfigurationsSidebar.set(false);
  }

  private isValidNumericIdQueryParam(raw: string | null): raw is string {
    if (raw == null || raw === '') {
      return false;
    }
    const id = Number(raw);
    return Number.isFinite(id) && id >= 0;
  }

  private async initializeState(): Promise<void> {
    this.resultsCenterService.primaryContractId.set(null);
    this.resultsCenterService.showFiltersSidebar.set(false);
    this.resultsCenterService.showConfigurationsSidebar.set(false);

    const indicatorTabParam = this.route.snapshot.queryParamMap.get('indicatorTab');
    const statusTabParam = this.route.snapshot.queryParamMap.get('statusTab');
    const statusLabelParam = this.route.snapshot.queryParamMap.get('statusLabel');

    const hasIndicator = this.isValidNumericIdQueryParam(indicatorTabParam);
    const hasStatus = this.isValidNumericIdQueryParam(statusTabParam);

    if (hasIndicator || hasStatus) {
      this.resultsCenterService.activateStatePersistence(this.stateKey);
      await this.loadPinnedTabPreference();
      this.loadMyResults(true);
      if (hasIndicator) {
        this.resultsCenterService.onSelectFilterTab(Number(indicatorTabParam), { skipMain: true });
      }
      if (hasStatus) {
        this.resultsCenterService.applyStatusFilterFromHomeLink(Number(statusTabParam), statusLabelParam ?? undefined, {
          skipMain: true
        });
      }
      void this.resultsCenterService.main();
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          indicatorTab: null,
          statusTab: null,
          statusLabel: null
        },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    const openMyFromQuery = this.route.snapshot.queryParamMap.get('tab') === 'my';
    const restoredState = this.resultsCenterService.restorePersistedState(this.stateKey);
    this.resultsCenterService.primaryContractId.set(null);
    this.resultsCenterService.activateStatePersistence(this.stateKey);

    const preferredTab = await this.loadPinnedTabPreference();
    if (openMyFromQuery) {
      this.loadMyResults();
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    if (restoredState) {
      await this.resultsCenterService.main();
      return;
    }

    if (preferredTab === 'my') {
      this.loadMyResults();
      return;
    }

    this.loadAllResults();
  }

  showSignal = signal(false);

  toggleSidebar() {
    this.showSignal.update(value => !value);
  }

  applyFilters() {
    this.resultsCenterService.applyFilters();
  }

  // Pin functionality methods
  private async loadPinnedTabPreference(): Promise<'all' | 'my'> {
    this.loadingPin.set(true);

    try {
      const response = await this.api.GET_Configuration(this.tableId, 'tab');
      if (response?.data) {
        const pinValue = response.data as unknown as { all: string; self: string };
        const allPinned = pinValue.all === '1';
        const selfPinned = pinValue.self === '1';
        const preferredTab = allPinned || !selfPinned ? 'all' : 'my';

        this.pinnedTab.set(preferredTab);
        this.resultsCenterService.pinnedTab.set(preferredTab);
        return preferredTab;
      }

      this.pinnedTab.set('all');
      this.resultsCenterService.pinnedTab.set('all');
      return 'all';
    } finally {
      this.loadingPin.set(false);
    }
  }

  onActiveItemChange = (event: MenuItem): void => {
    this.resultsCenterService.cleanFilters();

    if (event.id === 'my') {
      this.loadMyResults();
    } else {
      this.loadAllResults();
    }
  };

  loadMyResults(skipMain = false) {
    const preserveIndicatorTabs = this.resultsCenterService.resultsFilter()['indicator-codes-tabs'] ?? [];
    this.resultsCenterService.myResultsFilterItem.set(this.resultsCenterService.myResultsFilterItems[1]);
    this.resultsCenterService.resultsFilter.set({
      'create-user-codes': [this.cache.dataCache().user.sec_user_id.toString()],
      'indicator-codes': [],
      'status-codes': [],
      'contract-codes': [],
      'lever-codes': [],
      years: [],
      'indicator-codes-filter': [],
      'indicator-codes-tabs': preserveIndicatorTabs
    });
    this.resultsCenterService.appliedFilters.set({
      'create-user-codes': [this.cache.dataCache().user.sec_user_id.toString()],
      'indicator-codes': [],
      'status-codes': [],
      'contract-codes': [],
      'lever-codes': [],
      years: [],
      'indicator-codes-filter': [],
      'indicator-codes-tabs': preserveIndicatorTabs
    });
    if (!skipMain) {
      void this.resultsCenterService.main();
    }
  }

  loadAllResults() {
    const preserveIndicatorTabs = this.resultsCenterService.resultsFilter()['indicator-codes-tabs'] ?? [];
    this.resultsCenterService.myResultsFilterItem.set(this.resultsCenterService.myResultsFilterItems[0]);
    this.resultsCenterService.resultsFilter.set({
      'create-user-codes': [],
      'indicator-codes': [],
      'status-codes': [],
      'contract-codes': [],
      'lever-codes': [],
      years: [],
      'indicator-codes-filter': [],
      'indicator-codes-tabs': preserveIndicatorTabs
    });
    this.resultsCenterService.appliedFilters.set({
      'create-user-codes': [],
      'indicator-codes': [],
      'status-codes': [],
      'contract-codes': [],
      'lever-codes': [],
      years: [],
      'indicator-codes-filter': [],
      'indicator-codes-tabs': preserveIndicatorTabs
    });
    this.resultsCenterService.main();
  }

  async togglePin(tabId: string) {
    try {
      this.loadingPin.set(true);
      const newPinnedTab = this.pinnedTab() === tabId ? 'all' : tabId;
      const pinValue = newPinnedTab === 'all' ? { all: true, self: false } : { all: false, self: true };

      await this.api.PATCH_Configuration(this.tableId, 'tab', pinValue);
      this.pinnedTab.set(newPinnedTab);
      this.resultsCenterService.pinnedTab.set(newPinnedTab);

      if (newPinnedTab === 'my') {
        this.loadMyResults();
      } else {
        this.loadAllResults();
      }

      setTimeout(() => {
        this.resultsCenterService.cleanMultiselects();
      }, 0);
    } catch (error) {
      console.error('Error updating pinned tab:', error);
    } finally {
      this.actions.showToast({
        severity: 'success',
        summary: 'Results',
        detail: `${tabId === 'all' ? 'All Results' : 'My Results'} tab pinned successfully`
      });
      this.loadingPin.set(false);
      void this.loadPinnedTabPreference();
    }
  }

  isPinned(tabId: string): boolean {
    return this.pinnedTab() === tabId;
  }

  onPinIconClick(tabId: string, event: Event) {
    event.stopPropagation();
    this.togglePin(tabId);
  }
}

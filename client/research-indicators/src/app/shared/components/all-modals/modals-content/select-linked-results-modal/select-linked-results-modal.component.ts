import { Component, OnDestroy, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { Result, ResultFilter } from '@shared/interfaces/result/result.interface';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { FiltersActionButtonsComponent } from '@shared/components/filters-action-buttons/filters-action-buttons.component';
import { SearchExportControlsComponent } from '@shared/components/search-export-controls/search-export-controls.component';
import { PLATFORM_COLOR_MAP } from '@shared/constants/platform-colors';
import { CacheService } from '@shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { LinkResultsResponse } from '@shared/interfaces/link-results.interface';
import { ActionsService } from '@shared/services/actions.service';
import { SectionSidebarComponent } from '@shared/components/section-sidebar/section-sidebar.component';
import { TableFiltersSidebarComponent } from '@pages/platform/pages/results-center/components/table-filters-sidebar/table-filters-sidebar.component';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import { Router, UrlTree } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { openPublicLink } from '@shared/utils/public-link.util';

const MODAL_INDICATOR_CODES = [1, 2, 3, 4, 6] as const;

@Component({
  selector: 'app-select-linked-results-modal',
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    TagModule,
    CustomTagComponent,
    FiltersActionButtonsComponent,
    SearchExportControlsComponent,
    SectionSidebarComponent,
    TableFiltersSidebarComponent,
    CustomProgressBarComponent,
    TooltipModule
  ],
  templateUrl: './select-linked-results-modal.component.html'
})
export class SelectLinkedResultsModalComponent implements OnDestroy {
  readonly openPublicLink = openPublicLink;
  allModalsService = inject(AllModalsService);
  resultsCenterService = inject(ResultsCenterService);
  cacheService = inject(CacheService);
  apiService = inject(ApiService);
  actions = inject(ActionsService);
  private readonly router = inject(Router);

  @ViewChild('dt2') dt2!: Table;

  selectedResults = signal<Result[]>([]);
  saving = signal(false);
  private modalWasOpen = false;
  private savedMyResultsFilterItem: import('primeng/api').MenuItem | undefined;
  private readonly modalVisibilityWatcher = effect(
    () => {
      const modalConfig = this.allModalsService.isModalOpen('selectLinkedResults');
      const isOpen = modalConfig?.isOpen ?? false;
      if (isOpen && !this.modalWasOpen) {
        void this.onModalOpened();
      }
      if (!isOpen && this.modalWasOpen) {
        this.resetModalFilters();
      }
      this.modalWasOpen = isOpen;
    },
    { allowSignalWrites: true }
  );

  selectedCount = computed(() => this.selectedResults().length);

  private readonly syncSelectedResultsWatcher = effect(
    () => {
      const syncedResults = this.allModalsService.syncSelectedResults();
      const currentSelected = this.selectedResults();
      const syncedIds = syncedResults.map(r => r.result_id).sort((a, b) => a - b);
      const currentIds = currentSelected.map(r => r.result_id).sort((a, b) => a - b);

      if (JSON.stringify(syncedIds) !== JSON.stringify(currentIds)) {
        this.selectedResults.set(syncedResults);
      }
    },
    { allowSignalWrites: true }
  );

  ngOnDestroy(): void {
    this.modalVisibilityWatcher.destroy();
    this.syncSelectedResultsWatcher.destroy();
  }

  setSearchInputFilter(query: string) {
    this.resultsCenterService.resultsTablePaginatorFirst.set(0);
    this.resultsCenterService.searchInput.set(query);
    if (this.dt2) {
      this.dt2.first = 0;
    }
    void this.resultsCenterService.main();
  }

  handleLinkedTableLazyLoad(event: TableLazyLoadEvent): void {
    this.resultsCenterService.handleResultsTableLazyLoad(event);
  }

  getResultHref(result: Result, platformCode?: string): string {
    const effectivePlatform = platformCode ?? result.platform_code;

    if (effectivePlatform === PLATFORM_CODES.TIP) {
      return result.external_link ?? '';
    }

    const resultCode = `${effectivePlatform}-${result.result_official_code}`;
    let urlTree: UrlTree;
    if (result.result_status?.result_status_id === 6 && Array.isArray(result.snapshot_years) && result.snapshot_years.length > 0) {
      const latestYear = Math.max(...result.snapshot_years);
      urlTree = this.router.createUrlTree(['/result', resultCode, 'general-information'], {
        queryParams: { version: latestYear }
      });
    } else {
      urlTree = this.router.createUrlTree(['/result', resultCode]);
    }
    return this.router.serializeUrl(urlTree);
  }

  openResult(result: Result) {
    if (result.platform_code === PLATFORM_CODES.TIP && result.external_link) {
      this.openExternalLink(result);
      return;
    }
    this.resultsCenterService.clearAllFilters();
    const href = this.getResultHref(result);
    this.openHrefInNewTab(href);
  }

  openExternalLink(result: Result): void {
    const link = result.external_link;
    if (!link) return;

    const isSupportedPlatform = result.platform_code === PLATFORM_CODES.TIP || result.platform_code === PLATFORM_CODES.PRMS;
    if (isSupportedPlatform) {
      globalThis.open(link, '_blank', 'noopener');
    }
  }

  openResultByYear(result: number, year: string | number, platformCode: string) {
    if (platformCode === PLATFORM_CODES.PRMS) {
      return;
    }
    this.resultsCenterService.clearAllFilters();
    const resultCode = `${platformCode}-${result}`;
    const tree = this.router.createUrlTree(['/result', resultCode], {
      queryParams: { version: year }
    });
    const href = this.router.serializeUrl(tree);
    this.openHrefInNewTab(href);
  }

  private openHrefInNewTab(href: string): void {
    if (!href) {
      return;
    }
    const baseOrigin = globalThis.location?.origin ?? '';
    const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseOrigin).toString();
    globalThis.open?.(absoluteUrl, '_blank', 'noopener');
  }

  formatResultCode(code: string | number): string {
    if (!code) return String(code || '');
    return String(code).padStart(3, '0');
  }

  getPlatformColors(platformCode: string): { text: string; background: string } | undefined {
    return PLATFORM_COLOR_MAP[platformCode];
  }

  getProjectHref(contractId: string): string {
    const tree = this.router.createUrlTree(['/project-detail', contractId]);
    return this.router.serializeUrl(tree);
  }

  isNonStarPlatform(result: Result): boolean {
    return result.platform_code !== PLATFORM_CODES.STAR;
  }

  openResultInfoModal(result: Result): void {
    this.allModalsService.selectedResultForInfo.set(result);
    this.allModalsService.openModal('resultInformation');
  }

  isSelected(result: Result): boolean {
    return this.selectedResults().some(r => r.result_id === result.result_id);
  }

  toggleSelection(result: Result) {
    const current = this.selectedResults();
    const index = current.findIndex(r => r.result_id === result.result_id);

    if (index >= 0) {
      const updated = current.filter(r => r.result_id !== result.result_id);
      this.selectedResults.set(updated);
      this.allModalsService.syncSelectedResults.set(updated);
    } else {
      const updated = [...current, result];
      this.selectedResults.set(updated);
      this.allModalsService.syncSelectedResults.set(updated);
    }
  }

  cancel() {
    this.allModalsService.closeModal('selectLinkedResults');
    this.selectedResults.set([]);
    this.saving.set(false);
  }

  async saveSelection(): Promise<void> {
    const selected = this.selectedResults();
    if (selected.length === 0) return;

    const payload: LinkResultsResponse = {
      link_results: selected.map(result => ({
        other_result_id: Number(result.result_id)
      }))
    };

    const resultId = this.cacheService.getCurrentNumericResultId();

    this.saving.set(true);
    try {
      await this.apiService.PATCH_LinkedResults(resultId, payload);
      await this.allModalsService.refreshLinkedResults?.();
      this.actions.showToast({
        severity: 'success',
        summary: 'Linked results',
        detail: 'Results linked successfully'
      });
      this.selectedResults.set([]);
      this.allModalsService.closeModal('selectLinkedResults');
    } catch (error) {
      this.actions.showToast({
        severity: 'error',
        summary: 'Linked results',
        detail: 'Unable to link results, please try again'
      });
      console.error(error);
    } finally {
      this.saving.set(false);
    }
  }

  showFiltersSidebar() {
    this.resultsCenterService.showFiltersSidebar.set(true);
  }

  clearFilters(): void {
    this.resultsCenterService.clearAllFiltersWithPreserve([...MODAL_INDICATOR_CODES]);
    this.applyModalIndicatorFilter({ resetIndicatorFilters: true });
    this.resultsCenterService.searchInput.set('');
    this.resetTableToFirstPage();
    void this.loadResultsForModal();
  }

  getScrollHeight = computed(() => `calc(100vh - ${this.cacheService.headerHeight() + this.cacheService.navbarHeight() + 400}px)`);

  private async onModalOpened(): Promise<void> {
    this.resultsCenterService.invalidateResultsListFetchCache();
    this.resultsCenterService.resultsTablePaginatorFirst.set(0);
    this.resultsCenterService.resultsTablePaginatorRows.set(10);
    this.savedMyResultsFilterItem = this.resultsCenterService.myResultsFilterItem();
    this.resultsCenterService.myResultsFilterItem.set(this.resultsCenterService.myResultsFilterItems[0]);

    this.applyModalIndicatorFilter({ resetIndicatorFilters: true });
    await this.loadResultsForModal();
    await this.loadExistingLinkedResults();
  }

  private async loadExistingLinkedResults(): Promise<void> {
    const resultId = this.cacheService.getCurrentNumericResultId();
    try {
      const response = await this.apiService.GET_LinkedResults(resultId);
      const codes = response.data?.link_results?.map(item => String(item.other_result_id)) ?? [];
      if (codes.length === 0) {
        this.selectedResults.set([]);
        return;
      }

      const availableResults = this.resultsCenterService.list();
      const matched = availableResults.filter(result => codes.includes(String(result.result_id)));
      this.selectedResults.set(matched);
    } catch (error) {
      console.error('Error loading linked results', error);
    }
  }

  private async loadResultsForModal(): Promise<void> {
    try {
      this.resultsCenterService.invalidateResultsListFetchCache();
      this.resultsCenterService.list.set([]);
      this.resultsCenterService.loading.set(true);

      this.resultsCenterService.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [] }));
      this.resultsCenterService.appliedFilters.update(prev => ({ ...prev, 'create-user-codes': [] }));

      await this.resultsCenterService.main();
    } catch (error) {
      console.error('Error loading results for modal', error);
      this.resultsCenterService.list.set([]);
    } finally {
      this.resultsCenterService.loading.set(false);
    }
  }

  /** Used by applyModalIndicatorFilter; exposed for branch coverage in tests */
  getTabsForIndicatorFilter(
    options: { resetIndicatorFilters?: boolean; tabsOverride?: readonly number[] },
    hasActiveIndicatorFilter: boolean
  ): number[] {
    const { resetIndicatorFilters = false, tabsOverride } = options;
    if (Array.isArray(tabsOverride)) return [...tabsOverride];
    if (resetIndicatorFilters || !hasActiveIndicatorFilter) return [...MODAL_INDICATOR_CODES];
    return [];
  }

  private applyModalIndicatorFilter(options: { resetIndicatorFilters?: boolean; tabsOverride?: readonly number[] } = {}): void {
    const { resetIndicatorFilters = false } = options;
    const hasActiveIndicatorFilter =
      (this.resultsCenterService.tableFilters().indicators?.length ?? 0) > 0 ||
      (this.resultsCenterService.resultsFilter()['indicator-codes-filter']?.length ?? 0) > 0;

    const tabs = this.getTabsForIndicatorFilter(options, hasActiveIndicatorFilter);

    const setIndicators = (prev: ResultFilter) => ({
      ...prev,
      'indicator-codes-tabs': tabs,
      'indicator-codes-filter': resetIndicatorFilters ? [] : (prev['indicator-codes-filter'] ?? [])
    });

    this.resultsCenterService.resultsFilter.update(prev => setIndicators(prev));
    this.resultsCenterService.appliedFilters.update(prev => setIndicators(prev));
  }

  private resetModalFilters(): void {
    this.resultsCenterService.showFiltersSidebar.set(false);
    this.selectedResults.set([]);
    this.resultsCenterService.searchInput.set('');

    if (this.savedMyResultsFilterItem) {
      this.resultsCenterService.myResultsFilterItem.set(this.savedMyResultsFilterItem);
      this.savedMyResultsFilterItem = undefined;
    }

    this.clearFilters();
  }

  onFiltersConfirm(): void {
    const filters = this.resultsCenterService.tableFilters();

    const updater = (prev: ResultFilter) => ({
      ...prev,
      'lever-codes': filters.levers.map(lever => lever.id),
      'status-codes': filters.statusCodes.map(status => status.result_status_id),
      'platform-code': (filters.sources ?? []).map(source => source.platform_code),
      years: filters.years.map(year => year.report_year),
      'contract-codes': filters.contracts.map(contract => contract.agreement_id),
      'indicator-codes-filter': filters.indicators.map(indicator => indicator.indicator_id)
    });

    this.resultsCenterService.resultsFilter.update(updater);
    this.resultsCenterService.appliedFilters.update(updater);

    const shouldUseDefaultIndicatorTabs = filters.indicators.length === 0;

    this.applyModalIndicatorFilter({
      tabsOverride: shouldUseDefaultIndicatorTabs ? [...MODAL_INDICATOR_CODES] : []
    });
    this.resetTableToFirstPage();
    void this.loadResultsForModal();
  }

  private resetTableToFirstPage(): void {
    this.resultsCenterService.resultsTablePaginatorFirst.set(0);
    if (this.dt2) {
      this.dt2.first = 0;
    }
  }
}

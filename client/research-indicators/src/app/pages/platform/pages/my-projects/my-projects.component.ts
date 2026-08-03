import { Component, computed, effect, ElementRef, inject, signal, ViewChild, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { FormsModule } from '@angular/forms';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { MyProjectsService } from '@shared/services/my-projects.service';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DatePipe } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';
import { MenuModule } from 'primeng/menu';
import { CacheService } from '../../../../shared/services/cache/cache.service';
import { CustomTagComponent } from '../../../../shared/components/custom-tag/custom-tag.component';
import { Result } from '@shared/interfaces/result/result.interface';
import { MultiselectComponent } from '../../../../shared/components/custom-fields/multiselect/multiselect.component';
import { SectionSidebarComponent } from '../../../../shared/components/section-sidebar/section-sidebar.component';
import { CalendarInputComponent } from '../../../../shared/components/custom-fields/calendar-input/calendar-input.component';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ActionsService } from '@shared/services/actions.service';
import { RippleModule } from 'primeng/ripple';
import { ProjectGeneralInfoComponent } from '../../../../shared/components/project-general-info/project-general-info.component';
import { ProjectIndicatorFiltersComponent } from '../../../../shared/components/project-indicator-filters/project-indicator-filters.component';
import { FiltersActionButtonsComponent } from '@shared/components/filters-action-buttons/filters-action-buttons.component';
import { SearchExportControlsComponent } from '@shared/components/search-export-controls/search-export-controls.component';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-my-projects',
  imports: [
    S3ImageUrlPipe,
    DatePipe,
    FormsModule,
    CustomProgressBarComponent,
    PaginatorModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    TagModule,
    CheckboxModule,
    RippleModule,
    PopoverModule,
    MenuModule,
    RouterLink,
    CustomTagComponent,
    MultiselectComponent,
    SectionSidebarComponent,
    CalendarInputComponent,
    OverlayBadgeModule,
    ProjectGeneralInfoComponent,
    ProjectIndicatorFiltersComponent,
    FiltersActionButtonsComponent,
    SearchExportControlsComponent
  ],
  templateUrl: './my-projects.component.html',
  styleUrl: './my-projects.component.scss'
})
export default class MyProjectsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly serviceStateKey = 'my-projects';
  private readonly viewStateKey = 'my-projects-component-state';
  private readonly persistViewStateEnabled = signal(false);
  private readonly pendingScrollRestore = signal<{ top: number } | null>(null);
  /** Vertical scroll for the contracts table, per tab (session restore / card toggle). */
  private tableScrollTopMy = 0;
  private tableScrollTopAll = 0;
  private restoredState = false;
  api = inject(ApiService);
  myProjectsService = inject(MyProjectsService);
  cache = inject(CacheService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  actions = inject(ActionsService);
  projectUtils = inject(ProjectUtilsService);

  readonly statusTagMaxWidth = '130px';

  first = signal(0);
  rows = signal(10);
  allProjectsFirst = signal(0);
  allProjectsRows = signal(10);
  myProjectsFirst = signal(0);
  myProjectsRows = signal(10);
  private readonly _searchValue = signal('');
  private readonly _isQuerySentToBackend = signal(false);
  isTableView = signal(true);
  sortField = signal<string>('agreement_id');
  sortOrder = signal<number>(-1);

  pinnedTab = signal<string>('all');
  selectedTab = signal<string>('all');
  loadingPin = signal(false);
  tableId = 'contract-table';
  applyFiltersLabel = 'Apply Filters';

  @ViewChild('statusSelect') statusSelect?: MultiselectComponent;
  @ViewChild('leverSelect') leverSelect?: MultiselectComponent;
  @ViewChild('fundingTypeSelect') fundingTypeSelect?: MultiselectComponent;
  @ViewChild('tableRppScope') tableRppScope?: ElementRef<HTMLElement>;

  myProjectsFilterItems: MenuItem[] = [
    {
      id: 'all',
      label: 'All Projects'
    },
    {
      id: 'my',
      label: 'My Projects'
    }
  ];
  myProjectsFilterItem = signal<MenuItem | undefined>(this.myProjectsFilterItems[0]);
  persistViewState = effect(() => {
    if (!this.persistViewStateEnabled()) {
      return;
    }

    const allProjectsFirst = this.allProjectsFirst();
    const allProjectsRows = this.allProjectsRows();
    const myProjectsFirst = this.myProjectsFirst();
    const myProjectsRows = this.myProjectsRows();
    const searchValue = this._searchValue();
    const isQuerySentToBackend = this._isQuerySentToBackend();
    const isTableView = this.isTableView();
    const sortField = this.sortField();
    const sortOrder = this.sortOrder();
    const selectedTab = this.selectedTab();

    const { scrollMy, scrollAll } = this.mergeScrollPositionsForPersist();

    globalThis.sessionStorage?.setItem(
      this.viewStateKey,
      JSON.stringify({
        allProjectsFirst,
        allProjectsRows,
        myProjectsFirst,
        myProjectsRows,
        searchValue,
        isQuerySentToBackend,
        isTableView,
        sortField,
        sortOrder,
        selectedTab,
        tableScrollTopMy: scrollMy,
        tableScrollTopAll: scrollAll
      })
    );
  });

  private readonly scrollRestoreEffect = effect(() => {
    const loading = this.myProjectsService.loading();
    const isTable = this.isTableView();
    const pending = this.pendingScrollRestore();
    if (loading || !isTable || pending == null) {
      return;
    }

    this.scheduleTableScrollRestore(pending.top);
  });

  //pinned tab filter items
  orderedFilterItems = computed(() => {
    const pinnedTab = this.pinnedTab();
    if (pinnedTab === 'my') {
      return [
        {
          id: 'my',
          label: 'My Projects',
          tooltip:
            'Projects will appear here when you are assigned as the Principal Investigator of the project contract in Agresso, or if you have contributed at least one result to the project.'
        },
        {
          id: 'all',
          label: 'All Projects'
        }
      ];
    } else {
      return [
        {
          id: 'all',
          label: 'All Projects'
        },
        {
          id: 'my',
          label: 'My Projects',
          tooltip:
            'Projects will appear here when you are assigned as the Principal Investigator of the project contract in Agresso, or if you have contributed at least one result to the project.'
        }
      ];
    }
  });

  get searchValue(): string {
    return this._searchValue();
  }

  set searchValue(value: string) {
    this._searchValue.set(value);
  }

  filteredProjects = computed(() => {
    const projects = this.myProjectsService.list();

    if (this.myProjectsService.hasFilters() || this._isQuerySentToBackend()) {
      return projects;
    }

    const searchTerm =
      this.myProjectsFilterItem()?.id === 'my' ? this._searchValue().toLowerCase() : this.myProjectsService.searchInput().toLowerCase();

    if (!searchTerm) return projects;

    return projects.filter(project => {
      const fullName = project.full_name?.toLowerCase() || '';
      const agreementId = project.agreement_id?.toLowerCase() || '';
      const description = project.description?.toLowerCase() || '';
      const projectDescription = project.projectDescription?.toLowerCase() || '';
      const principalInvestigator = project.principal_investigator?.toLowerCase() || '';

      return (
        fullName.includes(searchTerm) ||
        agreementId.includes(searchTerm) ||
        description.includes(searchTerm) ||
        projectDescription.includes(searchTerm) ||
        principalInvestigator.includes(searchTerm)
      );
    });
  });

  onPageChange(event: PaginatorState) {
    const newRows = event.rows ?? 10;
    if (this.myProjectsFilterItem()?.id === 'my') {
      const previousFirst = this.myProjectsFirst();
      const previousRows = this.myProjectsRows();
      const nextFirst =
        previousRows === newRows
          ? this.clampProjectsPaginatorFirst(event.first ?? 0, newRows)
          : this.alignFirstAfterRowsChange(previousFirst, newRows);
      if (nextFirst === previousFirst && newRows === previousRows) {
        return;
      }
      this.myProjectsFirst.set(nextFirst);
      this.myProjectsRows.set(newRows);
      this.refreshProjectsWithCurrentContext();
    } else {
      const previousFirst = this.allProjectsFirst();
      const previousRows = this.allProjectsRows();
      const nextFirst =
        previousRows === newRows
          ? this.clampProjectsPaginatorFirst(event.first ?? 0, newRows)
          : this.alignFirstAfterRowsChange(previousFirst, newRows);
      if (nextFirst === previousFirst && newRows === previousRows) {
        return;
      }
      this.allProjectsFirst.set(nextFirst);
      this.allProjectsRows.set(newRows);
      this.refreshProjectsWithCurrentContext();
    }
  }

  onAllProjectsPageChange(event: PaginatorState) {
    const newRows = event.rows ?? 10;
    const previousFirst = this.allProjectsFirst();
    const previousRows = this.allProjectsRows();
    const nextFirst =
      previousRows === newRows ? this.clampProjectsPaginatorFirst(event.first ?? 0, newRows) : this.alignFirstAfterRowsChange(previousFirst, newRows);
    if (nextFirst === previousFirst && newRows === previousRows) {
      return;
    }
    this.allProjectsFirst.set(nextFirst);
    this.allProjectsRows.set(newRows);
    this.refreshProjectsWithCurrentContext();
  }

  private clampProjectsPaginatorFirst(first: number, rows: number): number {
    const safeRows = rows > 0 ? rows : 10;
    const total = this.myProjectsService.totalRecords();
    let f = Math.floor((first ?? 0) / safeRows) * safeRows;
    if (total > 0) {
      const lastPageFirst = Math.max(0, Math.floor((total - 1) / safeRows) * safeRows);
      if (f > lastPageFirst) {
        f = lastPageFirst;
      }
    }
    return Math.max(0, f);
  }

  private alignFirstAfterRowsChange(anchorFirst: number, newRows: number): number {
    const safeRows = newRows > 0 ? newRows : 10;
    const candidate = Math.floor(anchorFirst / safeRows) * safeRows;
    return this.clampProjectsPaginatorFirst(candidate, newRows);
  }

  ngOnInit(): void {
    void this.initializeState();
  }

  ngAfterViewInit() {
    const refs: Record<string, MultiselectComponent> = {};
    if (this.statusSelect) refs['status'] = this.statusSelect;
    if (this.leverSelect) refs['lever'] = this.leverSelect;
    if (this.fundingTypeSelect) refs['fundingType'] = this.fundingTypeSelect;

    if (Object.keys(refs).length > 0) {
      this.myProjectsService.multiselectRefs.set(refs);

      if (!this.restoredState) {
        setTimeout(() => {
          this.myProjectsService.cleanMultiselects();
        }, 100);
      }
    }
  }

  ngOnDestroy(): void {
    this.persistViewStateSnapshot();
    this.persistViewStateEnabled.set(false);
    this.myProjectsService.deactivateStatePersistence(this.serviceStateKey);
    this.myProjectsService.showFiltersSidebar.set(false);
  }

  private async initializeState(): Promise<void> {
    const restoredServiceState = this.myProjectsService.restorePersistedState(this.serviceStateKey);
    const restoredViewState = this.restoreViewState();

    if (restoredViewState && !restoredServiceState) {
      const item = this.selectedTab() === 'my' ? this.myProjectsFilterItems[1] : this.myProjectsFilterItems[0];
      this.myProjectsService.myProjectsFilterItem.set(item);
    }

    this.restoredState = restoredServiceState || restoredViewState;
    this.myProjectsService.activateStatePersistence(this.serviceStateKey);
    this.persistViewStateEnabled.set(true);

    const preferredTab = await this.loadPinnedTabPreference();
    const forceMyTab = this.route.snapshot.queryParamMap.get('tab') === 'my';

    if (this.restoredState) {
      if (forceMyTab) {
        this.myProjectsFilterItem.set(this.myProjectsFilterItems[1]);
        this.myProjectsService.myProjectsFilterItem.set(this.myProjectsFilterItems[1]);
        this.selectedTab.set('my');
        this.updatePendingScrollFromStoredTabScroll();
        this.loadCurrentTabState();
      } else {
        const activeTab = this.myProjectsService.myProjectsFilterItem() ?? this.myProjectsFilterItems[0];
        this.myProjectsFilterItem.set(activeTab);
        this.selectedTab.set(activeTab.id === 'my' ? 'my' : 'all');
        this.updatePendingScrollFromStoredTabScroll();
        this.loadCurrentTabState();
      }
    } else if (forceMyTab) {
      this.applyPinnedTabDefault('my');
    } else {
      this.applyPinnedTabDefault(preferredTab);
    }

    if (forceMyTab) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  private async loadPinnedTabPreference(): Promise<'all' | 'my'> {
    this.loadingPin.set(true);

    try {
      const response = await this.api.GET_Configuration(this.tableId, 'tab');
      if (response?.data) {
        const pinValue = response.data as unknown as { all: string; self: string };
        const allPinned = pinValue.all === '1';
        const selfPinned = pinValue.self === '1';
        const preferredTab = selfPinned && !allPinned ? 'my' : 'all';

        this.pinnedTab.set(preferredTab);
        return preferredTab;
      }

      this.pinnedTab.set('all');
      return 'all';
    } finally {
      this.loadingPin.set(false);
    }
  }

  private applyPinnedTabDefault(preferredTab: 'all' | 'my'): void {
    if (preferredTab === 'my') {
      this.myProjectsFilterItem.set(this.myProjectsFilterItems[1]);
      this.myProjectsService.myProjectsFilterItem.set(this.myProjectsFilterItems[1]);
      this.selectedTab.set('my');
      this.loadMyProjects();
      return;
    }

    this.myProjectsFilterItem.set(this.myProjectsFilterItems[0]);
    this.myProjectsService.myProjectsFilterItem.set(this.myProjectsFilterItems[0]);
    this.selectedTab.set('all');
    this.loadAllProjects();
  }

  async togglePin(tabId: string) {
    try {
      this.loadingPin.set(true);
      const newPinnedTab = this.pinnedTab() === tabId ? 'all' : tabId;
      const pinValue = newPinnedTab === 'all' ? { all: true, self: false } : { all: false, self: true };

      await this.api.PATCH_Configuration(this.tableId, 'tab', pinValue);
      this.pinnedTab.set(newPinnedTab);

      if (newPinnedTab === 'all') {
        this.myProjectsFilterItem.set(this.myProjectsFilterItems[0]);
        this.myProjectsService.myProjectsFilterItem.set(this.myProjectsFilterItems[0]);
        this.selectedTab.set('all');
        this.allProjectsFirst.set(0);
      } else {
        this.myProjectsFilterItem.set(this.myProjectsFilterItems[1]);
        this.myProjectsService.myProjectsFilterItem.set(this.myProjectsFilterItems[1]);
        this.selectedTab.set('my');
        this.myProjectsFirst.set(0);
      }

      this.refreshProjectsWithCurrentContext();

      setTimeout(() => {
        this.myProjectsService.cleanMultiselects();
      }, 0);
    } catch (error) {
      console.error('Error updating pinned tab:', error);
    } finally {
      this.actions.showToast({
        severity: 'success',
        summary: 'Projects',
        detail: `${tabId === 'all' ? 'All Projects' : 'My Projects'} tab pinned successfully`
      });
      this.loadingPin.set(false);
      void this.loadPinnedTabPreference();
    }
  }

  isPinned(tabId: string): boolean {
    return this.pinnedTab() === tabId;
  }

  onActiveItemChange = (event: MenuItem): void => {
    if (this.isTableView()) {
      const top = this.readActiveTabScrollTop();
      const prevId = this.myProjectsFilterItem()?.id;
      if (prevId === 'my') {
        this.tableScrollTopMy = top;
      } else if (prevId === 'all') {
        this.tableScrollTopAll = top;
      }
    }
    this.pendingScrollRestore.set(null);

    this.myProjectsFilterItem.set(event);
    this.myProjectsService.myProjectsFilterItem.set(event);

    this.myProjectsService.resetFilters();
    this._searchValue.set('');

    if (event.id === 'my') {
      this.tableScrollTopMy = 0;
      this.myProjectsFirst.set(0);
      this.selectedTab.set('my');
      this.loadMyProjects();
    } else {
      this.tableScrollTopAll = 0;
      this.allProjectsFirst.set(0);
      this.selectedTab.set('all');
      this.loadAllProjects();
    }
  };

  loadMyProjects() {
    const params: Record<string, unknown> = { 'current-user': true, page: 1, limit: this.myProjectsRows() };
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    if (tableField) {
      const apiField = this.mapTableFieldToApiField(tableField);
      params['order-field'] = apiField;
      params['direction'] = sortOrder === 1 ? 'ASC' : 'DESC';
    }
    this.myProjectsService.main(params);
  }

  loadAllProjects() {
    const params: Record<string, unknown> = { 'current-user': false, page: 1, limit: this.allProjectsRows() };
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    if (tableField) {
      const apiField = this.mapTableFieldToApiField(tableField);
      params['order-field'] = apiField;
      params['direction'] = sortOrder === 1 ? 'ASC' : 'DESC';
    }
    this.myProjectsService.main(params);
  }

  onPinIconClick(tabId: string, event: Event) {
    event.stopPropagation();
    this.togglePin(tabId);
  }

  setSearchInputFilter(query: string) {
    this._isQuerySentToBackend.set(query.length > 0);

    if (this.myProjectsFilterItem()?.id === 'my') {
      this._searchValue.set(query);
      this.myProjectsFirst.set(0);
    } else {
      this.myProjectsService.searchInput.set(query);
      this.allProjectsFirst.set(0);
    }

    const limit = this.getCurrentLimit();
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    const apiField = tableField ? this.mapTableFieldToApiField(tableField) : undefined;

    this.myProjectsService.applyFilters({
      page: 1, // Reset to first page when searching
      limit,
      sortField: apiField,
      sortOrder,
      query: query || undefined
    });
  }

  showFiltersSidebar() {
    this.myProjectsService.showFilterSidebar();
  }

  handleRemoveFilter(label: string, id?: string | number): void {
    this.myProjectsService.removeFilter(label, id);

    const currentQuery = this.myProjectsFilterItem()?.id === 'my' ? this._searchValue() : this.myProjectsService.searchInput();

    const page = this.getCurrentPage();
    const limit = this.getCurrentLimit();
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    const apiField = tableField ? this.mapTableFieldToApiField(tableField) : undefined;

    this.myProjectsService.applyFilters({
      page,
      limit,
      sortField: apiField,
      sortOrder,
      query: currentQuery || undefined
    });
  }

  handleClearFilters() {
    this._searchValue.set('');
    this.myProjectsService.searchInput.set('');
    this._isQuerySentToBackend.set(false);
    this.myProjectsService.resetFilters();
    // Reload with current pagination after clearing
    if (this.myProjectsFilterItem()?.id === 'my') {
      this.myProjectsFirst.set(0);
      this.loadMyProjectsWithPagination();
    } else {
      this.allProjectsFirst.set(0);
      this.loadAllProjectsWithPagination();
    }
  }

  showConfigurationsSidebar() {
    // Implementation for configurations sidebar
  }

  toggleTableView() {
    const tab = this.myProjectsFilterItem()?.id === 'my' ? 'my' : 'all';
    const top = tab === 'my' ? this.tableScrollTopMy : this.tableScrollTopAll;
    this.isTableView.set(true);
    if (top > 0) {
      this.pendingScrollRestore.set({ top });
    }
  }

  toggleCardView() {
    if (this.isTableView()) {
      const top = this.readActiveTabScrollTop();
      const tab = this.myProjectsFilterItem()?.id === 'my' ? 'my' : 'all';
      if (tab === 'my') {
        this.tableScrollTopMy = top;
      } else {
        this.tableScrollTopAll = top;
      }
    }
    this.isTableView.set(false);
  }

  openProject(project: FindContracts) {
    const route = this.projectDetailRoute(project.agreement_id);
    if (route) {
      void this.router.navigate(route);
    }
  }

  projectDetailRoute(agreementId?: string | null): string[] | null {
    if (!agreementId) {
      return null;
    }
    return ['/project-detail', agreementId, 'project-dashboard'];
  }

  getStatusColor(result: Result): string {
    const status = result.result_status?.name?.toLowerCase();
    switch (status) {
      case 'submitted':
        return '#1689CA';
      case 'accepted':
        return '#7CB580';
      case 'editing':
        return '#F58220';
      default:
        return '#8D9299';
    }
  }

  openResult(result: Result) {
    const resultCode = `${result.platform_code}-${result.result_official_code}`;
    this.router.navigate(['/result', resultCode]);
  }

  openResultByYear(result: Result, year: string | number) {
    const resultCode = `${result.platform_code}-${result.result_official_code}`;
    this.router.navigate(['/result', resultCode, year]);
  }

  getScrollHeight() {
    return this.cache.hasSmallScreen() ? 'calc(100vh - 410px)' : 'calc(100vh - 440px)';
  }

  getLoadingState(): boolean {
    return this.myProjectsService.loading();
  }

  getCurrentProjects(): FindContracts[] {
    return this.filteredProjects();
  }

  getCurrentFirst(): number {
    return this.myProjectsFilterItem()?.id === 'my' ? this.myProjectsFirst() : this.allProjectsFirst();
  }

  getCurrentRows(): number {
    return this.myProjectsFilterItem()?.id === 'my' ? this.myProjectsRows() : this.allProjectsRows();
  }

  onCurrentPageChange(event: PaginatorState): void {
    this.onPageChange(event);
  }

  private mapTableFieldToApiField(tableField: string): string {
    const fieldMapping: Record<string, string> = {
      agreement_id: 'contract-code',
      description: 'project-name',
      contract_status: 'status',
      display_principal_investigator: 'principal-investigator',
      display_lever_name: 'lever',
      count_results: 'count-results',
      lead_center: 'lead-center',
      start_date: 'start-date',
      end_date: 'end-date',
      is_pool_funding_contributor: 'pool-funding-contributor',
      funding_type: 'funding-type'
    };
    return fieldMapping[tableField] || tableField;
  }

  onPoolFundingOnlyChange(value: boolean): void {
    this.myProjectsService.tableFilters.update(f => ({ ...f, poolFundingOnly: !!value }));
  }

  onSort(event: { field: string; order: number }): void {
    this.sortField.set(event.field);
    this.sortOrder.set(event.order);

    if (this.myProjectsFilterItem()?.id === 'my') {
      this.myProjectsFirst.set(0);
    } else {
      this.allProjectsFirst.set(0);
    }
    this.refreshProjectsWithCurrentContext();
  }

  applyFilters(): void {
    const page = this.getCurrentPage();
    const limit = this.getCurrentLimit();
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    const apiField = tableField ? this.mapTableFieldToApiField(tableField) : undefined;

    // Get current search query to preserve it when applying filters
    const currentQuery = this.myProjectsFilterItem()?.id === 'my' ? this._searchValue() : this.myProjectsService.searchInput();

    if (currentQuery) {
      this._isQuerySentToBackend.set(true);
    }

    this.myProjectsService.applyFilters({
      page,
      limit,
      sortField: apiField,
      sortOrder,
      query: currentQuery || undefined
    });
  }

  private getCurrentPage(): number {
    const first = this.myProjectsFilterItem()?.id === 'my' ? this.myProjectsFirst() : this.allProjectsFirst();
    const rows = this.myProjectsFilterItem()?.id === 'my' ? this.myProjectsRows() : this.allProjectsRows();
    return Math.floor((first ?? 0) / (rows || 1)) + 1;
  }

  private getCurrentLimit(): number {
    return this.myProjectsFilterItem()?.id === 'my' ? this.myProjectsRows() : this.allProjectsRows();
  }

  /**
   * After page/rows/sort change: reload via applyFilters when sidebar filters or backend search are active,
   * otherwise use main() with pagination only (load*WithPagination).
   */
  private refreshProjectsWithCurrentContext(): void {
    const currentQuery = this.myProjectsFilterItem()?.id === 'my' ? this._searchValue() : this.myProjectsService.searchInput();
    const page = this.getCurrentPage();
    const limit = this.getCurrentLimit();
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    const apiField = tableField ? this.mapTableFieldToApiField(tableField) : undefined;

    if (this.myProjectsService.hasFilters() || !!currentQuery) {
      this.myProjectsService.applyFilters({
        page,
        limit,
        sortField: apiField,
        sortOrder,
        query: currentQuery || undefined
      });
      return;
    }

    if (this.myProjectsFilterItem()?.id === 'my') {
      this.loadMyProjectsWithPagination();
    } else {
      this.loadAllProjectsWithPagination();
    }
  }

  private loadMyProjectsWithPagination(query?: string) {
    const firstRaw = this.myProjectsFirst();
    let first: number;
    if (firstRaw == null) {
      first = 0;
    } else {
      first = firstRaw;
    }
    const rowsPerPage = this.myProjectsRows();
    let divisor: number;
    if (rowsPerPage <= 0) {
      divisor = 1;
    } else {
      divisor = rowsPerPage;
    }
    const page = Math.floor(first / divisor) + 1;
    const params: Record<string, unknown> = { 'current-user': true, page, limit: this.myProjectsRows() };
    if (query) {
      params['query'] = query;
    }
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    if (tableField) {
      const apiField = this.mapTableFieldToApiField(tableField);
      params['order-field'] = apiField;
      params['direction'] = sortOrder === 1 ? 'ASC' : 'DESC';
    }
    this.myProjectsService.main(params);
  }

  private loadAllProjectsWithPagination(query?: string) {
    const firstRaw = this.allProjectsFirst();
    let first: number;
    if (firstRaw == null) {
      first = 0;
    } else {
      first = firstRaw;
    }
    const rowsPerPage = this.allProjectsRows();
    let divisor: number;
    if (rowsPerPage <= 0) {
      divisor = 1;
    } else {
      divisor = rowsPerPage;
    }
    const page = Math.floor(first / divisor) + 1;
    const params: Record<string, unknown> = { 'current-user': false, page, limit: this.allProjectsRows() };
    if (query) {
      params['query'] = query;
    }
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    if (tableField) {
      const apiField = this.mapTableFieldToApiField(tableField);
      params['order-field'] = apiField;
      params['direction'] = sortOrder === 1 ? 'ASC' : 'DESC';
    }
    this.myProjectsService.main(params);
  }

  private restoreViewState(): boolean {
    const rawState = globalThis.sessionStorage?.getItem(this.viewStateKey);
    if (!rawState) {
      return false;
    }

    try {
      const state = JSON.parse(rawState) as Partial<{
        allProjectsFirst: number;
        allProjectsRows: number;
        myProjectsFirst: number;
        myProjectsRows: number;
        searchValue: string;
        isQuerySentToBackend: boolean;
        isTableView: boolean;
        sortField: string;
        sortOrder: number;
        selectedTab: string;
        tableScrollTopMy: number;
        tableScrollTopAll: number;
      }>;

      this.allProjectsFirst.set(state.allProjectsFirst ?? 0);
      this.allProjectsRows.set(state.allProjectsRows ?? 10);
      this.myProjectsFirst.set(state.myProjectsFirst ?? 0);
      this.myProjectsRows.set(state.myProjectsRows ?? 10);
      this._searchValue.set(state.searchValue ?? '');
      this._isQuerySentToBackend.set(state.isQuerySentToBackend ?? false);
      this.isTableView.set(state.isTableView ?? true);
      this.sortField.set(state.sortField ?? 'agreement_id');
      this.sortOrder.set(state.sortOrder ?? -1);
      this.selectedTab.set(state.selectedTab === 'my' ? 'my' : 'all');
      this.tableScrollTopMy = Number(state.tableScrollTopMy ?? 0);
      this.tableScrollTopAll = Number(state.tableScrollTopAll ?? 0);

      return true;
    } catch (error) {
      console.warn('Error restoring persisted my-projects component state:', error);
      globalThis.sessionStorage?.removeItem(this.viewStateKey);
      return false;
    }
  }

  private getTableScrollContainer(): HTMLElement | null {
    const host = this.tableRppScope?.nativeElement;
    if (!host) {
      return null;
    }
    const el = host.querySelector('.p-datatable-table-container');
    return el instanceof HTMLElement ? el : null;
  }

  private readActiveTabScrollTop(): number {
    return this.getTableScrollContainer()?.scrollTop ?? 0;
  }

  private readStoredScrollPair(): { my: number; all: number } {
    try {
      const raw = globalThis.sessionStorage?.getItem(this.viewStateKey);
      if (!raw) {
        return { my: 0, all: 0 };
      }
      const p = JSON.parse(raw) as Record<string, unknown>;
      return {
        my: Number(p['tableScrollTopMy'] ?? 0),
        all: Number(p['tableScrollTopAll'] ?? 0)
      };
    } catch {
      return { my: 0, all: 0 };
    }
  }

  private mergeScrollPositionsForPersist(): { scrollMy: number; scrollAll: number } {
    const existing = this.readStoredScrollPair();
    const tab = this.myProjectsFilterItem()?.id === 'my' ? 'my' : 'all';
    const container = this.getTableScrollContainer();
    let scrollMy: number;
    let scrollAll: number;
    if (container) {
      const currentScroll = container.scrollTop;
      if (tab === 'my') {
        scrollMy = currentScroll;
        scrollAll = existing.all;
      } else {
        scrollMy = existing.my;
        scrollAll = currentScroll;
      }
    } else {
      scrollMy = existing.my;
      scrollAll = existing.all;
    }
    this.tableScrollTopMy = scrollMy;
    this.tableScrollTopAll = scrollAll;
    return { scrollMy, scrollAll };
  }

  private persistViewStateSnapshot(): void {
    const { scrollMy, scrollAll } = this.mergeScrollPositionsForPersist();
    globalThis.sessionStorage?.setItem(
      this.viewStateKey,
      JSON.stringify({
        allProjectsFirst: this.allProjectsFirst(),
        allProjectsRows: this.allProjectsRows(),
        myProjectsFirst: this.myProjectsFirst(),
        myProjectsRows: this.myProjectsRows(),
        searchValue: this._searchValue(),
        isQuerySentToBackend: this._isQuerySentToBackend(),
        isTableView: this.isTableView(),
        sortField: this.sortField(),
        sortOrder: this.sortOrder(),
        selectedTab: this.selectedTab(),
        tableScrollTopMy: scrollMy,
        tableScrollTopAll: scrollAll
      })
    );
  }

  private updatePendingScrollFromStoredTabScroll(): void {
    if (!this.isTableView()) {
      this.pendingScrollRestore.set(null);
      return;
    }
    const tab = this.myProjectsFilterItem()?.id === 'my' ? 'my' : 'all';
    const top = tab === 'my' ? this.tableScrollTopMy : this.tableScrollTopAll;
    this.pendingScrollRestore.set(top > 0 ? { top } : null);
  }

  private scheduleTableScrollRestore(top: number): void {
    this.pendingScrollRestore.set(null);
    let attempts = 0;
    const run = (): void => {
      const el = this.getTableScrollContainer();
      if (el) {
        el.scrollTop = top;
        return;
      }
      if (attempts++ < 40) {
        requestAnimationFrame(run);
      }
    };
    requestAnimationFrame(run);
  }

  private loadCurrentTabState(): void {
    const activeTab = this.myProjectsService.myProjectsFilterItem()?.id === 'my' ? 'my' : 'all';
    const currentQuery = activeTab === 'my' ? this._searchValue() : this.myProjectsService.searchInput();
    const page = this.getCurrentPage();
    const limit = this.getCurrentLimit();
    const tableField = this.sortField();
    const sortOrder = this.sortOrder();
    const apiField = tableField ? this.mapTableFieldToApiField(tableField) : undefined;

    if (this.myProjectsService.hasFilters() || currentQuery) {
      this._isQuerySentToBackend.set(!!currentQuery);
      this.myProjectsService.applyFilters({
        page,
        limit,
        sortField: apiField,
        sortOrder,
        query: currentQuery || undefined
      });
      return;
    }

    if (activeTab === 'my') {
      this.loadMyProjectsWithPagination(currentQuery || undefined);
      return;
    }

    this.loadAllProjectsWithPagination(currentQuery || undefined);
  }
}

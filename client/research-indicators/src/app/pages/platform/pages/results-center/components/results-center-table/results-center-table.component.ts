import { Component, inject, ViewChild, signal, AfterViewInit, OnDestroy, computed, HostListener, Input } from '@angular/core';
import { RESULT_ENTRY_SOURCE_QUERY, RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER } from '@shared/constants/result-entry-source';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ResultsCenterService } from '../../results-center.service';
import { Router, RouterLink } from '@angular/router';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { CustomTagComponent } from '../../../../../../shared/components/custom-tag/custom-tag.component';
import { PopoverModule } from 'primeng/popover';
import { Result } from '@shared/interfaces/result/result.interface';
import { FiltersActionButtonsComponent } from '../../../../../../shared/components/filters-action-buttons/filters-action-buttons.component';
import { SearchExportControlsComponent } from '../../../../../../shared/components/search-export-controls/search-export-controls.component';
import { CustomProgressBarComponent } from '../../../../../../shared/components/custom-progress-bar/custom-progress-bar.component';
import { ProjectPlatformFiltersComponent } from '@shared/components/project-platform-filters/project-platform-filters.component';
import { PlatformSourceFilter } from '@shared/interfaces/platform-source-filter.interface';
import { PLATFORM_COLOR_MAP } from '../../../../../../shared/constants/platform-colors';
import { PLATFORM_CODES } from '../../../../../../shared/constants/platform-codes';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { TooltipModule } from 'primeng/tooltip';
import { openPublicLink } from '@shared/utils/public-link.util';
import {
  getStarReportViewerUrl,
  isStarInnDevPdfTemporarilyDisabled,
  isStarPdfReportEligible,
  openStarPdfReportInNewTab
} from '@shared/utils/star-pdf-report.util';
@Component({
  selector: 'app-results-center-table',
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    PopoverModule,
    InputTextModule,
    TagModule,
    MenuModule,
    RouterLink,
    TooltipModule,
    CustomTagComponent,
    FiltersActionButtonsComponent,
    SearchExportControlsComponent,
    CustomProgressBarComponent,
    ProjectPlatformFiltersComponent
  ],
  templateUrl: './results-center-table.component.html',
  styleUrl: './results-center-table.component.scss'
})
export class ResultsCenterTableComponent implements AfterViewInit, OnDestroy {
  readonly statusTagMaxWidth = '140px';
  readonly isExporting = signal(false);
  readonly openPublicLink = openPublicLink;

  resultsCenterService = inject(ResultsCenterService);
  private readonly router = inject(Router);
  private readonly cacheService = inject(CacheService);
  private readonly allModalsService = inject(AllModalsService);
  private readonly createResultManagementService = inject(CreateResultManagementService);
  private readonly apiService = inject(ApiService);

  @Input() showNewProjectResultButton = false;
  @Input() hideFiltersToolbar = false;
  @Input() excludedColumnFields: readonly string[] = [];
  @Input() emptyMessage = '';
  @Input() resultEntryContext: 'results-center' | 'project' = 'project';
  @Input() roundedBottom = false;
  private dt2Table: Table | undefined;

  @ViewChild('dt2')
  set dt2(table: Table | undefined) {
    this.dt2Table = table;
    if (table) {
      this.tableRef.set(table);
      this.resultsCenterService.tableRef.set(table);
    } else {
      this.tableRef.set(undefined);
      this.resultsCenterService.tableRef.set(undefined);
    }
  }

  get dt2(): Table | undefined {
    return this.dt2Table;
  }

  tableRef = signal<Table | undefined>(undefined);
  private lastClickedElement: Element | null = null;
  private removeDocumentClickListener: (() => void) | null = null;

  menuItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil' },
    { label: 'Delete', icon: 'pi pi-trash' },
    { label: 'Export', icon: 'pi pi-download' }
  ];

  ngOnDestroy(): void {
    this.removeDocumentClickListener?.();
  }

  setSearchInputFilter(query: string) {
    this.resultsCenterService.resultsTablePaginatorFirst.set(0);
    this.resultsCenterService.searchInput.set(query);
    void this.resultsCenterService.main();
  }

  getScrollHeight = computed(
    () =>
      `calc(100vh - ${this.cacheService.headerHeight() + this.cacheService.navbarHeight() + this.cacheService.tableFiltersSidebarHeight() + (this.cacheService.hasSmallScreen() ? 280 : 350)}px)`
  );

  getActiveFiltersExcludingIndicatorTab = computed(() => {
    const activeFilters = this.resultsCenterService.getActiveFilters();
    return activeFilters.filter(filter => filter.label !== 'INDICATOR TAB');
  });

  shouldShowFilterMessage = computed(() => {
    const activeFilters = this.resultsCenterService.getActiveFilters();
    const filtersExcludingIndicatorTab = activeFilters.filter(filter => filter.label !== 'INDICATOR TAB');
    return filtersExcludingIndicatorTab.length > 0;
  });

  getFilterDisplayText(filter: { label: string; value: string; id?: string | number }): string {
    if (filter.label === 'PROJECT') {
      return `Project: ${filter.value}`;
    }
    return filter.value || filter.label;
  }

  getPrimaryContractId(result: Result): string | null {
    if (!result.result_contracts) return null;
    const contracts = Array.isArray(result.result_contracts) ? result.result_contracts : [result.result_contracts];
    const primaryContract = contracts.find((contract: { is_primary?: number | string; contract_id?: string }) => Number(contract.is_primary) === 1);
    return primaryContract?.contract_id ?? null;
  }

  getVisibleColumns() {
    let columns = this.resultsCenterService.tableColumns();
    if (this.showNewProjectResultButton) {
      columns = columns.filter(column => column.field !== 'project' && column.field !== 'lever');
    }
    if (this.excludedColumnFields.length) {
      const excluded = new Set(this.excludedColumnFields);
      columns = columns.filter(column => !excluded.has(column.field));
    }
    return columns;
  }

  shouldShowPaginator(): boolean {
    return !(this.hideFiltersToolbar && this.resultsCenterService.resultsTableTotalRecords() === 0);
  }

  getPlatformColors(platformCode: string): { text: string; background: string } | undefined {
    return PLATFORM_COLOR_MAP[platformCode];
  }

  formatResultCode(code: string | number): string {
    if (!code) return String(code || '');
    return String(code).padStart(3, '0');
  }

  private buildResultsCenterExportFileName(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyymmdd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const hhmm = `${pad(date.getHours())}${pad(date.getMinutes())}`;
    const user = this.cacheService.dataCache().user;
    const firstInitial = user.first_name?.trim()?.charAt(0)?.toUpperCase() ?? '';
    const lastInitial = user.last_name?.trim()?.charAt(0)?.toUpperCase() ?? '';
    const initials = `${firstInitial}${lastInitial}` || 'UU';
    return `STAR_results_metadata_${yyyymmdd}_${hhmm}_${initials}.xlsx`;
  }

  async exportTable() {
    if (this.isExporting()) {
      return;
    }
    this.isExporting.set(true);
    try {
      const blob = await this.apiService.GET_ResultCenterXlsx(
        this.resultsCenterService.getExportResultFilter(),
        this.resultsCenterService.getExportPaginationOptions()
      );

      if (!blob?.size) {
        console.error('Downloaded file is empty or invalid');
        return;
      }

      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.buildResultsCenterExportFileName(new Date());
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        globalThis.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error exporting file:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    } finally {
      this.isExporting.set(false);
    }
  }

  openStarPdfReport(result: Result): void {
    if (this.isStarPdfReportDisabled(result)) return;
    openStarPdfReportInNewTab(this.getStarReportViewerUrl(result));
  }

  showStarPdfReport(result: Result): boolean {
    return isStarPdfReportEligible(result);
  }

  isStarPdfReportDisabled(result: Result): boolean {
    return isStarInnDevPdfTemporarilyDisabled(result.indicator_id);
  }

  getStarReportViewerUrl(result: Result): string {
    return getStarReportViewerUrl(result, { includeVersion: false });
  }

  showFiltersSidebar() {
    this.resultsCenterService.showFiltersSidebar.set(true);
  }

  showConfiguratiosnSidebar() {
    this.resultsCenterService.showConfigurationsSidebar.set(true);
  }

  onPlatformClick(platform: PlatformSourceFilter): void {
    const selectedSources = this.resultsCenterService.tableFilters().sources ?? [];
    const isAlreadySelected =
      selectedSources.length === 1 && selectedSources[0]?.platform_code === platform.platform_code;

    this.resultsCenterService.tableFilters.update(prev => ({
      ...prev,
      sources: isAlreadySelected ? [] : [{ platform_code: platform.platform_code, name: platform.name }]
    }));

    this.resultsCenterService.applyFilters();
  }

  openCreateResultForProject() {
    const contractId = this.resultsCenterService.primaryContractId();
    if (!contractId) {
      return;
    }
    this.createResultManagementService.setContractId(contractId);
    this.createResultManagementService.setPresetFromProjectResultsTable(true);
    this.createResultManagementService.setResultCreationEntryContext(this.resultEntryContext === 'results-center' ? 'results-center' : 'project');
    this.allModalsService.openModal('createResult');
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast' | null | undefined {
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast' | null | undefined> = {
      SUBMITTED: 'info',
      ACCEPTED: 'success',
      EDITING: 'warn'
    };
    return severityMap[status];
  }

  onTableRowClick(event: MouseEvent, result: Result): void {
    const target = event.target as Element | null;
    if (target?.closest('[data-public-link-action]')) {
      return;
    }
    this.openResult(result);
  }

  openResult(result: Result) {
    if (
      result.platform_code === PLATFORM_CODES.PRMS ||
      result.platform_code === PLATFORM_CODES.TIP ||
      result.platform_code === PLATFORM_CODES.AICCRA
    ) {
      this.allModalsService.selectedResultForInfo.set(result);
      this.applyResultInformationModalContext();
      this.allModalsService.openModal('resultInformation');
      return;
    }
    this.closeResultInformationModal();
    const resultCode = `${result.platform_code}-${result.result_official_code}`;
    if (result.result_status?.result_status_id === 6 && Array.isArray(result.snapshot_years) && result.snapshot_years.length > 0) {
      const latestYear = Math.max(...result.snapshot_years);
      this.router.navigate(['/result', resultCode, 'general-information'], {
        queryParams: this.resultEntryQueryParamsForNavigation({ version: latestYear })
      });
    } else {
      this.router.navigate(['/result', resultCode], { queryParams: this.resultEntryQueryParamsForNavigation() });
    }
  }

  openResultByYear(result: number, year: string | number, platformCode: string) {
    if (platformCode === PLATFORM_CODES.PRMS || platformCode === PLATFORM_CODES.AICCRA || platformCode === PLATFORM_CODES.TIP) {
      return;
    }
    this.closeResultInformationModal();
    const resultCode = `${platformCode}-${result}`;
    this.router.navigate(['/result', resultCode], {
      queryParams: this.resultEntryQueryParamsForNavigation({ version: year })
    });
  }

  getResultHref(result: Result): string {
    if (
      result.platform_code === PLATFORM_CODES.PRMS ||
      result.platform_code === PLATFORM_CODES.AICCRA ||
      result.platform_code === PLATFORM_CODES.TIP
    ) {
      this.onResultLinkClick(result);
      return '';
    }
    const resultCode = `${result.platform_code}-${result.result_official_code}`;
    if (result.result_status?.result_status_id === 6 && Array.isArray(result.snapshot_years) && result.snapshot_years.length > 0) {
      const latestYear = Math.max(...result.snapshot_years);
      return this.router
        .createUrlTree(['/result', resultCode, 'general-information'], {
          queryParams: this.resultEntryQueryParamsForNavigation({ version: latestYear })
        })
        .toString();
    }
    return this.router.createUrlTree(['/result', resultCode], { queryParams: this.resultEntryQueryParamsForNavigation() }).toString();
  }

  getResultRouteArray(result: Result): string | string[] {
    if (
      result.platform_code === PLATFORM_CODES.TIP ||
      result.platform_code === PLATFORM_CODES.PRMS ||
      result.platform_code === PLATFORM_CODES.AICCRA
    ) {
      return [];
    }
    const resultCode = `${result.platform_code}-${result.result_official_code}`;
    if (result.result_status?.result_status_id === 6 && Array.isArray(result.snapshot_years) && result.snapshot_years.length > 0) {
      return ['/result', resultCode, 'general-information'];
    }
    return ['/result', resultCode];
  }

  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent) {
    const target = event.target as Element;
    this.processRowClick(target, event);
  }

  getResultQueryParams(result: Result): Record<string, string | number> {
    if (result.result_status?.result_status_id === 6 && Array.isArray(result.snapshot_years) && result.snapshot_years.length > 0) {
      const latestYear = Math.max(...result.snapshot_years);
      return this.resultEntryQueryParamsForNavigation({ version: latestYear });
    }
    return this.resultEntryQueryParamsForNavigation();
  }

  onResultLinkClick(result: Result): void {
    if (
      result.platform_code === PLATFORM_CODES.TIP ||
      result.platform_code === PLATFORM_CODES.PRMS ||
      result.platform_code === PLATFORM_CODES.AICCRA
    ) {
      this.allModalsService.selectedResultForInfo.set(result);
      this.applyResultInformationModalContext();
      this.allModalsService.openModal('resultInformation');
    }
  }

  ngAfterViewInit() {
    const onDocClickCapture = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      this.processRowClick(target, event);
    };

    document.addEventListener('click', onDocClickCapture, { capture: true });
    this.removeDocumentClickListener = () => document.removeEventListener('click', onDocClickCapture, { capture: true });
  }

  private processRowClick(target: Element, event: MouseEvent) {
    if (this.allModalsService.isAnyModalOpen()) {
      return;
    }

    if (!this.dt2?.el?.nativeElement) {
      return;
    }
    const tableElement = this.dt2.el.nativeElement;
    if (!tableElement.contains(target)) {
      return;
    }

    this.lastClickedElement = target;

    if (
      target.closest('.p-calendar') ||
      target.closest('.p-datepicker') ||
      target.closest('.p-calendar-panel') ||
      target.closest('.p-datepicker-panel') ||
      target.closest('[class*="p-calendar"]') ||
      target.closest('[class*="p-datepicker"]')
    ) {
      return;
    }

    if (target.closest('thead') || target.closest('th') || target.tagName.toLowerCase() === 'th') {
      return;
    }

    if (target.closest('[data-public-link-action]')) {
      return;
    }

    const rowEl = target.closest('tr');
    if (!rowEl) return;

    const tbody = rowEl.parentElement;
    if (tbody?.tagName.toLowerCase() !== 'tbody') return;

    const resultId = rowEl.dataset['resultId'];
    const platformCode = rowEl.dataset['platform'];

    if (!resultId || !platformCode) {
      const rows = Array.from(tbody.children).filter(el => el.tagName.toLowerCase() === 'tr');
      const rowIndex = rows.indexOf(rowEl);
      if (rowIndex < 0) return;
      const data: Result[] = (this.dt2.value as Result[] | undefined) ?? this.resultsCenterService.list();
      const pageStart: number = this.dt2.first || 0;
      const idx = pageStart + rowIndex;
      const result = data[idx];

      if (!result) {
        return;
      }

      this.handleRowClickResult(result, target, event);
      return;
    }

    const data: Result[] = (this.dt2.value as Result[] | undefined) ?? this.resultsCenterService.list();
    const result = data.find(r => r.result_official_code?.toString() === resultId && r.platform_code === platformCode);

    if (!result) {
      return;
    }

    this.handleRowClickResult(result, target, event);
  }

  private handleRowClickResult(result: Result, target: Element, event: MouseEvent): void {
    if (result.platform_code === PLATFORM_CODES.STAR) {
      this.closeResultInformationModal();
      return;
    }

    if (target.closest('.project-cell') || target.closest('.project-link') || target.classList.contains('project-link')) {
      if (result.result_contracts?.contract_id) {
        event.preventDefault();
        event.stopPropagation();
        this.router.navigate(['/project-detail', result.result_contracts.contract_id], {
          queryParams: this.resultEntryQueryParamsForNavigation()
        });
      }
      return;
    }

    if (
      result.platform_code !== PLATFORM_CODES.PRMS &&
      result.platform_code !== PLATFORM_CODES.TIP &&
      result.platform_code !== PLATFORM_CODES.AICCRA &&
      target.closest('a[routerLink], span[routerLink], [ng-reflect-router-link]')
    ) {
      return;
    }

    if (
      result.platform_code === PLATFORM_CODES.PRMS ||
      result.platform_code === PLATFORM_CODES.TIP ||
      result.platform_code === PLATFORM_CODES.AICCRA
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.allModalsService.selectedResultForInfo.set(result);
      this.applyResultInformationModalContext();
      this.allModalsService.openModal('resultInformation');
    }
  }

  /** Used by the template for project-detail links when the table is embedded in Results Center vs project context. */
  resultEntryQueryParamsForNavigation(extra: Record<string, string | number> = {}): Record<string, string | number> {
    const q: Record<string, string | number> = { ...extra };
    if (this.resultEntryContext === 'results-center') {
      q[RESULT_ENTRY_SOURCE_QUERY] = RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER;
    }
    return q;
  }

  private applyResultInformationModalContext(): void {
    this.allModalsService.setResultInformationEntryContext(this.resultEntryContext === 'results-center' ? 'results-center' : null);
  }

  private closeResultInformationModal(): void {
    if (this.allModalsService.isModalOpen('resultInformation').isOpen) {
      this.allModalsService.closeModal('resultInformation');
    } else {
      this.allModalsService.setResultInformationEntryContext(null);
    }
    this.allModalsService.selectedResultForInfo.set(null);
  }
}

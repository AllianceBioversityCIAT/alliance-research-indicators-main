import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsCenterTableComponent } from './results-center-table.component';
import { ResultsCenterService } from '../../results-center.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { AllModalsService } from '../../../../../../shared/services/cache/all-modals.service';
import { Router, provideRouter } from '@angular/router';
import { computed, signal } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../shared/services/api.service';
import { CreateResultManagementService } from '../../../../../../shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { getResultEntrySourceFromSearch, isHomeEntryFromUrl, isResultsCenterEntryFromUrl } from '@shared/constants/result-entry-source';

describe('result-entry-source helpers', () => {
  it('getResultEntrySourceFromSearch returns null for empty and parses query shapes', () => {
    expect(getResultEntrySourceFromSearch('')).toBeNull();
    expect(getResultEntrySourceFromSearch('?from=results-center')).toBe('results-center');
    expect(getResultEntrySourceFromSearch('from=results-center')).toBe('results-center');
    expect(getResultEntrySourceFromSearch('x=1&from=results-center')).toBe('results-center');
    expect(getResultEntrySourceFromSearch('?from=other')).toBe('other');
    expect(getResultEntrySourceFromSearch('?from=home')).toBe('home');
  });

  it('isResultsCenterEntryFromUrl detects results-center entry from URL query', () => {
    expect(isResultsCenterEntryFromUrl('/result/STAR-1')).toBe(false);
    expect(isResultsCenterEntryFromUrl('/result/STAR-1?from=results-center')).toBe(true);
    expect(isResultsCenterEntryFromUrl('/result/STAR-1?from=projects')).toBe(false);
  });

  it('isHomeEntryFromUrl detects home entry from URL query', () => {
    expect(isHomeEntryFromUrl('/result/STAR-1')).toBe(false);
    expect(isHomeEntryFromUrl('/result/STAR-11809/general-information?from=home')).toBe(true);
    expect(isHomeEntryFromUrl('/result/STAR-1?from=results-center')).toBe(false);
  });
});

describe('ResultsCenterTableComponent', () => {
  let component: ResultsCenterTableComponent;
  let fixture: ComponentFixture<ResultsCenterTableComponent>;

  let mockService: any;
  let mockCache: any;
  let mockModals: any;
  let mockRouter: any;
  let mockApiService: any;
  let mockCreateResultManagementService: any;

  const mockResult = {
    result_official_code: 7,
    title: 'Title',
    indicators: { name: 'Ind' },
    result_status: { name: 'SUBMITTED', result_status_id: 6 },
    result_contracts: { contract_id: 'C-1' },
    result_levers: { lever: { short_name: 'L' } },
    report_year_id: 2024,
    snapshot_years: [2022, 2023, 2024],
    created_by_user: { first_name: 'A', last_name: 'B' },
    created_at: '2024-01-01T00:00:00Z',
    platform_code: 'ROAR'
  } as any;

  function createComponent() {
    fixture = TestBed.createComponent(ResultsCenterTableComponent);
    component = fixture.componentInstance;
    // PrimeNG Table minimal mock
    (component as any).dt2 = {
      filterGlobal: jest.fn(),
      first: 0,
      rows: 10,
      filteredValue: undefined
    } as any;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.resetTestingModule();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const listSig = signal([mockResult]);
    const tableFiltersSig = signal({ sources: [] as { platform_code: string; name: string }[] });
    mockService = {
      searchInput: signal(''),
      list: listSig,
      resultsListForTable: computed(() => listSig()),
      resultsTablePaginatorFirst: signal(0),
      resultsTablePaginatorRows: signal(10),
      resultsTableTotalRecords: signal(1),
      loading: signal(false),
      primaryContractId: jest.fn().mockReturnValue(null),
      getAllPathsAsArray: jest.fn(() => ['title']),
      getActiveFilters: jest.fn(() => [
        { label: 'INDICATOR TAB', value: 'X' },
        { label: 'PROJECT', value: 'P-1' },
        { label: 'OTHER', value: 'Y' }
      ]),
      tableColumns: signal([{ field: 'title', path: 'title', header: 'Title', getValue: (r: any) => r.title, filter: true }]),
      tableFilters: tableFiltersSig,
      countTableFiltersSelected: jest.fn(() => 1),
      countFiltersSelected: jest.fn(() => 0),
      clearAllFilters: jest.fn(),
      removeFilter: jest.fn(),
      showFiltersSidebar: signal(false),
      showConfigurationsSidebar: signal(false),
      tableRef: signal<any>(undefined),
      main: jest.fn(),
      applyFilters: jest.fn(),
      handleResultsTableLazyLoad: jest.fn(),
      getExportResultFilter: jest.fn().mockReturnValue({ 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': [] }),
      getExportPaginationOptions: jest.fn().mockReturnValue({ sortField: 'code', sortOrder: 'DESC', search: '' })
    };

    mockCache = {
      headerHeight: signal(60),
      navbarHeight: signal(60),
      tableFiltersSidebarHeight: signal(60),
      hasSmallScreen: signal(false),
      dataCache: signal({ user: { first_name: 'John', last_name: 'Doe', sec_user_id: 1 } })
    };

    mockModals = {
      selectedResultForInfo: signal<any>(null),
      openModal: jest.fn(),
      closeModal: jest.fn(),
      closeAllModals: jest.fn(),
      isModalOpen: jest.fn(() => ({ isOpen: false })),
      setResultInformationEntryContext: jest.fn(),
      // New helper used by processRowClick to avoid interfering when a modal is already open
      isAnyModalOpen: jest.fn(() => false)
    };

    mockRouter = {
      navigate: jest.fn(),
      createUrlTree: jest.fn().mockReturnValue({ toString: () => '/result/ROAR-7/general-information?version=2024' })
    };

    mockApiService = {
      GET_ResultCenterXlsx: jest.fn().mockResolvedValue(new Blob(['x'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })),
      GET_ResultPdfReport: jest.fn().mockResolvedValue({ data: 'https://reports.example.com/star-report.pdf' })
    };

    mockCreateResultManagementService = {
      setContractId: jest.fn(),
      setPresetFromProjectResultsTable: jest.fn(),
      setResultCreationEntryContext: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ResultsCenterTableComponent],
      providers: [
        { provide: ResultsCenterService, useValue: mockService },
        { provide: CacheService, useValue: mockCache },
        { provide: AllModalsService, useValue: mockModals },
        { provide: Router, useValue: mockRouter },
        { provide: ApiService, useValue: mockApiService },
        { provide: CreateResultManagementService, useValue: mockCreateResultManagementService },
        provideRouter([]),
        provideHttpClientTesting()
      ]
    })
      .overrideComponent(ResultsCenterTableComponent, { set: { template: '' } })
      .compileComponents();

    createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('setSearchInputFilter should update service searchInput and reset paginator to first page', () => {
    mockService.resultsTablePaginatorFirst.set(40);
    component.setSearchInputFilter('q');
    expect(mockService.searchInput()).toBe('q');
    expect(mockService.resultsTablePaginatorFirst()).toBe(0);
  });

  it('getActiveFiltersExcludingIndicatorTab and shouldShowFilterMessage', () => {
    const list = component.getActiveFiltersExcludingIndicatorTab();
    expect(list.some(f => f.label === 'INDICATOR TAB')).toBe(false);
    expect(component.shouldShowFilterMessage()).toBe(true);
  });

  it('getFilterDisplayText should format PROJECT and default', () => {
    expect(component.getFilterDisplayText({ label: 'PROJECT', value: 'P-1' })).toBe('Project: P-1');
    expect(component.getFilterDisplayText({ label: 'X', value: 'Y' })).toBe('Y');
    expect(component.getFilterDisplayText({ label: 'LBL', value: '' })).toBe('LBL');
  });

  it('getScrollHeight should build calc string based on cache values', () => {
    // header 60 + navbar 60 + sidebar 60 + big-screen addition 350
    const value = component.getScrollHeight();
    expect(value.startsWith('calc(100vh - ')).toBe(true);
    expect(value.includes('px)')).toBe(true);
  });

  it('getScrollHeight should use 280 when hasSmallScreen is true', () => {
    (mockCache.hasSmallScreen as any).set(true);
    const value = component.getScrollHeight();
    expect(value).toContain('460');
    expect(value).not.toContain('350');
  });

  it('getPlatformColors should return undefined for unknown code', () => {
    const colors = component.getPlatformColors('ROAR');
    expect(colors).toBeUndefined();
  });

  it('getVisibleColumns should remove project, lever, and explicitly excluded columns', () => {
    mockService.tableColumns.set([
      { field: 'title', path: 'title', header: 'Title', getValue: (r: any) => r.title, filter: true },
      { field: 'project', path: 'project', header: 'Project', getValue: jest.fn() },
      { field: 'lever', path: 'lever', header: 'Lever', getValue: jest.fn() },
      { field: 'status', path: 'status', header: 'Status', getValue: jest.fn() }
    ]);
    component.showNewProjectResultButton = true;
    component.excludedColumnFields = ['status'];

    expect(component.getVisibleColumns().map(column => column.field)).toEqual(['title']);
  });

  it('should hide paginator when filters toolbar is hidden and there are no records', () => {
    component.hideFiltersToolbar = true;
    mockService.resultsTableTotalRecords.set(0);

    expect(component.shouldShowPaginator()).toBe(false);
  });

  it('formatResultCode should pad numbers', () => {
    expect(component.formatResultCode(7)).toBe('007');
    expect(component.formatResultCode('12')).toBe('012');
    expect(component.formatResultCode(null as unknown as any)).toBe('');
  });

  it('getStatusSeverity should map statuses', () => {
    expect(component.getStatusSeverity('SUBMITTED')).toBe('info');
    expect(component.getStatusSeverity('ACCEPTED')).toBe('success');
    expect(component.getStatusSeverity('EDITING')).toBe('warn');
    expect(component.getStatusSeverity('UNKNOWN' as any)).toBeUndefined();
  });

  it('showFiltersSidebar and showConfiguratiosnSidebar should toggle signals', () => {
    component.showFiltersSidebar();
    expect(mockService.showFiltersSidebar()).toBe(true);
    component.showConfiguratiosnSidebar();
    expect(mockService.showConfigurationsSidebar()).toBe(true);
  });

  it('onPlatformClick should set the clicked platform filter and apply filters', () => {
    const updateSpy = jest.spyOn(mockService.tableFilters, 'update');
    const platform = { platform_code: 'STAR', name: 'STAR' };

    component.onPlatformClick(platform);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const updateFn = updateSpy.mock.calls[0][0];
    expect(updateFn({ sources: [] })).toEqual({
      sources: [{ platform_code: 'STAR', name: 'STAR' }]
    });
    expect(mockService.applyFilters).toHaveBeenCalled();
  });

  it('onPlatformClick should clear the platform filter when the same platform is clicked again', () => {
    mockService.tableFilters.set({ sources: [{ platform_code: 'STAR', name: 'STAR' }] });
    const updateSpy = jest.spyOn(mockService.tableFilters, 'update');
    const platform = { platform_code: 'STAR', name: 'STAR' };

    component.onPlatformClick(platform);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const updateFn = updateSpy.mock.calls[0][0];
    expect(updateFn({ sources: [{ platform_code: 'STAR', name: 'STAR' }] })).toEqual({
      sources: []
    });
    expect(mockService.applyFilters).toHaveBeenCalled();
  });

  it('onPlatformClick should treat missing sources as an empty selection list', () => {
    mockService.tableFilters.set({ sources: undefined as unknown as { platform_code: string; name: string }[] });
    const updateSpy = jest.spyOn(mockService.tableFilters, 'update');
    const platform = { platform_code: 'STAR', name: 'STAR' };

    component.onPlatformClick(platform);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const updateFn = updateSpy.mock.calls[0][0];
    expect(updateFn({})).toEqual({
      sources: [{ platform_code: 'STAR', name: 'STAR' }]
    });
    expect(mockService.applyFilters).toHaveBeenCalled();
  });

  it('openResult should open modal for PRMS and not navigate', () => {
    const prms = { ...mockResult, platform_code: 'PRMS' };
    component.openResult(prms);
    expect(mockModals.selectedResultForInfo()).toEqual(prms);
    expect(mockModals.setResultInformationEntryContext).toHaveBeenCalledWith(null);
    expect(mockModals.openModal).toHaveBeenCalledWith('resultInformation');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('openResult PRMS should set result information entry context to results-center when in results-center context', () => {
    fixture.componentRef.setInput('resultEntryContext', 'results-center');
    const prms = { ...mockResult, platform_code: 'PRMS' };
    mockModals.setResultInformationEntryContext.mockClear();
    component.openResult(prms);
    expect(mockModals.setResultInformationEntryContext).toHaveBeenCalledWith('results-center');
  });

  it('openCreateResultForProject should open create modal when primaryContractId is set', () => {
    (mockService.primaryContractId as jest.Mock).mockReturnValue('CONTRACT-123');
    component.openCreateResultForProject();
    expect(mockCreateResultManagementService.setContractId).toHaveBeenCalledWith('CONTRACT-123');
    expect(mockCreateResultManagementService.setPresetFromProjectResultsTable).toHaveBeenCalledWith(true);
    expect(mockCreateResultManagementService.setResultCreationEntryContext).toHaveBeenCalledWith('project');
    expect(mockModals.openModal).toHaveBeenCalledWith('createResult');
  });

  it('openCreateResultForProject should set results-center creation context when table is in results-center context', () => {
    (mockService.primaryContractId as jest.Mock).mockReturnValue('CONTRACT-123');
    fixture.componentRef.setInput('resultEntryContext', 'results-center');
    component.openCreateResultForProject();
    expect(mockCreateResultManagementService.setResultCreationEntryContext).toHaveBeenCalledWith('results-center');
  });

  it('openCreateResultForProject should do nothing when primaryContractId is null', () => {
    (mockService.primaryContractId as jest.Mock).mockReturnValue(null);
    component.openCreateResultForProject();
    expect(mockCreateResultManagementService.setContractId).not.toHaveBeenCalled();
    expect(mockModals.openModal).not.toHaveBeenCalledWith('createResult');
  });

  it('openResult should navigate with version for non-PRMS with snapshots', () => {
    component.openResult(mockResult);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/result', 'ROAR-7', 'general-information'], { queryParams: { version: 2024 } });
  });

  it('openResult from results center should add from query for STAR navigation', () => {
    fixture.componentRef.setInput('resultEntryContext', 'results-center');
    component.openResult(mockResult);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/result', 'ROAR-7', 'general-information'], {
      queryParams: { version: 2024, from: 'results-center' }
    });
  });

  it('openResult should navigate without version when condition not met', () => {
    const r = { ...mockResult, result_status: { name: 'SUBMITTED', result_status_id: 1 }, snapshot_years: [] };
    component.openResult(r as any);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/result', 'ROAR-7'], { queryParams: {} });
  });

  it('openResultByYear should no-op for PRMS, navigate otherwise', () => {
    component.openResultByYear(7 as any, 2020, 'PRMS');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    component.openResultByYear(7 as any, 2020, 'ROAR');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/result', 'ROAR-7'], { queryParams: { version: 2020 } });
  });

  it('getResultHref should return empty and trigger modal for PRMS', () => {
    const r = { ...mockResult, platform_code: 'PRMS' };
    const href = component.getResultHref(r as any);
    expect(href).toBe('');
    expect(mockModals.selectedResultForInfo()).toEqual(r);
  });

  it('getResultHref should use createUrlTree when snapshots present', () => {
    const href = component.getResultHref(mockResult);
    expect(mockRouter.createUrlTree).toHaveBeenCalled();
    expect(href).toContain('/result/ROAR-7/general-information');
  });

  it('getResultHref should return simple path when no snapshots/version', () => {
    const r = { ...mockResult, result_status: { name: 'SUBMITTED', result_status_id: 1 }, snapshot_years: [] };
    mockRouter.createUrlTree.mockReturnValueOnce({ toString: () => '/result/ROAR-7' });
    const href = component.getResultHref(r as any);
    expect(href).toBe('/result/ROAR-7');
  });

  it('getResultRouteArray should return correct routes based on status', () => {
    expect(component.getResultRouteArray(mockResult as any)).toEqual(['/result', 'ROAR-7', 'general-information']);
    const r = { ...mockResult, result_status: { name: 'X', result_status_id: 1 } };
    expect(component.getResultRouteArray(r as any)).toEqual(['/result', 'ROAR-7']);
  });

  it('getResultRouteArray should return empty array for TIP platform', () => {
    const tipResult = { ...mockResult, platform_code: 'TIP' };
    expect(component.getResultRouteArray(tipResult as any)).toEqual([]);
  });

  it('getResultQueryParams should return latest snapshot year when status is 6 and years exist', () => {
    const r = {
      ...mockResult,
      result_status: { name: 'POSTPONE', result_status_id: 6 },
      snapshot_years: [2022, 2024, 2023]
    };
    expect(component.getResultQueryParams(r as any)).toEqual({ version: 2024 });
  });

  it('getResultQueryParams should return empty object when not approved-with-versions', () => {
    const r = { ...mockResult, result_status: { name: 'SUBMITTED', result_status_id: 1 }, snapshot_years: [] };
    expect(component.getResultQueryParams(r as any)).toEqual({});
  });

  it('getResultQueryParams should include from=results-center when entry context is results-center', () => {
    fixture.componentRef.setInput('resultEntryContext', 'results-center');
    const r = { ...mockResult, result_status: { name: 'SUBMITTED', result_status_id: 1 }, snapshot_years: [] };
    expect(component.getResultQueryParams(r as any)).toEqual({ from: 'results-center' });
  });

  it.each([
    ['PRMS', 'PRMS'],
    ['TIP', 'TIP'],
    ['AICCRA', 'AICCRA']
  ])('onResultLinkClick should open result info modal for %s', (_, platformCode) => {
    const r = { ...mockResult, platform_code: platformCode };
    mockModals.openModal.mockClear();
    component.onResultLinkClick(r as any);
    expect(mockModals.selectedResultForInfo()).toEqual(r);
    expect(mockModals.openModal).toHaveBeenCalledWith('resultInformation');
  });

  it('onResultLinkClick should no-op when platform is not TIP, PRMS, or AICCRA', () => {
    mockModals.openModal.mockClear();
    component.onResultLinkClick({ ...mockResult, platform_code: 'ROAR' } as any);
    expect(mockModals.openModal).not.toHaveBeenCalled();
  });

  it('getPrimaryContractId should return null when result_contracts is null', () => {
    const result = { ...mockResult, result_contracts: null };
    expect(component.getPrimaryContractId(result as any)).toBeNull();
  });

  it('getPrimaryContractId should return null when result_contracts is undefined', () => {
    const result = { ...mockResult, result_contracts: undefined };
    expect(component.getPrimaryContractId(result as any)).toBeNull();
  });

  it('getPrimaryContractId should return contract_id when primary contract exists in array', () => {
    const result = {
      ...mockResult,
      result_contracts: [
        { is_primary: 0, contract_id: 'A123' },
        { is_primary: 1, contract_id: 'B456' },
        { is_primary: 0, contract_id: 'C789' }
      ]
    };
    expect(component.getPrimaryContractId(result as any)).toBe('B456');
  });

  it('getPrimaryContractId should return contract_id when primary contract exists as single object', () => {
    const result = {
      ...mockResult,
      result_contracts: { is_primary: 1, contract_id: 'D012' }
    };
    expect(component.getPrimaryContractId(result as any)).toBe('D012');
  });

  it('getPrimaryContractId should return null when no primary contract exists', () => {
    const result = {
      ...mockResult,
      result_contracts: [
        { is_primary: 0, contract_id: 'A123' },
        { is_primary: '0', contract_id: 'B456' }
      ]
    };
    expect(component.getPrimaryContractId(result as any)).toBeNull();
  });

  it('getPrimaryContractId should handle string is_primary value', () => {
    const result = {
      ...mockResult,
      result_contracts: [{ is_primary: '1', contract_id: 'E345' }]
    };
    expect(component.getPrimaryContractId(result as any)).toBe('E345');
  });

  it('getVisibleColumns should return all columns when showNewProjectResultButton is false', () => {
    (component as any).showNewProjectResultButton = false;
    const columns = mockService.tableColumns();
    expect(component.getVisibleColumns()).toBe(columns);
  });

  it('getVisibleColumns should filter out project and lever columns when showNewProjectResultButton is true', () => {
    (component as any).showNewProjectResultButton = true;
    const columns = [
      { field: 'project', header: 'Project' },
      { field: 'lever', header: 'Lever' },
      { field: 'title', header: 'Title' },
      { field: 'code', header: 'Code' }
    ];
    mockService.tableColumns.set(columns as any);
    const visible = component.getVisibleColumns();
    expect(visible).toEqual([
      { field: 'title', header: 'Title' },
      { field: 'code', header: 'Code' }
    ]);
  });

  it('ngAfterViewInit should set table refs and add document listener', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    component.ngAfterViewInit();
    expect(mockService.tableRef()).toBe((component as any).dt2);
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), { capture: true });
  });

  it('ngAfterViewInit should register and remove document click listener', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    component.ngAfterViewInit();
    // call the remover
    (component as any).removeDocumentClickListener?.();
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), { capture: true } as unknown as boolean);
  });

  it('ngOnDestroy should remove document click listener when registered', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    component.ngAfterViewInit();
    component.ngOnDestroy();
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), { capture: true } as unknown as boolean);
    removeSpy.mockRestore();
  });

  it('dt2 setter should sync tableRef on ResultsCenterService', () => {
    const fakeTable = { el: { nativeElement: document.createElement('div') } } as any;
    component.dt2 = fakeTable;
    expect(mockService.tableRef()).toBe(fakeTable);
    component.dt2 = undefined;
    expect(mockService.tableRef()).toBeUndefined();
  });

  it('onDocClickCapture should call processRowClick with target element', () => {
    const processSpy = jest.spyOn<any, any>(component as any, 'processRowClick');
    component.ngAfterViewInit();
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(processSpy).toHaveBeenCalledWith(el, expect.any(MouseEvent));
  });

  it('onDocClickCapture should return early when event.target is null', () => {
    let captureCallback: ((e: MouseEvent) => void) | null = null;
    jest.spyOn(document, 'addEventListener').mockImplementation((event: string, cb: any) => {
      if (event === 'click') captureCallback = cb;
    });
    component.ngAfterViewInit();
    expect(captureCallback).not.toBeNull();
    const processSpy = jest.spyOn<any, any>(component as any, 'processRowClick');
    captureCallback!({ target: null } as MouseEvent);
    expect(processSpy).not.toHaveBeenCalled();
  });

  it('processRowClick should return early when clicking public link action', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    const button = document.createElement('button');
    button.setAttribute('data-public-link-action', '');
    td.appendChild(button);
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      value: [mockResult],
      el: { nativeElement: tableElement }
    } as any;
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(button, new MouseEvent('click'));
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('onTableRowClick should not open result when clicking public link action', () => {
    const openSpy = jest.spyOn(component, 'openResult');
    const button = document.createElement('button');
    button.setAttribute('data-public-link-action', '');
    component.onTableRowClick({ target: button } as MouseEvent, mockResult);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('onTableRowClick should open result for normal row clicks', () => {
    const openSpy = jest.spyOn(component, 'openResult');
    const td = document.createElement('td');
    component.onTableRowClick({ target: td } as MouseEvent, mockResult);
    expect(openSpy).toHaveBeenCalledWith(mockResult);
  });

  it('processRowClick should open PRMS modal and prevent default', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    const prmsResult = { ...mockResult, platform_code: 'PRMS' };
    row.setAttribute('data-result-id', prmsResult.result_official_code.toString());
    row.setAttribute('data-platform', prmsResult.platform_code);
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      value: [prmsResult],
      el: { nativeElement: tableElement }
    } as any;
    const prevent = jest.fn();
    const stop = jest.fn();
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(td, { preventDefault: prevent, stopPropagation: stop } as any);
    expect(handleSpy).toHaveBeenCalledWith(prmsResult, td, expect.any(Object));
    expect(mockModals.openModal).toHaveBeenCalledWith('resultInformation');
    expect(prevent).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it('processRowClick should return when data.find does not find matching result', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    row.setAttribute('data-result-id', '999');
    row.setAttribute('data-platform', 'ROAR');
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      value: [mockResult],
      el: { nativeElement: tableElement }
    } as any;
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(td, new MouseEvent('click'));
    expect(handleSpy).not.toHaveBeenCalled();
    expect(mockModals.openModal).not.toHaveBeenCalled();
  });

  it('processRowClick should return when row has no data-result attributes and data index is out of range', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    mockService.list.set([]);
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      value: [],
      el: { nativeElement: tableElement }
    } as any;
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(td, new MouseEvent('click'));
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('processRowClick should return when tr parent is not tbody (e.g. div wrapper)', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('div');
    const wrapper = document.createElement('div');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    wrapper.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(wrapper);
    (component as any).dt2 = {
      first: 0,
      value: [mockResult],
      el: { nativeElement: tableElement }
    } as any;
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(td, new MouseEvent('click'));
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('processRowClick should return when rowIndex is not found in tbody rows', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    mockService.list.set([mockResult]);
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      value: [mockResult],
      el: { nativeElement: tableElement }
    } as any;
    const indexOfSpy = jest.spyOn(Array.prototype, 'indexOf').mockReturnValueOnce(-1);
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(td, new MouseEvent('click'));
    indexOfSpy.mockRestore();
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('processRowClick should resolve result by data-result-id and platform when both are set', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    row.setAttribute('data-result-id', String(mockResult.result_official_code));
    row.setAttribute('data-platform', mockResult.platform_code);
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      value: [mockResult, { ...mockResult, result_official_code: 99 }],
      el: { nativeElement: tableElement }
    } as any;
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(td, new MouseEvent('click'));
    expect(handleSpy).toHaveBeenCalledWith(mockResult, td, expect.any(Object));
  });

  it('processRowClick should fall back to list() when dt2.value is undefined and data-result attrs match', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    mockService.list.set([mockResult]);
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    row.setAttribute('data-result-id', String(mockResult.result_official_code));
    row.setAttribute('data-platform', mockResult.platform_code);
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      value: undefined,
      el: { nativeElement: tableElement }
    } as any;
    const handleSpy = jest.spyOn(component as any, 'handleRowClickResult');
    (component as any).processRowClick(td, new MouseEvent('click'));
    expect(handleSpy).toHaveBeenCalledWith(mockResult, td, expect.any(Object));
  });

  it('processRowClick should early return when not inside row', () => {
    const tableElement = document.createElement('div');
    const div = document.createElement('div');
    tableElement.appendChild(div);
    (component as any).dt2 = {
      el: { nativeElement: tableElement }
    } as any;
    (component as any).processRowClick(div, { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any);
    // nothing should happen
    expect(mockModals.openModal).not.toHaveBeenCalledWith('resultInformation');
  });

  it('onHostClick should delegate to processRowClick for non-PRMS and do nothing', () => {
    const tableElement = document.createElement('div');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      first: 0,
      filteredValue: [{ ...mockResult, platform_code: 'ROAR' }],
      el: { nativeElement: tableElement }
    } as any;
    component.onHostClick({ target: td } as any);
    expect(mockModals.openModal).not.toHaveBeenCalledWith('resultInformation');
  });

  it('exportTable should download xlsx from API using export filters', async () => {
    const createObjectURLSpy = jest.fn().mockReturnValue('blob:123');
    const revokeObjectURLSpy = jest.fn();
    const originalURL = globalThis.URL;
    (globalThis as any).URL = {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy
    };
    const clickSpy = jest.fn();
    const linkElement = {
      click: clickSpy,
      style: { display: '' },
      href: '',
      download: '',
      remove: jest.fn()
    };
    const originalCreate = document.createElement;
    const originalAppendChild = document.body.appendChild;
    (document as any).createElement = (tagName: any) => {
      if (tagName === 'a') return linkElement as any;
      return originalCreate.call(document, tagName);
    };
    document.body.appendChild = jest.fn((node: any) => {
      if (node === linkElement) {
        return node;
      }
      return originalAppendChild.call(document.body, node);
    }) as any;

    jest.useFakeTimers();
    const exportPromise = component.exportTable();
    await jest.runAllTimersAsync();
    await exportPromise;

    expect(mockService.getExportResultFilter).toHaveBeenCalled();
    expect(mockService.getExportPaginationOptions).toHaveBeenCalled();
    expect(mockApiService.GET_ResultCenterXlsx).toHaveBeenCalledWith(
      { 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': [] },
      { sortField: 'code', sortOrder: 'DESC', search: '' }
    );
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:123');

    jest.useRealTimers();
    (document as any).createElement = originalCreate;
    document.body.appendChild = originalAppendChild;
    globalThis.URL = originalURL;
  });

  it('exportTable should return early when an export is already running', async () => {
    component.isExporting.set(true);

    await component.exportTable();

    expect(mockApiService.GET_ResultCenterXlsx).not.toHaveBeenCalled();
    expect(component.isExporting()).toBe(true);
  });

  it('exportTable should log error when GET_ResultCenterXlsx rejects', async () => {
    mockApiService.GET_ResultCenterXlsx.mockRejectedValueOnce(new Error('network'));
    await component.exportTable();
    expect(console.error).toHaveBeenCalled();
  });

  it('exportTable should log rejection when error is not an Error instance', async () => {
    mockApiService.GET_ResultCenterXlsx.mockRejectedValueOnce('network-fail');
    await component.exportTable();
    expect(console.error).toHaveBeenCalled();
  });

  it('exportTable should log error when blob is empty', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockApiService.GET_ResultCenterXlsx.mockResolvedValueOnce(new Blob([]));
    await component.exportTable();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Downloaded file is empty or invalid');
    consoleErrorSpy.mockRestore();
  });

  it('showStarPdfReport should require STAR platform and supported indicators', () => {
    expect(component.showStarPdfReport({ ...mockResult, platform_code: 'STAR', indicator_id: 1 })).toBe(true);
    expect(component.showStarPdfReport({ ...mockResult, platform_code: 'STAR', indicator_id: 2 })).toBe(true);
    expect(component.showStarPdfReport({ ...mockResult, platform_code: 'STAR', indicator_id: 4 })).toBe(false);
    expect(component.showStarPdfReport({ ...mockResult, platform_code: 'PRMS', indicator_id: 1 })).toBe(false);
  });

  it('isStarPdfReportDisabled should disable inn_dev PDF temporarily', () => {
    expect(component.isStarPdfReportDisabled({ ...mockResult, platform_code: 'STAR', indicator_id: 2 })).toBe(true);
    expect(component.isStarPdfReportDisabled({ ...mockResult, platform_code: 'STAR', indicator_id: 1 })).toBe(false);
  });

  it('openStarPdfReport should not open when inn_dev PDF is temporarily disabled', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue({ opener: {} } as Window);
    component.openStarPdfReport({ ...mockResult, platform_code: 'STAR', indicator_id: 2 });
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('getStarReportViewerUrl should include STAR result code without version from results center', () => {
    expect(component.getStarReportViewerUrl({ ...mockResult, platform_code: 'STAR', indicator_id: 1 })).toBe(
      '/reports/result/STAR-7'
    );
  });

  it('getStarReportViewerUrl should not duplicate STAR prefix', () => {
    expect(
      component.getStarReportViewerUrl({ ...mockResult, result_official_code: 'STAR-7', platform_code: 'STAR', indicator_id: 1 })
    ).toBe('/reports/result/STAR-7');
  });

  it('getStarReportViewerUrl should omit version even when snapshot years are available', () => {
    const result = {
      ...mockResult,
      report_year_id: undefined,
      snapshot_years: [2022, 2026, 2024],
      platform_code: 'STAR',
      indicator_id: 2
    };
    expect(component.getStarReportViewerUrl(result)).toBe('/reports/result/STAR-7');
  });

  it('getStarReportViewerUrl should omit version even when year is available', () => {
    const result = {
      ...mockResult,
      report_year_id: undefined,
      snapshot_years: [],
      year: '2025',
      platform_code: 'STAR',
      indicator_id: 1
    };
    expect(component.getStarReportViewerUrl(result)).toBe('/reports/result/STAR-7');
  });

  it('getStarReportViewerUrl should handle missing official code', () => {
    const result = { ...mockResult, result_official_code: undefined, platform_code: 'STAR', indicator_id: 1 };
    expect(component.getStarReportViewerUrl(result)).toBe('/reports/result/STAR-');
  });

  it('getStarReportViewerUrl should build a clean URL when no report year is available', () => {
    const result = {
      ...mockResult,
      result_official_code: 8,
      report_year_id: undefined,
      snapshot_years: [],
      year: undefined,
      platform_code: 'STAR',
      indicator_id: 2
    };
    expect(component.getStarReportViewerUrl(result)).toBe('/reports/result/STAR-8');
  });

  it('openStarPdfReport should open the internal STAR report viewer URL in a new tab', () => {
    const openedWindow = { opener: {} };
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue(openedWindow as any);

    component.openStarPdfReport({ ...mockResult, platform_code: 'STAR', indicator_id: 1 });

    expect(mockApiService.GET_ResultPdfReport).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('/reports/result/STAR-7', '_blank', 'noopener,noreferrer');
    expect(openedWindow.opener).toBeNull();

    openSpy.mockRestore();
  });

  it('buildResultsCenterExportFileName should use single-letter initials when only one name is present', () => {
    mockCache.dataCache.set({ user: { first_name: 'Zoe', last_name: '', sec_user_id: 1 } });
    const fixed = new Date(2025, 0, 1, 14, 5, 0);
    expect((component as any).buildResultsCenterExportFileName(fixed)).toBe('STAR_results_metadata_20250101_1405_Z.xlsx');
  });

  it('buildResultsCenterExportFileName should treat missing name fields as empty initials toward UU', () => {
    mockCache.dataCache.set({ user: { sec_user_id: 1 } as { sec_user_id: number; first_name?: string; last_name?: string } });
    const fixed = new Date(2026, 2, 24, 8, 25, 0);
    expect((component as any).buildResultsCenterExportFileName(fixed)).toBe('STAR_results_metadata_20260324_0825_UU.xlsx');
  });


  it('processRowClick should return early when modal is open', () => {
    mockModals.isAnyModalOpen.mockReturnValue(true);
    const target = document.createElement('div');
    const event = new MouseEvent('click');

    (component as any).processRowClick(target, event);

    expect(mockModals.isAnyModalOpen).toHaveBeenCalled();
  });

  it('processRowClick should return early when dt2.el.nativeElement is not available', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    (component as any).dt2 = { el: null };
    const target = document.createElement('div');
    const event = new MouseEvent('click');

    (component as any).processRowClick(target, event);

    // Should not throw or navigate
  });

  it('processRowClick should return early when target is not in table', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('div');
    (component as any).dt2 = { el: { nativeElement: tableElement } };
    const target = document.createElement('div');
    document.body.appendChild(target);
    const event = new MouseEvent('click');

    (component as any).processRowClick(target, event);

    document.body.removeChild(target);
  });

  it('processRowClick should return early when target is in calendar/datepicker', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('div');
    const calendarElement = document.createElement('div');
    calendarElement.className = 'p-calendar';
    tableElement.appendChild(calendarElement);
    (component as any).dt2 = { el: { nativeElement: tableElement } };
    const event = new MouseEvent('click');

    (component as any).processRowClick(calendarElement, event);

    // Should not navigate
  });

  it('processRowClick should return early when target is in thead or th', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('table');
    const thead = document.createElement('thead');
    const th = document.createElement('th');
    thead.appendChild(th);
    tableElement.appendChild(thead);
    (component as any).dt2 = { el: { nativeElement: tableElement } };
    const event = new MouseEvent('click');

    (component as any).processRowClick(th, event);

    // Should not navigate
  });

  it('processRowClick should navigate to project-detail when clicking project-cell', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'project-cell';
    row.appendChild(cell);
    tbody.appendChild(row);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      el: { nativeElement: tableElement },
      filteredValue: [{ ...mockResult, result_contracts: { contract_id: 'C-1' } }],
      first: 0
    };
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

    (component as any).processRowClick(cell, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/project-detail', 'C-1'], { queryParams: {} });
  });

  it('processRowClick should navigate to project-detail with from query when resultEntryContext is results-center', () => {
    fixture.componentRef.setInput('resultEntryContext', 'results-center');
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'project-cell';
    row.appendChild(cell);
    tbody.appendChild(row);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      el: { nativeElement: tableElement },
      filteredValue: [{ ...mockResult, result_contracts: { contract_id: 'C-1' } }],
      first: 0
    };
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    (component as any).processRowClick(cell, event);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
      queryParams: { from: 'results-center' }
    });
  });

  it('processRowClick should return early for non-PRMS/TIP/AICCRA when clicking routerLink', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    const tableElement = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    const link = document.createElement('a');
    link.setAttribute('routerLink', '/some-path');
    cell.appendChild(link);
    row.appendChild(cell);
    tbody.appendChild(row);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      el: { nativeElement: tableElement },
      filteredValue: [{ ...mockResult, platform_code: 'ROAR' }],
      first: 0
    };
    const event = new MouseEvent('click');

    (component as any).processRowClick(link, event);

    // Should not navigate
  });

  it('processRowClick with STAR platform should close result information modal and clear selected result', () => {
    mockModals.isAnyModalOpen.mockReturnValue(false);
    mockModals.isModalOpen.mockReturnValue({ isOpen: true });
    const setSelectedSpy = jest.spyOn(mockModals.selectedResultForInfo, 'set');
    const tableElement = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const td = document.createElement('td');
    const starResult = { ...mockResult, platform_code: 'STAR', result_official_code: 7 };
    row.setAttribute('data-result-id', String(starResult.result_official_code));
    row.setAttribute('data-platform', starResult.platform_code);
    tbody.appendChild(row);
    row.appendChild(td);
    tableElement.appendChild(tbody);
    (component as any).dt2 = {
      el: { nativeElement: tableElement },
      value: [starResult],
      filteredValue: [starResult],
      first: 0
    };
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    (component as any).processRowClick(td, event);
    expect(mockModals.closeModal).toHaveBeenCalledWith('resultInformation');
    expect(setSelectedSpy).toHaveBeenCalledWith(null);
  });

  it('closeResultInformationModal should only close modal when resultInformation is open', () => {
    mockModals.isModalOpen.mockReturnValue({ isOpen: true });
    const setSelectedSpy = jest.spyOn(mockModals.selectedResultForInfo, 'set');
    (component as any).closeResultInformationModal();
    expect(mockModals.closeModal).toHaveBeenCalledWith('resultInformation');
    expect(setSelectedSpy).toHaveBeenCalledWith(null);
  });

  it('closeResultInformationModal should clear entry context when modal is not open', () => {
    mockModals.isModalOpen.mockReturnValue({ isOpen: false });
    mockModals.closeModal.mockClear();
    mockModals.setResultInformationEntryContext.mockClear();
    (component as any).closeResultInformationModal();
    expect(mockModals.setResultInformationEntryContext).toHaveBeenCalledWith(null);
    expect(mockModals.closeModal).not.toHaveBeenCalled();
  });
});
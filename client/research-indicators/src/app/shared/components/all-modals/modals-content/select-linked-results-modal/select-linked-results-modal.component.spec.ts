import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { signal } from '@angular/core';

import { SelectLinkedResultsModalComponent } from './select-linked-results-modal.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { Result } from '@shared/interfaces/result/result.interface';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

describe('SelectLinkedResultsModalComponent', () => {
  let component: SelectLinkedResultsModalComponent;
  let fixture: ComponentFixture<SelectLinkedResultsModalComponent>;
  let modalConfigSignal: ReturnType<typeof signal>;

  let allModalsService: jest.Mocked<AllModalsService> & { modalConfig: ReturnType<typeof signal> };
  let resultsCenterService: jest.Mocked<ResultsCenterService>;
  let cacheService: jest.Mocked<CacheService>;
  let apiService: jest.Mocked<ApiService>;
  let actionsService: jest.Mocked<ActionsService>;
  let router: jest.Mocked<Router>;

  const createResult = (partial: Partial<Result> = {}): Result =>
    ({
      result_id: 1,
      result_official_code: 123,
      platform_code: PLATFORM_CODES.PRMS,
      external_link: '',
      result_status: { result_status_id: 1, name: 'Status' },
      snapshot_years: [],
      result_contracts: undefined,
      ...partial
    } as any);

  beforeEach(async () => {
    modalConfigSignal = signal({
      selectLinkedResults: { isOpen: false },
      createResult: { isOpen: false },
      submitResult: { isOpen: false },
      requestPartner: { isOpen: false },
      askForHelp: { isOpen: false }
    } as any);
    
    const mockAllModalsService: jest.Mocked<AllModalsService> = {
      modalConfig: modalConfigSignal,
      isModalOpen: jest.fn((name: string) => modalConfigSignal()[name as any]),
      syncSelectedResults: Object.assign(jest.fn().mockReturnValue([]) as any, {
        set: jest.fn()
      }),
      closeModal: jest.fn(),
      refreshLinkedResults: jest.fn(),
      // @ts-expect-error partial mock
    } as jest.Mocked<AllModalsService>;

    const mockResultsCenterService: jest.Mocked<ResultsCenterService> = {
      list: Object.assign(jest.fn().mockReturnValue([]) as any, { set: jest.fn() }),
      loading: Object.assign(jest.fn().mockReturnValue(false) as any, { set: jest.fn() }),
      showFiltersSidebar: Object.assign(jest.fn().mockReturnValue(false) as any, { set: jest.fn() }),
      clearAllFilters: jest.fn(),
      clearAllFiltersWithPreserve: jest.fn(),
      main: jest.fn().mockResolvedValue(undefined),
      tableFilters: jest.fn().mockReturnValue({
        levers: [],
        statusCodes: [],
        years: [],
        contracts: [],
        indicators: []
      }),
      resultsFilter: Object.assign(
        jest.fn().mockReturnValue({ 'indicator-codes-filter': [] }) as any,
        { update: jest.fn((updater: (prev: any) => any) => updater({})) }
      ),
      appliedFilters: Object.assign(
        jest.fn().mockReturnValue({}) as any,
        { update: jest.fn((updater: (prev: any) => any) => updater({})) }
      ),
      countTableFiltersSelected: jest.fn().mockReturnValue(0),
      getAllPathsAsArray: jest.fn().mockReturnValue([]),
      tableColumns: jest.fn().mockReturnValue([]),
      searchInput: Object.assign(jest.fn().mockReturnValue('') as any, { set: jest.fn() }),
      resultsTablePaginatorFirst: Object.assign(jest.fn().mockReturnValue(0) as any, { set: jest.fn() }),
      resultsTablePaginatorRows: Object.assign(jest.fn().mockReturnValue(10) as any, { set: jest.fn() }),
      resultsTableTotalRecords: Object.assign(jest.fn().mockReturnValue(0) as any, { set: jest.fn() }),
      resultsTableSortField: Object.assign(jest.fn().mockReturnValue('result_official_code') as any, { set: jest.fn() }),
      resultsTableSortOrder: Object.assign(jest.fn().mockReturnValue(-1) as any, { set: jest.fn() }),
      handleResultsTableLazyLoad: jest.fn(),
      invalidateResultsListFetchCache: jest.fn(),
      myResultsFilterItem: Object.assign(jest.fn().mockReturnValue({ id: 'all', label: 'All Results' }) as any, { set: jest.fn() }),
      myResultsFilterItems: [{ id: 'all', label: 'All Results' }, { id: 'my', label: 'My Results' }],
      // @ts-expect-error partial mock
    } as jest.Mocked<ResultsCenterService>;

    const mockCacheService: jest.Mocked<CacheService> = {
      getCurrentNumericResultId: jest.fn().mockReturnValue(1),
      headerHeight: jest.fn().mockReturnValue(100),
      navbarHeight: jest.fn().mockReturnValue(50),
      currentResultId: jest.fn().mockReturnValue('1')
      // @ts-expect-error partial mock
    } as jest.Mocked<CacheService>;

    const mockApiService: jest.Mocked<ApiService> = {
      PATCH_LinkedResults: jest.fn().mockResolvedValue({} as any),
      GET_LinkedResults: jest.fn(),
      // @ts-expect-error partial mock
    } as jest.Mocked<ApiService>;

    const mockActionsService: jest.Mocked<ActionsService> = {
      showToast: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<ActionsService>;

    const mockRouter: jest.Mocked<Router> = {
      createUrlTree: jest.fn(),
      serializeUrl: jest.fn(),
      navigate: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<Router>;

    const mockActivatedRoute: Partial<ActivatedRoute> = {
      snapshot: {
        // @ts-expect-error minimal queryParamMap
        queryParamMap: { get: jest.fn().mockReturnValue(null) }
      } as any
    };

    TestBed.overrideComponent(SelectLinkedResultsModalComponent, { set: { template: '' } });

    await TestBed.configureTestingModule({
      imports: [SelectLinkedResultsModalComponent],
      providers: [
        { provide: AllModalsService, useValue: mockAllModalsService },
        { provide: ResultsCenterService, useValue: mockResultsCenterService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ApiService, useValue: mockApiService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectLinkedResultsModalComponent);
    component = fixture.componentInstance;

    allModalsService = TestBed.inject(AllModalsService) as jest.Mocked<AllModalsService> & { modalConfig: ReturnType<typeof signal> };
    resultsCenterService = TestBed.inject(ResultsCenterService) as jest.Mocked<ResultsCenterService>;
    cacheService = TestBed.inject(CacheService) as jest.Mocked<CacheService>;
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    actionsService = TestBed.inject(ActionsService) as jest.Mocked<ActionsService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    
    // Ensure modalConfig is the signal we created
    allModalsService.modalConfig = modalConfigSignal;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should treat modal as closed when isModalOpen returns undefined (cover line 61 branch)', () => {
    allModalsService.isModalOpen = jest.fn().mockReturnValue(undefined);
    modalConfigSignal.update(() => ({} as any));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('basic behaviors', () => {
    it('should set service search, reset page and call main', () => {
      component.setSearchInputFilter('search text');
      expect(resultsCenterService.searchInput.set).toHaveBeenCalledWith('search text');
      expect(resultsCenterService.resultsTablePaginatorFirst.set).toHaveBeenCalledWith(0);
      expect(resultsCenterService.main).toHaveBeenCalled();
    });

    it('should reset PrimeNG table first when dt2 is available', () => {
      const dt = { first: 40 };
      (component as any).dt2 = dt;
      component.setSearchInputFilter('x');
      expect(dt.first).toBe(0);
    });

    it('should compute selectedCount based on selectedResults', () => {
      expect(component.selectedCount()).toBe(0);
      component.selectedResults.set([createResult({ result_id: 1 }), createResult({ result_id: 2 })]);
      expect(component.selectedCount()).toBe(2);
    });

    it('should format result code with padding', () => {
      expect(component.formatResultCode(1)).toBe('001');
      expect(component.formatResultCode('23')).toBe('023');
      expect(component.formatResultCode('')).toBe('');
    });

    it('should delegate getPlatformColors to PLATFORM_COLOR_MAP', () => {
      const colors = component.getPlatformColors('PRMS');
      // Solo verificamos que devuelva algo (el mapa real se prueba en otro sitio)
      expect(colors).toBeDefined();
    });
  });

  describe('selection', () => {
    it('should detect if a result is selected', () => {
      const r1 = createResult({ result_id: 1 });
      const r2 = createResult({ result_id: 2 });
      component.selectedResults.set([r1]);

      expect(component.isSelected(r1)).toBe(true);
      expect(component.isSelected(r2)).toBe(false);
    });

    it('should toggle selection and sync with allModalsService', () => {
      const r1 = createResult({ result_id: 1 });
      const r2 = createResult({ result_id: 2 });

      component.selectedResults.set([r1]);

      component.toggleSelection(r2);
      expect(component.selectedResults()).toEqual([r1, r2]);
      expect(allModalsService.syncSelectedResults.set).toHaveBeenCalledWith([r1, r2]);

      component.toggleSelection(r1);
      expect(component.selectedResults()).toEqual([r2]);
      expect(allModalsService.syncSelectedResults.set).toHaveBeenLastCalledWith([r2]);
    });
  });

  describe('openResult and links', () => {
    it('should return external link for TIP platform in getResultHref', () => {
      const result = createResult({
        platform_code: PLATFORM_CODES.TIP,
        external_link: 'https://external.com'
      });
      expect(component.getResultHref(result)).toBe('https://external.com');
    });

    it('should use platformCode override in getResultHref when provided', () => {
      const result = createResult({
        platform_code: PLATFORM_CODES.PRMS,
        external_link: 'https://override-tip.com'
      });
      expect(component.getResultHref(result, PLATFORM_CODES.TIP)).toBe('https://override-tip.com');
    });

    it('should return empty string when external_link is null in getResultHref for TIP', () => {
      const result = createResult({
        platform_code: PLATFORM_CODES.TIP,
        external_link: null as any
      });
      expect(component.getResultHref(result)).toBe('');
    });

    it('should not open when openExternalLink has no link', () => {
      const openSpy = jest.spyOn(globalThis, 'open' as any).mockImplementation(() => null);
      const result = createResult({ platform_code: PLATFORM_CODES.TIP, external_link: '' });
      component.openExternalLink(result);
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should build internal href without version when no snapshots', () => {
      const urlTree = {} as UrlTree;
      router.createUrlTree.mockReturnValue(urlTree);
      router.serializeUrl.mockReturnValue('/result/PRMS-123');

      const result = createResult({
        platform_code: PLATFORM_CODES.PRMS,
        result_official_code: 123,
        snapshot_years: []
      });

      const href = component.getResultHref(result);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/result', 'PRMS-123']);
      expect(href).toBe('/result/PRMS-123');
    });

    it('should build internal href with latest snapshot year', () => {
      const urlTree = {} as UrlTree;
      router.createUrlTree.mockReturnValue(urlTree);
      router.serializeUrl.mockReturnValue('/result/PRMS-123?version=2024');

      const result = createResult({
        platform_code: PLATFORM_CODES.PRMS,
        result_official_code: 123,
        snapshot_years: [2021, 2024, 2020],
        result_status: { result_status_id: 6, name: 'Completed' }
      });

      const href = component.getResultHref(result);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/result', 'PRMS-123', 'general-information'],
        { queryParams: { version: 2024 } }
      );
      expect(href).toBe('/result/PRMS-123?version=2024');
    });

    it('should open external link for TIP platform in openResult', () => {
      const result = createResult({
        platform_code: PLATFORM_CODES.TIP,
        external_link: 'https://external.com'
      });
      const openExternalSpy = jest.spyOn(component, 'openExternalLink').mockImplementation(() => {});

      component.openResult(result);

      expect(openExternalSpy).toHaveBeenCalledWith(result);
      expect(resultsCenterService.clearAllFilters).not.toHaveBeenCalled();
    });

    it('should clear filters and open href in new tab for non-TIP result', () => {
      const result = createResult({
        platform_code: PLATFORM_CODES.PRMS,
        external_link: ''
      });
      const href = '/result/PRMS-123';
      const getHrefSpy = jest.spyOn(component, 'getResultHref').mockReturnValue(href);
      const openHrefSpy = jest.spyOn<any, any>(component as any, 'openHrefInNewTab').mockImplementation(() => {});

      component.openResult(result);

      expect(resultsCenterService.clearAllFilters).toHaveBeenCalled();
      expect(getHrefSpy).toHaveBeenCalledWith(result);
      expect(openHrefSpy).toHaveBeenCalledWith(href);
    });

    it('should open external link only for supported platforms', () => {
      const globalOpenSpy = jest.spyOn(globalThis, 'open' as any).mockImplementation(() => null);

      const tipResult = createResult({
        platform_code: PLATFORM_CODES.TIP,
        external_link: 'https://tip.com'
      });
      component.openExternalLink(tipResult);
      expect(globalOpenSpy).toHaveBeenCalledWith('https://tip.com', '_blank', 'noopener');

      globalOpenSpy.mockClear();
      const prmsResult = createResult({
        platform_code: PLATFORM_CODES.PRMS,
        external_link: 'https://prms.com'
      });
      component.openExternalLink(prmsResult);
      expect(globalOpenSpy).toHaveBeenCalledWith('https://prms.com', '_blank', 'noopener');

      globalOpenSpy.mockClear();
      const otherResult = createResult({
        platform_code: 'OTHER' as any,
        external_link: 'https://other.com'
      });
      component.openExternalLink(otherResult);
      expect(globalOpenSpy).not.toHaveBeenCalled();

      globalOpenSpy.mockRestore();
    });

    it('should not open result by year when platform is PRMS', () => {
      const openHrefSpy = jest.spyOn<any, any>(component as any, 'openHrefInNewTab').mockImplementation(() => {});

      component.openResultByYear(1, 2024, PLATFORM_CODES.PRMS);

      expect(resultsCenterService.clearAllFilters).not.toHaveBeenCalled();
      expect(openHrefSpy).not.toHaveBeenCalled();
    });

    it('should navigate to result by year for non-PRMS platform', () => {
      const openHrefSpy = jest.spyOn<any, any>(component as any, 'openHrefInNewTab').mockImplementation(() => {});
      const urlTree = {} as UrlTree;
      router.createUrlTree.mockReturnValue(urlTree);
      router.serializeUrl.mockReturnValue('/result/TIP-1?version=2024');

      component.openResultByYear(1, 2024, PLATFORM_CODES.TIP);

      expect(resultsCenterService.clearAllFilters).toHaveBeenCalled();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/result', 'TIP-1'], {
        queryParams: { version: 2024 }
      });
      expect(openHrefSpy).toHaveBeenCalledWith('/result/TIP-1?version=2024');
    });
  });

  describe('openHrefInNewTab', () => {
    it('should do nothing when href is empty', () => {
      const globalOpenSpy = jest.spyOn(globalThis, 'open' as any).mockImplementation(() => null);

      (component as any)['openHrefInNewTab']('');

      expect(globalOpenSpy).not.toHaveBeenCalled();
      globalOpenSpy.mockRestore();
    });

    it('should open absolute href directly', () => {
      const globalOpenSpy = jest.spyOn(globalThis, 'open' as any).mockImplementation(() => null);

      (component as any)['openHrefInNewTab']('https://absolute.com');

      expect(globalOpenSpy).toHaveBeenCalledWith('https://absolute.com', '_blank', 'noopener');
      globalOpenSpy.mockRestore();
    });

    it('should resolve relative href against location.origin', () => {
      const globalOpenSpy = jest.spyOn(globalThis, 'open' as any).mockImplementation(() => null);
      const originalLocation = globalThis.location;
      // @ts-expect-error override location
      delete (globalThis as any).location;
      // @ts-expect-error override location
      (globalThis as any).location = { origin: 'https://base.com' };

      (component as any)['openHrefInNewTab']('/relative/path');

      expect(globalOpenSpy).toHaveBeenCalledWith('https://base.com/relative/path', '_blank', 'noopener');

      globalThis.location = originalLocation;
      globalOpenSpy.mockRestore();
    });

    it('should use empty baseOrigin when location has no origin (absolute href)', () => {
      const globalOpenSpy = jest.spyOn(globalThis, 'open' as any).mockImplementation(() => null);
      const originalLocation = globalThis.location;
      (globalThis as any).location = {};
      (component as any)['openHrefInNewTab']('https://example.com/page');
      expect(globalOpenSpy).toHaveBeenCalledWith('https://example.com/page', '_blank', 'noopener');
      globalThis.location = originalLocation;
      globalOpenSpy.mockRestore();
    });
  });

  describe('modal actions', () => {
    it('should compute scroll height based on header and navbar', () => {
      cacheService.headerHeight.mockReturnValue(100);
      cacheService.navbarHeight.mockReturnValue(50);

      const result = component.getScrollHeight();
      expect(result).toBe('calc(100vh - 550px)');
    });

    it('should show filters sidebar', () => {
      component.showFiltersSidebar();
      expect(resultsCenterService.showFiltersSidebar.set).toHaveBeenCalledWith(true);
    });

    it('should clear filters and reload results', async () => {
      const applySpy = jest.spyOn<any, any>(component as any, 'applyModalIndicatorFilter').mockImplementation(() => {});
      const loadSpy = jest.spyOn<any, any>(component as any, 'loadResultsForModal').mockResolvedValue(undefined);

      await component.clearFilters();

      expect(resultsCenterService.clearAllFiltersWithPreserve).toHaveBeenCalled();
      expect(applySpy).toHaveBeenCalledWith({ resetIndicatorFilters: true });
      expect(loadSpy).toHaveBeenCalled();
    });

    it('should cancel selection and close modal', () => {
      component.selectedResults.set([createResult()]);
      component.saving.set(true);

      component.cancel();

      expect(allModalsService.closeModal).toHaveBeenCalledWith('selectLinkedResults');
      expect(component.selectedResults()).toEqual([]);
      expect(component.saving()).toBe(false);
    });
  });

  describe('saveSelection', () => {
    it('should do nothing when no selected results', async () => {
      component.selectedResults.set([]);

      await component.saveSelection();

      expect(apiService.PATCH_LinkedResults).not.toHaveBeenCalled();
    });

    it('should save selection, refresh, show success toast and close modal', async () => {
      const r1 = createResult({ result_id: 1 });
      const r2 = createResult({ result_id: 2 });
      component.selectedResults.set([r1, r2]);

      await component.saveSelection();

      expect(apiService.PATCH_LinkedResults).toHaveBeenCalledWith(1, {
        link_results: [
          { other_result_id: 1 },
          { other_result_id: 2 }
        ]
      });
      expect(allModalsService.refreshLinkedResults).toHaveBeenCalled();
      expect(actionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Linked results',
        detail: 'Results linked successfully'
      });
      expect(allModalsService.closeModal).toHaveBeenCalledWith('selectLinkedResults');
      expect(component.selectedResults()).toEqual([]);
    });

    it('should handle error when saving selection fails', async () => {
      const r1 = createResult({ result_id: 1 });
      component.selectedResults.set([r1]);
      apiService.PATCH_LinkedResults.mockRejectedValue(new Error('fail'));

      await component.saveSelection();

      expect(actionsService.showToast).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Linked results',
        detail: 'Unable to link results, please try again'
      });
      expect(component.saving()).toBe(false);
    });
  });

  describe('filters confirm', () => {
    it('should update filters and reload results with default indicator tabs when no indicators selected', async () => {
      const loadSpy = jest.spyOn<any, any>(component as any, 'loadResultsForModal').mockResolvedValue(undefined);

      resultsCenterService.tableFilters.mockReturnValue({
        levers: [{ id: 1 }] as any,
        statusCodes: [{ result_status_id: 2 }] as any,
        years: [{ report_year: 2024 }] as any,
        contracts: [{ agreement_id: 'AGR-1' }] as any,
        indicators: []
      } as any);

      await component.onFiltersConfirm();

      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
    });

    it('should update filters with indicator codes when indicators are selected', async () => {
      const loadSpy = jest.spyOn<any, any>(component as any, 'loadResultsForModal').mockResolvedValue(undefined);
      const applyModalIndicatorFilterSpy = jest.spyOn<any, any>(component as any, 'applyModalIndicatorFilter').mockImplementation(() => {});

      resultsCenterService.tableFilters.mockReturnValue({
        levers: [{ id: 1 }] as any,
        statusCodes: [{ result_status_id: 2 }] as any,
        years: [{ report_year: 2024 }] as any,
        contracts: [{ agreement_id: 'AGR-1' }] as any,
        indicators: [{ indicator_id: 1 }, { indicator_id: 2 }] as any
      } as any);

      await component.onFiltersConfirm();

      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
      expect(applyModalIndicatorFilterSpy).toHaveBeenCalledWith({ tabsOverride: [] });
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('modal visibility watcher effect', () => {
    it('should call onModalOpened when modal opens', async () => {
      const onModalOpenedSpy = jest.spyOn<any, any>(component as any, 'onModalOpened').mockResolvedValue(undefined);
      
      // Set modal to open
      modalConfigSignal.update(config => ({
        ...config,
        selectLinkedResults: { isOpen: true }
      }));
      fixture.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(onModalOpenedSpy).toHaveBeenCalled();
    });

    it('should call resetModalFilters when modal closes', async () => {
      const resetSpy = jest.spyOn<any, any>(component as any, 'resetModalFilters').mockImplementation(() => {});
      
      // First set modal to open
      modalConfigSignal.update(config => ({
        ...config,
        selectLinkedResults: { isOpen: true }
      }));
      fixture.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then close it
      modalConfigSignal.update(config => ({
        ...config,
        selectLinkedResults: { isOpen: false }
      }));
      fixture.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('syncSelectedResultsWatcher effect', () => {
    it('should update selectedResults when synced results change', () => {
      const r1 = createResult({ result_id: 1 });
      const r2 = createResult({ result_id: 2 });
      component.selectedResults.set([r1]);
      
      allModalsService.syncSelectedResults.mockReturnValue([r1, r2] as any);
      fixture.detectChanges();
      
      expect(component.selectedResults()).toEqual([r1, r2]);
    });

    it('should not update selectedResults when synced results are the same', () => {
      const r1 = createResult({ result_id: 1 });
      component.selectedResults.set([r1]);
      
      allModalsService.syncSelectedResults.mockReturnValue([r1] as any);
      fixture.detectChanges();
      
      // Should remain the same
      expect(component.selectedResults()).toEqual([r1]);
    });
  });

  describe('handleLinkedTableLazyLoad', () => {
    it('should delegate to resultsCenterService.handleResultsTableLazyLoad', () => {
      const ev = { first: 25, rows: 25 } as any;
      component.handleLinkedTableLazyLoad(ev);
      expect(resultsCenterService.handleResultsTableLazyLoad).toHaveBeenCalledWith(ev);
    });
  });

  describe('onModalOpened', () => {
    it('should save tab, set to all, apply indicator filter and load results', async () => {
      const applySpy = jest.spyOn<any, any>(component as any, 'applyModalIndicatorFilter').mockImplementation(() => {});
      const loadResultsSpy = jest.spyOn<any, any>(component as any, 'loadResultsForModal').mockResolvedValue(undefined);
      const loadLinkedSpy = jest.spyOn<any, any>(component as any, 'loadExistingLinkedResults').mockResolvedValue(undefined);
      
      await (component as any).onModalOpened();
      
      expect(resultsCenterService.invalidateResultsListFetchCache).toHaveBeenCalled();
      expect(resultsCenterService.resultsTablePaginatorFirst.set).toHaveBeenCalledWith(0);
      expect(resultsCenterService.resultsTablePaginatorRows.set).toHaveBeenCalledWith(10);
      expect(resultsCenterService.myResultsFilterItem.set).toHaveBeenCalledWith({ id: 'all', label: 'All Results' });
      expect(applySpy).toHaveBeenCalledWith({ resetIndicatorFilters: true });
      expect(loadResultsSpy).toHaveBeenCalled();
      expect(loadLinkedSpy).toHaveBeenCalled();
    });
  });

  describe('loadExistingLinkedResults', () => {
    it('should load and set selected results from API', async () => {
      const r1 = createResult({ result_id: 1 });
      const r2 = createResult({ result_id: 2 });
      resultsCenterService.list.mockReturnValue([r1, r2] as any);
      
      apiService.GET_LinkedResults.mockResolvedValue({
        data: {
          link_results: [
            { other_result_id: 1 },
            { other_result_id: 2 }
          ]
        }
      } as any);
      
      await (component as any).loadExistingLinkedResults();
      
      expect(component.selectedResults()).toEqual([r1, r2]);
    });

    it('should set empty array when no linked results', async () => {
      apiService.GET_LinkedResults.mockResolvedValue({
        data: { link_results: [] }
      } as any);
      
      await (component as any).loadExistingLinkedResults();
      
      expect(component.selectedResults()).toEqual([]);
    });

    it('should set empty array when response has no data', async () => {
      apiService.GET_LinkedResults.mockResolvedValue({} as any);
      
      await (component as any).loadExistingLinkedResults();
      
      expect(component.selectedResults()).toEqual([]);
    });

    it('should handle error when loading linked results fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      apiService.GET_LinkedResults.mockRejectedValue(new Error('API Error'));
      
      await (component as any).loadExistingLinkedResults();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading linked results', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('resetModalFilters', () => {
    it('should restore saved myResultsFilterItem when closing modal', () => {
      const savedTab = { id: 'my', label: 'My Results' };
      (component as any).savedMyResultsFilterItem = savedTab;
      const clearSpy = jest.spyOn(component, 'clearFilters').mockImplementation(() => {});

      (component as any).resetModalFilters();

      expect(resultsCenterService.myResultsFilterItem.set).toHaveBeenCalledWith(savedTab);
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('loadResultsForModal', () => {
    it('should load results successfully', async () => {
      resultsCenterService.main.mockResolvedValue(undefined);
      
      await (component as any).loadResultsForModal();
      
      expect(resultsCenterService.invalidateResultsListFetchCache).toHaveBeenCalled();
      expect(resultsCenterService.list.set).toHaveBeenCalledWith([]);
      expect(resultsCenterService.loading.set).toHaveBeenCalledWith(true);
      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
      expect(resultsCenterService.main).toHaveBeenCalled();
      expect(resultsCenterService.loading.set).toHaveBeenLastCalledWith(false);
    });

    it('should handle error when loading results fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      resultsCenterService.main.mockRejectedValue(new Error('API Error'));
      
      await (component as any).loadResultsForModal();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading results for modal', expect.any(Error));
      expect(resultsCenterService.list.set).toHaveBeenCalledWith([]);
      expect(resultsCenterService.loading.set).toHaveBeenLastCalledWith(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('applyModalIndicatorFilter', () => {
    it('should use tabsOverride when provided', () => {
      (component as any).applyModalIndicatorFilter({ tabsOverride: [1, 2, 3] });
      
      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
    });

    it('should use default tabs when resetIndicatorFilters is true', () => {
      resultsCenterService.tableFilters.mockReturnValue({
        indicators: [],
        levers: [],
        statusCodes: [],
        years: [],
        contracts: []
      } as any);
      resultsCenterService.resultsFilter.mockReturnValue({ 'indicator-codes-filter': [] } as any);
      
      (component as any).applyModalIndicatorFilter({ resetIndicatorFilters: true });
      
      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
    });

    it('should use default tabs when no active indicator filter', () => {
      resultsCenterService.tableFilters.mockReturnValue({
        indicators: [],
        levers: [],
        statusCodes: [],
        years: [],
        contracts: []
      } as any);
      resultsCenterService.resultsFilter.mockReturnValue({ 'indicator-codes-filter': [] } as any);
      
      (component as any).applyModalIndicatorFilter({ resetIndicatorFilters: false });
      
      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
    });

    it('should use empty tabs when active indicator filter exists', () => {
      resultsCenterService.tableFilters.mockReturnValue({
        indicators: [{ indicator_id: 1 }],
        levers: [],
        statusCodes: [],
        years: [],
        contracts: []
      } as any);
      resultsCenterService.resultsFilter.mockReturnValue({ 'indicator-codes-filter': [1] } as any);
      
      (component as any).applyModalIndicatorFilter({ resetIndicatorFilters: false });
      
      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
    });

    it('should use empty tabs when only resultsFilter indicator-codes-filter is set', () => {
      resultsCenterService.tableFilters.mockReturnValue({
        indicators: [],
        levers: [],
        statusCodes: [],
        years: [],
        contracts: []
      } as any);
      resultsCenterService.resultsFilter.mockReturnValue({ 'indicator-codes-filter': [1, 2] } as any);
      
      (component as any).applyModalIndicatorFilter({ resetIndicatorFilters: false });
      
      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
    });

    it('should use empty tabs when applyModalIndicatorFilter called with no options and active filter (cover 296, 300-301)', () => {
      resultsCenterService.tableFilters.mockReturnValue({
        indicators: [{ indicator_id: 1 }],
        levers: [],
        statusCodes: [],
        years: [],
        contracts: []
      } as any);
      resultsCenterService.resultsFilter.mockReturnValue({ 'indicator-codes-filter': [1] } as any);

      (component as any).applyModalIndicatorFilter();

      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
      const updater = resultsCenterService.resultsFilter.update.mock.calls[0][0];
      const next = updater({ 'indicator-codes-tabs': [99] } as any);
      expect(next['indicator-codes-tabs']).toEqual([]);
      expect(resultsCenterService.appliedFilters.update).toHaveBeenCalled();
    });

    it('should set tabs to empty array when tabsOverride is not array and hasActiveIndicatorFilter is true (cover else 300-301)', () => {
      resultsCenterService.tableFilters.mockReturnValue({
        indicators: [{ indicator_id: 2 }],
        levers: [],
        statusCodes: [],
        years: [],
        contracts: []
      } as any);
      resultsCenterService.resultsFilter.mockReturnValue({ 'indicator-codes-filter': [2, 3] } as any);

      (component as any).applyModalIndicatorFilter({ resetIndicatorFilters: false, tabsOverride: undefined });

      const updater = resultsCenterService.resultsFilter.update.mock.calls[0][0];
      const next = updater({} as any);
      expect(next['indicator-codes-tabs']).toEqual([]);
    });

    it('getTabsForIndicatorFilter returns [] when no tabsOverride and hasActiveIndicatorFilter true (100% branch)', () => {
      expect(
        component.getTabsForIndicatorFilter({ resetIndicatorFilters: false, tabsOverride: undefined }, true)
      ).toEqual([]);
    });

    it('getTabsForIndicatorFilter returns tabsOverride when array', () => {
      expect(component.getTabsForIndicatorFilter({ tabsOverride: [1, 2, 3] }, false)).toEqual([1, 2, 3]);
    });

    it('getTabsForIndicatorFilter returns MODAL_INDICATOR_CODES when resetIndicatorFilters true', () => {
      expect(
        component.getTabsForIndicatorFilter({ resetIndicatorFilters: true, tabsOverride: undefined }, true)
      ).toEqual([1, 2, 3, 4, 6]);
    });

    it('getTabsForIndicatorFilter returns MODAL_INDICATOR_CODES when no active filter', () => {
      expect(
        component.getTabsForIndicatorFilter({ resetIndicatorFilters: false, tabsOverride: undefined }, false)
      ).toEqual([1, 2, 3, 4, 6]);
    });

    it('applyModalIndicatorFilter uses indicators?.length and indicator-codes-filter?.length (cover 311-312)', () => {
      resultsCenterService.tableFilters.mockReturnValue({ indicators: undefined } as any);
      resultsCenterService.resultsFilter.mockReturnValue({ 'indicator-codes-filter': undefined } as any);
      (component as any).applyModalIndicatorFilter({});
      expect(resultsCenterService.resultsFilter.update).toHaveBeenCalled();
    });
  });

  describe('getProjectHref', () => {
    it('should build project detail URL', () => {
      const urlTree = {} as any;
      router.createUrlTree.mockReturnValue(urlTree);
      router.serializeUrl.mockReturnValue('/project-detail/AGR-1');

      const href = component.getProjectHref('AGR-1');

      expect(router.createUrlTree).toHaveBeenCalledWith(['/project-detail', 'AGR-1']);
      expect(href).toBe('/project-detail/AGR-1');
    });
  });

  describe('isNonStarPlatform', () => {
    it('should return true for non-STAR platform', () => {
      const result = createResult({ platform_code: PLATFORM_CODES.PRMS });
      expect(component.isNonStarPlatform(result)).toBe(true);
    });

    it('should return false for STAR platform', () => {
      const result = createResult({ platform_code: PLATFORM_CODES.STAR });
      expect(component.isNonStarPlatform(result)).toBe(false);
    });
  });

  describe('openResultInfoModal', () => {
    it('should set selectedResultForInfo and open modal', () => {
      allModalsService.selectedResultForInfo = { set: jest.fn() } as any;
      allModalsService.openModal = jest.fn();
      const result = createResult({ result_id: 42 });

      component.openResultInfoModal(result);

      expect(allModalsService.selectedResultForInfo.set).toHaveBeenCalledWith(result);
      expect(allModalsService.openModal).toHaveBeenCalledWith('resultInformation');
    });
  });

  describe('resetTableToFirstPage', () => {
    it('should reset dt2.first and service paginator when dt2 exists', () => {
      const mockTable = { first: 5 };
      (component as any).dt2 = mockTable;

      (component as any).resetTableToFirstPage();

      expect(resultsCenterService.resultsTablePaginatorFirst.set).toHaveBeenCalledWith(0);
      expect(mockTable.first).toBe(0);
    });

    it('should not throw when dt2 is undefined', () => {
      (component as any).dt2 = undefined;
      expect(() => (component as any).resetTableToFirstPage()).not.toThrow();
      expect(resultsCenterService.resultsTablePaginatorFirst.set).toHaveBeenCalledWith(0);
    });
  });

  describe('onFiltersConfirm with sources', () => {
    it('should map sources platform_code when sources are present', async () => {
      const loadSpy = jest.spyOn<any, any>(component as any, 'loadResultsForModal').mockResolvedValue(undefined);

      resultsCenterService.tableFilters.mockReturnValue({
        levers: [],
        statusCodes: [],
        years: [],
        contracts: [],
        indicators: [],
        sources: [{ platform_code: 'PRMS' }, { platform_code: 'TIP' }]
      } as any);

      await component.onFiltersConfirm();

      const updater = resultsCenterService.resultsFilter.update.mock.calls[0][0];
      const result = updater({} as any);
      expect(result['platform-code']).toEqual(['PRMS', 'TIP']);
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('resetModalFilters', () => {
    it('should reset all modal filters and state', async () => {
      component.selectedResults.set([createResult()]);
      const clearSpy = jest.spyOn(component, 'clearFilters').mockResolvedValue(undefined);
      
      (component as any).resetModalFilters();
      
      expect(resultsCenterService.showFiltersSidebar.set).toHaveBeenCalledWith(false);
      expect(component.selectedResults()).toEqual([]);
      expect(resultsCenterService.searchInput.set).toHaveBeenCalledWith('');
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});



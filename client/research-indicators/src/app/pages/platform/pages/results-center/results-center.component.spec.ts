import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuItem } from 'primeng/api';
import ResultsCenterComponent from './results-center.component';
import { ResultsCenterService } from './results-center.service';
import { CacheService } from '../../../../shared/services/cache/cache.service';
import { ApiService } from '../../../../shared/services/api.service';
import { ActionsService } from '../../../../shared/services/actions.service';
import { GetResultsService } from '../../../../shared/services/control-list/get-results.service';
import { GetAllResultStatusService } from '@shared/services/control-list/get-all-result-status.service';
import { GetContractsService } from '@shared/services/control-list/get-contracts.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

/**
 * T-11 — full rewrite of the harness (design.md §10.2/§10.3, tasks.md T-11).
 *
 * What the OLD harness did wrong, per the Disqualifies clause (KZ-001): a
 * fabricated `ActivatedRoute` double AND a `.overrideComponent(... template:
 * '<div></div>')` call, over a hand-rolled `mockResultsCenterService` with no
 * real signals. Nothing rendered and no real state existed, so the suite
 * tested its own assertions rather than the feature.
 *
 * What this rewrite does instead:
 *  - `ResultsCenterService` is REAL (explicitly listed below so each test
 *    gets a fresh instance, mirroring `results-center.service.spec.ts`'s own
 *    DI setup — the primary exemplar for this file).
 *  - `CacheService` is REAL (not mocked) — the component tree touches many
 *    of its signals (header/nav/sidebar heights, `currentResultIsLoading`)
 *    that a partial hand-rolled double would have to guess at.
 *  - `GetAllResultStatusService`, `GetContractsService`, `GetYearsService`,
 *    `GetAllIndicatorsService`, `SourceFilterOptionsService` are REAL —
 *    resolved by `ServiceLocatorService` for the sidebar's real multiselects.
 *    Only `ApiService` (the actual HTTP boundary) is mocked; that is the
 *    correct mock boundary per the constitution ("HTTP through ApiService"),
 *    not a KZ-001 violation.
 *  - The component's own template is NEVER overridden. All four real
 *    children render: `app-indicators-tab-filter`, `app-results-center-table`
 *    (PROJECT/STATUS/etc. chips render there), `app-table-filters-sidebar`
 *    (projected into the CSS-toggled `app-section-sidebar`, so it always
 *    instantiates), `app-table-configuration`.
 *  - `initializeState`/write-effect tests use a REAL Angular `Router` via
 *    `RouterTestingHarness` (`@angular/router/testing`) — the same pattern
 *    already established in this codebase by
 *    `my-latest-results.component.spec.ts`'s "real RouterLink" describe
 *    block. This is what "re-express against the real router's resulting
 *    URL" (tasks.md T-11) means literally: `router.navigate`'s ACTUAL
 *    `createUrlTree`/`removeEmptyProps` merge runs, read back via
 *    `router.url`. The old `mockRouter.navigate` merge-simulation double is
 *    gone entirely — mixing a real `ActivatedRoute` with that simulation
 *    would double-merge (two disconnected sources of truth for "the current
 *    URL"), which is exactly what the task's Disqualifies clause warns
 *    against.
 *  - Tests that do not touch URL parsing/writing (pin toggle, my/all tab
 *    switch as a component method, etc.) use a lighter non-routed
 *    `ActivatedRoute`/`Router` double — the SAME real-`ParamMap`-via-
 *    `convertToParamMap` technique T-06/T-08 already established (this is
 *    explicitly NOT disqualified — tasks.md T-11: "what must go is the
 *    fabricated service mock, not the param map").
 */

@Component({ selector: 'app-t11-blank', template: '' })
class BlankRouteComponent {}

describe('ResultsCenterComponent', () => {
  // ---------------------------------------------------------------------
  // Shared mock-building — reused by both the lightweight (non-routed) and
  // the router-realistic (`RouterTestingHarness`) provider sets, so a mocked
  // `ApiService`/`GetResultsService`/etc. is built identically everywhere.
  // ---------------------------------------------------------------------
  let indicatorTabsLoadingSignal: ReturnType<typeof signal<boolean>>;
  let indicatorTabsListSignal: ReturnType<typeof signal<any[]>>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockGetResultsService: { fetchPaginated: jest.Mock };
  let mockActionsService: { showToast: jest.Mock };
  let mockAllModalsService: any;
  let mockCreateResultManagementService: any;

  function buildCommonProviders() {
    indicatorTabsLoadingSignal = signal(false);
    indicatorTabsListSignal = signal<any[]>([]);

    mockApiService = {
      GET_Configuration: jest.fn(),
      PATCH_Configuration: jest.fn(),
      // These four back the REAL control-list services the sidebar
      // multiselects and the component's own vocabulary-completeness
      // checks resolve through `ServiceLocatorService`/direct injection.
      // Defaulting to an empty resolved list keeps every test's baseline
      // deterministic; individual tests drive the REAL services' own
      // `.list`/`.loading` signals directly when they need specific
      // control-list content (see the D3 rendered-chip test below).
      GET_AllResultStatus: jest.fn().mockResolvedValue({ data: [] }),
      GET_FindContracts: jest.fn().mockResolvedValue({ data: { data: [] } }),
      GET_Years: jest.fn().mockResolvedValue({ data: [] }),
      GET_AllIndicators: jest.fn().mockResolvedValue({ data: [] }),
      // Exercised only on user-initiated export/PDF actions, never during
      // render — stubbed so a stray call never throws "not a function".
      GET_ResultCenterXlsx: jest.fn(),
      GET_ResultPdfReport: jest.fn(),
      indicatorTabs: {
        lazy: jest.fn().mockReturnValue({
          isLoading: indicatorTabsLoadingSignal,
          hasValue: signal(false),
          list: indicatorTabsListSignal
        })
      }
    } as unknown as jest.Mocked<ApiService>;

    mockGetResultsService = { fetchPaginated: jest.fn().mockResolvedValue({ results: [], total: 0 }) };
    mockActionsService = { showToast: jest.fn() };

    // `AllModalsService`/`CreateResultManagementService` back
    // `ResultsCenterTableComponent` (a real child rendered by this
    // component's own template). Neither is touched during render — only
    // on row-click/create-result interactions this file never drives —
    // mirroring `results-center-table.component.spec.ts`'s own mocks.
    mockAllModalsService = {
      selectedResultForInfo: signal<any>(null),
      openModal: jest.fn(),
      closeModal: jest.fn(),
      closeAllModals: jest.fn(),
      isModalOpen: jest.fn(() => ({ isOpen: false })),
      setResultInformationEntryContext: jest.fn(),
      isAnyModalOpen: jest.fn(() => false)
    };
    mockCreateResultManagementService = {
      setContractId: jest.fn(),
      setPresetFromProjectResultsTable: jest.fn(),
      setResultCreationEntryContext: jest.fn()
    };

    return [
      // Real `ResultsCenterService` — explicitly listed so TestBed gives
      // each test a FRESH instance (mirrors `results-center.service.spec.ts`).
      ResultsCenterService,
      { provide: ApiService, useValue: mockApiService },
      { provide: GetResultsService, useValue: mockGetResultsService },
      { provide: ActionsService, useValue: mockActionsService },
      { provide: AllModalsService, useValue: mockAllModalsService },
      { provide: CreateResultManagementService, useValue: mockCreateResultManagementService }
    ];
  }

  /** Baseline every test starts from: real vocabulary-completeness services idle, empty. */
  function settleControlListsToIdle(): void {
    const resultStatusService = TestBed.inject(GetAllResultStatusService);
    resultStatusService.loading.set(false);
    resultStatusService.list.set([]);
  }

  // ---------------------------------------------------------------------
  // Lightweight (non-routed) suite — every describe block that does not
  // itself prove URL parsing/writing behavior.
  // ---------------------------------------------------------------------
  let fixture: ComponentFixture<ResultsCenterComponent>;
  let component: ResultsCenterComponent;
  let resultsCenterService: ResultsCenterService;
  let cacheService: CacheService;
  /**
   * T-06/T-08 technique, explicitly preserved by tasks.md T-11 ("what must
   * go is the fabricated service mock, not the param map"): a REAL `ParamMap`
   * built by Angular's own `convertToParamMap`, not a canned `{ get: fn }`
   * stub. Used only by describe blocks that never assert on parsing/merge
   * behavior themselves (those use the router-realistic setup below).
   */
  let currentQueryParams: Record<string, string | readonly string[]>;
  let mockActivatedRoute: ActivatedRoute;
  let mockRouterSimple: { navigate: jest.Mock };

  beforeEach(async () => {
    currentQueryParams = {};
    mockActivatedRoute = {
      get snapshot() {
        const queryParamMap = convertToParamMap(currentQueryParams);
        const queryParams: Record<string, string> = {};
        for (const key of queryParamMap.keys) {
          queryParams[key] = queryParamMap.get(key) ?? '';
        }
        return { queryParamMap, queryParams };
      }
    } as unknown as ActivatedRoute;
    mockRouterSimple = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [ResultsCenterComponent],
      providers: [
        ...buildCommonProviders(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: { ...mockRouterSimple, events: new Subject<unknown>().asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsCenterComponent);
    component = fixture.componentInstance;
    resultsCenterService = TestBed.inject(ResultsCenterService);
    cacheService = TestBed.inject(CacheService);
    cacheService.dataCache.set({ user: { sec_user_id: 123 } } as any);
    settleControlListsToIdle();
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('should create', () => {
    jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize state', () => {
      const initializeStateSpy = jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);

      component.ngOnInit();

      expect(initializeStateSpy).toHaveBeenCalled();
    });
  });

  // NFR-RCU-002 layer 2 — "the layer that actually sees a server-side
  // addition" (requirements.md). Assigned to T-06 during execution. Uses the
  // real `GetAllResultStatusService` (component's own `resultStatusService`
  // field) and the real ApiService-level `indicatorTabs` double — neither
  // needs router realism, only the component's own effects rendering.
  describe('vocabulary completeness warning (NFR-RCU-002 layer 2)', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('warns naming an indicator id that has no URL slug once the indicator control list resolves', () => {
      indicatorTabsListSignal.set([{ indicator_id: 1 } as any, { indicator_id: 99 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('indicator id 99'));
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('indicator id 1 '));
    });

    // `consoleWarnSpy` also observes the REAL `ResultsCenterService`'s own
    // `onChangeList` effect, which still passes `{ allowSignalWrites: true }`
    // and triggers Angular's own deprecation `console.warn` on its first
    // successful run (design.md §7.3 documents this explicitly) — unrelated
    // background noise from a real singleton, not something the old
    // fabricated `GetAllResultStatusService`/`ApiService` doubles could ever
    // produce. Every assertion below therefore checks specifically for the
    // NFR-RCU-002 `'[results-center-url]'`-prefixed warning, not "nothing
    // was ever warned".
    function ourVocabularyWarnings(): string[] {
      return consoleWarnSpy.mock.calls.map(call => String(call[0])).filter(message => message.includes('[results-center-url]'));
    }

    it('does not warn about the synthetic "All Indicators" id 0 row', () => {
      indicatorTabsListSignal.set([{ indicator_id: 0 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(ourVocabularyWarnings()).toHaveLength(0);
    });

    it('does not warn while the indicator control list is still loading', () => {
      indicatorTabsLoadingSignal.set(true);
      indicatorTabsListSignal.set([{ indicator_id: 99 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(ourVocabularyWarnings()).toHaveLength(0);
    });

    it('warns only once per indicator id across repeated resolutions', () => {
      indicatorTabsListSignal.set([{ indicator_id: 99 } as any]);
      fixture.detectChanges();
      TestBed.flushEffects();
      indicatorTabsListSignal.set([{ indicator_id: 99 } as any, { indicator_id: 1 } as any]);
      fixture.detectChanges();
      TestBed.flushEffects();

      const warningsForId99 = consoleWarnSpy.mock.calls.filter(call => String(call[0]).includes('indicator id 99'));
      expect(warningsForId99).toHaveLength(1);
    });

    it('warns naming a status id that has no URL slug once the status control list resolves', () => {
      const resultStatusService = TestBed.inject(GetAllResultStatusService);
      resultStatusService.list.set([{ result_status_id: 2 } as any, { result_status_id: 999 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('status id 999'));
    });

    it('does not warn while the status control list is still loading', () => {
      const resultStatusService = TestBed.inject(GetAllResultStatusService);
      resultStatusService.loading.set(true);
      resultStatusService.list.set([{ result_status_id: 999 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(ourVocabularyWarnings()).toHaveLength(0);
    });
  });

  describe('ngOnDestroy', () => {
    it('should deactivate persistence and hide sidebars', () => {
      jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
      fixture.detectChanges();
      resultsCenterService.showFiltersSidebar.set(true);
      resultsCenterService.showConfigurationsSidebar.set(true);

      component.ngOnDestroy();

      expect(resultsCenterService.activeStateKey()).toBeNull();
      expect(resultsCenterService.showFiltersSidebar()).toBe(false);
      expect(resultsCenterService.showConfigurationsSidebar()).toBe(false);
    });
  });

  describe('orderedFilterItems', () => {
    it('should return correct order when pinned tab is my', () => {
      component.pinnedTab.set('my');

      const result = component.orderedFilterItems();

      expect(result).toEqual([
        { id: 'my', label: 'My Results' },
        { id: 'all', label: 'All Results' }
      ]);
    });

    it('should return correct order when pinned tab is all', () => {
      component.pinnedTab.set('all');

      const result = component.orderedFilterItems();

      expect(result).toEqual([
        { id: 'all', label: 'All Results' },
        { id: 'my', label: 'My Results' }
      ]);
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle showSignal', () => {
      const initialValue = component.showSignal();

      component.toggleSidebar();

      expect(component.showSignal()).toBe(!initialValue);
    });
  });

  describe('applyFilters', () => {
    it('should call resultsCenterService.applyFilters', () => {
      const applyFiltersSpy = jest.spyOn(resultsCenterService, 'applyFilters');
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);

      component.applyFilters();

      expect(applyFiltersSpy).toHaveBeenCalled();
    });
  });

  describe('loadPinnedTabPreference', () => {
    it('should resolve all when all is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '1', self: '0' } } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve my when self is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '0', self: '1' } } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('my');
      expect(component.pinnedTab()).toBe('my');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve all when no tab is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '0', self: '0' } } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve all when no response data', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({} as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    // Reviewer fix (attempt 2, reliability lens) — FIX 2b, carried forward.
    it("should resolve to 'all' when GET_Configuration rejects", async () => {
      mockApiService.GET_Configuration.mockRejectedValue(new Error('config unavailable'));

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });
  });

  describe('onActiveItemChange', () => {
    it('should handle my tab selection and preserve search input', () => {
      const event: MenuItem = { id: 'my', label: 'My Results' };
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      const cleanFiltersSpy = jest.spyOn(resultsCenterService, 'cleanFilters');
      resultsCenterService.searchInput.set('ABC');

      component.onActiveItemChange(event);

      expect(loadMyResultsSpy).toHaveBeenCalled();
      expect(cleanFiltersSpy).toHaveBeenCalled();
      expect(resultsCenterService.searchInput()).toBe('ABC');
    });

    it('should handle all tab selection and preserve search input', () => {
      const event: MenuItem = { id: 'all', label: 'All Results' };
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults').mockImplementation();
      const cleanFiltersSpy = jest.spyOn(resultsCenterService, 'cleanFilters');
      resultsCenterService.searchInput.set('test search');

      component.onActiveItemChange(event);

      expect(loadAllResultsSpy).toHaveBeenCalled();
      expect(cleanFiltersSpy).toHaveBeenCalled();
      expect(resultsCenterService.searchInput()).toBe('test search');
    });

    // D-URL-15 / R3-1 regression guard: the userFilterMutations increment for
    // the my/all tab switch must go through THIS component handler —
    // asserted here by calling the handler directly, not by calling
    // `ResultsCenterService.onActiveItemChange` (which has no production
    // caller and would pass on dead code).
    it('should advance userFilterMutations exactly once', () => {
      const event: MenuItem = { id: 'my', label: 'My Results' };
      jest.spyOn(component, 'loadMyResults').mockImplementation();
      const before = resultsCenterService.userFilterMutations();

      component.onActiveItemChange(event);

      expect(resultsCenterService.userFilterMutations()).toBe(before + 1);
    });

    // T-11 done-check — R3-1's rendered half. `results-center.component.html:14`
    // binds `(click)="onActiveItemChange(item)"` on the tab-strip row; this
    // drives that binding through a real DOM click rather than calling the
    // handler directly, proving the template wiring itself (the old harness's
    // `.overrideComponent(... template: '<div></div>')` made this structurally
    // impossible — see tasks.md T-11's "R3-1 guard is completed here" note).
    it('advances userFilterMutations through a REAL rendered click on the tab strip (R3-1, rendered)', () => {
      jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
      // Neutralize the resulting fetch so the click's real handler body
      // (cleanFilters + loadAllResults/loadMyResults + main()) does not need
      // a full results round-trip for this DOM-focused assertion.
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);
      fixture.detectChanges();
      TestBed.flushEffects();

      const before = resultsCenterService.userFilterMutations();

      const tabRows = fixture.nativeElement.querySelectorAll('[class*="cursor-pointer"]');
      expect(tabRows.length).toBeGreaterThan(0);
      const firstTabRow = tabRows[0] as HTMLElement;

      firstTabRow.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(resultsCenterService.userFilterMutations()).toBe(before + 1);
    });
  });

  describe('loadMyResults', () => {
    it('should update results filter and applied filters and call main', () => {
      const mainSpy = jest.spyOn(resultsCenterService, 'main');

      component.loadMyResults();

      expect(resultsCenterService.myResultsFilterItem()).toEqual(resultsCenterService.myResultsFilterItems[1]);
      expect(resultsCenterService.resultsFilter()).toEqual({
        'create-user-codes': ['123'],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(mainSpy).toHaveBeenCalled();
    });

    it('should preserve indicator-codes-tabs when switching', () => {
      resultsCenterService.resultsFilter.set({
        ...resultsCenterService.resultsFilter(),
        'indicator-codes-tabs': [5]
      });
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);

      component.loadMyResults();

      expect(resultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([5]);
      expect(resultsCenterService.appliedFilters()['indicator-codes-tabs']).toEqual([5]);
    });

    it('should default to empty array when indicator-codes-tabs is undefined', () => {
      resultsCenterService.resultsFilter.set({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': []
      } as any);
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);

      component.loadMyResults();

      expect(resultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });

    // T-05 §Acceptance item 2 / design.md §6.2 "must not increment" column:
    // loadMyResults is also reached from the read path (seedFromUrl), so a
    // bump added here would re-open R2-5.
    it('should not advance userFilterMutations', () => {
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);
      const before = resultsCenterService.userFilterMutations();

      component.loadMyResults();

      expect(resultsCenterService.userFilterMutations()).toBe(before);
    });
  });

  describe('loadAllResults', () => {
    it('should update results filter and applied filters and call main', () => {
      const mainSpy = jest.spyOn(resultsCenterService, 'main');

      component.loadAllResults();

      expect(resultsCenterService.myResultsFilterItem()).toEqual(resultsCenterService.myResultsFilterItems[0]);
      expect(resultsCenterService.resultsFilter()).toEqual({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(mainSpy).toHaveBeenCalled();
    });

    it('should preserve indicator-codes-tabs when switching', () => {
      resultsCenterService.resultsFilter.set({
        ...resultsCenterService.resultsFilter(),
        'indicator-codes-tabs': [3]
      });
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);

      component.loadAllResults();

      expect(resultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([3]);
      expect(resultsCenterService.appliedFilters()['indicator-codes-tabs']).toEqual([3]);
    });

    it('should default to empty array when indicator-codes-tabs is undefined', () => {
      resultsCenterService.resultsFilter.set({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': []
      } as any);
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);

      component.loadAllResults();

      expect(resultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });

    // T-05 §Acceptance item 2 / design.md §6.2 "must not increment" column:
    // loadAllResults is also reached from the read path (seedFromUrl), so a
    // bump added here would re-open R2-5.
    it('should not advance userFilterMutations', () => {
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);
      const before = resultsCenterService.userFilterMutations();

      component.loadAllResults();

      expect(resultsCenterService.userFilterMutations()).toBe(before);
    });
  });

  describe('togglePin', () => {
    // `jest.useFakeTimers()` is scoped to just this describe block — it must
    // never leak into the router-realistic describes below, whose
    // `RouterTestingHarness` navigation relies on real timer/microtask
    // scheduling.
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(resultsCenterService, 'main').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should pin all tab when toggling from my', async () => {
      component.pinnedTab.set('my');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const cleanMultiselectsSpy = jest.spyOn(resultsCenterService, 'cleanMultiselects');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: true, self: false });
      expect(component.pinnedTab()).toBe('all');
      expect(resultsCenterService.myResultsFilterItem()).toEqual(resultsCenterService.myResultsFilterItems[0]);
      expect(cleanMultiselectsSpy).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Results',
        detail: 'All Results tab pinned successfully'
      });
    });

    it('should pin my tab when toggling from all', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');
      const cleanMultiselectsSpy = jest.spyOn(resultsCenterService, 'cleanMultiselects');

      await component.togglePin('my');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: false, self: true });
      expect(component.pinnedTab()).toBe('my');
      expect(resultsCenterService.myResultsFilterItem()).toEqual(resultsCenterService.myResultsFilterItems[1]);
      expect(cleanMultiselectsSpy).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Results',
        detail: 'My Results tab pinned successfully'
      });
    });

    // D-URL-15 / R3-1 regression guard: the pin toggle is a component-owned
    // user-facing mutation — asserted through this handler.
    it('should advance userFilterMutations exactly once', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');
      const before = resultsCenterService.userFilterMutations();

      await component.togglePin('my');
      jest.runAllTimers();

      expect(resultsCenterService.userFilterMutations()).toBe(before + 1);
    });

    it('should unpin tab when toggling same tab', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const cleanMultiselectsSpy = jest.spyOn(resultsCenterService, 'cleanMultiselects');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: true, self: false });
      expect(component.pinnedTab()).toBe('all');
      expect(cleanMultiselectsSpy).toHaveBeenCalled();
    });

    it('should handle error when API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockApiService.PATCH_Configuration.mockRejectedValue(new Error('API Error'));
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const before = resultsCenterService.userFilterMutations();

      await component.togglePin('all');
      jest.runAllTimers();

      expect(consoleSpy).toHaveBeenCalledWith('Error updating pinned tab:', expect.any(Error));
      expect(mockActionsService.showToast).toHaveBeenCalled();
      expect(component.loadingPin()).toBe(false);
      // Reviewer fix (attempt 2): the bump lives after the state mutation,
      // inside the success branch — a rejected PATCH_Configuration never
      // reaches it.
      expect(resultsCenterService.userFilterMutations()).toBe(before);

      consoleSpy.mockRestore();
    });
  });

  describe('isPinned', () => {
    it('should return true when tab is pinned', () => {
      component.pinnedTab.set('my');

      expect(component.isPinned('my')).toBe(true);
    });

    it('should return false when tab is not pinned', () => {
      component.pinnedTab.set('my');

      expect(component.isPinned('all')).toBe(false);
    });
  });

  describe('onPinIconClick', () => {
    it('should stop event propagation and call togglePin', () => {
      const event = new Event('click');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
      const togglePinSpy = jest.spyOn(component, 'togglePin').mockResolvedValue();

      component.onPinIconClick('all', event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(togglePinSpy).toHaveBeenCalledWith('all');
    });
  });

  // =========================================================================
  // Router-realistic suites — real Angular `Router`/`ActivatedRoute` via
  // `RouterTestingHarness`. Each of these describe blocks resets and
  // reconfigures `TestBed` in its OWN `beforeEach` (same pattern
  // `my-latest-results.component.spec.ts` already established for its
  // "real RouterLink" suite) because `provideRouter` cannot coexist with the
  // lightweight `{ provide: Router/ActivatedRoute, useValue: ... }` doubles
  // configured in the outer `beforeEach` above.
  // =========================================================================

  describe('initializeState', () => {
    let harness: RouterTestingHarness;
    let router: Router;
    let rcService: ResultsCenterService;

    async function navigateTo(query: string): Promise<ResultsCenterComponent> {
      const routedComponent = await harness.navigateByUrl(`/${query}`, ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      return routedComponent;
    }

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        providers: [
          ...buildCommonProviders(),
          provideRouter([
            { path: '', component: ResultsCenterComponent },
            { path: 'blank', component: BlankRouteComponent }
          ])
        ]
      }).compileComponents();

      rcService = TestBed.inject(ResultsCenterService);
      const cache = TestBed.inject(CacheService);
      cache.dataCache.set({ user: { sec_user_id: 123 } } as any);
      settleControlListsToIdle();

      router = TestBed.inject(Router);
      harness = await RouterTestingHarness.create();
    });

    // --- No recognized parameter (R-RCU-004 AC.2 / AC.3) — unchanged path ---

    it('should restore persisted state and call main when there is no recognized parameter', async () => {
      sessionStorage.setItem(
        'results-center-view-state:results-center',
        JSON.stringify({
          myResultsFilterItemId: 'all',
          tableFilters: {},
          resultsFilter: { 'create-user-codes': [] },
          appliedFilters: { 'create-user-codes': [] },
          searchInput: '',
          primaryContractId: null,
          resultsTablePaginatorFirst: 0,
          resultsTablePaginatorRows: 10,
          resultsTableSortField: 'result_official_code',
          resultsTableSortOrder: -1
        })
      );
      const restoreSpy = jest.spyOn(rcService, 'restorePersistedState');
      const seedFromUrlSpy = jest.spyOn(rcService, 'seedFromUrl');

      await navigateTo('');

      expect(rcService.primaryContractId()).toBeNull();
      expect(rcService.showFiltersSidebar()).toBe(false);
      expect(rcService.showConfigurationsSidebar()).toBe(false);
      expect(restoreSpy).toHaveBeenCalledWith('results-center');
      expect(restoreSpy).toHaveReturnedWith(true);
      expect(rcService.activeStateKey()).toBe('results-center');
      // NOTE (T-11 finding, not fixed here — out of authorized scope): the
      // real `app-results-center-table` renders a `p-table [lazy]="true"`
      // with PrimeNG's default `lazyLoadOnInit=true`, which independently
      // fires `onLazyLoad` -> `ResultsCenterService.main()` during the
      // table's own `ngOnInit`, BEFORE `initializeState()`'s async chain
      // settles. This is invisible to the old template-overridden harness
      // and pre-exists this spec. See the task report's "Not Done /
      // Assumptions" section. This path never seeds (no recognized
      // parameter present), so there is no seeded fetch for AC.4 to own
      // here. (Reviewer fix, attempt 2, issue 1 — the previous version of
      // this comment claimed `mockGetResultsService.fetchPaginated` "is
      // asserted below instead of `main()`'s call count"; it never was.
      // The seeded-request count belongs to, and is now asserted on, the
      // read-path test that actually seeds — `?contract=A100`, below —
      // against `mockGetResultsService.fetchPaginated` directly.)
      expect(seedFromUrlSpy).not.toHaveBeenCalled();
    });

    it('should load my results when no restored state and preferred tab is my', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '0', self: '1' } } as any);

      const component = await navigateTo('');

      expect(component.pinnedTab()).toBe('my');
      expect(rcService.myResultsFilterItem()).toEqual(rcService.myResultsFilterItems[1]);
      expect(rcService.resultsFilter()['create-user-codes']).toEqual(['123']);
    });

    it('should load all results when no restored state and preferred tab is all', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '1', self: '0' } } as any);
      const mainSpy = jest.spyOn(rcService, 'main');

      const component = await navigateTo('');

      expect(component.pinnedTab()).toBe('all');
      expect(rcService.myResultsFilterItem()).toEqual(rcService.myResultsFilterItems[0]);
      // See the shared NOTE above ("should restore persisted state...") on
      // why this is `toHaveBeenCalled()` rather than a specific count.
      expect(mainSpy).toHaveBeenCalled();
    });

    it('should restore persisted state when an unrecognized parameter alone (?utm_source) is present (R-RCU-004 AC.3)', async () => {
      sessionStorage.setItem(
        'results-center-view-state:results-center',
        JSON.stringify({
          myResultsFilterItemId: 'all',
          tableFilters: {},
          resultsFilter: { 'create-user-codes': [] },
          appliedFilters: { 'create-user-codes': [] },
          searchInput: '',
          primaryContractId: null,
          resultsTablePaginatorFirst: 0,
          resultsTablePaginatorRows: 10,
          resultsTableSortField: 'result_official_code',
          resultsTableSortOrder: -1
        })
      );
      const restoreSpy = jest.spyOn(rcService, 'restorePersistedState');
      const seedFromUrlSpy = jest.spyOn(rcService, 'seedFromUrl');
      const mainSpy = jest.spyOn(rcService, 'main');

      await navigateTo('?utm_source=email');

      expect(restoreSpy).toHaveBeenCalledWith('results-center');
      expect(restoreSpy).toHaveReturnedWith(true);
      expect(seedFromUrlSpy).not.toHaveBeenCalled();
      expect(mainSpy).toHaveBeenCalled();
    });

    // --- Recognized canonical/legacy parameter (R-RCU-002/004/005/006) ---

    // R-RCU-002 AC.3 — state parity across ALL THREE signals is asserted,
    // not just the API payload (the AC's own wording). This is the D3 test.
    it('should seed from a canonical parameter into all three state signals, suppress restore, and NOT touch the URL', async () => {
      const restoreSpy = jest.spyOn(rcService, 'restorePersistedState');
      const seedFromUrlSpy = jest.spyOn(rcService, 'seedFromUrl');
      const mainSpy = jest.spyOn(rcService, 'main');
      // Reviewer fix (attempt 2, issue 3) — the spy MUST be installed BEFORE
      // the navigation it observes. `RouterTestingHarness.navigateByUrl` runs
      // change detection internally, so the write effect's mandatory first
      // run already executes during `navigateTo(...)` below; a spy attached
      // afterward is blind to exactly the case this test names in its own
      // title ("...and NOT touch the URL") for the canonical-parameter deep
      // link — the CapDev journey this spec exists for.
      const navigateSpy = jest.spyOn(router, 'navigate');

      await navigateTo('?contract=A100');

      expect(restoreSpy).not.toHaveBeenCalled();
      expect(rcService.activeStateKey()).toBe('results-center');
      // State parity — resultsFilter, appliedFilters AND tableFilters.
      expect(rcService.resultsFilter()['contract-codes']).toEqual(['A100']);
      expect(rcService.appliedFilters()['contract-codes']).toEqual(['A100']);
      expect(rcService.tableFilters().contracts).toEqual([{ agreement_id: 'A100' }]);
      expect(rcService.myResultsFilterItem()?.id).toBe('all');
      expect(seedFromUrlSpy).toHaveBeenCalled();
      expect(mainSpy).toHaveBeenCalled();
      // R-RCU-002 AC.4, amended (Reviewer fix, attempt 2, issue 1) — "the URL
      // read path issues exactly one results request for the initial load,
      // and it is seeded before it fires." Counted at the TRUE boundary
      // (`GetResultsService.fetchPaginated`, the call requirements.md's own
      // "How verified" wording targets), not at `main()` — which the real
      // `app-results-center-table`'s unrelated `lazyLoadOnInit` fetch
      // inflates (see the shared NOTE on the sibling "no recognized
      // parameter" test above) and not by comparing only the LAST `main()`
      // call order, which cannot detect a second stray seeded fetch or the
      // read path fetching unfiltered and then re-fetching (R-RCU-002's own
      // forbidden scenario). The table's own init fetch is unambiguously
      // distinguishable from the seeded one: it always carries an EMPTY
      // `contract-codes`, because `seedFromUrl` invalidates the fetch dedupe
      // key the instant it runs, so the seeded call can never be silently
      // absorbed into (or duplicated from) the table's own unfiltered one.
      const fetchCalls = mockGetResultsService.fetchPaginated.mock.calls;
      const seededFetchIndices = fetchCalls
        .map((call, index) => ({ call, index }))
        .filter(({ call }) => ((call[0] as any)['contract-codes'] ?? []).includes('A100'))
        .map(({ index }) => index);
      const unseededFetchIndices = fetchCalls
        .map((call, index) => ({ call, index }))
        .filter(({ call }) => !((call[0] as any)['contract-codes'] ?? []).includes('A100'))
        .map(({ index }) => index);
      expect(seededFetchIndices).toHaveLength(1); // AC.4 "exactly one"
      // AC.4's other half — "never by fetching unfiltered and then
      // re-fetching". The real `app-results-center-table`'s own
      // `lazyLoadOnInit` fetch is a separate, pre-existing, out-of-scope
      // contributor (D-URL-17) that fires unseeded exactly once in this
      // harness — tolerated, not owned. Bounding the UNSEEDED bucket at
      // that single tolerated call (rather than asserting a whole-page
      // total) is what proves the READ PATH ITSELF never adds a second,
      // extra unfiltered fetch of its own before seeding: if it did, this
      // bucket would grow to 2 even though the seeded bucket above stays
      // at a deceptive 1.
      expect(unseededFetchIndices.length).toBeLessThanOrEqual(1);
      // AC.4 "seeded before it fires" — the unseeded (table-owned) call, if
      // any occurred, precedes the seeded (read-path-owned) call; never the
      // reverse, and never fetch-unfiltered-then-refetch-seeded twice.
      if (unseededFetchIndices.length > 0) {
        expect(Math.max(...unseededFetchIndices)).toBeLessThan(seededFetchIndices[0]);
      }
      // Hand-off 4 (T-04 review) — stale cross-route lever/indicator selections
      // must not survive a deep link that names neither.
      expect(rcService.tableFilters().levers).toEqual([]);
      expect(rcService.tableFilters().indicators).toEqual([]);
      // Hand-off 3 (T-04 review) — page resets to 1 for the new filter.
      expect(rcService.resultsTablePaginatorFirst()).toBe(0);
      // T-08 removed the legacy+tab wipe — seeding never advances
      // userFilterMutations, so the write effect's entry guard means the
      // router is touched zero times.
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(router.url).toBe('/?contract=A100');
      expect(mockActionsService.showToast).not.toHaveBeenCalled();
    });

    // Reviewer fix (attempt 2, precedence lens) — FIX 1. `seedFromUrl`
    // deliberately never writes `tableFilters.indicators` (design §7.2), so a
    // stale value left by a previous route must be cleared by the component.
    it('should clear a stale tableFilters.indicators inherited from another route on a deep link that names no indicator', async () => {
      rcService.tableFilters.set({
        indicators: [{ indicator_id: 42 }],
        statusCodes: [],
        sources: [],
        contracts: [],
        levers: [{ id: 7 }],
        years: []
      } as any);

      await navigateTo('?contract=A100');

      expect(rcService.tableFilters().indicators).toEqual([]);
      expect(rcService.tableFilters().levers).toEqual([]);
    });

    it('should resolve the scope from `tab` when present and combine it with another filter, still resolving the pinned preference as fallback only (R-RCU-002 AC.7)', async () => {
      // Resolve the pinned preference to a DIFFERENT value ('all') to prove
      // `urlScope`, not the preference, decided the scope.
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '1', self: '0' } } as any);

      await navigateTo('?tab=my&contract=A100');

      expect(rcService.myResultsFilterItem()?.id).toBe('my');
      expect(rcService.resultsFilter()['contract-codes']).toEqual(['A100']);
    });

    // Reviewer fix (attempt 2, precedence lens) — FIX 4 regression guard: a
    // lone `?tab=my` is the one deliberate behavior change versus the base
    // revision (session restore suppressed).
    it('should suppress restore and seed an empty filter set for a lone `?tab=my` deep link (R2-5)', async () => {
      const restoreSpy = jest.spyOn(rcService, 'restorePersistedState');

      await navigateTo('?tab=my');

      expect(restoreSpy).not.toHaveBeenCalled();
      expect(rcService.myResultsFilterItem()?.id).toBe('my');
      expect(rcService.resultsFilter()['contract-codes']).toEqual([]);
      expect(rcService.resultsFilter()['status-codes']).toEqual([]);
    });

    it('should resolve the scope from the pinned-tab preference when `tab` is absent (R-RCU-002 AC.6)', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '0', self: '1' } } as any);

      await navigateTo('?contract=A100');

      expect(rcService.myResultsFilterItem()?.id).toBe('my');
      expect(rcService.resultsFilter()['contract-codes']).toEqual(['A100']);
    });

    it('should resolve a legacy indicatorTab through the codec, seed it, and NOT touch the URL', async () => {
      const navigateSpy = jest.spyOn(router, 'navigate');

      await navigateTo('?indicatorTab=1');

      expect(rcService.resultsFilter()['indicator-codes-tabs']).toEqual([1]);
      expect(rcService.myResultsFilterItem()?.id).toBe('all');
      // Arriving on a legacy link is still just seeding (never a
      // user-facing mutation), so the write effect's entry guard keeps
      // `router.navigate` at zero.
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should resolve a legacy statusTab through the codec and ignore statusLabel (R-RCU-006 AC.3)', async () => {
      await navigateTo('?statusTab=2&statusLabel=Submitted');

      expect(rcService.resultsFilter()['status-codes']).toEqual([2]);
    });

    it('should let the canonical `indicator` win over a legacy `indicatorTab` deterministically (R-RCU-006 AC.2)', async () => {
      await navigateTo('?indicatorTab=1&indicator=policy-change');

      expect(rcService.resultsFilter()['indicator-codes-tabs']).toEqual([4]);
    });

    // --- R-RCU-005 — invalid input degrades to a usable page ---

    it('should apply the valid contract filter and drop the invalid indicator, showing one toast (bad-token scenario)', async () => {
      await navigateTo('?indicator=not-a-real-indicator&contract=A100');

      expect(rcService.resultsFilter()['contract-codes']).toEqual(['A100']);
      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
    });

    it('should render the unfiltered page with a toast and NOT fall through to restore for a wholly invalid link (R-RCU-005 second scenario)', async () => {
      const restoreSpy = jest.spyOn(rcService, 'restorePersistedState');
      const mainSpy = jest.spyOn(rcService, 'main');

      await navigateTo('?indicator=not-a-real-indicator');

      expect(restoreSpy).not.toHaveBeenCalled();
      expect(rcService.resultsFilter()['contract-codes']).toEqual([]);
      expect(mainSpy).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
    });

    it('should fire the toast exactly once no matter how many tokens were dropped', async () => {
      await navigateTo('?indicator=not-a-real-indicator&status=also-bad,and-this-too');

      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
    });

    it('shows the dropped-token toast without ever touching the router during init', async () => {
      const navigateSpy = jest.spyOn(router, 'navigate');

      await navigateTo('?indicator=not-a-real-indicator&contract=A100');

      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should never let a dropped token’s raw value reach the toast (markup cannot alter its rendering)', async () => {
      await navigateTo(`?status=${encodeURIComponent('<script>alert(1)</script>')}`);

      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
      const toastArg = mockActionsService.showToast.mock.calls[0][0];
      expect(`${toastArg.summary} ${toastArg.detail}`).not.toContain('<script>alert(1)</script>');
      expect(`${toastArg.summary} ${toastArg.detail}`).not.toContain('<script>');
    });

    // --- R2-5 — zero router.navigate on parameter-less restore, honoured again next load ---

    it('fires zero router.navigate on a parameter-less visit that restores persisted state, honoured again on the next load (R2-5)', async () => {
      sessionStorage.setItem(
        'results-center-view-state:results-center',
        JSON.stringify({
          myResultsFilterItemId: 'all',
          tableFilters: {},
          resultsFilter: { 'create-user-codes': [] },
          appliedFilters: { 'create-user-codes': [] },
          searchInput: '',
          primaryContractId: null,
          resultsTablePaginatorFirst: 0,
          resultsTablePaginatorRows: 10,
          resultsTableSortField: 'result_official_code',
          resultsTableSortOrder: -1
        })
      );
      const restoreSpy = jest.spyOn(rcService, 'restorePersistedState');
      const navigateSpy = jest.spyOn(router, 'navigate');

      const component = await navigateTo('');
      TestBed.flushEffects();
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalledTimes(1);

      // Next load — nothing about the first visit may disable restore.
      await (component as any).initializeState();
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalledTimes(2);
    });

    // Same hazard, evidenced end-to-end through the read path: a rejecting
    // preference lookup must still seed and fetch from the URL alone.
    it('should still seed and fetch from the URL when the pinned-tab preference lookup rejects', async () => {
      // Zone.js's own unhandled-rejection detector flags a rejected promise
      // the instant it rejects, before `await`'s own continuation has a
      // chance to attach its handler — a well-known false positive,
      // independent of whether `loadPinnedTabPreference`'s `try/catch`
      // genuinely handles it (it does; see the `loadPinnedTabPreference`
      // describe block's own dedicated test for that). Attaching a no-op
      // `.catch` to the SAME promise object immediately satisfies Zone's
      // detector without changing what the real `await` below observes —
      // multiple handlers can attach to one promise.
      mockApiService.GET_Configuration.mockImplementationOnce(() => {
        const rejected = Promise.reject(new Error('config unavailable'));
        rejected.catch(() => undefined);
        return rejected;
      });
      const mainSpy = jest.spyOn(rcService, 'main');

      await navigateTo('?contract=A100');

      expect(mockApiService.GET_Configuration).toHaveBeenCalledTimes(1);
      expect(rcService.resultsFilter()['contract-codes']).toEqual(['A100']);
      expect(mainSpy).toHaveBeenCalled();
    });

    // R-RCU-002 AC.3 (D3), rendered half — chip assertion taken AFTER the
    // control lists resolve (design §7.2's documented transient). This is
    // the one test authorized to drive the REAL `GetContractsService`
    // directly — matching production where a resolved control list backfills
    // the seeded `{ agreement_id }`-only entry with its full row.
    it('renders a PROJECT chip for a seeded contract filter once the contracts control list resolves (D3, rendered)', async () => {
      await navigateTo('?contract=A100');

      const contractsService = TestBed.inject(GetContractsService);
      contractsService.list.set([
        { agreement_id: 'A100', display_label: 'A100 - Test Project', select_label: 'A100 - Test Project', description: 'Test Project' } as any
      ]);
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      harness.fixture.detectChanges();

      // Reviewer fix (attempt 2, issue 4) — scoped to the ACTUAL chip
      // container (`results-center-table.component.html:45`, inside the
      // `getActiveFiltersExcludingIndicatorTab()` loop), not a
      // `querySelectorAll('span')` over the whole tree. An unscoped query
      // over the whole tree is satisfied by the sidebar multiselect's own
      // `select_label: 'A100 - Test Project'` — set on the SAME fixture
      // above — without any chip ever rendering, which is exactly what made
      // the previous assertion pass regardless of whether the chip existed.
      const tableHost = harness.fixture.nativeElement.querySelector('app-results-center-table') as HTMLElement | null;
      expect(tableHost).toBeTruthy();
      const chipContainer = tableHost!.querySelector('div.mt-3.mb-1.items-center') as HTMLElement | null;
      expect(chipContainer).toBeTruthy();
      const chipLabels = Array.from(chipContainer!.querySelectorAll('span.text-sm')).map(
        (el: any) => (el.textContent as string)?.trim()
      );
      // R-RCU-002's CapDev scenario, verbatim: "the filter sidebar shows a
      // PROJECT: A100 chip" — exactly one chip, carrying its label.
      expect(chipLabels).toHaveLength(1);
      expect(chipLabels[0]).toBe('Project: A100 - Test Project');
    });

    // -------------------------------------------------------------------
    // D-URL-18 — READ path for the sidebar indicator multiselect.
    //
    // Its sibling above ("should seed from a canonical parameter…") seeds
    // via `?indicator=`, which lands on the TAB. Nothing in this describe
    // block reached `indicator-codes-filter` at all before this test, which
    // is why a deep link could not carry the sidebar's indicator selection.
    // -------------------------------------------------------------------
    it('seeds the sidebar multiselect from ?indicators= without touching the tab (D-URL-18)', async () => {
      await navigateTo('?indicators=capacity-sharing-for-development,policy-change');

      // The multiselect's wire key, order preserved.
      expect(rcService.resultsFilter()['indicator-codes-filter']).toEqual([1, 4]);
      expect(rcService.appliedFilters()['indicator-codes-filter']).toEqual([1, 4]);

      // The TAB stays empty — otherwise the sidebar control `@if`-vanishes
      // and the user cannot see or clear the filter that is being applied.
      expect(rcService.resultsFilter()['indicator-codes-tabs']).toEqual([]);

      // D-URL-10 — value key ONLY. Seeding `name` here would freeze the
      // seeded string as the chip label forever, because
      // `MultiselectComponent` backfills labels only for items MISSING the
      // label key.
      expect(rcService.tableFilters().indicators).toEqual([
        { indicator_id: 1 },
        { indicator_id: 4 }
      ]);
      for (const seeded of rcService.tableFilters().indicators) {
        expect(Object.hasOwn(seeded, 'name')).toBe(false);
      }
    });

    it('lets a tab deep link suppress a stale ?indicators= in the same URL (D-URL-18)', async () => {
      await navigateTo('?indicator=oicr&indicators=policy-change');

      expect(rcService.resultsFilter()['indicator-codes-tabs']).toEqual([5]);
      expect(rcService.resultsFilter()['indicator-codes-filter']).toEqual([]);
      expect(rcService.tableFilters().indicators).toEqual([]);
    });

    it('renders an INDICATOR chip for a seeded multiselect once its control list resolves (D3, rendered, D-URL-18)', async () => {
      await navigateTo('?indicators=capacity-sharing-for-development');

      // The label must arrive from the control list, never from the URL —
      // the same proof the PROJECT chip test above demands.
      rcService.tableFilters.update(prev => ({
        ...prev,
        indicators: prev.indicators.map(i => ({ ...i, name: 'Capacity Sharing for Development' }))
      }));
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      harness.fixture.detectChanges();

      const tableHost = harness.fixture.nativeElement.querySelector('app-results-center-table') as HTMLElement | null;
      expect(tableHost).toBeTruthy();
      const chipContainer = tableHost!.querySelector('div.mt-3.mb-1.items-center') as HTMLElement | null;
      expect(chipContainer).toBeTruthy();
      const chipLabels = Array.from(chipContainer!.querySelectorAll('span.text-sm')).map(
        (el: any) => (el.textContent as string)?.trim()
      );
      expect(chipLabels).toHaveLength(1);
      // No "Indicator: " prefix — `getFilterDisplayText`
      // (`results-center-table.component.ts:127-132`) prefixes ONLY the
      // PROJECT chip and renders every other chip's bare value. This matches
      // the reported screenshot, where the chip read exactly this string.
      expect(chipLabels[0]).toBe('Capacity Sharing for Development');
      // The label came from the control-list backfill, never from the URL:
      // the slug in the address bar is kebab-case and lower-case, so a chip
      // reading the URL token verbatim would render
      // "capacity-sharing-for-development" instead.
      expect(chipLabels[0]).not.toContain('-');
    });
  });

  // T-07 — indicator tab-strip sync effect (design.md §7.3, requirements.md
  // R-RCU-002 CapDev scenario / AC.3). The "All Indicators" id-0 row plus TWO
  // other distinct indicator ids are present in every fixture below (KZ-004):
  // a list of one tab cannot distinguish "activates the right tab" from
  // "activates every tab", so each assertion checks that EXACTLY one tab is
  // `active` and that it is the right one.
  describe('indicator tab-strip sync effect (T-07)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        providers: [
          ...buildCommonProviders(),
          provideRouter([
            { path: '', component: ResultsCenterComponent },
            { path: 'blank', component: BlankRouteComponent }
          ])
        ]
      }).compileComponents();

      const cache = TestBed.inject(CacheService);
      cache.dataCache.set({ user: { sec_user_id: 123 } } as any);
      settleControlListsToIdle();

      harness = await RouterTestingHarness.create();
    });

    it('activates the right tab on a first visit (deep link, design §7.3)', async () => {
      indicatorTabsListSignal.set([
        { indicator_id: 0, name: 'All Indicators' },
        { indicator_id: 1, name: 'Capacity Sharing' },
        { indicator_id: 4, name: 'Policy Change' }
      ] as any);

      await harness.navigateByUrl('/?indicator=capacity-sharing-for-development', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      const active = indicatorTabsListSignal().filter((item: any) => item.active);
      expect(active).toHaveLength(1);
      expect(active[0].indicator_id).toBe(1);
      // Reviewer fix (attempt 2, issue 4) — the signal assertion above is
      // exactly what the OLD non-rendering harness already asserted; the
      // `active` flag exists ONLY to render (design §7.3: "The *visual*
      // `active` flag"), so a rendered proof is required. This checks the
      // ACTUAL DOM — `indicators-tab-filter.component.html:10` renders
      // `[class.active]="filter.active"` on the `.filters` row.
      const activeTabElements = harness.fixture.nativeElement.querySelectorAll('.filters.active');
      expect(activeTabElements).toHaveLength(1);
      expect((activeTabElements[0] as HTMLElement).textContent?.trim()).toBe('Capacity Sharing');
    });

    // JD-7 / R2-7 regression guard — the only check in this task that can
    // detect the defect class. Both visits share the ONE endpoint instance
    // (`indicatorTabsListSignal`/`indicatorTabsLoadingSignal`, both closed
    // over by the single `mockApiService.indicatorTabs.lazy` built once in
    // this describe's `beforeEach`) across TWO real navigations — the first
    // component instance is genuinely destroyed by navigating through the
    // `blank` route before the second visit, exactly like a real route change.
    it('activates the right tab on a second visit within the same session (JD-7 / R2-7)', async () => {
      indicatorTabsListSignal.set([
        { indicator_id: 0, name: 'All Indicators' },
        { indicator_id: 1, name: 'Capacity Sharing' },
        { indicator_id: 4, name: 'Policy Change' }
      ] as any);

      // --- Visit 1 ---
      await harness.navigateByUrl('/?indicator=capacity-sharing-for-development', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      let active = indicatorTabsListSignal().filter((item: any) => item.active);
      expect(active).toHaveLength(1);
      expect(active[0].indicator_id).toBe(1);
      // Reviewer fix (attempt 2, issue 4) — rendered proof, both visits.
      let activeTabElements = harness.fixture.nativeElement.querySelectorAll('.filters.active');
      expect(activeTabElements).toHaveLength(1);
      expect((activeTabElements[0] as HTMLElement).textContent?.trim()).toBe('Capacity Sharing');

      // Visit 1 ends: navigate away, genuinely destroying the component and
      // its effects — the SAME lifecycle a real route change produces.
      await harness.navigateByUrl('/blank', BlankRouteComponent);
      await harness.fixture.whenStable();

      // Repeat-visit precondition (design §7.3): `isLoading()` never flips
      // back to `true` for visit 2 — it stayed `false` throughout.
      expect(indicatorTabsLoadingSignal()).toBe(false);

      // --- Visit 2 (second visit within the same session, same endpoint) ---
      await harness.navigateByUrl('/?indicator=policy-change', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      active = indicatorTabsListSignal().filter((item: any) => item.active);
      expect(active).toHaveLength(1);
      expect(active[0].indicator_id).toBe(4);
      activeTabElements = harness.fixture.nativeElement.querySelectorAll('.filters.active');
      expect(activeTabElements).toHaveLength(1);
      expect((activeTabElements[0] as HTMLElement).textContent?.trim()).toBe('Policy Change');
    });

    // Reviewer fix (attempt 2, issue 6) — re-expresses the test T-11's diff
    // silently deleted from this describe block:
    // `'applies the correct filter value even before the tab strip has
    // synced'`, backing `tasks.md` T-07 done-check item 3 (the R-RCU-002
    // "the filter value is correct even if the strip has not yet synced"
    // done-check). Re-expressed by holding `indicatorTabsLoadingSignal` at
    // `true` — the sync effect's own guard (`results-center.component.ts`'s
    // `indicatorTabStripSync`, `if (isLoading) { return; }`) — rather than
    // racing a timing window, because `RouterTestingHarness.navigateByUrl`
    // change-detects (and, per this file's own established pattern,
    // flushes effects) internally, so a real "seeded but not yet flushed"
    // instant is not independently observable through it. Holding the
    // loading signal true is the SAME mechanism design §7.3 documents for
    // keeping the sync effect from running, and it reproduces exactly the
    // state the deleted test named: the filter value seeded correctly, the
    // visual `active` flag not yet applied.
    it('applies the correct filter value even before the tab strip has synced (R-RCU-002, design §7.3 transient)', async () => {
      indicatorTabsLoadingSignal.set(true);
      indicatorTabsListSignal.set([
        { indicator_id: 0, name: 'All Indicators' },
        { indicator_id: 1, name: 'Capacity Sharing' }
      ] as any);

      await harness.navigateByUrl('/?indicator=capacity-sharing-for-development', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      const rcService = TestBed.inject(ResultsCenterService);
      expect(rcService.resultsFilter()['indicator-codes-tabs']).toEqual([1]);
      expect(indicatorTabsListSignal().some((item: any) => item.active)).toBe(false);
    });
  });

  // T-08 — the write effect (design.md §6.2, D-URL-9/D-URL-15). Covers
  // R-RCU-003 (both scenarios + all ACs), NFR-RCU-001, NFR-RCU-003,
  // NFR-RCU-004, and the R2-1/R2-2/R2-5/JD-9 regression guards.
  //
  // RE-EXPRESSED, not ported (tasks.md T-11): the old block's
  // `mockRouter.navigate` hand-simulated Angular's `queryParamsHandling`
  // merge algorithm against its own bookkeeping variable. That simulation is
  // gone. Every assertion below reads `router.url` — the REAL, Angular-computed
  // resulting URL from a REAL `Router`/`ActivatedRoute` pair via
  // `RouterTestingHarness` — so the merge contract is observed, not
  // recomputed by the test.
  describe('write effect (T-08)', () => {
    let harness: RouterTestingHarness;
    let router: Router;
    let rcService: ResultsCenterService;

    const emptyResultsFilter = () => ({
      'create-user-codes': [],
      'indicator-codes': [],
      'status-codes': [],
      'contract-codes': [],
      'lever-codes': [],
      years: [],
      'platform-code': [],
      'indicator-codes-filter': [],
      'indicator-codes-tabs': []
    });

    /**
     * Mirrors the REAL ordering contract (design §6.2 / T-05 review
     * hand-off): the mutator writes state FIRST, `noteUserFilterMutation()`
     * SECOND. Awaits `whenStable()` afterward because the REAL
     * `router.navigate()` the effect fires is genuinely asynchronous — this
     * is what "read the real router's resulting URL" requires (see the
     * class-level doc comment above).
     */
    async function bumpAndFlush(): Promise<void> {
      rcService.noteUserFilterMutation();
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      await harness.fixture.whenStable();
    }

    /**
     * design §10.3 disqualifier — reads the REAL resulting URL, sorted for
     * deterministic comparison.
     *
     * Reviewer fix (attempt 2, issue 5a) — uses `getAll(key).join(',')`, not
     * `get(key)`. `URLSearchParams.get()` returns only the FIRST value for a
     * repeated key, and the previous version's `new Set(params.keys())`
     * collapsed the duplicate key on top of that — so a `router.url` that
     * genuinely carries `?contract=A100&contract=S192` (a real repeated key,
     * which `route.snapshot.queryParams` yields as a `string[]`) would have
     * been reported as `contract=A100`, silently dropping `S192`. This
     * mattered for real: it is exactly what let the write effect's
     * `Record<string, string>` cast (`results-center.component.ts:228`) and
     * `paramsEqual`'s `===` comparison (`:313`) go unreconciled by the
     * harness. See the repeated-key test below (issue 5).
     */
    function resultingQueryString(): string {
      const queryIndex = router.url.indexOf('?');
      if (queryIndex === -1) return '';
      const params = new URLSearchParams(router.url.slice(queryIndex + 1));
      return Array.from(new Set(params.keys()))
        .sort()
        .map(key => `${key}=${params.getAll(key).join(',')}`)
        .join('&');
    }

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        providers: [
          ...buildCommonProviders(),
          provideRouter([
            { path: '', component: ResultsCenterComponent },
            { path: 'blank', component: BlankRouteComponent }
          ])
        ]
      }).compileComponents();

      rcService = TestBed.inject(ResultsCenterService);
      const cache = TestBed.inject(CacheService);
      cache.dataCache.set({ user: { sec_user_id: 123 } } as any);
      settleControlListsToIdle();
      rcService.resultsFilter.set(emptyResultsFilter() as any);
      rcService.myResultsFilterItem.set({ id: 'all', label: 'All Results' });

      router = TestBed.inject(Router);
      harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();
    });

    // Reviewer fix (attempt 2, issue 2) — a same-named, weaker test used to
    // sit here asserting only `resultingQueryString()` toBe('') straight out
    // of this block's own `beforeEach`, which navigates to `/` with
    // `emptyResultsFilter()` (all-nulls). `serialize` of that state ALSO
    // yields all-nulls, so the merged result trivially equals the current
    // (empty) query string regardless of whether the entry guard, the loop
    // guard, or no guard at all is what actually stopped the navigate —
    // deleting the entry guard from `results-center.component.ts:215-217`
    // left it green. It is deleted, not carried forward: the sibling below
    // is what actually proves the entry guard, because it forces a genuine
    // mismatch on a BRAND NEW component so the merge/loop guard alone
    // cannot explain a zero-navigate outcome.
    //
    // If the entry guard were missing, only the NFR-RCU-001 merge guard
    // could still save a zero-navigate outcome — but only when creation-time
    // state happens to already match the URL. Forcing a genuine mismatch on
    // a BRAND NEW component (whose effect has never run) is evidence the
    // entry guard itself returns early, not luck of the merge comparison.
    it('never navigates on a FRESH component’s mandatory first run, even when creation-time filter state mismatches the current URL', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['Z999'] }));

      await harness.navigateByUrl('/blank', BlankRouteComponent);
      await harness.fixture.whenStable();
      const navigateSpy = jest.spyOn(router, 'navigate');

      await harness.navigateByUrl('/', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      await harness.fixture.whenStable();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    // --- R-RCU-003 AC.1 + R2-1 — apply, change, clear, per filter ---

    it('applies, changes and clears the contract filter (AC.1, R2-1)', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['a100'] }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('contract=A100');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['s192'] }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('contract=S192');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': [] }));
      await bumpAndFlush();
      // R2-1 — the address bar already carries `contract=S192`; clearing
      // must remove the KEY, not merely fail to add a new one.
      expect(resultingQueryString()).not.toContain('contract');
    });

    it('applies, changes and clears the status filter (AC.1, R2-1)', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'status-codes': [2] })); // submitted
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('status=submitted');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'status-codes': [3] })); // accepted
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('status=accepted');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'status-codes': [] }));
      await bumpAndFlush();
      expect(resultingQueryString()).not.toContain('status');
    });

    it('applies, changes and clears the year filter (AC.1, R2-1)', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, years: [2024] }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('year=2024');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, years: [2025] }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('year=2025');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, years: [] }));
      await bumpAndFlush();
      expect(resultingQueryString()).not.toContain('year');
    });

    it('applies, changes and clears the source filter (AC.1, R2-1)', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'platform-code': ['STAR'] }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('source=star');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'platform-code': ['TIP'] }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('source=tip');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'platform-code': [] }));
      await bumpAndFlush();
      expect(resultingQueryString()).not.toContain('source');
    });

    it('applies, changes and clears the indicator tab filter (AC.1, R2-1)', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [1] })); // capacity-sharing-for-development
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('indicator=capacity-sharing-for-development');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [4] })); // policy-change
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('indicator=policy-change');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [] }));
      await bumpAndFlush();
      expect(resultingQueryString()).not.toContain('indicator');
    });

    // -------------------------------------------------------------------
    // D-URL-18 — the SIDEBAR INDICATOR MULTISELECT.
    //
    // The `it` above is named "indicator TAB filter" and drives
    // `indicator-codes-tabs`. AC.1's own text says "each of the five
    // SIDEBAR filters", and the sidebar's Indicator control writes a
    // different key — `indicator-codes-filter`. That mismatch is how this
    // shipped: the AC was credited to a test of the neighbouring filter,
    // and the multiselect's selection never reached the address bar at all.
    //
    // Disqualifies: a version of this test that drives
    // `indicator-codes-tabs` proves the tab path over again and re-opens the
    // gap. It must drive `indicator-codes-filter` and nothing else.
    // -------------------------------------------------------------------
    it('applies, changes and clears the sidebar indicator multiselect (AC.1, R2-1, D-URL-18)', async () => {
      rcService.resultsFilter.update((prev: any) => ({
        ...prev,
        'indicator-codes-filter': [1] // capacity-sharing-for-development
      }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('indicators=capacity-sharing-for-development');

      // Multi-value, unsorted on purpose — the tab strip could never
      // produce this, so it can only pass through the multiselect path.
      rcService.resultsFilter.update((prev: any) => ({
        ...prev,
        'indicator-codes-filter': [5, 4] // oicr, policy-change
      }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('indicators=oicr,policy-change');

      // R2-1 — clearing must REMOVE the key from the address bar, not leave
      // `?indicators=` for a reload to resurrect.
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-filter': [] }));
      await bumpAndFlush();
      expect(resultingQueryString()).not.toContain('indicators');
    });

    it('reproduces the reported defect URL — multiselect + source together (D-URL-18)', async () => {
      // The exact screen from the bug report: ALL INDICATORS tab (no tab
      // set), "Capacity Sharing for Development" picked in the sidebar, and
      // the STAR source. Before D-URL-18 this produced `?source=star` alone
      // and the indicator was silently lost on reload.
      rcService.resultsFilter.update((prev: any) => ({
        ...prev,
        'indicator-codes-tabs': [],
        'indicator-codes-filter': [1],
        'platform-code': ['STAR']
      }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('indicators=capacity-sharing-for-development&source=star');
    });

    it('never writes both indicator keys at once — a set tab wins (D-URL-18)', async () => {
      rcService.resultsFilter.update((prev: any) => ({
        ...prev,
        'indicator-codes-tabs': [5], // oicr
        'indicator-codes-filter': [4] // stale multiselect value, hidden by the tab
      }));
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('indicator=oicr');
      expect(resultingQueryString()).not.toContain('indicators=');
    });

    it('applies and clears the `tab` scope (AC.1, R2-1, R3-4)', async () => {
      rcService.myResultsFilterItem.set({ id: 'my', label: 'My Results' });
      await bumpAndFlush();
      expect(resultingQueryString()).toBe('tab=my');

      // R3-4 — clearing back to `all` nulls `tab`; it must never emit the
      // literal `tab=all`.
      rcService.myResultsFilterItem.set({ id: 'all', label: 'All Results' });
      await bumpAndFlush();
      expect(resultingQueryString()).not.toContain('tab');
    });

    // --- NFR-RCU-001 — the loop guard itself, not just the entry guard ---

    it('does not navigate again once the merged result is unchanged (NFR-RCU-001)', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      await bumpAndFlush();
      const navigateSpy = jest.spyOn(router, 'navigate');

      // Same resulting filter state, a fresh user-facing mutation (e.g. a
      // re-apply of the identical selection) — `next` merged against the
      // now-current address bar produces an IDENTICAL result.
      await bumpAndFlush();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    // D-URL-15's whole point is that the write effect's ONLY TRACKED
    // dependency is `userFilterMutations()`; every filter signal is read
    // `untracked(...)`. This mutates the filter signal alone, WITHOUT
    // bumping the counter, flushes, and asserts the effect did NOT re-run —
    // it is the only verification this contract has (tasks.md T-11).
    it('does not re-run when a filter signal is mutated WITHOUT a matching userFilterMutations bump (D-URL-15 tracked-dependency guard)', async () => {
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      await bumpAndFlush();
      const navigateSpy = jest.spyOn(router, 'navigate');

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['Z999'] }));
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      await harness.fixture.whenStable();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    // --- R2-2 — zero router.navigate during init with stale singleton state ---

    it('fires zero router.navigate during init when arriving with stale singleton state from another route (R2-2)', async () => {
      // Stale state left on the shared singleton by a PRIOR route: a NONZERO
      // mutation counter AND filter state that mismatches the empty URL this
      // new route's address bar shows.
      rcService.noteUserFilterMutation();
      rcService.noteUserFilterMutation();
      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['Z999'] }));

      await harness.navigateByUrl('/blank', BlankRouteComponent);
      await harness.fixture.whenStable();
      const navigateSpy = jest.spyOn(router, 'navigate');

      await harness.navigateByUrl('/', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      await harness.fixture.whenStable();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    // --- JD-9 — `?tab=my` no longer self-destructs on init ---

    it('does not self-destruct a `?tab=my` deep link on init (JD-9)', async () => {
      await harness.navigateByUrl('/blank', BlankRouteComponent);
      await harness.fixture.whenStable();
      const navigateSpy = jest.spyOn(router, 'navigate');

      await harness.navigateByUrl('/?tab=my', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();
      await harness.fixture.whenStable();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    // --- R-RCU-003 AC.3 — zero additional results requests ---

    it('produces zero additional results requests when a filter change writes the URL (AC.3)', async () => {
      const mainSpy = jest.spyOn(rcService, 'main');
      mainSpy.mockClear();

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      await bumpAndFlush();

      expect(resultingQueryString()).toBe('contract=A100');
      expect(mainSpy).not.toHaveBeenCalled();
    });

    // --- R-RCU-003 AC.4 / NFR-RCU-004 — flat history across N changes ---

    it('keeps history depth flat (replaceUrl) across N filter changes (AC.4)', async () => {
      const navigateSpy = jest.spyOn(router, 'navigate');
      const contracts = ['A100', 'S192', 'B300'];
      for (const agreementId of contracts) {
        rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': [agreementId] }));
        await bumpAndFlush();
      }

      // A history-depth check that never navigates twice cannot fail
      // (design §10.3) — three distinct filter values force three distinct
      // navigations, not one repeated no-op.
      expect(navigateSpy).toHaveBeenCalledTimes(3);
      for (const call of navigateSpy.mock.calls) {
        expect((call[1] as any).replaceUrl).toBe(true);
        expect((call[1] as any).queryParamsHandling).toBe('merge');
      }
    });

    // --- R-RCU-004 AC.3 — an unrecognized parameter survives a filter change ---

    it('preserves ?utm_source=email across the first filter change', async () => {
      await harness.navigateByUrl('/blank', BlankRouteComponent);
      await harness.fixture.whenStable();
      await harness.navigateByUrl('/?utm_source=email', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      await bumpAndFlush();

      const params = resultingQueryString().split('&');
      expect(params).toContain('utm_source=email');
      expect(params).toContain('contract=A100');
    });

    // Reviewer fix (attempt 2, issue 5) — the carry-forward tasks.md T-11
    // named: "the real `snapshot.queryParams` yields `string[]` for a
    // repeated key... where the component casts to `Record<string, string>`
    // and compares with `===`. Production navigates once spuriously —
    // self-correcting, history-flat under `replaceUrl`, not a loop." This
    // pins that ACTUAL behavior rather than "fixing" it — the cast at
    // `results-center.component.ts:228` is production code and out of this
    // task's authorized scope (see the task report).
    it('reads a genuinely repeated `?contract=A100&contract=S192` key correctly, then pins one spurious self-correcting navigate on the first user mutation (issue 5 carry-forward)', async () => {
      await harness.navigateByUrl('/blank', BlankRouteComponent);
      await harness.fixture.whenStable();
      await harness.navigateByUrl('/?contract=A100&contract=S192', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      // T-02's getAll()+flatten seeded BOTH values from the genuinely
      // repeated key (never a user-facing mutation, so `router.navigate`
      // has not fired yet — the write effect's entry guard holds). `router
      // .url` therefore still literally carries the repeated key exactly as
      // it arrived, which is the only place a real repeated key exists in
      // this whole flow: this is the fixture that proves issue 5a's helper
      // fix — the old `URLSearchParams.get()` + `Set` version would report
      // `contract=A100` here, silently dropping `S192`.
      expect(rcService.resultsFilter()['contract-codes']).toEqual(['A100', 'S192']);
      expect(resultingQueryString()).toBe('contract=A100,S192');

      const navigateSpy = jest.spyOn(router, 'navigate');

      // First real user-facing mutation after arriving on a repeated-key
      // URL — the mutation itself changes nothing (no filter value differs
      // from what is already applied), so a correct merge/loop guard alone
      // would find no reason to navigate. It navigates once anyway:
      // `route.snapshot.queryParams['contract']` is a real `string[]`
      // (`['A100', 'S192']`) for this repeated key; the component casts it
      // to `Record<string, string>` and `paramsEqual` (:313) compares with
      // `===`, so `merged.contract` (the freshly serialized comma-joined
      // STRING `'A100,S192'`) is never `===` the ARRAY on the other side —
      // a false mismatch that fires one spurious `router.navigate`.
      await bumpAndFlush();

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(resultingQueryString()).toBe('contract=A100,S192');

      // Self-correcting, not a loop: the real navigate above rewrote the
      // address bar with a single (non-repeated) `contract` key, so
      // `route.snapshot.queryParams['contract']` is now a plain STRING —
      // the type mismatch that caused the spurious navigate is gone, and an
      // identical follow-up mutation performs zero further navigations.
      navigateSpy.mockClear();
      await bumpAndFlush();

      expect(navigateSpy).not.toHaveBeenCalled();
      expect(resultingQueryString()).toBe('contract=A100,S192');
    });

    // REWORK carried from T-08 — the CapDev-email journey the spec narrates
    // verbatim: arrive at `?indicatorTab=1`, switch indicator through the
    // UI, and the legacy key must disappear from the resulting URL.
    it('clears a legacy `indicatorTab` param, writes the canonical `indicator` slug, and preserves `utm_source` on a real indicator mutation (R3-2 write-path guard)', async () => {
      await harness.navigateByUrl('/blank', BlankRouteComponent);
      await harness.fixture.whenStable();
      await harness.navigateByUrl('/?indicatorTab=1&utm_source=email', ResultsCenterComponent);
      await harness.fixture.whenStable();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [4] })); // policy-change
      await bumpAndFlush();

      const params = resultingQueryString().split('&');
      expect(params.some(p => p.startsWith('indicatorTab='))).toBe(false);
      expect(params).toContain('indicator=policy-change');
      expect(params).toContain('utm_source=email');
    });

    // --- NFR-RCU-003 — no sec_user_id in the written URL, both scopes ---

    it('never writes the cached sec_user_id into the URL for the `my` scope (NFR-RCU-003)', async () => {
      rcService.myResultsFilterItem.set({ id: 'my', label: 'My Results' });
      rcService.resultsFilter.update((prev: any) => ({
        ...prev,
        'create-user-codes': ['123'],
        'contract-codes': ['A100']
      }));
      await bumpAndFlush();

      // Positive co-assertions FIRST — closes the ADVISORY the T-08 review
      // recorded ("the two NFR-RCU-003 tests remain vacuous under a total
      // effect no-op"): a mutant that makes the effect a full no-op leaves
      // `resultingQueryString()` empty, and an empty string trivially
      // contains neither '123' nor 'contract=A100' — the bare
      // `not.toContain('123')` below cannot distinguish "correctly omitted"
      // from "effect never ran at all". These prove the effect genuinely
      // fired and wrote the OTHER filter before the negative check runs.
      expect(resultingQueryString()).toContain('contract=A100');
      expect(resultingQueryString()).toBe('contract=A100&tab=my');
      expect(resultingQueryString()).not.toContain('123');
    });

    it('never writes the cached sec_user_id into the URL for the `all` scope (NFR-RCU-003)', async () => {
      rcService.myResultsFilterItem.set({ id: 'all', label: 'All Results' });
      rcService.resultsFilter.update((prev: any) => ({
        ...prev,
        'create-user-codes': ['123'],
        'contract-codes': ['A100']
      }));
      await bumpAndFlush();

      expect(resultingQueryString()).toContain('contract=A100');
      expect(resultingQueryString()).toBe('contract=A100');
      expect(resultingQueryString()).not.toContain('123');
    });

    // --- Type hazard at the boundary (T-03 review hand-off) ---

    it('does not throw when a contract entry is `undefined` at runtime despite its declared string[] type', async () => {
      rcService.resultsFilter.update((prev: any) => ({
        ...prev,
        'contract-codes': ['A100', undefined]
      }));

      await expect(bumpAndFlush()).resolves.not.toThrow();
      expect(resultingQueryString()).toBe('contract=A100');
    });

    // --- Rejection handling (carried from the T-06 review) ---

    it('does not surface an unhandled rejection when router.navigate rejects', async () => {
      jest.spyOn(router, 'navigate').mockRejectedValue(new Error('navigation cancelled by guard'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      rcService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      rcService.noteUserFilterMutation();
      harness.fixture.detectChanges();
      TestBed.flushEffects();

      // Let the rejected promise's `.catch` microtask run before asserting.
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[results-center-url] Failed to write filters to the address bar',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

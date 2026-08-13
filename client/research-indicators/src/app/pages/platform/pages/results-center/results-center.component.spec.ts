import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import ResultsCenterComponent from './results-center.component';
import { ResultsCenterService } from './results-center.service';
import { CacheService } from '../../../../shared/services/cache/cache.service';
import { ApiService } from '../../../../shared/services/api.service';
import { ActionsService } from '../../../../shared/services/actions.service';
import { GetAllResultStatusService } from '@shared/services/control-list/get-all-result-status.service';
import { MenuItem } from 'primeng/api';
import { signal } from '@angular/core';

describe('ResultsCenterComponent', () => {
  let component: ResultsCenterComponent;
  let fixture: ComponentFixture<ResultsCenterComponent>;
  let mockResultsCenterService: any;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockActionsService: jest.Mocked<ActionsService>;
  let mockResultStatusService: { loading: ReturnType<typeof signal<boolean>>; list: ReturnType<typeof signal<any[]>> };
  let mockRouter: { navigate: jest.Mock };
  /**
   * T-06 / KZ-001 — the double for `ActivatedRoute.snapshot.queryParamMap` is
   * now a **real** `ParamMap` built by Angular's own `convertToParamMap`, not
   * a canned `{ get: fn }` stub. `parse()` (`results-center-url.codec.ts`)
   * reads `paramMap.keys` and calls `paramMap.getAll(key)` — a hand-rolled
   * `get`-only double would test the assertion, not the parsing, which is
   * exactly what T-06's Disqualifies clause (citing KZ-001) rules out. Tests
   * set `currentQueryParams` before calling `initializeState()`; the getter
   * below rebuilds the `ParamMap` from whatever it currently holds.
   */
  let currentQueryParams: Record<string, string | readonly string[]>;
  let indicatorTabsLoadingSignal: ReturnType<typeof signal<boolean>>;
  let indicatorTabsListSignal: ReturnType<typeof signal<any[]>>;

  beforeEach(async () => {
    jest.useFakeTimers();

    mockResultsCenterService = {
      resetState: jest.fn(),
      primaryContractId: signal<string | null>(null),
      myResultsFilterItem: signal({ id: 'all', label: 'All Results' }),
      myResultsFilterItems: [
        { id: 'all', label: 'All Results' },
        { id: 'my', label: 'My Results' }
      ],
      clearAllFilters: jest.fn(),
      onSelectFilterTab: jest.fn(),
      onActiveItemChange: jest.fn(),
      noteUserFilterMutation: jest.fn(),
      seedFromUrl: jest.fn(),
      tableFilters: signal({ indicators: [], statusCodes: [], sources: [], contracts: [], levers: [], years: [] }),
      resultsTablePaginatorFirst: signal(0),
      resultsFilter: signal({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      }),
      appliedFilters: signal({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      }),
      searchInput: signal(''),
      showFiltersSidebar: signal(false),
      showConfigurationsSidebar: signal(false),
      main: jest.fn(),
      applyFilters: jest.fn(),
      cleanMultiselects: jest.fn(),
      cleanFilters: jest.fn(),
      pinnedTab: signal('all'),
      activateStatePersistence: jest.fn(),
      deactivateStatePersistence: jest.fn(),
      restorePersistedState: jest.fn().mockReturnValue(false)
    } as any;

    mockCacheService = {
      dataCache: signal({
        user: {
          sec_user_id: 123
        }
      })
    } as any;

    indicatorTabsLoadingSignal = signal(false);
    indicatorTabsListSignal = signal([]);

    mockApiService = {
      GET_Configuration: jest.fn(),
      PATCH_Configuration: jest.fn(),
      indicatorTabs: {
        lazy: jest.fn().mockReturnValue({
          isLoading: indicatorTabsLoadingSignal,
          hasValue: signal(false),
          list: indicatorTabsListSignal
        })
      }
    } as any;

    mockActionsService = {
      showToast: jest.fn()
    } as any;

    mockResultStatusService = {
      loading: signal(false),
      list: signal([])
    };

    mockApiService.GET_Configuration.mockResolvedValue({
      data: { all: '0', self: '0' }
    } as any);
    sessionStorage.clear();

    currentQueryParams = {};
    mockRouter = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [ResultsCenterComponent],
      providers: [
        { provide: ResultsCenterService, useValue: mockResultsCenterService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ApiService, useValue: mockApiService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: GetAllResultStatusService, useValue: mockResultStatusService },
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return { queryParamMap: convertToParamMap(currentQueryParams) };
            }
          }
        },
        { provide: Router, useValue: mockRouter }
      ]
    })
      .overrideComponent(ResultsCenterComponent, {
        set: {
          imports: [],
          template: `<div></div>`
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ResultsCenterComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize state', () => {
      const initializeStateSpy = jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);

      component.ngOnInit();

      expect(initializeStateSpy).toHaveBeenCalled();
    });
  });

  describe('initializeState', () => {
    // --- No recognized parameter (R-RCU-004 AC.2 / AC.3) — unchanged path ---

    it('should restore persisted state and call main when there is no recognized parameter', async () => {
      mockResultsCenterService.restorePersistedState.mockReturnValue(true);
      mockResultsCenterService.main.mockResolvedValue(undefined);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.primaryContractId()).toBeNull();
      expect(mockResultsCenterService.showFiltersSidebar()).toBe(false);
      expect(mockResultsCenterService.showConfigurationsSidebar()).toBe(false);
      expect(mockResultsCenterService.restorePersistedState).toHaveBeenCalledWith('results-center');
      expect(mockResultsCenterService.activateStatePersistence).toHaveBeenCalledWith('results-center');
      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      // Reviewer fix (attempt 2, precedence lens) — tighten from bare
      // `toHaveBeenCalled()`: this is one of the two done-check gaps the
      // panel found unproved ("exactly one results request on initial load"
      // proved on only two of four paths).
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
      expect(mockResultsCenterService.seedFromUrl).not.toHaveBeenCalled();
    });

    it('should load my results when no restored state and preferred tab is my', async () => {
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults').mockImplementation();

      await (component as any).initializeState();

      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(loadMyResultsSpy).toHaveBeenCalled();
      expect(loadAllResultsSpy).not.toHaveBeenCalled();
      expect(mockResultsCenterService.main).not.toHaveBeenCalled();
    });

    it('should load all results when no restored state and preferred tab is all', async () => {
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      // Reviewer fix (attempt 2, precedence lens) — call through instead of
      // stubbing: this path previously asserted nothing about `main()` at
      // all. `loadAllResults()`'s real implementation is what fires `main()`
      // on this branch, so it must not be replaced to prove the request count.
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults');

      await (component as any).initializeState();

      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(loadAllResultsSpy).toHaveBeenCalled();
      expect(loadMyResultsSpy).not.toHaveBeenCalled();
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
    });

    it('should restore persisted state when an unrecognized parameter alone (?utm_source) is present (R-RCU-004 AC.3)', async () => {
      currentQueryParams = { utm_source: 'email' };
      mockResultsCenterService.restorePersistedState.mockReturnValue(true);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.restorePersistedState).toHaveBeenCalledWith('results-center');
      expect(mockResultsCenterService.seedFromUrl).not.toHaveBeenCalled();
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
    });

    // --- Recognized canonical/legacy parameter (R-RCU-002/004/005/006) ---

    it('should seed from a canonical parameter, suppress restore, fetch once, and wipe the legacy+tab keys', async () => {
      currentQueryParams = { contract: 'A100' };
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.restorePersistedState).not.toHaveBeenCalled();
      expect(mockResultsCenterService.activateStatePersistence).toHaveBeenCalledWith('results-center');
      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { contract: ['A100'] },
        scope: 'all'
      });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
      // Reviewer fix (attempt 2, precedence lens) — the filter must be
      // applied (seeded) BEFORE the results request fires. Statement order
      // alone made this true but no assertion evidenced it; this closes
      // that gap directly on mock invocation order.
      expect(mockResultsCenterService.seedFromUrl.mock.invocationCallOrder[0]).toBeLessThan(
        mockResultsCenterService.main.mock.invocationCallOrder[0]
      );
      // Hand-off 4 (T-04 review) — a stale cross-route lever selection must
      // not survive a deep link that names no lever.
      expect(mockResultsCenterService.tableFilters().levers).toEqual([]);
      // Hand-off 3 (T-04 review) — page resets to 1 for the new filter.
      expect(mockResultsCenterService.resultsTablePaginatorFirst()).toBe(0);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { indicatorTab: null, statusTab: null, statusLabel: null, tab: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
      expect(mockActionsService.showToast).not.toHaveBeenCalled();
    });

    // Reviewer fix (attempt 2, precedence lens) — FIX 1. `seedFromUrl`
    // deliberately never writes `tableFilters.indicators` (design §7.2), so a
    // stale value left by a previous route (e.g. `/project-detail`) must be
    // cleared by the component, exactly like `levers`.
    it('should clear a stale tableFilters.indicators inherited from another route on a deep link that names no indicator', async () => {
      currentQueryParams = { contract: 'A100' };
      mockResultsCenterService.tableFilters.set({
        indicators: [42],
        statusCodes: [],
        sources: [],
        contracts: [],
        levers: [7],
        years: []
      });
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.tableFilters().indicators).toEqual([]);
      expect(mockResultsCenterService.tableFilters().levers).toEqual([]);
    });

    it('should resolve the scope from `tab` when present and combine it with another filter, still resolving the pinned preference as fallback only (R-RCU-002 AC.7)', async () => {
      currentQueryParams = { tab: 'my', contract: 'A100' };
      // Reviewer fix (attempt 2, precedence lens) — FIX 2. `tab=my` must win
      // the scope even though `loadPinnedTabPreference` is now always
      // resolved (it populates `pinnedTab`, which drives the tab strip order
      // independently of the URL's scope). Resolve it to a DIFFERENT value
      // ('all') to prove `urlScope`, not the preference, decided the scope.
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { contract: ['A100'] },
        scope: 'my'
      });
    });

    // Reviewer fix (attempt 2, precedence lens) — FIX 4 regression guard: a
    // lone `?tab=my` is the one deliberate behavior change versus the base
    // revision (session restore suppressed) and it previously rested only on
    // a combined `?tab=my&contract=A100` case.
    it('should suppress restore and seed an empty filter set for a lone `?tab=my` deep link (R2-5)', async () => {
      currentQueryParams = { tab: 'my' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.restorePersistedState).not.toHaveBeenCalled();
      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: {},
        scope: 'my'
      });
    });

    it('should resolve the scope from the pinned-tab preference when `tab` is absent (R-RCU-002 AC.6)', async () => {
      currentQueryParams = { contract: 'A100' };
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');

      await (component as any).initializeState();

      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { contract: ['A100'] },
        scope: 'my'
      });
    });

    it('should resolve a legacy indicatorTab through the codec and seed it (R-RCU-006)', async () => {
      currentQueryParams = { indicatorTab: '1' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.restorePersistedState).not.toHaveBeenCalled();
      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { indicator: 1 },
        scope: 'all'
      });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { indicatorTab: null, statusTab: null, statusLabel: null, tab: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });

    it('should resolve a legacy statusTab through the codec and ignore statusLabel (R-RCU-006 AC.3)', async () => {
      currentQueryParams = { statusTab: '2', statusLabel: 'Submitted' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { status: [2] },
        scope: 'all'
      });
    });

    it('should let the canonical `indicator` win over a legacy `indicatorTab` deterministically (R-RCU-006 AC.2)', async () => {
      currentQueryParams = { indicatorTab: '1', indicator: 'policy-change' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { indicator: 4 },
        scope: 'all'
      });
    });

    // --- R-RCU-005 — invalid input degrades to a usable page ---

    it('should apply the valid contract filter and drop the invalid indicator, showing one toast (bad-token scenario)', async () => {
      currentQueryParams = { indicator: 'not-a-real-indicator', contract: 'A100' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { contract: ['A100'] },
        scope: 'all'
      });
      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
    });

    it('should render the unfiltered page with a toast and NOT fall through to restore for a wholly invalid link (R-RCU-005 second scenario)', async () => {
      currentQueryParams = { indicator: 'not-a-real-indicator' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.restorePersistedState).not.toHaveBeenCalled();
      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: {},
        scope: 'all'
      });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
    });

    it('should fire the toast exactly once no matter how many tokens were dropped', async () => {
      currentQueryParams = { indicator: 'not-a-real-indicator', status: 'also-bad,and-this-too' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
    });

    // Reviewer fix (attempt 2, reliability lens) — FIX 3. design §6.1 orders
    // the toast (step 8) BEFORE the wipe/`router.navigate` (step 9). A
    // rejected navigation must not be able to swallow the R-RCU-005 notice.
    it('should still show the dropped-token toast even when the trailing router.navigate rejects', async () => {
      currentQueryParams = { indicator: 'not-a-real-indicator', contract: 'A100' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      mockRouter.navigate.mockRejectedValue(new Error('navigation cancelled by guard'));

      await expect((component as any).initializeState()).rejects.toThrow('navigation cancelled by guard');

      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
    });

    it('should never let a dropped token’s raw value reach the toast (markup cannot alter its rendering)', async () => {
      const maliciousToken = '<script>alert(1)</script>';
      currentQueryParams = { status: maliciousToken };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
      const toastArg = mockActionsService.showToast.mock.calls[0][0];
      expect(`${toastArg.summary} ${toastArg.detail}`).not.toContain(maliciousToken);
      expect(`${toastArg.summary} ${toastArg.detail}`).not.toContain('<script>');
    });
  });

  // NFR-RCU-002 layer 2 — "the layer that actually sees a server-side
  // addition" (requirements.md). Assigned to T-06 during execution.
  describe('vocabulary completeness warning (NFR-RCU-002 layer 2)', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
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

    it('does not warn about the synthetic "All Indicators" id 0 row', () => {
      indicatorTabsListSignal.set([{ indicator_id: 0 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('does not warn while the indicator control list is still loading', () => {
      indicatorTabsLoadingSignal.set(true);
      indicatorTabsListSignal.set([{ indicator_id: 99 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(consoleWarnSpy).not.toHaveBeenCalled();
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
      mockResultStatusService.list.set([{ result_status_id: 2 } as any, { result_status_id: 999 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('status id 999'));
    });

    it('does not warn while the status control list is still loading', () => {
      mockResultStatusService.loading.set(true);
      mockResultStatusService.list.set([{ result_status_id: 999 } as any]);

      fixture.detectChanges();
      TestBed.flushEffects();

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should deactivate persistence and hide sidebars', () => {
      mockResultsCenterService.showFiltersSidebar.set(true);
      mockResultsCenterService.showConfigurationsSidebar.set(true);

      component.ngOnDestroy();

      expect(mockResultsCenterService.deactivateStatePersistence).toHaveBeenCalledWith('results-center');
      expect(mockResultsCenterService.showFiltersSidebar()).toBe(false);
      expect(mockResultsCenterService.showConfigurationsSidebar()).toBe(false);
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
      component.applyFilters();

      expect(mockResultsCenterService.applyFilters).toHaveBeenCalled();
    });
  });

  describe('loadPinnedTabPreference', () => {
    it('should resolve all when all is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({
        data: { all: '1', self: '0' }
      } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve my when self is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({
        data: { all: '0', self: '1' }
      } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('my');
      expect(component.pinnedTab()).toBe('my');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve all when no tab is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({
        data: { all: '0', self: '0' }
      } as any);

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

    // Reviewer fix (attempt 2, reliability lens) — FIX 2b. Fix 2 makes this
    // call unconditional on every deep link, widening its blast radius: a
    // rejecting GET_Configuration must degrade to 'all', not propagate and
    // abort `initializeState` before `seedFromUrl`/`main()` ever run.
    it('should resolve to \'all\' when GET_Configuration rejects', async () => {
      mockApiService.GET_Configuration.mockRejectedValue(new Error('config unavailable'));

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    // Same hazard, evidenced end-to-end through the read path: a rejecting
    // preference lookup must still seed and fetch from the URL alone.
    it('should still seed and fetch from the URL when the pinned-tab preference lookup rejects (FIX 2b)', async () => {
      currentQueryParams = { contract: 'A100' };
      mockApiService.GET_Configuration.mockRejectedValue(new Error('config unavailable'));

      await (component as any).initializeState();

      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { contract: ['A100'] },
        scope: 'all'
      });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
    });
  });

  describe('onActiveItemChange', () => {
    it('should handle my tab selection and preserve search input', () => {
      const event: MenuItem = { id: 'my', label: 'My Results' };
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      mockResultsCenterService.searchInput.set('ABC');

      component.onActiveItemChange(event);

      expect(loadMyResultsSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.cleanFilters).toHaveBeenCalled();
      expect(mockResultsCenterService.searchInput()).toBe('ABC');
    });

    it('should handle all tab selection and preserve search input', () => {
      const event: MenuItem = { id: 'all', label: 'All Results' };
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults').mockImplementation();
      mockResultsCenterService.searchInput.set('test search');

      component.onActiveItemChange(event);

      expect(loadAllResultsSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.cleanFilters).toHaveBeenCalled();
      expect(mockResultsCenterService.searchInput()).toBe('test search');
    });

    // D-URL-15 / R3-1 regression guard: the userFilterMutations increment for the
    // my/all tab switch must go through THIS component handler — asserted here,
    // not by calling ResultsCenterService.onActiveItemChange (which has no production
    // caller and would pass on dead code).
    it('should advance userFilterMutations exactly once (R3-1)', () => {
      const event: MenuItem = { id: 'my', label: 'My Results' };
      jest.spyOn(component, 'loadMyResults').mockImplementation();

      component.onActiveItemChange(event);

      expect(mockResultsCenterService.noteUserFilterMutation).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadMyResults', () => {
    it('should update results filter and applied filters and call main', () => {
      component.loadMyResults();

      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[1]);
      expect(mockResultsCenterService.resultsFilter()).toEqual({
        'create-user-codes': ['123'],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(mockResultsCenterService.main).toHaveBeenCalled();
    });

    it('should preserve indicator-codes-tabs when switching', () => {
      mockResultsCenterService.resultsFilter.set({
        ...mockResultsCenterService.resultsFilter(),
        'indicator-codes-tabs': [5]
      });

      component.loadMyResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([5]);
      expect(mockResultsCenterService.appliedFilters()['indicator-codes-tabs']).toEqual([5]);
    });

    it('should default to empty array when indicator-codes-tabs is undefined', () => {
      mockResultsCenterService.resultsFilter.set({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': []
      } as any);

      component.loadMyResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });

    // T-05 §Acceptance item 2 / design.md §6.2 "must not increment" column:
    // loadMyResults is also reached from the read path (seedFromUrl), so a bump
    // added here would re-open R2-5. Nothing pinned this before.
    it('should not advance userFilterMutations', () => {
      component.loadMyResults();

      expect(mockResultsCenterService.noteUserFilterMutation).not.toHaveBeenCalled();
    });
  });

  describe('loadAllResults', () => {
    it('should update results filter and applied filters and call main', () => {
      component.loadAllResults();

      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[0]);
      expect(mockResultsCenterService.resultsFilter()).toEqual({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(mockResultsCenterService.main).toHaveBeenCalled();
    });

    it('should preserve indicator-codes-tabs when switching', () => {
      mockResultsCenterService.resultsFilter.set({
        ...mockResultsCenterService.resultsFilter(),
        'indicator-codes-tabs': [3]
      });

      component.loadAllResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([3]);
      expect(mockResultsCenterService.appliedFilters()['indicator-codes-tabs']).toEqual([3]);
    });

    it('should default to empty array when indicator-codes-tabs is undefined', () => {
      mockResultsCenterService.resultsFilter.set({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': []
      } as any);

      component.loadAllResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });

    // T-05 §Acceptance item 2 / design.md §6.2 "must not increment" column:
    // loadAllResults is also reached from the read path (seedFromUrl), so a bump
    // added here would re-open R2-5. Nothing pinned this before.
    it('should not advance userFilterMutations', () => {
      component.loadAllResults();

      expect(mockResultsCenterService.noteUserFilterMutation).not.toHaveBeenCalled();
    });
  });

  describe('togglePin', () => {
    it('should pin all tab when toggling from my', async () => {
      component.pinnedTab.set('my');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: true, self: false });
      expect(component.pinnedTab()).toBe('all');
      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[0]);
      expect(mockResultsCenterService.cleanMultiselects).toHaveBeenCalled();
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

      await component.togglePin('my');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: false, self: true });
      expect(component.pinnedTab()).toBe('my');
      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[1]);
      expect(mockResultsCenterService.cleanMultiselects).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Results',
        detail: 'My Results tab pinned successfully'
      });
    });

    // D-URL-15 / R3-1 regression guard: the pin toggle is a component-owned
    // user-facing mutation — asserted through this handler, not the service.
    it('should advance userFilterMutations exactly once (R3-1)', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');

      await component.togglePin('my');
      jest.runAllTimers();

      expect(mockResultsCenterService.noteUserFilterMutation).toHaveBeenCalledTimes(1);
    });

    it('should unpin tab when toggling same tab', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: true, self: false });
      expect(component.pinnedTab()).toBe('all');
      expect(mockResultsCenterService.cleanMultiselects).toHaveBeenCalled();
    });

    it('should handle error when API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockApiService.PATCH_Configuration.mockRejectedValue(new Error('API Error'));
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(consoleSpy).toHaveBeenCalledWith('Error updating pinned tab:', expect.any(Error));
      expect(mockActionsService.showToast).toHaveBeenCalled();
      expect(component.loadingPin()).toBe(false);
      // Reviewer fix (attempt 2): the bump now lives after the state mutation,
      // inside the `if (newPinnedTab === 'my') … else …` branch — a rejected
      // PATCH_Configuration never reaches that branch, so it must never fire.
      expect(mockResultsCenterService.noteUserFilterMutation).not.toHaveBeenCalled();

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
});

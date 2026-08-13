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
   * REWORK (attempt 2, conformance issue 2 / reliability issue 1) — named so
   * the T-08 write-effect tests can assert `relativeTo` against the SAME
   * instance the component's `ActivatedRoute` injection resolves to, rather
   * than only asserting `replaceUrl`. Previously this was an anonymous
   * object literal inline in `providers`, unreachable from a test.
   */
  let mockActivatedRoute: ActivatedRoute;
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
  /**
   * T-08 / D-URL-15 — the write effect's ONLY tracked dependency. A fidelity
   * double (KZ-001) matters here specifically: `noteUserFilterMutation` must
   * actually advance THIS signal for the effect under test to ever run, the
   * same way the real `ResultsCenterService.noteUserFilterMutation`
   * (`results-center.service.ts:456-457`) advances the real counter.
   */
  let userFilterMutationsSignal: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    jest.useFakeTimers();
    userFilterMutationsSignal = signal(0);

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
      // T-08 / KZ-001 fidelity double — mirrors the real counter
      // (results-center.service.ts:456-457): calling this must actually
      // advance `userFilterMutationsSignal`, the write effect's only
      // tracked dependency, or every T-08 test below would pass without the
      // effect ever running.
      userFilterMutations: userFilterMutationsSignal,
      noteUserFilterMutation: jest.fn(() => userFilterMutationsSignal.update((count: number) => count + 1)),
      // T-07 / KZ-001 — this fidelity double mirrors the two real methods'
      // production bodies (results-center.service.ts:810-845 and :1135-1142)
      // closely enough that the T-07 effect's second-visit test can actually
      // fail: `seedFromUrl` writes `indicator-codes-tabs` the same way the
      // real seeding does, and `syncIndicatorTabSelection` mutates the SAME
      // `indicatorTabsListSignal` the effect reads through `mockApiService`,
      // not a detached stub the assertion can't see.
      seedFromUrl: jest.fn(({ filters, scope }: any) => {
        mockResultsCenterService.resultsFilter.update((prev: any) => ({
          ...prev,
          'indicator-codes-tabs': filters?.indicator !== undefined ? [filters.indicator] : []
        }));
        void scope;
      }),
      syncIndicatorTabSelection: jest.fn((indicatorId: number) => {
        indicatorTabsListSignal.update((prev: any[]) =>
          prev.map(item => ({
            ...item,
            active: item.indicator_id === indicatorId
          }))
        );
      }),
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
    mockActivatedRoute = {
      // T-08 — `queryParams` is added here for the write effect's loop
      // guard (design §6.2 step 4), built from the SAME
      // `currentQueryParams` `queryParamMap` already reads, via the
      // real `ParamMap` so multi-value/case behavior stays consistent
      // between the two. Both are getters so a test that reassigns
      // `currentQueryParams` mid-flow is reflected on the next read.
      get snapshot() {
        const queryParamMap = convertToParamMap(currentQueryParams);
        const queryParams: Record<string, string> = {};
        for (const key of queryParamMap.keys) {
          queryParams[key] = queryParamMap.get(key) ?? '';
        }
        return { queryParamMap, queryParams };
      }
    } as unknown as ActivatedRoute;
    mockRouter = {
      // REWORK (attempt 2, conformance issue 2 / reliability issue 1) — this
      // double now PERFORMS Angular's real `queryParamsHandling` contract
      // against `currentQueryParams`, instead of a test-side helper
      // recomputing a merge by hand after the fact (KZ-001 one level up —
      // the previous `latestMergedParams()` reimplemented the merge and
      // applied it unconditionally, ignoring whatever `queryParamsHandling`
      // the component actually passed). HONORING each option (not just
      // reading it) means a regression that drops `queryParamsHandling:
      // 'merge'` — whether replaced by `'preserve'` or omitted outright —
      // changes what `currentQueryParams` holds afterward, which is exactly
      // what every `resultingQueryString()` assertion in the
      // `write effect (T-08)` describe block below reads. This also makes
      // `advanceCurrentQueryParamsToLatestResult()` unnecessary: the double
      // advances `currentQueryParams` itself, synchronously, inside the
      // same call the component makes.
      navigate: jest.fn((_commands: unknown[], extras: any) => {
        const next = (extras?.queryParams ?? {}) as Record<string, string | null>;
        if (extras?.queryParamsHandling === 'merge') {
          for (const [key, value] of Object.entries(next)) {
            if (value === null) {
              delete currentQueryParams[key];
            } else {
              currentQueryParams[key] = value;
            }
          }
        } else if (extras?.queryParamsHandling === 'preserve') {
          // Angular semantics: current query params survive untouched;
          // `next` is ignored entirely.
        } else {
          // No handling (or an unrecognized value) — Angular's default
          // REPLACES the whole query string with `next`, dropping every
          // currently-held param `next` does not explicitly carry, and
          // treating a `null` value there as "absent" rather than "clear
          // this key".
          const replaced: Record<string, string> = {};
          for (const [key, value] of Object.entries(next)) {
            if (value !== null) {
              replaced[key] = value;
            }
          }
          currentQueryParams = replaced;
        }
        return Promise.resolve(true);
      })
    };

    await TestBed.configureTestingModule({
      imports: [ResultsCenterComponent],
      providers: [
        { provide: ResultsCenterService, useValue: mockResultsCenterService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ApiService, useValue: mockApiService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: GetAllResultStatusService, useValue: mockResultStatusService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
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

    it('should seed from a canonical parameter, suppress restore, fetch once, and NOT touch the URL (T-08 removed the wipe)', async () => {
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
      // T-08 removed the legacy+tab wipe this test used to assert — seeding
      // never advances `userFilterMutations`, so the write effect's entry
      // guard means init must touch the router zero times (R2-2 guard).
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
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

    it('should resolve a legacy indicatorTab through the codec, seed it, and NOT touch the URL (T-08 removed the wipe)', async () => {
      currentQueryParams = { indicatorTab: '1' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.restorePersistedState).not.toHaveBeenCalled();
      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { indicator: 1 },
        scope: 'all'
      });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
      // T-08 removed the wipe this test used to assert on — arriving on a
      // legacy link is still just seeding (never a user-facing mutation),
      // so the write effect's entry guard keeps `router.navigate` at zero.
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
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

    // T-08 removed the trailing wipe this test used to exercise (there is no
    // longer any `router.navigate` call inside `initializeState` at all —
    // see the R2-2 guard tests in the `write effect (T-08)` describe below).
    // What survives from the original intent: the toast must still fire
    // unconditionally on `dropped.length`, independent of anything
    // router-related, and `initializeState` itself must resolve cleanly
    // even with a poisoned router mock, because it never reaches it.
    it('shows the dropped-token toast without ever touching the router during init (wipe removed by T-08)', async () => {
      currentQueryParams = { indicator: 'not-a-real-indicator', contract: 'A100' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      mockRouter.navigate.mockRejectedValue(new Error('should never be reached during init'));

      await (component as any).initializeState();

      expect(mockActionsService.showToast).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
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

  // T-07 — indicator tab-strip sync effect (design.md §7.3, requirements.md
  // R-RCU-002 CapDev scenario / AC.3). The "All Indicators" id-0 row plus
  // TWO other distinct indicator ids are present in every fixture below
  // (KZ-004): a list of one tab cannot distinguish "activates the right
  // tab" from "activates every tab", so each assertion checks that EXACTLY
  // one tab is `active` and that it is the right one.
  //
  // Harness note: `TestBed.flushEffects()` only runs an effect that has
  // been (re-)marked dirty by a **new** `fixture.detectChanges()` pass —
  // calling it on its own a second time, with no intervening
  // `detectChanges()`, is a no-op even though a tracked signal changed in
  // between (verified empirically against this Angular version). `ngOnInit`
  // itself only fires on a fixture's FIRST `detectChanges()` call, never on
  // later ones, so calling `detectChanges()` more than once is always safe
  // — only that first call risks colliding with this harness's convention
  // of driving `initializeState()` directly (see the class-level KZ-001
  // comment). Every test below therefore neutralizes `initializeState` for
  // that one unavoidable first `detectChanges()` pass, restores it, then
  // drives the real scenario through the real `initializeState()` call.
  describe('indicator tab-strip sync effect (T-07)', () => {
    it('activates the right tab on a first visit (deep link, design §7.3)', async () => {
      // The component's constructor already created the effect; this first
      // `detectChanges()` pass is what lets `flushEffects()` run its
      // creation-time execution (over the still-unseeded default state).
      // `initializeState` is neutralized here purely to stop the
      // `ngOnInit`-triggered call from firing this test's real scenario
      // early — the manual, awaited call below is the one under test.
      jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
      fixture.detectChanges();
      TestBed.flushEffects();
      (component as any).initializeState.mockRestore();

      currentQueryParams = { indicator: 'capacity-sharing-for-development' }; // -> id 1
      indicatorTabsListSignal.set([{ indicator_id: 0 }, { indicator_id: 1 }, { indicator_id: 4 }] as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();
      fixture.detectChanges();
      TestBed.flushEffects();

      const active = indicatorTabsListSignal().filter((item: any) => item.active);
      expect(active).toHaveLength(1);
      expect(active[0].indicator_id).toBe(1);
    });

    // The R-RCU-002 "the filter value is correct even if the strip has not
    // yet synced" done-check. Deliberately never calls `detectChanges()` /
    // `flushEffects()` after seeding — design §7.3: "the filter value ... is
    // written immediately, so the fetch is correct regardless" of whether
    // the visual `active` flag has caught up yet.
    it('applies the correct filter value even before the tab strip has synced', async () => {
      currentQueryParams = { indicator: 'capacity-sharing-for-development' };
      indicatorTabsListSignal.set([{ indicator_id: 0 }, { indicator_id: 1 }, { indicator_id: 4 }] as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.seedFromUrl).toHaveBeenCalledWith({
        filters: { indicator: 1 },
        scope: 'all'
      });
      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([1]);
      // The visual sync has deliberately not been flushed yet.
      expect(indicatorTabsListSignal().some((item: any) => item.active)).toBe(false);
    });

    // JD-7 / R2-7 regression guard — the only check in this task that can
    // detect the defect class. A fresh `TestBed` per case simulates a fresh
    // session, so both visits below share the ONE endpoint instance
    // (`indicatorTabsLoadingSignal` / `indicatorTabsListSignal`, both closed
    // over by the single `mockApiService.indicatorTabs.lazy` from this
    // `beforeEach`) across TWO component mounts inside this one `it()`.
    //
    // The ordering design §7.3 names: an effect runs once at creation, and
    // on a repeat visit `isLoading()` is already permanently `false`
    // (cached list), so that run lands BEFORE the awaited
    // `loadPinnedTabPreference()` inside `initializeState()` — and therefore
    // before `seedFromUrl()` — resolves. Visit 2's FIRST `detectChanges()` +
    // `flushEffects()` pair below (before `initializeState()` is even
    // called) reproduces exactly that early run, over the state visit 1
    // left behind. An effect keyed on `isLoading()` alone would consume its
    // one lifetime run right there and never react to `resultsFilter()`
    // changing afterward; visit 2's SECOND `detectChanges()` +
    // `flushEffects()` pair, after `seedFromUrl` has run, is what such an
    // effect could never reach.
    it('activates the right tab on a second visit within the same session (JD-7 / R2-7)', async () => {
      // --- Visit 1 (uses the fixture/component from beforeEach) ---
      jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
      fixture.detectChanges();
      TestBed.flushEffects();
      (component as any).initializeState.mockRestore();

      currentQueryParams = { indicator: 'capacity-sharing-for-development' }; // -> id 1
      indicatorTabsListSignal.set([{ indicator_id: 0 }, { indicator_id: 1 }, { indicator_id: 4 }] as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();
      fixture.detectChanges();
      TestBed.flushEffects();

      let active = indicatorTabsListSignal().filter((item: any) => item.active);
      expect(active).toHaveLength(1);
      expect(active[0].indicator_id).toBe(1);

      // Visit 1 ends: the component (and its effect) is destroyed, exactly
      // as ResultsCenterComponent is destroyed on route change. The service
      // singleton, the API endpoint's `isLoading`/`list` signals and the
      // resultsFilter left behind all persist — a real repeat visit's
      // starting condition.
      fixture.destroy();

      // Repeat-visit precondition (design §7.3): `isLoading()` is already
      // permanently `false` because the list is cached from visit 1 — it
      // never flips back to `true` for visit 2, so an effect keyed on it
      // alone gets no second signal to react to.
      expect(indicatorTabsLoadingSignal()).toBe(false);

      // --- Visit 2 (second visit within the same session): a SECOND
      // component instance from the SAME TestBed module — same
      // `mockApiService`, same `indicatorTabsLoadingSignal` /
      // `indicatorTabsListSignal`, same `mockResultsCenterService` — never a
      // fresh `configureTestingModule()` / fresh signals.
      const fixture2: ComponentFixture<ResultsCenterComponent> = TestBed.createComponent(ResultsCenterComponent);
      const component2 = fixture2.componentInstance;

      // Early run, over visit 1's leftover state (`indicator-codes-tabs`
      // still `[1]` on the shared singleton, `isLoading()` still `false`) —
      // this is the pre-seed run an `isLoading()`-only effect would consume
      // as its one lifetime run for this component instance.
      jest.spyOn(component2 as any, 'initializeState').mockResolvedValue(undefined);
      fixture2.detectChanges();
      TestBed.flushEffects();
      (component2 as any).initializeState.mockRestore();

      currentQueryParams = { indicator: 'policy-change' }; // -> id 4, a DIFFERENT tab than visit 1
      jest.spyOn(component2 as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component2 as any).initializeState();
      fixture2.detectChanges();
      TestBed.flushEffects();

      active = indicatorTabsListSignal().filter((item: any) => item.active);
      expect(active).toHaveLength(1);
      expect(active[0].indicator_id).toBe(4);

      fixture2.destroy();
    });
  });

  // T-08 — the write effect (design.md §6.2, D-URL-9/D-URL-15). Covers
  // R-RCU-003 (both scenarios + all ACs), NFR-RCU-001, NFR-RCU-003,
  // NFR-RCU-004, and the R2-1/R2-2/R2-5/JD-9 regression guards.
  describe('write effect (T-08)', () => {
    /**
     * A complete `ResultFilter`-shaped baseline with every key the write
     * effect (`buildUrlStateFromCurrentFilters`) reads set to its "nothing
     * selected" value. Tests spread over this and set only the key(s) under
     * test, so an assertion about one filter can't be an accident of
     * leftover state from another test.
     */
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
     * hand-off, carried into T-08's brief): the mutator writes state FIRST,
     * `noteUserFilterMutation()` SECOND. Calling this after setting
     * `resultsFilter`/`myResultsFilterItem` is what makes the write
     * effect's only tracked dependency actually move.
     */
    function bumpAndFlush(): void {
      mockResultsCenterService.noteUserFilterMutation();
      fixture.detectChanges();
      TestBed.flushEffects();
    }

    /**
     * design §10.3 disqualifier — "asserting on the object passed to
     * `router.navigate` is a presence assertion about the call, not the
     * resulting URL". This reads the resulting URL's query string straight
     * off `currentQueryParams`, which `mockRouter.navigate` (top-level
     * `beforeEach`) now mutates ITSELF by actually applying the
     * `queryParamsHandling` option the component passed — no test-side
     * recomputation of the merge remains (REWORK, attempt 2: the previous
     * `latestMergedParams()` reimplemented the merge unconditionally,
     * blind to whatever `queryParamsHandling` value the component used).
     */
    function resultingQueryString(): string {
      return Object.keys(currentQueryParams)
        .sort()
        .map(key => `${key}=${currentQueryParams[key]}`)
        .join('&');
    }

    beforeEach(() => {
      currentQueryParams = {};
      mockResultsCenterService.resultsFilter.set(emptyResultsFilter());
      mockResultsCenterService.myResultsFilterItem.set({ id: 'all', label: 'All Results' });

      // Harness convention (see the T-07 describe block's class-level
      // comment above): `ngOnInit`'s `void this.initializeState()` only
      // fires on THIS fixture's first `detectChanges()` call. Neutralizing
      // it here consumes that one unavoidable pass — including the write
      // effect's own mandatory first run — so no test below (whether it
      // drives `initializeState()` directly or only mutates filter
      // signals) ever races an uncontrolled background `initializeState()`.
      const initializeStateSpy = jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
      fixture.detectChanges();
      TestBed.flushEffects();
      initializeStateSpy.mockRestore();
    });

    it('never navigates on the mandatory first run (D-URL-15 entry guard)', () => {
      // The mandatory first run already happened in this describe block's
      // own `beforeEach`, with zero `userFilterMutations` calls — this
      // re-asserts that outcome directly as its own guaranteed check,
      // rather than leaving it only implicit in every other test's setup.
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('never navigates on a FRESH component’s mandatory first run, even when creation-time filter state mismatches the current URL (D-URL-15 entry guard, not merge-guard luck)', () => {
      // If the entry guard were missing, the ONLY thing that could still
      // save a zero-navigate outcome is the NFR-RCU-001 merge guard — but
      // only when creation-time state happens to already match the URL.
      // Setting a filter the (still-empty) URL does not carry, on a BRAND
      // NEW component whose effect has never run before, forces a genuine
      // merge mismatch: `next` would carry `contract: 'Z999'`, which
      // differs from an empty current query string. A pass here is
      // evidence the entry guard itself is what returns early — not luck
      // of the comparison happening to no-op (design §6.2 step 2).
      fixture.destroy();
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['Z999'] }));
      currentQueryParams = {};

      const freshFixture = TestBed.createComponent(ResultsCenterComponent);
      freshFixture.detectChanges();
      TestBed.flushEffects();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      freshFixture.destroy();
    });

    // --- R-RCU-003 AC.1 + R2-1 — apply, change, clear, per filter ---

    it('applies, changes and clears the contract filter (AC.1, R2-1)', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['a100'] }));
      bumpAndFlush();
      expect(resultingQueryString()).toBe('contract=A100');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['s192'] }));
      bumpAndFlush();
      expect(resultingQueryString()).toBe('contract=S192');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': [] }));
      bumpAndFlush();
      // R2-1 — the address bar already carries `contract=S192` (simulated
      // above); clearing must remove the KEY, not merely fail to add a new
      // one. An `undefined`/omitted `next.contract` (rather than an
      // explicit `null`) would leave this value untouched under merge.
      expect(resultingQueryString()).not.toContain('contract');
    });

    it('applies, changes and clears the status filter (AC.1, R2-1)', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'status-codes': [2] })); // submitted
      bumpAndFlush();
      expect(resultingQueryString()).toBe('status=submitted');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'status-codes': [3] })); // accepted
      bumpAndFlush();
      expect(resultingQueryString()).toBe('status=accepted');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'status-codes': [] }));
      bumpAndFlush();
      expect(resultingQueryString()).not.toContain('status');
    });

    it('applies, changes and clears the year filter (AC.1, R2-1)', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, years: [2024] }));
      bumpAndFlush();
      expect(resultingQueryString()).toBe('year=2024');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, years: [2025] }));
      bumpAndFlush();
      expect(resultingQueryString()).toBe('year=2025');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, years: [] }));
      bumpAndFlush();
      expect(resultingQueryString()).not.toContain('year');
    });

    it('applies, changes and clears the source filter (AC.1, R2-1)', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'platform-code': ['STAR'] }));
      bumpAndFlush();
      expect(resultingQueryString()).toBe('source=star');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'platform-code': ['TIP'] }));
      bumpAndFlush();
      expect(resultingQueryString()).toBe('source=tip');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'platform-code': [] }));
      bumpAndFlush();
      expect(resultingQueryString()).not.toContain('source');
    });

    it('applies, changes and clears the indicator tab filter (AC.1, R2-1)', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [1] })); // capacity-sharing-for-development
      bumpAndFlush();
      expect(resultingQueryString()).toBe('indicator=capacity-sharing-for-development');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [4] })); // policy-change
      bumpAndFlush();
      expect(resultingQueryString()).toBe('indicator=policy-change');

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [] }));
      bumpAndFlush();
      expect(resultingQueryString()).not.toContain('indicator');
    });

    it('applies and clears the `tab` scope (AC.1, R2-1, R3-4)', () => {
      mockResultsCenterService.myResultsFilterItem.set({ id: 'my', label: 'My Results' });
      bumpAndFlush();
      expect(resultingQueryString()).toBe('tab=my');

      // R3-4 — clearing back to `all` nulls `tab`; it must never emit the
      // literal `tab=all` (that would leave a query string R-RCU-003
      // requires to read with none at all).
      mockResultsCenterService.myResultsFilterItem.set({ id: 'all', label: 'All Results' });
      bumpAndFlush();
      expect(resultingQueryString()).not.toContain('tab');
    });

    // --- NFR-RCU-001 — the loop guard itself, not just the entry guard ---

    it('does not navigate again once the merged result is unchanged (NFR-RCU-001)', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      bumpAndFlush();
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);

      // Same resulting filter state, a fresh user-facing mutation (e.g. a
      // re-apply of the identical selection) — `next` merged against the
      // now-current address bar produces an IDENTICAL result.
      mockResultsCenterService.noteUserFilterMutation();
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    });

    // REWORK (attempt 2) — FIX 4, promoted from advisory by explicit user
    // decision. D-URL-15's whole point is that the write effect's ONLY
    // TRACKED dependency is `userFilterMutations()`; every filter signal is
    // read `untracked(...)`. Deleting that `untracked(...)` wrapper (inlining
    // its body) fails no other test in this file, because no other test
    // mutates `resultsFilter` WITHOUT also bumping the counter in the same
    // flush — so nothing here proved the tracked-dependency contract until
    // now. This mutates the filter signal alone, flushes, and asserts the
    // effect did NOT re-run: if `untracked` were removed, the filter read
    // above would register as a second tracked dependency, and this
    // mutation alone would be enough to re-run the effect and navigate
    // again.
    it('does not re-run when a filter signal is mutated WITHOUT a matching userFilterMutations bump (D-URL-15 tracked-dependency guard)', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      bumpAndFlush();
      const navigateCallsAfterGenuineMutation = mockRouter.navigate.mock.calls.length;

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['Z999'] }));
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(navigateCallsAfterGenuineMutation);
    });

    // --- R2-2 — zero router.navigate during init with stale singleton state ---

    it('fires zero router.navigate during init when arriving with stale singleton state from another route (R2-2)', () => {
      // The shared `component` from this suite's `beforeEach` must not
      // still be alive: its OWN write effect also tracks
      // `userFilterMutationsSignal`, so bumping it below would otherwise
      // fire that unrelated effect too, contaminating this test — exactly
      // the cross-route isolation D-URL-9 relies on component destruction
      // to prevent in production.
      fixture.destroy();

      // Stale state left on the shared singleton by a PRIOR route: a
      // NONZERO mutation counter (never a hardcoded 0 the guard could get
      // away with checking against) AND filter state that mismatches the
      // empty URL this new route's address bar shows. A merge computed
      // from this state WOULD force a navigate if the entry guard were the
      // only thing broken — the NFR-RCU-001 merge guard alone cannot save
      // this scenario, so a pass here is evidence of the entry guard
      // itself, not luck of the merge comparison (design §6.2 step 2).
      userFilterMutationsSignal.set(5);
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['Z999'] }));
      currentQueryParams = {};

      const staleFixture = TestBed.createComponent(ResultsCenterComponent);
      staleFixture.detectChanges();
      TestBed.flushEffects();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      staleFixture.destroy();
    });

    // --- JD-9 — `?tab=my` no longer self-destructs on init ---

    it('does not self-destruct a `?tab=my` deep link on init (JD-9)', async () => {
      currentQueryParams = { tab: 'my' };
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    // --- R2-5 — zero router.navigate on parameter-less restore, honoured again next load ---

    it('fires zero router.navigate on a parameter-less visit that restores persisted state, honoured again on the next load (R2-5)', async () => {
      currentQueryParams = {};
      mockResultsCenterService.restorePersistedState.mockReturnValue(true);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockResultsCenterService.restorePersistedState).toHaveBeenCalledTimes(1);

      // Next load — nothing about the first visit may disable restore.
      await (component as any).initializeState();
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockResultsCenterService.restorePersistedState).toHaveBeenCalledTimes(2);
    });

    // --- R-RCU-003 AC.3 — zero additional results requests ---

    it('produces zero additional results requests when a filter change writes the URL (AC.3)', () => {
      mockResultsCenterService.main.mockClear();
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      bumpAndFlush();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
      expect(mockResultsCenterService.main).not.toHaveBeenCalled();
    });

    // --- R-RCU-003 AC.4 / NFR-RCU-004 — flat history across N changes ---

    it('keeps history depth flat (replaceUrl) across N filter changes (AC.4)', () => {
      const contracts = ['A100', 'S192', 'B300'];
      for (const agreementId of contracts) {
        mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': [agreementId] }));
        bumpAndFlush();
      }

      // A history-depth check that never navigates twice cannot fail
      // (design §10.3) — three distinct filter values force three
      // distinct navigations, not one repeated no-op.
      expect(mockRouter.navigate).toHaveBeenCalledTimes(3);
      for (const call of mockRouter.navigate.mock.calls) {
        expect(call[1].replaceUrl).toBe(true);
        // REWORK (attempt 2, conformance issue 2 / reliability issue 1) —
        // the fallback direct assertion the reviewers asked for alongside
        // (a): pin `relativeTo` to the SAME `ActivatedRoute` double the
        // component injects, and `queryParamsHandling` to the exact literal
        // `'merge'`, on every navigate call this test drove — not just one.
        expect(call[1].relativeTo).toBe(mockActivatedRoute);
        expect(call[1].queryParamsHandling).toBe('merge');
      }
    });

    // --- R-RCU-004 AC.3 — an unrecognized parameter survives a filter change ---

    it('preserves ?utm_source=email across the first filter change', () => {
      currentQueryParams = { utm_source: 'email' };
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      bumpAndFlush();

      const params = resultingQueryString().split('&');
      expect(params).toContain('utm_source=email');
      expect(params).toContain('contract=A100');
    });

    // REWORK (attempt 2) — FIX 3 / reliability lens issue 2. No test in the
    // pre-rework suite drove a filter mutation while a LEGACY parameter
    // (`indicatorTab`) was present in the address bar — every write-effect
    // test started from `{}` or `{ utm_source }`. This is the CapDev-email
    // journey the spec narrates verbatim (design §6.2 "The null set is
    // 'every key the codec parses'" / R3-2, tasks.md T-08's `?tab=my` and
    // legacy done-checks): arrive at `?indicatorTab=1`, switch indicator
    // through the UI, and the legacy key must disappear from the resulting
    // URL — the exact behavior the two pre-existing wipes used to perform
    // and that T-08 re-homed onto `serialize`'s trailing `null`s reaching
    // the router under `merge`. `?utm_source=email` rides along in the SAME
    // fixture to prove the unrecognized key survives the very same
    // navigation that clears the legacy one.
    it('clears a legacy `indicatorTab` param, writes the canonical `indicator` slug, and preserves `utm_source` on a real indicator mutation (R3-2 write-path guard)', () => {
      currentQueryParams = { indicatorTab: '1', utm_source: 'email' };
      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'indicator-codes-tabs': [4] })); // policy-change
      bumpAndFlush();

      const params = resultingQueryString().split('&');
      expect(params.some(p => p.startsWith('indicatorTab='))).toBe(false);
      expect(params).toContain('indicator=policy-change');
      expect(params).toContain('utm_source=email');
    });

    // --- NFR-RCU-003 — no sec_user_id in the written URL, both scopes ---

    // REWORK (attempt 2) — FIX 1 / conformance lens issue 1. The sentinel
    // (`mockCacheService.dataCache().user.sec_user_id`, `123`) must actually
    // be present in the state `buildUrlStateFromCurrentFilters` reads for
    // this test to be capable of failing — the pre-rework version bumped
    // with `create-user-codes` still `[]` from `emptyResultsFilter()`, so
    // even a regression that made the write path serialize that key would
    // stay green. Seeding it here mirrors what production seeding
    // (`seedFromUrl` / `loadMyResults`) actually puts in that key.
    it('never writes the cached sec_user_id into the URL for the `my` scope (NFR-RCU-003)', () => {
      mockResultsCenterService.myResultsFilterItem.set({ id: 'my', label: 'My Results' });
      mockResultsCenterService.resultsFilter.update((prev: any) => ({
        ...prev,
        'create-user-codes': ['123'],
        'contract-codes': ['A100']
      }));
      bumpAndFlush();

      expect(resultingQueryString()).not.toContain('123');
    });

    it('never writes the cached sec_user_id into the URL for the `all` scope (NFR-RCU-003)', () => {
      mockResultsCenterService.myResultsFilterItem.set({ id: 'all', label: 'All Results' });
      mockResultsCenterService.resultsFilter.update((prev: any) => ({
        ...prev,
        'create-user-codes': ['123'],
        'contract-codes': ['A100']
      }));
      bumpAndFlush();

      expect(resultingQueryString()).not.toContain('123');
    });

    // --- Type hazard at the boundary (T-03 review hand-off) ---

    it('does not throw when a contract entry is `undefined` at runtime despite its declared string[] type', () => {
      mockResultsCenterService.resultsFilter.update((prev: any) => ({
        ...prev,
        'contract-codes': ['A100', undefined]
      }));

      expect(() => bumpAndFlush()).not.toThrow();
      expect(resultingQueryString()).toBe('contract=A100');
    });

    // --- Rejection handling (carried from the T-06 review) ---

    it('does not surface an unhandled rejection when router.navigate rejects', async () => {
      mockRouter.navigate.mockRejectedValue(new Error('navigation cancelled by guard'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      mockResultsCenterService.resultsFilter.update((prev: any) => ({ ...prev, 'contract-codes': ['A100'] }));
      bumpAndFlush();

      // Let the rejected promise's `.catch` microtask run before asserting.
      await Promise.resolve();
      await Promise.resolve();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[results-center-url] Failed to write filters to the address bar',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
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

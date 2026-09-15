import { Component, inject, signal, OnInit, OnDestroy, computed, effect, untracked } from '@angular/core';
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
import { GetAllResultStatusService } from '@shared/services/control-list/get-all-result-status.service';
import { parse, serialize, ResultsCenterUrlState } from './url/results-center-url.codec';
import { INDICATOR_ID_TO_SLUG, STATUS_ID_TO_SLUG, TabScope } from './url/results-center-url.vocabulary';

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
  private readonly resultStatusService = inject(GetAllResultStatusService);

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

  /**
   * T-06 / NFR-RCU-002 layer 2 — "the layer that actually sees a
   * server-side addition" (requirements.md NFR-RCU-002). Layer 1 (T-01) is a
   * fixture parity test and is structurally blind to an id the control list
   * returns but the frozen vocabulary does not know. This effect is that
   * blind spot's runtime mitigation: it re-checks the *indicator* control
   * list every time it resolves and warns, once per id, naming any id with
   * no slug. It is not a toast (design §10.1 scope) and it never touches
   * `serialize`'s signature.
   *
   * `indicator_id === 0` is excluded — it is the synthetic "All Indicators"
   * row `ResultsCenterService.onChangeList` prepends client-side
   * (`results-center.service.ts:424-428`), never a real control-list id, and
   * warning about it on every load would be pure noise (same exclusion as
   * `results-center.service.ts:107`).
   *
   * Reading `api.indicatorTabs.lazy()` may trigger its own first-time
   * `fetch()` (a signal write inside that endpoint) if this effect happens
   * to run before any other consumer has called `.lazy()` yet — the same
   * hazard `design.md` §7.3 names for the (separate) tab-strip sync effect.
   * No `allowSignalWrites` option is needed on this Angular version: the
   * flag is deprecated and writes from an effect are always allowed.
   */
  private readonly warnedIndicatorIdsWithNoSlug = new Set<number>();
  private readonly indicatorVocabularyCompletenessCheck = effect(() => {
    const indicatorTabs = this.api.indicatorTabs.lazy();
    if (indicatorTabs.isLoading()) {
      return;
    }
    for (const indicator of indicatorTabs.list()) {
      if (indicator.indicator_id === 0 || INDICATOR_ID_TO_SLUG.has(indicator.indicator_id)) {
        continue;
      }
      if (this.warnedIndicatorIdsWithNoSlug.has(indicator.indicator_id)) {
        continue;
      }
      this.warnedIndicatorIdsWithNoSlug.add(indicator.indicator_id);
      console.warn(
        `[results-center-url] NFR-RCU-002: indicator id ${indicator.indicator_id} has no URL slug in results-center-url.vocabulary.ts — links to it cannot be built or restored.`
      );
    }
  });

  /** T-06 / NFR-RCU-002 layer 2 — same completeness check, for the `status` vocabulary. */
  private readonly warnedStatusIdsWithNoSlug = new Set<number>();
  private readonly statusVocabularyCompletenessCheck = effect(() => {
    if (this.resultStatusService.loading()) {
      return;
    }
    for (const status of this.resultStatusService.list()) {
      if (STATUS_ID_TO_SLUG.has(status.result_status_id)) {
        continue;
      }
      if (this.warnedStatusIdsWithNoSlug.has(status.result_status_id)) {
        continue;
      }
      this.warnedStatusIdsWithNoSlug.add(status.result_status_id);
      console.warn(
        `[results-center-url] NFR-RCU-002: status id ${status.result_status_id} has no URL slug in results-center-url.vocabulary.ts — links to it cannot be built or restored.`
      );
    }
  });

  /**
   * T-07 — indicator tab-strip sync effect (design.md §7.3, requirements.md
   * R-RCU-002 CapDev scenario / AC.3). `syncIndicatorTabSelection` maps over
   * `api.indicatorTabs.lazy().list()`, which is normally empty at
   * `ngOnInit`. The singleton's self-heal (`onChangeList`,
   * results-center.service.ts:405-430) calls `destroy()` on its first
   * successful run, so once any earlier route has triggered it, a second
   * visit to Results Center in the same session seeds `active` into a list
   * that is never re-synced. This component-scoped effect replaces it,
   * created and destroyed with the component so it re-arms on every visit —
   * out of scope to repair or depend on `onChangeList` itself.
   *
   * Tracks BOTH `indicatorTabs.lazy().isLoading()` AND
   * `resultsFilter()['indicator-codes-tabs']` (D-URL-14 / R2-7). Keying on
   * `isLoading()` alone reproduces JD-7: an effect runs once at creation,
   * and on a repeat visit the list is already cached with `isLoading()`
   * permanently `false`, so that single run lands *before* `seedFromUrl()`
   * — which happens after `initializeState()`'s awaited
   * `loadPinnedTabPreference()` — writing `active: false` everywhere with
   * no re-run. Tracking the filter signal makes the seed itself the
   * trigger, so ordering stops mattering.
   *
   * `list()` is never read here as a tracked dependency — this effect
   * writes `indicatorTabs.lazy().list` via `syncIndicatorTabSelection`,
   * which uses `list.update(prev => ...)` (an untracked read); reading
   * `list()` directly in this body would create a self-triggering cycle.
   *
   * No `allowSignalWrites` option is needed on this Angular version: the
   * flag is deprecated and writes from an effect are always allowed (see
   * the doc comment at :103-104).
   */
  private readonly indicatorTabStripSync = effect(() => {
    const isLoading = this.api.indicatorTabs.lazy().isLoading();
    const indicatorCodesTabs = this.resultsCenterService.resultsFilter()['indicator-codes-tabs'];
    if (isLoading) {
      return;
    }
    this.resultsCenterService.syncIndicatorTabSelection(indicatorCodesTabs?.[0] ?? 0);
  });

  /**
   * T-08 — the write path (design.md §6.2, D-URL-9/D-URL-15). The
   * counterpart to T-06's read path: whenever the user mutates a filter
   * through the UI, this component-scoped effect rewrites the address bar
   * to match. Owned by `ResultsCenterComponent`'s injector — never the
   * service — so it is destroyed with the component and cannot rewrite the
   * URL of another route the shared singleton is also mutated from
   * (NFR-RCU-005; design §6.2 "Why this is structural, not a convention").
   *
   * **Tracked dependency: ONLY `resultsCenterService.userFilterMutations()`.**
   * Every filter/scope signal `buildUrlStateFromCurrentFilters()` reads is
   * read inside `untracked(...)` below — D-URL-15 requires this so the
   * effect cannot fire during load, restore, or a cross-route mutation,
   * none of which advance the counter (closes R2-2/R2-5).
   *
   * Guard (design §6.2 step 2): `writeEffectEntryMutationCount` captures the
   * counter's value at effect CREATION, one field above this one so it
   * initializes first. The mandatory first run always sees the counter
   * still at that value and returns explicitly — not by luck of the merge
   * comparison below happening to no-op.
   *
   * No `allowSignalWrites` option is needed on this Angular version: the
   * flag is deprecated and writes from an effect are always allowed (see
   * the doc comment at :103-104).
   */
  private readonly writeEffectEntryMutationCount = this.resultsCenterService.userFilterMutations();

  private readonly urlWriteEffect = effect(() => {
    const mutationCount = this.resultsCenterService.userFilterMutations();
    if (mutationCount === this.writeEffectEntryMutationCount) {
      return;
    }

    untracked(() => {
      const state = this.buildUrlStateFromCurrentFilters();
      const next = serialize(state);

      // design §6.2 step 4 — compare the MERGED result (nulls stripped),
      // not the raw serialization, against the current query string. A
      // raw-serialization comparison would navigate on every run whenever
      // an unrecognized parameter such as `?utm_source` is present, because
      // `next` never carries that key at all.
      const currentParams = this.route.snapshot.queryParams as Record<string, string>;
      const merged: Record<string, string> = { ...currentParams };
      for (const [key, value] of Object.entries(next)) {
        if (value === null) {
          delete merged[key];
        } else {
          merged[key] = value;
        }
      }

      if (ResultsCenterComponent.paramsEqual(merged, currentParams)) {
        // NFR-RCU-001 loop guard — the merged result is identical to what
        // the address bar already shows, so navigating would be a no-op
        // write (and, if it re-entered a read path, a loop).
        return;
      }

      // Handle the rejection (carried from the T-06 review): an unhandled
      // `router.navigate` rejection inside an `effect()` is the same defect
      // class as the one `initializeState`'s removed `await` used to risk —
      // just relocated. There is nothing meaningful to recover into here
      // (no toast, no state to roll back), so this only prevents an
      // unhandled promise rejection from surfacing.
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: next,
        queryParamsHandling: 'merge',
        replaceUrl: true
      }).catch((error: unknown) => {
        console.error('[results-center-url] Failed to write filters to the address bar', error);
      });
    });
  });

  /**
   * The exact inverse of `ResultsCenterService.seedFromUrl()`'s mapping
   * (`results-center.service.ts:810-845`) — kept in sync with it so a
   * round-trip (`parse(serialize(state))` reproduces `state`) holds
   * (R-RCU-003 AC.2). Called only from inside `untracked(...)` above; every
   * signal read here must stay that way (D-URL-15).
   *
   * **Type hazard at the boundary** (T-03 review hand-off): `serialize`
   * calls `.toUpperCase()` on every `contract` element. `TableFilters.contracts`
   * ultimately traces back to `GetContractsByUser`/`FindContracts`, both of
   * which declare `agreement_id?: string` — an `undefined` slipping through
   * would throw a `TypeError` inside `serialize`. `resultsFilter()['contract-codes']`
   * is typed `string[]`, but that type is reached through the same upstream
   * cast, so the type guard below is a real runtime narrowing, not a
   * formality.
   */
  private buildUrlStateFromCurrentFilters(): ResultsCenterUrlState {
    const resultsFilter = this.resultsCenterService.resultsFilter();
    const scope: TabScope = this.resultsCenterService.myResultsFilterItem()?.id === 'my' ? 'my' : 'all';

    const contract = (resultsFilter['contract-codes'] ?? []).filter(
      (code): code is string => typeof code === 'string' && code.length > 0
    );
    const status = resultsFilter['status-codes'] ?? [];
    const year = resultsFilter['years'] ?? [];
    const source = resultsFilter['platform-code'] ?? [];
    const indicator = resultsFilter['indicator-codes-tabs']?.[0];
    // D-URL-18 — the sidebar multiselect. A DIFFERENT filter from the tab
    // above, on a different wire key. Without this read the multiselect's
    // selection never reached the address bar at all: it filtered the table
    // and rendered a chip, then vanished on reload or share — leaving
    // R-RCU-001 and R-RCU-003 AC.1 unmet for the indicator dimension, the
    // one users reach for most.
    const indicators = resultsFilter['indicator-codes-filter'] ?? [];

    return {
      filters: {
        ...(indicator !== undefined ? { indicator } : {}),
        ...(indicators.length > 0 ? { indicators } : {}),
        ...(contract.length > 0 ? { contract } : {}),
        ...(status.length > 0 ? { status } : {}),
        ...(year.length > 0 ? { year } : {}),
        ...(source.length > 0 ? { source } : {})
      },
      scope
    };
  }

  /**
   * design §6.2 step 4 — set-equality over key/value pairs, order-independent
   * (`currentParams`/`merged` are built from different code paths, so key
   * order is not meaningful here).
   */
  private static paramsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    return aKeys.every((key, index) => key === bKeys[index] && a[key] === b[key]);
  }

  /**
   * T-06 read path (design.md §6.1). Init-only, from `route.snapshot` —
   * never a `queryParamMap` subscription (D-URL-5): the component does not
   * listen for query-param changes, so the write path (T-08) cannot re-enter
   * this read.
   */
  private async initializeState(): Promise<void> {
    this.resultsCenterService.primaryContractId.set(null);
    this.resultsCenterService.showFiltersSidebar.set(false);
    this.resultsCenterService.showConfigurationsSidebar.set(false);

    const { filters, scope: urlScope, dropped, hadRecognizedParam } = parse(this.route.snapshot.queryParamMap);

    if (!hadRecognizedParam) {
      // R-RCU-004 AC.2 — no recognized parameter (canonical or legacy, valid
      // or not) means this is not a filtered deep link: fall through to
      // session restore / pinned-tab preference exactly as a parameter-less
      // visit resolves today. `?utm_source=email` alone lands here too
      // (R-RCU-004 AC.3) — it is not a member of RECOGNIZED_PARAM_NAMES.
      const restoredState = this.resultsCenterService.restorePersistedState(this.stateKey);
      this.resultsCenterService.primaryContractId.set(null);
      this.resultsCenterService.activateStatePersistence(this.stateKey);

      const preferredTab = await this.loadPinnedTabPreference();

      if (restoredState) {
        await this.resultsCenterService.main();
        return;
      }

      if (preferredTab === 'my') {
        this.loadMyResults();
        return;
      }

      this.loadAllResults();
      return;
    }

    // R-RCU-004 — any recognized parameter, even one whose only value turned
    // out invalid, suppresses session restore entirely and counts as
    // explicit navigation intent (R-RCU-005 second scenario: a wholly
    // invalid link still does not fall through to restore).
    this.resultsCenterService.activateStatePersistence(this.stateKey);

    // R-RCU-002 AC.6/AC.7 — resolve the my/all scope explicitly: `tab` when
    // present, otherwise the pinned-tab preference, exactly as a
    // parameter-less visit resolves it today. Never left at whatever the
    // root-singleton service happened to hold from a previous route.
    //
    // Reviewer fix (attempt 2, precedence lens) — `loadPinnedTabPreference()`
    // is always awaited, on *both* branches, exactly like the base revision
    // did on both its branches (`component.ts:101`/`:133` pre-rewrite). It is
    // the only populator of `pinnedTab` besides `togglePin`, and `pinnedTab`
    // drives `orderedFilterItems()`/`isPinned()` regardless of which scope
    // the URL asked for — a `?tab=my&contract=A100` deep link must still
    // render the tab strip in the user's pinned order with the star on the
    // right row. `urlScope` wins the *scope* resolution; the preference is
    // only ever the fallback when `tab` is absent.
    const preferred = await this.loadPinnedTabPreference();
    const scope = urlScope ?? preferred;

    // seedFromUrl writes tableFilters/resultsFilter/appliedFilters/scope
    // atomically, before any fetch (design §7.1) — never advances
    // userFilterMutations (T-05), this is the read path, not a user mutation.
    this.resultsCenterService.seedFromUrl({ filters, scope });

    // Hand-off 4 (T-04 review) — `seedFromUrl` resets every list `tableFilters`
    // slot it owns to `[]` when the URL doesn't carry that filter (`?? []` on
    // status/sources/contracts/years), but `levers` participates in none of
    // that update at all, because `lever` has no URL representation (D-URL-6).
    // Left alone, a lever picked on `/project-detail` would survive onto this
    // route on the shared singleton and inflate `countTableFiltersSelected`
    // (results-center.service.ts:406-416) — the filter badge would count a
    // filter that renders no chip and is not sent to the API. Closed here,
    // not in `seedFromUrl`: a deep link is a complete description of the
    // desired filter state, so anything the URL doesn't name should not
    // carry over from a previous route either. This is a plain signal write
    // on the service's already-public `tableFilters`, not a service-file change.
    //
    // `indicators` USED TO be cleared here alongside `levers`, added by
    // T-11's precedence lens to stop a stale sidebar selection leaking in
    // from a prior route on the shared singleton. **D-URL-18 moved that
    // responsibility into `seedFromUrl`, and this line must NOT clear it
    // again.** `seedFromUrl` now writes
    // `indicators: (filters.indicators ?? []).map(...)` unconditionally, so
    // it already resets the slot to `[]` on a link that names no
    // `indicators` — the exact leak the old clear existed to close — while
    // a link that DOES name them seeds them. Clearing here after the seed
    // would wipe the freshly seeded multiselect on every `?indicators=`
    // deep link and silently restore the original defect.
    //
    // `levers` stays: `lever` has no URL representation at all (D-URL-6), so
    // `seedFromUrl` never touches that slot and nothing else resets it.
    this.resultsCenterService.tableFilters.update(prev => ({ ...prev, levers: [] }));

    // Hand-off 3 (T-04 review) — `seedFromUrl` deliberately never calls
    // `resetResultsTablePaginatorToFirstPage()` (that method is private to
    // the service), but `resultsTablePaginatorFirst` is a public signal on
    // the same shared singleton. Without resetting it here, a user who had
    // paged to page 3 on `/project-detail` and then opens a Results Center
    // deep link would fetch page 3 of the *new* filter instead of page 1.
    this.resultsCenterService.resultsTablePaginatorFirst.set(0);

    // Exactly one results request for the initial load, fired after seeding
    // — never fetch unfiltered and then re-fetch (R-RCU-002 AC.4).
    await this.resultsCenterService.main();

    // design §6.1 step 8 — the toast fires before this method returns,
    // unconditionally on `dropped.length`, regardless of anything the write
    // effect does afterward (T-08 removed the trailing wipe this used to be
    // ordered against — see the comment below).
    if (dropped.length > 0) {
      // D-URL-4 / toast safety (T-02 review hand-off): name counts only.
      // `DroppedUrlToken.value` is the raw, unescaped token — reading it
      // here would defeat design §7.4's non-interpolation guarantee, which
      // is what makes "a token containing markup cannot alter the toast's
      // rendering" structural rather than a matter of escaping correctly.
      this.actions.showToast({
        severity: 'warning',
        summary: 'Link partially applied',
        detail: `${dropped.length} part${dropped.length === 1 ? '' : 's'} of the link ${dropped.length === 1 ? 'was' : 'were'} not recognized and ${
          dropped.length === 1 ? 'was' : 'were'
        } ignored.`
      });
    }

    // T-08 removed both pre-existing query-parameter wipes together with the
    // write path they depended on (design §12 "Reversion challenge" /
    // D-URL-8). The address bar is now kept in sync by `urlWriteEffect`
    // above, which is safe to leave the URL alone here because it fires on
    // user intent (`userFilterMutations`), never on this read path.
  }

  showSignal = signal(false);

  toggleSidebar() {
    this.showSignal.update(value => !value);
  }

  applyFilters() {
    this.resultsCenterService.applyFilters();
  }

  // Pin functionality methods
  //
  // Reviewer fix (attempt 2, reliability lens) — `catch` added because Fix 2
  // (above, in `initializeState`) made this call unconditional on every deep
  // link, not just the no-recognized-param path. Before, a `try/finally`
  // with no `catch` meant a rejecting `GET_Configuration` aborted
  // `initializeState` before `seedFromUrl`/`main()` ever ran — zero fetches,
  // zero toast, an empty table, and an unhandled rejection surfacing through
  // `void this.initializeState()` (`ngOnInit`) — on EVERY deep link, even
  // though the URL alone fully determines the filter and only the *scope*
  // needs this preference. A flaky config endpoint must not be able to
  // silence a deep link, so a failure here degrades to the same default the
  // "no response data" branch already uses ('all') instead of propagating.
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
    } catch {
      this.pinnedTab.set('all');
      this.resultsCenterService.pinnedTab.set('all');
      return 'all';
    } finally {
      this.loadingPin.set(false);
    }
  }

  onActiveItemChange = (event: MenuItem): void => {
    // D-URL-15 / R3-1: the my/all tab switch is a user-facing mutation, and this is
    // the component's own handler bound from the template (results-center.component.html:14) —
    // the increment MUST live here, not in the service's dead onActiveItemChange.
    this.resultsCenterService.noteUserFilterMutation();
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

      // D-URL-15 / R3-1: the pin toggle is a user-facing mutation, and this is the
      // component's own handler (reached via onPinIconClick, bound in the template
      // at results-center.component.html:17) — the increment MUST live here. It is
      // published only AFTER the state it publishes has been written (post-`await`
      // signal mutation above): T-08's effect tracks this counter as its only
      // dependency and reads filter state untracked, so bumping before the mutation
      // would let the effect serialize stale (pre-toggle) state, no-op on the loop
      // guard, and never fire again once the real mutation lands.
      this.resultsCenterService.noteUserFilterMutation();

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

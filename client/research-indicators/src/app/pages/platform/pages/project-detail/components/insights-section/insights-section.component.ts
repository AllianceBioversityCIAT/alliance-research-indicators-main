import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { GetContractInsightsService } from '@shared/services/get-contract-insights.service';
import { SectionMeta } from '@shared/interfaces/contract-indicator-details.interface';
import { ContractInsightsReport, DeclaredSdg, SdgCoverageItem } from '@shared/interfaces/contract-insights.interface';

// Per-card render states (R-IN-003, design §5 workflow rule 3). Unlike F3
// (`indicator-deep-dive`), F4 sections are NEVER omitted from a successfully
// loaded payload (D-F4-3) — a section key missing its object/meta is a
// malformed-payload defensive case, folded into 'error' rather than given
// its own 'unavailable' bucket.
// - skeleton: not yet intersected, or the aggregate request is in flight.
// - error: the whole aggregate failed (`loadError()`) OR this section
//   resolved null (`sectionFailed(key)`) — shared retry, never sparse/empty.
//   `loadError()` is checked BEFORE `sectionFailed()`: when the whole load
//   fails, `data()` is null and `sectionFailed` returns false for every key
//   (T-07's contract) — checking it first would render six empty notices
//   instead of one shared error (T-07 Reviewer forward pointer).
// - empty: n = 0 — notice only, no chart/chips.
// - sparse: 0 < n < total_results — sparse notice + content slot.
// - complete: n = total_results — content slot only.
export type InsightCardState = 'skeleton' | 'error' | 'empty' | 'sparse' | 'complete';

type InsightSectionKey = keyof ContractInsightsReport;

@Component({
  selector: 'app-insights-section',
  standalone: true,
  imports: [ButtonModule, SkeletonModule],
  templateUrl: './insights-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InsightsSectionComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly getContractInsightsService = inject(GetContractInsightsService);

  readonly contractId = input<string>('');
  // Contract-declared SDGs (F1 hero source, already loaded on the dashboard —
  // D-F4-4). NEVER fetched here; the SDG card's chip derivation is a pure
  // client-side comparison against this input + the lazy `sdg_coverage`
  // section (R-IN-003 SDG comparison scenario BUT-clause).
  readonly declaredSdgs = input<DeclaredSdg[]>([]);

  private readonly hasIntersected = signal(false);
  private observer: IntersectionObserver | null = null;

  // Pre-fetch AND in-flight both render the skeleton (K-016 idiom, copied
  // from F3 D-F3-5) — distinct from the empty/notice states.
  readonly showSkeleton = computed(() => !this.hasIntersected() || this.getContractInsightsService.loading());
  readonly hasLoadError = computed(() => this.getContractInsightsService.loadError());

  // Single source of truth for a card's tri-state, given its section's meta
  // (null when the section failed or the payload never loaded) and whether
  // the service already flagged that key as failed. Never re-derive the
  // `=== null` check inline in the template (T-07's contract).
  private cardState(meta: SectionMeta | null, sectionFailed: boolean): InsightCardState {
    if (this.showSkeleton()) {
      return 'skeleton';
    }
    if (this.hasLoadError() || sectionFailed) {
      return 'error';
    }
    if (!meta) {
      // A section object without its meta is a malformed/absent payload —
      // never silently rendered as the n=0 empty state (which asserts a
      // real, counted zero) — surfaced as the same shared-retry error.
      return 'error';
    }
    if (meta.n <= 0) {
      return 'empty';
    }
    if (meta.n < meta.total_results) {
      return 'sparse';
    }
    return 'complete';
  }

  private sectionFailed(key: InsightSectionKey): boolean {
    return this.getContractInsightsService.sectionFailed(key);
  }

  // --- Reach ---------------------------------------------------------------

  readonly reach = computed(() => this.getContractInsightsService.reach());
  readonly reachState = computed<InsightCardState>(() => this.cardState(this.reach()?.meta ?? null, this.sectionFailed('reach')));
  readonly reachOverall = computed(() => this.reach()?.overall ?? null);
  // Rows flagged not-disaggregated render as a SEPARATE count, never folded
  // into the (future) stacked bars (R-IN-003 Reach card scenario BUT-clause).
  readonly reachNotDisaggregatedRows = computed(() => this.reach()?.not_disaggregated_rows ?? 0);
  readonly reachHasByActorTypeRows = computed(() => (this.reach()?.by_actor_type ?? []).length > 0);

  // --- SDG coverage ----------------------------------------------------------

  readonly sdgCoverage = computed(() => this.getContractInsightsService.sdgCoverage());
  readonly sdgCoverageState = computed<InsightCardState>(() =>
    this.cardState(this.sdgCoverage()?.meta ?? null, this.sectionFailed('sdg_coverage'))
  );

  private readonly reportedSdgs = computed<SdgCoverageItem[]>(() => this.sdgCoverage()?.sdgs ?? []);
  private readonly declaredSdgIds = computed(() => new Set(this.declaredSdgs().map(sdg => sdg.id)));
  private readonly reportedSdgIds = computed(() => new Set(this.reportedSdgs().map(sdg => sdg.sdg_id)));

  // Three chip groups (R-IN-003 SDG comparison scenario): reported∩declared
  // and reported-only carry the reported count; declared-only carries no
  // count (never reported). Pure set derivation over the two already-loaded
  // inputs — no additional HTTP request (R-IN-003 BUT-clause).
  readonly reportedAndDeclaredSdgs = computed<SdgCoverageItem[]>(() => {
    const declaredIds = this.declaredSdgIds();
    return this.reportedSdgs().filter(sdg => declaredIds.has(sdg.sdg_id));
  });
  readonly declaredOnlySdgs = computed<DeclaredSdg[]>(() => {
    const reportedIds = this.reportedSdgIds();
    return this.declaredSdgs().filter(sdg => !reportedIds.has(sdg.id));
  });
  readonly reportedOnlySdgs = computed<SdgCoverageItem[]>(() => {
    const declaredIds = this.declaredSdgIds();
    return this.reportedSdgs().filter(sdg => !declaredIds.has(sdg.sdg_id));
  });

  // Guards the "n > 0 but the breakdown array is empty" edge case (inactive
  // lookup rows, T-01 Reviewer forward pointer): a real, counted `n` with no
  // rows to derive chips from must render a sensible notice, never a silently
  // empty (and therefore misleading) chip area.
  readonly sdgHasAnyChips = computed(
    () => this.reportedAndDeclaredSdgs().length > 0 || this.declaredOnlySdgs().length > 0 || this.reportedOnlySdgs().length > 0
  );

  // --- Evidence ----------------------------------------------------------

  readonly evidence = computed(() => this.getContractInsightsService.evidence());
  readonly evidenceState = computed<InsightCardState>(() => this.cardState(this.evidence()?.meta ?? null, this.sectionFailed('evidence')));
  readonly evidenceCoveragePercent = computed(() => {
    const section = this.evidence();
    const totalResults = section?.meta?.total_results ?? 0;
    if (!section || totalResults <= 0) {
      return 0;
    }
    return Math.round((section.results_with_evidence / totalResults) * 100);
  });
  readonly evidenceHasRoleRows = computed(() => (this.evidence()?.by_role ?? []).length > 0);

  // --- Review flow ---------------------------------------------------------

  readonly reviewFlow = computed(() => this.getContractInsightsService.reviewFlow());
  readonly reviewFlowState = computed<InsightCardState>(() =>
    this.cardState(this.reviewFlow()?.meta ?? null, this.sectionFailed('review_flow'))
  );
  readonly reviewFlowHasDecisionRows = computed(() => (this.reviewFlow()?.by_decision ?? []).length > 0);
  readonly cycleTime = computed(() => this.reviewFlow()?.cycle_time ?? null);
  readonly excludedForIncompleteHistory = computed(() => this.reviewFlow()?.excluded_for_incomplete_history ?? 0);

  // --- Contributing levers ---------------------------------------------------

  readonly contributingLevers = computed(() => this.getContractInsightsService.contributingLevers());
  readonly contributingLeversState = computed<InsightCardState>(() =>
    this.cardState(this.contributingLevers()?.meta ?? null, this.sectionFailed('contributing_levers'))
  );
  readonly leversHasRows = computed(() => (this.contributingLevers()?.levers ?? []).length > 0);

  // --- Keywords ------------------------------------------------------------

  readonly keywords = computed(() => this.getContractInsightsService.keywords());
  readonly keywordsState = computed<InsightCardState>(() => this.cardState(this.keywords()?.meta ?? null, this.sectionFailed('keywords')));
  readonly keywordsHasRows = computed(() => (this.keywords()?.keywords ?? []).length > 0);

  // ---------------------------------------------------------------------
  // Laziness (D-F3-5 idiom, copied from indicator-deep-dive): fetch on first
  // viewport intersection or keyboard focus, once per contract view, never
  // from ngOnInit/constructor (KZ-015).
  // ---------------------------------------------------------------------

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      // Declared gap (D-F3-5): environments without IntersectionObserver
      // cannot signal viewport entry, so we load once on init rather than
      // never loading. jsdom also lacks a real IntersectionObserver —
      // component specs stub `createIntersectionObserver` instead of relying
      // on this fallback branch, keeping the KZ-015 transition tests
      // meaningful.
      this.triggerLoad();
      return;
    }

    this.observer = this.createIntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        this.triggerLoad();
      }
    });
    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  // Wrapped so component specs can replace the boundary (jsdom has no real
  // IntersectionObserver — D-F3-5). Never call `load` from ngOnInit/constructor.
  protected createIntersectionObserver(callback: IntersectionObserverCallback): IntersectionObserver {
    return new IntersectionObserver(callback, { threshold: 0 });
  }

  // Keyboard users focusing into the region also trigger the lazy fetch, not
  // only pointer/scroll intersection (R-IN-003 laziness contract).
  onRegionFocusIn(): void {
    this.triggerLoad();
  }

  // Shared retry (same rationale as F3's `indicator-deep-dive.retry()`): uses
  // `load(contractId, { force: true })`, never `update()` — `update()` is a
  // no-op until `loadedContractId` has been set by a *successful* load, so on
  // the ordinary first-fetch failure a retry via `update()` would issue no
  // request at all.
  retry(): void {
    const contractId = this.contractId();
    if (contractId) {
      void this.getContractInsightsService.load(contractId, { force: true });
    }
  }

  private triggerLoad(): void {
    if (this.hasIntersected()) {
      return;
    }
    const contractId = this.contractId();
    if (!contractId) {
      // Don't mark as intersected yet — an empty contractId means the parent
      // hasn't resolved its route param; leave the door open for a later
      // intersection/focus event to retry once it becomes available.
      return;
    }
    this.hasIntersected.set(true);
    void this.getContractInsightsService.load(contractId);
  }
}

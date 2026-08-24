import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { GetIndicatorDetailsService } from '@shared/services/get-indicator-details.service';
import { ContractIndicatorDetailsReport, SectionMeta } from '@shared/interfaces/contract-indicator-details.interface';

// Minimal shape consumed from the F1 indicator summaries computed on
// ProjectDashboardComponent (`indicatorsWithResults()`). Tabs are rendered in
// the order this array arrives — the same order as the Results-by-indicator
// bars (D-F3-2) — never re-sorted here.
export interface IndicatorDeepDiveTab {
  id: number | string;
  indicatorId?: number | string | null;
  label: string;
  value: number;
  color?: string;
}

type DeepDiveSectionKey = Exclude<keyof ContractIndicatorDetailsReport, 'reporting_velocity'>;

// Server-side mapping (agresso-contract module, IndicatorsEnum): the six
// indicator types that carry satellite metadata. Innovation Use's id (6)
// intentionally has no chart builder concerns here — T-08 is state/tab
// plumbing only (T-09 owns the chart grids).
const INDICATOR_ID_TO_SECTION_KEY: Record<number, DeepDiveSectionKey> = {
  1: 'capacity_sharing',
  2: 'innovation_dev',
  3: 'knowledge_product',
  4: 'policy_change',
  5: 'oicr',
  6: 'innovation_use'
};

// Per-tab render states (R-DD-003, D-F3-7):
// - skeleton: not yet intersected, or the aggregate request is in flight (distinct from empty — K-016).
// - error: the whole aggregate failed OR this section resolved null (partial failure) — shared retry, never sparse/empty.
// - unavailable: the section key is absent from a successfully loaded payload — should not happen for a tab with
//   results, but rendered as a notice (not an error) per design D-F3-7's absence/failure distinction.
// - empty: n = 0 — notice only, no charts, no retry.
// - sparse: 0 < n < total_results — sparse notice + charts slot.
// - complete: n = total_results — charts slot only.
export type DeepDiveTabState = 'skeleton' | 'error' | 'unavailable' | 'empty' | 'sparse' | 'complete';

@Component({
  selector: 'app-indicator-deep-dive',
  standalone: true,
  imports: [ButtonModule, SkeletonModule],
  templateUrl: './indicator-deep-dive.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorDeepDiveComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly getIndicatorDetailsService = inject(GetIndicatorDetailsService);

  readonly contractId = input<string>('');
  readonly indicators = input<IndicatorDeepDiveTab[]>([]);
  // Whether the F1 indicator summaries (the `indicators` input's source) are
  // still loading. Distinguishes "not loaded yet" from "genuinely zero
  // indicators with results" while `tabs()` is empty in both cases — the
  // panel renders its own skeleton, never the terminal empty notice, during
  // the parent's load window.
  readonly loading = input<boolean>(false);

  private readonly hasIntersected = signal(false);
  private readonly activeIndicatorIdOverride = signal<number | string | null>(null);
  private observer: IntersectionObserver | null = null;

  readonly tabs = computed(() => this.indicators());

  readonly activeTab = computed<IndicatorDeepDiveTab | null>(() => {
    const list = this.tabs();
    if (list.length === 0) {
      return null;
    }
    const overrideId = this.activeIndicatorIdOverride();
    if (overrideId !== null) {
      const found = list.find(tab => tab.id === overrideId);
      if (found) {
        return found;
      }
    }
    return list[0];
  });

  // Keyed strictly off `indicatorId` (the real CLARISA/server indicator id) —
  // never falls back to `tab.id`, which can be a plain array index for a
  // fallback-labelled indicator (see IndicatorDeepDiveTab doc) and would
  // otherwise resolve to an unrelated section by coincidence.
  readonly activeSectionKey = computed<DeepDiveSectionKey | null>(() => {
    const tab = this.activeTab();
    if (!tab || tab.indicatorId === null || tab.indicatorId === undefined) {
      return null;
    }
    const numericId = typeof tab.indicatorId === 'number' ? tab.indicatorId : Number(tab.indicatorId);
    return Number.isFinite(numericId) ? (INDICATOR_ID_TO_SECTION_KEY[numericId] ?? null) : null;
  });

  // Pre-fetch AND in-flight both render the skeleton — the panel is visible
  // with tabs at first paint (D-F3-2), but chart/notice content waits for the
  // lazy aggregate. Distinct from the empty/notice states (K-016).
  readonly showSkeleton = computed(() => !this.hasIntersected() || this.getIndicatorDetailsService.loading());

  readonly hasLoadError = computed(() => this.getIndicatorDetailsService.loadError());

  readonly activeTabState = computed<DeepDiveTabState>(() => {
    if (this.showSkeleton()) {
      return 'skeleton';
    }
    if (this.hasLoadError()) {
      return 'error';
    }

    const key = this.activeSectionKey();
    if (!key) {
      return 'unavailable';
    }

    // Single source of truth for "this section failed" (T-07's contract) —
    // never re-derive the `=== null` check inline.
    if (this.getIndicatorDetailsService.sectionFailed(key)) {
      return 'error';
    }

    const section = this.getIndicatorDetailsService.data()?.[key];
    // `!section` (not `=== undefined`) so the compiler narrows out `null`
    // too: `sectionFailed(key)` already returned 'error' above for a null
    // section (T-07's contract, D-F3-7), so this branch is structurally
    // unreachable for null — but TS can't correlate the two separate
    // `data()` reads, and this stays the type-safety net, not a second
    // failure check (never re-derive `=== null` as a decision here).
    if (!section) {
      return 'unavailable';
    }

    const meta = section.meta;
    if (!meta) {
      // A section object without its meta is a malformed/absent payload —
      // the same "should not happen" notice as a missing key, never the
      // n=0 empty state (which asserts a real, counted zero).
      return 'unavailable';
    }
    if (meta.n <= 0) {
      return 'empty';
    }
    if (meta.n < meta.total_results) {
      return 'sparse';
    }
    return 'complete';
  });

  readonly activeSectionMeta = computed<SectionMeta | null>(() => {
    const key = this.activeSectionKey();
    if (!key) {
      return null;
    }
    const section = this.getIndicatorDetailsService.data()?.[key];
    return section?.meta ?? null;
  });

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      // Declared gap (D-F3-5): environments without IntersectionObserver cannot
      // signal viewport entry, so we load once on init rather than never
      // loading. jsdom also lacks a real IntersectionObserver — component
      // specs stub `createIntersectionObserver` instead of relying on this
      // fallback branch, keeping the KZ-015 transition tests meaningful.
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
  // only pointer/scroll intersection (R-DD-003 laziness contract).
  onRegionFocusIn(): void {
    this.triggerLoad();
  }

  selectTab(tab: IndicatorDeepDiveTab): void {
    this.activeIndicatorIdOverride.set(tab.id);
  }

  // Roving-tabindex keyboard navigation for the tablist (WCAG 2.1 AA / C-4).
  onTabKeydown(event: KeyboardEvent, index: number): void {
    const list = this.tabs();
    if (list.length === 0) {
      return;
    }

    let targetIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = (index + 1) % list.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = (index - 1 + list.length) % list.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = list.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = list[targetIndex];
    if (target) {
      this.selectTab(target);
      this.focusTabAt(targetIndex);
    }
  }

  // Shared retry (R-DD-003): used for both a whole-payload load error and a
  // single failed section (`sectionFailed`) — same action, same endpoint.
  // Uses `load(contractId, { force: true })`, not `update()`: `update()` is a
  // no-op until `loadedContractId` has been set by a *successful* load
  // (T-07's contract), so on the ordinary first-fetch failure — the panel
  // intersects, the request fails, `loadedContractId` was never set — a
  // retry via `update()` issues no request and the retry button is inert.
  // `load(..., { force: true })` re-fetches unconditionally in both the
  // whole-payload-error and per-section-null cases.
  retry(): void {
    const contractId = this.contractId();
    if (contractId) {
      void this.getIndicatorDetailsService.load(contractId, { force: true });
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
    void this.getIndicatorDetailsService.load(contractId);
  }

  private focusTabAt(index: number): void {
    const tabButtons = this.elementRef.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    tabButtons[index]?.focus();
  }
}

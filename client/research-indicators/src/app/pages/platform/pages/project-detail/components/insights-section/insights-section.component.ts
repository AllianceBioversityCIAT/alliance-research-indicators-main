import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { GetContractInsightsService } from '@shared/services/get-contract-insights.service';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import { SectionMeta } from '@shared/interfaces/contract-indicator-details.interface';
import {
  ContractInsightsReport,
  DeclaredSdg,
  ReachDisaggregation,
  SdgCoverageItem
} from '@shared/interfaces/contract-insights.interface';

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

// Per-card identity (T-05, D-DN-4, RB-2 — the ONE allowed structural change).
// The dashboard narrative pass re-groups F4 cards across acts 4-6 while
// keeping ONE component doing the fetch/state work: `visibleCards` lets a
// mounted instance render only a NAMED SUBSET of its six cards, so multiple
// instances (one per act) each project a different slice of the same
// underlying `GetContractInsightsService` state. `data-card` attribute
// values in the template are the source of truth for these keys.
export type InsightCardKey = 'reach' | 'sdg-coverage' | 'evidence' | 'review-flow' | 'contributing-levers' | 'keywords';

export const ALL_INSIGHT_CARD_KEYS: InsightCardKey[] = [
  'reach',
  'sdg-coverage',
  'evidence',
  'review-flow',
  'contributing-levers',
  'keywords'
];

@Component({
  selector: 'app-insights-section',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, VizChartComponent],
  templateUrl: './insights-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InsightsSectionComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly getContractInsightsService = inject(GetContractInsightsService);
  private readonly darkModeService = inject(DarkModeService);
  readonly tokens = chartTokens(this.darkModeService.darkMode());

  readonly contractId = input<string>('');
  // Contract-declared SDGs (F1 hero source, already loaded on the dashboard —
  // D-F4-4). NEVER fetched here; the SDG card's chip derivation is a pure
  // client-side comparison against this input + the lazy `sdg_coverage`
  // section (R-IN-003 SDG comparison scenario BUT-clause).
  readonly declaredSdgs = input<DeclaredSdg[]>([]);

  // Which cards THIS instance renders (T-05, D-DN-4). Defaults to all six —
  // a caller that never sets this input keeps the pre-T-05 single-instance
  // behavior exactly (back-compat for `insights-section.component.spec.ts`,
  // which never sets it).
  readonly visibleCards = input<InsightCardKey[]>(ALL_INSIGHT_CARD_KEYS);
  // Unique id root for this instance's heading/aria-labelledby (T-05) — when
  // the dashboard mounts three instances (one per act) simultaneously, a
  // shared hardcoded id would duplicate DOM ids and break aria-labelledby
  // resolution. Defaults to the pre-T-05 id so a lone instance is unchanged.
  readonly instanceId = input<string>('insights-section');
  // Per-instance subtitle (T-05) — customized by the dashboard per act so a
  // one/two-card instance doesn't claim to cover cards it doesn't render.
  readonly description = input<string>(
    'Portfolio-level reach, SDG coverage, evidence, review flow, contributing levers, and keywords across all indicators.'
  );

  private readonly visibleCardKeys = computed(() => new Set(this.visibleCards()));

  isCardVisible(key: InsightCardKey): boolean {
    return this.visibleCardKeys().has(key);
  }

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
  // T-09 — chart option/table builders (R-IN-003 chart forms). Each builder
  // pairs 1:1 with a table-model computed of the same prefix — a chart is
  // only mounted (template `@if...as opts`) when its options resolve
  // non-null, so no viz-chart instance ever receives a null options input.
  // Same builder family as F1 rankings / F3's indicator-deep-dive (private,
  // locally scoped — not shared across components).
  // ---------------------------------------------------------------------

  private paletteColors(count: number): string[] {
    const t = this.tokens();
    const resolved = [t.series1, t.series2, t.series3, t.series4, t.series5].filter(Boolean);
    const fallback = [
      'var(--ac-viz-series-1)',
      'var(--ac-viz-series-2)',
      'var(--ac-viz-series-3)',
      'var(--ac-viz-series-4)',
      'var(--ac-viz-series-5)'
    ];
    const palette = resolved.length === 5 ? resolved : fallback;
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
  }

  private namedCountTable(caption: string, items: { name: string; count: number }[]): VizChartTableModel {
    return { caption, headers: ['Name', 'Count'], rows: items.map(i => [i.name, i.count]) };
  }

  // Horizontal bar, same idiom as F1 rankings / F3's `barOptions`: values are
  // rendered in reverse array order (bars read top-to-bottom in the server's
  // desc-by-count order) — a RENDER-ONLY reversal, never a re-sort of the
  // underlying data the table model reads.
  private barOptions(items: { name: string; count: number }[], seriesName: string, color?: string): EChartsOption | null {
    if (!items || items.length === 0) {
      return null;
    }
    const labels = items.map(i => i.name).slice().reverse();
    const values = items.map(i => i.count).slice().reverse();
    const barColor = color || this.tokens().series1 || 'var(--ac-viz-series-1)';
    return {
      grid: { top: 8, bottom: 16, left: 8, right: 24, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: 'var(--ac-grey-700)', fontFamily: 'Barlow' },
        splitLine: { lineStyle: { color: 'var(--ac-grey-200)' } }
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: 'var(--ac-grey-300)' } },
        axisLabel: { color: 'var(--ac-grey-700)', fontFamily: 'Barlow', width: 110, overflow: 'truncate' }
      },
      series: [
        {
          name: seriesName,
          type: 'bar',
          cursor: 'pointer',
          data: values,
          itemStyle: { color: barColor, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: 'var(--ac-grey-800)', fontFamily: 'Barlow' }
        }
      ]
    };
  }

  // Funnel data is rendered in the order it was delivered (`sort: 'none'`) —
  // the server owns stage/decision ordering (design R-1); the client must
  // never re-sort.
  private funnelOptions(items: { name: string; count: number }[], seriesName: string): EChartsOption | null {
    if (!items || items.length === 0) {
      return null;
    }
    const colors = this.paletteColors(items.length);
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [
        {
          name: seriesName,
          type: 'funnel',
          left: '6%',
          right: '6%',
          sort: 'none',
          gap: 4,
          label: { show: true, position: 'inside', color: 'var(--ac-white-1)', fontFamily: 'Barlow' },
          itemStyle: { borderColor: 'var(--ac-white-1)', borderWidth: 1 },
          data: items.map((it, idx) => ({ name: it.name, value: it.count, itemStyle: { color: colors[idx] } }))
        }
      ]
    };
  }

  // Five-stop sequential ramp (design §6), keyed off `--ac-viz-ramp-1..5` —
  // never `visualMap` (VisualMapComponent is not registered in viz-chart;
  // its absence fails silently at render — T-06 forward pointer).
  private rampColors(): string[] {
    const t = this.tokens();
    const resolved = [t.ramp1, t.ramp2, t.ramp3, t.ramp4, t.ramp5].filter(Boolean);
    const fallback = ['var(--ac-viz-ramp-1)', 'var(--ac-viz-ramp-2)', 'var(--ac-viz-ramp-3)', 'var(--ac-viz-ramp-4)', 'var(--ac-viz-ramp-5)'];
    return resolved.length === 5 ? resolved : fallback;
  }

  // Buckets a server-ordered rank (0 = most frequent) into the 5 ramp stops,
  // most-frequent → deepest stop, least-frequent-of-the-top-30 → lightest.
  // Discrete (not interpolated) so it stays deterministic and spec-testable.
  private treemapRampBucket(rank: number, total: number): number {
    if (total <= 1) {
      return 4;
    }
    return 4 - Math.min(4, Math.floor((rank / (total - 1)) * 4));
  }

  // WCAG label-contrast decision (design §6), computed from the ACTUALLY
  // RESOLVED ramp color for this node — never a fixed bucket-index rule.
  // `npm run tokens:validate` confirms the ramp's lightness direction is
  // intentionally inverted between themes (light mode: ramp-1 lightest ->
  // ramp-5 darkest; dark mode: ramp-1 darkest -> ramp-5 lightest), so a rule
  // like "buckets 3-4 always get white text" would be right in light mode
  // and backwards in dark mode. Reading the resolved color's own luminance —
  // never `isDarkMode()` itself, which the client conventions ban for color
  // decisions — self-corrects in both themes without an automated pixel
  // gate (requirements.md defect table; owned by tokens:validate + HITL).
  // Unresolved tokens (jsdom's `var(--ac-viz-ramp-N)` placeholders in tests)
  // fall back to a safe default.
  private contrastingLabelColor(color: string): string {
    const rgb = this.parseRgb(color);
    if (!rgb) {
      return 'var(--ac-grey-800)';
    }
    const [r, g, b] = rgb;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.55 ? 'var(--ac-grey-900)' : 'var(--ac-white-1)';
  }

  private parseRgb(color: string): [number, number, number] | null {
    const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color.trim());
    if (hex) {
      let value = hex[1];
      if (value.length === 3) {
        value = value
          .split('')
          .map(c => c + c)
          .join('');
      }
      const num = parseInt(value, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color.trim());
    if (rgb) {
      return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    }
    return null;
  }

  // --- Reach: stacked bars, women/men × youth/not-youth ---------------------

  // BUT-clause (R-IN-003 Reach card scenario): `not_disaggregated_rows`
  // NEVER enters this series — it is rendered as the separate count tile
  // already present in the template (T-08). Copy stays "actor groups",
  // never people/individuals (owner directive, T-08 interface doc).
  readonly reachStackedBarOptions = computed<EChartsOption | null>(() => {
    const overall = this.reachOverall();
    const byActorType = this.reach()?.by_actor_type ?? [];
    if (!overall || byActorType.length === 0) {
      return null;
    }
    const categories = ['Overall', ...byActorType.map(a => a.actor_type_name)];
    const rows: ReachDisaggregation[] = [overall, ...byActorType];
    const colors = this.paletteColors(4);
    return {
      grid: { top: 16, bottom: 40, left: 8, right: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: { color: 'var(--ac-grey-700)', fontFamily: 'Barlow', fontSize: 11 } },
      xAxis: {
        type: 'category',
        data: categories,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: 'var(--ac-grey-300)' } },
        axisLabel: { color: 'var(--ac-grey-700)', fontFamily: 'Barlow' }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: 'var(--ac-grey-700)', fontFamily: 'Barlow' },
        splitLine: { lineStyle: { color: 'var(--ac-grey-100)', type: 'dashed' } }
      },
      series: [
        {
          name: 'Women, youth',
          type: 'bar',
          stack: 'reach',
          cursor: 'pointer',
          data: rows.map(r => r.women_youth),
          itemStyle: { color: colors[0] }
        },
        {
          name: 'Women, not youth',
          type: 'bar',
          stack: 'reach',
          cursor: 'pointer',
          data: rows.map(r => r.women_not_youth),
          itemStyle: { color: colors[1] }
        },
        {
          name: 'Men, youth',
          type: 'bar',
          stack: 'reach',
          cursor: 'pointer',
          data: rows.map(r => r.men_youth),
          itemStyle: { color: colors[2] }
        },
        {
          name: 'Men, not youth',
          type: 'bar',
          stack: 'reach',
          cursor: 'pointer',
          data: rows.map(r => r.men_not_youth),
          itemStyle: { color: colors[3] }
        }
      ]
    };
  });

  readonly reachStackedBarTableModel = computed<VizChartTableModel | null>(() => {
    const overall = this.reachOverall();
    const byActorType = this.reach()?.by_actor_type ?? [];
    if (!overall || byActorType.length === 0) {
      return null;
    }
    const categories = ['Overall', ...byActorType.map(a => a.actor_type_name)];
    const rows: ReachDisaggregation[] = [overall, ...byActorType];
    return {
      caption: 'Actor-group reach by gender × youth, overall and per actor type',
      headers: ['Group', 'Women, youth', 'Women, not youth', 'Men, youth', 'Men, not youth'],
      rows: rows.map((r, idx) => [categories[idx], r.women_youth, r.women_not_youth, r.men_youth, r.men_not_youth])
    };
  });

  // --- Evidence: counts per role --------------------------------------------

  readonly evidenceRoleBarOptions = computed<EChartsOption | null>(() => {
    const items = this.evidence()?.by_role ?? [];
    return this.barOptions(
      items.map(i => ({ name: i.name, count: i.count })),
      'Evidence counts per role'
    );
  });

  readonly evidenceRoleBarTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.evidence()?.by_role ?? [];
    return items.length === 0
      ? null
      : this.namedCountTable(
          'Evidence counts per role',
          items.map(i => ({ name: i.name, count: i.count }))
        );
  });

  // --- Review flow: funnel by decision --------------------------------------

  // Renders `label`, never the raw `decision` code (R-IN-002 label MUST).
  readonly reviewFlowFunnelOptions = computed<EChartsOption | null>(() => {
    const items = this.reviewFlow()?.by_decision ?? [];
    return this.funnelOptions(
      items.map(i => ({ name: i.label, count: i.count })),
      'Review decisions'
    );
  });

  readonly reviewFlowFunnelTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.reviewFlow()?.by_decision ?? [];
    return items.length === 0
      ? null
      : this.namedCountTable(
          'Review decisions, ordered as delivered',
          items.map(i => ({ name: i.label, count: i.count }))
        );
  });

  // --- Contributing levers: bars per lever ----------------------------------

  readonly leversBarOptions = computed<EChartsOption | null>(() => {
    const items = this.contributingLevers()?.levers ?? [];
    return this.barOptions(
      items.map(i => ({ name: i.short_name, count: i.count })),
      'Contributing levers by result count'
    );
  });

  readonly leversBarTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.contributingLevers()?.levers ?? [];
    return items.length === 0
      ? null
      : this.namedCountTable(
          'Contributing levers by result count',
          items.map(i => ({ name: i.short_name, count: i.count }))
        );
  });

  // --- Keywords: treemap, top 30 by frequency -------------------------------

  readonly keywordsTreemapOptions = computed<EChartsOption | null>(() => {
    const items = this.keywords()?.keywords ?? [];
    if (items.length === 0) {
      return null;
    }
    const palette = this.rampColors();
    const total = items.length;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [
        {
          name: 'Top keywords',
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: { show: true, fontFamily: 'Barlow', overflow: 'truncate' },
          itemStyle: { borderColor: 'var(--ac-white-1)', borderWidth: 1, gapWidth: 1 },
          data: items.map((it, idx) => {
            const bucket = this.treemapRampBucket(idx, total);
            return {
              name: it.keyword,
              value: it.count,
              itemStyle: { color: palette[bucket] },
              label: { color: this.contrastingLabelColor(palette[bucket]) }
            };
          })
        }
      ]
    };
  });

  readonly keywordsTreemapTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.keywords()?.keywords ?? [];
    if (items.length === 0) {
      return null;
    }
    return {
      caption: 'Top 30 keywords by result frequency',
      headers: ['Keyword', 'Count'],
      rows: items.map(i => [i.keyword, i.count])
    };
  });

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

    // T-05/D-DN-4: acts 4-6 each mount their own instance, each with its own
    // observer, over the SAME contract — "ONE fetch feeds all repositioned
    // F4 cards". `GetContractInsightsService.load()` only dedupes AFTER a
    // load has completed (`loadedContractId() === contractId && data()`), so
    // it does not by itself cover two instances intersecting before the
    // first request resolves (e.g. both acts already in the initial
    // viewport). This closes that gap: if a load for this contract is
    // already in flight or already loaded, this instance still marks itself
    // observed (clearing its own skeleton once the shared signals resolve)
    // without issuing a second request.
    if (this.getContractInsightsService.loading() || this.getContractInsightsService.loadedContractId() === contractId) {
      return;
    }
    void this.getContractInsightsService.load(contractId);
  }
}

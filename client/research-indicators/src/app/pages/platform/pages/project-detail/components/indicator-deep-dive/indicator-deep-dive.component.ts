import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { GetIndicatorDetailsService } from '@shared/services/get-indicator-details.service';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import {
  ContractIndicatorDetailsReport,
  SectionMeta,
  InnovationDevScalabilityProfile
} from '@shared/interfaces/contract-indicator-details.interface';

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
  imports: [ButtonModule, SkeletonModule, VizChartComponent, NgTemplateOutlet],
  templateUrl: './indicator-deep-dive.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorDeepDiveComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly getIndicatorDetailsService = inject(GetIndicatorDetailsService);
  private readonly darkModeService = inject(DarkModeService);
  readonly tokens = chartTokens(this.darkModeService.darkMode());

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

  // ---------------------------------------------------------------------
  // T-09 — per-tab chart grid option/table builders (R-DD-004, D-F3-3/6).
  // Each builder pairs 1:1 with a table-model computed of the same prefix
  // — a chart is only rendered (template `@if`) when both resolve non-null,
  // so no viz-chart instance ever receives an empty tableModel.
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

  private donutOptions(items: { name: string; count: number }[], seriesName: string): EChartsOption | null {
    if (!items || items.length === 0 || items.every(i => i.count === 0)) {
      return null;
    }
    const colors = this.paletteColors(items.length);
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: 'var(--ac-grey-700)', fontFamily: 'Barlow', fontSize: 11 }
      },
      series: [
        {
          name: seriesName,
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: true,
          cursor: 'pointer',
          itemStyle: { borderColor: 'var(--ac-white-1)', borderWidth: 2 },
          label: { show: false },
          labelLine: { show: false },
          data: items.map((it, idx) => ({ name: it.name, value: it.count, itemStyle: { color: colors[idx] } }))
        }
      ]
    };
  }

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

  private verticalBarOptions(categories: string[], values: number[], seriesName: string, color?: string): EChartsOption | null {
    if (!categories || categories.length === 0) {
      return null;
    }
    const barColor = color || this.tokens().series2 || 'var(--ac-viz-series-2)';
    return {
      grid: { top: 16, bottom: 24, left: 8, right: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
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
          name: seriesName,
          type: 'bar',
          cursor: 'pointer',
          data: values,
          itemStyle: { color: barColor, borderRadius: [4, 4, 0, 0] }
        }
      ]
    };
  }

  // Funnel data is rendered in the order it was delivered (`sort: 'none'`) —
  // the server owns stage ordering (design R-1); the client must never re-sort.
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

  private radarOptions(axes: { name: string; max: number }[], values: (number | null)[], seriesName: string): EChartsOption | null {
    if (!axes || axes.length === 0) {
      return null;
    }
    const color = this.tokens().series1 || 'var(--ac-viz-series-1)';
    return {
      radar: {
        indicator: axes,
        axisName: { color: 'var(--ac-grey-700)', fontFamily: 'Barlow', fontSize: 10 },
        splitLine: { lineStyle: { color: 'var(--ac-grey-200)' } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: 'var(--ac-grey-300)' } }
      },
      tooltip: { trigger: 'item' },
      series: [
        {
          name: seriesName,
          type: 'radar',
          data: [
            {
              value: values,
              name: seriesName,
              areaStyle: { color, opacity: 0.25 },
              lineStyle: { color, width: 1.5 },
              itemStyle: { color }
            }
          ]
        }
      ]
    };
  }

  private scalabilityLabel(profile: InnovationDevScalabilityProfile): string {
    return profile.label ?? profile.name ?? profile.flag ?? profile.key ?? 'Unanswered flag';
  }

  // --- capacity_sharing ---------------------------------------------------

  readonly capacityGenderChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.gender_split ?? [];
    return this.donutOptions(
      items.map(i => ({ name: i.gender, count: i.count })),
      'Gender split of trainees'
    );
  });
  readonly capacityGenderTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.gender_split ?? [];
    if (items.length === 0) return null;
    return this.namedCountTable(
      'Gender split of trainees',
      items.map(i => ({ name: i.gender, count: i.count }))
    );
  });

  readonly capacitySessionLengthChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.session_lengths ?? [];
    return this.barOptions(items, 'Session length mix');
  });
  readonly capacitySessionLengthTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.session_lengths ?? [];
    return items.length === 0 ? null : this.namedCountTable('Session length mix', items);
  });

  readonly capacityModalityChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.delivery_modalities ?? [];
    return this.barOptions(items, 'Delivery modality mix');
  });
  readonly capacityModalityTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.delivery_modalities ?? [];
    return items.length === 0 ? null : this.namedCountTable('Delivery modality mix', items);
  });

  readonly capacitySessionTypeChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.session_types ?? [];
    return this.barOptions(items, 'Session type mix');
  });
  readonly capacitySessionTypeTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.capacitySharing()?.session_types ?? [];
    return items.length === 0 ? null : this.namedCountTable('Session type mix', items);
  });

  // --- innovation_dev ------------------------------------------------------

  readonly innovationReadinessChartOptions = computed<EChartsOption | null>(() => {
    const items = [...(this.getIndicatorDetailsService.innovationDev()?.readiness_levels ?? [])].sort((a, b) => a.level - b.level);
    if (items.length === 0) return null;
    return this.verticalBarOptions(
      items.map(i => i.name),
      items.map(i => i.count),
      'Readiness levels (IRL)',
      this.tokens().series2
    );
  });
  readonly innovationReadinessTableModel = computed<VizChartTableModel | null>(() => {
    const items = [...(this.getIndicatorDetailsService.innovationDev()?.readiness_levels ?? [])].sort((a, b) => a.level - b.level);
    if (items.length === 0) return null;
    return {
      caption: 'Readiness levels (IRL), ordered by level',
      headers: ['Level', 'Name', 'Count'],
      rows: items.map(i => [i.level, i.name, i.count])
    };
  });

  // R-DD-004 scenario: axis value derives from `answered_count` (the
  // denominator basis), never `meta.n` — NULL/unanswered flags must not be
  // treated as false, and must not be silently folded into the section's n.
  readonly innovationScalabilityRadarOptions = computed<EChartsOption | null>(() => {
    const profile = this.getIndicatorDetailsService.innovationDev()?.scalability_profile ?? [];
    if (profile.length === 0) return null;
    const axes = profile.map(p => ({ name: this.scalabilityLabel(p), max: 100 }));
    // answered_count === 0 renders as a GAP (null), never a false 0 — on the
    // chart, 0 is pixel-identical to "every answer was false" (T-09 Reviewer
    // advisory, adopted pre-HITL); the accessible table still shows 0/0.
    const values = profile.map(p => (p.answered_count > 0 ? Math.round((p.true_count / p.answered_count) * 100) : null));
    return this.radarOptions(axes, values, 'Scalability profile (% true of answered)');
  });
  readonly innovationScalabilityTableModel = computed<VizChartTableModel | null>(() => {
    const profile = this.getIndicatorDetailsService.innovationDev()?.scalability_profile ?? [];
    if (profile.length === 0) return null;
    return {
      caption: 'Scalability profile — true vs answered per factor',
      headers: ['Factor', 'True', 'Answered'],
      rows: profile.map(p => [this.scalabilityLabel(p), p.true_count, p.answered_count])
    };
  });

  readonly innovationTypeChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.innovationDev()?.innovation_types ?? [];
    return this.barOptions(items, 'Innovation type mix');
  });
  readonly innovationTypeTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.innovationDev()?.innovation_types ?? [];
    return items.length === 0 ? null : this.namedCountTable('Innovation type mix', items);
  });

  readonly innovationNatureChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.innovationDev()?.innovation_natures ?? [];
    return this.barOptions(items, 'Innovation nature mix');
  });
  readonly innovationNatureTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.innovationDev()?.innovation_natures ?? [];
    return items.length === 0 ? null : this.namedCountTable('Innovation nature mix', items);
  });

  readonly innovationUsersChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.innovationDev()?.anticipated_users ?? [];
    return this.barOptions(items, 'Anticipated users mix');
  });
  readonly innovationUsersTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.innovationDev()?.anticipated_users ?? [];
    return items.length === 0 ? null : this.namedCountTable('Anticipated users mix', items);
  });

  // --- knowledge_product ----------------------------------------------------

  readonly knowledgeOpenAccessChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.open_access_split ?? [];
    return this.donutOptions(items, 'Open-access split');
  });
  readonly knowledgeOpenAccessTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.open_access_split ?? [];
    return items.length === 0 ? null : this.namedCountTable('Open-access split', items);
  });

  readonly knowledgeAccessStatusChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.access_status ?? [];
    return this.barOptions(items, 'Access status mix');
  });
  readonly knowledgeAccessStatusTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.access_status ?? [];
    return items.length === 0 ? null : this.namedCountTable('Access status mix', items);
  });

  readonly knowledgeTypeChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.types ?? [];
    return this.barOptions(items, 'Knowledge product type mix');
  });
  readonly knowledgeTypeTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.types ?? [];
    return items.length === 0 ? null : this.namedCountTable('Knowledge product type mix', items);
  });

  readonly knowledgePublicationsByYearChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.publications_by_year ?? [];
    if (items.length === 0) return null;
    const sorted = [...items].sort((a, b) => {
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return a.year - b.year;
    });
    return this.verticalBarOptions(
      sorted.map(i => (i.year === null ? 'No year' : String(i.year))),
      sorted.map(i => i.count),
      'Publications by year',
      this.tokens().series3
    );
  });
  readonly knowledgePublicationsByYearTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.knowledgeProduct()?.publications_by_year ?? [];
    if (items.length === 0) return null;
    const sorted = [...items].sort((a, b) => {
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return a.year - b.year;
    });
    return {
      caption: 'Publications by year',
      headers: ['Year', 'Count'],
      rows: sorted.map(i => [i.year === null ? 'No year' : String(i.year), i.count])
    };
  });

  // --- policy_change ----------------------------------------------------

  readonly policyStageFunnelChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.policyChange()?.stage_funnel ?? [];
    return this.funnelOptions(
      items.map(i => ({ name: i.name ?? i.stage_name ?? 'Stage', count: i.count })),
      'Policy stage funnel'
    );
  });
  readonly policyStageFunnelTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.policyChange()?.stage_funnel ?? [];
    if (items.length === 0) return null;
    return this.namedCountTable(
      'Policy stage funnel, ordered as delivered',
      items.map(i => ({ name: i.name ?? i.stage_name ?? 'Stage', count: i.count }))
    );
  });

  readonly policyTypeChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.policyChange()?.policy_types ?? [];
    return this.barOptions(items, 'Policy type mix');
  });
  readonly policyTypeTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.policyChange()?.policy_types ?? [];
    return items.length === 0 ? null : this.namedCountTable('Policy type mix', items);
  });

  // --- oicr ----------------------------------------------------------------

  readonly oicrMaturityChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.oicr()?.maturity_levels ?? [];
    return this.donutOptions(
      items.map(i => ({ name: i.name ?? i.level_name ?? 'Unspecified', count: i.count })),
      'Maturity level distribution'
    );
  });
  readonly oicrMaturityTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.oicr()?.maturity_levels ?? [];
    if (items.length === 0) return null;
    return this.namedCountTable(
      'Maturity level distribution',
      items.map(i => ({ name: i.name ?? i.level_name ?? 'Unspecified', count: i.count }))
    );
  });

  readonly oicrExternalUseChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.oicr()?.external_use_split ?? [];
    return this.donutOptions(
      items.map(i => ({
        name: i.name ?? (i.for_external_use === true ? 'External use' : i.for_external_use === false ? 'Internal use' : 'Unspecified'),
        count: i.count
      })),
      'External-use split'
    );
  });
  readonly oicrExternalUseTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.oicr()?.external_use_split ?? [];
    if (items.length === 0) return null;
    return this.namedCountTable(
      'External-use split',
      items.map(i => ({
        name: i.name ?? (i.for_external_use === true ? 'External use' : i.for_external_use === false ? 'Internal use' : 'Unspecified'),
        count: i.count
      }))
    );
  });

  // --- innovation_use --------------------------------------------------------

  readonly innovationUseGenderYouthChartOptions = computed<EChartsOption | null>(() => {
    const reach = this.getIndicatorDetailsService.innovationUse()?.gender_youth_reach ?? null;
    if (!reach) return null;
    const byActor = reach.by_actor_type ?? [];
    const categories = byActor.length > 0 ? byActor.map(a => a.actor_type_name ?? a.actor_type ?? 'Unspecified') : ['Overall'];
    const rows = byActor.length > 0 ? byActor : [reach.overall];
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
          data: rows.map(r => r.women_youth ?? 0),
          itemStyle: { color: colors[0] }
        },
        {
          name: 'Women, not youth',
          type: 'bar',
          stack: 'reach',
          cursor: 'pointer',
          data: rows.map(r => r.women_not_youth ?? 0),
          itemStyle: { color: colors[1] }
        },
        {
          name: 'Men, youth',
          type: 'bar',
          stack: 'reach',
          cursor: 'pointer',
          data: rows.map(r => r.men_youth ?? 0),
          itemStyle: { color: colors[2] }
        },
        {
          name: 'Men, not youth',
          type: 'bar',
          stack: 'reach',
          cursor: 'pointer',
          data: rows.map(r => r.men_not_youth ?? 0),
          itemStyle: { color: colors[3] }
        }
      ]
    };
  });
  readonly innovationUseGenderYouthTableModel = computed<VizChartTableModel | null>(() => {
    const reach = this.getIndicatorDetailsService.innovationUse()?.gender_youth_reach ?? null;
    if (!reach) return null;
    const byActor = reach.by_actor_type ?? [];
    const categories = byActor.length > 0 ? byActor.map(a => a.actor_type_name ?? a.actor_type ?? 'Unspecified') : ['Overall'];
    const rows = byActor.length > 0 ? byActor : [reach.overall];
    return {
      caption: 'Gender × youth reach',
      headers: ['Group', 'Women, youth', 'Women, not youth', 'Men, youth', 'Men, not youth'],
      rows: rows.map((r, idx) => [categories[idx], r.women_youth ?? 0, r.women_not_youth ?? 0, r.men_youth ?? 0, r.men_not_youth ?? 0])
    };
  });

  readonly innovationUseOrgTypeChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.innovationUse()?.organization_types ?? [];
    return this.barOptions(items, 'Organization type mix');
  });
  readonly innovationUseOrgTypeTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.innovationUse()?.organization_types ?? [];
    return items.length === 0 ? null : this.namedCountTable('Organization type mix', items);
  });

  // Quantifications render as a plain table, never a chart — units are
  // heterogeneous (hectares, people, USD…) so one axis would misrepresent
  // the data (D-F3-6).
  readonly innovationUseQuantificationsTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.innovationUse()?.quantifications ?? [];
    if (items.length === 0) return null;
    return {
      caption: 'Quantifications by unit',
      headers: ['Unit', 'Total', 'Count'],
      rows: items.map(i => [i.unit, i.total ?? i.total_number ?? 0, i.count])
    };
  });

  // --- reporting_velocity (R-DD-006) ---------------------------------------

  readonly velocityChartOptions = computed<EChartsOption | null>(() => {
    const items = this.getIndicatorDetailsService.reportingVelocity() ?? [];
    if (items.length === 0) return null;
    const color = this.tokens().series1 || 'var(--ac-viz-series-1)';
    return {
      grid: { top: 4, bottom: 4, left: 4, right: 4 },
      xAxis: { type: 'category', show: false, data: items.map(i => i.month) },
      yAxis: { type: 'value', show: false, min: 0 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const item = Array.isArray(params) ? params[0] : (params as { name?: string; value?: unknown });
          if (!item) return '';
          return `${item.name}: <strong>${item.value}</strong> results`;
        }
      },
      series: [
        {
          type: 'line',
          data: items.map(i => i.count),
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          itemStyle: { color },
          lineStyle: { color, width: 2 },
          areaStyle: { color, opacity: 0.08 }
        }
      ]
    };
  });
  readonly velocityTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.getIndicatorDetailsService.reportingVelocity() ?? [];
    if (items.length === 0) return null;
    return {
      caption: 'Reporting activity by month (last 24 months)',
      headers: ['Month', 'Results created'],
      rows: items.map(i => [i.month, i.count])
    };
  });
  readonly velocityTotal = computed(() => (this.getIndicatorDetailsService.reportingVelocity() ?? []).reduce((sum, i) => sum + i.count, 0));

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

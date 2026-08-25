import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { GeoScopeCardComponent } from '../geo-scope-card/geo-scope-card.component';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { GetContractDashboardService } from '@shared/services/get-contract-dashboard.service';
import { GetProjectDetailService } from '@shared/services/get-project-detail.service';
import { environment } from '@envs/environment';
import { GetProjectDetail, GetProjectDetailIndicator } from '@shared/interfaces/get-project-detail.interface';
import { ProjectDashboardRankedItem } from '@interfaces/project-dashboard.interface';
import { projectDashboardBarColor } from '@shared/constants/project-dashboard-chart-colors.constants';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterTableComponent } from '../../../results-center/components/results-center-table/results-center-table.component';
import { ResultsCenterService } from '../../../results-center/results-center.service';
import { ContractResultsSummaryStatusBucket } from '@interfaces/contract-results-summary.interface';
import { ResultsTrendCardComponent } from '../results-trend-card/results-trend-card.component';
import { SpAlignmentGraphComponent } from '../sp-alignment-graph/sp-alignment-graph.component';
import { NoDataGroupComponent, NoDataGroupItem } from '../no-data-group/no-data-group.component';
import { IndicatorDeepDiveComponent } from '../indicator-deep-dive/indicator-deep-dive.component';
import { InsightsSectionComponent } from '../insights-section/insights-section.component';
import { DeclaredSdg } from '@shared/interfaces/contract-insights.interface';
import { hasActivePooledFundingContract, isBilateralFundingType } from '@shared/constants/agresso-funding.constants';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import type { ECElementEvent } from 'echarts/core';
import { ContractCgiarEntity } from '@shared/interfaces/find-contracts.interface';
import { FileManagerService } from '@shared/services/file-manager.service';
import { DocumentOverviewService } from '@shared/services/document-overview.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ModalComponent } from '@shared/components/modal/modal.component';
import {
  DocumentOverviewResponse,
  GroundedProjectDocument,
  mapAvailableOverviewFiles,
  mapOverviewSourceDocuments,
  parseDocumentOverviewParagraphs
} from '@shared/interfaces/document-overview.interface';

const MAX_GROUNDING_DOCS = 3;
const MAX_GROUNDING_RESOURCES = 3;
const MAX_GROUNDING_TEXT_LENGTH = 20_000;
const GROUNDING_ACCEPTED_FORMATS = ['.pdf', '.docx', '.txt'];
const GROUNDING_MAX_SIZE_MB = 10;
const GROUNDING_PAGE_LIMIT = 100;

export interface ProjectContextTimeline {
  startDate: string;
  endDate: string;
  extensionDate: string | null;
  elapsedPercent: number;
  isExtended: boolean;
}

export const WIDGET_ENTRY_STAGGER_MS = {
  kpi: 0,
  contextStrip: 100,
  executiveOverview: 150,
  indicatorStatus: 200,
  trend: 300,
  spGraph: 400
} as const;

// Semantic status -> `--ac-viz-*` chart-token name mapping keyed by `result_status_id`
// (D-PD-3). The chart diverges from server-supplied config colors elsewhere — declared.
// Statuses outside the known set fall back to `--ac-grey-500`, never a hardcoded hex.
// The status region is semantic HTML (D-PD-2), not canvas — colors are emitted as
// `var(--ac-viz-*)` references so the browser auto-themes via colors.scss; no
// runtime getComputedStyle resolution is needed here (that's T-08's canvas case).
const STATUS_TOKEN_BY_ID: Record<number, string> = {
  2: '--ac-viz-status-submitted',
  4: '--ac-viz-status-draft',
  5: '--ac-viz-status-pending',
  6: '--ac-viz-status-approved',
  7: '--ac-viz-status-rejected'
};
const STATUS_TOKEN_NO_STATUS = '--ac-viz-status-no-status';
const STATUS_TOKEN_FALLBACK = '--ac-grey-500';

@Component({
  selector: 'app-project-dashboard',
  standalone: true,
  imports: [
    ButtonModule,
    PopoverModule,
    RouterLink,
    SkeletonModule,
    ProjectDashboardCardComponent,
    GeoScopeCardComponent,
    ResultsCenterTableComponent,
    DatePipe,
    ResultsTrendCardComponent,
    SpAlignmentGraphComponent,
    NoDataGroupComponent,
    VizChartComponent,
    IndicatorDeepDiveComponent,
    InsightsSectionComponent,
    ModalComponent
  ],
  templateUrl: './project-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeView', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class ProjectDashboardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectUtils = inject(ProjectUtilsService);
  private readonly resultsCenterService = inject(ResultsCenterService);
  private readonly darkModeService = inject(DarkModeService);
  readonly getProjectDetailService = inject(GetProjectDetailService);
  readonly contractDashboard = inject(GetContractDashboardService);
  private readonly fileManagerService = inject(FileManagerService);
  private readonly documentOverviewService = inject(DocumentOverviewService);
  private readonly rolesService = inject(RolesService);
  private readonly actions = inject(ActionsService);
  private readonly allModalsService = inject(AllModalsService);

  readonly tokens = chartTokens(this.darkModeService.darkMode());

  readonly staggerMs = WIDGET_ENTRY_STAGGER_MS;

  readonly indicatorView = signal<'bars' | 'heatmap'>('bars');
  readonly isCaveatExpanded = signal(false);
  readonly useCrossfadeFallback = signal<boolean>(this.checkReducedMotion());


  readonly contractId = computed(() => this.route.parent?.snapshot.paramMap.get('id') ?? '');
  readonly project = signal<GetProjectDetail | null>(null);
  readonly isBilateral = computed(() => {
    const p = this.project();
    return !!p && isBilateralFundingType(p.funding_type) && !hasActivePooledFundingContract(p);
  });

  readonly grantAmount = computed<string | null>(() => {
    const p = this.project();
    const raw = p?.grant_amount_usd ?? p?.grant_amount;
    return formatCurrencyUSD(raw);
  });

  readonly centerAmount = computed<string | null>(() => {
    const p = this.project();
    const raw = p?.center_amount_usd;
    return formatCurrencyUSD(raw);
  });

  readonly fundingType = computed<string | null>(() => {
    const ft = this.project()?.funding_type;
    if (ft === null || ft === undefined || ft.trim() === '') {
      return null;
    }
    return ft.trim();
  });

  readonly projectLeverName = computed(() => this.projectUtils.getLeverName(this.project() ?? {}));
  readonly hasLever = computed(() => {
    const lever = this.projectLeverName();
    return !!lever && lever !== '-' && lever.trim() !== '';
  });

  readonly donor = computed<string | null>(() => {
    const d = this.project()?.donor;
    return d?.trim() || null;
  });

  readonly projectDivisionLabel = computed(() => formatCodeLabel(this.project()?.divisionId, this.project()?.division));
  readonly hasDivision = computed(() => {
    const div = this.projectDivisionLabel();
    return !!div && div !== '—' && div.trim() !== '';
  });

  readonly projectUnitLabel = computed(() => formatCodeLabel(this.project()?.unitId, this.project()?.unit));
  readonly hasUnit = computed(() => {
    const unit = this.projectUnitLabel();
    return !!unit && unit !== '—' && unit.trim() !== '';
  });

  readonly timeline = computed<ProjectContextTimeline | null>(() => {
    const p = this.project();
    const startDateRaw = p?.start_date?.trim();
    const endDateRaw = p?.end_date?.trim();
    if (!startDateRaw || !endDateRaw) {
      return null;
    }

    const start = new Date(startDateRaw).getTime();
    const end = new Date(endDateRaw).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return null;
    }

    const extensionDateRaw = p?.extension_date?.trim();
    const hasExt = !!extensionDateRaw && extensionDateRaw !== '';
    const ext = hasExt ? new Date(extensionDateRaw!).getTime() : NaN;
    const isExtended = hasExt && !Number.isNaN(ext);
    const extensionDate = isExtended ? extensionDateRaw! : null;

    const targetEnd = isExtended ? ext : end;
    const totalDuration = targetEnd - start;

    let elapsedPercent = 0;
    if (totalDuration > 0) {
      const now = Date.now();
      const elapsed = ((now - start) / totalDuration) * 100;
      elapsedPercent = Math.max(0, Math.min(100, Math.round(elapsed)));
    } else {
      const now = Date.now();
      elapsedPercent = now >= start ? 100 : 0;
    }

    return {
      startDate: startDateRaw,
      endDate: endDateRaw,
      extensionDate,
      elapsedPercent,
      isExtended
    };
  });

  readonly sdgs = computed<string[]>(() => {
    const rawSdgs = this.project()?.sdgs;
    if (!Array.isArray(rawSdgs) || rawSdgs.length === 0) {
      return [];
    }
    return rawSdgs
      .map(item => {
        if (item === null || item === undefined || item === '') return null;
        if (typeof item === 'object') {
          const sdg = item as { id?: number; short_name?: string };
          const label = sdg.short_name?.trim() || (sdg.id !== null && sdg.id !== undefined ? `SDG ${sdg.id}` : null);
          return label ? label.toUpperCase() : null;
        }
        const str = String(item).trim();
        if (!str) return null;
        const upper = str.toUpperCase();
        return upper.startsWith('SDG') ? upper : `SDG ${str}`;
      })
      .filter((label): label is string => label !== null && label !== '');
  });

  // Contract-declared SDGs, id-preserving (R-IN-003 SDG comparison scenario,
  // D-F4-4) — the same `project()?.sdgs` source as `sdgs()` above, but kept
  // as `{id, label}` pairs so the Insights section can compare against
  // `sdg_coverage.sdgs[].sdg_id` by numeric id, never by re-parsing a
  // formatted "SDG N" string. Passed down as an input — NOT a new fetch.
  readonly declaredSdgs = computed<DeclaredSdg[]>(() => {
    const rawSdgs = this.project()?.sdgs;
    if (!Array.isArray(rawSdgs) || rawSdgs.length === 0) {
      return [];
    }
    return rawSdgs
      .map(item => {
        if (item === null || item === undefined) return null;
        if (typeof item === 'object') {
          const sdg = item as { id?: number | string; short_name?: string };
          const id = typeof sdg.id === 'number' ? sdg.id : Number(sdg.id);
          if (!Number.isFinite(id)) return null;
          const label = sdg.short_name?.trim() || `SDG ${id}`;
          return { id, label: label.toUpperCase() };
        }
        // Mirrors sdgs()'s primitive-string handling (D-F4-4 — one source of
        // truth over the same field): strip a leading case-insensitive "SDG"
        // prefix before parsing the id, so 'SDG 2' resolves the same numeric
        // id as '2' (Reviewer FAIL #2 — Number('SDG 2') alone is NaN and
        // silently drops the entry).
        const str = String(item).trim();
        if (!str) return null;
        const withoutPrefix = str.replace(/^sdg\s*/i, '');
        const id = Number(withoutPrefix);
        if (!Number.isFinite(id)) return null;
        const upper = str.toUpperCase();
        const label = upper.startsWith('SDG') ? upper : `SDG ${str}`;
        return { id, label };
      })
      .filter((sdg): sdg is DeclaredSdg => sdg !== null);
  });

  readonly cgiarEntities = computed<ContractCgiarEntity[]>(() => {
    const entities = this.project()?.cgiar_entities;
    if (!Array.isArray(entities)) {
      return [];
    }
    return entities.filter(e => !!(e && (e.code?.trim() || e.name?.trim())));
  });

  readonly hasPrimaryContext = computed<boolean>(() => {
    return !!(
      this.grantAmount() ||
      this.centerAmount() ||
      this.fundingType() ||
      this.hasLever() ||
      this.donor() ||
      this.hasDivision() ||
      this.hasUnit() ||
      this.timeline()
    );
  });

  readonly hasSecondaryContext = computed<boolean>(() => {
    return this.sdgs().length > 0 || this.cgiarEntities().length > 0;
  });

  readonly hasAnyContext = computed<boolean>(() => {
    return this.hasPrimaryContext() || this.hasSecondaryContext();
  });

  readonly indicatorSummaries = computed(() => {
    const indicators = this.projectUtils.sortIndicators([...(this.project()?.indicators ?? [])]);
    const ranked = indicators
      .map((indicator, index) => ({
        id: indicator.indicator?.indicator_id ?? indicator.indicator_id ?? index,
        indicatorId: indicator.indicator?.indicator_id ?? indicator.indicator_id ?? null,
        label: formatIndicatorName(indicator),
        value: Number(indicator.count_results ?? 0),
        color: getIndicatorChartColor(indicator, index, indicators.length)
      }))
      .sort((first, second) => second.value - first.value);

    return ranked;
  });

  readonly indicatorsWithResults = computed(() => this.indicatorSummaries().filter(indicator => indicator.value > 0));

  readonly totalProjectResults = computed(() => this.indicatorSummaries().reduce((total, indicator) => total + indicator.value, 0));

  readonly indicatorsEmpty = computed(
    () => !this.getProjectDetailService.loading() && !this.getProjectDetailService.loadError() && this.totalProjectResults() === 0
  );

  // Heatmap matrix computations (R-DA-004)
  readonly heatmapYears = computed<(number | null)[]>(() => {
    const byIndYear = this.contractDashboard.summary()?.by_indicator_year ?? [];
    const rawYears = Array.from(new Set(byIndYear.map(item => item.year)));
    const numericYears = rawYears
      .filter((y): y is number => y !== null && y !== undefined && !isNaN(Number(y)))
      .sort((a, b) => a - b);
    const hasNullYear = rawYears.some(y => y === null || y === undefined);
    return hasNullYear ? [...numericYears, null] : numericYears;
  });

  readonly heatmapMatrixData = computed(() => {
    const indicators = this.indicatorsWithResults();
    const years = this.heatmapYears();
    const byIndYear = this.contractDashboard.summary()?.by_indicator_year ?? [];

    const map = new Map<string, number>();
    for (const item of byIndYear) {
      const key = `${item.indicator_id}_${item.year ?? 'null'}`;
      map.set(key, Number(item.count ?? 0));
    }

    const data: [number, number, number][] = [];
    let max = 0;
    let min = Infinity;

    indicators.forEach((indicator, indicatorIndex) => {
      const indId = indicator.indicatorId ?? indicator.id;
      years.forEach((year, yearIndex) => {
        const key = `${indId}_${year ?? 'null'}`;
        const count = map.get(key) ?? 0;
        data.push([yearIndex, indicatorIndex, count]);
        if (count > max) max = count;
        if (count < min) min = count;
      });
    });

    if (min === Infinity) min = 0;

    return { data, max, min, indicators, years };
  });

  readonly heatmapMinCount = computed(() => this.heatmapMatrixData().min);
  readonly heatmapMaxCount = computed(() => this.heatmapMatrixData().max);

  readonly indicatorHeatmapTableModel = computed<VizChartTableModel>(() => {
    const { indicators, years } = this.heatmapMatrixData();
    const byIndYear = this.contractDashboard.summary()?.by_indicator_year ?? [];
    const map = new Map<string, number>();
    for (const item of byIndYear) {
      const key = `${item.indicator_id}_${item.year ?? 'null'}`;
      map.set(key, Number(item.count ?? 0));
    }

    const yearHeaders = years.map(y => (y === null ? 'No year' : String(y)));
    const headers = ['Indicator', ...yearHeaders, 'Total'];

    const rows = indicators.map(ind => {
      const indId = ind.indicatorId ?? ind.id;
      const yearCounts = years.map(y => map.get(`${indId}_${y ?? 'null'}`) ?? 0);
      const rowTotal = yearCounts.reduce((sum, c) => sum + c, 0);
      return [ind.label, ...yearCounts, rowTotal];
    });

    return {
      caption: 'Results by indicator and year matrix',
      headers,
      rows
    };
  });

  readonly indicatorHeatmapOptions = computed<EChartsOption | null>(() => {
    const { data, max, indicators, years } = this.heatmapMatrixData();
    if (indicators.length === 0 || years.length === 0) {
      return null;
    }

    // T-07 HITL fix: `chartTokens()` already resolves these via
    // `getComputedStyle` — a length !== 5 means resolution genuinely failed
    // (jsdom, or the theme hasn't painted yet), and D-DN-5 bans feeding an
    // unresolved `'var(--…)'` fallback string into echarts options (the
    // confirmed SVG-presentation-attribute trap). `undefined` here lets
    // echarts fall back to its OWN default visualMap gradient instead.
    const tokenRamp = this.tokens().ramp.filter(Boolean);
    const rampColors = tokenRamp.length === 5 ? tokenRamp : undefined;

    const yearLabels = years.map(y => (y === null ? 'No year' : String(y)));
    const indicatorLabels = indicators.map(i => i.label);

    // Per-cell label contrast (T-07 HITL fix — owner screenshot: values on
    // the darkest cells were near-invisible, dark label on dark fill).
    // Mirrors `insights-section.component.ts`'s `contrastingLabelColor()` /
    // `parseRgb()` (F4 T-09 exemplar): bucket each cell's value onto the
    // same 5 resolved ramp stops actually painted, then read THAT stop's
    // real luminance — never `isDarkMode()` branching for the decision, so
    // it self-corrects regardless of which theme inverts the ramp direction
    // (`tokens:validate` already confirms it does, between themes).
    const heatmapData = data.map(([xIdx, yIdx, count]) => ({
      value: [xIdx, yIdx, count] as [number, number, number],
      label: { color: this.heatmapCellLabelColor(count, max, rampColors) }
    }));

    return {
      grid: {
        top: 16,
        bottom: 32,
        left: 12,
        right: 16,
        containLabel: true
      },
      tooltip: {
        position: 'top',
        formatter: (params: unknown) => {
          const item = params as { data?: { value?: [number, number, number] } };
          const d = item?.data?.value;
          if (!d || !Array.isArray(d)) return '';
          const [xIdx, yIdx, count] = d;
          const yearLabel = yearLabels[xIdx] ?? '';
          const indLabel = indicatorLabels[yIdx] ?? '';
          return `<strong>${indLabel}</strong><br/>Year: ${yearLabel}<br/>Results: ${count}`;
        }
      },
      xAxis: {
        type: 'category',
        data: yearLabels,
        splitArea: { show: true },
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: this.resolveDesignToken('--ac-grey-300') }
        },
        axisLabel: {
          color: this.resolveDesignToken('--ac-grey-700'),
          fontFamily: 'Barlow'
        }
      },
      yAxis: {
        type: 'category',
        data: indicatorLabels,
        splitArea: { show: true },
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: this.resolveDesignToken('--ac-grey-300') }
        },
        axisLabel: {
          color: this.resolveDesignToken('--ac-grey-700'),
          fontFamily: 'Barlow',
          width: 140,
          overflow: 'truncate'
        }
      },
      visualMap: {
        min: 0,
        max: max > 0 ? max : 1,
        calculable: false,
        orient: 'horizontal',
        show: false,
        inRange: rampColors ? { color: rampColors } : undefined
      },
      series: [
        {
          id: 'indicator-series',
          name: 'Results by indicator and year',
          type: 'heatmap',
          cursor: 'pointer',
          data: heatmapData,
          universalTransition: {
            enabled: true,
            divideShape: 'clone'
          },
          label: {
            show: true,
            fontFamily: 'Barlow'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  });

  // T-07 HITL fix — resolves a general (non `--ac-viz-*`) design token the
  // same way `results-trend-card.component.ts` does for its axis chrome
  // (D-DN-5): a resolved literal, or `undefined` so echarts falls back to
  // its own default rather than receiving an unresolved `'var(--…)'` string.
  private resolveDesignToken(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
  }

  // Buckets a cell's value onto the same 5 resolved ramp stops the fill
  // actually uses (discrete, deterministic — mirrors
  // `insights-section.component.ts`'s `treemapRampBucket()`/`rampColors()`
  // family), then reads that stop's ACTUAL luminance for the label color.
  // No resolved ramp (jsdom, or theme not yet painted) -> `undefined`
  // (echarts' own default), never a literal fallback string.
  private heatmapCellLabelColor(value: number, max: number, rampColors: string[] | undefined): string | undefined {
    if (!rampColors || rampColors.length !== 5) {
      return this.resolveDesignToken('--ac-grey-800');
    }
    const bucket = max > 0 ? Math.min(4, Math.max(0, Math.round((Math.min(max, Math.max(0, value)) / max) * 4))) : 0;
    return this.contrastingHeatmapLabelColor(rampColors[bucket]);
  }

  // Same WCAG-contrast decision as `insights-section.component.ts`'s
  // `contrastingLabelColor()` (F4 T-09) — kept local to this component
  // rather than shared, per T-07's bounded scope (this file only). Deviates
  // from that exemplar in one deliberate way: the exemplar returns literal
  // `'var(--ac-white-1)'`/`'var(--ac-grey-900)'` strings, which is itself an
  // unresolved-var() leak into echarts options (D-DN-5) — out of scope to
  // fix there, but not a pattern to copy into a builder this spec explicitly
  // gates on "zero `var(--` in the emitted options". Both branches resolve
  // through `resolveDesignToken` instead.
  private contrastingHeatmapLabelColor(color: string): string | undefined {
    const rgb = this.parseHeatmapRgb(color);
    if (!rgb) {
      return this.resolveDesignToken('--ac-grey-800');
    }
    const [r, g, b] = rgb;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.55 ? this.resolveDesignToken('--ac-grey-900') : this.resolveDesignToken('--ac-white-1');
  }

  private parseHeatmapRgb(color: string): [number, number, number] | null {
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

  readonly indicatorBarOptions = computed<EChartsOption | null>(() => {
    const indicators = this.indicatorsWithResults();
    if (indicators.length === 0) return null;

    const labels = indicators.map(i => i.label).reverse();
    const values = indicators.map(i => i.value).reverse();

    return {
      grid: {
        top: 16,
        bottom: 24,
        left: 12,
        right: 24,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        },
        splitLine: {
          lineStyle: { color: 'var(--ac-grey-200)' }
        }
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: 'var(--ac-grey-300)' }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow',
          width: 140,
          overflow: 'truncate'
        }
      },
      series: [
        {
          id: 'indicator-series',
          name: 'Results by indicator',
          type: 'bar',
          cursor: 'pointer',
          data: values,
          universalTransition: {
            enabled: true,
            divideShape: 'clone'
          },
          itemStyle: {
            color: 'var(--ac-primary-blue-600)',
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            color: 'var(--ac-grey-800)',
            fontFamily: 'Barlow'
          }
        }
      ]
    };
  });

  readonly activeIndicatorChartOptions = computed(() =>
    this.indicatorView() === 'heatmap' ? this.indicatorHeatmapOptions() : this.indicatorBarOptions()
  );

  // KPI strip computed signals (R-PD-002)
  readonly indicatorsCoveredCount = computed(() => this.indicatorsWithResults().length);
  readonly indicatorsTotalCount = computed(() => this.indicatorSummaries().length);
  readonly pendingRevisionCount = computed(() => {
    const byStatus = this.contractDashboard.summary()?.by_status ?? [];
    const pending = byStatus.find(s => Number(s.status_id) === 5 || s.name?.toLowerCase().includes('pending'));
    return pending?.count ?? 0;
  });
  readonly partnerInstitutionsCount = computed(() => this.contractDashboard.summary()?.partner_institutions ?? 0);

  // Status region (R-PD-003): fed exclusively by the aggregate (R-PD-001 via
  // GetContractDashboardService — T-04). The bulk `GET results` fetch,
  // `buildStatusChartItems`, and the hardcoded fallback are removed (D-PD-2/D-PD-3).
  readonly statusBuckets = computed<ContractResultsSummaryStatusBucket[]>(() => this.contractDashboard.summary()?.by_status ?? []);
  readonly statusTotal = computed(() => this.contractDashboard.summary()?.total ?? 0);
  readonly statusChartLoading = computed(() => this.contractDashboard.loading());
  readonly statusChartError = computed(() => this.contractDashboard.loadError());
  readonly statusChartEmpty = computed(
    () => !this.contractDashboard.loading() && !this.contractDashboard.loadError() && this.statusBuckets().length === 0
  );

  readonly contributorItems = computed(() =>
    this.contractDashboard
      .topContributors()
      .map((item, index) => ({
        id: item.contract_code ?? item.contract_id ?? String(index),
        label: formatContributorLabel(item),
        count: Number(item.results_count ?? item.count ?? 0)
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly contributorsEmpty = computed(
    () => !this.contractDashboard.loading() && !this.contractDashboard.loadError() && this.contractDashboard.topContributors().length === 0
  );

  readonly mainContactPersonItems = computed(() =>
    this.contractDashboard
      .topMainContactPersons()
      .map((item, index) => ({
        id: formatMainContactPersonName(item) ?? String(index),
        label: formatMainContactPersonName(item) ?? '—',
        count: Number(item.results_count ?? item.count ?? item.value ?? 0),
        description: item.email
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly mainContactPersonsEmpty = computed(
    () =>
      !this.contractDashboard.loading() &&
      !this.contractDashboard.loadError() &&
      this.contractDashboard.topMainContactPersons().length === 0
  );

  readonly partnerItems = computed(() =>
    this.contractDashboard.topPartners().map((item, index) => ({
      id: getPartnerItemId(item, index),
      label: formatPartnerLabel(item),
      count: Number(item.results_count ?? item.count ?? 0)
    }))
  );

  readonly partnersEmpty = computed(() => !this.contractDashboard.loading() && !this.contractDashboard.loadError() && this.contractDashboard.topPartners().length === 0);

  readonly partnerTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.partnerItems();
    if (items.length === 0) return null;
    return {
      caption: 'Top partner institutions',
      headers: ['Partner institution', 'Results'],
      rows: items.map(item => [item.label, item.count])
    };
  });

  readonly partnerChartOptions = computed<EChartsOption | null>(() => {
    const items = this.partnerItems();
    if (items.length === 0) return null;

    return {
      grid: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 28,
        containLabel: true
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = extractTooltipParam(params);
          const idx = p.dataIndex ?? 0;
          const item = items[idx];
          const name = item?.label ?? p.name ?? '';
          const count = item?.count ?? p.value ?? 0;
          return `<strong>${escapeHtml(name)}</strong><br/>Results: ${count}`;
        }
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        },
        splitLine: {
          lineStyle: { color: 'var(--ac-grey-200)' }
        }
      },
      yAxis: {
        type: 'category',
        data: items.map(item => item.label),
        inverse: true,
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: 'var(--ac-grey-300)' }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow',
          width: 120,
          overflow: 'truncate'
        }
      },
      series: [
        {
          type: 'bar',
          name: 'Top partner institutions',
          cursor: 'default',
          data: items.map((item, index) => ({
            value: item.count,
            itemStyle: {
              color: projectDashboardBarColor(index, items.length),
              borderRadius: [0, 4, 4, 0]
            }
          })),
          label: {
            show: true,
            position: 'right',
            color: 'var(--ac-grey-800)',
            fontFamily: 'Barlow'
          }
        }
      ]
    };
  });

  readonly leverItems = computed(() =>
    this.contractDashboard
      .topPrimaryLevers()
      .map(item => ({
        id: String(item.lever_id),
        label: formatLeverDisplayLabel(item.short_name ?? '', item.full_name ?? ''),
        count: Number(item.count ?? item.results_count ?? 0),
        iconUrl: item.icon
          ? (item.icon.startsWith('http')
              ? item.icon
              : `${environment.s3Folder}${item.icon.startsWith('/') ? item.icon.slice(1) : item.icon}`)
          : undefined
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly leversEmpty = computed(
    () => !this.contractDashboard.loading() && !this.contractDashboard.loadError() && this.contractDashboard.topPrimaryLevers().length === 0
  );

  readonly leverTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.leverItems();
    if (items.length === 0) return null;
    return {
      caption: 'Top primary levers',
      headers: ['Primary lever', 'Results'],
      rows: items.map(item => [item.label, item.count])
    };
  });

  readonly leverChartOptions = computed<EChartsOption | null>(() => {
    const items = this.leverItems();
    if (items.length === 0) return null;

    return {
      grid: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 28,
        containLabel: true
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = extractTooltipParam(params);
          const idx = p.dataIndex ?? 0;
          const item = items[idx];
          const name = item?.label ?? p.name ?? '';
          const count = item?.count ?? p.value ?? 0;
          const iconHtml = item?.iconUrl
            ? `<img src="${item.iconUrl}" alt="" style="width: 18px; height: 18px; border-radius: 50%; vertical-align: middle; margin-right: 6px;" />`
            : '';
          return `<div style="display: flex; align-items: center; gap: 6px;">${iconHtml}<strong>${escapeHtml(name)}</strong></div><div>Results: ${count}</div>`;
        }
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        },
        splitLine: {
          lineStyle: { color: 'var(--ac-grey-200)' }
        }
      },
      yAxis: {
        type: 'category',
        data: items.map(item => item.label),
        inverse: true,
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: 'var(--ac-grey-300)' }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow',
          width: 120,
          overflow: 'truncate'
        }
      },
      series: [
        {
          type: 'bar',
          name: 'Top primary levers',
          cursor: 'pointer',
          data: items.map((item, index) => ({
            value: item.count,
            leverId: item.id,
            itemStyle: {
              color: projectDashboardBarColor(index, items.length),
              borderRadius: [0, 4, 4, 0]
            }
          })),
          label: {
            show: true,
            position: 'right',
            color: 'var(--ac-grey-800)',
            fontFamily: 'Barlow'
          }
        }
      ]
    };
  });

  readonly mainContactTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.mainContactPersonItems();
    if (items.length === 0) return null;
    return {
      caption: 'Top main contact persons',
      headers: ['Main contact person', 'Email', 'Results'],
      rows: items.map(item => [item.label, item.description ?? '—', item.count])
    };
  });

  readonly mainContactChartOptions = computed<EChartsOption | null>(() => {
    const items = this.mainContactPersonItems();
    if (items.length === 0) return null;

    return {
      grid: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 28,
        containLabel: true
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = extractTooltipParam(params);
          const idx = p.dataIndex ?? 0;
          const item = items[idx];
          const name = item?.label ?? p.name ?? '';
          const count = item?.count ?? p.value ?? 0;
          const email = item?.description;
          const emailHtml = email ? `<br/><span style="color: var(--ac-grey-600); font-size: 12px;">${escapeHtml(email)}</span>` : '';
          return `<strong>${escapeHtml(name)}</strong>${emailHtml}<br/>Results: ${count}`;
        }
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        },
        splitLine: {
          lineStyle: { color: 'var(--ac-grey-200)' }
        }
      },
      yAxis: {
        type: 'category',
        data: items.map(item => item.label),
        inverse: true,
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: 'var(--ac-grey-300)' }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow',
          width: 120,
          overflow: 'truncate'
        }
      },
      series: [
        {
          type: 'bar',
          name: 'Top main contact persons',
          cursor: 'default',
          data: items.map((item, index) => ({
            value: item.count,
            itemStyle: {
              color: projectDashboardBarColor(index, items.length),
              borderRadius: [0, 4, 4, 0]
            }
          })),
          label: {
            show: true,
            position: 'right',
            color: 'var(--ac-grey-800)',
            fontFamily: 'Barlow'
          }
        }
      ]
    };
  });

  readonly contributorTableModel = computed<VizChartTableModel | null>(() => {
    const items = this.contributorItems();
    if (items.length === 0) return null;
    return {
      caption: 'Top contributing projects',
      headers: ['Contributing project', 'Results'],
      rows: items.map(item => [item.label, item.count])
    };
  });

  readonly contributorChartOptions = computed<EChartsOption | null>(() => {
    const items = this.contributorItems();
    if (items.length === 0) return null;

    return {
      grid: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 28,
        containLabel: true
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = extractTooltipParam(params);
          const idx = p.dataIndex ?? 0;
          const item = items[idx];
          const name = item?.label ?? p.name ?? '';
          const count = item?.count ?? p.value ?? 0;
          return `<strong>${escapeHtml(name)}</strong><br/>Results: ${count}`;
        }
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        },
        splitLine: {
          lineStyle: { color: 'var(--ac-grey-200)' }
        }
      },
      yAxis: {
        type: 'category',
        data: items.map(item => item.label),
        inverse: true,
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: 'var(--ac-grey-300)' }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow',
          width: 120,
          overflow: 'truncate'
        }
      },
      series: [
        {
          type: 'bar',
          name: 'Top contributing projects',
          cursor: 'pointer',
          data: items.map((item, index) => ({
            value: item.count,
            contractCode: item.id,
            itemStyle: {
              color: projectDashboardBarColor(index, items.length),
              borderRadius: [0, 4, 4, 0]
            }
          })),
          label: {
            show: true,
            position: 'right',
            color: 'var(--ac-grey-800)',
            fontFamily: 'Barlow'
          }
        }
      ]
    };
  });

  readonly geoScopeEmpty = computed(() => {
    if (this.contractDashboard.loading() || this.contractDashboard.loadError()) {
      return false;
    }

    const geo = this.contractDashboard.geoScope();
    if (!geo) {
      return true;
    }

    const summary = geo.geo_scope_summary ?? {};
    const summaryTotal =
      Number(summary.global ?? 0) +
      Number(summary.regional ?? 0) +
      Number(summary.countries ?? 0) +
      Number(summary.sub_national ?? 0) +
      Number(summary.yet_to_be_determined ?? 0);

    return summaryTotal === 0 && (geo.top_regions ?? []).length === 0 && (geo.top_countries ?? []).length === 0;
  });

  readonly trendEmpty = computed(() => {
    if (this.contractDashboard.loading() || this.contractDashboard.loadError()) {
      return false;
    }
    const raw = this.contractDashboard.summary()?.by_year ?? [];
    const valid = raw.filter(b => b.year !== null && b.year !== undefined && !isNaN(Number(b.year)));
    return valid.length === 0;
  });

  readonly spAlignmentEmpty = computed(
    () =>
      !this.contractDashboard.loading() &&
      !this.contractDashboard.loadError() &&
      (this.contractDashboard.spAlignment()?.sps ?? []).length === 0
  );

  readonly hasVisibleRankingCards = computed(
    () => !this.partnersEmpty() || !this.leversEmpty() || !this.mainContactPersonsEmpty() || !this.contributorsEmpty()
  );

  // T-05 (R-DN-003, design §2.3/D-DN-3): act 3 ("Reach — ¿Dónde y con quién?")
  // groups the geo scope card with the "who" rankings (partners, main
  // contacts, contributing projects). "Top primary levers" moves to act 4
  // ("Direction") alongside SP alignment — narrower than
  // `hasVisibleRankingCards()` above (which still combines all four and is
  // kept as-is for existing callers/specs), gating ONLY act 3's ranking grid.
  readonly hasVisibleReachRankingCards = computed(
    () => !this.partnersEmpty() || !this.mainContactPersonsEmpty() || !this.contributorsEmpty()
  );

  readonly collapsedEmptyWidgets = computed<NoDataGroupItem[]>(() => {
    const items: NoDataGroupItem[] = [];

    if (this.trendEmpty()) {
      items.push({
        name: 'Results over time',
        reason: 'No yearly result trends have been recorded yet.',
        iconClass: 'pi pi-chart-line'
      });
    }

    if (this.indicatorsEmpty()) {
      items.push({
        name: 'Results by indicator',
        reason: 'No results were found for any indicator on this project.',
        iconClass: 'pi pi-chart-pie'
      });
    }

    if (this.statusChartEmpty()) {
      items.push({
        name: 'Results by status',
        reason: 'No result statuses were found for this project.',
        iconClass: 'pi pi-chart-bar'
      });
    }

    if (this.geoScopeEmpty()) {
      items.push({
        name: 'Top geographic scope',
        reason: 'No geographic scope data has been reported for this project yet.',
        iconClass: 'pi pi-globe'
      });
    }

    if (this.partnersEmpty()) {
      items.push({
        name: 'Top partner institutions',
        reason: 'No partner institutions are linked to results on this project yet.',
        iconClass: 'pi pi-building'
      });
    }

    if (this.leversEmpty()) {
      items.push({
        name: 'Top primary levers',
        reason: 'No primary levers are linked to results on this project yet.',
        iconClass: 'pi pi-sliders-h'
      });
    }

    if (this.mainContactPersonsEmpty()) {
      items.push({
        name: 'Top main contact persons',
        reason: 'No main contact persons are linked to results on this project yet.',
        iconClass: 'pi pi-users'
      });
    }

    if (this.contributorsEmpty()) {
      items.push({
        name: 'Top contributing projects',
        reason: 'No other projects contribute to this one yet.',
        iconClass: 'pi pi-briefcase'
      });
    }

    if (this.isBilateral() && this.spAlignmentEmpty()) {
      items.push({
        name: 'Strategic Plan alignment',
        reason: 'No Strategic Plan alignments have been mapped yet.',
        iconClass: 'pi pi-sitemap'
      });
    }

    return items;
  });

  readonly pendingRevisionExcludedColumns = ['status', 'year', 'versions', 'creation_date', 'public_link', 'project'] as const;

  // --- Executive Overview (grounded AI summary, AC-1714) -----------------
  readonly maxGroundingDocs = MAX_GROUNDING_DOCS;
  readonly maxGroundingResources = MAX_GROUNDING_RESOURCES;
  readonly maxGroundingTextLength = MAX_GROUNDING_TEXT_LENGTH;
  readonly groundingAcceptedFormats = GROUNDING_ACCEPTED_FORMATS;
  readonly groundedDocuments = signal<GroundedProjectDocument[]>([]);
  readonly overviewSourceDocuments = signal<GroundedProjectDocument[]>([]);
  readonly executiveOverviewGeneratedAt = signal<string | null>(null);
  readonly uploadingGroundingDoc = signal(false);
  readonly executiveOverviewParagraphs = signal<string[]>([]);
  readonly executiveOverviewExpanded = signal(false);
  readonly executiveOverviewText = computed(() => this.executiveOverviewParagraphs().join('\n\n'));
  readonly executiveOverviewLoading = signal(false);
  readonly executiveOverviewError = signal(false);
  /** Saved free-text contextual resource (empty string means no text resource). */
  readonly groundingText = signal<string>('');
  readonly showGroundingTextEditor = signal(false);
  readonly groundingTextDraft = signal<string>('');

  readonly hasGroundedDocuments = computed(() => this.groundedDocuments().length > 0);
  readonly hasGroundingText = computed(() => this.groundingText().trim().length > 0);
  /** Total contextual resources = uploaded docs + at most one text resource. Capped at MAX_GROUNDING_RESOURCES. */
  readonly totalGroundingResources = computed(() => this.groundedDocuments().length + (this.hasGroundingText() ? 1 : 0));
  readonly hasGroundingResources = computed(() => this.hasGroundedDocuments() || this.hasGroundingText());
  readonly canUploadMoreGroundingDocs = computed(() => this.totalGroundingResources() < MAX_GROUNDING_RESOURCES);
  readonly canAddGroundingText = computed(() => !this.hasGroundingText() && this.totalGroundingResources() < MAX_GROUNDING_RESOURCES);
  readonly canGenerateExecutiveOverview = computed(
    () => this.hasGroundingResources() && !this.executiveOverviewLoading() && !this.uploadingGroundingDoc()
  );
  readonly groundedDocumentsCountColor = computed(() => {
    const count = this.totalGroundingResources();
    if (count === 0) return 'var(--ac-grey-500)';
    if (count >= MAX_GROUNDING_RESOURCES) return 'var(--ac-red-1)';
    return 'var(--ac-viz-status-approved)';
  });
  readonly canAccessGroundingSetup = computed(() => this.rolesService.isAdmin());
  readonly hasExecutiveOverviewData = computed(() => this.executiveOverviewParagraphs().length > 0);
  readonly showExecutiveOverview = computed(() => {
    if (this.canAccessGroundingSetup()) {
      return this.hasGroundingResources() || this.executiveOverviewLoading() || this.executiveOverviewError() || this.hasExecutiveOverviewData();
    }

    return this.hasExecutiveOverviewData();
  });

  constructor() {
    this.initReducedMotionDetection();

    effect(() => {
      const contractId = this.contractId();
      if (contractId) {
        void this.syncProjectFromSharedService(contractId);
        void this.contractDashboard.load(contractId);
        this.resultsCenterService.initializeProjectDashboardResultsTable(contractId);
        void this.loadExecutiveOverviewSummary();
      }
    });
  }

  initReducedMotionDetection(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        this.useCrossfadeFallback.set(true);
      }
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', (event: MediaQueryListEvent) => {
          this.useCrossfadeFallback.set(event.matches);
        });
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener((event: MediaQueryListEvent) => {
          this.useCrossfadeFallback.set(event.matches);
        });
      }
    } catch {
      // Fallback if matchMedia is not supported in environment
    }
  }

  checkReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  updateReducedMotionPreference(): void {
    this.useCrossfadeFallback.set(this.checkReducedMotion());
  }

  setIndicatorView(view: 'bars' | 'heatmap'): void {
    this.indicatorView.set(view);
  }

  onIndicatorHeatmapClick(event: ECElementEvent): void {
    let targetId: number | string | null | undefined;

    if (Array.isArray(event.data)) {
      const rawIndex = event.data[1];
      const indicatorIndex = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex);
      if (Number.isFinite(indicatorIndex)) {
        const indicator = this.indicatorsWithResults()[indicatorIndex];
        targetId = indicator?.indicatorId ?? indicator?.id;
      }
    } else if (event.data && typeof event.data === 'object' && Array.isArray((event.data as { value?: unknown }).value)) {
      // T-07 HITL fix: heatmap cells are now per-cell objects (`{ value: [x, y, count], label }`)
      // — carries the per-cell label-contrast color — rather than a raw tuple, so echarts hands
      // this branch the object, not the array. `value[1]` is still the indicator index, same
      // position `heatmapMatrixData()` always used (`[yearIndex, indicatorIndex, count]`).
      const rawIndex = (event.data as { value: unknown[] }).value[1];
      const indicatorIndex = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex);
      if (Number.isFinite(indicatorIndex)) {
        const indicator = this.indicatorsWithResults()[indicatorIndex];
        targetId = indicator?.indicatorId ?? indicator?.id;
      }
    } else if (event.data && typeof event.data === 'object' && 'indicatorId' in event.data) {
      targetId = (event.data as { indicatorId?: number | string }).indicatorId;
    } else if (typeof event.dataIndex === 'number' && event.dataIndex >= 0) {
      const indicators = this.indicatorsWithResults();
      const reversedIndex = indicators.length - 1 - event.dataIndex;
      const indicator = indicators[reversedIndex] ?? (event.name ? indicators.find(i => i.label === event.name) : undefined);
      targetId = indicator?.indicatorId ?? indicator?.id;
    } else if (event.name) {
      const indicator = this.indicatorsWithResults().find(i => i.label === event.name);
      targetId = indicator?.indicatorId ?? indicator?.id;
    }

    const contractId = this.contractId();
    if (contractId && targetId !== undefined && targetId !== null) {
      void this.router.navigate(['/project-detail', contractId], {
        queryParams: { indicatorTab: targetId }
      });
    }
  }

  onIndicatorChartClick(event: ECElementEvent): void {
    this.onIndicatorHeatmapClick(event);
  }

  onTrendChartClick(event: ECElementEvent): void {
    if (event.componentType !== 'series') {
      return;
    }
    const yearStr = event.name ?? (typeof event.dataIndex === 'number' ? this.contractDashboard.summary()?.by_year?.[event.dataIndex]?.year : undefined);
    const year = yearStr !== undefined && yearStr !== null && yearStr !== '' ? Number(yearStr) : undefined;
    const contractId = this.contractId();
    if (contractId && year !== undefined && !isNaN(year)) {
      void this.router.navigate(['/project-detail', contractId], {
        queryParams: { yearTab: year }
      });
    }
  }

  onLeverChartClick(event: ECElementEvent): void {
    const data = event.data as { leverId?: string } | undefined;
    const index = typeof event.dataIndex === 'number' ? event.dataIndex : undefined;
    const item = index !== undefined ? this.leverItems()[index] : undefined;
    const leverId = data?.leverId ?? item?.id;
    const contractId = this.contractId();
    if (contractId && leverId !== undefined && leverId !== null && leverId !== '') {
      void this.router.navigate(['/project-detail', contractId], {
        queryParams: { leverTab: leverId }
      });
    }
  }

  onContributorChartClick(event: ECElementEvent): void {
    const data = event.data as { contractCode?: string } | undefined;
    const index = typeof event.dataIndex === 'number' ? event.dataIndex : undefined;
    const item = index !== undefined ? this.contributorItems()[index] : undefined;
    const contractCode = data?.contractCode ?? item?.id;
    const contractId = this.contractId();
    if (contractId && contractCode !== undefined && contractCode !== null && contractCode !== '') {
      void this.router.navigate(['/project-detail', contractId], {
        queryParams: { contractTab: contractCode }
      });
    }
  }

  onPartnerChartClick(event?: ECElementEvent): void {
    void event;
    // Partner bars do not navigate in F1 (R-HL-005 accepted gap)
  }

  onMainContactChartClick(event?: ECElementEvent): void {
    void event;
    // Contact bars do not navigate in F1 (R-HL-005 accepted gap)
  }

  private async syncProjectFromSharedService(contractId: string): Promise<void> {
    await this.getProjectDetailService.load(contractId);
    this.project.set(this.getProjectDetailService.project());
  }

  indicatorSharePercent(value: number): number {
    const total = this.totalProjectResults();
    if (total <= 0 || value <= 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }

  // Status region helpers (R-PD-003). All statuses render — no scroll cap, no
  // truncation (R-PD-003 `AND IT MUST render every returned status`).
  statusSharePercent(count: number): number {
    const total = this.statusTotal();
    if (total <= 0 || count <= 0) {
      return 0;
    }
    return Math.round((count / total) * 100);
  }

  // Returns the CSS variable reference (e.g. `var(--ac-viz-status-approved)`)
  // so the bar/segment auto-themes without hex literals in component code
  // (D-PD-3 / R-PD-006). Statuses outside the known set fall back to
  // `--ac-grey-500`; null status id maps to the explicit "No status" bucket.
  statusColor(statusId: number | null): string {
    const tokenName = this.statusTokenName(statusId);
    return `var(${tokenName})`;
  }

  // Exposed for tests so they assert the **requested token names** (KZ-001 /
  // KZ-017) rather than resolved values (jsdom returns '' for custom props).
  statusTokenName(statusId: number | null): string {
    if (statusId === null || statusId === undefined) {
      return STATUS_TOKEN_NO_STATUS;
    }
    return STATUS_TOKEN_BY_ID[Number(statusId)] ?? STATUS_TOKEN_FALLBACK;
  }

  // Accessible summary of the status split — consumed by the region's
  // `aria-label` (R-PD-009 AC.1: every chart region has an accessible name).
  statusAriaLabel(): string {
    const total = this.statusTotal();
    if (total <= 0) {
      return 'Results by status: no data';
    }
    const segments = this.statusBuckets()
      .map(bucket => `${bucket.count} ${bucket.name.toLowerCase()} (${this.statusSharePercent(bucket.count)}%)`)
      .join(', ');
    return `Results by status out of ${total} total: ${segments}`;
  }

  // Drill-through shape for T-11 — the row is a real `<a>` (R-PD-009 AC.2:
  // drill-through rows are real interactive elements with visible focus).
  statusRowQueryParams(bucket: ContractResultsSummaryStatusBucket): { statusTab: number | null } {
    return { statusTab: bucket.status_id };
  }

  // Accessible label per drill row — never color-alone (WCAG 1.4.1): the label
  // carries the status name, count, and share so screen readers announce the
  // full context before navigation (R-PD-009 AC.1/AC.3).
  statusRowAriaLabel(bucket: ContractResultsSummaryStatusBucket): string {
    const share = this.statusSharePercent(bucket.count);
    return `${bucket.name}: ${bucket.count} results, ${share}% — view filtered results`;
  }

  // KPI tile navigation & scroll actions (R-HL-002, T-03)
  navigateToTotalResults(): void {
    if (this.getProjectDetailService.loading()) {
      return;
    }
    const contractId = this.contractId();
    if (contractId) {
      void this.router.navigate(['/project-detail', contractId], {
        queryParams: { resultsTab: 1 }
      });
    }
  }

  navigateToIndicatorResults(
    indicator: { id?: number | string | null; indicatorId?: number | string | null },
    popover?: { hide?: () => void }
  ): void {
    popover?.hide?.();
    const contractId = this.contractId();
    const targetId = indicator.indicatorId ?? indicator.id;
    if (contractId && targetId !== null && targetId !== undefined) {
      void this.router.navigate(['/project-detail', contractId], {
        queryParams: { indicatorTab: targetId }
      });
    }
  }

  scrollToPartners(event?: Event): void {
    if (this.contractDashboard.loading()) {
      return;
    }
    if (event) {
      event.preventDefault();
    }
    const element = document.getElementById('partners-card') ?? document.getElementById('top-partners-section');
    if (element) {
      const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      element.focus?.({ preventScroll: true });
    }
  }

  // Smooth scroll to pending revision table section (R-PD-008, judgment W7)
  scrollToPendingRevision(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const element = document.getElementById('pending-revision-section');
    if (element) {
      const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      element.focus?.({ preventScroll: true });
    }
  }

  // Scoped retry for the indicator breakdown region (R-PD-005 AC.2 / R-PD-007)
  retryIndicatorBreakdown(): void {
    const contractId = this.contractId();
    if (contractId) {
      this.getProjectDetailService.invalidate(contractId);
      void this.syncProjectFromSharedService(contractId);
    }
  }

  // --- Executive Overview methods (grounded AI summary, AC-1714) ---------

  toggleExecutiveOverview(): void {
    this.executiveOverviewExpanded.update(expanded => !expanded);
  }

  async openGroundingSetupModal(): Promise<void> {
    if (!this.canAccessGroundingSetup()) {
      return;
    }

    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    try {
      const response = await this.documentOverviewService.fetchDocumentOverviewSummary(projectId);
      this.applyDocumentOverviewResponse(response);
      this.showGroundingTextEditor.set(false);
      this.groundingTextDraft.set('');
      this.allModalsService.openModal('projectGroundingSetup');
      this.allModalsService.setModalWidth('projectGroundingSetup', true);
    } catch {
      this.actions.showToast({
        severity: 'error',
        summary: 'Unable to open setup',
        detail: 'The saved grounding resources could not be loaded. Please try again.'
      });
    }
  }

  triggerGroundingUpload(fileInput: HTMLInputElement): void {
    if (!this.canAccessGroundingSetup() || !this.canUploadMoreGroundingDocs() || this.uploadingGroundingDoc()) {
      return;
    }

    fileInput.value = '';
    fileInput.click();
  }

  async onGroundingFilesSelected(event: Event): Promise<void> {
    if (!this.canAccessGroundingSetup()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) {
      return;
    }

    const remainingSlots = MAX_GROUNDING_RESOURCES - this.totalGroundingResources();
    if (remainingSlots <= 0) {
      this.actions.showToast({
        severity: 'warning',
        summary: 'Upload limit reached',
        detail: `You can add up to ${MAX_GROUNDING_RESOURCES} contextual resources in total.`
      });
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      this.actions.showToast({
        severity: 'info',
        summary: 'Upload limit',
        detail: `Only ${remainingSlots} more document${remainingSlots === 1 ? '' : 's'} can be uploaded.`
      });
    }

    this.uploadingGroundingDoc.set(true);

    try {
      for (const file of filesToUpload) {
        if (!this.isValidGroundingFile(file)) {
          continue;
        }

        const response = await this.fileManagerService.uploadFile(file, GROUNDING_MAX_SIZE_MB, GROUNDING_PAGE_LIMIT, {
          projectId: this.contractId()
        });
        const storedFilename = response.data.filename;

        if (!storedFilename) {
          throw new Error('Could not get the name of the uploaded file.');
        }

        this.groundedDocuments.update(current => [
          ...current,
          {
            fileName: file.name,
            fileKey: `${environment.keyProjectOverview}${this.contractId()}/${storedFilename}`
          }
        ]);
      }
    } catch {
      this.actions.showToast({
        severity: 'error',
        summary: 'Upload failed',
        detail: 'Something went wrong while uploading the document. Please try again.'
      });
    } finally {
      this.uploadingGroundingDoc.set(false);
    }
  }

  private isValidGroundingFile(file: File): boolean {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!GROUNDING_ACCEPTED_FORMATS.includes(extension)) {
      this.actions.showToast({
        severity: 'warning',
        summary: 'Unsupported file',
        detail: `Accepted formats: ${GROUNDING_ACCEPTED_FORMATS.join(', ')}.`
      });
      return false;
    }

    const maxBytes = GROUNDING_MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      this.actions.showToast({
        severity: 'warning',
        summary: 'File too large',
        detail: `Each document can be up to ${GROUNDING_MAX_SIZE_MB} MB.`
      });
      return false;
    }

    return true;
  }

  removeGroundingDocument(fileKey: string): void {
    if (!this.canAccessGroundingSetup()) {
      return;
    }

    const document = this.groundedDocuments().find(item => item.fileKey === fileKey);
    if (!document) {
      return;
    }

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Remove document',
      icon: 'pi pi-exclamation-triangle',
      color: '#E69F00',
      detail:
        'Removing this document may make the current Executive Overview outdated. ' + 'We recommend regenerating it to update the grounded summary.',
      confirmCallback: {
        label: 'Continue',
        event: () => {
          void this.removeGroundingDocumentAsync(fileKey);
        }
      },
      cancelCallback: {
        label: 'Cancel'
      },
      buttonColor: '#035BA9'
    });
  }

  private async removeGroundingDocumentAsync(fileKey: string): Promise<void> {
    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    const document = this.groundedDocuments().find(item => item.fileKey === fileKey);
    if (!document) {
      return;
    }

    try {
      await this.documentOverviewService.deleteDocumentOverviewFiles(projectId, [document.fileName]);
      this.groundedDocuments.update(current => current.filter(item => item.fileKey !== fileKey));
    } catch {
      this.actions.showToast({
        severity: 'error',
        summary: 'Remove failed',
        detail: 'Something went wrong while removing the document. Please try again.'
      });
    }
  }

  openGroundingTextEditor(): void {
    if (!this.canAccessGroundingSetup() || (!this.hasGroundingText() && !this.canAddGroundingText())) {
      return;
    }

    this.groundingTextDraft.set(this.groundingText());
    this.showGroundingTextEditor.set(true);
  }

  onGroundingTextInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value ?? '';
    this.groundingTextDraft.set(value.slice(0, MAX_GROUNDING_TEXT_LENGTH));
  }

  saveGroundingText(): void {
    if (!this.canAccessGroundingSetup()) {
      return;
    }

    const value = this.groundingTextDraft().trim().slice(0, MAX_GROUNDING_TEXT_LENGTH);
    if (!value) {
      return;
    }

    this.groundingText.set(value);
    this.showGroundingTextEditor.set(false);
    this.groundingTextDraft.set('');
  }

  cancelGroundingText(): void {
    this.showGroundingTextEditor.set(false);
    this.groundingTextDraft.set('');
  }

  removeGroundingText(): void {
    if (!this.canAccessGroundingSetup()) {
      return;
    }

    this.groundingText.set('');
    this.showGroundingTextEditor.set(false);
    this.groundingTextDraft.set('');
  }

  async generateExecutiveOverview(): Promise<void> {
    if (!this.canAccessGroundingSetup() || !this.hasGroundingResources()) {
      return;
    }

    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    this.executiveOverviewLoading.set(true);
    this.executiveOverviewError.set(false);

    try {
      const text = this.groundingText().trim();
      const response = text
        ? await this.documentOverviewService.generateDocumentOverview(projectId, text)
        : await this.documentOverviewService.generateDocumentOverview(projectId);
      this.applyDocumentOverviewResponse(response);
    } catch {
      this.executiveOverviewError.set(true);
    } finally {
      this.executiveOverviewLoading.set(false);
    }
  }

  private async loadExecutiveOverviewSummary(): Promise<void> {
    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    this.executiveOverviewLoading.set(true);
    this.executiveOverviewError.set(false);

    try {
      const response = await this.documentOverviewService.fetchDocumentOverviewSummary(projectId);
      this.applyDocumentOverviewResponse(response);

      // When a project has no stored summary yet, auto-generate a baseline overview from the
      // project's own information (no documents or text) so users always see a summary on entry.
      // It runs once per entry; enriching it afterwards requires an explicit "Generate" click,
      // which avoids wasting AI-service calls on every visit.
      if (!this.hasExecutiveOverviewData()) {
        await this.autoGenerateBaselineOverview(projectId);
      }
    } catch {
      this.clearGeneratedExecutiveOverview();
      this.groundedDocuments.set([]);
    } finally {
      this.executiveOverviewLoading.set(false);
    }
  }

  private async autoGenerateBaselineOverview(projectId: string): Promise<void> {
    try {
      const response = await this.documentOverviewService.generateDocumentOverview(projectId);
      this.applyDocumentOverviewResponse(response);
    } catch {
      this.executiveOverviewError.set(true);
    }
  }

  private applyDocumentOverviewResponse(response: DocumentOverviewResponse): void {
    this.executiveOverviewParagraphs.set(parseDocumentOverviewParagraphs(response));
    this.executiveOverviewExpanded.set(false);
    this.groundedDocuments.set(mapAvailableOverviewFiles(response));
    this.overviewSourceDocuments.set(mapOverviewSourceDocuments(response));
    this.executiveOverviewGeneratedAt.set(response.generated_at ?? null);

    const responseText = response.text?.trim() ?? '';
    this.groundingText.set(responseText);
    this.showGroundingTextEditor.set(false);
    this.groundingTextDraft.set('');
  }

  private clearGeneratedExecutiveOverview(): void {
    this.executiveOverviewParagraphs.set([]);
    this.overviewSourceDocuments.set([]);
    this.executiveOverviewGeneratedAt.set(null);
  }

}

function formatLeverDisplayLabel(shortName: string, fullName: string): string {
  const colonIndex = fullName.indexOf(':');
  if (colonIndex >= 0) {
    const prefix = fullName.slice(0, colonIndex).trim() || shortName;
    const suffix = fullName.slice(colonIndex + 1).trim();
    return suffix ? `${prefix} - ${suffix}`.toUpperCase() : prefix.toUpperCase();
  }

  return (fullName || shortName || '—').toUpperCase();
}

function formatMainContactPersonName(item: ProjectDashboardRankedItem): string | undefined {
  const firstLastName = [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
  return item.name ?? item.full_name ?? item.contact_person_name ?? item.label ?? (firstLastName || undefined);
}

function formatContributorLabel(item: ProjectDashboardRankedItem): string {
  const contractId = item.contract_id ?? item.contract_code;
  const label = item.contract_description ?? item.project_name;
  if (contractId && label) {
    return `${contractId} - ${label}`;
  }
  return label ?? contractId ?? '—';
}

function formatPartnerLabel(item: ProjectDashboardRankedItem): string {
  const name = item.institution_name ?? item.partner_name ?? '—';
  const acronym = item.acronym?.trim();
  return acronym && name !== '—' ? `${acronym} - ${name}` : name;
}

function getPartnerItemId(item: ProjectDashboardRankedItem, index: number): string {
  if (item.institution_id === null || item.institution_id === undefined) {
    return item.partner_name ?? String(index);
  }

  return String(item.institution_id);
}

function formatIndicatorName(indicator: GetProjectDetailIndicator): string {
  return indicator.indicator?.name ?? indicator.full_name ?? 'Indicator';
}

const INDICATOR_COLOR_BY_ID: Record<number, string> = {
  1: 'var(--ac-light-blue-300)',
  2: 'var(--ac-green-300)',
  3: 'var(--ac-viz-status-rejected)',
  4: 'var(--ac-red-1)',
  5: 'var(--ac-viz-status-pending)',
  6: 'var(--ac-primary-blue-600)'
};

function getIndicatorChartColor(indicator: GetProjectDetailIndicator, fallbackIndex: number, totalIndicators: number): string {
  const indicatorId = indicator.indicator?.indicator_id ?? indicator.indicator_id;
  return typeof indicatorId === 'number'
    ? (INDICATOR_COLOR_BY_ID[indicatorId] ?? projectDashboardBarColor(fallbackIndex, totalIndicators))
    : projectDashboardBarColor(fallbackIndex, totalIndicators);
}

function formatCurrencyUSD(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const amount = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]+/g, ''));
  if (!Number.isFinite(amount)) {
    return null;
  }
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
  return `${formatted} USD`;
}

function formatCodeLabel(code: string | undefined, label: string | undefined): string {
  const cleanCode = code?.trim();
  const cleanLabel = label?.trim();
  if (cleanCode && cleanLabel) {
    return `${cleanCode} - ${cleanLabel}`;
  }
  return cleanLabel || cleanCode || '—';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractTooltipParam(params: unknown): { dataIndex?: number; name?: string; value?: number } {
  if (Array.isArray(params)) {
    return (params[0] ?? {}) as { dataIndex?: number; name?: string; value?: number };
  }
  return (params ?? {}) as { dataIndex?: number; name?: string; value?: number };
}




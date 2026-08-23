import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { GeoScopeCardComponent } from '../geo-scope-card/geo-scope-card.component';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { GetTopContributorsContractsService } from '@services/get-top-contributors-contracts.service';
import { GetTopMainContactPersonsService } from '@services/get-top-main-contact-persons.service';
import { GetTopPartnersService } from '@services/get-top-partners.service';
import { GetTopPrimaryLeversService } from '@services/get-top-primary-levers.service';
import { GetGeoScopeService } from '@services/get-geo-scope.service';
import { GetContractResultsSummaryService } from '@services/get-contract-results-summary.service';
import { ActionsService } from '@shared/services/actions.service';
import { FileManagerService } from '@shared/services/file-manager.service';
import { DocumentOverviewService } from '@shared/services/document-overview.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { GetProjectDetailService } from '@shared/services/get-project-detail.service';
import {
  DocumentOverviewResponse,
  GroundedProjectDocument,
  mapAvailableOverviewFiles,
  mapOverviewSourceDocuments,
  parseDocumentOverviewParagraphs
} from '@shared/interfaces/document-overview.interface';
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
import { GetContractSpAlignmentService } from '@services/get-contract-sp-alignment.service';
import { hasActivePooledFundingContract, isBilateralFundingType } from '@shared/constants/agresso-funding.constants';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import type { ECElementEvent } from 'echarts/core';
import { ContractCgiarEntity } from '@shared/interfaces/find-contracts.interface';

export interface ProjectContextTimeline {
  startDate: string;
  endDate: string;
  extensionDate: string | null;
  elapsedPercent: number;
  isExtended: boolean;
}

const MAX_GROUNDING_DOCS = 3;
const GROUNDING_ACCEPTED_FORMATS = ['.pdf', '.docx', '.txt'];
const GROUNDING_MAX_SIZE_MB = 10;
const GROUNDING_PAGE_LIMIT = 100;

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
    VizChartComponent
  ],
  providers: [
    GetTopContributorsContractsService,
    GetTopMainContactPersonsService,
    GetTopPartnersService,
    GetTopPrimaryLeversService,
    GetGeoScopeService,
    GetContractResultsSummaryService,
    GetContractSpAlignmentService
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
  private readonly fileManagerService = inject(FileManagerService);
  private readonly documentOverviewService = inject(DocumentOverviewService);
  private readonly rolesService = inject(RolesService);
  private readonly actions = inject(ActionsService);
  private readonly darkModeService = inject(DarkModeService);
  readonly getProjectDetailService = inject(GetProjectDetailService);
  readonly contractResultsSummary = inject(GetContractResultsSummaryService);
  readonly contractSpAlignment = inject(GetContractSpAlignmentService);

  readonly tokens = chartTokens(this.darkModeService.darkMode());

  readonly staggerMs = WIDGET_ENTRY_STAGGER_MS;

  readonly indicatorView = signal<'bars' | 'heatmap'>('bars');
  readonly useCrossfadeFallback = signal<boolean>(true);

  readonly maxGroundingDocs = MAX_GROUNDING_DOCS;
  readonly groundingAcceptedFormats = GROUNDING_ACCEPTED_FORMATS;
  readonly groundedDocuments = signal<GroundedProjectDocument[]>([]);
  readonly overviewSourceDocuments = signal<GroundedProjectDocument[]>([]);
  readonly executiveOverviewGeneratedAt = signal<string | null>(null);
  readonly uploadingGroundingDoc = signal(false);
  readonly executiveOverviewParagraphs = signal<string[]>([]);
  readonly executiveOverviewLoading = signal(false);
  readonly executiveOverviewError = signal(false);
  readonly executiveOverviewExpanded = signal(false);
  readonly isCaveatExpanded = signal(false);
  readonly isAiSectionExpanded = signal(false);

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
  readonly canUploadMoreGroundingDocs = computed(() => this.groundedDocuments().length < MAX_GROUNDING_DOCS);
  readonly canGenerateExecutiveOverview = computed(
    () => this.hasGroundedDocuments() && !this.executiveOverviewLoading() && !this.uploadingGroundingDoc()
  );
  readonly groundedDocumentsCountColor = computed(() => {
    const count = this.groundedDocuments().length;
    if (count === 0) return 'var(--ac-grey-600)';
    if (count >= MAX_GROUNDING_DOCS) return 'var(--ac-red-1)';
    return 'var(--ac-green-500)';
  });
  readonly hasGroundedDocuments = computed(() => this.groundedDocuments().length > 0);
  readonly canAccessGroundingSetup = computed(() => this.rolesService.isAdmin());
  readonly hasExecutiveOverviewData = computed(() => this.executiveOverviewParagraphs().length > 0);
  readonly hasExecutiveOverviewExpandableContent = computed(
    () => this.executiveOverviewParagraphs().length > 1 || this.overviewSourceDocuments().length > 0
  );
  readonly showGroundingSection = computed(() => this.canAccessGroundingSetup());

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

  // Heatmap matrix computations (R-DA-004)
  readonly heatmapYears = computed<(number | null)[]>(() => {
    const byIndYear = this.contractResultsSummary.list()?.by_indicator_year ?? [];
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
    const byIndYear = this.contractResultsSummary.list()?.by_indicator_year ?? [];

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
    const byIndYear = this.contractResultsSummary.list()?.by_indicator_year ?? [];
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

    const tokenRamp = this.tokens().ramp.filter(Boolean);
    const rampColors =
      tokenRamp.length === 5
        ? tokenRamp
        : [
            'var(--ac-viz-ramp-1)',
            'var(--ac-viz-ramp-2)',
            'var(--ac-viz-ramp-3)',
            'var(--ac-viz-ramp-4)',
            'var(--ac-viz-ramp-5)'
          ];

    const yearLabels = years.map(y => (y === null ? 'No year' : String(y)));
    const indicatorLabels = indicators.map(i => i.label);

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
          const item = params as { data?: [number, number, number] };
          const d = item?.data;
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
          lineStyle: { color: 'var(--ac-grey-300)' }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        }
      },
      yAxis: {
        type: 'category',
        data: indicatorLabels,
        splitArea: { show: true },
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
      visualMap: {
        min: 0,
        max: max > 0 ? max : 1,
        calculable: false,
        orient: 'horizontal',
        show: false,
        inRange: {
          color: rampColors
        }
      },
      series: [
        {
          id: 'indicator-series',
          name: 'Results by indicator and year',
          type: 'heatmap',
          data,
          universalTransition: {
            enabled: true,
            divideShape: 'clone'
          },
          label: {
            show: true,
            color: 'var(--ac-grey-800)',
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
    const byStatus = this.contractResultsSummary.list()?.by_status ?? [];
    const pending = byStatus.find(s => Number(s.status_id) === 5 || s.name?.toLowerCase().includes('pending'));
    return pending?.count ?? 0;
  });
  readonly partnerInstitutionsCount = computed(() => this.contractResultsSummary.list()?.partner_institutions ?? 0);

  // Status region (R-PD-003): fed exclusively by the aggregate (R-PD-001 via
  // GetContractResultsSummaryService — T-05). The bulk `GET results` fetch,
  // `buildStatusChartItems`, and the hardcoded fallback are removed (D-PD-2/D-PD-3).
  readonly statusBuckets = computed<ContractResultsSummaryStatusBucket[]>(() => this.contractResultsSummary.list()?.by_status ?? []);
  readonly statusTotal = computed(() => this.contractResultsSummary.list()?.total ?? 0);
  readonly statusChartLoading = computed(() => this.contractResultsSummary.loading());
  readonly statusChartError = computed(() => this.contractResultsSummary.loadError());
  readonly statusChartEmpty = computed(
    () => !this.contractResultsSummary.loading() && !this.contractResultsSummary.loadError() && this.statusBuckets().length === 0
  );

  readonly topContributors = inject(GetTopContributorsContractsService);
  readonly topMainContactPersons = inject(GetTopMainContactPersonsService);
  readonly topPartners = inject(GetTopPartnersService);
  readonly topPrimaryLevers = inject(GetTopPrimaryLeversService);
  private readonly geoScope = inject(GetGeoScopeService);

  readonly contributorItems = computed(() =>
    this.topContributors
      .list()
      .map((item, index) => ({
        id: item.contract_code ?? item.contract_id ?? String(index),
        label: formatContributorLabel(item),
        count: Number(item.results_count ?? item.count ?? 0)
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly contributorsEmpty = computed(
    () => !this.topContributors.loading() && !this.topContributors.loadError() && this.topContributors.list().length === 0
  );

  readonly mainContactPersonItems = computed(() =>
    this.topMainContactPersons
      .list()
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
      !this.topMainContactPersons.loading() &&
      !this.topMainContactPersons.loadError() &&
      this.topMainContactPersons.list().length === 0
  );

  readonly partnerItems = computed(() =>
    this.topPartners.list().map((item, index) => ({
      id: getPartnerItemId(item, index),
      label: formatPartnerLabel(item),
      count: Number(item.results_count ?? item.count ?? 0)
    }))
  );

  readonly partnersEmpty = computed(() => !this.topPartners.loading() && !this.topPartners.loadError() && this.topPartners.list().length === 0);

  readonly leverItems = computed(() =>
    this.topPrimaryLevers
      .list()
      .map(item => ({
        id: String(item.lever_id),
        label: formatLeverDisplayLabel(item.short_name, item.full_name),
        count: item.count,
        iconUrl: item.icon || undefined
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly leversEmpty = computed(
    () => !this.topPrimaryLevers.loading() && !this.topPrimaryLevers.loadError() && this.topPrimaryLevers.list().length === 0
  );

  readonly pendingRevisionExcludedColumns = ['status', 'year', 'versions', 'creation_date', 'public_link', 'project'] as const;

  constructor() {
    effect(() => {
      const contractId = this.contractId();
      if (contractId) {
        void this.syncProjectFromSharedService(contractId);
        this.contractResultsSummary.main(contractId);
        this.topContributors.main(contractId, 4);
        this.topMainContactPersons.main(contractId, 4);
        this.topPartners.main(contractId, 4);
        this.topPrimaryLevers.main(contractId, 4);
        this.geoScope.main(contractId);
        this.resultsCenterService.initializeProjectDashboardResultsTable(contractId);

        void this.loadExecutiveOverviewSummary();
      }
    });

    effect(() => {
      const contractId = this.contractId();
      const isBilateral = this.isBilateral();
      if (contractId && isBilateral) {
        this.contractSpAlignment.main(contractId);
      }
    });
  }

  setIndicatorView(view: 'bars' | 'heatmap'): void {
    this.indicatorView.set(view);
  }

  onIndicatorHeatmapClick(event: ECElementEvent): void {
    const data = event.data as [number, number, number] | undefined;
    if (!data || !Array.isArray(data)) return;
    const [, indicatorIndex] = data;
    const indicator = this.indicatorsWithResults()[indicatorIndex];
    if (indicator?.id !== undefined && indicator?.id !== null) {
      void this.router.navigate(['/project-detail', this.contractId()], {
        queryParams: { indicatorTab: indicator.id }
      });
    }
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
      void this.router.navigate(['/project-detail', contractId, 'project-results']);
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
      void this.router.navigate(['/project-detail', contractId, 'project-results'], {
        queryParams: { indicatorTab: targetId }
      });
    }
  }

  scrollToPartners(event?: Event): void {
    if (this.contractResultsSummary.loading()) {
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

    const remainingSlots = MAX_GROUNDING_DOCS - this.groundedDocuments().length;
    if (remainingSlots <= 0) {
      this.actions.showToast({
        severity: 'warning',
        summary: 'Upload limit reached',
        detail: `You can upload up to ${MAX_GROUNDING_DOCS} foundational documents.`
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
    this.executiveOverviewError.set(false);

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
      color: 'var(--ac-viz-status-pending)',
      detail:
        'Removing this document may make the current Executive Overview outdated. ' +
        'We recommend regenerating it to update the grounded summary.',
      confirmCallback: {
        label: 'Continue',
        event: () => {
          void this.removeGroundingDocumentAsync(fileKey);
        }
      },
      cancelCallback: {
        label: 'Cancel'
      },
      buttonColor: 'var(--ac-light-blue-400)'
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

  async generateExecutiveOverview(): Promise<void> {
    if (!this.canAccessGroundingSetup() || !this.hasGroundedDocuments()) {
      return;
    }

    this.isAiSectionExpanded.set(true);

    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    this.executiveOverviewLoading.set(true);
    this.executiveOverviewError.set(false);

    try {
      const response = await this.documentOverviewService.generateDocumentOverview(projectId);
      this.applyDocumentOverviewResponse(response);
    } catch {
      this.executiveOverviewError.set(true);
      this.actions.showToast({
        severity: 'error',
        summary: 'Generation failed',
        detail: 'Unable to generate the executive overview. Please try again.'
      });
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
    } catch {
      this.clearGeneratedExecutiveOverview();
      this.groundedDocuments.set([]);
    } finally {
      this.executiveOverviewLoading.set(false);
    }
  }

  private applyDocumentOverviewResponse(response: DocumentOverviewResponse): void {
    this.executiveOverviewParagraphs.set(parseDocumentOverviewParagraphs(response));
    this.groundedDocuments.set(mapAvailableOverviewFiles(response));
    this.overviewSourceDocuments.set(mapOverviewSourceDocuments(response));
    this.executiveOverviewGeneratedAt.set(response.generated_at ?? null);
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



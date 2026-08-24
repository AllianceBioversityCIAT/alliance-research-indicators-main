import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { GeoScopeMapComponent } from '../geo-scope-map/geo-scope-map.component';
import { GetContractDashboardService } from '@shared/services/get-contract-dashboard.service';
import {
  GeoScopeCountrySummary,
  GeoScopeMetric,
  GeoScopeSubNationalSummary
} from '@interfaces/geo-scope-card.interface';
import { ProjectDashboardRankedListItem } from '@interfaces/project-dashboard.interface';
import { projectDashboardBarColor } from '@shared/constants/project-dashboard-chart-colors.constants';
import { VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';

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

/**
 * Builds the shared horizontal-bar `EChartsOption` for a geo-scope ranking
 * surface (regions / countries / sub-national levels), mirroring the F1
 * rankings builder family in `project-dashboard.component.ts` (partner /
 * lever / contact / contributor cards) — one bar chart engine everywhere
 * (R-DN-002, D-DN-6 OQ-2-A).
 */
function buildGeoRankingChartOptions(items: readonly ProjectDashboardRankedListItem[], caption: string): EChartsOption | null {
  if (items.length === 0) {
    return null;
  }

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
        name: caption,
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
}

function buildGeoRankingTableModel(
  items: readonly ProjectDashboardRankedListItem[],
  caption: string,
  labelHeader: string
): VizChartTableModel | null {
  if (items.length === 0) {
    return null;
  }
  return {
    caption,
    headers: [labelHeader, 'Results'],
    rows: items.map(item => [item.label, item.count])
  };
}

@Component({
  selector: 'app-geo-scope-card',
  standalone: true,
  imports: [ProjectDashboardCardComponent, GeoScopeMapComponent],
  templateUrl: './geo-scope-card.component.html',
  host: {
    class: 'block w-full'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeoScopeCardComponent {
  readonly service = inject(GetContractDashboardService);

  readonly loading = computed(() => this.service.loading());
  readonly loadError = computed(() => this.service.loadError());
  readonly summary = computed(() => this.service.geoScope()?.geo_scope_summary ?? {});
  readonly topRegionsList = computed(() => this.service.geoScope()?.top_regions ?? []);
  readonly topCountriesList = computed(() => this.service.geoScope()?.top_countries ?? []);

  readonly isEmpty = computed(() => {
    if (this.loading() || this.loadError()) {
      return false;
    }

    const summary = this.summary();
    const summaryTotal =
      Number(summary.global ?? 0) +
      Number(summary.regional ?? 0) +
      Number(summary.countries ?? 0) +
      Number(summary.sub_national ?? 0) +
      Number(summary.yet_to_be_determined ?? 0);

    return summaryTotal === 0 && this.topRegionsList().length === 0 && this.topCountriesList().length === 0;
  });

  readonly summaryMetrics = computed<GeoScopeMetric[]>(() => {
    const summary = this.summary();
    if (!Object.keys(summary).length) {
      return [];
    }

    return [
      { key: 'global', label: 'Global', value: Number(summary.global ?? 0) },
      { key: 'regional', label: 'Regional', value: Number(summary.regional ?? 0) },
      { key: 'countries', label: 'Countries', value: Number(summary.countries ?? 0) },
      { key: 'sub_national', label: 'Sub-national', value: Number(summary.sub_national ?? 0) },
      { key: 'yet_to_be_determined', label: 'Yet to be determined', value: Number(summary.yet_to_be_determined ?? 0) }
    ];
  });

  readonly visibleSummaryMetrics = computed(() => this.summaryMetrics().filter(metric => metric.value > 0));

  readonly topCountries = computed<GeoScopeCountrySummary[]>(() =>
    [...this.topCountriesList()]
      .sort((first, second) => Number(second.count ?? 0) - Number(first.count ?? 0))
      .map(country => ({
        id: country.iso_alpha_2 ?? country.country_name,
        label: country.country_name,
        count: Number(country.count ?? country.results_count ?? 0),
        subNationals: (country.top_sub_nationals ?? [])
          .slice()
          .sort((first, second) => Number(second.count ?? 0) - Number(first.count ?? 0))
          .slice(0, 3)
          .map(subNational => ({
            id: String(subNational.sub_national_id),
            label: subNational.sub_national_name,
            countryName: country.country_name,
            count: Number(subNational.count ?? 0)
          }))
      }))
  );

  readonly topSubNationals = computed<GeoScopeSubNationalSummary[]>(() =>
    this.topCountries()
      .flatMap(country => country.subNationals)
      .sort((first, second) => second.count - first.count)
      .slice(0, 6)
  );

  readonly topRegions = computed(() =>
    this.topRegionsList().map((item, index) => ({
      id: item.region_name ?? String(index),
      label: item.region_name ?? '—',
      count: Number(item.results_count ?? item.count ?? 0)
    }))
  );

  readonly topCountryItems = computed(() =>
    this.topCountries().map(country => ({
      id: country.id,
      label: country.label,
      count: country.count
    }))
  );

  readonly topSubNationalItems = computed(() =>
    this.topSubNationals().map(subNational => ({
      id: subNational.id,
      label: subNational.label,
      count: subNational.count
    }))
  );

  readonly regionTableModel = computed<VizChartTableModel | null>(() =>
    buildGeoRankingTableModel(this.topRegions(), 'Top regions', 'Region')
  );

  readonly regionChartOptions = computed<EChartsOption | null>(() =>
    buildGeoRankingChartOptions(this.topRegions(), 'Top regions')
  );

  readonly countryTableModel = computed<VizChartTableModel | null>(() =>
    buildGeoRankingTableModel(this.topCountryItems(), 'Top countries', 'Country')
  );

  readonly countryChartOptions = computed<EChartsOption | null>(() =>
    buildGeoRankingChartOptions(this.topCountryItems(), 'Top countries')
  );

  readonly subNationalTableModel = computed<VizChartTableModel | null>(() =>
    buildGeoRankingTableModel(this.topSubNationalItems(), 'Top sub-national levels', 'Sub-national level')
  );

  readonly subNationalChartOptions = computed<EChartsOption | null>(() =>
    buildGeoRankingChartOptions(this.topSubNationalItems(), 'Top sub-national levels')
  );
}

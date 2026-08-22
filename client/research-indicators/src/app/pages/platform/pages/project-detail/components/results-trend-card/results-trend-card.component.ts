import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { ContractResultsSummaryYearBucket } from '@interfaces/contract-results-summary.interface';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';

@Component({
  selector: 'app-results-trend-card',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, VizChartComponent],
  templateUrl: './results-trend-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultsTrendCardComponent {
  private readonly darkModeService = inject(DarkModeService);
  readonly tokens = chartTokens(this.darkModeService.darkMode());

  readonly buckets = input<ContractResultsSummaryYearBucket[]>([]);
  readonly loading = input<boolean>(false);
  readonly error = input<boolean>(false);
  readonly retry = output<void>();

  // Filter out null or invalid year values and sort ascending by year
  readonly validBuckets = computed(() => {
    const raw = this.buckets() ?? [];
    return raw
      .filter((b): b is ContractResultsSummaryYearBucket & { year: number } => b.year !== null && b.year !== undefined && !isNaN(Number(b.year)))
      .map(b => ({ year: Number(b.year), count: Number(b.count ?? 0) }))
      .sort((a, b) => a.year - b.year);
  });

  readonly bucketCount = computed(() => this.validBuckets().length);
  readonly isSparse = computed(() => !this.loading() && !this.error() && this.bucketCount() === 1);
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.bucketCount() === 0);
  readonly hasChart = computed(() => !this.loading() && !this.error() && this.bucketCount() >= 2);
  readonly singleBucket = computed(() => this.validBuckets()[0] ?? null);

  readonly maxYear = computed(() => {
    const b = this.validBuckets();
    return b.length ? b[b.length - 1].year : null;
  });

  readonly subtitle = computed(() => {
    const max = this.maxYear();
    if (max && this.bucketCount() >= 2) {
      return `by report year · ${max} in progress`;
    }
    return 'by report year';
  });

  // Accessible summary of the reporting trend (R-PD-004 AC.2 / R-PD-009 AC.1)
  readonly chartAriaLabel = computed(() => {
    const buckets = this.validBuckets();
    if (buckets.length === 0) {
      return 'Results over time: no data';
    }
    if (buckets.length === 1) {
      return `Results for report year ${buckets[0].year}: ${buckets[0].count} results`;
    }
    const minYear = buckets[0].year;
    const maxYear = buckets[buckets.length - 1].year;
    const points = buckets.map(b => `${b.year}: ${b.count}`).join(', ');
    return `Results per report year from ${minYear} to ${maxYear}: ${points}`;
  });

  readonly tableModel = computed<VizChartTableModel>(() => {
    const buckets = this.validBuckets();
    return {
      caption: 'Results over time by report year',
      headers: ['Year', 'Results'],
      rows: buckets.map(b => [String(b.year), b.count])
    };
  });

  readonly chartOptions = computed<EChartsOption | null>(() => {
    const buckets = this.validBuckets();
    if (buckets.length < 2) {
      return null;
    }
    const tokenSeries1 = this.tokens().series1;
    const seriesColor = tokenSeries1 || 'var(--ac-viz-series-1)';
    const lastIndex = buckets.length - 1;

    return {
      grid: {
        left: 8,
        right: 16,
        top: 24,
        bottom: 8,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: (params: unknown) => {
          const item = Array.isArray(params) ? params[0] : (params as { name?: string; value?: unknown });
          if (!item) return '';
          return `Report Year ${item.name}: <strong>${item.value}</strong> results`;
        }
      },
      xAxis: {
        type: 'category',
        data: buckets.map(b => String(b.year)),
        axisTick: { show: false },
        axisLine: {
          lineStyle: {
            color: 'var(--ac-grey-300)'
          }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        splitLine: {
          lineStyle: {
            color: 'var(--ac-grey-100)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow'
        }
      },
      visualMap: {
        show: false,
        dimension: 0,
        pieces: [
          { lte: Math.max(0, lastIndex - 1), lineStyle: { type: 'solid', color: seriesColor, width: 2 } },
          { gt: Math.max(0, lastIndex - 1), lineStyle: { type: 'dashed', color: seriesColor, width: 2 } }
        ]
      },
      series: [
        {
          name: 'Results',
          type: 'line',
          data: buckets.map(b => b.count),
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: 'var(--ac-white-1)',
            borderColor: seriesColor,
            borderWidth: 2
          }
        }
      ]
    };
  });
}

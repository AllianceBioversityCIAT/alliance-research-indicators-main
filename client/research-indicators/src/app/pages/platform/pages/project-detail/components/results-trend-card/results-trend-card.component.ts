import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { ContractResultsSummaryYearBucket } from '@interfaces/contract-results-summary.interface';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import type { ECElementEvent } from 'echarts/core';

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

  // General (non `--ac-viz-*`) design tokens used for axis/grid chrome. Resolved
  // the same way as `tokens` above (D-DN-5): echarts' SVG renderer — including
  // SSR, which the regression harness renders through — emits option colors as
  // literal presentation-attribute strings, so an unresolved `var(--…)` value
  // reaches the SVG unresolved rather than being computed away. Every color fed
  // into `chartOptions` below must therefore be a resolved literal or omitted
  // (theme default) — never a `var(--…)` fallback string.
  private readonly axisTokens = computed(() => {
    this.darkModeService.darkMode();
    return {
      axisLine: this.resolveDesignToken('--ac-grey-300'),
      axisLabel: this.resolveDesignToken('--ac-grey-700'),
      splitLine: this.resolveDesignToken('--ac-grey-100'),
      symbolFill: this.resolveDesignToken('--ac-white-1')
    };
  });

  private resolveDesignToken(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
  }

  readonly buckets = input<ContractResultsSummaryYearBucket[]>([]);
  readonly loading = input<boolean>(false);
  readonly error = input<boolean>(false);
  readonly retry = output<void>();
  readonly chartClick = output<ECElementEvent>();

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

  // D-DN-1: two overlapping line series (no visualMap — visualMap.pieces[].lineStyle
  // is the confirmed crash input, requirements.md §1) sharing one resolved series
  // color: "closed" = buckets [0..lastClosedIndex] solid; "in-progress" =
  // [lastClosedIndex..lastIndex] dashed. Both series carry the full x-axis category
  // data with `null` outside their range so echarts still aligns them on the shared
  // axis; the overlap point at lastClosedIndex is intentional (it is where the solid
  // segment hands off to the dashed one) and is deduped in the tooltip formatter.
  readonly chartOptions = computed<EChartsOption | null>(() => {
    const buckets = this.validBuckets();
    if (buckets.length < 2) {
      return null;
    }
    const seriesColor = this.tokens().series1 || undefined;
    const axis = this.axisTokens();
    const lastIndex = buckets.length - 1;
    const lastClosedIndex = Math.max(0, lastIndex - 1);

    const closedData: (number | null)[] = buckets.map((b, i) => (i <= lastClosedIndex ? b.count : null));
    const inProgressData: (number | null)[] = buckets.map((b, i) => (i >= lastClosedIndex ? b.count : null));

    const symbolItemStyle = {
      ...(axis.symbolFill ? { color: axis.symbolFill } : {}),
      ...(seriesColor ? { borderColor: seriesColor } : {}),
      borderWidth: 2
    };

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
          const items = (Array.isArray(params) ? params : [params]) as { name?: string; value?: unknown }[];
          // Both series share the x-axis; at the closed/in-progress handoff point
          // BOTH carry the same real value while the other index positions carry
          // `null` for whichever series doesn't cover them. Pick the first item
          // with a real value so the tooltip never shows a duplicate or a `null`.
          const item = items.find(p => p?.value !== null && p?.value !== undefined) ?? items[0];
          if (!item) return '';
          return `Report Year ${item.name}: <strong>${item.value}</strong> results`;
        }
      },
      xAxis: {
        type: 'category',
        data: buckets.map(b => String(b.year)),
        axisTick: { show: false },
        axisLine: {
          lineStyle: axis.axisLine ? { color: axis.axisLine } : {}
        },
        axisLabel: {
          ...(axis.axisLabel ? { color: axis.axisLabel } : {}),
          fontFamily: 'Barlow'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        splitLine: {
          lineStyle: {
            ...(axis.splitLine ? { color: axis.splitLine } : {}),
            type: 'dashed'
          }
        },
        axisLabel: {
          ...(axis.axisLabel ? { color: axis.axisLabel } : {}),
          fontFamily: 'Barlow'
        }
      },
      series: [
        {
          name: 'Results (closed)',
          type: 'line',
          cursor: 'pointer',
          data: closedData,
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          connectNulls: false,
          lineStyle: {
            type: 'solid',
            width: 2,
            ...(seriesColor ? { color: seriesColor } : {})
          },
          itemStyle: symbolItemStyle
        },
        {
          name: 'Results (in progress)',
          type: 'line',
          cursor: 'pointer',
          data: inProgressData,
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          connectNulls: false,
          lineStyle: {
            type: 'dashed',
            width: 2,
            ...(seriesColor ? { color: seriesColor } : {})
          },
          itemStyle: symbolItemStyle
        }
      ]
    };
  });

  onChartClick(event: ECElementEvent): void {
    if (event.componentType === 'series') {
      this.chartClick.emit(event);
    }
  }
}

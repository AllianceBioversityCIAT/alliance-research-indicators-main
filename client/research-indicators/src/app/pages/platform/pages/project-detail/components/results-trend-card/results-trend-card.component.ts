import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { ContractResultsSummaryYearBucket } from '@interfaces/contract-results-summary.interface';

@Component({
  selector: 'app-results-trend-card',
  standalone: true,
  imports: [ButtonModule, ChartModule, SkeletonModule],
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

  readonly chartData = computed(() => {
    const buckets = this.validBuckets();
    if (buckets.length < 2) {
      return null;
    }
    const tokenSeries1 = this.tokens().series1;
    const seriesColor = tokenSeries1 || 'var(--ac-viz-series-1)';
    const lastIndex = buckets.length - 1;

    return {
      labels: buckets.map(b => String(b.year)),
      datasets: [
        {
          label: 'Results',
          data: buckets.map(b => b.count),
          borderColor: seriesColor,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'var(--ac-white-1)',
          pointBorderColor: seriesColor,
          pointBorderWidth: 2,
          segment: {
            borderDash: (ctx: { p1DataIndex: number }) => (ctx.p1DataIndex === lastIndex ? [5, 5] : undefined)
          }
        }
      ]
    };
  });

  readonly chartOptions = computed(() => {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion ? false : { duration: 400 },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          displayColors: false,
          callbacks: {
            title: (items: { label: string }[]) => `Report Year ${items[0]?.label ?? ''}`,
            label: (item: { raw: unknown }) => `${item.raw} results`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'var(--ac-grey-700)'
          }
        },
        y: {
          min: 0,
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: 'var(--ac-grey-700)'
          },
          grid: {
            color: 'var(--ac-grey-100)'
          }
        }
      }
    };
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import {
  INDICATOR_ID_TO_SLUG,
  STATUS_ID_TO_SLUG
} from '@platform/pages/results-center/url/results-center-url.vocabulary';

interface Indicator {
  indicator_id: number;
  name: string;
  indicator_type_id: number;
  description: string;
  long_description: string;
  icon_src: string;
  other_names: null;
  amount_results: number;
}

interface ChartLegendItem {
  color: string;
  label: string;
  value: number;
  result_status_id: number;
}

@Component({
  selector: 'app-data-overview',
  imports: [S3ImageUrlPipe, RouterLink],
  templateUrl: './data-overview.component.html',
  styleUrl: './data-overview.component.scss'
})
export class DataOverviewComponent implements OnInit {
  api = inject(ApiService);
  results = true;
  chartLegend = signal<ChartLegendItem[]>([]);
  statusBarsMax = computed(() => {
    const items = this.chartLegend();
    if (!items.length) {
      return 0;
    }
    return Math.max(...items.map(i => i.value), 0);
  });

  showChart = signal(false);
  showIndicatorList = signal(false);
  indicatorList: WritableSignal<Indicator[]> = signal([]);

  ngOnInit() {
    this.getData();
    this.getIndicatorData();
  }

  barFillPercent(value: number): number {
    const max = this.statusBarsMax();
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, (value / max) * 100);
  }

  async getIndicatorData() {
    const response = await this.api.GET_IndicatorsResultsAmount();
    const hasResults = response.data.some((item: any) => item.amount_results > 0);
    this.showIndicatorList.set(hasResults);
    this.indicatorList.set(response.data);
  }

  chartData(data: any) {
    const rows = Array.isArray(data) ? data : [];
    const filtered = rows.filter((item: any) => Number(item.amount_results) >= 1);

    const items = filtered.map((item: any) => ({
      color: item.result_status?.config?.color?.text || '#1689CA',
      label: item.name,
      value: Number(item.amount_results),
      result_status_id: Number(item.result_status_id)
    }));
    items.sort((a, b) => b.value - a.value);
    this.chartLegend.set(items);
  }

  async getData() {
    const response = await this.api.GET_ResultsStatus();
    this.chartData(response.data ?? []);
    this.showChart.set(this.chartLegend().length > 0);
  }

  /**
   * Canonical Results Center link params for the "My results by status" card
   * (R-RCU-007 AC.1, AC.1b). Resolves the slug from the frozen vocabulary
   * (`STATUS_ID_TO_SLUG`) rather than hard-coding a string, so this producer
   * cannot drift from the codec that parses it. `tab=my` is mandatory: this
   * card's My-scope used to come from an unconditional `loadMyResults(true)`
   * that the URL read path no longer performs, and without `tab=my` the
   * scope would resolve to the pinned preference, which defaults to `all`.
   * An id absent from the vocabulary (drift) degrades to an unfiltered
   * My-Results link rather than emitting an invalid token.
   */
  statusRowQueryParams(item: ChartLegendItem): Record<string, string> {
    const slug = STATUS_ID_TO_SLUG.get(item.result_status_id);
    return slug ? { status: slug, tab: 'my' } : { tab: 'my' };
  }

  /**
   * Canonical Results Center link params for the "My results by indicator"
   * card (R-RCU-007 AC.1, AC.1b) — see `statusRowQueryParams` above for the
   * `tab=my` rationale (R2-4 / JD-5 regression guard) and the drift-fallback
   * behavior.
   */
  indicatorRowQueryParams(indicator: Indicator): Record<string, string> {
    const slug = INDICATOR_ID_TO_SLUG.get(indicator.indicator_id);
    return slug ? { indicator: slug, tab: 'my' } : { tab: 'my' };
  }
}

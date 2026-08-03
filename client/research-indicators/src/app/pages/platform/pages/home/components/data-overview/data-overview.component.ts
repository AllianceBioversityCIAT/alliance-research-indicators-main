/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

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

  statusRowQueryParams(item: ChartLegendItem) {
    return {
      statusTab: item.result_status_id,
      statusLabel: item.label
    };
  }
}

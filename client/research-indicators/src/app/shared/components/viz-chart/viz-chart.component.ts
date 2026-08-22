import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import * as echarts from 'echarts/core';
import {
  BarChart,
  BarSeriesOption,
  LineChart,
  LineSeriesOption,
  GraphChart,
  GraphSeriesOption,
  HeatmapChart,
  HeatmapSeriesOption,
  MapChart,
  MapSeriesOption
} from 'echarts/charts';
import {
  TitleComponent,
  TitleComponentOption,
  TooltipComponent,
  TooltipComponentOption,
  GridComponent,
  GridComponentOption,
  DatasetComponent,
  DatasetComponentOption,
  LegendComponent,
  LegendComponentOption,
  VisualMapComponent,
  VisualMapComponentOption,
  GeoComponent,
  GeoComponentOption
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { UniversalTransition } from 'echarts/features';
import type { ECElementEvent } from 'echarts/core';

echarts.use([
  SVGRenderer,
  BarChart,
  LineChart,
  GraphChart,
  HeatmapChart,
  MapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  LegendComponent,
  VisualMapComponent,
  GeoComponent,
  UniversalTransition
]);

export interface VizChartTableModel {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: string;
}

export type EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | GraphSeriesOption
  | HeatmapSeriesOption
  | MapSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
  | LegendComponentOption
  | VisualMapComponentOption
  | GeoComponentOption
>;

@Component({
  selector: 'app-viz-chart',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './viz-chart.component.html',
  styleUrl: './viz-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VizChartComponent implements AfterViewInit, OnDestroy {
  readonly options = input<EChartsOption | null>(null);
  readonly tableModel = input<VizChartTableModel | null>(null);
  readonly chartTitle = input<string>('');
  readonly height = input<string>('300px');
  readonly loading = input<boolean>(false);
  readonly requireTable = input<boolean>(true);

  readonly chartClick = output<ECElementEvent>();
  readonly chartInit = output<echarts.ECharts>();

  readonly chartContainer = viewChild<ElementRef<HTMLElement>>('chartContainer');

  private chart?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;
  private viewInitialized = false;

  constructor() {
    effect(() => {
      this.options();
      this.tableModel();
      this.requireTable();

      if (!this.viewInitialized) {
        return;
      }

      this.applyChartOptions();
    });
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.initResizeObserver();
    this.viewInitialized = true;
    this.applyChartOptions();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (this.chart && !this.chart.isDisposed()) {
      this.chart.dispose();
      this.chart = undefined;
    }
  }

  resize(): void {
    if (this.chart && !this.chart.isDisposed()) {
      this.chart.resize();
    }
  }

  getInstance(): echarts.ECharts | undefined {
    return this.chart;
  }

  private initChart(): void {
    const container = this.chartContainer()?.nativeElement;
    if (!container) {
      return;
    }

    this.chart = echarts.init(container, undefined, { renderer: 'svg' });
    this.chart.on('click', (params: ECElementEvent) => {
      this.chartClick.emit(params);
    });
    this.chartInit.emit(this.chart);
  }

  private initResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const container = this.chartContainer()?.nativeElement;
    if (!container) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);
  }

  private applyChartOptions(): void {
    if (!this.chart || this.chart.isDisposed()) {
      return;
    }

    const opts = this.options();
    const table = this.tableModel();
    const reqTable = this.requireTable();

    // Structural pairing: if options is provided and requireTable is true,
    // tableModel must be provided. If missing, clear/prevent chart rendering.
    if (!opts || (reqTable && !table)) {
      this.chart.clear();
      return;
    }

    const isReducedMotion = this.checkReducedMotion();
    const finalOptions: EChartsOption = isReducedMotion
      ? { ...(opts as object), animation: false }
      : opts;

    this.chart.setOption(finalOptions as echarts.EChartsCoreOption, true);
  }

  private checkReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

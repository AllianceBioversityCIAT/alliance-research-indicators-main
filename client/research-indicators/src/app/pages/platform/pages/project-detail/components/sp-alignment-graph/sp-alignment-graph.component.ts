import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { ContractSpAlignmentReport } from '@shared/interfaces/contract-sp-alignment.interface';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import type { ECElementEvent } from 'echarts/core';

const MAX_RESULT_NODES = 150;

@Component({
  selector: 'app-sp-alignment-graph',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, VizChartComponent],
  templateUrl: './sp-alignment-graph.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpAlignmentGraphComponent {
  private readonly router = inject(Router);
  private readonly darkModeService = inject(DarkModeService);

  readonly tokens = chartTokens(this.darkModeService.darkMode());

  readonly report = input<ContractSpAlignmentReport | null>(null);
  readonly loading = input<boolean>(false);
  readonly error = input<boolean>(false);

  readonly retry = output<void>();

  readonly sps = computed(() => this.report()?.sps ?? []);
  readonly resultsWithAlignment = computed(() => this.report()?.results_with_alignment ?? 0);
  readonly resultsWithoutAlignment = computed(() => this.report()?.results_without_alignment ?? 0);

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.sps().length === 0);
  readonly hasData = computed(() => !this.loading() && !this.error() && this.sps().length > 0);

  readonly uniqueResults = computed(() => {
    const sps = this.sps();
    const map = new Map<string, { code: string; title: string }>();
    for (const sp of sps) {
      for (const link of sp.links ?? []) {
        if (link.result_official_code && !map.has(link.result_official_code)) {
          map.set(link.result_official_code, {
            code: link.result_official_code,
            title: link.result_title ?? ''
          });
        }
      }
    }
    const extractNumber = (code: string): number => {
      const match = code.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    return Array.from(map.values()).sort((a, b) => {
      const numA = extractNumber(a.code);
      const numB = extractNumber(b.code);
      if (numA !== numB) {
        return numB - numA; // Recency: highest official code first
      }
      return b.code.localeCompare(a.code);
    });
  });

  readonly totalResultNodesCount = computed(() => this.uniqueResults().length);
  readonly isCapped = computed(() => this.totalResultNodesCount() > MAX_RESULT_NODES);
  readonly maxResultNodes = MAX_RESULT_NODES;

  readonly chartOptions = computed<EChartsOption | null>(() => {
    if (!this.hasData()) {
      return null;
    }

    const sps = this.sps();
    const allResults = this.uniqueResults();
    const visibleResults = this.isCapped() ? allResults.slice(0, MAX_RESULT_NODES) : allResults;
    const visibleCodes = new Set(visibleResults.map(r => r.code));

    const spNodes = sps.map(sp => ({
      name: sp.sp_code,
      category: 0,
      symbolSize: 22 + Math.min(28, (sp.links?.length ?? 0) * 3),
      label: {
        show: true,
        position: 'top' as const,
        formatter: sp.sp_code
      },
      tooltip: sp.name,
      itemStyle: {
        color: this.tokens().series1 || 'var(--ac-viz-series-1)'
      }
    }));

    const resultNodes = visibleResults.map(r => ({
      name: r.code,
      category: 1,
      symbolSize: 14,
      label: {
        show: true,
        position: 'bottom' as const,
        formatter: r.code
      },
      tooltip: r.title,
      itemStyle: {
        color: this.tokens().series2 || 'var(--ac-viz-series-2)'
      }
    }));

    const nodes = [...spNodes, ...resultNodes];

    const edges: {
      source: string;
      target: string;
      role: string;
      lineStyle: { color: string; width: number; type: 'solid' | 'dashed' | 'dotted' };
    }[] = [];

    for (const sp of sps) {
      for (const link of sp.links ?? []) {
        if (visibleCodes.has(link.result_official_code)) {
          let lineStyle: { color: string; width: number; type: 'solid' | 'dashed' | 'dotted' };
          if (link.role === 'PRIMARY') {
            lineStyle = {
              color: this.tokens().rolePrimary || 'var(--ac-viz-role-primary)',
              width: 3,
              type: 'solid'
            };
          } else if (link.role === 'CONTRIBUTING') {
            lineStyle = {
              color: this.tokens().roleContributing || 'var(--ac-viz-role-contributing)',
              width: 2,
              type: 'dashed'
            };
          } else {
            lineStyle = {
              color: this.tokens().roleUnknown || 'var(--ac-viz-role-unknown)',
              width: 1.5,
              type: 'dotted'
            };
          }

          edges.push({
            source: sp.sp_code,
            target: link.result_official_code,
            role: link.role,
            lineStyle
          });
        }
      }
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const item = params as {
            dataType?: string;
            name?: string;
            data?: { name?: string; tooltip?: string; role?: string; source?: string; target?: string };
          };
          if (item?.dataType === 'node') {
            const name = item.name ?? item.data?.name ?? '';
            const tooltip = item.data?.tooltip ?? '';
            return tooltip ? `<strong>${name}</strong><br/>${tooltip}` : `<strong>${name}</strong>`;
          }
          if (item?.dataType === 'edge') {
            const source = item.data?.source ?? '';
            const target = item.data?.target ?? '';
            const role = item.data?.role ?? '';
            return `${source} &rarr; ${target}${role ? `<br/>Role: ${role}` : ''}`;
          }
          return '';
        }
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          force: {
            repulsion: 180,
            edgeLength: [50, 110]
          },
          roam: 'scale',
          emphasis: {
            focus: 'adjacency'
          },
          data: nodes,
          links: edges,
          categories: [{ name: 'Science Programs' }, { name: 'Results' }]
        }
      ]
    };
  });

  readonly tableModel = computed<VizChartTableModel>(() => {
    const rows: (string | number)[][] = [];
    for (const sp of this.sps()) {
      for (const link of sp.links ?? []) {
        rows.push([
          sp.sp_code,
          link.result_official_code,
          link.result_title || '',
          link.role
        ]);
      }
    }

    return {
      caption: 'Science-Program alignments by result and role',
      headers: ['Science Program', 'Result Code', 'Result Title', 'Alignment Role'],
      rows
    };
  });

  onChartClick(event: ECElementEvent): void {
    if (event.dataType === 'node') {
      const data = event.data as { category?: number; name?: string } | undefined;
      if (data?.category === 1 && data.name) {
        this.navigateToResult(data.name);
      }
    }
  }

  navigateToResult(code: string): void {
    if (code) {
      void this.router.navigate(['/result', code]);
    }
  }
}

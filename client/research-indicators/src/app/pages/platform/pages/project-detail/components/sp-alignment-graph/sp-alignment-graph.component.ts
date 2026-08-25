import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import { ContractSpAlignmentReport } from '@shared/interfaces/contract-sp-alignment.interface';
import { ContractLeverSpFlowLink, ContractLeverSpFlows } from '@shared/interfaces/contract-dashboard.interface';
import { VizChartComponent, VizChartTableModel, EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import type { ECElementEvent, ECharts } from 'echarts/core';

// Client-side render cap on role-links (DD-3): the server returns complete
// links so the "N folded" note (K-014) always states the real total.
const MAX_LINKS = 12;

const NO_LEVER_NODE = 'No lever';
const UNALIGNED_NODE = 'Unaligned';
const OTHER_LEVER_NODE = 'Other levers';
const OTHER_SP_NODE = 'Other SPs';

interface SankeyNodeDatum {
  name: string;
  nodeType: 'lever' | 'no-lever' | 'other-lever' | 'sp' | 'unaligned' | 'other-sp';
  leverId?: number;
  tooltip: string;
  itemStyle: { color: string };
}

interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
  leverFullName: string;
  spName: string;
  role: 'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN';
  // borderType/borderWidth/borderColor are the ribbon-outline properties the
  // sankey renderer actually preserves (ITEM_STYLE_KEY_MAP) — a per-link
  // `lineStyle.type` is not read by SankeyView and renders as a no-op solid
  // fill (Leader adjudication, T-03 rework attempt 2).
  lineStyle: { color: string; borderWidth: number; borderColor: string; borderType: 'solid' | 'dashed' | 'dotted' };
}

interface DetailedRow {
  sp: string;
  resultCode: string;
  resultTitle: string;
  role: string;
}

interface AggregateRow {
  lever: string;
  sp: string;
  role: string;
  count: number;
}

@Component({
  selector: 'app-sp-alignment-graph',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, VizChartComponent, RouterLink],
  templateUrl: './sp-alignment-graph.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpAlignmentGraphComponent {
  private readonly router = inject(Router);
  private readonly darkModeService = inject(DarkModeService);

  readonly tokens = chartTokens(this.darkModeService.darkMode());

  // Kept (DD-10): the per-result detail feeds the fallback-aware detailed
  // table (§7.2 challenge #3), no longer the graph itself.
  readonly report = input<ContractSpAlignmentReport | null>(null);
  readonly flows = input<ContractLeverSpFlows | null>(null);
  readonly loading = input<boolean>(false);
  readonly error = input<boolean>(false);

  readonly retry = output<void>();

  // Panel/chips/states single-sourced from flows (DD-8): sp_alignment feeds
  // only the detailed table below.
  readonly resultsWithAlignment = computed(() => this.flows()?.results_with_alignment ?? 0);
  readonly resultsWithoutAlignment = computed(() => this.flows()?.results_without_alignment ?? 0);

  readonly flowLinks = computed<ContractLeverSpFlowLink[]>(() => this.flows()?.links ?? []);

  // A null flows block (sub-report degrade, R-DCR-002 Empty/loading/error scenario)
  // is an error state even when the overall dashboard call succeeded.
  readonly isFlowsError = computed(() => this.error() || (!this.loading() && this.flows() === null));

  readonly isEmpty = computed(() => !this.loading() && !this.isFlowsError() && this.flowLinks().length === 0);
  readonly hasData = computed(() => !this.loading() && !this.isFlowsError() && this.flowLinks().length > 0);

  readonly totalLinksCount = computed(() => this.flowLinks().length);
  readonly isCapped = computed(() => this.totalLinksCount() > MAX_LINKS);
  readonly maxLinks = MAX_LINKS;

  private readonly sortedLinks = computed(() => [...this.flowLinks()].sort((a, b) => b.count - a.count));
  readonly visibleLinks = computed(() => this.sortedLinks().slice(0, MAX_LINKS));
  readonly foldedLinks = computed(() => this.sortedLinks().slice(MAX_LINKS));

  // Per-role width matrix (DD-4): matches the legend swatches 1:1 —
  // border-t-[3px] PRIMARY, border-t-2 CONTRIBUTING, border-t-[1.5px] UNKNOWN.
  private lineStyleForRole(role: ContractLeverSpFlowLink['role']): { color: string; borderType: 'solid' | 'dashed' | 'dotted'; borderWidth: number } {
    const tokens = this.tokens();
    if (role === 'PRIMARY') {
      return { color: tokens.rolePrimary || 'var(--ac-viz-role-primary)', borderType: 'solid', borderWidth: 3 };
    }
    if (role === 'CONTRIBUTING') {
      return { color: tokens.roleContributing || 'var(--ac-viz-role-contributing)', borderType: 'dashed', borderWidth: 2 };
    }
    // Legacy honesty: null role renders as UNKNOWN in both chart and legend/table.
    return { color: tokens.roleUnknown || 'var(--ac-viz-role-unknown)', borderType: 'dotted', borderWidth: 1.5 };
  }

  private linkLineStyle(style: { color: string; borderType: 'solid' | 'dashed' | 'dotted'; borderWidth: number }): SankeyLinkDatum['lineStyle'] {
    return { color: style.color, borderWidth: style.borderWidth, borderColor: style.color, borderType: style.borderType };
  }

  readonly chartOptions = computed<EChartsOption | null>(() => {
    if (!this.hasData()) {
      return null;
    }

    const leverNodes = new Map<string, SankeyNodeDatum>();
    const spNodes = new Map<string, SankeyNodeDatum>();

    const ensureLeverNode = (link: ContractLeverSpFlowLink): string => {
      const isNoLever = link.lever_id == null;
      const key = isNoLever ? '__no_lever__' : `lever:${link.lever_id}`;
      if (!leverNodes.has(key)) {
        leverNodes.set(key, {
          name: isNoLever ? NO_LEVER_NODE : link.lever_short_name,
          nodeType: isNoLever ? 'no-lever' : 'lever',
          leverId: isNoLever ? undefined : (link.lever_id ?? undefined),
          tooltip: isNoLever ? 'Results with no primary lever recorded' : link.lever_full_name,
          itemStyle: { color: isNoLever ? 'var(--ac-grey-400)' : 'var(--ac-viz-series-1)' }
        });
      }
      return leverNodes.get(key)!.name;
    };

    const ensureSpNode = (link: ContractLeverSpFlowLink): string => {
      const isUnaligned = link.sp_code == null;
      const key = isUnaligned ? '__unaligned__' : `sp:${link.sp_code}`;
      if (!spNodes.has(key)) {
        spNodes.set(key, {
          name: isUnaligned ? UNALIGNED_NODE : link.sp_code!,
          nodeType: isUnaligned ? 'unaligned' : 'sp',
          tooltip: isUnaligned ? 'Results with no active Science Program alignment' : link.sp_name || link.sp_code || '',
          itemStyle: { color: isUnaligned ? 'var(--ac-grey-400)' : 'var(--ac-viz-series-2)' }
        });
      }
      return spNodes.get(key)!.name;
    };

    const links: SankeyLinkDatum[] = this.visibleLinks().map(link => {
      const style = this.lineStyleForRole(link.role);
      return {
        source: ensureLeverNode(link),
        target: ensureSpNode(link),
        value: link.count,
        leverFullName: link.lever_id == null ? NO_LEVER_NODE : link.lever_full_name,
        spName: link.sp_code == null ? UNALIGNED_NODE : link.sp_name || link.sp_code || '',
        role: link.role ?? 'UNKNOWN',
        lineStyle: this.linkLineStyle(style)
      };
    });

    const folded = this.foldedLinks();
    if (folded.length > 0) {
      const foldedCount = folded.reduce((sum, link) => sum + (link.count ?? 0), 0);
      leverNodes.set('__other_lever__', {
        name: OTHER_LEVER_NODE,
        nodeType: 'other-lever',
        tooltip: `${folded.length} additional lever-SP link${folded.length === 1 ? '' : 's'} folded here`,
        itemStyle: { color: 'var(--ac-grey-400)' }
      });
      spNodes.set('__other_sp__', {
        name: OTHER_SP_NODE,
        nodeType: 'other-sp',
        tooltip: `${folded.length} additional lever-SP link${folded.length === 1 ? '' : 's'} folded here`,
        itemStyle: { color: 'var(--ac-grey-400)' }
      });
      links.push({
        source: OTHER_LEVER_NODE,
        target: OTHER_SP_NODE,
        value: foldedCount,
        leverFullName: OTHER_LEVER_NODE,
        spName: OTHER_SP_NODE,
        role: 'UNKNOWN',
        lineStyle: this.linkLineStyle({ color: this.tokens().roleUnknown || 'var(--ac-viz-role-unknown)', borderType: 'dotted', borderWidth: 1.5 })
      });
    }

    const nodes = [...leverNodes.values(), ...spNodes.values()];

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const item = params as {
            dataType?: string;
            data?: SankeyNodeDatum | SankeyLinkDatum;
          };
          if (item?.dataType === 'node') {
            const node = item.data as SankeyNodeDatum;
            return node?.tooltip ? `<strong>${node.name}</strong><br/>${node.tooltip}` : `<strong>${node?.name ?? ''}</strong>`;
          }
          if (item?.dataType === 'edge') {
            const link = item.data as SankeyLinkDatum;
            return `<strong>${link.leverFullName}</strong> &rarr; <strong>${link.spName}</strong><br/>Role: ${link.role}<br/>Results: ${link.value}`;
          }
          return '';
        }
      },
      series: [
        {
          type: 'sankey',
          left: '2%',
          right: '10%',
          top: '4%',
          bottom: '4%',
          nodeGap: 14,
          // Nodes are drill-through triggers (click), not layout handles — kill
          // the sankey drag interaction so the pointer/move cursor it implies
          // does not appear on non-lever nodes.
          draggable: false,
          emphasis: {
            focus: 'trajectory'
          },
          lineStyle: {
            opacity: 0.45,
            curveness: 0.5
          },
          label: {
            color: 'var(--ac-grey-800)',
            fontFamily: 'Barlow',
            fontSize: 11
          },
          data: nodes,
          links
        }
      ]
    };
  });

  // Accessible alternative for the CHART itself (R-DCR-005): every raw link,
  // uncapped — the visual cap is a rendering constraint, not an information one.
  readonly tableModel = computed<VizChartTableModel>(() => ({
    caption: 'Lever to Science-Program alignment flows by role',
    headers: ['Lever', 'Science Program', 'Alignment Role', 'Results'],
    rows: this.flowLinks().map(link => [
      link.lever_id == null ? NO_LEVER_NODE : link.lever_short_name,
      link.sp_code == null ? UNALIGNED_NODE : link.sp_name || link.sp_code || '',
      link.role ?? 'UNKNOWN',
      link.count
    ])
  }));

  // Detailed per-result table (challenge #3): sourced from `report` while it
  // has actual per-result rows; falls back to aggregate per-link rows both
  // when sp_alignment degrades to null AND when it resolves present-but-empty
  // (`sps: []`, e.g. a contract whose flows are all-unaligned) — presence
  // alone is not enough to select the detailed branch (DD-8 third degrade cell).
  readonly usesDetailedRows = computed(() => this.detailedRows().length > 0);

  readonly detailedRows = computed<DetailedRow[]>(() => {
    const rows: DetailedRow[] = [];
    for (const sp of this.report()?.sps ?? []) {
      for (const link of sp.links ?? []) {
        rows.push({
          sp: sp.sp_code,
          resultCode: link.result_official_code,
          resultTitle: link.result_title || '',
          role: link.role
        });
      }
    }
    return rows;
  });

  readonly aggregateRows = computed<AggregateRow[]>(() =>
    this.flowLinks().map(link => ({
      lever: link.lever_id == null ? NO_LEVER_NODE : link.lever_short_name,
      sp: link.sp_code == null ? UNALIGNED_NODE : link.sp_name || link.sp_code || '',
      role: link.role ?? 'UNKNOWN',
      count: link.count
    }))
  );

  onChartClick(event: ECElementEvent): void {
    if (event.dataType !== 'node') {
      return;
    }
    const data = event.data as SankeyNodeDatum | undefined;
    if (data?.nodeType === 'lever' && data.leverId != null) {
      this.navigateToLever(data.leverId);
    }
  }

  // draggable:false on the series kills the drag interaction, but zrender's
  // residual default pointer cursor is per-element, not per-series — every
  // sankey node rect AND link curve defaults to 'pointer' (Displayable.js).
  // 'mouseover' only fires when hoveredTarget changes (Handler.js:100-101),
  // so it corrects the entry frame and then never re-applies while the
  // pointer keeps moving over the SAME inert element — and it never touches
  // edges at all, since links are the `dataType === 'edge'` branch this used
  // to early-return on. 'mousemove' fires on every frame regardless of
  // target identity (Handler.js:95, after cursor assignment), so binding the
  // correction there re-applies it continuously for both nodes and edges.
  // Only click-navigable lever nodes get the pointer cursor; every other
  // node (SP, Unaligned, No lever, Other levers/SPs) and every edge get
  // 'default'. On-screen legibility is T-05's (KZ-017).
  onChartInit(instance: ECharts): void {
    const applyCursor = (params?: ECElementEvent): void => {
      const data = params?.dataType === 'node' ? (params.data as SankeyNodeDatum) : undefined;
      instance.getZr().setCursorStyle(data?.nodeType === 'lever' && data.leverId != null ? 'pointer' : 'default');
    };
    instance.on('mousemove', applyCursor);
    instance.on('mouseout', () => applyCursor());
  }

  navigateToLever(leverId: number): void {
    const contractId = this.flows()?.contract_id;
    if (contractId) {
      void this.router.navigate(['/project-detail', contractId], {
        queryParams: { leverTab: leverId }
      });
    }
  }
}

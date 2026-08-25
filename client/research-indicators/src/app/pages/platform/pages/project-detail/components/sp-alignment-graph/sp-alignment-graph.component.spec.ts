import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SpAlignmentGraphComponent } from './sp-alignment-graph.component';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { ContractSpAlignmentReport } from '@shared/interfaces/contract-sp-alignment.interface';
import { ContractLeverSpFlowLink, ContractLeverSpFlows } from '@shared/interfaces/contract-dashboard.interface';
import type { ECElementEvent } from 'echarts/core';

const mockZr = { setCursorStyle: jest.fn() };

const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn().mockReturnValue(false),
  clear: jest.fn(),
  on: jest.fn(),
  getZr: jest.fn(() => mockZr)
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance),
  registerMap: jest.fn(),
  getMap: jest.fn()
}));

function makeFlows(links: ContractLeverSpFlowLink[], overrides?: Partial<ContractLeverSpFlows>): ContractLeverSpFlows {
  return {
    contract_id: 'C-1',
    results_total: 10,
    results_with_alignment: 7,
    results_without_alignment: 3,
    links,
    ...overrides
  };
}

describe('SpAlignmentGraphComponent (R-DCR-002, R-DCR-005, DD-2..DD-10)', () => {
  let fixture: ComponentFixture<SpAlignmentGraphComponent>;
  let component: SpAlignmentGraphComponent;
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockChartInstance.isDisposed.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [SpAlignmentGraphComponent],
      providers: [DarkModeService, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SpAlignmentGraphComponent);
    component = fixture.componentInstance;
    routerMock = { navigate: jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as unknown as jest.Mock };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading state', () => {
    it('renders skeleton loaders and no chart, error, or empty message', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const skeletonRegion = fixture.nativeElement.querySelector('[role="status"]');
      expect(skeletonRegion).not.toBeNull();
      expect(skeletonRegion.getAttribute('aria-label')).toBe('Loading Science Program alignments');

      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('No Science-Program alignments recorded');
    });
  });

  describe('Degrade matrix (DD-8, KZ-015 transitions)', () => {
    it('treats overall load error() as an error state regardless of flows', () => {
      // Arrange the TRANSITION: loading -> resolved with error, not the end state directly.
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', true);
      fixture.detectChanges();

      const alertRegion = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertRegion).not.toBeNull();
      expect(alertRegion.textContent).toContain('We could not load Science Program alignments. Please try again.');

      const retrySpy = jest.fn();
      component.retry.subscribe(retrySpy);
      const retryButton = fixture.nativeElement.querySelector('button[aria-label="Retry loading Science Program alignments"]');
      retryButton.click();
      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
    });

    it('treats a null flows block as an error state even when error() is false (sub-report degrade, R-DCR-001 NFR-1)', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.componentRef.setInput('flows', null);
      fixture.detectChanges();

      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      expect(component.isFlowsError()).toBe(true);
      const alertRegion = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertRegion).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
    });

    it('treats a present-but-empty links[] as the empty state, not an error (R-DCR-002 AND-IT-MUST)', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.componentRef.setInput('flows', null);
      fixture.detectChanges();

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', makeFlows([], { results_with_alignment: 0, results_without_alignment: 0 }));
      fixture.detectChanges();

      expect(component.isEmpty()).toBe(true);
      expect(component.isFlowsError()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('No Science-Program alignments recorded for this project.');
      expect(fixture.nativeElement.querySelector('.pi-share-alt')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
    });

    it('renders the chart with aggregate table rows when flows exist but sp_alignment (report) has degraded to null (DD-8 third cell)', () => {
      const flows = makeFlows([
        { lever_id: 1, lever_short_name: 'L1', lever_full_name: 'Lever One', sp_code: 'SP-1', sp_name: 'SP One', role: 'PRIMARY', count: 4 }
      ]);
      const report: ContractSpAlignmentReport = {
        sps: [{ sp_code: 'SP-1', name: 'SP One', category: null, icon_key: null, links: [{ result_official_code: 'RES-001', result_title: 'Title', role: 'PRIMARY' }] }],
        results_with_alignment: 4,
        results_without_alignment: 0
      };

      // Arrange the TRANSITION: report present (detail mode) -> report degrades to null.
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.componentRef.setInput('report', report);
      fixture.detectChanges();
      expect(component.usesDetailedRows()).toBe(true);

      fixture.componentRef.setInput('report', null);
      fixture.detectChanges();

      expect(component.hasData()).toBe(true);
      expect(component.usesDetailedRows()).toBe(false);
      expect(fixture.nativeElement.querySelector('app-viz-chart')).not.toBeNull();
      const aggregateTable = fixture.nativeElement.querySelector('table');
      expect(aggregateTable.textContent).toContain('L1'); // lever short_name rendered, not the full name
      expect(aggregateTable.textContent).toContain('SP One');
      expect(aggregateTable.textContent).toContain('PRIMARY');
    });

    it('falls back to the aggregate table when report is present but sps is empty, even though flows carry unaligned links (DD-8 third cell, presence-alone bug)', () => {
      // A bilateral contract whose primary results carry levers but no active
      // SP alignment: flows are entirely sp_code:null links, and sp_alignment
      // resolves to a non-null report with sps: []. `report !== null` alone
      // would wrongly select the detailed branch and render a header-only table.
      const flows = makeFlows([
        { lever_id: 1, lever_short_name: 'L1', lever_full_name: 'Lever One', sp_code: null, sp_name: null, role: null, count: 3 }
      ]);
      const report: ContractSpAlignmentReport = {
        sps: [],
        results_with_alignment: 0,
        results_without_alignment: 3
      };

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.componentRef.setInput('report', report);
      fixture.detectChanges();

      expect(component.usesDetailedRows()).toBe(false);
      // `table:not(.sr-only)` excludes app-viz-chart's own accessible table
      // (always rendered from tableModel()) to isolate this component's own
      // detailed/aggregate table below the chart.
      const table = fixture.nativeElement.querySelector('table:not(.sr-only)');
      expect(table).not.toBeNull();
      // The aggregate table's header set (Lever/Science Program/Role/Results),
      // not the detailed table's (Science Program/Result Code/Result Title/Role).
      const headers = Array.from(table.querySelectorAll('thead th')).map((th: any) => th.textContent.trim());
      expect(headers).toEqual(['Lever', 'Science Program', 'Role', 'Results']);
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Unaligned');
    });
  });

  describe('Header chips single-sourced from flows (DD-8)', () => {
    it('renders aligned/unaligned counts from flows totals, ignoring report totals', () => {
      const flows = makeFlows(
        [{ lever_id: 1, lever_short_name: 'L1', lever_full_name: 'Lever One', sp_code: 'SP-1', sp_name: 'SP One', role: 'PRIMARY', count: 5 }],
        { results_with_alignment: 5, results_without_alignment: 2 }
      );
      // report intentionally disagrees to prove the chip does not read it.
      const report: ContractSpAlignmentReport = { sps: [], results_with_alignment: 999, results_without_alignment: 999 };

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.componentRef.setInput('report', report);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('5 aligned');
      expect(text).toContain('2 unaligned');
      expect(text).not.toContain('999');
    });
  });

  describe('Sankey option (KZ-001: emitted option + rendered DOM, not call sequences)', () => {
    const threeRoleFlows = makeFlows([
      { lever_id: 1, lever_short_name: 'L1', lever_full_name: 'Lever One', sp_code: 'SP-1', sp_name: 'SP One', role: 'PRIMARY', count: 4 },
      { lever_id: 1, lever_short_name: 'L1', lever_full_name: 'Lever One', sp_code: 'SP-2', sp_name: 'SP Two', role: 'CONTRIBUTING', count: 3 },
      { lever_id: 2, lever_short_name: 'L2', lever_full_name: 'Lever Two', sp_code: 'SP-2', sp_name: 'SP Two', role: null, count: 1 },
      { lever_id: 2, lever_short_name: 'L2', lever_full_name: 'Lever Two', sp_code: null, sp_name: null, role: null, count: 2 },
      { lever_id: null, lever_short_name: '', lever_full_name: '', sp_code: null, sp_name: null, role: null, count: 1 }
    ]);

    beforeEach(() => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', threeRoleFlows);
      fixture.detectChanges();
    });

    it('maps role to lineStyle.borderType/borderWidth/borderColor per link: PRIMARY solid, CONTRIBUTING dashed, null/UNKNOWN dotted (runtime-preserved ribbon-outline properties, not the no-op lineStyle.type)', () => {
      const options = component.chartOptions();
      expect(options).not.toBeNull();
      const series = (options?.series as any[])[0];
      expect(series.type).toBe('sankey');
      expect(series.emphasis.focus).toBe('trajectory');
      // Series-level: kills the drag interaction (and its implied move cursor).
      expect(series.draggable).toBe(false);

      const primaryLink = series.links.find((l: any) => l.role === 'PRIMARY');
      expect(primaryLink.lineStyle.borderType).toBe('solid');
      // Per-role width matrix (DD-4: encoding survives 1:1 vs the legend swatches
      // — border-t-[3px]/border-t-2/border-t-[1.5px] — not a flat 1.5 for all roles).
      expect(primaryLink.lineStyle.borderWidth).toBe(3);
      expect(primaryLink.lineStyle.borderColor).toBe(primaryLink.lineStyle.color);
      // Dead property: a per-link lineStyle.type is never read by SankeyView.
      expect(primaryLink.lineStyle.type).toBeUndefined();

      const contributingLink = series.links.find((l: any) => l.role === 'CONTRIBUTING');
      expect(contributingLink.lineStyle.borderType).toBe('dashed');
      expect(contributingLink.lineStyle.borderWidth).toBe(2);

      const unknownLinks = series.links.filter((l: any) => l.role === 'UNKNOWN');
      expect(unknownLinks.length).toBeGreaterThan(0);
      unknownLinks.forEach((l: any) => {
        expect(l.lineStyle.borderType).toBe('dotted');
        expect(l.lineStyle.borderWidth).toBe(1.5);
      });
    });

    it('collapses per-lever Unaligned links into ONE right-column Unaligned node (DD-2) and folds leverless results into a "No lever" source', () => {
      const options = component.chartOptions();
      const series = (options?.series as any[])[0];
      const unalignedNodes = series.data.filter((n: any) => n.name === 'Unaligned');
      expect(unalignedNodes.length).toBe(1);

      const noLeverNodes = series.data.filter((n: any) => n.name === 'No lever');
      expect(noLeverNodes.length).toBe(1);
      // Dead property: a per-datum node `cursor` is never read by the sankey
      // renderer either — the pointer/default cursor is set on the rendered
      // element via the echarts instance, asserted separately below.
      expect(noLeverNodes[0].cursor).toBeUndefined();
    });

    it('renders the role legend with all 3 roles, truthfully describing the rendered outline encoding (DD-4)', () => {
      const legend = fixture.nativeElement.querySelector('[role="region"][aria-label="Alignment role legend"]');
      expect(legend).not.toBeNull();
      expect(legend.textContent).toContain('Primary');
      expect(legend.textContent).toContain('Contributing');
      expect(legend.textContent).toContain('Role unknown');
    });

    it('exposes a tableModel accessible alternative naming lever, SP, role, and count for every link, including UNKNOWN (Legacy honesty)', () => {
      const table = component.tableModel();
      expect(table.headers).toEqual(['Lever', 'Science Program', 'Alignment Role', 'Results']);
      expect(table.rows.length).toBe(5);
      expect(table.rows.some(row => row[2] === 'UNKNOWN')).toBe(true);
      expect(table.rows.some(row => row[0] === 'No lever')).toBe(true);
      expect(table.rows.some(row => row[1] === 'Unaligned')).toBe(true);
    });
  });

  describe('Lever label chain + collision guard (bugfix/sp-alignment-sankey-empty-lever-names, R-SKY-001)', () => {
    it('gives levers with an empty short_name distinct, non-empty node names falling back to full_name, keeps a named lever unchanged, and links every source to exactly one node (D514 case)', () => {
      const flows = makeFlows([
        { lever_id: 11, lever_short_name: '', lever_full_name: 'Multifunctional Landscapes', sp_code: 'SP06', sp_name: 'SP Six', role: 'PRIMARY', count: 4 },
        { lever_id: 12, lever_short_name: '', lever_full_name: 'Climate Action', sp_code: 'SP06', sp_name: 'SP Six', role: 'CONTRIBUTING', count: 2 },
        { lever_id: 3, lever_short_name: 'Lever 3', lever_full_name: 'Lever 3: Climate Action', sp_code: 'SP06', sp_name: 'SP Six', role: 'PRIMARY', count: 1 }
      ]);
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.detectChanges();

      const options = component.chartOptions();
      const series = (options?.series as any[])[0];
      const leverNodeNames: string[] = series.data.filter((n: any) => n.nodeType === 'lever').map((n: any) => n.name);

      // (a) all lever node names non-empty and pairwise distinct.
      expect(leverNodeNames.every((name: string) => name.length > 0)).toBe(true);
      expect(new Set(leverNodeNames).size).toBe(leverNodeNames.length);

      // (b) every link source resolves to exactly one node name.
      const nodeNames = new Set(series.data.map((n: any) => n.name));
      series.links.forEach((link: any) => {
        expect(nodeNames.has(link.source)).toBe(true);
      });

      // (c) a lever that does have a short name keeps it unchanged.
      expect(leverNodeNames).toContain('Lever 3');

      // (e) node tooltip and link leverFullName show the real full name when one exists
      // (Leader amendment) — for lever 3 that means the FULL name, not the short label
      // repeated; for lever 11 (empty short_name) it falls back to leverLabel, same as name.
      const lever3Node = series.data.find((n: any) => n.name === 'Lever 3');
      expect(lever3Node.tooltip).toBe('Lever 3: Climate Action');
      const lever3Link = series.links.find((l: any) => l.source === 'Lever 3');
      expect(lever3Link.leverFullName).toBe('Lever 3: Climate Action');

      const lever11Node = series.data.find((n: any) => n.name === 'Multifunctional Landscapes');
      expect(lever11Node.tooltip).toBe('Multifunctional Landscapes');
      const lever11Link = series.links.find((l: any) => l.source === 'Multifunctional Landscapes');
      expect(lever11Link.leverFullName).toBe('Multifunctional Landscapes');

      // (d) the tableModel lever cells never contain "".
      const table = component.tableModel();
      expect(table.rows.some(row => row[0] === '')).toBe(false);
      expect(table.rows.map(row => row[0])).toEqual(expect.arrayContaining(['Multifunctional Landscapes', 'Climate Action', 'Lever 3']));

      // Leader-adjudicated same-cause-root scope: aggregateRows feeds the fallback detail
      // table (DD-8 third cell) and shares the identical bug (raw lever_short_name).
      const aggregateLevers = component.aggregateRows().map(row => row.lever);
      expect(aggregateLevers.some(lever => lever === '')).toBe(false);
      expect(aggregateLevers).toEqual(expect.arrayContaining(['Multifunctional Landscapes', 'Climate Action', 'Lever 3']));
    });

    it('falls back the same way when lever_short_name is null (tops-shaped payload)', () => {
      const flows = makeFlows([
        // Real API payloads (`tops.primary_levers`) send null, not '' — the interface types it as
        // `string` (non-nullable), so this fixture goes through `unknown` to represent that
        // runtime/type mismatch honestly rather than widening the interface (out of this task's scope).
        {
          lever_id: 13,
          lever_short_name: null,
          lever_full_name: 'Biodiversity for Food and Agriculture',
          sp_code: 'SP06',
          sp_name: 'SP Six',
          role: 'PRIMARY',
          count: 3
        } as unknown as ContractLeverSpFlowLink
      ]);
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.detectChanges();

      const options = component.chartOptions();
      const series = (options?.series as any[])[0];
      const leverNode = series.data.find((n: any) => n.nodeType === 'lever');
      expect(leverNode.name).toBe('Biodiversity for Food and Agriculture');

      const table = component.tableModel();
      expect(table.rows[0][0]).toBe('Biodiversity for Food and Agriculture');
    });

    it('appends " (<id>)" to disambiguate two distinct lever ids that share the same empty-short-name fallback label (collision guard, DD-3)', () => {
      const flows = makeFlows([
        { lever_id: 21, lever_short_name: '', lever_full_name: 'Duplicate Full Name', sp_code: 'SP06', sp_name: 'SP Six', role: 'PRIMARY', count: 2 },
        { lever_id: 22, lever_short_name: '', lever_full_name: 'Duplicate Full Name', sp_code: 'SP06', sp_name: 'SP Six', role: 'CONTRIBUTING', count: 1 }
      ]);
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.detectChanges();

      const options = component.chartOptions();
      const series = (options?.series as any[])[0];
      const leverNodeNames: string[] = series.data.filter((n: any) => n.nodeType === 'lever').map((n: any) => n.name);

      expect(new Set(leverNodeNames).size).toBe(2);
      expect(leverNodeNames).toEqual(expect.arrayContaining(['Duplicate Full Name (21)', 'Duplicate Full Name (22)']));

      // Every link source must still resolve to exactly one node (the suffix must be applied
      // consistently to the node's own name, not just asserted in isolation).
      const nodeNames = new Set(series.data.map((n: any) => n.name));
      series.links.forEach((link: any) => {
        expect(nodeNames.has(link.source)).toBe(true);
      });
    });
  });

  describe('Top-12 cap with visible fold note (DD-3, K-014)', () => {
    it('caps 13 links to 12 rendered + one folded "Other" link, and states the real N in the on-panel note', () => {
      const links: ContractLeverSpFlowLink[] = Array.from({ length: 13 }, (_, i) => ({
        lever_id: i + 1,
        lever_short_name: `L${i + 1}`,
        lever_full_name: `Lever ${i + 1}`,
        sp_code: `SP-${i + 1}`,
        sp_name: `SP ${i + 1}`,
        role: 'PRIMARY' as const,
        count: 13 - i // descending: SP-1..SP-12 survive, SP-13 (count 1) is folded
      }));

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', makeFlows(links));
      fixture.detectChanges();

      expect(component.totalLinksCount()).toBe(13);
      expect(component.isCapped()).toBe(true);

      const notice = fixture.nativeElement.querySelector('.pi-info-circle')?.parentElement;
      expect(notice).not.toBeNull();
      expect(notice?.textContent).toContain('Showing top 12 of 13 links');

      const options = component.chartOptions();
      const series = (options?.series as any[])[0];

      // The excluded (lowest-count) link's real endpoints must NOT appear as
      // rendered nodes/links — only folded into the generic "Other" nodes.
      expect(series.data.some((n: any) => n.name === 'SP-13')).toBe(false);
      expect(series.data.some((n: any) => n.name === 'L13')).toBe(false);
      expect(series.data.some((n: any) => n.name === 'Other levers')).toBe(true);
      expect(series.data.some((n: any) => n.name === 'Other SPs')).toBe(true);

      const foldedLink = series.links.find((l: any) => l.source === 'Other levers' && l.target === 'Other SPs');
      expect(foldedLink).toBeDefined();
      expect(foldedLink.value).toBe(1); // the single folded link's count

      // Every surviving real link is one of the top-12 by count.
      const realLinks = series.links.filter((l: any) => l.source !== 'Other levers');
      expect(realLinks.length).toBe(12);
    });

    it('does NOT cap or fold when links total is exactly 12', () => {
      const links: ContractLeverSpFlowLink[] = Array.from({ length: 12 }, (_, i) => ({
        lever_id: i + 1,
        lever_short_name: `L${i + 1}`,
        lever_full_name: `Lever ${i + 1}`,
        sp_code: `SP-${i + 1}`,
        sp_name: `SP ${i + 1}`,
        role: 'PRIMARY' as const,
        count: 12 - i
      }));

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', makeFlows(links));
      fixture.detectChanges();

      expect(component.isCapped()).toBe(false);
      expect(fixture.nativeElement.querySelector('.pi-info-circle')).toBeNull();

      const options = component.chartOptions();
      const series = (options?.series as any[])[0];
      expect(series.data.some((n: any) => n.name === 'Other levers')).toBe(false);
      expect(series.links.length).toBe(12);
    });
  });

  describe('Drill-through (R-DCR-002 Scenario: Drill-through, DD-5, K-012 named failing inputs)', () => {
    beforeEach(() => {
      const flows = makeFlows([
        { lever_id: 42, lever_short_name: 'L42', lever_full_name: 'Lever Forty-Two', sp_code: 'SP-1', sp_name: 'SP One', role: 'PRIMARY', count: 3 }
      ]);
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.detectChanges();
    });

    it('navigates to the Results tab with the lever-codes filter when a lever node is clicked (DD-5)', () => {
      const event: ECElementEvent = {
        dataType: 'node',
        data: { nodeType: 'lever', leverId: 42, name: 'L42' }
      } as unknown as ECElementEvent;

      component.onChartClick(event);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/project-detail', 'C-1'], { queryParams: { leverTab: 42 } });
    });

    it('does NOT navigate when an SP node is clicked (no SP filter surface exists)', () => {
      const event: ECElementEvent = {
        dataType: 'node',
        data: { nodeType: 'sp', name: 'SP-1' }
      } as unknown as ECElementEvent;

      component.onChartClick(event);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('does NOT navigate when the Unaligned node is clicked (named failing input: a navigation call on Unaligned click)', () => {
      const event: ECElementEvent = {
        dataType: 'node',
        data: { nodeType: 'unaligned', name: 'Unaligned' }
      } as unknown as ECElementEvent;

      component.onChartClick(event);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('does NOT navigate when a link (edge) is clicked', () => {
      const event: ECElementEvent = {
        dataType: 'edge',
        data: { source: 'L42', target: 'SP-1' }
      } as unknown as ECElementEvent;

      component.onChartClick(event);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('does NOT navigate when the "No lever" or "Other" pseudo-nodes are clicked', () => {
      component.onChartClick({ dataType: 'node', data: { nodeType: 'no-lever', name: 'No lever' } } as unknown as ECElementEvent);
      component.onChartClick({ dataType: 'node', data: { nodeType: 'other-lever', name: 'Other levers' } } as unknown as ECElementEvent);
      component.onChartClick({ dataType: 'node', data: { nodeType: 'other-sp', name: 'Other SPs' } } as unknown as ECElementEvent);

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Rendered-element cursor via chart instance (draggable:false residual pointer fix, handler-level only — on-screen legibility is T-05/KZ-017)', () => {
    it('wires mousemove/mouseout handlers on the emitted chart instance via chartInit', () => {
      const flows = makeFlows([
        { lever_id: 42, lever_short_name: 'L42', lever_full_name: 'Lever Forty-Two', sp_code: 'SP-1', sp_name: 'SP One', role: 'PRIMARY', count: 3 }
      ]);
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.detectChanges();

      expect(mockChartInstance.on).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockChartInstance.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });

    it('sets the pointer cursor only on mousemove over a clickable lever node, default for every other node type, and corrects link (edge) hover too', () => {
      component.onChartInit(mockChartInstance as any);
      const mousemoveHandler = mockChartInstance.on.mock.calls.find(call => call[0] === 'mousemove')![1];

      mousemoveHandler({ dataType: 'node', data: { nodeType: 'lever', leverId: 42 } });
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('pointer');

      mousemoveHandler({ dataType: 'node', data: { nodeType: 'sp' } });
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');

      mousemoveHandler({ dataType: 'node', data: { nodeType: 'unaligned' } });
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');

      mousemoveHandler({ dataType: 'node', data: { nodeType: 'no-lever' } });
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');

      mousemoveHandler({ dataType: 'node', data: { nodeType: 'other-lever' } });
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');

      // A link (edge) hover must now be actively corrected to 'default' too
      // (zrender defaults every sankey rect/curve to 'pointer' — Handler.js
      // only re-evaluates cursor on mousemove, so edges need the same fix).
      mockZr.setCursorStyle.mockClear();
      mousemoveHandler({ dataType: 'edge', data: {} });
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');
    });

    it('re-applies default on a SECOND consecutive mousemove over the same inert node (mouseover-only would fire once and stop correcting)', () => {
      component.onChartInit(mockChartInstance as any);
      const mousemoveHandler = mockChartInstance.on.mock.calls.find(call => call[0] === 'mousemove')![1];

      const inertNodeEvent = { dataType: 'node', data: { nodeType: 'sp' } };
      mousemoveHandler(inertNodeEvent);
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');

      mockZr.setCursorStyle.mockClear();
      mousemoveHandler(inertNodeEvent);
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');
    });

    it('resets the cursor to default on mouseout', () => {
      component.onChartInit(mockChartInstance as any);
      const mouseoutHandler = mockChartInstance.on.mock.calls.find(call => call[0] === 'mouseout')![1];

      mouseoutHandler();
      expect(mockZr.setCursorStyle).toHaveBeenLastCalledWith('default');
    });
  });

  describe('Detailed per-result table (challenge #3, keyboard drill-through)', () => {
    it('renders per-result rows sourced from report with a real anchor to /result/:code on the Result Code column', () => {
      const flows = makeFlows([
        { lever_id: 1, lever_short_name: 'L1', lever_full_name: 'Lever One', sp_code: 'SP-1', sp_name: 'SP One', role: 'PRIMARY', count: 1 }
      ]);
      const report: ContractSpAlignmentReport = {
        sps: [
          {
            sp_code: 'SP-1',
            name: 'SP One',
            category: null,
            icon_key: null,
            links: [{ result_official_code: 'RES-777', result_title: 'A Result', role: 'PRIMARY' }]
          }
        ],
        results_with_alignment: 1,
        results_without_alignment: 0
      };

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('flows', flows);
      fixture.componentRef.setInput('report', report);
      fixture.detectChanges();

      expect(component.usesDetailedRows()).toBe(true);
      const anchor = fixture.nativeElement.querySelector('a[href="/result/RES-777"]') ?? fixture.nativeElement.querySelector('a');
      expect(anchor).not.toBeNull();
      expect(anchor.textContent.trim()).toBe('RES-777');
    });
  });
});

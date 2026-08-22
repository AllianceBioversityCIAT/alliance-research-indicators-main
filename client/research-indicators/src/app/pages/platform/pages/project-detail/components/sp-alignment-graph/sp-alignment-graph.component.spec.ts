import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SpAlignmentGraphComponent } from './sp-alignment-graph.component';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { ContractSpAlignmentReport } from '@shared/interfaces/contract-sp-alignment.interface';
import type { ECElementEvent } from 'echarts/core';

const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn().mockReturnValue(false),
  clear: jest.fn(),
  on: jest.fn()
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance)
}));

describe('SpAlignmentGraphComponent (R-DA-003, R-DA-009, NFR-DA-005)', () => {
  let fixture: ComponentFixture<SpAlignmentGraphComponent>;
  let component: SpAlignmentGraphComponent;
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockChartInstance.isDisposed.mockReturnValue(false);
    routerMock = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [SpAlignmentGraphComponent],
      providers: [
        DarkModeService,
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SpAlignmentGraphComponent);
    component = fixture.componentInstance;
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

  describe('Error state', () => {
    it('renders error alert with retry button and emits retry on click', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', true);
      fixture.detectChanges();

      const alertRegion = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertRegion).not.toBeNull();
      expect(alertRegion.textContent).toContain('We could not load Science Program alignments. Please try again.');

      const retrySpy = jest.fn();
      component.retry.subscribe(retrySpy);

      const retryButton = fixture.nativeElement.querySelector('button[aria-label="Retry loading Science Program alignments"]');
      expect(retryButton).not.toBeNull();
      retryButton.click();

      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
    });
  });

  describe('Empty/absent state (AC.4)', () => {
    it('renders empty message with pi-share-alt icon when sps is empty array', () => {
      const emptyReport: ContractSpAlignmentReport = {
        sps: [],
        results_with_alignment: 0,
        results_without_alignment: 10
      };

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('report', emptyReport);
      fixture.detectChanges();

      expect(component.isEmpty()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('No Science-Program alignments recorded for this project.');
      expect(fixture.nativeElement.querySelector('.pi-share-alt')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('Data state with all 3 roles (AC.1, AC.2, AC.3, K-012)', () => {
    const reportFixture: ContractSpAlignmentReport = {
      results_with_alignment: 3,
      results_without_alignment: 1,
      sps: [
        {
          sp_code: 'SP-1',
          name: 'Science Program 1',
          category: 'Category A',
          icon_key: 'icon-sp1',
          links: [
            {
              result_official_code: 'RES-001',
              result_title: 'Result Primary',
              role: 'PRIMARY'
            },
            {
              result_official_code: 'RES-002',
              result_title: 'Result Contributing',
              role: 'CONTRIBUTING'
            }
          ]
        },
        {
          sp_code: 'SP-2',
          name: 'Science Program 2',
          category: 'Category B',
          icon_key: 'icon-sp2',
          links: [
            {
              result_official_code: 'RES-003',
              result_title: 'Result Unknown Role',
              role: 'UNKNOWN'
            }
          ]
        }
      ]
    };

    beforeEach(() => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('report', reportFixture);
      fixture.detectChanges();
    });

    it('renders aligned and unaligned counter badges in the header', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('3 aligned');
      expect(text).toContain('1 unaligned');
    });

    it('configures force graph series and 3 distinct edge line styles (solid/dashed/dotted)', () => {
      const options = component.chartOptions();
      expect(options).not.toBeNull();

      const series = (options?.series as any[])[0];
      expect(series.type).toBe('graph');
      expect(series.layout).toBe('force');
      expect(series.force.repulsion).toBe(180);
      expect(series.force.edgeLength).toEqual([50, 110]);
      expect(series.roam).toBe('scale');
      expect(series.emphasis.focus).toBe('adjacency');

      // SP nodes and Result nodes
      expect(series.categories).toEqual([{ name: 'Science Programs' }, { name: 'Results' }]);
      expect(series.data.length).toBe(5); // 2 SPs + 3 Results

      const sp1Node = series.data.find((d: any) => d.name === 'SP-1');
      expect(sp1Node.category).toBe(0);
      expect(sp1Node.label.show).toBe(true);
      expect(sp1Node.label.position).toBe('top');
      expect(sp1Node.tooltip).toBe('Science Program 1');

      const res1Node = series.data.find((d: any) => d.name === 'RES-001');
      expect(res1Node.category).toBe(1);
      expect(res1Node.label.show).toBe(true);
      expect(res1Node.label.position).toBe('bottom');
      expect(res1Node.tooltip).toBe('Result Primary');

      // Edges styling per role
      const primaryEdge = series.links.find((l: any) => l.target === 'RES-001');
      expect(primaryEdge.lineStyle.type).toBe('solid');
      expect(primaryEdge.lineStyle.width).toBe(3);

      const contributingEdge = series.links.find((l: any) => l.target === 'RES-002');
      expect(contributingEdge.lineStyle.type).toBe('dashed');
      expect(contributingEdge.lineStyle.width).toBe(2);

      const unknownEdge = series.links.find((l: any) => l.target === 'RES-003');
      expect(unknownEdge.lineStyle.type).toBe('dotted');
      expect(unknownEdge.lineStyle.width).toBe(1.5);
    });

    it('renders role legend containing all 3 roles: Primary, Contributing, Role unknown (AC.1)', () => {
      const legend = fixture.nativeElement.querySelector('[role="region"][aria-label="Alignment role legend"]');
      expect(legend).not.toBeNull();
      expect(legend.textContent).toContain('Primary');
      expect(legend.textContent).toContain('Contributing');
      expect(legend.textContent).toContain('Role unknown');
    });

    it('generates tableModel containing all rows including UNKNOWN (AC.2, Scenario)', () => {
      const table = component.tableModel();
      expect(table.caption).toBe('Science-Program alignments by result and role');
      expect(table.headers).toEqual(['Science Program', 'Result Code', 'Result Title', 'Alignment Role']);
      expect(table.rows).toEqual([
        ['SP-1', 'RES-001', 'Result Primary', 'PRIMARY'],
        ['SP-1', 'RES-002', 'Result Contributing', 'CONTRIBUTING'],
        ['SP-2', 'RES-003', 'Result Unknown Role', 'UNKNOWN']
      ]);
    });

    it('navigates to /result/:code when a result node is activated/clicked (AC.3)', () => {
      const event: ECElementEvent = {
        dataType: 'node',
        name: 'RES-001',
        data: { category: 1, name: 'RES-001' }
      } as unknown as ECElementEvent;

      component.onChartClick(event);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/result', 'RES-001']);
    });

    it('does NOT navigate when an SP node (category 0) is clicked', () => {
      const event: ECElementEvent = {
        dataType: 'node',
        name: 'SP-1',
        data: { category: 0, name: 'SP-1' }
      } as unknown as ECElementEvent;

      component.onChartClick(event);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('navigateToResult helper navigates to /result/:code', () => {
      component.navigateToResult('RES-999');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/result', 'RES-999']);
    });
  });

  describe('Node capping logic (NFR-DA-005)', () => {
    it('caps result nodes at 150 when exceeding and renders disclosure notice', () => {
      const largeLinks = Array.from({ length: 160 }, (_, i) => ({
        result_official_code: `RES-${String(i).padStart(3, '0')}`,
        result_title: `Title ${i}`,
        role: 'PRIMARY' as const
      }));

      const cappedReport: ContractSpAlignmentReport = {
        results_with_alignment: 160,
        results_without_alignment: 0,
        sps: [
          {
            sp_code: 'SP-LARGE',
            name: 'Science Program Large',
            category: 'Category',
            icon_key: null,
            links: largeLinks
          }
        ]
      };

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('report', cappedReport);
      fixture.detectChanges();

      expect(component.totalResultNodesCount()).toBe(160);
      expect(component.isCapped()).toBe(true);

      const notice = fixture.nativeElement.querySelector('.pi-info-circle')?.parentElement;
      expect(notice).not.toBeNull();
      expect(notice?.textContent).toContain('Showing 150 of 160 results');

      const options = component.chartOptions();
      const series = (options?.series as any[])[0];
      const resultNodes = series.data.filter((d: any) => d.category === 1);
      expect(resultNodes.length).toBe(150);

      // Verify recency sorting: highest code is included, lowest is truncated
      const resultCodes = resultNodes.map((n: any) => n.name);
      expect(resultCodes).toContain('RES-159');
      expect(resultCodes).not.toContain('RES-000');
    });
  });
});

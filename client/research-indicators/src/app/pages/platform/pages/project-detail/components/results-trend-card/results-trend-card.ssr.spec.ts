import { TestBed } from '@angular/core/testing';
import * as echarts from 'echarts';
import { ResultsTrendCardComponent } from './results-trend-card.component';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { ContractResultsSummaryYearBucket } from '@interfaces/contract-results-summary.interface';

/**
 * SSR regression harness for R-DN-001 (D-DN-2, D-DN-5).
 *
 * Renders the REAL builder output (`component.chartOptions()`) through the full
 * `echarts` package in SSR/SVG mode — the same mechanism that reproduced the
 * production crash during spec (KZ-001: assert on generated SVG output, not on
 * the presence of options). No TestBed DOM render is used: `chartOptions()` is a
 * computed signal, so setting the `buckets` input via `componentRef.setInput`
 * and reading the signal directly is enough — `fixture.detectChanges()` is
 * intentionally never called, which also avoids instantiating the child
 * `app-viz-chart` (a separate, tree-shaken `echarts/core` instance) inside jsdom.
 */
describe('ResultsTrendCardComponent SSR render (R-DN-001, D-DN-1, D-DN-2, D-DN-5)', () => {
  // The exact reproduction shape named in requirements.md §1 / R-DN-001 scenario
  // "The exact failing input (regression anchor)".
  const regressionBuckets: ContractResultsSummaryYearBucket[] = [
    { year: 2024, count: 0 },
    { year: 2025, count: 12 },
    { year: 2026, count: 9 }
  ];

  const RESOLVED_SERIES_COLOR = '#0066cc';

  let component: ResultsTrendCardComponent;

  beforeEach(async () => {
    // Resolve a REAL token value so the builder exercises its resolved-color
    // path, not the empty-token fallback (D-DN-5 probe case C).
    document.documentElement.style.setProperty('--ac-viz-series-1', RESOLVED_SERIES_COLOR);

    await TestBed.configureTestingModule({
      imports: [ResultsTrendCardComponent],
      providers: [DarkModeService]
    }).compileComponents();

    const fixture = TestBed.createComponent(ResultsTrendCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('buckets', regressionBuckets);
    // No fixture.detectChanges() — see file header.
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--ac-viz-series-1');
    document.documentElement.style.removeProperty('--ac-grey-300');
    document.documentElement.style.removeProperty('--ac-grey-700');
    document.documentElement.style.removeProperty('--ac-grey-100');
    document.documentElement.style.removeProperty('--ac-white-1');
  });

  it('renders the crash-reproduction input to SVG without throwing, with solid+dashed series strokes, symbols, and zero unresolved var(--…) in the SVG', () => {
    const options = component.chartOptions();
    expect(options).not.toBeNull();

    let chart: echarts.ECharts | undefined;
    let svg = '';

    try {
      expect(() => {
        chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 800, height: 300 } as echarts.EChartsInitOpts);
        chart.setOption(options as echarts.EChartsCoreOption);
        svg = chart.renderToSVGString();
      }).not.toThrow();
    } finally {
      // Always dispose an SSR chart instance (undisposed instances have been
      // observed keeping a node process alive).
      chart?.dispose();
    }

    // Must not reintroduce the confirmed crash input.
    expect((options as { visualMap?: unknown }).visualMap).toBeUndefined();

    // (b) >=1 series-colored stroke path + symbols
    const strokeMatches = svg.match(/stroke="#0066cc"/gi) ?? [];
    expect(strokeMatches.length).toBeGreaterThanOrEqual(2);
    expect(svg).toMatch(/ecmeta_ssr_type="chart"/);

    // (c) solid AND dashed segments both present
    const solidLineStroke = /stroke="#0066cc"\s+stroke-width="2"\s+stroke-linejoin="bevel"/i;
    const dashedLineStroke = /stroke="#0066cc"\s+stroke-width="2"\s+stroke-dasharray="[^"]+"/i;
    expect(svg).toMatch(solidLineStroke);
    expect(svg).toMatch(dashedLineStroke);

    // (d) zero unresolved var(--…) substrings anywhere in the emitted SVG
    expect(svg).not.toContain('var(--');
  });

  it('keeps tooltip/click/tableModel contract identical after the fix', () => {
    // tableModel + aria label must still summarize every bucket (R-DN-004)
    const tableModel = component.tableModel();
    expect(tableModel.rows).toEqual([
      ['2024', 0],
      ['2025', 12],
      ['2026', 9]
    ]);
    expect(component.chartAriaLabel()).toContain('2024: 0, 2025: 12, 2026: 9');

    const clickSpy = jest.fn();
    component.chartClick.subscribe(clickSpy);
    const seriesEvent = { componentType: 'series', name: '2026', dataIndex: 2, value: 9 } as never;
    component.onChartClick(seriesEvent);
    expect(clickSpy).toHaveBeenCalledWith(seriesEvent);
  });
});

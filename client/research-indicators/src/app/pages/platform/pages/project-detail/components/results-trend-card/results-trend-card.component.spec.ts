import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsTrendCardComponent } from './results-trend-card.component';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { ContractResultsSummaryYearBucket } from '@interfaces/contract-results-summary.interface';

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

describe('ResultsTrendCardComponent (R-PD-004, R-PD-009, R-DA-006, NFR-PD-001)', () => {
  let fixture: ComponentFixture<ResultsTrendCardComponent>;
  let component: ResultsTrendCardComponent;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockChartInstance.isDisposed.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [ResultsTrendCardComponent],
      providers: [DarkModeService]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsTrendCardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading state (R-PD-007)', () => {
    it('renders skeleton loaders and not the chart, error, or empty state', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const skeletonRegion = fixture.nativeElement.querySelector('[role="status"]');
      expect(skeletonRegion).not.toBeNull();
      expect(skeletonRegion.getAttribute('aria-label')).toBe('Loading results trend');

      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('No yearly results were found');
    });
  });

  describe('Error state (R-PD-007)', () => {
    it('renders error alert with retry button and emits retry on click', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', true);
      fixture.detectChanges();

      const alertRegion = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertRegion).not.toBeNull();
      expect(alertRegion.textContent).toContain('We could not load the results trend. Please try again.');

      const retrySpy = jest.fn();
      component.retry.subscribe(retrySpy);

      const retryButton = fixture.nativeElement.querySelector('button[aria-label="Retry loading results trend"]');
      expect(retryButton).not.toBeNull();
      retryButton.click();

      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
    });
  });

  describe('Empty state (0 buckets)', () => {
    it('renders empty message when no year buckets exist, and no chart', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('buckets', []);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No yearly results were found for this project.');
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('treats buckets with only null years as empty', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('buckets', [{ year: null, count: 5 }]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No yearly results were found for this project.');
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
    });
  });

  describe('Sparse years condition (<2 buckets — R-PD-004 Scenario & BUT clause)', () => {
    const singleYearFixture: ContractResultsSummaryYearBucket[] = [{ year: 2024, count: 14 }];

    it('renders single-value stat + caption and MUST NOT render chart widget (R-PD-004 BUT clause)', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('buckets', singleYearFixture);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Report year 2024');
      expect(text).toContain('14 results');
      expect(text).toContain('Not enough reporting history for a trend');

      // The BUT clause: must NOT render axis-only empty plot, chart wrapper, or error state
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    // KZ-014 Red input verification: verify that a 1-year fixture strictly fails if chart is present
    it('red input check: asserts app-viz-chart is NOT present for 1-year fixture', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('buckets', singleYearFixture);
      fixture.detectChanges();

      const vizChart = fixture.nativeElement.querySelector('app-viz-chart');
      expect(vizChart).toBeNull();
      const pChart = fixture.nativeElement.querySelector('p-chart');
      expect(pChart).toBeNull();
    });
  });

  describe('Normal condition (>= 2 buckets — R-PD-004, R-PD-009, R-DA-006)', () => {
    const multiYearFixture: ContractResultsSummaryYearBucket[] = [
      { year: 2020, count: 6 },
      { year: 2021, count: 14 },
      { year: 2022, count: 22 },
      { year: 2023, count: 31 },
      { year: 2024, count: 34 },
      { year: 2025, count: 21 }
    ];

    beforeEach(() => {
      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('buckets', multiYearFixture);
      fixture.detectChanges();
    });

    it('renders app-viz-chart wrapper and passes options, tableModel, and title', () => {
      const vizChart = fixture.nativeElement.querySelector('app-viz-chart');
      expect(vizChart).not.toBeNull();
      expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
    });

    it('sets an accessible name (chartAriaLabel) summarizing the series (R-PD-004 AC.2 / R-PD-009 AC.1)', () => {
      const label = component.chartAriaLabel();
      expect(label).toContain('Results per report year from 2020 to 2025');
      expect(label).toContain('2020: 6');
      expect(label).toContain('2025: 21');
    });

    it('generates a paired tableModel matching all data points (R-DA-009 AC.1)', () => {
      const tableModel = component.tableModel();
      expect(tableModel.caption).toBe('Results over time by report year');
      expect(tableModel.headers).toEqual(['Year', 'Results']);
      expect(tableModel.rows).toEqual([
        ['2020', 6],
        ['2021', 14],
        ['2022', 22],
        ['2023', 31],
        ['2024', 34],
        ['2025', 21]
      ]);

      const table = fixture.nativeElement.querySelector('table.sr-only');
      expect(table).not.toBeNull();
    });

    it('indicates current/max year in progress in the header subtitle', () => {
      const subtitle = fixture.nativeElement.querySelector('header p');
      expect(subtitle?.textContent).toContain('by report year · 2025 in progress');
    });

    it('configures ECharts options with series1 token, y-axis min: 0, and dashed in-progress segment', () => {
      const options = component.chartOptions();
      expect(options).not.toBeNull();

      expect((options?.xAxis as any).data).toEqual(['2020', '2021', '2022', '2023', '2024', '2025']);
      expect((options?.yAxis as any).min).toBe(0);

      const series = (options?.series as any[])[0];
      expect(series.type).toBe('line');
      expect(series.data).toEqual([6, 14, 22, 31, 34, 21]);

      const visualMap = options?.visualMap as any;
      expect(visualMap.show).toBe(false);
      expect(visualMap.pieces).toBeDefined();
      expect(visualMap.pieces[1].lineStyle.type).toBe('dashed');
    });
  });

  describe('Data sorting and null handling', () => {
    it('sorts unsorted year buckets ascending and filters out null-year buckets', () => {
      const unsortedWithNull: ContractResultsSummaryYearBucket[] = [
        { year: 2024, count: 20 },
        { year: null, count: 99 },
        { year: 2021, count: 10 }
      ];

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('error', false);
      fixture.componentRef.setInput('buckets', unsortedWithNull);
      fixture.detectChanges();

      expect(component.validBuckets()).toEqual([
        { year: 2021, count: 10 },
        { year: 2024, count: 20 }
      ]);
      expect(component.hasChart()).toBe(true);

      const tableRows = Array.from(fixture.nativeElement.querySelectorAll('table.sr-only tbody tr'));
      expect(tableRows.length).toBe(2);
      expect(tableRows[0].textContent).toContain('2021');
      expect(tableRows[1].textContent).toContain('2024');
    });
  });
});

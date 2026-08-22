import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VizChartComponent, VizChartTableModel, EChartsOption } from './viz-chart.component';
import * as echarts from 'echarts/core';

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
  init: jest.fn(() => mockChartInstance),
  registerMap: jest.fn(),
  getMap: jest.fn()
}));

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observedElements: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe = jest.fn((element: Element) => {
    this.observedElements.push(element);
  });

  unobserve = jest.fn((element: Element) => {
    this.observedElements = this.observedElements.filter(el => el !== element);
  });

  disconnect = jest.fn(() => {
    this.observedElements = [];
  });

  triggerResize() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe('VizChartComponent (R-DA-006, R-DA-007, R-DA-009, D-DA-1)', () => {
  let fixture: ComponentFixture<VizChartComponent>;
  let component: VizChartComponent;
  let matchMediaMock: jest.Mock;

  const mockTableModel: VizChartTableModel = {
    caption: 'Results by report year',
    headers: ['Year', 'Count'],
    rows: [
      ['2023', 10],
      ['2024', 25]
    ],
    summary: '2 years of data'
  };

  const sampleOptions: EChartsOption = {
    title: { text: 'Test Chart' },
    xAxis: { type: 'category', data: ['2023', '2024'] },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        data: [10, 25]
      }
    ]
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockChartInstance.isDisposed.mockReturnValue(false);
    MockResizeObserver.instances = [];
    (window as any).ResizeObserver = MockResizeObserver;

    matchMediaMock = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock
    });

    await TestBed.configureTestingModule({
      imports: [VizChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VizChartComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Chart Initialization & SVG Renderer', () => {
    it('initializes echarts instance with SVG renderer and emits chartInit', () => {
      const chartInitSpy = jest.fn();
      component.chartInit.subscribe(chartInitSpy);

      fixture.detectChanges();

      expect(echarts.init).toHaveBeenCalledTimes(1);
      const [containerEl, theme, opts] = (echarts.init as jest.Mock).mock.calls[0];
      expect(containerEl).toBe(component.chartContainer()?.nativeElement);
      expect(theme).toBeUndefined();
      expect(opts).toEqual({ renderer: 'svg' });

      expect(chartInitSpy).toHaveBeenCalledWith(mockChartInstance);
      expect(component.getInstance()).toBe(mockChartInstance);
    });
  });

  describe('Structural Table Pairing (R-DA-009 AC.1 / D-DA-1)', () => {
    it('renders the accessible sr-only table when tableModel is provided', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.componentRef.setInput('chartTitle', 'Custom Chart Title');
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table.sr-only');
      expect(table).not.toBeNull();
      expect(table.getAttribute('aria-label')).toBe('Custom Chart Title');

      const caption = table.querySelector('caption');
      expect(caption?.textContent?.trim()).toBe('Results by report year');

      const headers = Array.from(table.querySelectorAll('thead th[scope="col"]')).map(
        (th: any) => th.textContent?.trim()
      );
      expect(headers).toEqual(['Year', 'Count']);

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      expect(rows.length).toBe(2);

      const firstRowHeader = rows[0].querySelector('th[scope="row"]')?.textContent?.trim();
      const firstRowCell = rows[0].querySelector('td')?.textContent?.trim();
      expect(firstRowHeader).toBe('2023');
      expect(firstRowCell).toBe('10');

      const secondRowHeader = rows[1].querySelector('th[scope="row"]')?.textContent?.trim();
      const secondRowCell = rows[1].querySelector('td')?.textContent?.trim();
      expect(secondRowHeader).toBe('2024');
      expect(secondRowCell).toBe('25');

      const warningAlert = fixture.nativeElement.querySelector('[role="alert"]');
      expect(warningAlert).toBeNull();
    });

    it('falls back to tableModel caption for aria-label when chartTitle is empty', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.componentRef.setInput('chartTitle', '');
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table.sr-only');
      expect(table.getAttribute('aria-label')).toBe('Results by report year');
    });

    it('renders accessibility warning and prevents chart rendering when options provided without required tableModel', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', null);
      fixture.componentRef.setInput('requireTable', true);
      fixture.detectChanges();

      const warningAlert = fixture.nativeElement.querySelector('div.sr-only[role="alert"]');
      expect(warningAlert).not.toBeNull();
      expect(warningAlert.textContent).toContain(
        'Warning: Chart rendered without required accessibility tableModel'
      );

      const table = fixture.nativeElement.querySelector('table.sr-only');
      expect(table).toBeNull();
    });

    it('allows rendering without table when requireTable is explicitly false', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', null);
      fixture.componentRef.setInput('requireTable', false);
      fixture.detectChanges();

      const warningAlert = fixture.nativeElement.querySelector('div.sr-only[role="alert"]');
      expect(warningAlert).toBeNull();

      const table = fixture.nativeElement.querySelector('table.sr-only');
      expect(table).toBeNull();
    });
  });

  describe('Reduced Motion Handling (R-DA-007 / D-DA-1)', () => {
    it('forces animation: false when prefers-reduced-motion matches', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.detectChanges();

      // Trigger option update
      fixture.componentRef.setInput('options', { ...sampleOptions, animationDuration: 500 });
      fixture.detectChanges();

      expect(mockChartInstance.setOption).toHaveBeenCalledWith(
        expect.objectContaining({
          animation: false
        }),
        true
      );
    });

    it('keeps animation intact when prefers-reduced-motion does not match', () => {
      matchMediaMock.mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.detectChanges();

      fixture.componentRef.setInput('options', { ...sampleOptions, animation: true });
      fixture.detectChanges();

      expect(mockChartInstance.setOption).toHaveBeenCalledWith(
        expect.objectContaining({
          animation: true
        }),
        true
      );
    });
  });

  describe('ResizeObserver & Click Events', () => {
    it('observes container with ResizeObserver and resizes chart on trigger', () => {
      fixture.detectChanges();

      expect(MockResizeObserver.instances.length).toBe(1);
      const observerInstance = MockResizeObserver.instances[0];
      expect(observerInstance.observe).toHaveBeenCalledWith(
        component.chartContainer()?.nativeElement
      );

      observerInstance.triggerResize();
      expect(mockChartInstance.resize).toHaveBeenCalledTimes(1);

      component.resize();
      expect(mockChartInstance.resize).toHaveBeenCalledTimes(2);
    });

    it('emits chartClick output when click listener fires', () => {
      const clickSpy = jest.fn();
      component.chartClick.subscribe(clickSpy);

      fixture.detectChanges();

      expect(mockChartInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
      const clickHandler = mockChartInstance.on.mock.calls.find((c: any[]) => c[0] === 'click')?.[1];
      expect(clickHandler).toBeDefined();

      const clickPayload = { seriesIndex: 0, dataIndex: 1, name: '2024', value: 25 };
      clickHandler(clickPayload);

      expect(clickSpy).toHaveBeenCalledWith(clickPayload);
    });
  });

  describe('Loading State', () => {
    it('renders skeleton loading overlay when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.viz-chart-loading-overlay');
      expect(overlay).not.toBeNull();
      expect(overlay.getAttribute('role')).toBe('status');
      expect(overlay.getAttribute('aria-label')).toBe('Loading chart');

      const skeleton = fixture.nativeElement.querySelector('p-skeleton');
      expect(skeleton).not.toBeNull();
    });

    it('does not render loading overlay when loading is false', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.viz-chart-loading-overlay');
      expect(overlay).toBeNull();
    });
  });

  describe('Cleanup on Destroy', () => {
    it('disposes echarts instance and disconnects ResizeObserver on ngOnDestroy', () => {
      fixture.detectChanges();

      const observerInstance = MockResizeObserver.instances[0];

      fixture.destroy();

      expect(mockChartInstance.dispose).toHaveBeenCalledTimes(1);
      expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);
      expect(component.getInstance()).toBeUndefined();
    });
  });
});

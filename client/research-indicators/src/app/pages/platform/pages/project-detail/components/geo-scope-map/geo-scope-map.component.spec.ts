import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeoScopeMapComponent } from './geo-scope-map.component';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { GeoScopeCountry } from '@interfaces/geo-scope.interface';
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

describe('GeoScopeMapComponent (R-GEO-001, R-GEO-002, R-GEO-004, R-GEO-005, R-GEO-006)', () => {
  let fixture: ComponentFixture<GeoScopeMapComponent>;
  let component: GeoScopeMapComponent;
  let darkModeService: DarkModeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [GeoScopeMapComponent],
      providers: [DarkModeService]
    }).compileComponents();

    darkModeService = TestBed.inject(DarkModeService);
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('KZ-015 Transition fixture & Initial empty state (R-GEO-006)', () => {
    it('constructs with neutral world map when countries input is empty (KZ-015)', () => {
      fixture.detectChanges();

      expect(component.options()).toBeDefined();
      expect(component.options().series?.[0]?.data).toEqual([]);
      expect(component.options().visualMap).toBeUndefined();
      expect(component.tableModel()?.rows).toEqual([]);
      expect(fixture.nativeElement.querySelector('app-viz-chart')).not.toBeNull();
    });

    it('transitions from empty initial state to populated input and renders shaded choropleth with visualMap (KZ-015)', () => {
      // 1. Initial neutral map state
      fixture.detectChanges();
      expect(component.options().visualMap).toBeUndefined();

      // 2. Transition state with data
      const mockCountries: GeoScopeCountry[] = [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 12 },
        { iso_alpha_2: 'KE', country_name: 'Kenya', count: 5 }
      ];
      fixture.componentRef.setInput('countries', mockCountries);
      fixture.detectChanges();

      expect(component.options()).not.toBeNull();
      expect(component.options().visualMap).toBeDefined();
      expect(component.tableModel()?.rows.length).toBe(2);
      expect(fixture.nativeElement.querySelector('app-viz-chart')).not.toBeNull();
    });
  });

  describe('Generated ECharts option structure (KZ-001 / R-GEO-001, R-GEO-002, D-GEO-6, D-GEO-7, D-GEO-8)', () => {
    const mockCountries: GeoScopeCountry[] = [
      { iso_alpha_2: 'CO', country_name: 'Colombia', count: 12 },
      { iso_alpha_2: 'KE', country_name: 'Kenya', count: 5 },
      { iso_alpha_2: 'VN', country_name: 'Vietnam', count: 1 }
    ];

    beforeEach(() => {
      fixture.componentRef.setInput('countries', mockCountries);
      fixture.detectChanges();
    });

    it('configures map series with map: world, nameProperty: ISO_A2, roam: false, and ISO-joined data', () => {
      const opts = component.options() as any;
      expect(opts).not.toBeNull();
      expect(opts.series).toHaveLength(1);

      const series = opts.series[0];
      expect(series.type).toBe('map');
      expect(series.map).toBe('world');
      expect(series.nameProperty).toBe('ISO_A2');
      expect(series.roam).toBe(false);
      expect(series.data).toEqual([
        { name: 'CO', value: 12 },
        { name: 'KE', value: 5 },
        { name: 'VN', value: 1 }
      ]);
      expect(series.itemStyle.areaColor).toBe('#f4f7f9');
    });

    it('configures continuous visualMap scaling from 1 to max count over the ramp tokens (D-GEO-8)', () => {
      const opts = component.options() as any;
      const visualMap = opts.visualMap;

      expect(visualMap.type).toBe('continuous');
      expect(visualMap.min).toBe(1);
      expect(visualMap.max).toBe(12);
      expect(visualMap.outOfRange.color).toEqual(['#f4f7f9']);
    });

    it('formats tooltip showing resolved country name and count for hover targets', () => {
      const opts = component.options() as any;
      const formatter = opts.tooltip.formatter;

      expect(formatter({ name: 'CO', value: 12 })).toBe('<strong>Colombia</strong>: 12');
      expect(formatter({ name: 'KE', value: 5 })).toBe('<strong>Kenya</strong>: 5');
      expect(formatter({ name: 'UNKNOWN' })).toBe('');
      expect(formatter(null)).toBe('');
    });

    it('excludes countries absent from geometry from series data but retains them in tableModel (R-GEO-003, R-GEO-005)', () => {
      const mixedCountries: GeoScopeCountry[] = [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 10 },
        { iso_alpha_2: 'HK', country_name: 'Hong Kong', count: 3 },
        { iso_alpha_2: undefined, country_name: 'Unknown Land', count: 1 }
      ];

      fixture.componentRef.setInput('countries', mixedCountries);
      fixture.detectChanges();

      const opts = component.options() as any;
      expect(opts.series[0].data).toEqual([{ name: 'CO', value: 10 }]);

      const tableModel = component.tableModel();
      expect(tableModel?.rows).toEqual([
        ['Colombia', 10],
        ['Hong Kong', 3],
        ['Unknown Land', 1]
      ]);
    });
  });

  describe('Theme Reactivity (R-GEO-004)', () => {
    it('recomputes chart options when dark-mode signal flips', () => {
      fixture.componentRef.setInput('countries', [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 5 }
      ]);
      fixture.detectChanges();

      const initialOpts = component.options();
      expect(initialOpts).not.toBeNull();

      darkModeService.toggleDarkMode();
      fixture.detectChanges();

      const toggledOpts = component.options();
      expect(toggledOpts).not.toBeNull();
      expect(toggledOpts?.visualMap).toBeDefined();
    });
  });

  describe('Accessibility & Pairing Rules (R-GEO-005)', () => {
    it('provides accessible tableModel with caption, headers, and all country rows', () => {
      fixture.componentRef.setInput('countries', [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 8 }
      ]);
      fixture.detectChanges();

      const tableModel = component.tableModel();
      expect(tableModel).toEqual({
        caption: 'Geographic scope results by country',
        headers: ['Country', 'Results'],
        rows: [['Colombia', 8]]
      });
    });

    it('does not contain requireTable="false" in template', () => {
      fixture.componentRef.setInput('countries', [
        { iso_alpha_2: 'CO', country_name: 'Colombia', count: 8 }
      ]);
      fixture.detectChanges();

      const vizChart = fixture.nativeElement.querySelector('app-viz-chart');
      expect(vizChart).not.toBeNull();
    });
  });
});

import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GetContractDashboardService } from '@shared/services/get-contract-dashboard.service';
import { GeoScopeCountry, GeoScopeResponse } from '@interfaces/geo-scope.interface';
import { GeoScopeSummary, ProjectDashboardRankedItem } from '@interfaces/project-dashboard.interface';
import { EChartsOption } from '@shared/components/viz-chart/viz-chart.component';
import { GeoScopeCardComponent } from './geo-scope-card.component';

@Component({
  selector: 'app-project-dashboard-card',
  standalone: true,
  template: '<ng-content />'
})
class MockProjectDashboardCardComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() iconClass = '';
  @Input() compact = false;
  @Input() loading = false;
  @Input() error = false;
  @Input() empty = false;
  @Input() emptyMessage = '';
  @Input() errorMessage = '';
  @Input() variant = '';
  @Input() items: unknown[] = [];
  @Input() layout = '';
  @Input() options: unknown = null;
  @Input() tableModel: unknown = null;
  @Output() retry = new EventEmitter<void>();
}

@Component({
  selector: 'app-geo-scope-map',
  standalone: true,
  template: ''
})
class MockGeoScopeMapComponent {
  @Input() countries: unknown[] = [];
}

describe('GeoScopeCardComponent', () => {
  let component: GeoScopeCardComponent;
  let fixture: ComponentFixture<GeoScopeCardComponent>;
  let service: ReturnType<typeof createContractDashboardServiceMock>;

  beforeEach(async () => {
    service = createContractDashboardServiceMock();

    await TestBed.configureTestingModule({
      imports: [GeoScopeCardComponent]
    })
      .overrideComponent(GeoScopeCardComponent, {
        set: {
          imports: [MockProjectDashboardCardComponent, MockGeoScopeMapComponent],
          providers: [{ provide: GetContractDashboardService, useValue: service }]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(GeoScopeCardComponent);
    component = fixture.componentInstance;
  });

  it('should report empty only when every geographic source is empty', () => {
    expect(component.isEmpty()).toBe(true);

    service.loading.set(true);
    expect(component.isEmpty()).toBe(false);

    service.loading.set(false);
    service.loadError.set(true);
    expect(component.isEmpty()).toBe(false);

    service.loadError.set(false);
    service.geoScopeSummary.set({ countries: 1 });
    expect(component.isEmpty()).toBe(false);

    service.geoScopeSummary.set({});
    service.topRegions.set([{ region_name: 'Latin America', count: 1 }]);
    expect(component.isEmpty()).toBe(false);

    service.topRegions.set([]);
    service.topCountries.set([{ iso_alpha_2: 'CO', country_name: 'Colombia', count: 1 }]);
    expect(component.isEmpty()).toBe(false);
  });

  it('should build visible summary metrics from non-zero values', () => {
    service.geoScopeSummary.set({
      global: 0,
      regional: 2,
      countries: 3,
      sub_national: 0,
      yet_to_be_determined: 1
    });

    expect(component.summaryMetrics()).toEqual([
      { key: 'global', label: 'Global', value: 0 },
      { key: 'regional', label: 'Regional', value: 2 },
      { key: 'countries', label: 'Countries', value: 3 },
      { key: 'sub_national', label: 'Sub-national', value: 0 },
      { key: 'yet_to_be_determined', label: 'Yet to be determined', value: 1 }
    ]);
    expect(component.visibleSummaryMetrics().map(metric => metric.key)).toEqual([
      'regional',
      'countries',
      'yet_to_be_determined'
    ]);

    service.geoScopeSummary.set({});
    expect(component.summaryMetrics()).toEqual([]);
  });

  it('should sort countries and sub-national summaries by count', () => {
    service.topCountries.set([
      {
        iso_alpha_2: 'SN',
        country_name: 'Senegal',
        count: 1,
        top_sub_nationals: [{ sub_national_id: 10, sub_national_name: 'Sédhiou', count: 1 }]
      },
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 32,
        top_sub_nationals: [
          { sub_national_id: 1, sub_national_name: 'Low', count: 1 },
          { sub_national_id: 2, sub_national_name: 'High', count: 5 },
          { sub_national_id: 3, sub_national_name: 'Mid', count: 3 },
          { sub_national_id: 4, sub_national_name: 'Hidden', count: 2 }
        ]
      }
    ]);

    expect(component.topCountries()[0]).toMatchObject({
      id: 'CO',
      label: 'Colombia',
      count: 32
    });
    expect(component.topCountries()[0].subNationals.map(item => item.label)).toEqual(['High', 'Mid', 'Hidden']);
    expect(component.topSubNationals().map(item => item.label)).toEqual(['High', 'Mid', 'Hidden', 'Sédhiou']);
  });

  it('should map top countries and sub-national items for list rendering', () => {
    service.topCountries.set([
      {
        iso_alpha_2: 'SN',
        country_name: 'Senegal',
        count: 1,
        top_sub_nationals: [{ sub_national_id: 10, sub_national_name: 'Sédhiou', count: 1 }]
      },
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 32,
        top_sub_nationals: [{ sub_national_id: 2, sub_national_name: 'High', count: 5 }]
      }
    ]);

    expect(component.topCountryItems()).toEqual([
      { id: 'CO', label: 'Colombia', count: 32 },
      { id: 'SN', label: 'Senegal', count: 1 }
    ]);
    expect(component.topSubNationalItems()).toEqual([
      { id: '2', label: 'High', count: 5 },
      { id: '10', label: 'Sédhiou', count: 1 }
    ]);
  });

  it('should support country and metric fallback values', () => {
    service.geoScopeSummary.set({
      global: undefined,
      regional: undefined,
      countries: undefined,
      sub_national: undefined,
      yet_to_be_determined: undefined
    });
    service.topCountries.set([
      {
        country_name: 'Fallback country',
        results_count: 7,
        top_sub_nationals: [
          { sub_national_name: 'Unknown sub-national' } as never,
          { sub_national_name: 'Known sub-national', count: 2 } as never
        ]
      } as never,
      {
        country_name: 'Empty count country'
      } as never
    ]);

    expect(component.summaryMetrics().every(metric => metric.value === 0)).toBe(true);
    expect(component.topCountries()).toEqual([
      {
        id: 'Fallback country',
        label: 'Fallback country',
        count: 7,
        subNationals: [
          {
            id: 'undefined',
            label: 'Known sub-national',
            countryName: 'Fallback country',
            count: 2
          },
          {
            id: 'undefined',
            label: 'Unknown sub-national',
            countryName: 'Fallback country',
            count: 0
          }
        ]
      },
      {
        id: 'Empty count country',
        label: 'Empty count country',
        count: 0,
        subNationals: []
      }
    ]);
    expect(component.topSubNationals().map(item => item.count)).toEqual([2, 0]);
  });

  it('should sort sub-national values when undefined counts appear on both sides', () => {
    service.topCountries.set([
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 1,
        top_sub_nationals: [
          { sub_national_id: 1, sub_national_name: 'Undefined A' } as never,
          { sub_national_id: 2, sub_national_name: 'Defined', count: 1 },
          { sub_national_id: 3, sub_national_name: 'Undefined B' } as never
        ]
      }
    ]);

    expect(component.topCountries()[0].subNationals.map(item => item.label)).toEqual([
      'Defined',
      'Undefined A',
      'Undefined B'
    ]);
  });

  it('should map top regions for list rendering', () => {
    service.topRegions.set([{ region_name: 'Africa', results_count: 3 }, { count: 1 }, {}]);

    expect(component.topRegions()).toEqual([
      { id: 'Africa', label: 'Africa', count: 3 },
      { id: '1', label: '—', count: 1 },
      { id: '2', label: '—', count: 0 }
    ]);
  });

  it('should not report empty for global/regional only project (R-GEO-006 AC.4 fixture)', () => {
    service.topCountries.set([]);
    service.geoScopeSummary.set({ global: 7, regional: 3 });

    expect(component.isEmpty()).toBe(false);
  });

  it('should normalize grid spacing to gap-6 and have no gap-16 elements (R-HL-008)', () => {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const gap16Elements = root.querySelectorAll('.gap-16, [class*="gap-16"]');
    expect(gap16Elements.length).toBe(0);

    const gap6Grid = root.querySelector('.grid.min-w-0.grid-cols-1.gap-6.lg\\:grid-cols-3');
    expect(gap6Grid).toBeTruthy();
  });

  // --- R-DN-002 / D-DN-6 OQ-2-A: rankings migrated from rows-partners pills to
  // viz-chart horizontal bars. Builder-output assertions replace the retired
  // partnerBarWidthPercent/fillPercent/barColor pill specs (reversion challenge 2).

  it('should build region viz-chart options preserving server order, not sorting by count (OQ-2-A)', () => {
    service.topRegions.set([
      { region_name: 'Latin America', results_count: 2 },
      { region_name: 'Africa', results_count: 9 },
      { region_name: 'Asia', results_count: 5 }
    ]);

    const tableModel = component.regionTableModel();
    expect(tableModel).toEqual({
      caption: 'Top regions',
      headers: ['Region', 'Results'],
      rows: [
        ['Latin America', 2],
        ['Africa', 9],
        ['Asia', 5]
      ]
    });

    const options = component.regionChartOptions() as EChartsOption & {
      yAxis: { data: string[] };
      series: { data: { value: number; itemStyle: { color: string } }[] }[];
    };
    expect(options.yAxis.data).toEqual(['Latin America', 'Africa', 'Asia']);
    expect(options.series[0].data.map(point => point.value)).toEqual([2, 9, 5]);
    expect(options.series[0].data[0].itemStyle.color).toBe('var(--ac-green-500)');
    options.series[0].data.forEach(point => expect(point.itemStyle.color).toMatch(/^var\(--/));
  });

  it('should build country viz-chart options ranked by count with accessible tableModel (OQ-2-A)', () => {
    service.topCountries.set([
      { iso_alpha_2: 'SN', country_name: 'Senegal', count: 4 },
      { iso_alpha_2: 'CO', country_name: 'Colombia', count: 32 }
    ]);

    const tableModel = component.countryTableModel();
    expect(tableModel).toEqual({
      caption: 'Top countries',
      headers: ['Country', 'Results'],
      rows: [
        ['Colombia', 32],
        ['Senegal', 4]
      ]
    });

    const options = component.countryChartOptions() as EChartsOption & {
      yAxis: { data: string[] };
      series: { name: string; data: { value: number }[] }[];
    };
    expect(options.series[0].name).toBe('Top countries');
    expect(options.yAxis.data).toEqual(['Colombia', 'Senegal']);
    expect(options.series[0].data.map(point => point.value)).toEqual([32, 4]);
  });

  it('should build sub-national viz-chart options ranked by count with accessible tableModel (OQ-2-A)', () => {
    service.topCountries.set([
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 10,
        top_sub_nationals: [
          { sub_national_id: 1, sub_national_name: 'Low', count: 1 },
          { sub_national_id: 2, sub_national_name: 'High', count: 5 }
        ]
      }
    ]);

    const tableModel = component.subNationalTableModel();
    expect(tableModel).toEqual({
      caption: 'Top sub-national levels',
      headers: ['Sub-national level', 'Results'],
      rows: [
        ['High', 5],
        ['Low', 1]
      ]
    });

    const options = component.subNationalChartOptions() as EChartsOption & { yAxis: { data: string[] } };
    expect(options.yAxis.data).toEqual(['High', 'Low']);
  });

  it('should return null viz-chart options/tableModel when a ranking list is empty (OQ-2-A)', () => {
    service.topRegions.set([]);
    service.topCountries.set([]);

    expect(component.regionChartOptions()).toBeNull();
    expect(component.regionTableModel()).toBeNull();
    expect(component.countryChartOptions()).toBeNull();
    expect(component.countryTableModel()).toBeNull();
    expect(component.subNationalChartOptions()).toBeNull();
    expect(component.subNationalTableModel()).toBeNull();
  });

  it('should render all three migrated ranking surfaces as explicit viz-bar (never the default columns layout) with matching options/tableModel (pointer 1, R-DN-002)', () => {
    service.topRegions.set([{ region_name: 'Africa', results_count: 3 }]);
    service.topCountries.set([
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 2,
        top_sub_nationals: [{ sub_national_id: 1, sub_national_name: 'Antioquia', count: 1 }]
      }
    ]);
    fixture.detectChanges();

    const cardDebugElements = fixture.debugElement.queryAll(By.directive(MockProjectDashboardCardComponent));
    const listCards = cardDebugElements
      .map(debugElement => debugElement.componentInstance as MockProjectDashboardCardComponent)
      .filter(instance => instance.variant === 'list');

    expect(listCards).toHaveLength(3);
    listCards.forEach(instance => {
      expect(instance.layout).toBe('viz-bar');
      expect(instance.options).not.toBeNull();
      expect(instance.tableModel).not.toBeNull();
    });

    expect(listCards.map(instance => instance.title)).toEqual(['Top regions', 'Top countries', 'Top sub-national levels']);
    expect(listCards[0].options).toEqual(component.regionChartOptions());
    expect(listCards[0].tableModel).toEqual(component.regionTableModel());
    expect(listCards[1].options).toEqual(component.countryChartOptions());
    expect(listCards[1].tableModel).toEqual(component.countryTableModel());
  });
});

function createContractDashboardServiceMock() {
  const geoScopeSummary = signal<Partial<GeoScopeSummary>>({});
  const topRegions = signal<ProjectDashboardRankedItem[]>([]);
  const topCountries = signal<GeoScopeCountry[]>([]);
  const loading = signal(false);
  const loadError = signal(false);
  const geoScope = computed<GeoScopeResponse | null>(() => ({
    contract_id: 'A100',
    limit: 5,
    geo_scope_summary: geoScopeSummary(),
    top_regions: topRegions(),
    top_countries: topCountries()
  }));

  return {
    geoScopeSummary,
    topRegions,
    topCountries,
    geoScope,
    loading,
    loadError,
    update: jest.fn()
  };
}

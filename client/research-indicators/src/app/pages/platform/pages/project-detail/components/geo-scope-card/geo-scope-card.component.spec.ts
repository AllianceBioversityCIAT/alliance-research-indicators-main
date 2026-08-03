import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GetGeoScopeService } from '@services/get-geo-scope.service';
import { GeoScopeCountry } from '@interfaces/geo-scope.interface';
import { GeoScopeSummary, ProjectDashboardRankedItem } from '@interfaces/project-dashboard.interface';
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
  @Input() variant = '';
  @Input() items: unknown[] = [];
  @Input() layout = '';
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
  let service: ReturnType<typeof createGeoScopeServiceMock>;

  beforeEach(async () => {
    service = createGeoScopeServiceMock();

    await TestBed.configureTestingModule({
      imports: [GeoScopeCardComponent]
    })
      .overrideComponent(GeoScopeCardComponent, {
        set: {
          imports: [MockProjectDashboardCardComponent, MockGeoScopeMapComponent],
          providers: [{ provide: GetGeoScopeService, useValue: service }]
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
    service.summary.set({ countries: 1 });
    expect(component.isEmpty()).toBe(false);

    service.summary.set({});
    service.topRegionsList.set([{ region_name: 'Latin America', count: 1 }]);
    expect(component.isEmpty()).toBe(false);

    service.topRegionsList.set([]);
    service.topCountries.set([{ iso_alpha_2: 'CO', country_name: 'Colombia', count: 1 }]);
    expect(component.isEmpty()).toBe(false);
  });

  it('should build visible summary metrics from non-zero values', () => {
    service.summary.set({
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

    service.summary.set({});
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
    service.summary.set({
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
    service.topRegionsList.set([{ region_name: 'Africa', results_count: 3 }, { count: 1 }, {}]);

    expect(component.topRegions()).toEqual([
      { id: 'Africa', label: 'Africa', count: 3 },
      { id: '1', label: '—', count: 1 },
      { id: '2', label: '—', count: 0 }
    ]);
  });
});

function createGeoScopeServiceMock() {
  return {
    summary: signal<Partial<GeoScopeSummary>>({}),
    topRegionsList: signal<ProjectDashboardRankedItem[]>([]),
    topCountries: signal<GeoScopeCountry[]>([]),
    loading: signal(false),
    loadError: signal(false),
    update: jest.fn()
  };
}

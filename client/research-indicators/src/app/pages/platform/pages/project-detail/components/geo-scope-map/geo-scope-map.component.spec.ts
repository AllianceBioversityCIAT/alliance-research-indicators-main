import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { GeoScopeCountry, GeoScopePointFeatureCollection } from '@interfaces/geo-scope.interface';
import { MapboxGeocodingService } from '@shared/services/mapbox-geocoding.service';
import { environment } from '../../../../../../../environments/environment';
import { GeoScopeMapComponent } from './geo-scope-map.component';

const mockMapInstances: Array<Record<string, any>> = [];
const mockPopupInstances: Array<Record<string, any>> = [];

jest.mock('mapbox-gl', () => {
  class MockMap {
    readonly addControl = jest.fn();
    readonly addSource = jest.fn((_id: string, source: unknown) => {
      this.source = { setData: jest.fn(), source };
    });
    readonly addLayer = jest.fn(() => {
      this.hasLayer = true;
    });
    readonly canvas = { style: { cursor: '' } };
    readonly fitBounds = jest.fn();
    readonly getCanvas = jest.fn(() => this.canvas);
    readonly isStyleLoaded = jest.fn(() => true);
    readonly once = jest.fn((_event: string, callback: () => void) => callback());
    readonly remove = jest.fn();
    readonly resize = jest.fn();
    readonly setPaintProperty = jest.fn();
    readonly on = jest.fn((event: string, _layerOrHandler: unknown, maybeHandler?: unknown) => {
      const handler = typeof maybeHandler === 'function' ? maybeHandler : _layerOrHandler;
      this.handlers.set(event, handler as (...args: unknown[]) => void);
      if (event === 'load' && typeof handler === 'function') {
        handler();
      }
      return this;
    });

    source?: { setData: jest.Mock; source: unknown };
    hasLayer = false;
    readonly handlers = new Map<string, (...args: unknown[]) => void>();

    constructor() {
      mockMapInstances.push(this);
    }

    getSource = jest.fn(() => this.source);
    getLayer = jest.fn(() => (this.hasLayer ? {} : undefined));
  }

  class MockPopup {
    readonly remove = jest.fn(() => this);
    readonly setLngLat = jest.fn(() => this);
    readonly setHTML = jest.fn(() => this);
    readonly addTo = jest.fn(() => this);

    constructor() {
      mockPopupInstances.push(this);
    }
  }

  class MockLngLatBounds {
    private empty = true;
    readonly extend = jest.fn(() => {
      this.empty = false;
    });
    isEmpty(): boolean {
      return this.empty;
    }
  }

  return {
    __esModule: true,
    default: {
      accessToken: '',
      NavigationControl: jest.fn()
    },
    Map: MockMap,
    Popup: MockPopup,
    LngLatBounds: MockLngLatBounds
  };
});

describe('GeoScopeMapComponent', () => {
  let fixture: ComponentFixture<GeoScopeMapComponent>;
  let component: GeoScopeMapComponent;
  let geocoding: { geocodeTasks: jest.Mock };
  const originalToken = environment.mapboxAccessToken;
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(async () => {
    mockMapInstances.length = 0;
    mockPopupInstances.length = 0;
    geocoding = { geocodeTasks: jest.fn(() => of(new Map())) };
    globalThis.ResizeObserver = class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe = jest.fn(() => {
        this.callback([], this);
      });
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 0;
    });

    await TestBed.configureTestingModule({
      imports: [GeoScopeMapComponent],
      providers: [{ provide: MapboxGeocodingService, useValue: geocoding }]
    }).compileComponents();
  });

  afterEach(() => {
    environment.mapboxAccessToken = originalToken;
    globalThis.ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  it('should surface a map error when no Mapbox token is configured', () => {
    environment.mapboxAccessToken = '';
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.mapError()).toBe(true);
    expect(mockMapInstances).toHaveLength(0);
  });

  it('should render empty state when no countries are provided', () => {
    environment.mapboxAccessToken = 'token';
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showEmptyState()).toBe(true);
    expect(component.hasResolvedPoints()).toBe(false);
    expect(mockMapInstances[0].addSource).toHaveBeenCalled();
    expect(mockMapInstances[0].addLayer).toHaveBeenCalled();
  });

  it('should geocode sub-national tasks and fit resolved features', () => {
    environment.mapboxAccessToken = 'token';
    const countries: GeoScopeCountry[] = [
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 10,
        top_sub_nationals: [{ sub_national_id: 1, sub_national_name: 'Cundinamarca', count: 4 }]
      }
    ];
    geocoding.geocodeTasks.mockReturnValue(of(new Map([['sub:colombia:1:cundinamarca', { lng: -74, lat: 4 }]])));

    fixture = TestBed.createComponent(GeoScopeMapComponent);
    fixture.componentRef.setInput('countries', countries);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(geocoding.geocodeTasks).toHaveBeenCalled();
    expect(component.geocodingLoading()).toBe(false);
    expect(component.hasResolvedPoints()).toBe(true);
    expect(component.showEmptyState()).toBe(false);
    expect(mockMapInstances[0].source?.setData).toHaveBeenCalled();
    expect(mockMapInstances[0].fitBounds).toHaveBeenCalled();
    expect(mockMapInstances[0].setPaintProperty).toHaveBeenCalled();
  });

  it('should fallback to static coordinates when geocoding fails', () => {
    environment.mapboxAccessToken = 'token';
    const countries: GeoScopeCountry[] = [
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 10,
        top_sub_nationals: [{ sub_national_id: 1, sub_national_name: 'Cundinamarca', count: 4 }]
      }
    ];
    geocoding.geocodeTasks.mockReturnValue(throwError(() => new Error('Mapbox failed')));

    fixture = TestBed.createComponent(GeoScopeMapComponent);
    fixture.componentRef.setInput('countries', countries);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasResolvedPoints()).toBe(true);
    expect(component.mapError()).toBe(false);
  });

  it('should refresh points when countries change after view init', () => {
    environment.mapboxAccessToken = 'token';
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const map = mockMapInstances[0];
    map.source?.setData.mockClear();
    fixture.componentRef.setInput('countries', [{ iso_alpha_2: 'CO', country_name: 'Colombia', count: 10 }]);
    fixture.detectChanges();

    expect(component.hasResolvedPoints()).toBe(true);
    expect(map.source?.setData).toHaveBeenCalled();
  });

  it('should update cursor and open popups for clicked features', () => {
    environment.mapboxAccessToken = 'token';
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    fixture.componentRef.setInput('countries', [{ iso_alpha_2: 'CO', country_name: 'Colombia', count: 10 }]);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const map = mockMapInstances[0];
    map.handlers.get('mouseenter')?.();
    expect(map.getCanvas().style.cursor).toBe('pointer');
    map.handlers.get('mouseleave')?.();
    expect(map.getCanvas().style.cursor).toBe('');

    map.handlers.get('click')?.({
      features: [
        {
          geometry: { type: 'Point', coordinates: [-74, 4] },
          properties: { level: 'country', name: 'Colombia', countryName: 'Colombia', count: 10 }
        }
      ]
    });

    expect(mockPopupInstances[0].setLngLat).toHaveBeenCalledWith([-74, 4]);
    expect(mockPopupInstances[0].setHTML).toHaveBeenCalled();
    expect(mockPopupInstances[0].addTo).toHaveBeenCalledWith(map);

    map.handlers.get('click')?.({
      features: [
        {
          geometry: { type: 'Point', coordinates: [-73, 5] },
          properties: { level: 'sub-national', name: 'Cundinamarca', countryName: 'Colombia', count: 4 }
        }
      ]
    });
    expect(mockPopupInstances[1].setLngLat).toHaveBeenCalledWith([-73, 5]);
  });

  it('should ignore invalid popup events and clean up on destroy', () => {
    environment.mapboxAccessToken = 'token';
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const map = mockMapInstances[0];
    map.handlers.get('click')?.({ features: [] });
    map.handlers.get('click')?.({
      features: [{ geometry: { type: 'LineString', coordinates: [] }, properties: { name: '' } }]
    });
    map.handlers.get('click')?.({
      features: [{ geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }]
    });
    expect(mockPopupInstances).toHaveLength(0);

    fixture.destroy();
    expect(map.remove).toHaveBeenCalled();
  });

  it('should handle internal map guard branches', () => {
    environment.mapboxAccessToken = 'token';
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const testingComponent = component as unknown as {
      map?: Record<string, unknown>;
      ensureMapLayers(): void;
      fitMapToFeatures(features: unknown[]): void;
      updateSourceData(data: GeoScopePointFeatureCollection): void;
    };

    const map = mockMapInstances[0];
    const originalMap = testingComponent.map;
    testingComponent.map = undefined;
    expect(() => testingComponent.ensureMapLayers()).not.toThrow();
    expect(() => testingComponent.fitMapToFeatures([])).not.toThrow();

    testingComponent.map = originalMap;
    map.isStyleLoaded.mockReturnValueOnce(false);
    testingComponent.updateSourceData({ type: 'FeatureCollection', features: [] });
    expect(map.once).toHaveBeenCalled();

    map.fitBounds.mockClear();
    testingComponent.fitMapToFeatures([
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: { level: 'country', name: 'Invalid', countryName: 'Invalid', count: 1 }
      }
    ]);
    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it('should ignore stale geocoding responses', () => {
    environment.mapboxAccessToken = 'token';
    const geocodeSubject = new Subject<Map<string, { lng: number; lat: number } | null>>();
    geocoding.geocodeTasks.mockReturnValue(geocodeSubject.asObservable());

    fixture = TestBed.createComponent(GeoScopeMapComponent);
    fixture.componentRef.setInput('countries', [
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 10,
        top_sub_nationals: [{ sub_national_id: 1, sub_national_name: 'Cundinamarca', count: 4 }]
      }
    ]);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const testingComponent = component as unknown as { refreshVersion: number };
    testingComponent.refreshVersion += 1;
    geocodeSubject.next(new Map([['sub:colombia:1:cundinamarca', { lng: -74, lat: 4 }]]));

    expect(component.geocodingLoading()).toBe(true);
  });

  it('should avoid empty state when unresolved points already have map error', () => {
    environment.mapboxAccessToken = 'token';
    geocoding.geocodeTasks.mockReturnValue(of(new Map([['country:atlantis', null]])));

    fixture = TestBed.createComponent(GeoScopeMapComponent);
    fixture.componentRef.setInput('countries', [{ iso_alpha_2: 'XX', country_name: 'Atlantis', count: 10 }]);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.mapError.set(true);

    const testingComponent = component as unknown as { refreshMapPoints(countries: GeoScopeCountry[]): void };
    testingComponent.refreshMapPoints([{ iso_alpha_2: 'XX', country_name: 'Atlantis', count: 10 }]);

    expect(component.hasResolvedPoints()).toBe(false);
    expect(component.showEmptyState()).toBe(false);
  });

  it('should ignore stale geocoding errors', () => {
    environment.mapboxAccessToken = 'token';
    const geocodeSubject = new Subject<Map<string, { lng: number; lat: number } | null>>();
    geocoding.geocodeTasks.mockReturnValue(geocodeSubject.asObservable());

    fixture = TestBed.createComponent(GeoScopeMapComponent);
    fixture.componentRef.setInput('countries', [
      {
        iso_alpha_2: 'CO',
        country_name: 'Colombia',
        count: 10,
        top_sub_nationals: [{ sub_national_id: 1, sub_national_name: 'Cundinamarca', count: 4 }]
      }
    ]);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const testingComponent = component as unknown as { refreshVersion: number };
    testingComponent.refreshVersion += 1;
    geocodeSubject.error(new Error('stale'));

    expect(component.geocodingLoading()).toBe(true);
  });
});

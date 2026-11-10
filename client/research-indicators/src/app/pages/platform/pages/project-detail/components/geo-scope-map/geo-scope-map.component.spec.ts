import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { GeoScopeMapComponent } from './geo-scope-map.component';
import { MapboxGeocodingService } from '@shared/services/mapbox-geocoding.service';
import { GeoScopeCountry } from '@interfaces/geo-scope.interface';
import { GEO_SCOPE_LAYER_ID, GEO_SCOPE_SOURCE_ID } from '@shared/constants/country-centroids.constants';
import * as util from '@shared/utils/geo-scope-map.util';

const mockEnv: { mapboxAccessToken?: string } = { mapboxAccessToken: ' tok ' };
jest.mock('../../../../../../../environments/environment', () => ({
  get environment() {
    return mockEnv;
  }
}));

interface FakeMap {
  opts: unknown;
  handlers: Record<string, (e?: unknown) => void>;
  layerHandlers: Record<string, (e?: unknown) => void>;
  canvas: { style: { cursor: string } };
  sources: Record<string, { setData: jest.Mock }>;
  layers: Record<string, boolean>;
  styleLoaded: boolean;
  onceCb?: () => void;
  addControl: jest.Mock;
  addSource: jest.Mock;
  addLayer: jest.Mock;
  getSource: jest.Mock;
  getLayer: jest.Mock;
  setPaintProperty: jest.Mock;
  fitBounds: jest.Mock;
  resize: jest.Mock;
  remove: jest.Mock;
  isStyleLoaded: jest.Mock;
  once: jest.Mock;
  on: jest.Mock;
  getCanvas: jest.Mock;
}

const state: {
  map?: FakeMap;
  popups: { opts: unknown; remove: jest.Mock; lngLat?: unknown; html?: string; addTo: jest.Mock }[];
  boundsEmpty: boolean;
  extended: unknown[];
} = { popups: [], boundsEmpty: false, extended: [] };

jest.mock('mapbox-gl', () => {
  class MapMock {
    constructor(opts: unknown) {
      const m: FakeMap = {
        opts,
        handlers: {},
        layerHandlers: {},
        canvas: { style: { cursor: '' } },
        sources: {},
        layers: {},
        styleLoaded: true,
        addControl: jest.fn(),
        addSource: jest.fn((id: string) => {
          m.sources[id] = { setData: jest.fn() };
        }),
        addLayer: jest.fn((l: { id: string }) => {
          m.layers[l.id] = true;
        }),
        getSource: jest.fn((id: string) => m.sources[id]),
        getLayer: jest.fn((id: string) => m.layers[id]),
        setPaintProperty: jest.fn(),
        fitBounds: jest.fn(),
        resize: jest.fn(),
        remove: jest.fn(),
        isStyleLoaded: jest.fn(() => m.styleLoaded),
        once: jest.fn((_e: string, cb: () => void) => {
          m.onceCb = cb;
        }),
        on: jest.fn((...args: unknown[]) => {
          if (args.length === 3) {
            m.layerHandlers[`${args[0]}`] = args[2] as (e?: unknown) => void;
          } else {
            m.handlers[`${args[0]}`] = args[1] as (e?: unknown) => void;
          }
        }),
        getCanvas: jest.fn(() => m.canvas)
      };
      state.map = m;
      return m as unknown as MapMock;
    }
  }
  class LngLatBoundsMock {
    extend(c: unknown) {
      state.extended.push(c);
    }
    isEmpty() {
      return state.boundsEmpty;
    }
  }
  class PopupMock {
    constructor(opts: unknown) {
      const p = {
        opts,
        remove: jest.fn(),
        lngLat: undefined as unknown,
        html: undefined as string | undefined,
        addTo: jest.fn()
      };
      state.popups.push(p);
      const self = this as unknown as Record<string, unknown>;
      self['setLngLat'] = (c: unknown) => {
        p.lngLat = c;
        return self;
      };
      self['setHTML'] = (h: string) => {
        p.html = h;
        return self;
      };
      self['addTo'] = (m: unknown) => {
        p.addTo(m);
        return self;
      };
      self['remove'] = p.remove;
    }
  }
  const NavigationControl = jest.fn();
  return {
    __esModule: true,
    default: { accessToken: '', NavigationControl },
    Map: MapMock,
    LngLatBounds: LngLatBoundsMock,
    Popup: PopupMock
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mapboxgl = require('mapbox-gl').default;

describe('GeoScopeMapComponent', () => {
  let fixture: ComponentFixture<GeoScopeMapComponent>;
  let component: GeoScopeMapComponent;
  let ref: ComponentRef<GeoScopeMapComponent>;
  let geocodeTasks: jest.Mock;
  let rafSpy: jest.SpyInstance;
  let roCallback: (() => void) | undefined;
  let roDisconnect: jest.Mock;

  const withStatic: GeoScopeCountry[] = [{ iso_alpha_2: 'CO', country_name: 'Colombia', count: 3 }];
  const needGeocode: GeoScopeCountry[] = [
    { country_name: 'Nowhereland', count: 2, top_sub_nationals: [{ sub_national_id: 1, sub_national_name: 'Reg', count: 1 }] }
  ];

  const create = (countries: readonly GeoScopeCountry[] = [], detect = true) => {
    fixture = TestBed.createComponent(GeoScopeMapComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    ref.setInput('countries', countries);
    if (detect) fixture.detectChanges();
  };

  beforeEach(() => {
    mockEnv.mapboxAccessToken = ' tok ';
    state.map = undefined;
    state.popups = [];
    state.boundsEmpty = false;
    state.extended = [];
    mapboxgl.accessToken = '';
    geocodeTasks = jest.fn(() => of(new Map()));
    roCallback = undefined;
    roDisconnect = jest.fn();
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      constructor(cb: () => void) {
        roCallback = cb;
      }
      observe = jest.fn();
      disconnect = roDisconnect;
    };
    rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
    TestBed.configureTestingModule({
      imports: [GeoScopeMapComponent],
      providers: [{ provide: MapboxGeocodingService, useValue: { geocodeTasks } }]
    });
  });

  afterEach(() => {
    rafSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('sets mapError and skips map creation without a token', () => {
    mockEnv.mapboxAccessToken = '   ';
    create(withStatic);
    expect(component.mapError()).toBe(true);
    expect(state.map).toBeUndefined();
    expect(component.hasResolvedPoints()).toBe(true);
    expect(component.showEmptyState()).toBe(false);
  });

  it('handles an undefined token', () => {
    mockEnv.mapboxAccessToken = undefined;
    create([]);
    expect(component.mapError()).toBe(true);
  });

  it('initialises the map with the trimmed token and wires events', () => {
    create([]);
    const m = state.map as FakeMap;
    expect(mapboxgl.accessToken).toBe('tok');
    expect(m.opts).toEqual(expect.objectContaining({ zoom: 1.2, center: [0, 20] }));
    expect(m.addControl).toHaveBeenCalledWith(expect.anything(), 'top-right');
    expect(component.mapError()).toBe(false);

    m.layerHandlers['mouseenter']();
    expect(m.canvas.style.cursor).toBe('pointer');
    m.layerHandlers['mouseleave']();
    expect(m.canvas.style.cursor).toBe('');

    m.handlers['load']();
    expect(m.addSource).toHaveBeenCalledWith(GEO_SCOPE_SOURCE_ID, expect.anything());
    expect(m.addLayer).toHaveBeenCalled();
    expect(m.resize).toHaveBeenCalled();

    // layers already exist: no duplicates
    m.addSource.mockClear();
    m.addLayer.mockClear();
    m.handlers['load']();
    expect(m.addSource).not.toHaveBeenCalled();
    expect(m.addLayer).not.toHaveBeenCalled();

    m.resize.mockClear();
    roCallback?.();
    expect(m.resize).toHaveBeenCalled();
  });

  it('cursor handlers do nothing after map is destroyed', () => {
    create([]);
    const m = state.map as FakeMap;
    const enter = m.layerHandlers['mouseenter'];
    const leave = m.layerHandlers['mouseleave'];
    component.ngOnDestroy();
    m.canvas.style.cursor = 'x';
    enter();
    leave();
    expect(m.canvas.style.cursor).toBe('x');
    // load after destroy
    m.addSource.mockClear();
    m.handlers['load']();
    expect(m.addSource).not.toHaveBeenCalled();
  });

  it('shows empty state and clears source when there are no display tasks', () => {
    create([]);
    const m = state.map as FakeMap;
    expect(component.showEmptyState()).toBe(true);
    expect(component.geocodingLoading()).toBe(false);
    expect(m.sources[GEO_SCOPE_SOURCE_ID].setData).toHaveBeenCalledWith({ type: 'FeatureCollection', features: [] });
    expect(m.setPaintProperty).toHaveBeenCalledWith(GEO_SCOPE_LAYER_ID, 'circle-radius', expect.any(Array));
  });

  it('defers source update until style loads', () => {
    const m0 = jest.spyOn(util, 'getGeoScopeMaxCount');
    create([], false);
    // style not loaded when the map is created: patch via first access
    fixture.detectChanges();
    const m = state.map as FakeMap;
    m.styleLoaded = false;
    ref.setInput('countries', []);
    fixture.detectChanges();
    expect(m.once).toHaveBeenCalledWith('load', expect.any(Function));
    m.styleLoaded = true;
    m.onceCb?.();
    expect(m0).toHaveBeenCalled();
    expect(m.sources[GEO_SCOPE_SOURCE_ID].setData).toHaveBeenCalled();
  });

  it('skips setPaintProperty when layer is missing and tolerates missing source', () => {
    create([]);
    const m = state.map as FakeMap;
    m.addLayer.mockImplementation(() => undefined);
    m.addSource.mockImplementation(() => undefined);
    m.layers = {};
    m.sources = {};
    m.setPaintProperty.mockClear();
    ref.setInput('countries', []);
    fixture.detectChanges();
    expect(m.setPaintProperty).not.toHaveBeenCalled();
  });

  it('renders static points without geocoding and fits bounds', () => {
    create(withStatic);
    const m = state.map as FakeMap;
    expect(geocodeTasks).not.toHaveBeenCalled();
    expect(component.hasResolvedPoints()).toBe(true);
    expect(component.showEmptyState()).toBe(false);
    expect(component.geocodingLoading()).toBe(false);
    expect(state.extended).toHaveLength(1);
    expect(m.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: 48, maxZoom: 6, duration: 700 });
  });

  it('does not fit bounds when bounds are empty', () => {
    state.boundsEmpty = true;
    create(withStatic);
    expect((state.map as FakeMap).fitBounds).not.toHaveBeenCalled();
  });

  it('skips non-Point geometries when fitting bounds', () => {
    jest.spyOn(util, 'buildGeoScopeFeatureCollection').mockReturnValue({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } as never, properties: {} as never },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} as never }
      ]
    });
    create(withStatic);
    expect(state.extended).toEqual([[1, 2]]);
  });

  it('does not fit when map missing (no token)', () => {
    mockEnv.mapboxAccessToken = '';
    create(withStatic);
    expect(component.hasResolvedPoints()).toBe(true);
    expect(component.showEmptyState()).toBe(false);
  });

  it('geocodes remaining tasks and applies results', () => {
    const subject = new Subject<Map<string, never>>();
    geocodeTasks.mockReturnValue(subject);
    create(needGeocode);
    expect(component.geocodingLoading()).toBe(true);
    const plan = util.buildGeoScopeResolutionPlan(needGeocode);
    const result = new Map<string, { lng: number; lat: number } | null>();
    plan.geocodeTasks.forEach((t, i) => result.set(t.cacheKey, { lng: i + 1, lat: i + 1 }));
    subject.next(result as never);
    expect(component.geocodingLoading()).toBe(false);
    expect(component.hasResolvedPoints()).toBe(true);
    expect((state.map as FakeMap).fitBounds).toHaveBeenCalled();
  });

  it('ignores stale geocode responses', () => {
    const first = new Subject<Map<string, never>>();
    geocodeTasks.mockReturnValueOnce(first);
    create(needGeocode);
    geocodeTasks.mockReturnValueOnce(of(new Map()));
    ref.setInput('countries', withStatic);
    fixture.detectChanges();
    expect(component.hasResolvedPoints()).toBe(true);
    const spy = jest.spyOn(util, 'buildGeoScopeFeatureCollection');
    spy.mockClear();
    first.next(new Map() as never);
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls back to empty map on geocode error', () => {
    geocodeTasks.mockReturnValue(throwError(() => new Error('boom')));
    create(withStatic.concat(needGeocode));
    expect(component.geocodingLoading()).toBe(false);
    expect(component.hasResolvedPoints()).toBe(true);
  });

  it('shows empty state when geocoding resolves no features', () => {
    jest.spyOn(util, 'buildGeoScopeFeatureCollection').mockReturnValue({ type: 'FeatureCollection', features: [] });
    create(needGeocode);
    expect(component.hasResolvedPoints()).toBe(false);
    expect(component.showEmptyState()).toBe(true);
  });

  it('keeps empty state off when mapError and no features', () => {
    mockEnv.mapboxAccessToken = '';
    jest.spyOn(util, 'buildGeoScopeFeatureCollection').mockReturnValue({ type: 'FeatureCollection', features: [] });
    create(withStatic);
    expect(component.showEmptyState()).toBe(false);
  });

  it('ignores an error from a stale request', () => {
    const first = new Subject<Map<string, never>>();
    geocodeTasks.mockReturnValueOnce(first);
    create(needGeocode);
    ref.setInput('countries', []);
    fixture.detectChanges();
    const spy = jest.spyOn(util, 'buildGeoScopeFeatureCollection');
    spy.mockClear();
    first.error(new Error('late'));
    expect(spy).not.toHaveBeenCalled();
  });

  describe('popup', () => {
    const feature = (props: Record<string, unknown>, type = 'Point') => ({
      geometry: { type, coordinates: [10, 20] },
      properties: props
    });
    const click = (features?: unknown[]) => (state.map as FakeMap).layerHandlers['click']({ features });

    it('ignores clicks with no features or undefined features', () => {
      create([]);
      click(undefined);
      click([]);
      expect(state.popups).toHaveLength(0);
    });

    it('ignores clicks when map was destroyed', () => {
      create([]);
      const m = state.map as FakeMap;
      const handler = m.layerHandlers['click'];
      component.ngOnDestroy();
      handler({ features: [feature({ name: 'A' })] });
      expect(state.popups).toHaveLength(0);
    });

    it('ignores features without a name or non-point geometry', () => {
      create([]);
      click([feature({ level: 'country' })]);
      click([feature({ name: 'A' }, 'Polygon')]);
      expect(state.popups).toHaveLength(0);
    });

    it('opens a popup normalising properties and replaces previous one', () => {
      create([]);
      click([feature({ level: 'sub-national', name: 'Reg', countryName: 'Peru', count: '4' })]);
      expect(state.popups).toHaveLength(1);
      expect(state.popups[0].lngLat).toEqual([10, 20]);
      expect(state.popups[0].html).toBe(
        util.buildGeoScopePopupHtml({ level: 'sub-national', name: 'Reg', countryName: 'Peru', count: 4 })
      );
      expect(state.popups[0].addTo).toHaveBeenCalledWith(state.map);

      click([feature({ level: 'weird', name: 'B' })]);
      expect(state.popups[0].remove).toHaveBeenCalled();
      expect(state.popups[1].html).toBe(
        util.buildGeoScopePopupHtml({ level: 'country', name: 'B', countryName: '', count: 0 })
      );
    });
  });

  it('cleans up on destroy', () => {
    create([]);
    const m = state.map as FakeMap;
    (state.popups as unknown[]).length = 0;
    (m.layerHandlers['click'] as (e: unknown) => void)({
      features: [{ geometry: { type: 'Point', coordinates: [1, 1] }, properties: { name: 'A' } }]
    });
    component.ngOnDestroy();
    expect(roDisconnect).toHaveBeenCalled();
    expect(state.popups[0].remove).toHaveBeenCalled();
    expect(m.remove).toHaveBeenCalled();
  });

  it('destroys safely when nothing was initialised', () => {
    create([], false);
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

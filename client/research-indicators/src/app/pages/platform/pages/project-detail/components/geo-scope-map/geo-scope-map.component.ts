import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import mapboxgl, { GeoJSONSource, LngLatBounds, Map as MapboxMap, Popup } from 'mapbox-gl';
import {
  GeoScopeCountry,
  GeoScopePointFeature,
  GeoScopePointFeatureCollection,
  GeoScopePointProperties,
  GeocodedLocation
} from '@interfaces/geo-scope.interface';
import { MapboxGeocodingService } from '@shared/services/mapbox-geocoding.service';
import {
  GEO_SCOPE_LAYER_ID,
  GEO_SCOPE_MAP_STYLE,
  GEO_SCOPE_SOURCE_ID
} from '@shared/constants/country-centroids.constants';
import {
  buildGeoScopeFeatureCollection,
  buildGeoScopePopupHtml,
  buildGeoScopeResolutionPlan,
  getGeoScopeMaxCount
} from '@shared/utils/geo-scope-map.util';
import { environment } from '../../../../../../../environments/environment';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';

@Component({
  selector: 'app-geo-scope-map',
  standalone: true,
  imports: [CustomProgressBarComponent],
  templateUrl: './geo-scope-map.component.html',
  styleUrl: './geo-scope-map.component.scss',
  host: {
    class: 'block h-full w-full'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeoScopeMapComponent implements AfterViewInit, OnDestroy {
  readonly countries = input<readonly GeoScopeCountry[]>([]);

  private readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');
  private readonly destroyRef = inject(DestroyRef);
  private readonly geocoding = inject(MapboxGeocodingService);

  readonly geocodingLoading = signal(false);
  readonly mapError = signal(false);
  readonly hasResolvedPoints = signal(false);
  readonly showEmptyState = signal(false);

  private map?: MapboxMap;
  private popup?: Popup;
  private resizeObserver?: ResizeObserver;
  private refreshVersion = 0;
  private viewReady = false;
  private readonly hasMapboxToken = Boolean(environment.mapboxAccessToken?.trim());

  constructor() {
    effect(() => {
      const countries = this.countries();
      if (!this.viewReady) {
        return;
      }
      this.refreshMapPoints(countries);
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.observeContainerResize();
    this.viewReady = true;
    this.refreshMapPoints(this.countries());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.popup?.remove();
    this.map?.remove();
    this.map = undefined;
  }

  private initMap(): void {
    if (!this.hasMapboxToken) {
      this.mapError.set(true);
      return;
    }

    mapboxgl.accessToken = environment.mapboxAccessToken.trim();
    this.map = new MapboxMap({
      container: this.mapContainer().nativeElement,
      style: GEO_SCOPE_MAP_STYLE,
      center: [0, 20],
      zoom: 1.2,
      attributionControl: true
    });

    this.map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.on('load', () => {
      this.ensureMapLayers();
      this.resizeMap();
    });
    this.map.on('click', GEO_SCOPE_LAYER_ID, event => this.openPopup(event));
    this.map.on('mouseenter', GEO_SCOPE_LAYER_ID, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = 'pointer';
      }
    });
    this.map.on('mouseleave', GEO_SCOPE_LAYER_ID, () => {
      if (this.map) {
        this.map.getCanvas().style.cursor = '';
      }
    });
  }

  private observeContainerResize(): void {
    this.resizeObserver = new ResizeObserver(() => this.resizeMap());
    this.resizeObserver.observe(this.mapContainer().nativeElement);
  }

  private resizeMap(): void {
    globalThis.requestAnimationFrame(() => this.map?.resize());
  }

  private refreshMapPoints(countries: readonly GeoScopeCountry[]): void {
    const version = ++this.refreshVersion;
    const plan = buildGeoScopeResolutionPlan(countries);

    if (!plan.displayTasks.length) {
      this.geocodingLoading.set(false);
      this.hasResolvedPoints.set(false);
      this.showEmptyState.set(true);
      this.updateSourceData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    this.showEmptyState.set(false);

    const applyFeatures = (coordinatesByKey: Map<string, GeocodedLocation | null>) => {
      if (version !== this.refreshVersion) {
        return;
      }

      const featureCollection = buildGeoScopeFeatureCollection(
        plan.displayTasks,
        coordinatesByKey,
        plan.staticCoordinates
      );

      this.geocodingLoading.set(false);
      this.hasResolvedPoints.set(featureCollection.features.length > 0);
      this.showEmptyState.set(featureCollection.features.length === 0 && !this.mapError());
      this.updateSourceData(featureCollection);
      this.resizeMap();
      this.fitMapToFeatures(featureCollection.features);
    };

    if (!plan.geocodeTasks.length) {
      this.geocodingLoading.set(false);
      applyFeatures(new Map());
      return;
    }

    this.geocodingLoading.set(true);

    this.geocoding
      .geocodeTasks(plan.geocodeTasks)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: applyFeatures,
        error: () => {
          if (version !== this.refreshVersion) {
            return;
          }
          this.geocodingLoading.set(false);
          applyFeatures(new Map());
        }
      });
  }

  private ensureMapLayers(): void {
    if (!this.map) {
      return;
    }

    if (!this.map.getSource(GEO_SCOPE_SOURCE_ID)) {
      this.map.addSource(GEO_SCOPE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }

    if (!this.map.getLayer(GEO_SCOPE_LAYER_ID)) {
      this.map.addLayer({
        id: GEO_SCOPE_LAYER_ID,
        type: 'circle',
        source: GEO_SCOPE_SOURCE_ID,
        paint: {
          'circle-color': [
            'match',
            ['get', 'level'],
            'country',
            '#1689CA',
            'sub-national',
            '#7C9CB9',
            '#1689CA'
          ],
          'circle-opacity': 0.88,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1,
            6,
            100,
            22
          ]
        }
      });
    }
  }

  private updateSourceData(data: GeoScopePointFeatureCollection): void {
    if (!this.map) {
      return;
    }

    if (!this.map.isStyleLoaded()) {
      this.map.once('load', () => this.updateSourceData(data));
      return;
    }

    this.ensureMapLayers();
    const maxCount = getGeoScopeMaxCount(data.features);
    const source = this.map.getSource(GEO_SCOPE_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data);

    if (this.map.getLayer(GEO_SCOPE_LAYER_ID)) {
      this.map.setPaintProperty(GEO_SCOPE_LAYER_ID, 'circle-radius', [
        'interpolate',
        ['linear'],
        ['get', 'count'],
        1,
        6,
        maxCount,
        22
      ]);
    }
  }

  private fitMapToFeatures(features: GeoScopePointFeature[]): void {
    if (!this.map || !features.length) {
      return;
    }

    const bounds = new LngLatBounds();
    for (const feature of features) {
      if (feature.geometry.type !== 'Point') {
        continue;
      }
      bounds.extend(feature.geometry.coordinates);
    }

    if (bounds.isEmpty()) {
      return;
    }

    this.map.fitBounds(bounds, {
      padding: 48,
      maxZoom: 6,
      duration: 700
    });
  }

  private openPopup(event: mapboxgl.MapMouseEvent & { features?: unknown[] }): void {
    if (!this.map || !event.features?.length) {
      return;
    }

    const feature = event.features[0] as unknown as GeoScopePointFeature;
    const raw = feature.properties;
    const properties: GeoScopePointProperties = {
      level: raw.level === 'sub-national' ? 'sub-national' : 'country',
      name: String(raw.name ?? ''),
      countryName: String(raw.countryName ?? ''),
      count: Number(raw.count ?? 0)
    };
    if (!properties.name || feature.geometry.type !== 'Point') {
      return;
    }

    const coordinates = [...feature.geometry.coordinates] as [number, number];
    this.popup?.remove();
    this.popup = new Popup({ closeButton: true, closeOnClick: true, offset: 12 })
      .setLngLat(coordinates)
      .setHTML(buildGeoScopePopupHtml(properties))
      .addTo(this.map);
  }
}

import { getCountryCentroid } from '@shared/constants/country-centroids.constants';
import {
  GeoScopeCountry,
  GeoScopeGeocodeTask,
  GeoScopePointFeature,
  GeoScopePointFeatureCollection,
  GeoScopePointProperties,
  GeocodedLocation
} from '@interfaces/geo-scope.interface';

export interface GeoScopeResolutionPlan {
  staticCoordinates: Map<string, GeocodedLocation>;
  displayTasks: GeoScopeGeocodeTask[];
  geocodeTasks: GeoScopeGeocodeTask[];
}

export function buildGeoScopeResolutionPlan(countries: readonly GeoScopeCountry[]): GeoScopeResolutionPlan {
  const staticCoordinates = new Map<string, GeocodedLocation>();
  const displayTasks: GeoScopeGeocodeTask[] = [];
  const geocodeTasks: GeoScopeGeocodeTask[] = [];
  const geocodeKeys = new Set<string>();

  for (const country of countries ?? []) {
    const countryName = country?.country_name?.trim();
    if (!countryName) {
      continue;
    }

    const countryKey = countryCacheKey(countryName);
    const countryCount = normalizeCount(country.count, country.results_count);
    const countryCode = country.iso_alpha_2?.trim().toUpperCase();
    const centroid = getCountryCentroid(countryCode);

    if (centroid) {
      staticCoordinates.set(countryKey, centroid);
    }

    const countryTask: GeoScopeGeocodeTask = {
      cacheKey: countryKey,
      query: countryName,
      level: 'country',
      name: countryName,
      countryName,
      count: countryCount,
      countryCode
    };
    displayTasks.push(countryTask);

    if (!centroid) {
      queueGeocodeTask(geocodeTasks, geocodeKeys, countryTask);
    }

    for (const subNational of country.top_sub_nationals ?? []) {
      const subName = subNational?.sub_national_name?.trim();
      if (!subName) {
        continue;
      }

      const subTask: GeoScopeGeocodeTask = {
        cacheKey: subNationalCacheKey(countryName, subNational.sub_national_id, subName),
        query: `${subName}, ${countryName}`,
        level: 'sub-national',
        name: subName,
        countryName,
        count: normalizeCount(subNational.count),
        countryCode,
        fallbackSeed: Number(subNational.sub_national_id) || subName.length
      };
      displayTasks.push(subTask);
      queueGeocodeTask(geocodeTasks, geocodeKeys, subTask);
    }
  }

  return { staticCoordinates, displayTasks, geocodeTasks };
}

export function buildGeoScopeFeatureCollection(
  tasks: readonly GeoScopeGeocodeTask[],
  coordinatesByKey: ReadonlyMap<string, GeocodedLocation | null>,
  staticCoordinates: ReadonlyMap<string, GeocodedLocation> = new Map()
): GeoScopePointFeatureCollection {
  const features: GeoScopePointFeature[] = [];
  const countryCoordinates = new Map<string, GeocodedLocation>();

  for (const task of tasks) {
    if (task.level !== 'country') {
      continue;
    }

    const location = resolveTaskLocation(task, coordinatesByKey, staticCoordinates);
    if (location) {
      countryCoordinates.set(task.countryName.toLowerCase(), location);
    }
  }

  for (const task of tasks) {
    const location = resolveFeatureLocation(task, coordinatesByKey, staticCoordinates, countryCoordinates);

    if (!location) {
      continue;
    }

    if (task.level === 'country') {
      countryCoordinates.set(task.countryName.toLowerCase(), location);
    }

    features.push(createFeature(task, location));
  }

  return {
    type: 'FeatureCollection',
    features: dedupeFeatures(features)
  };
}

export function getGeoScopeMaxCount(features: readonly GeoScopePointFeature[]): number {
  if (!features.length) {
    return 1;
  }

  return Math.max(...features.map(feature => Number(feature.properties?.count ?? 0)), 1);
}

export function buildGeoScopePopupHtml(properties: GeoScopePointProperties): string {
  if (properties.level === 'country') {
    return `<div class="geo-scope-popup"><strong>${escapeHtml(properties.name)}</strong><div>${properties.count} results</div></div>`;
  }

  return `<div class="geo-scope-popup"><strong>${escapeHtml(properties.name)}</strong><div>${escapeHtml(properties.countryName)}</div><div>${properties.count} results</div></div>`;
}

function resolveTaskLocation(
  task: GeoScopeGeocodeTask,
  coordinatesByKey: ReadonlyMap<string, GeocodedLocation | null>,
  staticCoordinates: ReadonlyMap<string, GeocodedLocation>
): GeocodedLocation | null {
  return staticCoordinates.get(task.cacheKey) ?? coordinatesByKey.get(task.cacheKey) ?? null;
}

function resolveFeatureLocation(
  task: GeoScopeGeocodeTask,
  coordinatesByKey: ReadonlyMap<string, GeocodedLocation | null>,
  staticCoordinates: ReadonlyMap<string, GeocodedLocation>,
  countryCoordinates: ReadonlyMap<string, GeocodedLocation>
): GeocodedLocation | null {
  const location = resolveTaskLocation(task, coordinatesByKey, staticCoordinates);
  if (location || task.level !== 'sub-national') {
    return location;
  }

  const countryLocation = countryCoordinates.get(task.countryName.toLowerCase());
  if (!countryLocation) {
    return null;
  }

  return jitterAroundCountry(countryLocation, task.fallbackSeed ?? task.name.length);
}

function createFeature(task: GeoScopeGeocodeTask, location: GeocodedLocation): GeoScopePointFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [location.lng, location.lat]
    },
    properties: {
      level: task.level,
      name: task.name,
      countryName: task.countryName,
      count: task.count
    }
  };
}

function jitterAroundCountry(countryLocation: GeocodedLocation, seed: number): GeocodedLocation {
  const angle = ((seed * 47) % 360) * (Math.PI / 180);
  const radius = 0.35 + ((seed * 13) % 10) * 0.04;
  return {
    lng: countryLocation.lng + radius * Math.cos(angle),
    lat: countryLocation.lat + radius * Math.sin(angle) * 0.55
  };
}

function queueGeocodeTask(
  geocodeTasks: GeoScopeGeocodeTask[],
  geocodeKeys: Set<string>,
  task: GeoScopeGeocodeTask
): void {
  if (geocodeKeys.has(task.cacheKey)) {
    return;
  }
  geocodeKeys.add(task.cacheKey);
  geocodeTasks.push(task);
}

function dedupeFeatures(features: GeoScopePointFeature[]): GeoScopePointFeature[] {
  const seen = new Set<string>();
  return features.filter(feature => {
    const key = `${feature.properties.level}:${feature.properties.name}:${feature.properties.countryName}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countryCacheKey(countryName: string): string {
  return `country:${countryName.toLowerCase()}`;
}

function subNationalCacheKey(countryName: string, subNationalId: number | string, subName: string): string {
  return `sub:${countryName.toLowerCase()}:${subNationalId}:${subName.toLowerCase()}`;
}

function normalizeCount(...values: (number | undefined)[]): number {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** @deprecated Use buildGeoScopeResolutionPlan instead. */
export function buildGeoScopeGeocodeTasks(countries: readonly GeoScopeCountry[]): GeoScopeGeocodeTask[] {
  return buildGeoScopeResolutionPlan(countries).displayTasks;
}

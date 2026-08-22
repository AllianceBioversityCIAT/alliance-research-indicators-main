import type { GeoScopeCountry } from '@interfaces/geo-scope.interface';
import type { VizChartTableModel } from '@components/viz-chart/viz-chart.component';

export interface GeoChoroplethSeriesDatum {
  name: string;
  value: number;
}

/**
 * Map of ISO alpha-2 codes to geometry feature keys for edition quirks
 * where standard ISO 3166-1 alpha-2 differs from the geometry property.
 */
export const GEO_ISO_EXCEPTIONS_MAP: Readonly<Record<string, string>> = {
  FR: 'FR',
  NO: 'NO'
};

/**
 * Extracts the set of valid ISO alpha-2 codes from GeoJSON feature properties (ISO_A2, ISO_A2_EH).
 */
export function getGeometryValidIsoSet(geoJson: unknown): Set<string> {
  const validIsoSet = new Set<string>();
  if (!geoJson || typeof geoJson !== 'object') {
    return validIsoSet;
  }

  const features = (geoJson as { features?: unknown[] }).features;
  if (!Array.isArray(features)) {
    return validIsoSet;
  }

  for (const feature of features) {
    if (!feature || typeof feature !== 'object') continue;
    const properties = (feature as { properties?: Record<string, unknown> }).properties;
    if (!properties || typeof properties !== 'object') continue;

    const isoA2 = properties['ISO_A2'];
    if (typeof isoA2 === 'string') {
      const trimmed = isoA2.trim().toUpperCase();
      if (trimmed && trimmed !== '-99') {
        validIsoSet.add(trimmed);
      }
    }

    const isoA2Eh = properties['ISO_A2_EH'];
    if (typeof isoA2Eh === 'string') {
      const trimmed = isoA2Eh.trim().toUpperCase();
      if (trimmed && trimmed !== '-99') {
        validIsoSet.add(trimmed);
      }
    }
  }

  return validIsoSet;
}

/**
 * Builds series data for ECharts choropleth map series from GeoScopeCountry array.
 * Keys on ISO alpha-2 code (upper-cased) with exceptions map applied.
 * Under no circumstances is country_name used as a join key (R-GEO-003).
 */
export function buildGeoChoroplethSeriesData(
  countries: readonly GeoScopeCountry[],
  validIsoSet?: Set<string>
): GeoChoroplethSeriesDatum[] {
  if (!Array.isArray(countries)) {
    return [];
  }

  const seriesData: GeoChoroplethSeriesDatum[] = [];

  for (const country of countries) {
    if (!country) continue;
    const rawIso = country.iso_alpha_2;
    if (!rawIso || typeof rawIso !== 'string') {
      // Missing or undefined ISO code: exclude from map series without throwing
      continue;
    }

    const trimmed = rawIso.trim().toUpperCase();
    if (!trimmed || trimmed === '-99') {
      continue;
    }

    const mappedCode = GEO_ISO_EXCEPTIONS_MAP[trimmed] ?? trimmed;

    if (validIsoSet && !validIsoSet.has(mappedCode)) {
      // Code not present in geometry features: exclude from map series
      continue;
    }

    seriesData.push({
      name: mappedCode,
      value: country.count
    });
  }

  return seriesData;
}

/**
 * Builds the accessible table model for viz-chart containing ALL countries (matched and unmatched).
 */
export function buildGeoChoroplethTableModel(countries: readonly GeoScopeCountry[]): VizChartTableModel {
  const safeCountries = Array.isArray(countries) ? countries : [];
  return {
    caption: 'Geographic scope results by country',
    headers: ['Country', 'Results'],
    rows: safeCountries.map((c) => [c.country_name, c.count])
  };
}

/**
 * Calculates the maximum result count for visualMap scaling (at least 1).
 */
export function getGeoChoroplethMaxCount(countries: readonly GeoScopeCountry[]): number {
  if (!Array.isArray(countries) || countries.length === 0) {
    return 1;
  }
  let max = 1;
  for (const country of countries) {
    if (country && typeof country.count === 'number' && country.count > max) {
      max = country.count;
    }
  }
  return max;
}

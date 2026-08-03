export interface GeoScopeSubNational {
  sub_national_id: number | string;
  sub_national_name: string;
  count: number;
}

export interface GeoScopeCountry {
  iso_alpha_2?: string;
  country_name: string;
  count: number;
  top_sub_nationals?: GeoScopeSubNational[];
  results_count?: number;
}

export interface GeocodedLocation {
  lng: number;
  lat: number;
}

export type GeoScopePointLevel = 'country' | 'sub-national';

export interface GeoScopePointProperties {
  level: GeoScopePointLevel;
  name: string;
  countryName: string;
  count: number;
}

export interface GeoScopeGeocodeTask {
  cacheKey: string;
  query: string;
  level: GeoScopePointLevel;
  name: string;
  countryName: string;
  count: number;
  countryCode?: string;
  fallbackSeed?: number;
}

export interface GeoScopePointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: GeoScopePointProperties;
}

export interface GeoScopePointFeatureCollection {
  type: 'FeatureCollection';
  features: GeoScopePointFeature[];
}

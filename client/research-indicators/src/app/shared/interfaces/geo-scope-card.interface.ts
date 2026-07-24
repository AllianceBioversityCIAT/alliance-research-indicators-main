import { GeoScopeSummary } from '@interfaces/project-dashboard.interface';

export interface GeoScopeMetric {
  key: keyof GeoScopeSummary;
  label: string;
  value: number;
}

export interface GeoScopeCountrySummary {
  id: string;
  label: string;
  count: number;
  subNationals: GeoScopeSubNationalSummary[];
}

export interface GeoScopeSubNationalSummary {
  id: string;
  label: string;
  countryName: string;
  count: number;
}

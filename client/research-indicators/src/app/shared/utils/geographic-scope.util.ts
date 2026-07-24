import {
  COUNTRY_DESC_ISO_WITH_CLASS,
  COUNTRY_LABEL_SPECIFY_IMPACT,
  COUNTRY_SELECTION_TEXT,
  REGION_DESC_UN_WITH_CLASS,
  REGION_LABEL_SELECT,
  REGION_LABEL_SPECIFY_IMPACT
} from '@shared/constants/geographic-scope.constants';
import { signal } from '@angular/core';
import { Country, Region } from '@shared/interfaces/get-geo-location.interface';

export interface GeoScopeMultiselectTexts {
  country: { label: string; description: string };
  region: { label: string; description: string };
}

export function getGeoScopeMultiselectTexts(geoScopeId: number): GeoScopeMultiselectTexts {
  let countryLabel = '';
  let regionLabel = '';
  let countryDescription = '';
  let regionDescription = '';

  switch (geoScopeId) {
    case 1:
      countryLabel = COUNTRY_LABEL_SPECIFY_IMPACT;
      regionLabel = REGION_LABEL_SPECIFY_IMPACT;
      countryDescription = COUNTRY_DESC_ISO_WITH_CLASS;
      regionDescription = REGION_DESC_UN_WITH_CLASS;
      break;
    case 2:
      regionLabel = REGION_LABEL_SELECT;
      regionDescription = REGION_DESC_UN_WITH_CLASS;
      break;
    case 4:
    case 5:
      ({ countryLabel, countryDescription } = COUNTRY_SELECTION_TEXT);
      break;
    default:
      break;
  }

  return { country: { label: countryLabel, description: countryDescription }, region: { label: regionLabel, description: regionDescription } };
}

export function mapCountriesToSubnationalSignals(countries?: Country[]): void {
  countries?.forEach((country: Country) => {
    const regions = Array.isArray(country.result_countries_sub_nationals) ? country.result_countries_sub_nationals : [];

    if ('result_countries_sub_nationals_signal' in country && country.result_countries_sub_nationals_signal?.set) {
      country.result_countries_sub_nationals_signal.set({ regions });
    } else {
      country.result_countries_sub_nationals_signal = signal({ regions });
    }
  });
}

export function syncSubnationalArrayFromSignals(countries?: Country[]): void {
  countries?.forEach((country: Country) => {
    country.result_countries_sub_nationals = country.result_countries_sub_nationals_signal().regions ?? [];
  });
}

export function isRegionsRequiredByScope(geoScopeId: number): boolean {
  return geoScopeId === 2;
}

export function isCountriesRequiredByScope(geoScopeId: number): boolean {
  return [4, 5].includes(geoScopeId);
}

export function isSubNationalRequiredByScope(geoScopeId: number): boolean {
  return geoScopeId === 5;
}

export function updateCountryRegions(countries: Country[] | undefined, isoAlpha2: string, newRegions: Region[]): void {
  const country = countries?.find(c => c.isoAlpha2 === isoAlpha2);
  if (country) {
    country.result_countries_sub_nationals = newRegions;
  }
}

export function removeSubnationalRegionFromCountries(
  countries: Country[] | undefined,
  isoAlpha2: string,
  subNationalIdToRemove: number | undefined
): number | undefined {
  if (subNationalIdToRemove === undefined) return undefined;
  const target = countries?.find(c => c.isoAlpha2 === isoAlpha2);
  if (!target?.result_countries_sub_nationals_signal?.set) return undefined;

  const newRegions = (target.result_countries_sub_nationals_signal().regions ?? []).filter(r => r.sub_national_id !== subNationalIdToRemove);
  target.result_countries_sub_nationals_signal.set({ regions: newRegions });
  target.result_countries_sub_nationals = newRegions;
  return subNationalIdToRemove;
}

export function shouldShowSubnationalError(geoScopeId: number, countries?: Country[]): boolean {
  if (!isSubNationalRequiredByScope(geoScopeId)) return false;
  const list = countries ?? [];
  return list.some(
    country => !country.result_countries_sub_nationals_signal?.() || (country.result_countries_sub_nationals_signal()?.regions?.length ?? 0) === 0
  );
}

export function normalizeStepThree<
  T extends { geo_scope_id?: number; countries?: unknown[]; regions?: unknown[]; comment_geo_scope?: string | null }
>(stepThree: T): T {
  const geoScopeId = stepThree?.geo_scope_id == null ? undefined : Number(stepThree.geo_scope_id);
  const isGlobal = geoScopeId === 1;
  const rawCountries = Array.isArray(stepThree?.countries) ? stepThree?.countries : [];
  const rawRegions = Array.isArray(stepThree?.regions) ? stepThree?.regions : [];
  const countries = isGlobal
    ? []
    : rawCountries.filter((c: unknown) => {
        const co = c as { isoAlpha2?: string };
        return co?.isoAlpha2 != null && String(co.isoAlpha2).trim() !== '';
      });
  const regions = isGlobal
    ? []
    : rawRegions.filter((r: unknown) => {
        const re = r as { region_id?: number | null };
        return re?.region_id != null;
      });
  return {
    ...stepThree,
    geo_scope_id: geoScopeId,
    countries,
    regions,
    comment_geo_scope: stepThree?.comment_geo_scope ?? ''
  } as T;
}

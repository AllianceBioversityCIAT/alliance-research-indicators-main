import { WritableSignal } from '@angular/core';

export interface GetGeoLocation {
  geo_scope_id?: number | string;
  countries?: Country[];
  regions?: Region[];
  comment_geo_scope?: string;
}

export interface Region {
  region_id: number;
  sub_national_id?: number;
  name?: string;
  sub_national?: SubNational;
}

interface SubNational {
  is_active: boolean;
  id: number;
  code: string;
  name: string;
  other_names: null;
  country_iso_alpha_2: string;
  language_iso_2: string;
}

export interface Country {
  isoAlpha2: string;
  result_countries_sub_nationals: Region[];
  result_countries_sub_nationals_signal: WritableSignal<ResultCountriesSubnationalRegions>;
}

export interface ResultCountriesSubnationalRegions {
  regions?: Region[];
}

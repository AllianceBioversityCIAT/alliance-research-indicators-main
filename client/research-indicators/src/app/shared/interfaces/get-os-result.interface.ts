export interface GetOsResult {
  result_id: number;
  result_official_code: number;
  platform_code: string;
  version_id: null;
  title: string;
  description: null | string;
  indicator_id: number;
  geo_scope_id: null;
  report_year_id: number;
  result_status_id: number;
  result_status: ResultStatus;
  indicator: Indicator;
  keywords: string[];
  score: number;
}

export interface Indicator {
  name: string;
  icon_src: string;
  description: string;
  other_names: null;
  indicator_id: number;
  long_description: string;
  indicator_type_id: number;
}

export interface ResultStatus {
  name: string;
  description: null;
  result_status_id: number;
}

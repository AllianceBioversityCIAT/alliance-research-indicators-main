export interface GetResultsByContract {
  created_at: string;
  created_by: number;
  updated_at: string;
  updated_by: null | number;
  is_active: number;
  result_id: number;
  result_official_code: number;
  version_id: null;
  title: string;
  description: null | string;
  indicator_id: number;
  geo_scope_id: null;
  result_status_id: number;
  deleted_at: null;
  report_year_id: number;
  indicator: Indicator;
  result_status: Resultstatus;
  created_user: Createduser;
  indicatorName?: string;
  statusName?: string;
  creatorName?: string;
  full_name?: string;
}

interface Createduser {
  user_id: number;
  is_active: number;
  last_name: string;
  first_name: string;
}

interface Resultstatus {
  name: string;
  is_active: number;
  description: null;
  result_status_id: number;
}

interface Indicator {
  name: string;
  icon_src: string;
  is_active: number;
  description: string;
  other_names: null;
  indicator_id: number;
  long_description: string;
  indicator_type_id: number;
}

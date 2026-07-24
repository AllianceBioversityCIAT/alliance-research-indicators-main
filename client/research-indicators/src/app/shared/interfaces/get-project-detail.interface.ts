export interface GetProjectDetail {
  agreement_id?: string;
  projectDescription?: string;
  description?: string;
  project_lead_description?: string;
  start_date?: string;
  end_date?: string;
  extension_date?: string | null;
  grant_amount?: string | number;
  donor?: string;
  department?: string;
  division?: string;
  divisionId?: string;
  unit?: string;
  unitId?: string;
  full_name?: string;
  indicators?: GetProjectDetailIndicator[];
  status_name?: string;
  contract_status?: string;
}

export interface GetProjectDetailIndicator {
  indicator: IndicatorMetadata;
  count_results: number;
  full_name?: string;
  indicator_id: number;
}

interface IndicatorMetadata {
  name: string;
  icon_src: string;
  is_active: number;
  description: string;
  other_names: null;
  indicator_id: number;
  long_description: string;
  indicator_type_id: number;
}

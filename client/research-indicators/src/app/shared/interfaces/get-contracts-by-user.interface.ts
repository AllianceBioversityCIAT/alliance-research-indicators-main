export interface GetContractsByUser {
  agreement_id?: string;
  projectDescription?: null | string;
  project_lead_description?: string;
  description?: string;
  start_date?: Date;
  end_date?: Date;
  indicators?: IndicatorElement[];
  full_name?: string;
  status_name?: string;
  contract_status?: string;
}

export interface IndicatorElement {
  indicator: IndicatorIndicator;
  count_results: number;
  indicator_id: number;
}

interface IndicatorIndicator {
  name: string;
  icon_src: string;
  is_active: number;
  description: string;
  other_names: null;
  indicator_id: number;
  long_description: string;
  indicator_type_id: number;
}

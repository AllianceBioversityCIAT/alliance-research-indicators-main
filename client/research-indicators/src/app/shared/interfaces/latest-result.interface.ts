import { StatusConfig } from './result-config.interface';

export interface LatestResult {
  updated_at: Date;
  is_active: boolean;
  result_id: number;
  result_official_code: number;
  platform_code: string;
  title: string;
  description: null;
  indicator_id: number;
  result_status: ResultStatus;
  result_contracts: ResultContract;
  indicator: Indicator;
  report_year_id?: number;
  snapshot_years?: number[] | string;
  external_link?: string | null;
  public_link?: string | null;
}

export interface ResultStatus {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  result_status_id: number;
  name: string;
  description: string | null;
  config: StatusConfig;
}

export interface Indicator {
  is_active: boolean;
  indicator_id: number;
  name: string;
  other_names: null;
  description: string;
  long_description: string;
  indicator_type_id: number;
  icon_src: string;
}

export interface ResultContract {
  is_active: boolean;
  result_contract_id: number;
  result_id: number;
  contract_id: string;
  contract_role_id: number;
  is_primary: boolean;
  agresso_contract: AgressoContract;
}

export interface AgressoContract {
  is_active: boolean;
  agreement_id: string;
  contract_status: string;
  description: string;
  division: null;
  donor: string;
  donor_reference: string;
  endDateGlobal: Date;
  endDatefinance: Date;
  end_date: Date;
  entity: string;
  extension_date: Date;
  funding_type: string;
  project: string;
  projectDescription: string;
  project_lead_description: string;
  short_title: string;
  start_date: Date;
  ubwClientDescription: string;
  unit: null;
  office: null;
}

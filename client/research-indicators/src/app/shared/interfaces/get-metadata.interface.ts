import { ResultStatus } from './result-config.interface';

export interface GetMetadata {
  indicator_id?: number;
  indicator_name?: string;
  result_id?: number;
  result_official_code?: number;
  status_id?: number;
  status_name?: string;
  result_title?: string;
  created_by?: number;
  report_year?: number;
  portfolio_id?: number;
  portfolioId?: number;
  portafolio_id?: number;
  portfolio?: GetPortfolios;
  is_principal_investigator?: boolean;
  is_main_contact_person?: boolean;
  has_result_edit_grant?: boolean;
  result_contract_id?: string;
  result_status?: ResultStatus;
}

export interface GetPortfolios {
  id?: number;
  name?: string;
  description?: string;
  start_year?: number;
  end_year?: number;
}

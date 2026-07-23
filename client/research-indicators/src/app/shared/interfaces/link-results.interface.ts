import { ResultStatus, StatusConfig } from './result-config.interface';

export interface LinkResultsResponse {
  link_results: LinkResultItem[];
}

export interface IndicatorLinkPayload {
  indicator_id?: number;
  name?: string;
  icon_src?: string;
}

export interface OtherResultLinkPayload {
  result_id: number;
  result_official_code: number | string;
  title?: string;
  description?: string | null;
  indicator_id?: number;
  indicator?: IndicatorLinkPayload;
  indicator_name?: string;
  indicator_icon_src?: string;
  platform_code?: string;
  external_link?: string | null;
  public_link?: string | null;
  report_year_id?: number;
  result_status_id?: number;
  result_status?: ResultStatus;
  status_name?: string;
  status_description?: string;
  status_config?: StatusConfig;
  is_active?: boolean;
  result_contracts?: LinkResultContractRow[];
}

export interface LinkResultContractRow {
  contract_id: string;
  result_id?: number;
  is_active?: number;
  is_primary?: number;
  agresso_contract?: {
    description?: string;
    short_title?: string;
  };
}

export interface LinkResultItem {
  other_result_id: number;
  link_result_id?: number;
  result_id?: number;
  link_result_role_id?: number;
  other_result?: OtherResultLinkPayload;
}

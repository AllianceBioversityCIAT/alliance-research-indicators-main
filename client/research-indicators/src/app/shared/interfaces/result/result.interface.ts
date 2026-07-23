import { ResultStatus } from '../result-config.interface';

export interface ResultPortfolioListItem {
  is_primary?: number | boolean;
  type?: string;
  group?: string;
  category?: string;
  lever?: { short_name?: string; name?: string; full_name?: string };
  research_area?: { short_name?: string; name?: string; full_name?: string };
  short_name?: string;
  name?: string;
  full_name?: string;
}

export interface Result {
  is_active: boolean;
  result_id: number;
  result_platform: string;
  result_official_code: string;
  version_id: null;
  title: string;
  platform_code: string;
  external_link?: string;
  public_link?: string;
  description: null | string;
  indicator_id: number;
  geo_scope_id: null;
  indicators?: { name: string; icon_src: string };
  result_status?: ResultStatus;
  contract_id?: string | null;
  contract_description?: string | null;
  result_contracts?: { contract_id: string; contract?: { description?: string }; is_primary?: number };
  result_levers?: ResultPortfolioListItem[] | { lever: { short_name: string } };
  result_research_areas?: ResultPortfolioListItem[];
  research_areas?: ResultPortfolioListItem[];
  report_year_id?: number;
  created_by_user?: { first_name: string; last_name: string };
  created_at?: string;
  updated_at?: string;
  year?: string;
  snapshot_years?: number[];
}

export interface ResultTable {
  attr: string;
  header: string;
  pipe?: boolean;
}

export interface ResultFilter {
  'indicator-codes'?: number[];
  'create-user-codes'?: string[];
  'lever-codes'?: number[];
  'indicator-codes-tabs'?: number[];
  'indicator-codes-filter'?: number[];
  'status-codes'?: number[];
  'contract-codes'?: string[];
  'platform-code'?: string[];
  'result-codes'?: string[];
  years?: number[];
}

export interface GetResultsPaginationOptions {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface V2ResultsPaginationMeta {
  total: number;
  page: number;
  limit: number;
  pageSize?: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetResultsResponseData {
  results: Result[];
  total: number;
  pagination?: V2ResultsPaginationMeta;
}

export interface ResultConfig {
  indicators?: boolean;
  'result-status'?: boolean;
  contracts?: boolean;
  'primary-contract'?: boolean;
  levers?: boolean;
  'primary-lever'?: boolean;
  'audit-data'?: boolean;
  'audit-data-object'?: boolean;
}

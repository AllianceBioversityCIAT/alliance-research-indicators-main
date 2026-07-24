import { GetProjectDetailIndicator } from './get-project-detail.interface';

export interface LeverData {
  id: number;
  full_name: string;
  short_name: string;
  other_names: string;
  lever_url: string;
}

export interface FindContracts {
  agreement_id?: string;
  projectDescription?: string | null;
  project_lead_description?: string;
  description?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  status_id?: number;
  status_name?: string;
  lever_name?: string;
  lever?: { short_name?: string; name?: string } | string;
  levers?: LeverData | LeverData[];
  principal_investigator?: string;
  full_name?: string;
  center_amount?: string;
  center_amount_usd?: string;
  client?: string;
  contract_status?: string | null;
  department?: string | null;
  division?: string | null;
  donor?: string | null;
  donor_reference?: string | null;
  endDateGlobal?: string | null;
  endDatefinance?: string;
  entity?: string | null;
  extension_date?: string | null;
  funding_type?: string | null;
  grant_amount?: string;
  grant_amount_usd?: string;
  project?: string | null;
  short_title?: string;
  ubwClientDescription?: string;
  unit?: string | null;
  office?: string | null;
  display_label?: string;
  is_active?: boolean;
  indicators?: GetProjectDetailIndicator[];
  is_pool_funding_contributor?: boolean;
  /** Present when the find-contracts API loads pooled-funding relations (optional). */
  pooled_funding_contracts?: { is_active?: boolean }[];
  count_results?: number | null;
}

export interface FindContractsResponse {
  data: FindContracts[];
  metadata: FindContractsMetadata;
}

export interface FindContractsMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

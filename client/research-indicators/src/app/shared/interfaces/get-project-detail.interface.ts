import { ContractCgiarEntity } from './find-contracts.interface';
import { PooledFundingContractRef } from '@shared/constants/agresso-funding.constants';

export interface GetProjectDetail {
  agreement_id?: string;
  projectDescription?: string;
  description?: string;
  project_lead_description?: string;
  start_date?: string;
  end_date?: string;
  extension_date?: string | null;
  grant_amount?: string | number;
  grant_amount_usd?: string | number | null;
  center_amount_usd?: string | number | null;
  funding_type?: string | null;
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
  sdgs?: number[] | string[] | unknown[];
  cgiar_entities?: ContractCgiarEntity[];
  pooled_funding_contracts?: PooledFundingContractRef[] | null;
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

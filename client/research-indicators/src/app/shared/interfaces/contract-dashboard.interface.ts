import { ContractResultsSummary } from '@interfaces/contract-results-summary.interface';
import { ProjectDashboardRankedItem } from '@interfaces/project-dashboard.interface';
import { GeoScopeResponse } from '@interfaces/geo-scope.interface';
import { ContractSpAlignment } from '@interfaces/contract-sp-alignment.interface';

export interface ContractDashboardTops {
  partners: ProjectDashboardRankedItem[] | null;
  primary_levers: ProjectDashboardRankedItem[] | null;
  main_contacts: ProjectDashboardRankedItem[] | null;
  contributors: ProjectDashboardRankedItem[] | null;
}

export interface ContractLeverSpFlowLink {
  lever_id: number | null;
  lever_short_name: string;
  lever_full_name: string;
  sp_code: string | null;
  sp_name: string | null;
  role: 'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN' | null;
  count: number;
}

export interface ContractLeverSpFlows {
  contract_id: string;
  results_total: number;
  results_with_alignment: number;
  results_without_alignment: number;
  links: ContractLeverSpFlowLink[];
}

export interface ContractDashboardReport {
  summary: ContractResultsSummary | null;
  tops: ContractDashboardTops | null;
  geo_scope: GeoScopeResponse | null;
  sp_alignment: ContractSpAlignment | null;
  lever_sp_flows: ContractLeverSpFlows | null;
}

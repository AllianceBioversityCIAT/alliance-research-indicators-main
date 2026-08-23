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

export interface ContractDashboardReport {
  summary: ContractResultsSummary | null;
  tops: ContractDashboardTops | null;
  geo_scope: GeoScopeResponse | null;
  sp_alignment: ContractSpAlignment | null;
}

import type { GeoScopeCountry } from '@interfaces/geo-scope.interface';

export type ProjectDashboardChartLayout = 'columns' | 'rows' | 'rows-partners' | 'rows-stacked' | 'rows-stacked-lever';

export interface ProjectDashboardRankedListItem {
  id: string;
  label: string;
  count: number;
  iconUrl?: string;
  description?: string;
}

export interface GeoScopeSummary {
  global: number;
  regional: number;
  countries: number;
  sub_national: number;
  yet_to_be_determined: number;
}

export interface ProjectDashboardRankedItem {
  agreement_id?: string;
  contract_id?: string;
  contract_code?: string;
  contract_description?: string;
  project_name?: string;
  institution_id?: number;
  institution_name?: string;
  acronym?: string;
  partner_name?: string;
  lever_id?: number;
  short_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  contact_person_name?: string;
  lever_name?: string;
  primary_lever?: string;
  region_name?: string;
  country_name?: string;
  label?: string;
  name?: string;
  scope_type?: string;
  results_count?: number;
  contribution_count?: number;
  count?: number;
  value?: number;
}

export interface TopContributorsContractReport {
  contract_id: string;
  limit: number;
  top_contributors: ProjectDashboardRankedItem[];
}

export interface TopPartnersReport {
  contract_id: string;
  limit: number;
  top_partners: ProjectDashboardRankedItem[];
}

export interface TopMainContactPersonsReport {
  contract_id: string;
  limit: number;
  top_main_contact_persons: ProjectDashboardRankedItem[];
}

export interface TopPrimaryLeverItem {
  lever_id: number;
  short_name: string;
  full_name: string;
  count: number;
  icon?: string;
}

export interface TopPrimaryLeversReport {
  contract_id: string;
  limit: number;
  top_primary_levers: TopPrimaryLeverItem[];
}

export interface ContractStaffItem {
  name: string;
  role: string;
}

export interface ContractStaffReport {
  contract_id: string;
  staff: ContractStaffItem[];
}

export interface GeoScopeReport {
  contract_id: string;
  limit: number;
  geo_scope_summary: Partial<GeoScopeSummary>;
  top_regions: ProjectDashboardRankedItem[];
  top_countries: GeoScopeCountry[];
}

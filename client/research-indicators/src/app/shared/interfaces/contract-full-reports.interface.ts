// Client mirror of the server's `ContractFullReportsDto`
// (server/researchindicators/src/domain/entities/agresso-contract/dto/reports-full.dto.ts)
// and its nested DTOs (reports-partners, reports-primary-levers, reports-contributors,
// reports-main-contact-persons, reports-contract-staff, reports-contracts).
//
// All seven `ContractFullReportsDto` fields are mirrored here, including `geo_scope` —
// unused by this spec's four ranked charts, but required so the geographic-scope spec
// (a sibling consumer of `GET reports/full`) does not need a second, drifting interface.

/** Mirrors `PartnerByContractCountDto`. */
export interface ContractFullReportsPartner {
  institution_id: number;
  institution_name: string;
  acronym?: string;
  count: number;
}

/** Mirrors `PrimaryLeverCountDto`. */
export interface ContractFullReportsPrimaryLever {
  lever_id: number;
  short_name: string;
  full_name?: string;
  count: number;
  icon?: string | null;
}

/** Mirrors `ContributorContractCountDto`. */
export interface ContractFullReportsContributor {
  contract_id: string;
  contract_description?: string;
  project_name?: string;
  count: number;
}

/** Mirrors `MainContactPersonByContractCountDto`. `user_id` is the stable row identity (R-PDB-005). */
export interface ContractFullReportsMainContactPerson {
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  count: number;
}

/** Mirrors `ContractStaffMemberDto`. Not one of the four ranked charts; mirrored for completeness. */
export interface ContractFullReportsStaffMember {
  name: string;
  role: string;
}

/** Mirrors `SubNationalByContractCountDto`. */
export interface ContractFullReportsSubNational {
  sub_national_id: number;
  sub_national_name: string;
  count: number;
}

/** Mirrors `CountryWithSubNationalsDto`. */
export interface ContractFullReportsCountry {
  iso_alpha_2: string;
  country_name: string;
  count: number;
  top_sub_nationals: ContractFullReportsSubNational[];
}

/** Mirrors `RegionByContractCountDto`. */
export interface ContractFullReportsRegion {
  region_id: number;
  region_name: string;
  count: number;
}

/** Mirrors `GeoScopeSummaryDto`. */
export interface ContractFullReportsGeoScopeSummary {
  global: number;
  regional: number;
  countries: number;
  sub_national: number;
  yet_to_be_determined: number;
}

/** Mirrors `ContractFullGeoScopeDto`. Unused by this spec — consumed by the geographic-scope spec. */
export interface ContractFullReportsGeoScope {
  geo_scope_summary: ContractFullReportsGeoScopeSummary;
  top_regions: ContractFullReportsRegion[];
  top_countries: ContractFullReportsCountry[];
}

/**
 * Client mirror of `ContractFullReportsDto` — the payload of `GET reports/full`.
 * All seven server-side fields are represented, even though this spec's four
 * ranked charts consume only `top_partners`, `top_primary_levers`,
 * `top_main_contact_persons` and `top_contributors`.
 */
export interface ContractFullReports {
  contract_id: string;
  top_primary_levers: ContractFullReportsPrimaryLever[];
  top_contributors: ContractFullReportsContributor[];
  top_main_contact_persons: ContractFullReportsMainContactPerson[];
  staff: ContractFullReportsStaffMember[];
  top_partners: ContractFullReportsPartner[];
  geo_scope: ContractFullReportsGeoScope;
}

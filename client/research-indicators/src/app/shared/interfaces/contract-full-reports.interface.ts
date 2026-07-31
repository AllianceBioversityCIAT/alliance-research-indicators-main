// Client mirror of the server's `ContractFullReportsDto`
// (server/researchindicators/src/domain/entities/agresso-contract/dto/reports-full.dto.ts)
// and its nested DTOs (reports-partners, reports-primary-levers, reports-contributors,
// reports-main-contact-persons, reports-contract-staff, reports-contracts).
//
// All seven `ContractFullReportsDto` fields are mirrored here, including `geo_scope` —
// unused by this spec's four ranked charts, but required so the geographic-scope spec
// (a sibling consumer of `GET reports/full`) does not need a second, drifting interface.
//
// @sdd-spec docs/specs/project-dashboard/indicator-metadata-charts (T-10)
//
// Also mirrors the 10 Indicator-metadata sections added by that spec, from the
// server's `IndicatorMetadataSectionsDto` / `MetadataCountDto`
// (agresso-contract/dto/reports-indicator-metadata.dto.ts). The 10 field names
// below are fixed and were Reviewer-verified character-for-character against
// that spec's design §5 during T-02 — do not paraphrase them.

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

/**
 * Mirrors `MetadataCountDto` — the uniform shape of all 10 Indicator-metadata
 * sections (design.md §5). Always present as an array, empty rather than
 * absent or `null` (R-IMC-007 AC.2).
 *
 * `name` is typed `string | null`, not `string`, even though the server DTO
 * declares it `!: string`. Three of the ten label columns are nullable in
 * their entities (`clarisa_innovation_types.name`, `clarisa_innovation_characteristics.name`,
 * `policy_stage.description`) and the server deliberately does not `COALESCE`
 * them — live rows are populated and no AC requires a fallback, but nothing
 * in the SQL prevents a future `null` from reaching this shared shape. Model
 * that honestly here rather than assuming non-null; if a display fallback is
 * ever wanted, it belongs client-side, not as a `COALESCE` that would mint an
 * unlabelled category server-side.
 */
export interface IndicatorMetadataCount {
  id: number;
  name: string | null;
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
 * All seven pre-existing fields are represented, even though this spec's four
 * ranked charts consume only `top_partners`, `top_primary_levers`,
 * `top_main_contact_persons` and `top_contributors`.
 *
 * Plus the 10 Indicator-metadata sections (indicator-metadata-charts spec,
 * T-10). Each is always an array — empty rather than absent or `null`
 * (R-IMC-007 AC.2) — never optional.
 */
export interface ContractFullReports {
  contract_id: string;
  top_primary_levers: ContractFullReportsPrimaryLever[];
  top_contributors: ContractFullReportsContributor[];
  top_main_contact_persons: ContractFullReportsMainContactPerson[];
  staff: ContractFullReportsStaffMember[];
  top_partners: ContractFullReportsPartner[];
  geo_scope: ContractFullReportsGeoScope;

  /** Innovation Development — nature distribution (R-IMC-001). */
  innovation_nature: IndicatorMetadataCount[];

  /** Innovation Development — type distribution (R-IMC-001). */
  innovation_type: IndicatorMetadataCount[];

  /** Innovation Development — current readiness (R-IMC-001). */
  innovation_readiness: IndicatorMetadataCount[];

  /** OICR — maturity level (R-IMC-002). */
  oicr_maturity: IndicatorMetadataCount[];

  /** Policy Change — policy type (R-IMC-003). */
  policy_type: IndicatorMetadataCount[];

  /** Policy Change — stage in policy process (R-IMC-003). */
  policy_stage: IndicatorMetadataCount[];

  /** Capacity Sharing — "Training or engagement to report" (R-IMC-004). */
  session_format: IndicatorMetadataCount[];

  /** Capacity Sharing — "Training vs. Engagement" (R-IMC-004). */
  session_type: IndicatorMetadataCount[];

  /** Capacity Sharing — combined gender distribution (R-IMC-005). */
  gender_distribution: IndicatorMetadataCount[];

  /** Capacity Sharing — degree, long-term training only (R-IMC-006). */
  degree: IndicatorMetadataCount[];
}

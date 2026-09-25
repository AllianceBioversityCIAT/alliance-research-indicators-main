/**
 * Already-loaded Result aggregate for PRMS payload assembly.
 * The repository loads it; builders map it. No database and no HTTP
 * belong on this type (design.md §2.1, §5.2).
 */
export interface PrmsStaffSnapshot {
  email: string;
  first_name: string;
  last_name: string;
}

export interface PrmsScienceProgramSnapshot {
  sp_code: string;
  /** Null on legacy rows (R-BIL-126); those alignments are not syncable. */
  sp_role: 'PRIMARY' | 'CONTRIBUTING' | null;
  /**
   * ToC result the SP is aligned to. 2026-09-21: the ID is what PRMS matches on;
   * the title is kept on the snapshot because the read surface still shows it,
   * but it is no longer sent in the sync payload.
   */
  toc_result_id: number | null;
  toc_result_title: string | null;
  indicator_description: string | null;
  aligns_with_toc: boolean | null;
}

export interface PrmsContractSnapshot {
  agreement_id: string;
  /**
   * CLARISA project short name for this contract, from
   * `bilateral_project_mapping.clarisa_project_short_name` (e.g. `B-A1080`).
   * Null when the contract has no active mapping row, or the row has no short
   * name. PRMS resolves the project by this value, not by `agreement_id`.
   */
  clarisa_project_short_name: string | null;
  /**
   * `bilateral_project_mapping.clarisa_external_code`. Measured 2026-09-21: it
   * equals `agreement_id` in all 199 active rows, because a migration backfilled
   * it as `TRIM(UPPER(agresso_agreement_id))`. Kept only as the middle rung of
   * the grant_title fallback.
   */
  clarisa_external_code: string | null;
  description: string | null;
  ubwClientDescription: string | null;
  is_primary: boolean;
}

export interface PrmsRegionSnapshot {
  um49code: number;
  name: string;
}

export interface PrmsCountrySnapshot {
  id: number;
  name: string;
  iso_alpha_3: string;
  iso_alpha_2: string;
}

export interface PrmsSubnationalSnapshot {
  id: number;
  name: string;
}

export interface PrmsPartnerSnapshot {
  institution_id: number;
  acronym: string | null;
  name: string;
}

export interface PrmsEvidenceSnapshot {
  link: string;
  description: string | null;
  is_private: boolean;
}

export interface PrmsSubmittedBySnapshot {
  staff: PrmsStaffSnapshot;
  submitted_date: Date;
  comment: string | null;
}

/**
 * Type-specific tables loaded with the aggregate so T-07/T-08 builders
 * do not need a second read (design.md §5.2). Common-fields ignores them.
 */
export interface PrmsSyncTypeSlices {
  capacity_sharing: Record<string, unknown> | null;
  innovation_dev: Record<string, unknown> | null;
  policy_change: Record<string, unknown> | null;
  innovation_use: Record<string, unknown> | null;
  actors: Record<string, unknown>[];
  institution_types: Record<string, unknown>[];
  quantifications: Record<string, unknown>[];
}

export interface PrmsSyncAggregate {
  result_id: number;
  result_official_code: number | string;
  indicator_id: number | null;
  created_at: Date;
  title: string | null;
  description: string | null;
  geo_scope_id: number | null;
  is_partner_not_applicable: boolean;
  created_by: PrmsStaffSnapshot | null;
  submitted_by: PrmsSubmittedBySnapshot | null;
  lead_contact: PrmsStaffSnapshot | null;
  primary_contract: PrmsContractSnapshot | null;
  contracts: PrmsContractSnapshot[];
  science_programs: PrmsScienceProgramSnapshot[];
  regions: PrmsRegionSnapshot[];
  countries: PrmsCountrySnapshot[];
  subnational_areas: PrmsSubnationalSnapshot[];
  partners: PrmsPartnerSnapshot[];
  evidence: PrmsEvidenceSnapshot[];
  type_slices?: PrmsSyncTypeSlices;
}

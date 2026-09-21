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
  toc_result_title: string | null;
  indicator_description: string | null;
  aligns_with_toc: boolean | null;
}

export interface PrmsContractSnapshot {
  agreement_id: string;
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

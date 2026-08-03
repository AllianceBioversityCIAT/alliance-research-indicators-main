// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.11 / R-BIL-076
//
// Response shape for GET /api/v1/results/:resultCode/bilateral/science-programs.
// `mapping_status` distinguishes "no active mapping" (200 with empty list)
// from "mapped but no Confirmed SPs in active portfolio" (200 with empty
// list too — the FE can tell the difference by also reading `clarisa_project`).
export type MappingStatus = 'mapped' | 'unmapped';

export interface BilateralScienceProgramItem {
  code: string; // e.g. "SP09" (from CLARISA global_unit_object.smo_code)
  name: string; // CLARISA global_unit_object.name (trimmed)
  category: string | null; // CLARISA cgiar_entity_type_object.name OR catalog fallback
  color: string | null; // local clarisa_science_programs fallback
  icon_key: string | null; // local clarisa_science_programs fallback
  allocation: number | null; // % from CLARISA mapping (0..100)
}

export interface BilateralProjectRef {
  id: number;
  short_name: string;
}

export interface BilateralScienceProgramsResponse {
  result_code: string;
  mapping_status: MappingStatus;
  clarisa_project: BilateralProjectRef | null;
  science_programs: BilateralScienceProgramItem[];
}

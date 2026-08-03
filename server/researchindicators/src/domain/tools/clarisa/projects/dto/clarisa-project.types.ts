// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.10 / R-BIL-076
//
// TypeScript shapes mirroring CLARISA /api/projects, narrowed to the fields
// we consume. Source: live probe of https://api.clarisa.cgiar.org/api/projects
// (2026-05-25). Upstream fields we don't use are deliberately omitted; add
// them here on first need rather than carrying dead weight.

export interface ClarisaCgiarEntityType {
  code: number;
  name: string; // 'Science programs' | 'Scaling programs' | 'Accelerators' | 'Key Area of Work' | ...
  prefix?: string | null; // 'SP' | 'AOW' | ... — used by T-15.12 to find AOW entries
  level?: number | null;
  portfolio_id?: number | null;
}

export interface ClarisaPortfolio {
  id: number;
  name?: string;
  acronym: string; // e.g. 'P25'
  start_date?: string;
  end_date?: string;
}

export interface ClarisaGlobalUnit {
  id: number;
  name: string;
  short_name?: string | null;
  acronym?: string | null;
  smo_code: string; // e.g. 'SP09' (level 1) or 'AOW06' (level 2)
  year?: number;
  level?: number; // 1 = Science Program, 2 = Key Area of Work (AOW)
  parent_id?: number | null; // AOW entries point at their parent SP's `id`
  global_unit_type_id?: number; // 22/23/24 = SP, 26 = AOW (test data 2026-05-27)
  portfolio_id?: number;
  cgiar_entity_type_object?: ClarisaCgiarEntityType;
  portfolio_object?: ClarisaPortfolio;
}

export type ClarisaProjectMappingStatus =
  | 'Confirmed'
  | 'Pending'
  | 'Draft'
  | string;

export interface ClarisaProjectMapping {
  id: number;
  project_id: number;
  program_id: number;
  allocation: number; // 0..100
  complementarity?: string | null;
  efficiencies?: string | null;
  comments?: string | null;
  status: ClarisaProjectMappingStatus;
  global_unit_object: ClarisaGlobalUnit;
}

export interface ClarisaInstitutionRef {
  id: number;
  name: string;
  acronym?: string | null;
}

export interface ClarisaProject {
  id: number;
  short_name: string;
  full_name?: string;
  summary?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: string;
  annual?: string;
  source_of_funding: string; // 'Bilateral' | 'Window 3' | ...
  organization_code?: number | null;
  funder_code?: string | null;
  lead_institution_object?: ClarisaInstitutionRef | null;
  funder_institution_object?: ClarisaInstitutionRef | null;
  project_mappings_array?: ClarisaProjectMapping[];
}

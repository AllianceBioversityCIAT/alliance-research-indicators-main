// @sdd-spec docs/specs/changes/executive-overview-grounded-context — T-02 / R-EOC-001, design.md §3
//
// Mirrors the server's `ContractClarisaProjectDto`
// (server/researchindicators/src/domain/entities/agresso-contract/dto/contract-clarisa-project.dto.ts).
// Projected subset of the upstream CLARISA `ClarisaProject` shape returned by
// GET agresso/contracts/:agreementId/clarisa-project.

export interface ContractClarisaInstitution {
  id: number;
  name: string;
  acronym?: string | null;
}

export interface ContractClarisaScienceProgramAllocation {
  code: string;
  name: string;
  allocation: number;
}

export interface ContractClarisaProject {
  id: number;
  short_name: string;
  full_name?: string;
  summary?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: string;
  annual?: string;
  funder_institution?: ContractClarisaInstitution | null;
  lead_institution?: ContractClarisaInstitution | null;
  external_code?: string | null;
  phase?: string | number | null;
  science_programs: ContractClarisaScienceProgramAllocation[];
}

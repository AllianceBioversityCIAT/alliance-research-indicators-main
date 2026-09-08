// @akili-spec docs/specs/bilateral/clarisa-phase-config-variable — T-02 / R-CPC-003, NFR-CPC-002
//
// Response shape for GET /api/tools/clarisa/projects/phases. Mirrors the
// distinct `phase` values present in the ELIGIBLE (bilateral + Alliance)
// cohort — see ClarisaProjectsService.getEligiblePhases() — plus a separate
// count of projects whose phase could not be resolved to a year
// (null/undefined/blank/non-numeric). Powers the admin-editable year
// selector in the Configuration Variables edit modal (design.md §5, §7.2).

export interface ClarisaProjectPhaseCount {
  /** A distinct phase value present in the eligible cohort, e.g. 2025. */
  phase: number;
  /** Number of eligible projects carrying this phase. */
  count: number;
}

export interface ClarisaProjectPhasesResponse {
  /** Distinct phases with their project counts, ordered descending by phase. */
  phases: ClarisaProjectPhaseCount[];
  /**
   * Count of eligible projects whose phase is absent (null/undefined/blank)
   * or not resolvable to a numeric year. Lets the client distinguish
   * "CLARISA publishes no phase data" from "there are no projects"
   * (R-CPC-003 scenario 2).
   */
  phaseAbsentCount: number;
}

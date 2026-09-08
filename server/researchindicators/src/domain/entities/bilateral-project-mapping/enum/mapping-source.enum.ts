// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 / R-BIL-079 / D-PI-8
// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-00 / NFR-CAM-004 (DD-2)
//
// DERIVED: the CLARISA automapper (S2) writes this for rows it creates
// deterministically (prefix strip + exact-key lookup, no inference). Kept
// distinct from AI_SUGGESTED/AI_AUTO, which stay reserved for a future
// inferential matcher — see design.md Section 3 and Section 12 DD-2.
export enum MappingSourceEnum {
  MANUAL = 'MANUAL',
  AI_SUGGESTED = 'AI_SUGGESTED',
  AI_AUTO = 'AI_AUTO',
  DERIVED = 'DERIVED',
}

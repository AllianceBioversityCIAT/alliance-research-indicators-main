// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// Response shape for
//   GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators
//
// Design notes (see ../execution.md T-15.12 entry):
//   - AOW (Area of Work) is NOT exposed by CLARISA at the project level, but
//     IS exposed inside `project_mappings_array[]` as level-2 entries
//     (`global_unit_type_id === 26`, prefix "AOW") whose `parent_id` points
//     at the level-1 SP entry's `id`. The FE passes no params; the backend
//     derives (program=parent_SP, areaOfWork=AOW) pairs from the mapped
//     CLARISA project and fans out one PRMS call per pair.
//   - `aow_status` lets the FE distinguish three valid 200 shapes:
//       * `unmapped`           — no bilateral_project_mapping row
//       * `no_aow_mappings`    — mapped, but the CLARISA project carries
//                                only SP-level entries (no AOWs). PRMS
//                                cannot answer without an AOW, so `pairs`
//                                is empty.
//       * `has_aow`            — mapped + ≥ 1 (SP, AOW) pair derived;
//                                `pairs` contains one entry per pair.

import {
  PrmsTocIndicator,
  PrmsTocResult,
} from '../../../tools/prms-toc/dto/prms-toc.types';

export type BilateralHlosAowStatus = 'unmapped' | 'no_aow_mappings' | 'has_aow';

export interface BilateralHlosPair {
  program: string; // SP code, e.g. "SP01"
  area_of_work: string; // AOW code, e.g. "AOW06"
  composite_code: string; // `${program}-${area_of_work}` — mirrors PRMS upstream
  outcomes: PrmsTocResult[];
  outputs: PrmsTocResult[];
  metadata: {
    total: number;
    outcomes: number;
    outputs: number;
  };
}

export interface BilateralHlosIndicatorsResponse {
  result_code: string;
  mapping_status: 'mapped' | 'unmapped';
  aow_status: BilateralHlosAowStatus;
  clarisa_project: { id: number; short_name: string } | null;
  pairs: BilateralHlosPair[];
}

// Re-export so callers (controllers, specs) can import PRMS types from one place.
export type { PrmsTocIndicator, PrmsTocResult };

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// Response shape for
//   GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators
//
// Design notes (see ../execution.md T-15.12 entry):
//   - The FE passes no params. The backend takes the Science Program(s) from
//     the mapped CLARISA project, looks up each SP's Areas of Work in the
//     canonical `GET /api/cgiar-entities?version=2` catalog, and fans out one
//     PRMS call per (program, areaOfWork) pair. Pairs PRMS has no ToC data for
//     are dropped, so `pairs[]` only carries AOWs that actually have HLOs.
//     (The project's own embedded AOW entries are unusable — all point at the
//     same global parent_id — so the catalog is the source of the SP→AOW link.)
//   - `aow_status` lets the FE distinguish three valid 200 shapes:
//       * `unmapped`           — no bilateral_project_mapping row
//       * `no_aow_mappings`    — mapped, but nothing to show: the project has
//                                no Confirmed SP in the active portfolio, the
//                                catalog lists no AOWs for those SPs, or PRMS
//                                has ToC data for none of the derived pairs.
//                                `pairs` is empty.
//       * `has_aow`            — mapped + ≥ 1 (SP, AOW) pair with ToC data;
//                                `pairs` contains one entry per populated pair.

import {
  PrmsTocIndicator,
  PrmsTocResult,
} from '../../../tools/prms-toc/dto/prms-toc.types';

export type BilateralHlosAowStatus = 'unmapped' | 'no_aow_mappings' | 'has_aow';

export interface BilateralHlosPair {
  program: string; // SP code, e.g. "SP01"
  program_name: string; // SP display name, e.g. "Breeding for Tomorrow" (falls back to code)
  area_of_work: string; // AOW code, e.g. "AOW06"
  area_of_work_name: string; // AOW display name from the cgiar-entities catalog (falls back to code)
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

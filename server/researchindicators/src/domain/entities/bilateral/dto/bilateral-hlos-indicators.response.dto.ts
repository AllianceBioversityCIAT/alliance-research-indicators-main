// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090, R-BIL-091, R-BIL-097
// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-04 / R-BIL-090 (Swagger: design §5)
//
// Response shape for
//   GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators
//
// FROZEN FE envelope (design §5) — byte-compatible with the STAR client
// handoff §4. The FE builds Jest fixtures against these exact field names;
// do NOT rename without a spec change.
//
// T-04 note: these are `@ApiProperty`-annotated CLASSES (not interfaces) so
// the §5 shape renders at `/swagger` via `@ApiResponse({ type: ... })` on the
// controller handler. They are still consumed as pure structural types by
// `BilateralService` — never instantiated — so the wire shape is unchanged.
//
// Design notes (see ../design.md §5 / §6.1):
//   - Catalogs are keyed (Science Program, level) and sourced from lambda-toc
//     via `TocIntegrationService` — the legacy (SP, AOW)-pair PRMS fan-out
//     (`pairs` / `aow_status` / `no_aow_mappings`) is gone (R-BIL-090 AC.2).
//   - `result_type` + `allowed_levels` are computed server-side ONLY, via
//     `utils/toc-level-rules.util.ts` (single source of truth, D-V2-3).
//     `allowed_levels: []` ⇒ `catalogs: []` and zero upstream calls.
//   - `version_locked` = result's live version year !== MAPPABLE_LIVE_VERSION
//     (2026, D-V2-7). Catalogs are still returned when locked — the FE
//     renders the locked state (R-BIL-097).
//   - Every top-level field is present in EVERY response variant, including
//     unmapped (`mapping_status: 'unmapped'`, `catalogs: []`).
//   - An upstream `{"response":[]}` for an (SP, level) is a VALID empty
//     catalog: the level entry stays with `toc_results: []` (R-BIL-090 AC.5).

import { ApiProperty } from '@nestjs/swagger';
import { TocLevel } from '../../../tools/toc-integration/dto/toc-integration.types';

export type BilateralTocMappingStatus = 'mapped' | 'unmapped';

const TOC_LEVELS: TocLevel[] = ['OUTPUT', 'OUTCOME', 'EOI'];

export class BilateralTocCatalogIndicator {
  @ApiProperty({ example: 5972 })
  indicator_id: number;

  @ApiProperty({ example: 'Number of new market intelligence briefs' })
  indicator_description: string;

  // Renamed on the wire from the upstream typo `unit_messurament` (D-V2-4).
  @ApiProperty({ example: 'Number' })
  unit_of_measurement: string;

  // Unfiltered passthrough (OQ-V2-2).
  @ApiProperty({ example: 'Number of knowledge products' })
  type_value: string;

  // Resolved from upstream `targets[]` for target_year — the 11-element
  // array never appears on the wire (R-BIL-090 AC.3).
  @ApiProperty({ type: String, nullable: true, example: '10' })
  target_value: string | null;

  @ApiProperty({ example: 2026, description: 'MAPPABLE_LIVE_VERSION (2026)' })
  target_year: number;
}

export class BilateralTocCatalogResult {
  @ApiProperty({ example: 5187 })
  toc_result_id: number;

  @ApiProperty({ example: 'HLO1.AOW1.IO1 Steer to impact' })
  title: string;

  @ApiProperty({ example: 'Market intelligence is packaged into…' })
  description: string;

  // Upstream `wp_short_name`; null for `EOI`-level results.
  @ApiProperty({ type: String, nullable: true, example: 'AOW01' })
  aow_code: string | null;

  @ApiProperty({ type: () => [BilateralTocCatalogIndicator] })
  indicators: BilateralTocCatalogIndicator[];
}

export class BilateralTocLevelCatalog {
  @ApiProperty({ enum: TOC_LEVELS, example: 'OUTPUT' })
  level: TocLevel;

  @ApiProperty({ type: () => [BilateralTocCatalogResult] })
  toc_results: BilateralTocCatalogResult[];
}

export class BilateralSpCatalog {
  @ApiProperty({ example: 'SP01' })
  sp_code: string; // e.g. "SP01"

  // One entry per allowed level, in rule order.
  @ApiProperty({ type: () => [BilateralTocLevelCatalog] })
  levels: BilateralTocLevelCatalog[];
}

export class BilateralTocProjectRef {
  @ApiProperty({ example: 123 })
  id: number;

  @ApiProperty({ example: 'EMBRAPA - …' })
  short_name: string;
}

export class BilateralHlosIndicatorsResponse {
  @ApiProperty({ example: 'STAR-5238' })
  result_code: string;

  @ApiProperty({ enum: ['mapped', 'unmapped'], example: 'mapped' })
  mapping_status: BilateralTocMappingStatus;

  @ApiProperty({ type: () => BilateralTocProjectRef, nullable: true })
  clarisa_project: BilateralTocProjectRef | null;

  // Canonical backend-owned key, e.g. 'capacity_sharing' (TocResultTypeKey).
  @ApiProperty({ example: 'capacity_sharing' })
  result_type: string;

  @ApiProperty({ enum: TOC_LEVELS, isArray: true, example: ['OUTPUT'] })
  allowed_levels: TocLevel[];

  @ApiProperty({ example: false })
  version_locked: boolean;

  // One entry per SP, in deterministic SP order.
  @ApiProperty({ type: () => [BilateralSpCatalog] })
  catalogs: BilateralSpCatalog[];
}

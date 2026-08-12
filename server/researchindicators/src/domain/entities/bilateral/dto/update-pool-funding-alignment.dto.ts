import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TocLevel } from '../../../tools/toc-integration/dto/toc-integration.types';

// T-05 note: a class (not an interface) — it is nested inside AlignmentResponse
// via `@ApiProperty({ type: () => [SelectedLeverResponse] })`, and Swagger's
// `type: () => X` factory can only reference a runtime value, not an
// interface (erased at compile time). Still consumed as a pure structural
// type by `BilateralService` — never `new`s this — so the wire shape is
// unchanged (R-BIL-114 AC.2).
export class SelectedLeverResponse {
  @ApiProperty({ type: String })
  lever_code: string;

  @ApiProperty({ type: String })
  lever_name: string;
}

// T-05 note: same class-not-interface reasoning as SelectedLeverResponse above.
export class SelectedScienceProgramResponse {
  @ApiProperty({ type: String })
  code: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  category: string | null;

  @ApiProperty({ type: String, nullable: true })
  color: string | null;

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.4 / R-BIL-074
  // Stable per-SP FE asset key (defaults to `code` until per-SP branding splits).
  @ApiPropertyOptional({ type: String, nullable: true })
  icon_key?: string | null;

  // Optional — populated when the entry came from the CLARISA per-result path
  // (R-BIL-076). Null when the source is the local alignment row (legacy lever
  // catalog), which doesn't carry allocations.
  @ApiPropertyOptional({ type: Number, nullable: true })
  allocation?: number | null;
}

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-07 / R-BIL-096, R-BIL-095
// @sdd-spec docs/specs/bilateral/toc-optional-mapping — T-05 / R-BIL-114 (Swagger: design §6.3, D-C1-10)
//
// One saved per-SP ToC alignment in the frozen §5 read-back shape (D-V2-5).
// Snapshot-sourced EXCLUSIVELY from `result_pool_funding_toc_alignment` —
// never live from lambda-toc (R-BIL-095 AC.1). The stored column
// `unit_messurament` (verbatim upstream spelling, D-V2-4) is renamed to
// `unit_of_measurement` at the wire. ToC refs + snapshot fields are null
// for "No" rows (`aligns_with_toc: false`).
//
// T-05 note: a `@ApiProperty`-annotated CLASS (not an interface), following
// the module's own precedent (`bilateral-hlos-indicators.response.dto.ts`
// T-04 note) — Swagger cannot introspect an interface. Still consumed as a
// pure structural type by `BilateralService` (`toTocAlignmentReadback`
// returns an object literal, never `new`s this) — the wire shape is
// unchanged (R-BIL-114 AC.2 / design §5.3).
//
// Partial-row null contract (R-BIL-114, toc-optional-mapping): when
// `aligns_with_toc: true` but no `indicator_id` was ever supplied (Level +
// HLO floor only, R-BIL-111 A-1), `indicator_id`, `indicator_description`,
// `unit_of_measurement`, `target_value`, and `target_year` are `null` — the
// row has no indicator to derive them from. `toc_result_title` stays
// populated because the ToC result itself IS chosen. `target_year` in
// particular must stay null rather than default to the live mappable
// version, so a partial row never claims a target year for a target it has
// no indicator for. Every field is null for a "No" row
// (`aligns_with_toc: false`).
export class TocAlignmentReadbackResponse {
  @ApiProperty({ type: String, example: 'SP01' })
  sp_code: string;

  @ApiProperty({
    type: Boolean,
    description:
      "Per-SP answer: does this result align with this SP's Theory of Change?",
  })
  aligns_with_toc: boolean;

  @ApiProperty({
    enum: ['OUTPUT', 'OUTCOME', 'EOI'],
    nullable: true,
    example: 'OUTPUT',
    description: 'Null when aligns_with_toc is false.',
  })
  level: TocLevel | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 5187,
    description: 'Null when aligns_with_toc is false.',
  })
  toc_result_id: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 5972,
    description:
      'Null when aligns_with_toc is false, OR when aligns_with_toc is true but no indicator was chosen — a "Yes" may stop at Level + HLO (R-BIL-111, R-BIL-114 AC.1).',
  })
  indicator_id: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 10,
    description:
      'Null when aligns_with_toc is false, or when no indicator was chosen for the row.',
  })
  quantitative_contribution: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'HLO1.AOW1.IO1 Steer to impact',
    description:
      'Always populated when a ToC result is chosen (aligns_with_toc: true), independent of whether an indicator was also chosen. Null only when aligns_with_toc is false.',
  })
  toc_result_title: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Market intelligence is packaged into…',
    description:
      'Null when aligns_with_toc is false, or when no indicator was chosen for the row.',
  })
  indicator_description: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Number',
    description:
      'Null when aligns_with_toc is false, or when no indicator was chosen for the row.',
  })
  unit_of_measurement: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '10',
    description:
      'Null when aligns_with_toc is false, or when no indicator was chosen for the row.',
  })
  target_value: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2026,
    description:
      'MAPPABLE_LIVE_VERSION (2026) when an indicator was chosen. Null when aligns_with_toc is false, or when no indicator was chosen — a partial row must not claim a target year for a target it has no indicator for.',
  })
  target_year: number | null;
}

// @sdd-spec docs/specs/bilateral/toc-optional-mapping — T-05 / R-BIL-114 (Swagger: design §6.3, D-C1-10)
//
// T-05 note: same class-not-interface reasoning as `TocAlignmentReadbackResponse`
// above. Still consumed as a pure structural type by `BilateralService`
// (`getAlignment` / `updateAlignment` return object literals, never `new`s
// this) — the wire shape is unchanged.
export class AlignmentResponse {
  @ApiProperty({ type: String, example: 'STAR-5238' })
  result_code: string;

  @ApiProperty({ type: Boolean })
  eligible: boolean;

  @ApiProperty({ type: Boolean })
  has_pool_funding_alignment_eligible: boolean;

  @ApiProperty({ type: Boolean, nullable: true })
  has_contribution: boolean | null;

  @ApiProperty({ type: () => [SelectedLeverResponse] })
  selected_levers: SelectedLeverResponse[];

  @ApiProperty({ type: () => [SelectedScienceProgramResponse] })
  selected_science_programs: SelectedScienceProgramResponse[];

  @ApiProperty({ type: Boolean })
  is_synced_to_prms: boolean;

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.2 / R-BIL-071
  // Union of two gates:
  //   1. PRMS-sourced (`platform_code === 'PRMS'`) — PRMS owns the data, STAR is read-only.
  //   2. Synced to PRMS (`is_synced_to_prms === true`) — STAR-sourced result already pushed.
  // Writes against either condition return 409 even for SYSTEM_ADMIN.
  @ApiProperty({
    type: Boolean,
    description:
      'Union of PRMS-sourced OR is_synced_to_prms. Writes against either condition return 409 even for SYSTEM_ADMIN.',
  })
  is_read_only: boolean;

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-07 / R-BIL-096, R-BIL-097
  // `report_year_id !== MAPPABLE_LIVE_VERSION (2026)` — same Number(...)
  // comparison as the hlos-indicators read (D-V2-7).
  @ApiProperty({
    type: Boolean,
    description:
      'report_year_id !== MAPPABLE_LIVE_VERSION (2026) — same comparison as the hlos-indicators read.',
  })
  version_locked: boolean;

  @ApiProperty({
    type: () => [TocAlignmentReadbackResponse],
    description:
      'Active rows only, ordered sp_code ASC; snapshot-sourced (R-BIL-095). Always present — [] when there are no saved rows or the result is not pool-funding-eligible.',
  })
  toc_alignments: TocAlignmentReadbackResponse[];
}

// @sdd-spec docs/specs/bilateral/toc-optional-mapping — T-03 / R-BIL-111, R-BIL-113
//
// One per-SP ToC alignment answer (design §5 PATCH contract). Field-presence
// rules conditioned on `aligns_with_toc` are enforced in BilateralService as
// structural validation — the per-alignment `{ sp_code, field, error }` 400
// contract owns them (design §6.1), NOT class-validator. The required floor
// for `aligns_with_toc: true` is `level` + `toc_result_id` only
// (R-BIL-111 §5.1, D-C1-3); `indicator_id` and `quantitative_contribution`
// are optional, but each supplied field is still catalog-validated
// (R-BIL-113), and a supplied `quantitative_contribution` without an
// `indicator_id` is rejected with `contribution_without_indicator`
// (R-BIL-113 AC.6).
export class TocAlignmentInputDto {
  @ApiProperty({
    type: String,
    maxLength: 50,
    example: 'SP01',
    description:
      'Science Program code. Must be present in the effective sp_codes of the same request.',
  })
  @IsString()
  @MaxLength(50)
  sp_code!: string;

  @ApiProperty({
    type: Boolean,
    description:
      "Per-SP answer: does this result align with this SP's Theory of Change?",
  })
  @IsBoolean()
  aligns_with_toc!: boolean;

  @ApiPropertyOptional({
    enum: ['OUTPUT', 'OUTCOME', 'EOI'],
    description:
      'ToC catalog level. Required when aligns_with_toc is true (Level + HLO floor, R-BIL-111); must be in the result type’s allowed_levels (R-BIL-094).',
  })
  @IsOptional()
  @IsIn(['OUTPUT', 'OUTCOME', 'EOI'])
  level?: TocLevel;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Upstream ToC result id. Required when aligns_with_toc is true (Level + HLO floor, R-BIL-111); validated against the (SP, level) catalog.',
  })
  @IsOptional()
  @IsInt()
  toc_result_id?: number;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Upstream indicator id. Optional even when aligns_with_toc is true — a "Yes" may stop at Level + HLO (R-BIL-111). When supplied, validated against the chosen ToC result’s indicators (R-BIL-113 AC.3).',
  })
  @IsOptional()
  @IsInt()
  indicator_id?: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Quantitative contribution (numeric, nullable). Requires indicator_id to be present — a contribution is expressed in the selected indicator’s unit of measurement, so supplying it without an indicator_id returns 400 contribution_without_indicator (R-BIL-113 AC.6).',
  })
  @IsOptional()
  @IsNumber()
  quantitative_contribution?: number | null;
}

export class UpdatePoolFundingAlignmentDto {
  @ApiProperty({
    type: Boolean,
    description: 'Whether the result contributes to Pool Funding',
  })
  @IsBoolean()
  has_contribution!: boolean;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Selected CGIAR Science Program codes (SP01–SP13). Preferred over lever_codes.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sp_codes?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'DEPRECATED — use sp_codes. Kept for backwards compatibility.',
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lever_codes?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Optional change justification for audit history',
  })
  @IsOptional()
  @IsString()
  justification?: string;

  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092, R-BIL-097
  @ApiPropertyOptional({
    type: [TocAlignmentInputDto],
    description:
      'Per-SP ToC alignments (independent upsert per sp_code). Omitted = saved ToC alignment rows are left untouched (R-BIL-092). When present, the request is gated to live version 2026 (R-BIL-097).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TocAlignmentInputDto)
  toc_alignments?: TocAlignmentInputDto[];
}

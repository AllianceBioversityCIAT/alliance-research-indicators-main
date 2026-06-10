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

export interface SelectedLeverResponse {
  lever_code: string;
  lever_name: string;
}

export interface SelectedScienceProgramResponse {
  code: string;
  name: string;
  category: string | null;
  color: string | null;
  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.4 / R-BIL-074
  // Stable per-SP FE asset key (defaults to `code` until per-SP branding splits).
  icon_key?: string | null;
  // Optional — populated when the entry came from the CLARISA per-result path
  // (R-BIL-076). Null when the source is the local alignment row (legacy lever
  // catalog), which doesn't carry allocations.
  allocation?: number | null;
}

export interface AlignmentResponse {
  result_code: string;
  eligible: boolean;
  has_pool_funding_alignment_eligible: boolean;
  has_contribution: boolean | null;
  selected_levers: SelectedLeverResponse[];
  selected_science_programs: SelectedScienceProgramResponse[];
  is_synced_to_prms: boolean;
  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.2 / R-BIL-071
  // Union of two gates:
  //   1. PRMS-sourced (`platform_code === 'PRMS'`) — PRMS owns the data, STAR is read-only.
  //   2. Synced to PRMS (`is_synced_to_prms === true`) — STAR-sourced result already pushed.
  // Writes against either condition return 409 even for SYSTEM_ADMIN.
  is_read_only: boolean;
}

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092, R-BIL-094
//
// One per-SP ToC alignment answer (design §5 PATCH contract). Field-presence
// rules conditioned on `aligns_with_toc` (level/toc_result_id/indicator_id
// required when true) are enforced in BilateralService as structural
// validation — the per-alignment `{ sp_code, field, error }` 400 contract
// owns them (design §6.3 step 2b), NOT class-validator.
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
      'ToC catalog level. Required when aligns_with_toc is true; must be in the result type’s allowed_levels (R-BIL-094).',
  })
  @IsOptional()
  @IsIn(['OUTPUT', 'OUTCOME', 'EOI'])
  level?: TocLevel;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Upstream ToC result id. Required when aligns_with_toc is true; validated against the (SP, level) catalog.',
  })
  @IsOptional()
  @IsInt()
  toc_result_id?: number;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Upstream indicator id. Required when aligns_with_toc is true; validated against the chosen ToC result’s indicators.',
  })
  @IsOptional()
  @IsInt()
  indicator_id?: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Quantitative contribution (numeric, nullable).',
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

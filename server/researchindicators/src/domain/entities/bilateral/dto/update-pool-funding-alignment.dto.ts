import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

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
  is_read_only: boolean;
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
}

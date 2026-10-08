import { ApiProperty } from '@nestjs/swagger';
import { PfmChipEnum } from '../enum/pfm-chip.enum';
import { PfmMappingStateEnum } from '../enum/pfm-mapping-state.enum';
import { PfmPrmsStatusEnum } from '../enum/pfm-prms-status.enum';
import { PfmScopeEnum } from '../enum/pfm-scope.enum';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05
// Swagger-only shapes of design §4. The runtime values are built by the pure
// functions in derivation/ and returned as plain objects.

export class PfmKpisDto {
  @ApiProperty() projects: number;
  @ApiProperty() projects_total: number;
  @ApiProperty() monitored: number;
  @ApiProperty() need_attention: number;
  @ApiProperty() synced: number;
  @ApiProperty() in_prms_scope: number;
}

export class PfmPipelineStageDto {
  @ApiProperty() key: string;
  @ApiProperty({ enum: ['in_star', 'in_prms', 'out_of_scope'] }) group: string;
  @ApiProperty() value: number;
}

export class PfmPipelineDto {
  @ApiProperty() total: number;
  @ApiProperty() in_scope: number;
  @ApiProperty() not_synced: number;
  @ApiProperty() in_prms: number;
  @ApiProperty() out_of_scope: number;
  @ApiProperty({ type: [PfmPipelineStageDto] }) stages: PfmPipelineStageDto[];
}

export class PfmSpCoverageDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() synced: number;
  @ApiProperty() total: number;
}

export class PfmMonthlyDto {
  @ApiProperty({ example: '2026-10' }) month: string;
  @ApiProperty() synced: number;
}

export class PfmSummaryResponseDto {
  @ApiProperty({ enum: PfmScopeEnum }) scope: PfmScopeEnum;
  @ApiProperty({
    description:
      'True when the authenticated user leads or is an active delegate of at least one contributing project, whatever scope is selected.',
  })
  is_pi_of_any: boolean;
  @ApiProperty({ type: PfmKpisDto }) kpis: PfmKpisDto;
  @ApiProperty({ type: PfmPipelineDto }) pipeline: PfmPipelineDto;
  @ApiProperty({ type: [PfmSpCoverageDto] }) sp_coverage: PfmSpCoverageDto[];
  @ApiProperty({ type: [PfmMonthlyDto] }) monthly: PfmMonthlyDto[];
  @ApiProperty({
    description:
      'Distinct monitored results with an ACCEPTED sync in the current UTC calendar year.',
  })
  synced_this_year: number;
}

export class PfmCodeNameDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
}

export class PfmSpGroupOptionDto {
  @ApiProperty() category: string;
  @ApiProperty({ type: [PfmCodeNameDto] }) items: PfmCodeNameDto[];
}

export class PfmTypeOptionDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class PfmFilterOptionsDto {
  @ApiProperty({ type: [PfmCodeNameDto] }) projects: PfmCodeNameDto[];
  @ApiProperty({ type: [PfmSpGroupOptionDto] })
  science_programs: PfmSpGroupOptionDto[];
  @ApiProperty({ type: [PfmTypeOptionDto] }) types: PfmTypeOptionDto[];
}

export class PfmChipCountsDto {
  @ApiProperty() all: number;
  @ApiProperty() attention: number;
  @ApiProperty() mapping: number;
  @ApiProperty() ready: number;
  @ApiProperty() pending: number;
  @ApiProperty() prms_rejected: number;
  @ApiProperty() synced: number;
}

export class PfmGroupCountsDto {
  @ApiProperty() approved: number;
  @ApiProperty() pending: number;
  @ApiProperty() rejected: number;
  @ApiProperty() out_of_scope: number;
  @ApiProperty() not_sent: number;
}

export class PfmGroupDto {
  @ApiProperty() code: string;
  @ApiProperty({ nullable: true, type: String }) name: string | null;
  @ApiProperty({ nullable: true, type: String }) lead_pi: string | null;
  @ApiProperty({ nullable: true, type: String }) donor: string | null;
  @ApiProperty() result_count: number;
  @ApiProperty() attention: number;
  @ApiProperty({ type: PfmGroupCountsDto }) counts: PfmGroupCountsDto;
}

export class PfmTotalsDto {
  @ApiProperty() results: number;
  @ApiProperty() projects: number;
  @ApiProperty() monitored_total: number;
}

export class PfmQueueResponseDto {
  @ApiProperty({ type: PfmFilterOptionsDto })
  filter_options: PfmFilterOptionsDto;
  @ApiProperty({
    type: PfmChipCountsDto,
    description: `Counts over the filtered set BEFORE the chip is applied. Chips: ${Object.values(PfmChipEnum).join(', ')}.`,
  })
  chip_counts: PfmChipCountsDto;
  @ApiProperty({ type: [PfmGroupDto] }) groups: PfmGroupDto[];
  @ApiProperty({ type: PfmTotalsDto }) totals: PfmTotalsDto;
}

export class PfmSpRefDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) color: string | null;
}

export class PfmResultRowDto {
  @ApiProperty({
    example: 'STAR-1234',
    description: 'Platform + official code.',
  })
  result_code: string;
  @ApiProperty({ example: 'STAR' }) platform_code: string;
  @ApiProperty({ example: 1234 }) official_code: number;
  @ApiProperty() report_year: number;
  @ApiProperty({
    type: [Number],
    description: 'Active snapshot years, newest first.',
  })
  snapshot_years: number[];
  @ApiProperty({ nullable: true, type: String }) title: string | null;
  @ApiProperty({ nullable: true, type: String }) type: string | null;
  @ApiProperty() star_label: string;
  @ApiProperty() star_status_id: number;
  @ApiProperty() pi_line: string;
  @ApiProperty({ enum: PfmMappingStateEnum }) mapping_state: string;
  @ApiProperty() mapping_note: string;
  @ApiProperty() sp_line: string;
  @ApiProperty({ type: PfmSpRefDto, nullable: true })
  primary_sp: PfmSpRefDto | null;
  @ApiProperty({ type: [PfmSpRefDto] }) contributing: PfmSpRefDto[];
  @ApiProperty({ enum: PfmPrmsStatusEnum }) prms_status: string;
  @ApiProperty() prms_hint: string;
  @ApiProperty({
    description:
      'Server-formatted "dd Mon, HH:mm" (UTC); "—" when results.updated_at is null.',
  })
  updated_at: string;
}

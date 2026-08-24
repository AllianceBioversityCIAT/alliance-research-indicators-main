import { ApiProperty } from '@nestjs/swagger';
import { SectionMetaDto } from './contract-indicator-details-report.dto';

// ---------------------------------------------------------------------------
// Reach (result_actors) — portfolio-wide gender x youth disaggregation
// ---------------------------------------------------------------------------

export class ReachDisaggregationDto {
  @ApiProperty({ type: Number, description: 'Sum of women youth reached' })
  women_youth!: number;

  @ApiProperty({ type: Number, description: 'Sum of women non-youth reached' })
  women_not_youth!: number;

  @ApiProperty({ type: Number, description: 'Sum of men youth reached' })
  men_youth!: number;

  @ApiProperty({ type: Number, description: 'Sum of men non-youth reached' })
  men_not_youth!: number;

  @ApiProperty({
    type: Number,
    description: 'Total individuals reached across the four disaggregations',
  })
  total!: number;
}

export class ReachByActorTypeDto extends ReachDisaggregationDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Actor type id',
  })
  actor_type_id!: number | null;

  @ApiProperty({
    type: String,
    description:
      'Actor type display name (custom name when the type is "other")',
  })
  actor_type_name!: string;
}

export class ReachSectionDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for portfolio reach',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: ReachDisaggregationDto,
    description:
      'Overall gender and youth reach totals (rows with NULL disaggregation columns excluded from sums)',
  })
  overall!: ReachDisaggregationDto;

  @ApiProperty({
    type: ReachByActorTypeDto,
    isArray: true,
    description: 'Gender and youth reach broken down by actor type',
  })
  by_actor_type!: ReachByActorTypeDto[];

  @ApiProperty({
    type: Number,
    description:
      'Count of rows flagged sex_age_disaggregation_not_apply (excluded from the disaggregation sums)',
  })
  not_disaggregated_rows!: number;
}

// ---------------------------------------------------------------------------
// SDG coverage (result_sdgs + clarisa_sdgs)
// ---------------------------------------------------------------------------

export class SdgCoverageItemDto {
  @ApiProperty({ type: Number, description: 'CLARISA SDG id' })
  sdg_id!: number;

  @ApiProperty({ type: String, description: 'SDG short name' })
  short_name!: string;

  @ApiProperty({ type: String, description: 'SDG full name' })
  full_name!: string;

  @ApiProperty({
    type: Number,
    description: 'Distinct count of results reporting this SDG',
  })
  count!: number;
}

export class SdgCoverageSectionDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for SDG coverage',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: SdgCoverageItemDto,
    isArray: true,
    description:
      'Results per SDG; the client derives declared/reported comparisons against the F1 hero SDG list',
  })
  sdgs!: SdgCoverageItemDto[];
}

// ---------------------------------------------------------------------------
// Evidence (result_evidences + evidence_roles)
// ---------------------------------------------------------------------------

export class EvidenceRoleCountDto {
  @ApiProperty({ type: Number, description: 'Evidence role id' })
  evidence_role_id!: number;

  @ApiProperty({ type: String, description: 'Evidence role display name' })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of evidence records with this role',
  })
  count!: number;
}

export class EvidenceSectionDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for evidence completeness',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: Number,
    description: 'Distinct count of results with at least one evidence record',
  })
  results_with_evidence!: number;

  @ApiProperty({
    type: Number,
    description: 'Total evidence records across contributing results',
  })
  evidences_total!: number;

  @ApiProperty({
    type: Number,
    description: 'Count of evidence records marked public (is_private = FALSE)',
  })
  public_count!: number;

  @ApiProperty({
    type: Number,
    description: 'Count of evidence records marked private (is_private = TRUE)',
  })
  private_count!: number;

  @ApiProperty({
    type: EvidenceRoleCountDto,
    isArray: true,
    description: 'Evidence record counts broken down by evidence role',
  })
  by_role!: EvidenceRoleCountDto[];
}

// ---------------------------------------------------------------------------
// Review flow (result_review_history)
// ---------------------------------------------------------------------------

export class ReviewFlowEventTypeCountDto {
  @ApiProperty({ type: String, description: 'Review history event type' })
  event_type!: string;

  @ApiProperty({
    type: String,
    description:
      'Server-resolved display label for event_type (R-IN-001 C-3 — no bare ids; falls back to the raw code for an unknown/future value)',
  })
  label!: string;

  @ApiProperty({ type: Number, description: 'Count of events of this type' })
  count!: number;
}

export class ReviewFlowDecisionCountDto {
  @ApiProperty({ type: String, description: 'Review history decision value' })
  decision!: string;

  @ApiProperty({
    type: String,
    description:
      'Server-resolved display label for decision (R-IN-001 C-3 — no bare ids; falls back to the raw code for an unknown/future value)',
  })
  label!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of events carrying this decision',
  })
  count!: number;
}

export class ReviewFlowCycleTimeDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Median days from first submission-type event to first approval-type decision; null when sample_size is 0',
  })
  median_days!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'P90 days for the same cycle-time distribution',
  })
  p90_days!: number | null;

  @ApiProperty({
    type: Number,
    description:
      'Number of results that contributed a valid cycle-time duration',
  })
  sample_size!: number;
}

export class ReviewFlowSectionDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for review flow',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: ReviewFlowEventTypeCountDto,
    isArray: true,
    description: 'Counts of review history events per event_type',
  })
  by_event_type!: ReviewFlowEventTypeCountDto[];

  @ApiProperty({
    type: ReviewFlowDecisionCountDto,
    isArray: true,
    description: 'Counts of review history events per decision',
  })
  by_decision!: ReviewFlowDecisionCountDto[];

  @ApiProperty({
    type: ReviewFlowCycleTimeDto,
    description: 'Submission-to-approval cycle time statistics',
  })
  cycle_time!: ReviewFlowCycleTimeDto;

  @ApiProperty({
    type: Number,
    description:
      'Count of results excluded from cycle-time stats due to out-of-order or missing anchor events',
  })
  excluded_for_incomplete_history!: number;
}

// ---------------------------------------------------------------------------
// Contributing levers (result_levers where is_primary = FALSE)
// ---------------------------------------------------------------------------

export class ContributingLeverItemDto {
  @ApiProperty({ type: Number, description: 'CLARISA lever id' })
  lever_id!: number;

  @ApiProperty({ type: String, description: 'Lever short name' })
  short_name!: string;

  @ApiProperty({ type: String, description: 'Lever full name' })
  full_name!: string;

  @ApiProperty({
    type: Number,
    description:
      'Distinct count of results contributing this non-primary lever',
  })
  count!: number;
}

export class ContributingLeversSectionDto {
  @ApiProperty({
    type: SectionMetaDto,
    description:
      'Result coverage metadata for contributing (non-primary) levers',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: ContributingLeverItemDto,
    isArray: true,
    description: 'Results per non-primary lever (is_primary = FALSE)',
  })
  levers!: ContributingLeverItemDto[];
}

// ---------------------------------------------------------------------------
// Keywords (result_keywords, normalized)
// ---------------------------------------------------------------------------

export class KeywordCountDto {
  @ApiProperty({
    type: String,
    description: 'Normalized keyword (trim, lowercase, collapsed whitespace)',
  })
  keyword!: string;

  @ApiProperty({
    type: Number,
    description: 'Distinct count of results reporting this keyword',
  })
  count!: number;
}

export class KeywordsSectionDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for keywords',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: KeywordCountDto,
    isArray: true,
    description:
      'Top 30 normalized keywords ordered by count desc, then keyword asc',
  })
  keywords!: KeywordCountDto[];
}

// ---------------------------------------------------------------------------
// Top-level aggregate DTO
// ---------------------------------------------------------------------------

export class ContractInsightsReportDto {
  @ApiProperty({
    type: ReachSectionDto,
    nullable: true,
    description:
      'Portfolio-wide reach aggregate; null if computation failed. Never omitted (n = 0 is the empty signal).',
  })
  reach!: ReachSectionDto | null;

  @ApiProperty({
    type: SdgCoverageSectionDto,
    nullable: true,
    description:
      'SDG coverage aggregate; null if computation failed. Never omitted (n = 0 is the empty signal).',
  })
  sdg_coverage!: SdgCoverageSectionDto | null;

  @ApiProperty({
    type: EvidenceSectionDto,
    nullable: true,
    description:
      'Evidence completeness aggregate; null if computation failed. Never omitted (n = 0 is the empty signal).',
  })
  evidence!: EvidenceSectionDto | null;

  @ApiProperty({
    type: ReviewFlowSectionDto,
    nullable: true,
    description:
      'Review funnel and cycle-time aggregate; null if computation failed. Never omitted (n = 0 is the empty signal).',
  })
  review_flow!: ReviewFlowSectionDto | null;

  @ApiProperty({
    type: ContributingLeversSectionDto,
    nullable: true,
    description:
      'Contributing (non-primary) levers aggregate; null if computation failed. Never omitted (n = 0 is the empty signal).',
  })
  contributing_levers!: ContributingLeversSectionDto | null;

  @ApiProperty({
    type: KeywordsSectionDto,
    nullable: true,
    description:
      'Keywords treemap aggregate; null if computation failed. Never omitted (n = 0 is the empty signal).',
  })
  keywords!: KeywordsSectionDto | null;
}

export class ContractInsightsResponseDto {
  @ApiProperty({
    type: ContractInsightsReportDto,
    description: 'Contract cross-cutting insights report data',
  })
  data!: ContractInsightsReportDto;

  @ApiProperty({
    description: 'Response description',
    example: 'Contract insights report retrieved successfully',
  })
  description!: string;

  @ApiProperty({
    type: Number,
    description: 'HTTP status code',
    example: 200,
  })
  status!: number;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'List of partial failure errors, if any',
    example: ['sdg_coverage: query timeout'],
  })
  errors?: string[];
}

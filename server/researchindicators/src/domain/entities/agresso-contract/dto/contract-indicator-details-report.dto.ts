import { ApiProperty } from '@nestjs/swagger';

export class SectionMetaDto {
  @ApiProperty({
    type: Number,
    description:
      'Total primary-contract results for this indicator type on the contract',
  })
  total_results!: number;

  @ApiProperty({
    type: Number,
    description:
      'Number of results contributing satellite metadata (n <= total_results)',
  })
  n!: number;
}

export class ReportingVelocityItemDto {
  @ApiProperty({
    type: String,
    description: 'Month in YYYY-MM format',
    example: '2026-03',
  })
  month!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of results created in this month',
  })
  count!: number;
}

// ---------------------------------------------------------------------------
// Capacity Sharing DTOs
// ---------------------------------------------------------------------------

export class CapacitySharingGenderSplitDto {
  @ApiProperty({
    type: String,
    description: 'Gender category: female, male, or non_binary',
    example: 'female',
  })
  gender!: string;

  @ApiProperty({
    type: Number,
    description: 'Sum of participants in this gender category',
  })
  count!: number;
}

export class CapacitySharingNamedCountDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Identifier for the lookup category, if available',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Display name of the category',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of results in this category',
  })
  count!: number;
}

export class CapacitySharingDetailsDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for capacity sharing',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: Number,
    description: 'Total participants/trainees across contributing sessions',
  })
  total_trainees!: number;

  @ApiProperty({
    type: CapacitySharingGenderSplitDto,
    isArray: true,
    description: 'Breakdown of participants by gender',
  })
  gender_split!: CapacitySharingGenderSplitDto[];

  @ApiProperty({
    type: CapacitySharingNamedCountDto,
    isArray: true,
    description:
      'Breakdown of sessions by length (e.g., Short-term, Long-term)',
  })
  session_lengths!: CapacitySharingNamedCountDto[];

  @ApiProperty({
    type: CapacitySharingNamedCountDto,
    isArray: true,
    description:
      'Breakdown of sessions by delivery modality (e.g., Virtual, In person)',
  })
  delivery_modalities!: CapacitySharingNamedCountDto[];

  @ApiProperty({
    type: CapacitySharingNamedCountDto,
    isArray: true,
    description:
      'Breakdown of sessions by session type (e.g., Individual, Group)',
  })
  session_types!: CapacitySharingNamedCountDto[];
}

// ---------------------------------------------------------------------------
// Innovation Development DTOs
// ---------------------------------------------------------------------------

export class InnovationDevReadinessLevelDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Readiness level id',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Readiness level name/title',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Numeric readiness level (e.g., 1 to 9)',
  })
  level!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Count of innovations at this readiness level',
  })
  count!: number;
}

export class InnovationDevNamedCountDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Lookup id if available',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Display name',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of results',
  })
  count!: number;
}

export class InnovationDevScalabilityProfileDto {
  @ApiProperty({
    type: String,
    description: 'Scalability dimension key/column name',
    example: 'is_cheaper_than_alternatives',
  })
  key!: string;

  @ApiProperty({
    type: String,
    description: 'Scalability dimension display name/label',
    example: 'Cheaper than alternatives',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of answers where value is TRUE (1)',
  })
  true_count!: number;

  @ApiProperty({
    type: Number,
    description: 'Count of answered (non-NULL) records for this dimension',
  })
  answered_count!: number;
}

export class InnovationDevDetailsDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for innovation development',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: InnovationDevReadinessLevelDto,
    isArray: true,
    description:
      'Histogram of innovations by readiness level (ordered by level)',
  })
  readiness_levels!: InnovationDevReadinessLevelDto[];

  @ApiProperty({
    type: InnovationDevNamedCountDto,
    isArray: true,
    description: 'Breakdown of innovations by innovation type',
  })
  innovation_types!: InnovationDevNamedCountDto[];

  @ApiProperty({
    type: InnovationDevNamedCountDto,
    isArray: true,
    description: 'Breakdown of innovations by innovation nature/characteristic',
  })
  innovation_natures!: InnovationDevNamedCountDto[];

  @ApiProperty({
    type: InnovationDevNamedCountDto,
    isArray: true,
    description: 'Breakdown of innovations by anticipated users',
  })
  anticipated_users!: InnovationDevNamedCountDto[];

  @ApiProperty({
    type: InnovationDevScalabilityProfileDto,
    isArray: true,
    description:
      'Scalability 7-dimension profile with true_count and answered_count',
  })
  scalability_profile!: InnovationDevScalabilityProfileDto[];
}

// ---------------------------------------------------------------------------
// Knowledge Product DTOs
// ---------------------------------------------------------------------------

export class KnowledgeProductStatusCountDto {
  @ApiProperty({
    type: String,
    description: 'Status or open-access label',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of knowledge products in this status',
  })
  count!: number;
}

export class KnowledgeProductTypeCountDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Lookup id or null if text-based',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Display name of the knowledge product type',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of knowledge products of this type',
  })
  count!: number;
}

export class KnowledgeProductPublicationYearDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Publication year extracted from publication_date, or null if unparseable',
  })
  year!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Count of knowledge products published in this year',
  })
  count!: number;
}

export class KnowledgeProductDetailsDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for knowledge products',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: KnowledgeProductStatusCountDto,
    isArray: true,
    description:
      'Open-access split (e.g. Open Access vs Restricted vs Unknown)',
  })
  open_access_split!: KnowledgeProductStatusCountDto[];

  @ApiProperty({
    type: KnowledgeProductStatusCountDto,
    isArray: true,
    description: 'Access status breakdown (e.g. Published, In Press, etc.)',
  })
  access_status!: KnowledgeProductStatusCountDto[];

  @ApiProperty({
    type: KnowledgeProductTypeCountDto,
    isArray: true,
    description: 'Breakdown by knowledge product type',
  })
  types!: KnowledgeProductTypeCountDto[];

  @ApiProperty({
    type: KnowledgeProductPublicationYearDto,
    isArray: true,
    description: 'Publications grouped by publication year',
  })
  publications_by_year!: KnowledgeProductPublicationYearDto[];
}

// ---------------------------------------------------------------------------
// Policy Change DTOs
// ---------------------------------------------------------------------------

export class PolicyChangeStageFunnelDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Policy stage id',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Policy stage display name',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Stage order for funnel display',
  })
  order!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Count of policy change results in this stage',
  })
  count!: number;
}

export class PolicyChangeTypeDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Policy type id',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Policy type display name',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of policy change results of this type',
  })
  count!: number;
}

export class PolicyChangeDetailsDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for policy change',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: PolicyChangeStageFunnelDto,
    isArray: true,
    description: 'Stage funnel steps ordered by policy stage order',
  })
  stage_funnel!: PolicyChangeStageFunnelDto[];

  @ApiProperty({
    type: PolicyChangeTypeDto,
    isArray: true,
    description: 'Breakdown by policy type',
  })
  policy_types!: PolicyChangeTypeDto[];

  @ApiProperty({
    type: Number,
    description:
      'Distinct count of implicated institutions (result_institutions role 4)',
  })
  implicated_institutions_count!: number;
}

// ---------------------------------------------------------------------------
// OICR DTOs
// ---------------------------------------------------------------------------

export class OicrMaturityLevelDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Maturity level id',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Maturity level display name',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of OICR results at this maturity level',
  })
  count!: number;
}

export class OicrExternalUseSplitDto {
  @ApiProperty({
    type: String,
    description:
      'External use label (e.g. External use, Internal / Not specified)',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of OICR results in this category',
  })
  count!: number;
}

export class OicrDetailsDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for OICRs',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: OicrMaturityLevelDto,
    isArray: true,
    description: 'Distribution of OICRs across maturity levels',
  })
  maturity_levels!: OicrMaturityLevelDto[];

  @ApiProperty({
    type: OicrExternalUseSplitDto,
    isArray: true,
    description: 'External use breakdown',
  })
  external_use_split!: OicrExternalUseSplitDto[];
}

// ---------------------------------------------------------------------------
// Innovation Use DTOs
// ---------------------------------------------------------------------------

export class InnovationUseDisaggregationDto {
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
    description: 'Total individuals reached across disaggregations',
  })
  total!: number;
}

export class InnovationUseActorReachDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Actor type id',
  })
  actor_type_id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Actor type name',
  })
  actor_type_name!: string;

  @ApiProperty({ type: Number, description: 'Sum of women youth' })
  women_youth!: number;

  @ApiProperty({ type: Number, description: 'Sum of women non-youth' })
  women_not_youth!: number;

  @ApiProperty({ type: Number, description: 'Sum of men youth' })
  men_youth!: number;

  @ApiProperty({ type: Number, description: 'Sum of men non-youth' })
  men_not_youth!: number;

  @ApiProperty({ type: Number, description: 'Total reach for this actor type' })
  total!: number;
}

export class InnovationUseGenderYouthReachDto {
  @ApiProperty({
    type: InnovationUseDisaggregationDto,
    description: 'Overall gender and youth reach totals',
  })
  overall!: InnovationUseDisaggregationDto;

  @ApiProperty({
    type: InnovationUseActorReachDto,
    isArray: true,
    description: 'Gender and youth reach broken down by actor type',
  })
  by_actor_type!: InnovationUseActorReachDto[];
}

export class InnovationUseOrgTypeDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Institution/organization type id',
  })
  id!: number | null;

  @ApiProperty({
    type: String,
    description: 'Organization type display name',
  })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of institution types linked to innovation use',
  })
  count!: number;
}

export class InnovationUseQuantificationDto {
  @ApiProperty({
    type: String,
    description: 'Unit of measurement (e.g. Hectares, People, USD)',
  })
  unit!: string;

  @ApiProperty({
    type: Number,
    description: 'Total quantified sum for this unit',
  })
  total!: number;

  @ApiProperty({
    type: Number,
    description: 'Count of quantifications reported under this unit',
  })
  count!: number;
}

export class InnovationUseDetailsDto {
  @ApiProperty({
    type: SectionMetaDto,
    description: 'Result coverage metadata for innovation use',
  })
  meta!: SectionMetaDto;

  @ApiProperty({
    type: InnovationUseGenderYouthReachDto,
    description:
      'Gender and youth reach disaggregations (overall and by actor type)',
  })
  gender_youth_reach!: InnovationUseGenderYouthReachDto;

  @ApiProperty({
    type: InnovationUseOrgTypeDto,
    isArray: true,
    description: 'Breakdown by organization type',
  })
  organization_types!: InnovationUseOrgTypeDto[];

  @ApiProperty({
    type: InnovationUseQuantificationDto,
    isArray: true,
    description: 'Quantifications grouped by unit',
  })
  quantifications!: InnovationUseQuantificationDto[];
}

// ---------------------------------------------------------------------------
// Top-level Aggregate DTO
// ---------------------------------------------------------------------------

export class ContractIndicatorDetailsReportDto {
  @ApiProperty({
    type: CapacitySharingDetailsDto,
    nullable: true,
    required: false,
    description:
      'Capacity sharing aggregate details; omitted if contract has zero capacity sharing results, null if computation failed',
  })
  capacity_sharing?: CapacitySharingDetailsDto | null;

  @ApiProperty({
    type: InnovationDevDetailsDto,
    nullable: true,
    required: false,
    description:
      'Innovation development aggregate details; omitted if contract has zero innovation development results, null if computation failed',
  })
  innovation_dev?: InnovationDevDetailsDto | null;

  @ApiProperty({
    type: KnowledgeProductDetailsDto,
    nullable: true,
    required: false,
    description:
      'Knowledge product aggregate details; omitted if contract has zero knowledge product results, null if computation failed',
  })
  knowledge_product?: KnowledgeProductDetailsDto | null;

  @ApiProperty({
    type: PolicyChangeDetailsDto,
    nullable: true,
    required: false,
    description:
      'Policy change aggregate details; omitted if contract has zero policy change results, null if computation failed',
  })
  policy_change?: PolicyChangeDetailsDto | null;

  @ApiProperty({
    type: OicrDetailsDto,
    nullable: true,
    required: false,
    description:
      'OICR aggregate details; omitted if contract has zero OICR results, null if computation failed',
  })
  oicr?: OicrDetailsDto | null;

  @ApiProperty({
    type: InnovationUseDetailsDto,
    nullable: true,
    required: false,
    description:
      'Innovation use aggregate details; omitted if contract has zero innovation use results, null if computation failed',
  })
  innovation_use?: InnovationUseDetailsDto | null;

  @ApiProperty({
    type: ReportingVelocityItemDto,
    isArray: true,
    nullable: true,
    required: false,
    description:
      'Results created per month over the last 24 months, ordered by month ASC; null if computation failed',
  })
  reporting_velocity?: ReportingVelocityItemDto[] | null;
}

export class ContractIndicatorDetailsResponseDto {
  @ApiProperty({
    type: ContractIndicatorDetailsReportDto,
    description: 'Contract indicator details report data',
  })
  data!: ContractIndicatorDetailsReportDto;

  @ApiProperty({
    description: 'Response description',
    example: 'Contract indicator details report retrieved successfully',
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
    example: ['capacity_sharing: query timeout'],
  })
  errors?: string[];
}

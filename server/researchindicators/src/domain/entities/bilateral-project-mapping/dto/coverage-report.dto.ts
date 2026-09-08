import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CodeCollision } from '../utils/external-code.util';

// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-05 / R-CPA-004 / R-CPA-006

export class AllianceSelectorAgreementDto {
  @ApiProperty({
    description:
      'Count of projects matched by both spec selector (CIAT/BIOVERSITY phase) and legacy selector (ABC lead)',
    example: 340,
  })
  both_selectors!: number;

  @ApiProperty({
    description:
      'Count of projects matched by spec selector only (CIAT/BIOVERSITY phase but lead institution is not ABC)',
    example: 40,
  })
  spec_selector_only!: number;

  @ApiProperty({
    description:
      'Count of projects matched by legacy selector only (lead institution is ABC but outside CIAT/BIOVERSITY phase)',
    example: 12,
  })
  legacy_selector_only!: number;
}

export class HasProjectMappingsDto {
  @ApiProperty({
    description: 'Number of projects with mappings',
    example: 120,
  })
  with_mappings!: number;

  @ApiProperty({
    description: 'Number of projects without mappings',
    example: 260,
  })
  without_mappings!: number;
}

export class DescriptionPopulatedDto {
  @ApiProperty({
    description: 'Number of projects with populated description',
    example: 350,
  })
  populated!: number;

  @ApiProperty({
    description: 'Number of projects with empty description',
    example: 30,
  })
  empty!: number;
}

export class ExternalCodePopulatedDto {
  @ApiProperty({
    description: 'Number of projects with populated external_code',
    example: 380,
  })
  populated!: number;

  @ApiProperty({
    description: 'Number of projects with empty external_code',
    example: 0,
  })
  empty!: number;
}

export class ClarisaSplitsDto {
  @ApiProperty({
    description: 'Total number of projects in the evaluated slice',
    example: 380,
  })
  slice_size!: number;

  @ApiProperty({
    description:
      'Distribution of projects by trimmed uppercase source_center_acronym',
    example: { CIAT: 250, BIOVERSITY: 130 },
  })
  source_center_acronym!: Record<string, number>;

  @ApiProperty({
    description:
      'Distribution of projects by trimmed uppercase source_of_funding',
    example: { BILATERAL: 342, WINDOW3: 38 },
  })
  source_of_funding!: Record<string, number>;

  @ApiProperty({ type: () => HasProjectMappingsDto })
  has_project_mappings!: HasProjectMappingsDto;

  @ApiProperty({ type: () => DescriptionPopulatedDto })
  description_populated!: DescriptionPopulatedDto;

  @ApiProperty({ type: () => ExternalCodePopulatedDto })
  external_code_populated!: ExternalCodePopulatedDto;

  @ApiProperty({ type: () => AllianceSelectorAgreementDto })
  alliance_selector_agreement!: AllianceSelectorAgreementDto;
}

export class ResolutionTierDto {
  @ApiProperty({
    description: 'Count of bilateral contracts classified into this tier',
    example: 150,
  })
  count!: number;

  @ApiProperty({
    description: 'Percentage of total bilateral contracts (0.00 - 100.00)',
    example: 45.5,
  })
  percentage!: number;

  @ApiProperty({
    description: 'Numerator used for the percentage calculation',
    example: 150,
  })
  numerator!: number;

  @ApiProperty({
    description: 'Denominator used for the percentage calculation',
    example: 330,
  })
  denominator!: number;
}

export class ResolutionDto {
  @ApiProperty({ type: () => ResolutionTierDto })
  EXACT_CODE!: ResolutionTierDto;

  @ApiProperty({ type: () => ResolutionTierDto })
  NORMALIZED_CODE!: ResolutionTierDto;

  @ApiProperty({ type: () => ResolutionTierDto })
  FULL_NAME!: ResolutionTierDto;

  @ApiProperty({ type: () => ResolutionTierDto })
  AMBIGUOUS!: ResolutionTierDto;

  @ApiProperty({ type: () => ResolutionTierDto })
  UNRESOLVED!: ResolutionTierDto;
}

export class CodeCollisionDto implements CodeCollision {
  @ApiProperty({
    description: 'Normalized external code that experienced a collision',
    example: 'A500',
  })
  normalizedCode!: string;

  @ApiProperty({
    description: 'Array of CLARISA project IDs involved in the collision',
    type: [Number],
    example: [101, 102],
  })
  projectIds!: number[];
}

export class NormalizationReportDto {
  @ApiProperty({
    description: 'Number of collided normalized codes',
    example: 0,
  })
  collision_count!: number;

  @ApiProperty({ type: () => [CodeCollisionDto] })
  collisions!: CodeCollision[];
}

export class CoverageSampleDto {
  @ApiProperty({ description: 'AGRESSO agreement_id', example: 'A100' })
  agreement_id!: string;

  @ApiPropertyOptional({
    description: 'Matched CLARISA project ID, or null',
    nullable: true,
    example: 101,
  })
  clarisa_project_id?: number | null;

  @ApiPropertyOptional({
    description: 'Value or code matched on, or null',
    nullable: true,
    example: 'A100',
  })
  matched_on?: string | null;
}

export class CoverageSamplesByTierDto {
  @ApiProperty({ type: () => [CoverageSampleDto] })
  EXACT_CODE!: CoverageSampleDto[];

  @ApiProperty({ type: () => [CoverageSampleDto] })
  NORMALIZED_CODE!: CoverageSampleDto[];

  @ApiProperty({ type: () => [CoverageSampleDto] })
  FULL_NAME!: CoverageSampleDto[];

  @ApiProperty({ type: () => [CoverageSampleDto] })
  AMBIGUOUS!: CoverageSampleDto[];

  @ApiProperty({ type: () => [CoverageSampleDto] })
  UNRESOLVED!: CoverageSampleDto[];
}

export class CoverageReportEnvironmentDto {
  @ApiProperty({
    description: 'CLARISA host measured',
    example: 'https://clarisatest-back.ciat.cgiar.org/',
  })
  clarisa_host!: string;

  @ApiProperty({
    description: 'Whether the upstream external_code contract is available',
    example: true,
  })
  upstream_contract_available!: boolean;
}

export class CoverageReportDefinitionsDto {
  @ApiProperty({ description: 'Bilateral contract predicate description' })
  bilateral_contract_predicate!: string;

  @ApiProperty({ description: 'Normalization rules applied' })
  normalization_rules!: string;
}

export class CoverageReportAgressoDto {
  @ApiProperty({
    description: 'Total active bilateral contracts considered',
    example: 330,
  })
  bilateral_contract_total!: number;
}

export class CoverageReportDto {
  @ApiProperty({ type: () => CoverageReportEnvironmentDto })
  environment!: CoverageReportEnvironmentDto;

  @ApiProperty({
    description: 'ISO timestamp of measurement',
    example: '2026-08-14T12:00:00.000Z',
  })
  measured_at!: string;

  @ApiProperty({
    description: 'Numeric phase applied for the evaluation',
    example: 2026,
  })
  phase_used!: number;

  @ApiProperty({ type: () => CoverageReportDefinitionsDto })
  definitions!: CoverageReportDefinitionsDto;

  @ApiProperty({ type: () => ClarisaSplitsDto })
  clarisa!: ClarisaSplitsDto;

  @ApiPropertyOptional({ type: () => CoverageReportAgressoDto, nullable: true })
  agresso!: CoverageReportAgressoDto | null;

  @ApiPropertyOptional({ type: () => ResolutionDto, nullable: true })
  resolution!: ResolutionDto | null;

  @ApiPropertyOptional({ type: () => NormalizationReportDto, nullable: true })
  normalization!: NormalizationReportDto | null;

  @ApiPropertyOptional({ type: () => CoverageSamplesByTierDto, nullable: true })
  samples!: CoverageSamplesByTierDto | null;
}

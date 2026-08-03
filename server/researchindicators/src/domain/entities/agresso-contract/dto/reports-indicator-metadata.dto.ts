import { ApiProperty } from '@nestjs/swagger';

/**
 * Uniform shape for every Indicator-metadata aggregation section on
 * `reports/full`'s payload. Always present as an array — empty rather than
 * `null` or absent (R-IMC-007 AC.2), ordered `count DESC, id ASC`
 * (design.md §5).
 */
export class MetadataCountDto {
  @ApiProperty({ type: Number })
  id!: number;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Number })
  count!: number;
}

/**
 * The 10 Indicator-metadata sections added to `ContractFullReportsDto`
 * (`reports-full.dto.ts`), per `requirements.md` §4.1 / design.md §5.
 *
 * Declared as an interface — not a class — so `ContractFullReportsDto` can
 * `implements` it: every member here is required (`MetadataCountDto[]`,
 * never `?`), so declaring any one of the 10 fields optional on the
 * implementing class is a TypeScript compile error, not merely a
 * convention to remember. That is what makes the "always an array, never
 * absent" contract (R-IMC-007 AC.2) hold **by construction** rather than
 * by a green build alone — a green build still passes if a field is typed
 * optional. That is why `tasks.md` § T-02's "Evidence that does NOT count"
 * clause requires the shape to be asserted by construction; design.md DD-3
 * makes the narrower point that the merge step is test-gated rather than
 * structurally guaranteed.
 */
export interface IndicatorMetadataSectionsDto {
  /** Innovation Development — nature distribution (R-IMC-001). */
  innovation_nature: MetadataCountDto[];

  /** Innovation Development — type distribution (R-IMC-001). */
  innovation_type: MetadataCountDto[];

  /** Innovation Development — current readiness (R-IMC-001). */
  innovation_readiness: MetadataCountDto[];

  /** OICR — maturity level (R-IMC-002). */
  oicr_maturity: MetadataCountDto[];

  /** Policy Change — policy type (R-IMC-003). */
  policy_type: MetadataCountDto[];

  /** Policy Change — stage in policy process (R-IMC-003). */
  policy_stage: MetadataCountDto[];

  /** Capacity Sharing — "Training or engagement to report" (R-IMC-004). */
  session_format: MetadataCountDto[];

  /** Capacity Sharing — "Training vs. Engagement" (R-IMC-004). */
  session_type: MetadataCountDto[];

  /** Capacity Sharing — combined gender distribution (R-IMC-005). */
  gender_distribution: MetadataCountDto[];

  /** Capacity Sharing — degree, long-term training only (R-IMC-006). */
  degree: MetadataCountDto[];
}

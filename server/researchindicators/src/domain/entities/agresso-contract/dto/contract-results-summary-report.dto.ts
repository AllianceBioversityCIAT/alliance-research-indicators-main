import { ApiProperty } from '@nestjs/swagger';

export class ContractResultsSummaryStatusBucketDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'result_status_id of the bucket; null for the explicit "No status" bucket (rows whose result_status_id IS NULL)',
  })
  status_id!: number | null;

  @ApiProperty({
    type: String,
    description:
      'Status name from result_status, or "No status" for the null-status bucket',
  })
  name!: string;

  @ApiProperty({ type: Number, description: 'Count of results in this status' })
  count!: number;
}

export class ContractResultsSummaryYearBucketDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'report_year_id of the bucket; null for the explicit null-year bucket (rows whose report_year_id IS NULL)',
  })
  year!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Count of results reported in this year',
  })
  count!: number;
}

export class ContractResultsSummaryIndicatorYearBucketDto {
  @ApiProperty({ type: Number, description: 'indicator_id of the result' })
  indicator_id!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'report_year_id of the bucket; null for explicit null-year bucket',
  })
  year!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Count of primary results for this indicator in this year',
  })
  count!: number;
}

export class ContractResultsSummaryReportDto {
  @ApiProperty({
    type: Number,
    description:
      'Total primary-contract results (active, non-snapshot); equals the sum of by_status counts AND the sum of by_year counts',
  })
  total!: number;

  @ApiProperty({
    type: ContractResultsSummaryStatusBucketDto,
    isArray: true,
    description:
      'Result counts grouped by result_status with an explicit "No status" bucket for NULL result_status_id rows (LEFT JOIN result_status — judgment SU2)',
  })
  by_status!: ContractResultsSummaryStatusBucketDto[];

  @ApiProperty({
    type: ContractResultsSummaryYearBucketDto,
    isArray: true,
    description:
      'Result counts grouped by report_year_id (no join — judgment W8) with an explicit null-year bucket for NULL report_year_id rows',
  })
  by_year!: ContractResultsSummaryYearBucketDto[];

  @ApiProperty({
    type: Number,
    description:
      'Distinct count of partner-role institutions linked to the contract results (judgment S2)',
  })
  partner_institutions!: number;

  @ApiProperty({
    type: ContractResultsSummaryIndicatorYearBucketDto,
    isArray: true,
    description:
      'Result counts grouped by indicator_id and report_year_id for the matrix heatmap view',
  })
  by_indicator_year!: ContractResultsSummaryIndicatorYearBucketDto[];
}

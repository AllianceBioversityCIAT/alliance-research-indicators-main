import { ApiProperty } from '@nestjs/swagger';

export class ContractSpAlignmentLinkDto {
  @ApiProperty({
    type: String,
    description:
      'Official code of the primary result linked to this Science Program',
  })
  result_official_code!: string;

  @ApiProperty({
    type: String,
    description: 'Title of the primary result',
  })
  result_title!: string;

  @ApiProperty({
    enum: ['PRIMARY', 'CONTRIBUTING', 'UNKNOWN'],
    description:
      'Alignment role of the Science Program for this result (PRIMARY, CONTRIBUTING, or UNKNOWN if not specified)',
  })
  role!: 'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN';
}

export class ContractSpAlignmentSpDto {
  @ApiProperty({
    type: String,
    description: 'Official code of the CLARISA Science Program (e.g., SP-01)',
  })
  sp_code!: string;

  @ApiProperty({
    type: String,
    description: 'Display name of the CLARISA Science Program',
  })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Category of the Science Program (e.g., Science programs, Accelerators)',
  })
  category!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Stable asset icon key for the Science Program',
  })
  icon_key!: string | null;

  @ApiProperty({
    type: ContractSpAlignmentLinkDto,
    isArray: true,
    description:
      'List of primary result links associated with this Science Program',
  })
  links!: ContractSpAlignmentLinkDto[];
}

export class ContractSpAlignmentReportDto {
  @ApiProperty({
    type: ContractSpAlignmentSpDto,
    isArray: true,
    description: 'List of Science Programs with their linked results and roles',
  })
  sps!: ContractSpAlignmentSpDto[];

  @ApiProperty({
    type: Number,
    description:
      'Count of distinct primary results that have at least one active SP alignment row',
  })
  results_with_alignment!: number;

  @ApiProperty({
    type: Number,
    description:
      'Count of distinct primary results that do not have any active SP alignment row (total minus results_with_alignment)',
  })
  results_without_alignment!: number;
}

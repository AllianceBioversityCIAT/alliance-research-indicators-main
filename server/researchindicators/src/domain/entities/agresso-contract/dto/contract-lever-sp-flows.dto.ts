import { ApiProperty } from '@nestjs/swagger';

export class ContractLeverSpFlowLinkDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'CLARISA lever id, or null for the "No lever" pseudo-source (results with no active primary lever)',
  })
  lever_id!: number | null;

  @ApiProperty({
    type: String,
    description:
      'Lever short name, or "No lever" for the "No lever" pseudo-source',
  })
  lever_short_name!: string;

  @ApiProperty({
    type: String,
    description:
      'Lever full name, or "No lever" for the "No lever" pseudo-source',
  })
  lever_full_name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Official code of the CLARISA Science Program, or null for the Unaligned remainder',
  })
  sp_code!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Display name of the Science Program, or null when unaligned',
  })
  sp_name!: string | null;

  @ApiProperty({
    enum: ['PRIMARY', 'CONTRIBUTING', 'UNKNOWN'],
    nullable: true,
    description:
      'Alignment role of the Science Program for this link, or null for an Unaligned link',
  })
  role!: 'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN' | null;

  @ApiProperty({
    type: Number,
    description: 'Count of distinct primary results carrying this link',
  })
  count!: number;
}

export class ContractLeverSpFlowsDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({
    type: Number,
    description: 'Count of distinct primary contract results',
  })
  results_total!: number;

  @ApiProperty({
    type: Number,
    description:
      'Count of distinct primary contract results with at least one active SP alignment',
  })
  results_with_alignment!: number;

  @ApiProperty({
    type: Number,
    description:
      'Count of distinct primary contract results without any active SP alignment',
  })
  results_without_alignment!: number;

  @ApiProperty({
    type: ContractLeverSpFlowLinkDto,
    isArray: true,
    description:
      'Lever → Science Program flow links, role-grouped, incl. per-lever Unaligned links and the "No lever" pseudo-source',
  })
  links!: ContractLeverSpFlowLinkDto[];
}

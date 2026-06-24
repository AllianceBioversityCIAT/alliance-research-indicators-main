import { ApiProperty } from '@nestjs/swagger';

export class PrimaryLeverCountDto {
  @ApiProperty({ type: Number })
  lever_id!: number;

  @ApiProperty({ type: String })
  short_name!: string;

  @ApiProperty({ type: String, required: false })
  full_name?: string;

  @ApiProperty({
    type: Number,
    description: 'Number of active results with this lever marked as primary',
  })
  count!: number;

  @ApiProperty({
    type: String,
    required: false,
    nullable: true,
    description: 'Lever icon URL from Clarisa levers metadata',
  })
  icon?: string | null;
}

export class ContractTopPrimaryLeversReportDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: PrimaryLeverCountDto, isArray: true })
  top_primary_levers!: PrimaryLeverCountDto[];
}

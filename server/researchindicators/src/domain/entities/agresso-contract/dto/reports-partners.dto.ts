import { ApiProperty } from '@nestjs/swagger';

export class PartnerByContractCountDto {
  @ApiProperty({ type: Number })
  institution_id!: number;

  @ApiProperty({ type: String })
  institution_name!: string;

  @ApiProperty({ type: String, required: false })
  acronym?: string;

  @ApiProperty({
    type: Number,
    description: 'Number of active results where the institution is a partner',
  })
  count!: number;
}

export class ContractTopPartnersReportDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: PartnerByContractCountDto, isArray: true })
  top_partners!: PartnerByContractCountDto[];
}

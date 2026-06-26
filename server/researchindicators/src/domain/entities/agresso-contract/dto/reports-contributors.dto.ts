import { ApiProperty } from '@nestjs/swagger';

export class ContributorContractCountDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: String, required: false })
  contract_description?: string;

  @ApiProperty({ type: String, required: false })
  project_name?: string;

  @ApiProperty({
    type: Number,
    description:
      'Number of active results with the primary contract that also link this contributor contract',
  })
  count!: number;
}

export class ContractTopContributorsReportDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: ContributorContractCountDto, isArray: true })
  top_contributors!: ContributorContractCountDto[];
}

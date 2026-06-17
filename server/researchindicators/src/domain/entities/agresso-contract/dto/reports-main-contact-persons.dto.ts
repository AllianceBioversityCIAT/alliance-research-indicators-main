import { ApiProperty } from '@nestjs/swagger';

export class MainContactPersonByContractCountDto {
  @ApiProperty({ type: String })
  user_id!: string;

  @ApiProperty({ type: String })
  first_name!: string;

  @ApiProperty({ type: String })
  last_name!: string;

  @ApiProperty({ type: String, required: false })
  email?: string;

  @ApiProperty({
    type: Number,
    description:
      'Number of active results where the user is the main contact person',
  })
  count!: number;
}

export class ContractTopMainContactPersonsReportDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: MainContactPersonByContractCountDto, isArray: true })
  top_main_contact_persons!: MainContactPersonByContractCountDto[];
}

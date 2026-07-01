import { ApiProperty } from '@nestjs/swagger';

export class ContractStaffMemberDto {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({
    type: String,
    example: 'Project Lead',
    description: 'Staff role within the contract',
  })
  role!: string;
}

export class ContractStaffReportDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: ContractStaffMemberDto, isArray: true })
  staff!: ContractStaffMemberDto[];
}

export class ContractStaffFieldsDto {
  project_lead_description?: string | null;
  programAssistantName?: string | null;
  researchAssistantName?: string | null;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// @sdd-spec docs/specs/changes/executive-overview-grounded-context — T-01 / R-EOC-001, design.md §3
//
// Projected subset of the upstream CLARISA `ClarisaProject` shape, returned
// by GET /:agreementId/clarisa-project. Deliberately narrow so upstream CLARISA
// field drift stays contained to the mapper in AgressoContractService rather
// than leaking every upstream property to the client.

export class ContractClarisaInstitutionDto {
  @ApiProperty({ description: 'CLARISA institution id' })
  id!: number;

  @ApiProperty({ description: 'Institution name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Institution acronym', nullable: true })
  acronym?: string | null;
}

export class ContractClarisaScienceProgramAllocationDto {
  @ApiProperty({ description: 'Science Program code (CLARISA smo_code)' })
  code!: string;

  @ApiProperty({ description: 'Science Program name' })
  name!: string;

  @ApiProperty({ description: 'Allocation percentage (0..100)' })
  allocation!: number;
}

export class ContractClarisaProjectDto {
  @ApiProperty({ description: 'CLARISA project id' })
  id!: number;

  @ApiProperty({ description: 'CLARISA project short name' })
  short_name!: string;

  @ApiPropertyOptional({ description: 'CLARISA project full name' })
  full_name?: string;

  @ApiPropertyOptional({ description: 'CLARISA project summary' })
  summary?: string;

  @ApiPropertyOptional({ description: 'CLARISA project description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Project start date' })
  start_date?: string;

  @ApiPropertyOptional({ description: 'Project end date' })
  end_date?: string;

  @ApiPropertyOptional({ description: 'Total project budget' })
  total_budget?: string;

  @ApiPropertyOptional({ description: 'Annual budget' })
  annual?: string;

  @ApiPropertyOptional({
    type: ContractClarisaInstitutionDto,
    nullable: true,
    description: 'Funder institution',
  })
  funder_institution?: ContractClarisaInstitutionDto | null;

  @ApiPropertyOptional({
    type: ContractClarisaInstitutionDto,
    nullable: true,
    description: 'Lead institution',
  })
  lead_institution?: ContractClarisaInstitutionDto | null;

  @ApiPropertyOptional({ description: 'CLARISA external code', nullable: true })
  external_code?: string | null;

  @ApiPropertyOptional({ description: 'CLARISA phase', nullable: true })
  phase?: string | number | null;

  @ApiProperty({
    type: ContractClarisaScienceProgramAllocationDto,
    isArray: true,
    description:
      'Accepted Science Program allocations (entity type 22) for this project',
  })
  science_programs!: ContractClarisaScienceProgramAllocationDto[];
}

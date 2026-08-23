import { ApiProperty } from '@nestjs/swagger';
import { PartnerByContractCountDto } from './reports-partners.dto';
import { PrimaryLeverCountDto } from './reports-primary-levers.dto';
import { MainContactPersonByContractCountDto } from './reports-main-contact-persons.dto';
import { ContributorContractCountDto } from './reports-contributors.dto';
import { ContractResultsSummaryReportDto } from './contract-results-summary-report.dto';
import { ContractGeoScopeReportDto } from './reports-contracts.dto';
import { ContractSpAlignmentReportDto } from './contract-sp-alignment-report.dto';

export class ContractDashboardTopsDto {
  @ApiProperty({
    type: PartnerByContractCountDto,
    isArray: true,
    nullable: true,
    description: 'Top partner institutions for results linked to the contract',
  })
  partners!: PartnerByContractCountDto[] | null;

  @ApiProperty({
    type: PrimaryLeverCountDto,
    isArray: true,
    nullable: true,
    description: 'Top primary levers for results linked to the contract',
  })
  primary_levers!: PrimaryLeverCountDto[] | null;

  @ApiProperty({
    type: MainContactPersonByContractCountDto,
    isArray: true,
    nullable: true,
    description: 'Top main contact persons for results linked to the contract',
  })
  main_contacts!: MainContactPersonByContractCountDto[] | null;

  @ApiProperty({
    type: ContributorContractCountDto,
    isArray: true,
    nullable: true,
    description:
      'Top contributor contracts linked to results where the contract is primary',
  })
  contributors!: ContributorContractCountDto[] | null;
}

export class ContractDashboardReportDto {
  @ApiProperty({
    type: ContractResultsSummaryReportDto,
    nullable: true,
    description:
      'Summary statistics of contract results by status, year, and indicator',
  })
  summary!: ContractResultsSummaryReportDto | null;

  @ApiProperty({
    type: ContractDashboardTopsDto,
    nullable: true,
    description:
      'Top ranked partners, primary levers, main contacts, and contributor contracts',
  })
  tops!: ContractDashboardTopsDto | null;

  @ApiProperty({
    type: ContractGeoScopeReportDto,
    nullable: true,
    description:
      'Geographic scope breakdown including regions, countries, and sub-nationals',
  })
  geo_scope!: ContractGeoScopeReportDto | null;

  @ApiProperty({
    type: ContractSpAlignmentReportDto,
    nullable: true,
    description:
      'Science Program alignments breakdown (null for non-bilateral contracts)',
  })
  sp_alignment!: ContractSpAlignmentReportDto | null;
}

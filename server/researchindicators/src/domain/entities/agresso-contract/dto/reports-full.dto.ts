import { ApiProperty } from '@nestjs/swagger';
import {
  CountryWithSubNationalsDto,
  GeoScopeSummaryDto,
  RegionByContractCountDto,
} from './reports-contracts.dto';
import { PartnerByContractCountDto } from './reports-partners.dto';
import { ContributorContractCountDto } from './reports-contributors.dto';
import { PrimaryLeverCountDto } from './reports-primary-levers.dto';
import { MainContactPersonByContractCountDto } from './reports-main-contact-persons.dto';
import { ContractStaffMemberDto } from './reports-contract-staff.dto';

export class ContractFullGeoScopeDto {
  @ApiProperty({ type: GeoScopeSummaryDto })
  geo_scope_summary!: GeoScopeSummaryDto;

  @ApiProperty({ type: RegionByContractCountDto, isArray: true })
  top_regions!: RegionByContractCountDto[];

  @ApiProperty({ type: CountryWithSubNationalsDto, isArray: true })
  top_countries!: CountryWithSubNationalsDto[];
}

export class ContractFullReportsDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: PrimaryLeverCountDto, isArray: true })
  top_primary_levers!: PrimaryLeverCountDto[];

  @ApiProperty({ type: ContributorContractCountDto, isArray: true })
  top_contributors!: ContributorContractCountDto[];

  @ApiProperty({ type: MainContactPersonByContractCountDto, isArray: true })
  top_main_contact_persons!: MainContactPersonByContractCountDto[];

  @ApiProperty({ type: ContractStaffMemberDto, isArray: true })
  staff!: ContractStaffMemberDto[];

  @ApiProperty({ type: PartnerByContractCountDto, isArray: true })
  top_partners!: PartnerByContractCountDto[];

  @ApiProperty({ type: ContractFullGeoScopeDto })
  geo_scope!: ContractFullGeoScopeDto;
}

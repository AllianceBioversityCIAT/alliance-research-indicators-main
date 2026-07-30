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
import {
  IndicatorMetadataSectionsDto,
  MetadataCountDto,
} from './reports-indicator-metadata.dto';

export class ContractFullGeoScopeDto {
  @ApiProperty({ type: GeoScopeSummaryDto })
  geo_scope_summary!: GeoScopeSummaryDto;

  @ApiProperty({ type: RegionByContractCountDto, isArray: true })
  top_regions!: RegionByContractCountDto[];

  @ApiProperty({ type: CountryWithSubNationalsDto, isArray: true })
  top_countries!: CountryWithSubNationalsDto[];
}

/**
 * The 7 fields `reports/full` has always returned.
 * `AgressoContractRepository.getFullContractReports()` returns this type —
 * its body is untouched by this spec, only its declared return type
 * changed (design.md DD-3: signature-only edit).
 */
export class ContractBaseReportsDto {
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

/**
 * `reports/full`'s full payload: the 7 pre-existing fields — inherited,
 * unchanged in name/type/shape (R-IMC-007 AC.1) — plus the 10
 * Indicator-metadata sections (R-IMC-007 AC.2). `implements
 * IndicatorMetadataSectionsDto` makes the "always an array, non-optional"
 * contract a compile error to violate (see reports-indicator-metadata.dto.ts).
 */
export class ContractFullReportsDto
  extends ContractBaseReportsDto
  implements IndicatorMetadataSectionsDto
{
  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'Innovation Development — nature distribution (R-IMC-001).',
  })
  innovation_nature!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'Innovation Development — type distribution (R-IMC-001).',
  })
  innovation_type!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'Innovation Development — current readiness (R-IMC-001).',
  })
  innovation_readiness!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'OICR — maturity level (R-IMC-002).',
  })
  oicr_maturity!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'Policy Change — policy type (R-IMC-003).',
  })
  policy_type!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'Policy Change — stage in policy process (R-IMC-003).',
  })
  policy_stage!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description:
      'Capacity Sharing — "Training or engagement to report" (R-IMC-004).',
  })
  session_format!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'Capacity Sharing — "Training vs. Engagement" (R-IMC-004).',
  })
  session_type!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description: 'Capacity Sharing — combined gender distribution (R-IMC-005).',
  })
  gender_distribution!: MetadataCountDto[];

  @ApiProperty({
    type: MetadataCountDto,
    isArray: true,
    description:
      'Capacity Sharing — degree, long-term training only (R-IMC-006).',
  })
  degree!: MetadataCountDto[];
}

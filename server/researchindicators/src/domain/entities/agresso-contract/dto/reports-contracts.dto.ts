import { ApiProperty } from '@nestjs/swagger';

export class RegionByContractCountDto {
  @ApiProperty({ type: Number })
  region_id!: number;

  @ApiProperty({ type: String })
  region_name!: string;

  @ApiProperty({ type: Number })
  count!: number;
}

export class SubNationalByContractCountDto {
  @ApiProperty({ type: Number })
  sub_national_id!: number;

  @ApiProperty({ type: String })
  sub_national_name!: string;

  @ApiProperty({ type: Number })
  count!: number;
}

export class CountryWithSubNationalsDto {
  @ApiProperty({ type: String })
  iso_alpha_2!: string;

  @ApiProperty({ type: String })
  country_name!: string;

  @ApiProperty({ type: Number })
  count!: number;

  @ApiProperty({ type: SubNationalByContractCountDto, isArray: true })
  top_sub_nationals!: SubNationalByContractCountDto[];
}

export class GeoScopeSummaryDto {
  @ApiProperty({
    type: Number,
    description: 'Results with global geographic scope (geo_scope_id = 1)',
  })
  global!: number;

  @ApiProperty({
    type: Number,
    description: 'Results with regional geographic scope (geo_scope_id = 2)',
  })
  regional!: number;

  @ApiProperty({
    type: Number,
    description:
      'Results with national or multi-national geographic scope (geo_scope_id = 3 or 4)',
  })
  countries!: number;

  @ApiProperty({
    type: Number,
    description:
      'Results with sub-national geographic scope (geo_scope_id = 5)',
  })
  sub_national!: number;

  @ApiProperty({
    type: Number,
    description:
      'Results with geographic scope yet to be determined (geo_scope_id = 50)',
  })
  yet_to_be_determined!: number;
}

export class ContractGeoScopeReportDto {
  @ApiProperty({ type: String })
  contract_id!: string;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: GeoScopeSummaryDto })
  geo_scope_summary!: GeoScopeSummaryDto;

  @ApiProperty({ type: RegionByContractCountDto, isArray: true })
  top_regions!: RegionByContractCountDto[];

  @ApiProperty({ type: CountryWithSubNationalsDto, isArray: true })
  top_countries!: CountryWithSubNationalsDto[];
}

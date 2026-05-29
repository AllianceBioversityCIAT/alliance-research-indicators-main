import {
  ContributingCenterMapper,
  ContributingPartnerMapper,
  CountryMapper,
  CreatedByMapper,
  EntityMapper,
  EvidencesMapper,
  GeographicFocusMapper,
  IndicatorCategoryMapper,
  PrmsInitiativeDto,
  PrmsKnowledgeProductDto,
  PrmsResponseDto,
  PrmsResultByInitiativesDto,
  PrimaryEntityMapper,
  RegionMapper,
  ResultLevelMapper,
  ResultResponseMapper,
  SearcherResponseDto,
  SubEntityMapper,
  TocMapper,
  TocResultMapper,
} from './prms-response.dto';

describe('prms-response DTOs', () => {
  it('should allow constructing exported mapper classes', () => {
    expect(new PrmsKnowledgeProductDto()).toBeInstanceOf(
      PrmsKnowledgeProductDto,
    );
    expect(new PrmsResponseDto()).toBeInstanceOf(PrmsResponseDto);
    expect(new PrmsResultByInitiativesDto()).toBeInstanceOf(
      PrmsResultByInitiativesDto,
    );
    expect(new PrmsInitiativeDto()).toBeInstanceOf(PrmsInitiativeDto);
    expect(new ResultLevelMapper()).toBeInstanceOf(ResultLevelMapper);
    expect(new IndicatorCategoryMapper()).toBeInstanceOf(
      IndicatorCategoryMapper,
    );
    expect(new GeographicFocusMapper()).toBeInstanceOf(GeographicFocusMapper);
    expect(new RegionMapper()).toBeInstanceOf(RegionMapper);
    expect(new CountryMapper()).toBeInstanceOf(CountryMapper);
    expect(new ContributingCenterMapper()).toBeInstanceOf(
      ContributingCenterMapper,
    );
    expect(new ContributingPartnerMapper()).toBeInstanceOf(
      ContributingPartnerMapper,
    );
    expect(new EvidencesMapper()).toBeInstanceOf(EvidencesMapper);
    expect(new PrimaryEntityMapper()).toBeInstanceOf(PrimaryEntityMapper);
    expect(new EntityMapper()).toBeInstanceOf(EntityMapper);
    expect(new SubEntityMapper()).toBeInstanceOf(SubEntityMapper);
    expect(new TocResultMapper()).toBeInstanceOf(TocResultMapper);
    expect(new TocMapper()).toBeInstanceOf(TocMapper);
    expect(new SearcherResponseDto()).toBeInstanceOf(SearcherResponseDto);
    expect(new CreatedByMapper()).toBeInstanceOf(CreatedByMapper);
    expect(new ResultResponseMapper()).toBeInstanceOf(ResultResponseMapper);
  });
});

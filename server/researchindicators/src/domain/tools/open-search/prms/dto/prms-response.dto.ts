import { OmitType } from '@nestjs/swagger';

export class PrmsKnowledgeProductDto {
  result_knowledge_product_id: number;
  results_id: number;
  ost_melia_study_id: number;
  handle: string;
  name: string;
  description: string;
  doi: string;
  knowledge_product_type: string;
  licence: string;
  comodity: string;
  sponsors: string;
  findable: string;
  accesible: string;
  interoperable: string;
  reusable: string;
  is_melia: boolean;
  melia_previous_submitted: string;
  melia_type_id: number;
  cgspace_regions: string;
  cgspace_countries: string;
  is_active: boolean;
  created_by: number;
  created_date: Date;
  last_updated_date: Date;
  last_updated_by: number;
  result_knowledge_product_keyword_array: string[];
  result_knowledge_product_metadata_array: {
    result_kp_metadata_id: number;
    result_knowledge_product_id: number;
    source: string;
    is_isi: boolean;
    accesibility: string;
    open_access: string;
    year: string;
    online_year: string;
    doi: string;
    is_peer_reviewed: boolean;
    is_active: boolean;
    created_date: Date;
    last_updated_date: Date;
  }[];
}
export class PrmsResponseDto {
  source: string;
  id: number;
  result_code: number;
  result_id: number;
  title: string;
  description: string;
  result_type_id: number;
  result_level_id: number;
  status_id: number;
  reported_year_id: number;
  created_date: Date;
  obj_created: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_cgiar: boolean;
    active: boolean;
    created_date: Date;
    last_updated_date: Date;
    last_pop_up_viewed: Date;
  };
  obj_result_by_initiatives: PrmsResultByInitiativesDto[];
  result_knowledge_product_array: PrmsKnowledgeProductDto[];
}

export class PrmsResultByInitiativesDto {
  id: number;
  result_id: string;
  initiative_id: number;
  initiative_role_id: string;
  is_active: boolean;
  created_by: number;
  created_date: Date;
  last_updated_by: number;
  last_updated_date: Date;
  obj_initiative: PrmsInitiativeDto;
}

export class PrmsInitiativeDto {
  id: number;
  official_code: string;
  name: string;
  short_name: string;
  active: boolean;
  portfolio_id: number;
  toc_id: number;
  cgiar_entity_type_id: string;
}

// new dto for the result response
export class ResultLevelMapper {
  public code: string;
  public name: string;
  public description: string;
}

export class IndicatorCategoryMapper {
  public code: string;
  public name: string;
}

export class GeographicFocusMapper {
  public code: string;
  public description: string;
}

export class RegionMapper {
  public code: string;
  public name: string;
}

export class CountryMapper {
  public code: string;
  public name: string;
}

export class ContributingCenterMapper {
  public code: string;
  public name: string;
  public acronym: string;
  public is_lead: boolean;
}

export class ContributingPartnerMapper {
  public code: string;
  public name: string;
  public acronym: string;
}

export class EvidencesMapper {
  public link: string;
  public description: string;
}

export class PrimaryEntityMapper {
  public official_code: string;
  public name: string;
}

export class EntityMapper {
  public official_code: string;
  public name: string;
}

export class SubEntityMapper {
  public official_code: string;
  public description: string;
}

export class TocResultMapper {
  public level: string;
  public sub_entity: SubEntityMapper;
  public result_name: string;
}

export class TocMapper {
  public entity: EntityMapper;
  public initiative_role: string;
  public toc_results: TocResultMapper[];
}

export class SearcherResponseDto {
  public total: number;
  public page: number;
  public size: number;
  public totalPages: number;
  public data: ResultResponseMapper[];
}

export class CreatedByMapper {
  public first_name: string;
  public last_name: string;
  public email: string;
}

export class ResultResponseMapper {
  public created_date: Date;
  public last_updated_date: Date;
  public result_code: string;
  public status_id: string;
  public year: string;
  public pdf_link: string;
  public prms_link: string;
  public last_update_at: string;
  public is_active: boolean;
  public result_title: string;
  public description: string;
  public result_level: ResultLevelMapper;
  public indicator_category: IndicatorCategoryMapper;
  public toc_alignment: TocMapper[];
  public geographic_focus: GeographicFocusMapper;
  public regions: RegionMapper[];
  public countries: CountryMapper[];
  public contributing_centers: ContributingCenterMapper[];
  public contributing_partners: ContributingPartnerMapper[];
  public evidences: EvidencesMapper[];
  public primary_entity: PrimaryEntityMapper;
  public created_by: CreatedByMapper;
  public policy_change_summary: PolicyChangeSummaryMapper;
}

export class PolicyChangeSummaryMapper {
  public amount: number;
  public amount_status_label: string;
  public policy_type: PolicyTypeMapper;
  public policy_stage: PolicyStageMapper;
  public linked_innovation_dev: boolean;
  public linked_innovation_use: boolean;
  public result_related_to: ResultRelatedToMapper[];
  public policy_implementing_organizations: PolicyImplementingOrganizationsMapper[];
}

export class ResultRelatedToMapper {
  public parent_question: string;
  public option_text: string;
}

export class PolicyImplementingOrganizationsMapper {
  public id: number;
  public name: string;
  public acronym: string;
  public institution_type_name: string;
}

export class PolicyTypeMapper {
  public id: number;
  public name: string;
  public definition: string;
}

export class PolicyStageMapper {
  public id: number;
  public name: string;
  public definition: string;
}

export class PrmsTemporalResponseMapper {
  public code: number;
  public year: number;
  public is_version: boolean;
  public data: ResultResponseMapper;
}

export class TemportalDataResponse<T> extends OmitType(
  PrmsTemporalResponseMapper,
  ['data'],
) {
  public code: number;
  public year: number;
  public is_version: boolean;
  public data: T;
}

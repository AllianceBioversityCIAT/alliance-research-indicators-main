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
  result_knowledge_product_array: PrmsKnowledgeProductDto[];
}

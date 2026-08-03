export interface MainContactPerson {
  name: string;
  code: string;
  similarity_score: number;
}

export interface Country {
  code: string;
  areas: string[];
}

export interface AIAssistantResult {
  indicator: string;
  title: string;
  description: string;
  keywords: string[];
  geoscope_level: string;
  regions: string[];
  countries: Country[];
  training_type: string;
  length_of_training: string;
  start_date: string;
  end_date: string;
  degree: string;
  delivery_modality: string;
  contract_code?: string;
  total_participants: number;
  non_binary_participants: string;
  female_participants: number;
  male_participants: number;
  evidence_for_stage: string;
  policy_type: string;
  stage_in_policy_process: string;
  result_official_code?: string;
  main_contact_person: MainContactPerson;
  // Innovation Development fields
  innovation_nature?: string;
  innovation_type?: string;
  assess_readiness?: number;
  anticipated_users?: string;
  organization_type?: string[];
  organization_sub_type?: string;
  organizations?: string[];
  organizations_detailed?: OrganizationDetailed[];
  innovation_actors_detailed?: InnovationActorDetailed[];
  result_id?: string;
}

export interface OrganizationDetailed {
  institution_name?: string;
  institution_id?: string;
  similarity_score?: number;
  type?: string;
  sub_type?: string;
  other_type?: string;
}

export interface CountryArea {
  country_code: string;
  areas: string[];
}
export interface CreateResultResponse {
  data: ResultData;
}

export interface ResultData {
  description: string;
  indicator_id: number;
  title: string;
  result_official_code: string;
  report_year_id: number;
  created_by: number;
  updated_at: string;
  updated_by: number | null;
  deleted_at: string | null;
  version_id: number | null;
  geo_scope_id: number | null;
  result_status_id: number;
  tip_id: number | null;
  created_at: string;
  is_active: boolean;
  result_id: number;
}

export interface InnovationActorDetailed {
  name: string;
  type: string;
  gender_age: string[];
}

export interface SectionMeta {
  total_results: number;
  n: number;
}

export interface ReportingVelocityItem {
  month: string;
  count: number;
}

export interface CapacitySharingGenderSplit {
  gender: string;
  count: number;
}

export interface CapacitySharingNamedCount {
  id?: number | null;
  name: string;
  count: number;
}

export interface CapacitySharingDetails {
  meta: SectionMeta;
  total_trainees: number;
  gender_split: CapacitySharingGenderSplit[];
  session_lengths: CapacitySharingNamedCount[];
  delivery_modalities: CapacitySharingNamedCount[];
  session_types: CapacitySharingNamedCount[];
}

export interface InnovationDevReadinessLevel {
  id?: number | null;
  level: number;
  name: string;
  count: number;
}

export interface InnovationDevNamedCount {
  id?: number | null;
  name: string;
  count: number;
}

export interface InnovationDevScalabilityProfile {
  flag?: string;
  key?: string;
  label?: string;
  name?: string;
  true_count: number;
  answered_count: number;
}

export interface InnovationDevDetails {
  meta: SectionMeta;
  readiness_levels: InnovationDevReadinessLevel[];
  innovation_types: InnovationDevNamedCount[];
  innovation_natures: InnovationDevNamedCount[];
  anticipated_users: InnovationDevNamedCount[];
  scalability_profile: InnovationDevScalabilityProfile[];
}

export interface KnowledgeProductStatusCount {
  name: string;
  count: number;
}

export interface KnowledgeProductNamedCount {
  id?: number | null;
  name: string;
  count: number;
}

export interface KnowledgeProductPublicationYear {
  year: number | null;
  count: number;
}

export interface KnowledgeProductDetails {
  meta: SectionMeta;
  open_access_split: KnowledgeProductStatusCount[];
  access_status: KnowledgeProductStatusCount[];
  types: KnowledgeProductNamedCount[];
  publications_by_year: KnowledgeProductPublicationYear[];
}

export interface PolicyChangeStageFunnel {
  id?: number | null;
  stage_id?: number | null;
  name?: string;
  stage_name?: string;
  order?: number | null;
  count: number;
}

export interface PolicyChangeNamedCount {
  id?: number | null;
  name: string;
  count: number;
}

export interface PolicyChangeDetails {
  meta: SectionMeta;
  stage_funnel: PolicyChangeStageFunnel[];
  policy_types: PolicyChangeNamedCount[];
  implicated_institutions_count: number;
}

export interface OicrMaturityLevel {
  id?: number | null;
  name?: string;
  level_name?: string;
  count: number;
}

export interface OicrExternalUseSplit {
  name?: string;
  for_external_use?: boolean;
  count: number;
}

export interface OicrDetails {
  meta: SectionMeta;
  maturity_levels: OicrMaturityLevel[];
  external_use_split: OicrExternalUseSplit[];
}

export interface InnovationUseGenderYouthDisaggregation {
  women_youth: number;
  women_not_youth: number;
  men_youth: number;
  men_not_youth: number;
  total?: number;
}

export interface InnovationUseActorReach {
  actor_type_id?: number | null;
  actor_type_name?: string;
  actor_type?: string;
  women_youth: number;
  women_not_youth: number;
  men_youth: number;
  men_not_youth: number;
  total?: number;
}

export interface InnovationUseGenderYouthReach {
  overall: InnovationUseGenderYouthDisaggregation;
  by_actor_type: InnovationUseActorReach[];
}

export interface InnovationUseNamedCount {
  id?: number | null;
  name: string;
  count: number;
}

export interface InnovationUseQuantification {
  unit: string;
  total?: number;
  total_number?: number;
  count: number;
}

export interface InnovationUseDetails {
  meta: SectionMeta;
  gender_youth_reach: InnovationUseGenderYouthReach;
  organization_types: InnovationUseNamedCount[];
  quantifications: InnovationUseQuantification[];
}

export interface ContractIndicatorDetailsReport {
  capacity_sharing?: CapacitySharingDetails | null;
  innovation_dev?: InnovationDevDetails | null;
  knowledge_product?: KnowledgeProductDetails | null;
  policy_change?: PolicyChangeDetails | null;
  oicr?: OicrDetails | null;
  innovation_use?: InnovationUseDetails | null;
  reporting_velocity?: ReportingVelocityItem[] | null;
}

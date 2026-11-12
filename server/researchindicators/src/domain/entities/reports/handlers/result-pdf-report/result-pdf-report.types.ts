import {
  CapDevGroupDto,
  CapDevIndividualDto,
} from '../../../result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { ResultUser } from '../../../result-users/entities/result-user.entity';
import { ResultLanguage } from '../../../result-languages/entities/result-language.entity';
import { ResultPdfIndicatorSections } from './indicator-sections/result-pdf-indicator-section.types';
import { CreateResultInnovationDevDto } from '../../../result-innovation-dev/dto/create-result-innovation-dev.dto';

export type ResultPdfReportStatus = {
  status_name: string;
  status_description: string | null;
  status_border_color: string | null;
  status_text_color: string | null;
};

export type ResultPdfReportGeneralInformationSection = {
  title: string;
  description: string;
  keywords: string[];
  user_id: string | null;
  year: number | string;
  main_contact_person: { user_id: string } | null;
  indicator_id: number;
  result_code: number;
  result_type: string;
  generated_at: string;
  main_contact_display: string | null;
  status: ResultPdfReportStatus;
};

export type ResultPdfReportGeographicScopeSection = {
  geo_scope_id: string;
  regions: Array<{ region_id: number; name: string }>;
  countries: Array<{
    isoAlpha2: string;
    name: string;
    result_countries_sub_nationals: unknown[];
  }>;
  comment_geo_scope?: string;
};

export type ResultPdfReportContractLever = {
  lever_id?: number;
  short_name?: string;
  full_name?: string;
  icon?: string;
};

export type ResultPdfReportAlignmentContract = {
  is_active: boolean;
  result_contract_id: number;
  result_id: number;
  contract_id: string;
  contract_role_id: number;
  is_primary: boolean;
  agreement_id: string;
  description?: string;
  contract_status?: string;
  project_lead_description?: string;
  start_date?: string;
  end_date?: string;
  endDateGlobal?: string;
  levers: ResultPdfReportContractLever;
};

/** Portfolio row the result falls in by its reporting year (years live in the DB). */
export type ResultPdfReportPortfolio = {
  id: number;
  name: string;
  description?: string;
  start_year: number;
  end_year: number;
};

/** CLARISA SDG row, sent whole so the PDF can draw its icon and colour. */
export type ResultPdfReportSdg = {
  id: number;
  clarisa_sdg_id: number;
  smo_code?: number;
  financial_code?: string;
  short_name?: string;
  full_name?: string;
  icon?: string;
  color?: string;
  description?: string;
};

export type ResultPdfReportSdgTarget = {
  sdg_target_id: number;
  sdg_target_code?: string;
  sdg_target?: string;
  clarisa_sdg?: ResultPdfReportSdg;
};

export type ResultPdfReportLeverSdgTarget = ResultPdfReportSdgTarget & {
  result_lever_sdg_target_id: number;
  result_lever_id: number;
};

export type ResultPdfReportStrategicOutcome = {
  lever_strategic_outcome_id: number;
  strategic_outcome?: string;
};

export type ResultPdfReportAlignmentLever = {
  result_lever_id: number;
  result_id: number;
  lever_id: number | string;
  lever_role_id: number;
  is_primary: boolean;
  short_name?: string;
  full_name?: string;
  other_names?: string;
  icon?: string | null;
  custom_lever_name?: string;
  result_lever_strategic_outcomes?: ResultPdfReportStrategicOutcome[];
  result_lever_sdg_targets?: ResultPdfReportLeverSdgTarget[];
};

/** Strategic Objective / Impact Outcome (Portfolio 2 catalogs). */
export type ResultPdfReportAlignmentCatalogItem = {
  id: number;
  name: string;
  description?: string;
};

export type ResultPdfReportAllianceAlignmentSection = {
  indicator_id: number;
  portfolio: ResultPdfReportPortfolio | null;
  contracts: ResultPdfReportAlignmentContract[];
  result_sdgs: ResultPdfReportSdg[];
  /** Portfolio 1 */
  primary_levers?: ResultPdfReportAlignmentLever[];
  contributor_levers?: ResultPdfReportAlignmentLever[];
  /** Portfolio 2 */
  research_areas?: ResultPdfReportAlignmentLever[];
  strategic_objectives?: ResultPdfReportAlignmentCatalogItem[];
  impact_outcomes?: ResultPdfReportAlignmentCatalogItem[];
  result_sdg_targets?: ResultPdfReportSdgTarget[];
};

export type ResultPdfReportEvidenceSection = {
  evidence: unknown[];
  notable_references: unknown[];
  cgspace_link?: string | null;
};

export type ResultPdfReportPartnerInstitution = {
  institution_id: number;
  institution_role_id: number;
  acronym?: string;
  name?: string;
  institution_type_name?: string;
  headquarters?: string | null;
};

export type ResultPdfReportPartnersSection = {
  is_partner_not_applicable: boolean | null;
  institutions: ResultPdfReportPartnerInstitution[];
};

export type ResultPdfReportIpRightsSection = {
  asset_ip_owner_description?: string | null;
  publicity_restriction?: boolean | null;
  requires_futher_development?: boolean | null;
  asset_ip_owner?: number | null;
  potential_asset?: boolean | null;
  potential_asset_description?: string | null;
  publicity_restriction_description?: string | null;
  requires_futher_development_description?: string | null;
  private_sector_engagement_id?: number | null;
  formal_ip_rights_application_id?: number | null;
};

export type ResultPdfReportCapSharingLabels = {
  session_format_label?: string;
  session_type_label?: string;
  session_length_label?: string;
  degree_label?: string;
  delivery_modality_label?: string;
  gender_label?: string;
  affiliation_label?: string;
  nationality_label?: string;
  session_purpose_label?: string;
  attending_organization_label?: string;
  organization_institutions?: ResultPdfReportPartnerInstitution[];
};

export type ResultPdfReportCapSharingSection = {
  delivery_modality_id?: number;
  end_date?: Date | string;
  session_format_id?: number;
  session_type_id?: number;
  start_date?: Date | string;
  degree_id?: number | null;
  session_length_id?: number;
  individual?: CapDevIndividualDto;
  group?: CapDevGroupDto;
  training_supervisor?: ResultUser | null;
  training_supervisor_languages?: ResultLanguage | null;
  session_format_label?: string;
  session_type_label?: string;
  session_length_label?: string;
  degree_label?: string;
  delivery_modality_label?: string;
  affiliation_label?: string;
  nationality_label?: string;
  gender_label?: string;
  session_purpose_label?: string;
  attending_organization_label?: string;
  organization_institutions?: ResultPdfReportPartnerInstitution[];
};

export type ResultPdfReportInnovationCatalogItem = {
  id?: number;
  code?: number;
  level?: number;
  name?: string;
  definition?: string;
  additional_guidance?: string;
};

export type ResultPdfReportLinkedResult = {
  link_result_id: number;
  other_result_id: number;
  link_result_role_id: number;
  result_code?: number | string;
  linked_result_title?: string;
  result_type_label?: string;
  qa_status_label?: string;
  reporting_project_name?: string;
};

/**
 * `innovation_details` for the `inn_dev` template: the innovation-dev GET plus every
 * catalog label resolved here, because the PDF viewer never reads a STAR catalog.
 */
/** Catalog labels resolved for `innovation_details`; the PDF prints these as-is. */
export type ResultPdfReportInnovationDetailsLabels = {
  innovation_nature?: ResultPdfReportInnovationCatalogItem;
  innovation_type?: ResultPdfReportInnovationCatalogItem;
  innovation_readiness?: ResultPdfReportInnovationCatalogItem;
  anticipated_users_label?: string;
  is_new_or_improved_variety_label?: string;
  actor_type_labels?: Record<number, string>;
  institution_type_labels?: Record<number, string>;
  sub_institution_type_labels?: Record<number, string>;
  institution_labels?: Record<number, string>;
  is_knowledge_sharing_label?: string;
  dissemination_qualification_label?: string;
  tool_function_labels?: string[];
  is_used_beyond_original_context_label?: string;
  expansion_potential_label?: string;
};

/**
 * `innovation_details` for the `inn_dev` template: the innovation-dev GET plus every
 * catalog label resolved here, because the PDF viewer never reads a STAR catalog.
 */
export type ResultPdfReportInnovationDetailsSection = Omit<
  CreateResultInnovationDevDto,
  'knowledge_sharing_form'
> & {
  knowledge_sharing_form?: Omit<
    CreateResultInnovationDevDto['knowledge_sharing_form'],
    'link_to_result'
  > & { link_to_result?: ResultPdfReportLinkedResult[] };
} & ResultPdfReportInnovationDetailsLabels;

export type ResultPdfReportPayload = {
  general_information: ResultPdfReportGeneralInformationSection;
  alliance_alignment: ResultPdfReportAllianceAlignmentSection;
  results_partners: ResultPdfReportPartnersSection;
  geographic_scope: ResultPdfReportGeographicScopeSection;
  evidence: ResultPdfReportEvidenceSection;
  ip_rights: ResultPdfReportIpRightsSection;
} & ResultPdfIndicatorSections;

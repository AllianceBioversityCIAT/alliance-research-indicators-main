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

export type ResultPdfReportAlignmentLever = {
  result_lever_id: number;
  result_id: number;
  lever_id: number | string;
  lever_role_id: number;
  is_primary: boolean;
  short_name?: string;
  icon?: string | null;
  result_lever_strategic_outcomes?: unknown[];
  result_lever_sdg_targets?: unknown[];
};

export type ResultPdfReportAllianceAlignmentSection = {
  indicator_id: number;
  contracts: ResultPdfReportAlignmentContract[];
  result_sdgs: unknown[];
  primary_levers: ResultPdfReportAlignmentLever[];
  contributor_levers: ResultPdfReportAlignmentLever[];
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

export type ResultPdfReportPayload = {
  general_information: ResultPdfReportGeneralInformationSection;
  alliance_alignment: ResultPdfReportAllianceAlignmentSection;
  results_partners: ResultPdfReportPartnersSection;
  geographic_scope: ResultPdfReportGeographicScopeSection;
  evidence: ResultPdfReportEvidenceSection;
  ip_rights: ResultPdfReportIpRightsSection;
};

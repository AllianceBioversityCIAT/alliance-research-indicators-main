import type { ExcelColumnSpec } from '../../core/excel-workbook.types';

/**
 * Raw data sheet columns A–BB (reference workbook "Raw data" header row).
 */
export const STAR_RESULTS_METADATA_RAW_COLUMNS: ExcelColumnSpec[] = [
  { key: 'result_code', header: 'Result Code', width: 14 },
  { key: 'platform_code', header: 'Source Platform', width: 16 },
  {
    key: 'public_link',
    header: 'Public link',
    width: 40,
    hyperlink: {
      urlField: 'public_link',
      displayField: 'public_link',
      emptyDisplay: 'Not available',
      linkAppearance: {
        colorArgb: 'FF0563C1',
        underline: true,
      },
    },
  },
  {
    key: 'platform_link',
    header: 'Link to platform',
    width: 36,
    hyperlink: {
      urlField: 'platform_link',
      displayField: 'platform_link_display',
      emptyDisplay: 'Not available',
      linkAppearance: {
        colorArgb: 'FF0563C1',
        underline: true,
      },
    },
  },
  { key: 'indicator', header: 'Indicator', width: 36 },
  { key: 'status', header: 'Status', width: 18 },
  { key: 'result_title', header: 'Title', width: 48 },
  { key: 'result_description', header: 'Description', width: 60 },
  {
    key: 'reporting_year',
    header: 'Reporting year',
    width: 16,
    cellDataType: 'integer',
  },
  { key: 'approved_versions', header: 'Approved versions', width: 22 },
  { key: 'keywords', header: 'Keywords', width: 36 },
  { key: 'creator', header: 'Creator', width: 28 },
  {
    key: 'creation_date',
    header: 'Creation date',
    width: 16,
    cellDataType: 'date',
  },
  { key: 'main_contact_person', header: 'Main contact person', width: 36 },
  { key: 'primary_project', header: 'Primary project', width: 56 },
  {
    key: 'primary_project_principal_investigator',
    header: 'Primary project: principal investigator',
    width: 40,
  },
  {
    key: 'primary_project_start_date',
    header: 'Primary project: Start date',
    width: 22,
    cellDataType: 'date',
  },
  {
    key: 'primary_project_end_date',
    header: 'Primary project: End date',
    width: 22,
    cellDataType: 'date',
  },
  { key: 'contributing_projects', header: 'Contributing projects', width: 48 },
  { key: 'primary_lever', header: 'Primary lever(s)', width: 28 },
  { key: 'contributor_lever', header: 'Contributing lever(s)', width: 28 },
  {
    key: 'sdg_targets',
    header: 'Contibution to SDG targets',
    width: 72,
  },
  { key: 'partners', header: 'Partners involved', width: 56 },
  { key: 'geo_scope_name', header: 'Geographic scope', width: 24 },
  { key: 'countries', header: 'Countries specified', width: 36 },
  { key: 'regions', header: 'Regions specified', width: 28 },
  {
    key: 'sub_nationals',
    header: 'Geographic scope comments',
    width: 48,
  },
  { key: 'evidences', header: 'Evidences', width: 72 },
  { key: 'who_owns_ip_rights', header: 'Who owns IP rights?', width: 28 },
  { key: 'third_party', header: 'Third party', width: 32 },
  {
    key: 'legal_restrictions_publication',
    header: 'Legal restrictions on publication?',
    width: 40,
  },
  {
    key: 'commercialization_potential_asset',
    header: 'Commercialization potential for asset?',
    width: 42,
  },
  {
    key: 'asset_need_refinement',
    header: 'Does asset need refinement?',
    width: 36,
  },
  { key: 'training_engagement_report', header: 'Training type', width: 28 },
  {
    key: 'is_this_training_engagement',
    header: 'Training or engagement?',
    width: 28,
  },
  { key: 'length_training', header: 'Length training', width: 22 },
  { key: 'degree', header: 'Degree', width: 20 },
  { key: 'total_participants', header: 'Total participants', width: 20 },
  {
    key: 'number_people_trained_total',
    header: 'Number people trained TOTAL',
    width: 28,
  },
  {
    key: 'number_people_trained_female',
    header: 'Number people trained FEMALE',
    width: 28,
  },
  {
    key: 'number_people_trained_male',
    header: 'Number people trained MALE',
    width: 26,
  },
  {
    key: 'number_people_trained_non_binary',
    header: 'Number people trained NON BINARY',
    width: 32,
  },
  {
    key: 'group_session_purpose_name',
    header: 'What was the purpose of this training/engagement?*',
    width: 48,
  },
  {
    key: 'group_is_attending_organization',
    header: 'Were the trainees attending on behalf of an organization?*',
    width: 52,
  },
  {
    key: 'organizations_on_behalf',
    header: 'Organizations on behalf',
    width: 48,
  },
  {
    key: 'individual_trainee_affiliation',
    header: 'Trainee affiliation',
    width: 48,
  },
  { key: 'individual_trainee_name', header: 'Trainee name', width: 28 },
  {
    key: 'individual_trainee_nationality',
    header: 'Trainee nationality',
    width: 28,
  },
  { key: 'individual_gender', header: 'Trainee Gender', width: 20 },
  {
    key: 'traning_supervisor',
    header: 'Training / Engagement supervisor',
    width: 36,
  },
  { key: 'language', header: 'Language', width: 20 },
  {
    key: 'start_date',
    header: 'Start date',
    width: 16,
    cellDataType: 'date',
  },
  {
    key: 'end_date',
    header: 'End date',
    width: 16,
    cellDataType: 'date',
  },
  { key: 'delivery_modality', header: 'Delivery modality', width: 24 },
];

export const STAR_RESULTS_METADATA_DICTIONARY_COLUMNS: ExcelColumnSpec[] = [
  {
    key: 'section',
    header: 'Section',
    width: 28,
    headerFillArgb: 'FF455A64',
  },
  {
    key: 'field_label',
    header: 'Field',
    width: 56,
    headerFillArgb: 'FF455A64',
  },
  {
    key: 'explanation',
    header: 'Explanation',
    width: 72,
    headerFillArgb: 'FF455A64',
  },
];

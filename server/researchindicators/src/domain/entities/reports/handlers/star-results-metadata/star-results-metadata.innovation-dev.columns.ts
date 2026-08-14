import type { ExcelColumnSpec } from '../../core/excel-workbook.types';

/** Innovation Development section (27 columns); maps to `report_innovation_dev`. */
export const STAR_RESULTS_METADATA_INNOVATION_DEV_COLUMNS: ExcelColumnSpec[] = [
  { key: 'short_title', header: 'Short title', width: 36 },
  { key: 'innovation_nature', header: 'Innovation nature', width: 28 },
  { key: 'innovation_type', header: 'Innovation type', width: 28 },
  {
    key: 'innovation_readiness_level',
    header: 'Innovation readiness level',
    width: 36,
  },
  {
    key: 'innovation_readiness_explanation',
    header: 'Readiness explanation',
    width: 48,
  },
  { key: 'actors', header: 'Actors', width: 56 },
  { key: 'innovation_partners', header: 'Organizations', width: 56 },
  {
    key: 'intended_beneficiaries_description',
    header: 'Intended beneficiaries/users elaborated',
    width: 48,
  },
  { key: 'expected_outcome', header: 'Expected outcomes', width: 48 },
  {
    key: 'expansion_adaptation_details',
    header: 'Potential for researchers/policymakers adaptation',
    width: 48,
  },
  {
    key: 'dissemination_qualification',
    header: 'Method/tool qualifies for dissemination',
    width: 40,
  },
  {
    key: 'tool_useful_context',
    header: 'Context for tool usefulness',
    width: 48,
  },
  {
    key: 'results_achieved_expected',
    header: 'Results detailed with examples',
    width: 48,
  },
  { key: 'tool_functions', header: 'Tool function', width: 48 },
  {
    key: 'is_used_beyond_original_context',
    header: 'Innovation used beyond original context',
    width: 36,
  },
  {
    key: 'adoption_adaptation_context',
    header: 'Adopted and adapted in other contexts',
    width: 48,
  },
  {
    key: 'tools_often_used_together',
    header: 'Tools often used together',
    width: 72,
  },
  { key: 'other_tools', header: 'Other tools', width: 48 },
  {
    key: 'other_tools_integration',
    header: "Other tools' usage with this one description",
    width: 48,
  },
  {
    key: 'is_cheaper_than_alternatives',
    header: 'Formulation: Is it cheaper compared to alternatives?',
    width: 40,
  },
  {
    key: 'is_simpler_to_use',
    header: 'Formulation: Is it simpler to use?',
    width: 36,
  },
  {
    key: 'does_perform_better',
    header: 'Formulation: Does it perform better?',
    width: 36,
  },
  {
    key: 'is_desirable_to_users',
    header:
      'Demand and Investment: Is the innovation desirable to intended users?',
    width: 48,
  },
  {
    key: 'has_commercial_viability',
    header:
      'Demand and Investment: Is the innovation commercially viable/is there investment potential?',
    width: 52,
  },
  {
    key: 'has_suitable_enabling_environment',
    header:
      'Sustained use: Is the innovation supported by a suitable enabling environment?',
    width: 52,
  },
  {
    key: 'has_evidence_of_uptake',
    header: 'Sustained use: Is there already evidence of uptake?',
    width: 48,
  },
  {
    key: 'expansion_potential',
    header:
      'Sustained use: Is there potential for actor in new contexts and for new purposes?',
    width: 52,
  },
];

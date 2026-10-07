import type { StarRawSectionColumn } from './star-results-metadata.sections';

/**
 * Innovation Development columns 81–112.
 * Header text is the dictionary `field_label` (design §3.2a), byte for byte.
 * Keys are the `report_innovation_dev` aliases.
 *
 * @akili-spec docs/specs/innovation-dev/excel-export
 */
export const STAR_INNOVATION_DEV_RAW_COLUMNS: StarRawSectionColumn[] = [
  {
    key: 'innovation_dev_short_title',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Short title',
    width: 36,
  },
  {
    key: 'innovation_dev_nature',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Innovation nature',
    width: 28,
  },
  {
    key: 'innovation_dev_type',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Innovation type',
    width: 28,
  },
  {
    key: 'innovation_dev_is_new_variety',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'New or improved variety or breed',
    width: 36,
  },
  {
    key: 'innovation_dev_varieties_count',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Number of new or improved lines/varieties',
    width: 40,
  },
  {
    key: 'innovation_dev_readiness_level',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Innovation readiness level',
    width: 36,
  },
  {
    key: 'innovation_dev_readiness_explanation',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Readiness explanation',
    width: 48,
  },
  {
    key: 'innovation_dev_anticipated_users',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Anticipated users',
    width: 28,
  },
  {
    key: 'innovation_dev_no_sex_age_disaggregation',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Sex and age disaggregation not applicable',
    width: 40,
  },
  {
    key: 'innovation_dev_actors',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Actors',
    width: 56,
  },
  {
    key: 'innovation_dev_organizations',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Organizations',
    width: 56,
  },
  {
    key: 'innovation_dev_beneficiaries',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Intended beneficiaries/users elaborated',
    width: 48,
  },
  {
    key: 'innovation_dev_expected_outcome',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Expected outcomes',
    width: 48,
  },
  {
    key: 'innovation_dev_knowledge_sharing',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Potential for researchers/policymakers adaptation',
    width: 48,
  },
  {
    key: 'innovation_dev_dissemination',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Method/tool qualifies for dissemination',
    width: 40,
  },
  {
    key: 'innovation_dev_tool_useful_context',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Context for tool usefulness',
    width: 48,
  },
  {
    key: 'innovation_dev_results_achieved_expected',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Results detailed with examples',
    width: 48,
  },
  {
    key: 'innovation_dev_tool_functions',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Tool function',
    width: 56,
  },
  {
    key: 'innovation_dev_used_beyond_context',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Innovation used beyond original context',
    width: 40,
  },
  {
    key: 'innovation_dev_adoption_context',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Adopted and adapted in other contexts',
    width: 48,
  },
  {
    key: 'innovation_dev_linked_tools',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Tools often used together',
    width: 56,
  },
  {
    key: 'innovation_dev_other_tools',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Other tools',
    width: 36,
  },
  {
    key: 'innovation_dev_other_tools_integration',
    section: 'INNOVATION_DEVELOPMENT',
    header: "Other tools' usage with this one description",
    width: 48,
  },
  {
    key: 'innovation_dev_cheaper',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Formulation: Is it cheaper compared to alternatives?',
    width: 48,
  },
  {
    key: 'innovation_dev_simpler',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Formulation: Is it simpler to use?',
    width: 40,
  },
  {
    key: 'innovation_dev_performs_better',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Formulation: Does it perform better?',
    width: 40,
  },
  {
    key: 'innovation_dev_desirable',
    section: 'INNOVATION_DEVELOPMENT',
    header:
      'Demand and Investment: Is the innovation desirable to intended users?',
    width: 56,
  },
  {
    key: 'innovation_dev_commercial_viability',
    section: 'INNOVATION_DEVELOPMENT',
    header:
      'Demand and Investment: Is the innovation commercially viable/is there investment potential?',
    width: 56,
  },
  {
    key: 'innovation_dev_enabling_environment',
    section: 'INNOVATION_DEVELOPMENT',
    header:
      'Sustained use: Is the innovation supported by a suitable enabling environment?',
    width: 56,
  },
  {
    key: 'innovation_dev_evidence_of_uptake',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Sustained use: Is there already evidence of uptake?',
    width: 48,
  },
  {
    key: 'innovation_dev_expansion_potential',
    section: 'INNOVATION_DEVELOPMENT',
    header:
      'Sustained use: Is there potential for actor in new contexts and for new purposes?',
    width: 56,
  },
  {
    key: 'innovation_dev_expansion_details',
    section: 'INNOVATION_DEVELOPMENT',
    header: 'Expansion and adaptation details',
    width: 48,
  },
];

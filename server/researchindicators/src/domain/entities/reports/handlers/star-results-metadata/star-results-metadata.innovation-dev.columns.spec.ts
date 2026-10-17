import { STAR_RESULTS_METADATA_RAW_COLUMNS } from './star-results-metadata.columns';
import { STAR_INNOVATION_DEV_RAW_COLUMNS } from './star-results-metadata.innovation-dev.columns';

/**
 * Design §3.2 aliases and §3.2a dictionary labels, in column order 81–111.
 * Literals, not read back from the column module's own construction.
 */
const INNOVATION_DEV_DICTIONARY = [
  ['innovation_dev_short_title', 'Short title'],
  ['innovation_dev_nature', 'Innovation nature'],
  ['innovation_dev_type', 'Innovation type'],
  ['innovation_dev_is_new_variety', 'New or improved variety or breed'],
  [
    'innovation_dev_varieties_count',
    'Number of new or improved lines/varieties',
  ],
  ['innovation_dev_readiness_level', 'Innovation readiness level'],
  ['innovation_dev_readiness_explanation', 'Readiness explanation'],
  ['innovation_dev_anticipated_users', 'Anticipated users'],
  ['innovation_dev_actors', 'Actors'],
  ['innovation_dev_organizations', 'Organizations'],
  ['innovation_dev_beneficiaries', 'Intended beneficiaries/users elaborated'],
  ['innovation_dev_expected_outcome', 'Expected outcomes'],
  [
    'innovation_dev_knowledge_sharing',
    'Potential for researchers/policymakers adaptation',
  ],
  ['innovation_dev_dissemination', 'Method/tool qualifies for dissemination'],
  ['innovation_dev_tool_useful_context', 'Context for tool usefulness'],
  [
    'innovation_dev_results_achieved_expected',
    'Results detailed with examples',
  ],
  ['innovation_dev_tool_functions', 'Tool function'],
  [
    'innovation_dev_used_beyond_context',
    'Innovation used beyond original context',
  ],
  ['innovation_dev_adoption_context', 'Adopted and adapted in other contexts'],
  ['innovation_dev_linked_tools', 'Tools often used together'],
  ['innovation_dev_other_tools', 'Other tools'],
  [
    'innovation_dev_other_tools_integration',
    "Other tools' usage with this one description",
  ],
  [
    'innovation_dev_cheaper',
    'Formulation: Is it cheaper compared to alternatives?',
  ],
  ['innovation_dev_simpler', 'Formulation: Is it simpler to use?'],
  ['innovation_dev_performs_better', 'Formulation: Does it perform better?'],
  [
    'innovation_dev_desirable',
    'Demand and Investment: Is the innovation desirable to intended users?',
  ],
  [
    'innovation_dev_commercial_viability',
    'Demand and Investment: Is the innovation commercially viable/is there investment potential?',
  ],
  [
    'innovation_dev_enabling_environment',
    'Sustained use: Is the innovation supported by a suitable enabling environment?',
  ],
  [
    'innovation_dev_evidence_of_uptake',
    'Sustained use: Is there already evidence of uptake?',
  ],
  [
    'innovation_dev_expansion_potential',
    'Sustained use: Is there potential for actor in new contexts and for new purposes?',
  ],
  ['innovation_dev_expansion_details', 'Expansion and adaptation details'],
] as const;

describe('STAR_INNOVATION_DEV_RAW_COLUMNS', () => {
  it('appends 31 Innovation Development columns after the existing 80', () => {
    expect(INNOVATION_DEV_DICTIONARY).toHaveLength(31);
    expect(STAR_INNOVATION_DEV_RAW_COLUMNS).toHaveLength(31);
    expect(STAR_RESULTS_METADATA_RAW_COLUMNS).toHaveLength(111);
    expect(STAR_RESULTS_METADATA_RAW_COLUMNS[74]?.key).toBe(
      'innovation_use_level',
    );
    expect(STAR_RESULTS_METADATA_RAW_COLUMNS[79]).toMatchObject({
      key: 'innovation_use_quantifications',
      section: 'INNOVATION_USE',
      header: 'Quantifications',
    });
    expect(
      STAR_RESULTS_METADATA_RAW_COLUMNS.slice(0, 80).some((column) =>
        column.key.startsWith('innovation_dev_'),
      ),
    ).toBe(false);
    expect(STAR_RESULTS_METADATA_RAW_COLUMNS.slice(80)).toEqual(
      STAR_INNOVATION_DEV_RAW_COLUMNS,
    );
  });

  it('sets each header equal to its dictionary label, in column order', () => {
    expect(
      STAR_INNOVATION_DEV_RAW_COLUMNS.map((column) => [
        column.key,
        column.header,
        column.section,
      ]),
    ).toEqual(
      INNOVATION_DEV_DICTIONARY.map(([key, header]) => [
        key,
        header,
        'INNOVATION_DEVELOPMENT',
      ]),
    );
  });
});

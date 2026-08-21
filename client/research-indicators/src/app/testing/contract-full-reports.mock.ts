// Shared fixture for the Project Dashboard "full-payload" feature.
// @sdd-spec docs/specs/project-dashboard/full-payload-show-more (T-01)
// @sdd-spec docs/specs/project-dashboard/indicator-metadata-charts (T-10)
//
// Typed against `@interfaces/contract-full-reports.interface`. This is the
// canonical `GET reports/full` payload for every spec in this feature — do
// not hand-roll per-test data (client guide: never reinvent fixtures).
//
// Deliberately encodes, in one payload, every invariant later tasks gate on:
//   - `top_partners` has 7 items (> 5, so it drives the "Show more" toggle)
//     AND is NOT sorted descending by `count` (T-05's sort hardening, R-PDB-004 AC.4).
//     Correct descending order would be Delta(60) > Beta(55) > Zeta(45) >
//     Alpha(40) > Gamma(30) > Epsilon(20) > Eta(10); the array below is not in
//     that order.
//   - `top_primary_levers` has exactly 5 items (R-PDB-002 AC.2 boundary — no
//     "Show more" control at exactly the collapsed limit), sorted descending.
//   - `top_main_contact_persons` contains a duplicate-display-name pair
//     ("Maria Rodriguez", `user_id` "contact-1" and "contact-2") — the display
//     name is `first_name + ' ' + last_name`; only `user_id` distinguishes the
//     rows (R-PDB-005).
//   - `top_contributors` has exactly 3 items, sorted descending.
//   - `staff` and `geo_scope` are populated (mirrored, unused by this spec)
//     so the interface is exercised in full — the geographic-scope spec is
//     the eventual consumer of `geo_scope`.
//
// indicator-metadata-charts (T-10) extends the same payload with the 10
// Indicator-metadata sections, carrying the five cases T-11/T-13/T-14 gate on
// (design §7.2, requirements DC-13):
//   - **> 5 categories**: `innovation_readiness`, 10 entries — T-01 measured
//     this as the one real chart that exceeds the 5-category threshold, so it
//     is the natural section to make large. Included regardless of live
//     counts (a sync-populated table's row count is not a contract).
//   - **exactly 5** (the boundary — no toggle at exactly 5): `policy_type`.
//   - **exactly 3**: `oicr_maturity` (also gender_distribution, incidentally).
//   - **empty array**: `policy_stage`.
//   - **deliberately out-of-order** (not sorted `count DESC, id ASC`, so
//     ordering assertions are not accidentally satisfied by insertion order):
//     `session_type` — Engagement(25) listed before Training(40); correct
//     order would be Training(40) first.
// The remaining sections (`innovation_nature`, `innovation_type`,
// `session_format`, `gender_distribution`, `degree`) carry ordinary,
// correctly-sorted, non-empty data.

import {
  ContractFullReports,
  ContractFullReportsContributor,
  ContractFullReportsMainContactPerson,
  ContractFullReportsPartner,
  ContractFullReportsPrimaryLever,
  ContractFullReportsStaffMember,
  IndicatorMetadataCount
} from '@interfaces/contract-full-reports.interface';

const OUT_OF_ORDER_PARTNERS: ContractFullReportsPartner[] = [
  { institution_id: 1, institution_name: 'Institution Alpha', acronym: 'IA', count: 40 },
  { institution_id: 2, institution_name: 'Institution Beta', acronym: 'IB', count: 55 },
  { institution_id: 3, institution_name: 'Institution Gamma', count: 30 },
  { institution_id: 4, institution_name: 'Institution Delta', acronym: 'ID', count: 60 },
  { institution_id: 5, institution_name: 'Institution Epsilon', count: 20 },
  { institution_id: 6, institution_name: 'Institution Zeta', acronym: 'IZ', count: 45 },
  { institution_id: 7, institution_name: 'Institution Eta', count: 10 }
];

const FIVE_PRIMARY_LEVERS: ContractFullReportsPrimaryLever[] = [
  { lever_id: 1, short_name: 'ADAPT', full_name: 'Climate Adaptation: Resilience', count: 50, icon: null },
  { lever_id: 2, short_name: 'GENDER', full_name: 'Gender Equality: Inclusion', count: 40 },
  { lever_id: 3, short_name: 'NEXUS', full_name: 'Multifunctional Landscapes: Nexus', count: 30 },
  { lever_id: 4, short_name: 'POLICY', full_name: 'Policy: Institutions', count: 20 },
  { lever_id: 5, short_name: 'DIET', full_name: 'Diets: Nutrition', count: 10 }
];

const MAIN_CONTACT_PERSONS_WITH_HOMONYM: ContractFullReportsMainContactPerson[] = [
  { user_id: 'contact-1', first_name: 'Maria', last_name: 'Rodriguez', email: 'maria.rodriguez@example.org', count: 25 },
  { user_id: 'contact-2', first_name: 'Maria', last_name: 'Rodriguez', email: 'maria.rodriguez2@example.org', count: 18 },
  { user_id: 'contact-3', first_name: 'James', last_name: 'Okafor', count: 12 },
  { user_id: 'contact-4', first_name: 'Aiko', last_name: 'Tanaka', count: 5 }
];

const THREE_CONTRIBUTORS: ContractFullReportsContributor[] = [
  { contract_id: 'CONTRIB-01', contract_description: 'Contributor Project One', count: 15 },
  { contract_id: 'CONTRIB-02', project_name: 'Contributor Project Two', count: 9 },
  { contract_id: 'CONTRIB-03', contract_description: 'Contributor Project Three', count: 3 }
];

const STAFF: ContractFullReportsStaffMember[] = [
  { name: 'Jordan Lee', role: 'Project Lead' },
  { name: 'Amara Chen', role: 'Program Assistant' }
];

// --- Indicator-metadata sections (indicator-metadata-charts spec, T-10) ---

const INNOVATION_NATURE: IndicatorMetadataCount[] = [
  { id: 1, name: 'Technological', count: 12 },
  { id: 2, name: 'Institutional', count: 8 },
  { id: 3, name: 'Policy or regulatory', count: 5 },
  { id: 4, name: 'Capacity development', count: 2 }
];

const INNOVATION_TYPE: IndicatorMetadataCount[] = [
  { id: 1, name: 'Technology', count: 20 },
  { id: 2, name: 'Product', count: 15 },
  { id: 3, name: 'Service', count: 9 },
  { id: 4, name: 'Process', count: 3 }
];

/** > 5 categories (design §7.2 / DC-13) — T-01 measured this as the one real chart of ten that exceeds 5. */
const INNOVATION_READINESS_TEN_CATEGORIES: IndicatorMetadataCount[] = [
  { id: 11, name: '0. Idea', count: 45 },
  { id: 12, name: '1. Basic research completed', count: 38 },
  { id: 13, name: '2. Proof of concept', count: 30 },
  { id: 14, name: '3. Prototype development', count: 25 },
  { id: 15, name: '4. Small-scale piloting', count: 20 },
  { id: 16, name: '5. Fully tested small-scale', count: 15 },
  { id: 17, name: '6. Piloting at scale', count: 10 },
  { id: 18, name: '7. Available for uptake', count: 7 },
  { id: 19, name: '8. Adopted or purchased', count: 4 },
  { id: 20, name: '9. Impact at scale achieved', count: 1 }
];

/** Exactly 3 categories. */
const OICR_MATURITY_THREE_CATEGORIES: IndicatorMetadataCount[] = [
  { id: 1, name: 'Level 1', count: 14 },
  { id: 2, name: 'Level 2', count: 9 },
  { id: 3, name: 'Level 3', count: 3 }
];

/** Exactly 5 categories — the boundary DC-13 asserts must NOT show a toggle. */
const POLICY_TYPE_FIVE_CATEGORIES: IndicatorMetadataCount[] = [
  { id: 1, name: 'Strategy/Plan/Program', count: 12 },
  { id: 2, name: 'Legal instrument', count: 9 },
  { id: 3, name: 'Bill/draft legislation', count: 7 },
  { id: 4, name: 'Budget/expenditure', count: 4 },
  { id: 5, name: 'Regulation and enforcement', count: 2 }
];

/** Empty array — R-IMC-007 AC.2 ("always present as an array, empty rather than absent"). */
const POLICY_STAGE_EMPTY: IndicatorMetadataCount[] = [];

const SESSION_FORMAT: IndicatorMetadataCount[] = [
  { id: 1, name: 'Individual', count: 32 },
  { id: 2, name: 'Group', count: 18 }
];

/** Deliberately out of order: Engagement(25) precedes Training(40) — correct order would be Training first. */
const SESSION_TYPE_OUT_OF_ORDER: IndicatorMetadataCount[] = [
  { id: 2, name: 'Engagement', count: 25 },
  { id: 1, name: 'Training', count: 40 }
];

const GENDER_DISTRIBUTION: IndicatorMetadataCount[] = [
  { id: 2, name: 'Female', count: 620 },
  { id: 1, name: 'Male', count: 410 },
  { id: 3, name: 'Non-binary', count: 15 }
];

const DEGREE: IndicatorMetadataCount[] = [
  { id: 1, name: 'PhD', count: 22 },
  { id: 2, name: 'MSc', count: 15 },
  { id: 3, name: 'BSc', count: 8 },
  { id: 4, name: 'Other', count: 1 }
];

/** Deep-clones the canonical fixture so callers can safely mutate the result. `overrides` shallow-merge onto the top level. */
export function mockContractFullReports(overrides: Partial<ContractFullReports> = {}): ContractFullReports {
  return {
    contract_id: 'FULL-CONTRACT-100',
    top_partners: OUT_OF_ORDER_PARTNERS.map(item => ({ ...item })),
    top_primary_levers: FIVE_PRIMARY_LEVERS.map(item => ({ ...item })),
    top_main_contact_persons: MAIN_CONTACT_PERSONS_WITH_HOMONYM.map(item => ({ ...item })),
    top_contributors: THREE_CONTRIBUTORS.map(item => ({ ...item })),
    staff: STAFF.map(item => ({ ...item })),
    geo_scope: {
      geo_scope_summary: { global: 2, regional: 5, countries: 20, sub_national: 8, yet_to_be_determined: 1 },
      top_regions: [
        { region_id: 1, region_name: 'West Africa', count: 12 },
        { region_id: 2, region_name: 'South Asia', count: 8 }
      ],
      top_countries: [
        {
          iso_alpha_2: 'KE',
          country_name: 'Kenya',
          count: 14,
          top_sub_nationals: [
            { sub_national_id: 101, sub_national_name: 'Nairobi County', count: 6 },
            { sub_national_id: 102, sub_national_name: 'Kisumu County', count: 4 }
          ]
        },
        {
          iso_alpha_2: 'VN',
          country_name: 'Vietnam',
          count: 9,
          top_sub_nationals: []
        }
      ]
    },
    innovation_nature: INNOVATION_NATURE.map(item => ({ ...item })),
    innovation_type: INNOVATION_TYPE.map(item => ({ ...item })),
    innovation_readiness: INNOVATION_READINESS_TEN_CATEGORIES.map(item => ({ ...item })),
    oicr_maturity: OICR_MATURITY_THREE_CATEGORIES.map(item => ({ ...item })),
    policy_type: POLICY_TYPE_FIVE_CATEGORIES.map(item => ({ ...item })),
    policy_stage: POLICY_STAGE_EMPTY.map(item => ({ ...item })),
    session_format: SESSION_FORMAT.map(item => ({ ...item })),
    session_type: SESSION_TYPE_OUT_OF_ORDER.map(item => ({ ...item })),
    gender_distribution: GENDER_DISTRIBUTION.map(item => ({ ...item })),
    degree: DEGREE.map(item => ({ ...item })),
    ...overrides
  };
}

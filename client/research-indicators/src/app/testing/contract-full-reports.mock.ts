// Shared fixture for the Project Dashboard "full-payload" feature.
// @sdd-spec docs/specs/project-dashboard/full-payload-show-more (T-01)
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

import {
  ContractFullReports,
  ContractFullReportsContributor,
  ContractFullReportsMainContactPerson,
  ContractFullReportsPartner,
  ContractFullReportsPrimaryLever,
  ContractFullReportsStaffMember
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
    ...overrides
  };
}

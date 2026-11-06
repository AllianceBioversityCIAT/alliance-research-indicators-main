import { QueryRunner } from 'typeorm';
import { LoggerUtil } from '../../domain/shared/utils/logger.util';

/**
 * Organizational Structure seed (docs/specs/institutional-performance/
 * organizational-structure, R-ORG-015, design 3.4, D-ORG-12, D-ORG-14,
 * D-ORG-16).
 *
 * Lives OUTSIDE `src/db/migrations/**` on purpose: `orm.config.ts` treats every
 * exported FUNCTION of a migration file as a migration and rejects names
 * without a 13-digit timestamp ("migration name is wrong"), so
 * `1791000000004-seedOrgStructure.ts` imports these functions and exports only
 * its class (same reason as `control-lists.seed.ts`, D-CLG-11).
 *
 * Every statement is `INSERT ... SELECT ... WHERE NOT EXISTS` on the entry's
 * fixed id, so a second run inserts 0 rows; each function returns the total of
 * inserted rows (`affectedRows`) so the seed suite can assert that. Statements
 * carry no `?` and no `:word` outside quotes (the datasource enables
 * `namedPlaceholders` and these pass no parameters); text is escaped by
 * `sqlString`.
 *
 * The `AUTO_INCREMENT` reset is DDL and is NOT in the functions a test re-calls:
 * `raiseOrgUnitsAutoIncrement` runs once, last, and only when the run inserted
 * entries. It is not a no-op on a re-run (it can rewind a counter that deletes
 * had pushed above MAX(id) + 1), and DDL takes an exclusive metadata lock that
 * deadlocked parallel integration workers (T-05). Consequence: `up()` is not
 * atomic, because that `ALTER` commits implicitly. It is last, so everything
 * before it is rolled back together if a guard or an insert fails; if the
 * `ALTER` itself fails the data is already complete and a re-run recovers
 * (precondition passes, 0 rows inserted, and InnoDB already raised the counter
 * past every explicit id).
 *
 * Guards (RB, Reviewer advisory 1): `assertOrgSeedPreconditions` aborts before
 * any write when an entry that is not part of the seed already sits in
 * `org_units`; `assertOrgSeedPostconditions` checks 117 / 117 / 117 afterwards.
 *
 * Source: the `TREE` constant of `docs/specs/institutional-performance/mockup/
 * OrgStructure.dc.html` (:417-447), flattened in the same depth-first walk the
 * mockup's `seed()` uses (parent, then its kids in order): 117 entries, ids
 * 1..117, codes ORG-001..ORG-117, every version `[2026, open)`, every entry
 * `active`. Names and acronyms are the mockup's, verbatim. No delegates.
 *
 * Directors come from the requester's sheet "ORGANIZATIONAL STRUCTURE -
 * Alliance Bioversity-CIAT" (source: Organizational-Structure-June-2026, 2026-
 * 10-28): the *Department director* on each L2 and the *Unit director* on each
 * L4; L1 and L3 have none. Where a cell names two people only the first is the
 * director (Climate Readiness, Biodiversity and Restoration); the second is not
 * seeded because delegates are keyed by version only from `…005` on.
 * They are resolved against the TARGET database at run time (Dev and Prod each
 * hold their own staff): by email (case-insensitive), else by exact first +
 * last name; a single ACTIVE match stores that staff row's real carnet, any
 * other outcome stores NULL and is reported. The `SEED_DIRECTORS` keys (the
 * email) are never stored.
 *
 * @akili-spec institutional-performance/organizational-structure
 */

export const SEED_YEAR = 2026;
export const SEED_LAST_ID = 117;

/** [id, levelValueId, parentId, name, acronym, directorKey] */
export type SeedEntry = readonly [
  number,
  number,
  number | null,
  string,
  string | null,
  string | null,
];

export const SEED_ENTRIES: ReadonlyArray<SeedEntry> = [
  [1, 20, null, 'Research', null, null],
  [
    2,
    21,
    1,
    'Office of the Associate Director General, Research Strategy and Innovation',
    'ADG Research',
    'm.quintero@cgiar.org',
  ],
  [3, 23, 2, 'Gender', null, 'marlene.elias@cgiar.org'],
  [4, 23, 2, 'Impact SF', null, null],
  [5, 21, 1, 'Digital Inclusion', null, 'j.vanetten@cgiar.org'],
  [6, 23, 5, 'Inclusive Design and User Research', null, null],
  [7, 23, 5, 'Digital Solution Development', null, null],
  [8, 23, 5, 'Digital Transformation of Agri-food System', null, null],
  [9, 23, 5, 'Data Driven Sustainability', null, null],
  [
    10,
    21,
    1,
    'Food Environment and Consumer Behaviour',
    null,
    'm.lundy@cgiar.org',
  ],
  [
    11,
    23,
    10,
    'Food Environment and Consumer Behaviour',
    null,
    'm.lundy@cgiar.org',
  ],
  [
    12,
    21,
    1,
    'Policy, Inclusion and Socio-Economic Analyses for Impact and Learning',
    null,
    'e.gotor@cgiar.org',
  ],
  [
    13,
    23,
    12,
    'Data Management and Open Science',
    null,
    'm.a.laporte@cgiar.org',
  ],
  [
    14,
    23,
    12,
    'MELP - Monitoring, Evaluation, Learning and Performance',
    null,
    'i.cortesini@cgiar.org',
  ],
  [
    15,
    23,
    12,
    'Foresight and Applied Economics for Impact',
    null,
    'c.gonzalez@cgiar.org',
  ],
  [16, 23, 12, 'Gender and Social Inclusion', null, null],
  [
    17,
    21,
    1,
    'Office for Program Delivery (OPD)',
    'OPD',
    'a.lhommeau@cgiar.org',
  ],
  [18, 23, 17, 'Science Editing Unit', null, 'o.spellman@cgiar.org'],
  [
    19,
    23,
    17,
    'Lever Program Management Officers (PMO)',
    null,
    'a.lhommeau@cgiar.org',
  ],
  [20, 23, 17, 'Grants Management Unit (GMU)', null, 'e.lago@cgiar.org'],
  [21, 21, 1, 'Office for Program Development and Strategy', null, null],
  [22, 23, 21, 'Office for Program Development and Strategy', null, null],
  [23, 21, 1, 'Climate Action', null, 'h.rueff@cgiar.org'],
  [24, 23, 23, 'Achieving Net-Zero', null, null],
  [25, 23, 23, 'Climate Security and Migration', null, 'g.pacillo@cgiar.org'],
  [
    26,
    23,
    23,
    'Climate Services for Agriculture',
    null,
    'j.r.villegas@cgiar.org',
  ],
  [27, 23, 23, 'Climate Readiness', null, 'e.girvetz@cgiar.org'],
  [28, 21, 1, 'Multifunctional Landscape', 'MFL', 'lt.desta@cgiar.org'],
  [29, 23, 28, 'Low Emissions Landscapes', null, null],
  [30, 23, 28, 'Soils and Water Management', null, 'j.kihara@cgiar.org'],
  [
    31,
    23,
    28,
    'Ecosystem Services and Environmental Impact',
    null,
    'w.francesconi@cgiar.org',
  ],
  [
    32,
    23,
    28,
    'Biodiversity and Restoration for Livelihoods and Resilience',
    null,
    'l.verchot@cgiar.org',
  ],
  [33, 23, 28, 'MFL Laboratories', null, null],
  [
    34,
    21,
    1,
    'Biodiversity for Food and Agriculture',
    null,
    'c.fadda@cgiar.org',
  ],
  [
    35,
    23,
    34,
    'Agrobiodiversity in Production System',
    null,
    'y.gebrehawaryat@cgiar.org',
  ],
  [
    36,
    23,
    34,
    'Plant Genetic Resources & seed Policies',
    null,
    'm.halewood@cgiar.org',
  ],
  [
    37,
    23,
    34,
    'Forest Genetic Resources for Resilient Landscape',
    null,
    'c.kettle@cgiar.org',
  ],
  [38, 23, 34, 'Cacao of Excellence', null, 'j.simonis@cgiar.org'],
  [39, 21, 1, 'Crops for Nutrition and Health', null, 'm.f.alvarez@cgiar.org'],
  [40, 23, 39, 'Bean', null, 'j.c.rubyogo@cgiar.org'],
  [41, 23, 39, 'Genebank', null, 'p.wenzl@cgiar.org'],
  [42, 23, 39, 'Cassava', null, 'j.newby@cgiar.org'],
  [43, 23, 39, 'Biotechnology', null, null],
  [44, 23, 39, 'Tropical Forages', null, 'j.arango@cgiar.org'],
  [45, 23, 39, 'Banana', null, 's.carpentier@cgiar.org'],
  [46, 23, 39, 'Rice', null, 'm.f.alvarez@cgiar.org'],
  [47, 23, 39, 'Rice - Flar', null, 'j.vanoosten@cgiar.org'],
  [48, 20, null, 'Global Support', null, null],
  [
    49,
    21,
    48,
    'Office of the Director General',
    'ODG',
    'j.l.restrepo@cgiar.org',
  ],
  [50, 23, 49, 'Legal Office', 'Legal', 'e.munoz@cgiar.org'],
  [51, 23, 49, 'Ethics Unit', 'Ethics', 'f.noukam@cgiar.org'],
  [52, 23, 49, 'Internal Audit Unit', null, 'i.muchiri@cgiar.org'],
  [
    53,
    21,
    48,
    'People and Organizational Development',
    'POD',
    'v.riveros@cgiar.org',
  ],
  [54, 23, 53, 'Culture Performance and Engagement', null, null],
  [55, 23, 53, 'Total Rewards', null, 's.ibarra@cgiar.org'],
  [56, 23, 53, 'Wellbeing, Health and Safety', null, 'd.ongesa@cgiar.org'],
  [
    57,
    23,
    53,
    'Organizational Development and Strategy',
    null,
    'v.riveros@cgiar.org',
  ],
  [58, 22, 53, 'HR Operations', null, null],
  [59, 23, 58, 'Global Specialized Services', null, 'a.carrillo@cgiar.org'],
  [60, 23, 58, 'HR Operations Africa', null, 'a.kareri@cgiar.org'],
  [61, 23, 58, 'HR Operations Americas', null, 'johanna.rojas@cgiar.org'],
  [62, 23, 58, 'HR Operations Asia', null, 'o.hathi@cgiar.org'],
  [63, 23, 58, 'HR Operations Europe', null, 'b.nicolini@cgiar.org'],
  [64, 21, 48, 'Business Operations and Finance', 'BOF', 'v.guardia@cgiar.org'],
  [65, 23, 64, 'Global Treasury', null, 'l.esquivel@cgiar.org'],
  [66, 23, 64, 'Finance Quality Assurance', null, 'e.ibarguen@cgiar.org'],
  [
    67,
    23,
    64,
    'Project Financial Analysis and Support – PLANS',
    null,
    'a.safarian@cgiar.org',
  ],
  [68, 23, 64, 'Accounting Services', null, 's.dininno@cgiar.org'],
  [
    69,
    23,
    64,
    'Financial Planning and Analysis FP&A',
    null,
    'a.delbianco@cgiar.org',
  ],
  [70, 23, 64, 'Security Management', null, 'a.ngoto@cgiar.org'],
  [
    71,
    23,
    64,
    'Regional Operations and Finance Africa',
    null,
    'v.delahaye@cgiar.org',
  ],
  [72, 23, 64, 'Regional Operations and Finance Asia', null, 'l.ann@cgiar.org'],
  [
    73,
    23,
    64,
    'Regional Operations and Finance Americas',
    null,
    'd.c.mayor@cgiar.org',
  ],
  [
    74,
    23,
    64,
    'Regional Operations and Finance Europe',
    null,
    'g.grespan@cgiar.org',
  ],
  [
    75,
    21,
    48,
    'Strategic Partnerships, Engagement and Communications',
    'SPEC',
    's.speck@cgiar.org',
  ],
  [76, 23, 75, 'Partnerships and Stakeholder Engagement', null, null],
  [77, 23, 75, 'Proposal and Pipeline Management', null, null],
  [78, 23, 75, 'Business Development and Diversification', null, null],
  [79, 23, 75, 'Global Communications', null, 'j.m.fernandez@cgiar.org'],
  [80, 23, 75, 'Digital & Internal Comms', null, 'a.gentile@cgiar.org'],
  [
    81,
    23,
    75,
    'Publications, Brand & Graphic Design',
    null,
    'v.rengifo@cgiar.org',
  ],
  [82, 21, 48, 'Technology Integration', 'DT', 'd.abreu@cgiar.org'],
  [83, 23, 82, 'IT System Integration', null, 'g.tarantino@cgiar.org'],
  [84, 23, 82, 'IT Operations and Service Desk', null, 'm.benocci@cgiar.org'],
  [
    85,
    23,
    82,
    'Integration and Capacity Development',
    null,
    'i.jones@cgiar.org',
  ],
  [
    86,
    23,
    82,
    'IT Network Infrastructure & Security',
    null,
    'd.m.gomez@cgiar.org',
  ],
  [
    87,
    23,
    82,
    'Innovation and Business Development',
    null,
    'h.f.tobon@cgiar.org',
  ],
  [88, 20, null, 'Regional', null, null],
  [89, 21, 88, 'Africa', 'Africa', 'w.kamaur@cgiar.org'],
  [90, 23, 89, 'Managing Director Office Africa', null, 'w.kamaur@cgiar.org'],
  [91, 23, 89, 'Africa Partnerships', null, null],
  [
    92,
    23,
    89,
    'Regional Operations and Finance Africa',
    null,
    'v.delahaye@cgiar.org',
  ],
  [93, 23, 89, 'HR Operations Africa', null, 'a.kareri@cgiar.org'],
  [94, 23, 89, 'Regional Communications', null, null],
  [95, 23, 89, 'Regional IT Operations and Service Desk', null, null],
  [96, 21, 88, 'Asia', 'Asia', 's.weise@cgiar.org'],
  [97, 23, 96, 'Managing Director Office Asia', null, 's.weise@cgiar.org'],
  [98, 23, 96, 'Asia Partnerships', null, null],
  [99, 23, 96, 'Regional Operations and Finance Asia', null, 'l.ann@cgiar.org'],
  [100, 23, 96, 'HR Operations Asia', null, 'o.hathi@cgiar.org'],
  [101, 23, 96, 'Regional Communications', null, null],
  [102, 23, 96, 'Regional IT Operations and Service Desk', null, null],
  [103, 21, 88, 'Americas', 'Americas', 'm.rajasekharan@cgiar.org'],
  [
    104,
    23,
    103,
    'Managing Director Office Americas',
    null,
    'm.rajasekharan@cgiar.org',
  ],
  [105, 23, 103, 'Americas Partnerships', null, null],
  [106, 23, 103, 'Security', null, null],
  [107, 23, 103, 'Bogota Office', null, null],
  [
    108,
    23,
    103,
    'Regional Operations and Finance Americas',
    null,
    'd.c.mayor@cgiar.org',
  ],
  [109, 23, 103, 'HR Operations Americas', null, 'johanna.rojas@cgiar.org'],
  [110, 23, 103, 'Regional Communications', null, null],
  [111, 23, 103, 'Regional IT Operations and Service Desk', null, null],
  [112, 21, 88, 'Europe', 'Europe', 'j.l.restrepo@cgiar.org'],
  [113, 23, 112, 'Europe Partnerships', null, null],
  [
    114,
    23,
    112,
    'Regional Operations and Finance Europe',
    null,
    'g.grespan@cgiar.org',
  ],
  [115, 23, 112, 'HR Operations Europe', null, 'b.nicolini@cgiar.org'],
  [116, 23, 112, 'Regional Communications', null, null],
  [117, 23, 112, 'Regional IT Operations and Service Desk', null, null],
];

export interface SeedDirector {
  name: string;
  /** null when the source sheet gives none: matched by name only */
  email: string | null;
}

const person = (name: string, email: string | null = null) => ({
  name,
  email,
});

/** Keyed by lowercase email (or the name when the sheet has no email). */
export const SEED_DIRECTORS: Readonly<Record<string, SeedDirector>> =
  Object.fromEntries(
    [
      person('Marcela Quintero', 'm.quintero@cgiar.org'),
      person('Marlène Elias', 'marlene.elias@cgiar.org'),
      person('Jacob van Etten', 'j.vanetten@cgiar.org'),
      person('Mark Lundy', 'm.lundy@cgiar.org'),
      person('Elisabetta Gotor', 'e.gotor@cgiar.org'),
      person('Marie Angelique Laporte', 'm.a.laporte@cgiar.org'),
      person('Ivana Cortesini', 'i.cortesini@cgiar.org'),
      person('Carolina Gonzalez', 'c.gonzalez@cgiar.org'),
      person('Annabelle Lhommeau', 'a.lhommeau@cgiar.org'),
      person('Olga Spellman', 'o.spellman@cgiar.org'),
      person('Eleonora Lago', 'e.lago@cgiar.org'),
      person('Henri Rueff', 'h.rueff@cgiar.org'),
      person('Grazia Pacillo', 'g.pacillo@cgiar.org'),
      person('Julian Ramirez Villegas', 'j.r.villegas@cgiar.org'),
      person('Evan Girvetz', 'e.girvetz@cgiar.org'),
      person('Lulseged Desta', 'lt.desta@cgiar.org'),
      person('Job Maguta Kihara', 'j.kihara@cgiar.org'),
      person('Wendy Francesconi', 'w.francesconi@cgiar.org'),
      person('Louis Verchot', 'l.verchot@cgiar.org'),
      person('Carlo Fadda', 'c.fadda@cgiar.org'),
      person('Yosef Gebrehawaryat', 'y.gebrehawaryat@cgiar.org'),
      person('Michael Halewood', 'm.halewood@cgiar.org'),
      person('Chris Kettle', 'c.kettle@cgiar.org'),
      person('Julien Simonis', 'j.simonis@cgiar.org'),
      person('Maria Fernanda Álvarez', 'm.f.alvarez@cgiar.org'),
      person('Jean Claude Rubyogo', 'j.c.rubyogo@cgiar.org'),
      person('Peter Wenzl', 'p.wenzl@cgiar.org'),
      person('Jonathan Newby', 'j.newby@cgiar.org'),
      person('Jacobo Arango', 'j.arango@cgiar.org'),
      person('Sebastien Carpentier', 's.carpentier@cgiar.org'),
      person('José Stefan van Oosten Molano', 'j.vanoosten@cgiar.org'),
      person('Juan Lucas Restrepo', 'j.l.restrepo@cgiar.org'),
      person('Mauricio Muñoz', 'e.munoz@cgiar.org'),
      person('Franck Erick Kalla', 'f.noukam@cgiar.org'),
      person('Irene Muchiri', 'i.muchiri@cgiar.org'),
      person('Vanessa Riveros', 'v.riveros@cgiar.org'),
      person('Santiago Ibarra', 's.ibarra@cgiar.org'),
      person('David Onyango Ongesa', 'd.ongesa@cgiar.org'),
      person('Ana Marta Carrillo', 'a.carrillo@cgiar.org'),
      person('Alice Kareri', 'a.kareri@cgiar.org'),
      person('Johanna Rojas', 'johanna.rojas@cgiar.org'),
      person('Ha Thi Oanh', 'o.hathi@cgiar.org'),
      person('Bianca Nicolini', 'b.nicolini@cgiar.org'),
      person('Victor Guardia', 'v.guardia@cgiar.org'),
      person('Laura Esquivel', 'l.esquivel@cgiar.org'),
      person('Alexander Ibarguen', 'e.ibarguen@cgiar.org'),
      person('Anastasia Safarian', 'a.safarian@cgiar.org'),
      person('Sonia Di Ninno', 's.dininno@cgiar.org'),
      person('Andrea Del Bianco', 'a.delbianco@cgiar.org'),
      person('Anthony Ngoto', 'a.ngoto@cgiar.org'),
      person('Vincent Delahaye', 'v.delahaye@cgiar.org'),
      person('Leong Ann Bang', 'l.ann@cgiar.org'),
      person('Diana Carolina Mayor', 'd.c.mayor@cgiar.org'),
      person('Gabriele Grespan', 'g.grespan@cgiar.org'),
      person('Stephanie Speck', 's.speck@cgiar.org'),
      person('Julio Mario Fernández', 'j.m.fernandez@cgiar.org'),
      person('Andrea Gentile', 'a.gentile@cgiar.org'),
      person('Victoria Rengifo', 'v.rengifo@cgiar.org'),
      person('David Abreu', 'd.abreu@cgiar.org'),
      person('Gabriele Tarantino', 'g.tarantino@cgiar.org'),
      person('Massimiliano Benocci', 'm.benocci@cgiar.org'),
      person('Idris D. Jones', 'i.jones@cgiar.org'),
      person('Dolly Gómez', 'd.m.gomez@cgiar.org'),
      person('Héctor Fabio Tobón', 'h.f.tobon@cgiar.org'),
      person('Wanjiru Kamau-Rutenberg', 'w.kamaur@cgiar.org'),
      person('Stephan Weise', 's.weise@cgiar.org'),
      person('Maya Rajasekharan', 'm.rajasekharan@cgiar.org'),
    ].map((p) => [p.email ?? p.name, p]),
  );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const affectedRows = (result: unknown): number =>
  Number((result as { affectedRows?: number } | undefined)?.affectedRows ?? 0);

/** Quote and escape a text literal (the seed passes no bound parameters). */
export const sqlString = (value: string): string =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const sqlNullable = (value: string | number | null): string => {
  if (value === null) return 'NULL';
  return typeof value === 'number' ? `${value}` : sqlString(value);
};

export const seedCode = (id: number): string =>
  `ORG-${String(id).padStart(3, '0')}`;

// ---------------------------------------------------------------------------
// Directors
// ---------------------------------------------------------------------------

export interface StaffCandidate {
  carnet: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_active: number | boolean;
}

export type DirectorOutcome =
  | 'matched'
  | 'no match'
  | 'several'
  | 'inactive staff only';

export interface DirectorMatch {
  outcome: DirectorOutcome;
  carnet: string | null;
  staffName: string | null;
}

const isActive = (staff: StaffCandidate): boolean =>
  Number(staff.is_active) === 1;

const fullName = (staff: StaffCandidate): string =>
  `${staff.first_name} ${staff.last_name}`.replace(/\s+/g, ' ').trim();

/**
 * Pure matching rule (R-ORG-015): email first (case-insensitive), then exact
 * first + last name (the only step when the source has no email). A step with exactly one active hit decides; two or more
 * active hits is `several` (NULL, and the name step is NOT tried: an ambiguous
 * email is not resolved by guessing). Inactive staff are not candidates (the
 * picker offers active staff only, P-14), but a lone inactive hit is reported
 * as `inactive staff only` instead of `no match`.
 */
export const matchDirector = (
  staff: ReadonlyArray<StaffCandidate>,
  director: SeedDirector,
): DirectorMatch => {
  const email = director.email?.trim().toLowerCase() ?? '';
  const wantedName = director.name.replace(/\s+/g, ' ').trim();
  const steps: Array<(s: StaffCandidate) => boolean> = [
    // No email in the source: skip the step, or every email-less staff row hits.
    ...(email
      ? [(s: StaffCandidate) => (s.email ?? '').trim().toLowerCase() === email]
      : []),
    (s) => fullName(s) === wantedName,
  ];

  let sawInactive = false;
  for (const test of steps) {
    const hits = staff.filter(test);
    const active = hits.filter(isActive);
    if (active.length === 1) {
      return {
        outcome: 'matched',
        carnet: active[0].carnet,
        staffName: fullName(active[0]),
      };
    }
    if (active.length > 1) {
      return { outcome: 'several', carnet: null, staffName: null };
    }
    if (hits.length > 0) sawInactive = true;
  }
  return {
    outcome: sawInactive ? 'inactive staff only' : 'no match',
    carnet: null,
    staffName: null,
  };
};

export interface SeedDirectorReportRow {
  unitId: number;
  code: string;
  unitName: string;
  directorKey: string;
  directorName: string;
  email: string | null;
  outcome: DirectorOutcome;
  carnet: string | null;
  staffName: string | null;
}

export interface ResolvedSeedDirectors {
  /** directorKey -> real carnet, or null when unmatched */
  carnets: Map<string, string | null>;
  /** one row per entry that has a director in the source, in id order */
  report: SeedDirectorReportRow[];
}

export const resolveSeedDirectors = async (
  runner: QueryRunner,
  directors: Readonly<Record<string, SeedDirector>> = SEED_DIRECTORS,
  entries: ReadonlyArray<SeedEntry> = SEED_ENTRIES,
): Promise<ResolvedSeedDirectors> => {
  const staff: StaffCandidate[] = await runner.query(
    `SELECT carnet, first_name, last_name, email, is_active
       FROM alliance_user_staff
      WHERE deleted_at IS NULL`,
  );

  const carnets = new Map<string, string | null>();
  const matches = new Map<string, DirectorMatch>();
  for (const [key, director] of Object.entries(directors)) {
    const match = matchDirector(staff, director);
    matches.set(key, match);
    carnets.set(key, match.carnet);
  }

  const report: SeedDirectorReportRow[] = [];
  for (const [id, , , name, , key] of entries) {
    if (key === null) continue;
    const director = directors[key];
    const match = matches.get(key);
    report.push({
      unitId: id,
      code: seedCode(id),
      unitName: name,
      directorKey: key,
      directorName: director.name,
      email: director.email,
      outcome: match.outcome,
      carnet: match.carnet,
      staffName: match.staffName,
    });
  }
  return { carnets, report };
};

// ---------------------------------------------------------------------------
// Inserts (each returns affectedRows; a re-run returns 0)
// ---------------------------------------------------------------------------

export const seedOrgUnits = async (
  runner: QueryRunner,
  entries: ReadonlyArray<SeedEntry> = SEED_ENTRIES,
): Promise<number> => {
  let inserted = 0;
  for (const [id] of entries) {
    inserted += affectedRows(
      await runner.query(`
        INSERT INTO \`org_units\`
          (\`id\`, \`code\`, \`status\`, \`status_from_year\`, \`successor_id\`)
        SELECT ${id}, ${sqlString(seedCode(id))}, 'active', NULL, NULL
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`org_units\` u WHERE u.\`id\` = ${id}
        )
      `),
    );
  }
  return inserted;
};

/**
 * Every admin-created entry must start above the seeded ids (D-CTL-14). DDL,
 * so it is kept out of the insert functions above; see the header note.
 */
export const raiseOrgUnitsAutoIncrement = async (
  runner: QueryRunner,
): Promise<void> => {
  await runner.query(
    `ALTER TABLE \`org_units\` AUTO_INCREMENT = ${SEED_LAST_ID + 1}`,
  );
};

export const seedOrgUnitVersions = async (
  runner: QueryRunner,
  directors: ReadonlyMap<string, string | null>,
  entries: ReadonlyArray<SeedEntry> = SEED_ENTRIES,
): Promise<number> => {
  let inserted = 0;
  for (const [id, levelId, parentId, name, acronym, key] of entries) {
    const carnet = key === null ? null : (directors.get(key) ?? null);
    inserted += affectedRows(
      await runner.query(`
        INSERT INTO \`org_unit_versions\`
          (\`org_unit_id\`, \`valid_from_year\`, \`valid_to_year\`, \`name\`,
           \`acronym\`, \`level_value_id\`, \`parent_id\`, \`director_carnet\`)
        SELECT ${id}, ${SEED_YEAR}, NULL, ${sqlString(name)},
               ${sqlNullable(acronym)}, ${levelId}, ${sqlNullable(parentId)},
               ${sqlNullable(carnet)}
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`org_unit_versions\` v WHERE v.\`org_unit_id\` = ${id}
        )
      `),
    );
  }
  return inserted;
};

export const seedOrgUnitChangeLog = async (
  runner: QueryRunner,
  directors: ReadonlyMap<string, string | null>,
  entries: ReadonlyArray<SeedEntry> = SEED_ENTRIES,
): Promise<number> => {
  let inserted = 0;
  for (const [id, levelId, parentId, name, acronym, key] of entries) {
    const carnet = key === null ? null : (directors.get(key) ?? null);
    // Same shape the create path writes: only non-null fields, old = null.
    // Built with JSON_OBJECT, not a JSON text literal: the "key":value colons
    // of a literal trip the datasource's named-placeholder rewrite.
    const pair = (value: string | number) =>
      `JSON_OBJECT('old', NULL, 'new', ${sqlNullable(value)})`;
    const fields: string[] = [
      `'code', ${pair(seedCode(id))}`,
      `'name', ${pair(name)}`,
    ];
    if (acronym !== null) fields.push(`'acronym', ${pair(acronym)}`);
    fields.push(`'levelId', ${pair(levelId)}`);
    if (parentId !== null) fields.push(`'parentId', ${pair(parentId)}`);
    if (carnet !== null) fields.push(`'directorCarnet', ${pair(carnet)}`);
    const changes = `JSON_OBJECT(${fields.join(', ')})`;

    inserted += affectedRows(
      await runner.query(`
        INSERT INTO \`org_unit_change_log\`
          (\`org_unit_id\`, \`action\`, \`applies_from_year\`, \`backdated\`, \`changes\`)
        SELECT ${id}, 'seed', ${SEED_YEAR}, 0, ${changes}
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`org_unit_change_log\` l
          WHERE l.\`org_unit_id\` = ${id} AND l.\`action\` = 'seed'
        )
      `),
    );
  }
  return inserted;
};

// ---------------------------------------------------------------------------
// Guards (aborting here rolls the whole migration back: nothing was written yet
// or everything written is in the same transaction)
// ---------------------------------------------------------------------------

export interface OrgSeedPreFacts {
  /** every row of `org_units` */
  unitCount: number;
  /** every `seed` row of `org_unit_change_log` */
  seedLogCount: number;
  /** the entries whose id is inside the seeded range, with their code */
  lowIdUnits: ReadonlyArray<{ id: number; code: string; seeded: boolean }>;
}

/**
 * Pure rule. A database is safe to seed when it is empty, or when it already
 * holds the seed (a re-run). It is NOT safe when an entry that is not part of
 * the seed sits in `org_units`: the `WHERE NOT EXISTS` on the fixed id would
 * skip that id, a `seed` log row would then claim a history it never had, and
 * ids 2.. would hang under the foreign entry as `parent_id = 1`.
 * - rows exist but no `seed` log row exists anywhere: entries came first;
 * - an id inside 1..117 has no `seed` log row AND a code other than
 *   `ORG-<id>`: a foreign entry took a seeded id. (A seeded entry whose code an
 *   admin edited later has its `seed` row and is left alone.)
 */
export const findOrgSeedPreconditionProblems = (
  facts: OrgSeedPreFacts,
): string[] => {
  const problems: string[] = [];
  if (facts.unitCount > 0 && facts.seedLogCount === 0) {
    problems.push(
      `org_units already holds ${facts.unitCount} row(s) and no "seed" log row exists: entries were created before the seed ran`,
    );
  }
  for (const unit of facts.lowIdUnits) {
    const id = Number(unit.id);
    if (!unit.seeded && unit.code !== seedCode(id)) {
      problems.push(
        `id ${id} holds code "${unit.code}" and is not a seeded entry (expected ${seedCode(id)})`,
      );
    }
  }
  return problems;
};

export const assertOrgSeedPreconditions = async (
  runner: QueryRunner,
): Promise<void> => {
  const [counts] = await runner.query(`
    SELECT
      (SELECT COUNT(*) FROM \`org_units\`) AS unit_count,
      (SELECT COUNT(*) FROM \`org_unit_change_log\` WHERE \`action\` = 'seed') AS seed_count
  `);
  const low: Array<{ id: number | string; code: string; seeded: number }> =
    await runner.query(`
      SELECT u.\`id\`, u.\`code\`,
             EXISTS (
               SELECT 1 FROM \`org_unit_change_log\` l
               WHERE l.\`org_unit_id\` = u.\`id\` AND l.\`action\` = 'seed'
             ) AS seeded
        FROM \`org_units\` u
       WHERE u.\`id\` <= ${SEED_LAST_ID}
       ORDER BY u.\`id\`
    `);
  const problems = findOrgSeedPreconditionProblems({
    unitCount: Number(counts.unit_count),
    seedLogCount: Number(counts.seed_count),
    lowIdUnits: low.map((row) => ({
      id: Number(row.id),
      code: row.code,
      seeded: Number(row.seeded) === 1,
    })),
  });
  if (problems.length > 0) {
    throw new Error(
      `Organizational Structure seed aborted before writing anything: ${problems.join('; ')}`,
    );
  }
};

export interface OrgSeedPostFacts {
  units: number;
  versions: number;
  seedLogRows: number;
}

export const findOrgSeedPostconditionProblems = (
  facts: OrgSeedPostFacts,
): string[] => {
  const problems: string[] = [];
  const expected = SEED_LAST_ID;
  if (facts.units !== expected) {
    problems.push(`${facts.units} seeded entries, expected ${expected}`);
  }
  if (facts.versions !== expected) {
    problems.push(
      `${facts.versions} seeded entries with a version, expected ${expected}`,
    );
  }
  if (facts.seedLogRows !== expected) {
    problems.push(`${facts.seedLogRows} seed log rows, expected ${expected}`);
  }
  return problems;
};

export const assertOrgSeedPostconditions = async (
  runner: QueryRunner,
): Promise<void> => {
  const [row] = await runner.query(`
    SELECT
      (SELECT COUNT(*) FROM \`org_units\`
        WHERE \`id\` BETWEEN 1 AND ${SEED_LAST_ID}) AS units,
      (SELECT COUNT(DISTINCT \`org_unit_id\`) FROM \`org_unit_versions\`
        WHERE \`org_unit_id\` BETWEEN 1 AND ${SEED_LAST_ID}) AS versions,
      (SELECT COUNT(*) FROM \`org_unit_change_log\`
        WHERE \`action\` = 'seed'
          AND \`org_unit_id\` BETWEEN 1 AND ${SEED_LAST_ID}) AS seed_rows
  `);
  const problems = findOrgSeedPostconditionProblems({
    units: Number(row.units),
    versions: Number(row.versions),
    seedLogRows: Number(row.seed_rows),
  });
  if (problems.length > 0) {
    throw new Error(
      `Organizational Structure seed check failed: ${problems.join('; ')}`,
    );
  }
};

export interface OrgSeedResult {
  units: number;
  versions: number;
  logRows: number;
  report: SeedDirectorReportRow[];
}

/**
 * Whole seed, in FK order: precondition guard, inserts, post-condition check,
 * then (only when entries were inserted) the `AUTO_INCREMENT` reset. Unmatched
 * directors are logged with LoggerUtil.
 */
export const seedOrgStructure = async (
  runner: QueryRunner,
): Promise<OrgSeedResult> => {
  const logger = new LoggerUtil({ name: 'seedOrgStructure' });
  await assertOrgSeedPreconditions(runner);
  const { carnets, report } = await resolveSeedDirectors(runner);

  const units = await seedOrgUnits(runner);
  const versions = await seedOrgUnitVersions(runner, carnets);
  const logRows = await seedOrgUnitChangeLog(runner, carnets);
  await assertOrgSeedPostconditions(runner);
  if (units > 0) await raiseOrgUnitsAutoIncrement(runner);

  for (const row of report) {
    if (row.outcome === 'matched') continue;
    logger._warn(
      `Director not seeded for ${row.code} "${row.unitName}": ${row.directorName} <${row.email ?? 'no email'}> (${row.outcome})`,
    );
  }
  return { units, versions, logRows, report };
};

/**
 * Removes the footprint of the seeded ids 1..117: their change-log rows (no FK),
 * their versions (all of them, including any added after the seed), and the
 * entries. Delegates go with the entries (CASCADE); `successor_id` among the
 * seeded entries is cleared first. If something OUTSIDE the seeded ids still
 * references a seeded entry (an admin-created entry's parent, a consumer FK),
 * the delete fails on that foreign key and the migration transaction rolls back
 * instead of orphaning data.
 */
export const removeOrgStructureSeed = async (
  runner: QueryRunner,
): Promise<void> => {
  const range = `BETWEEN 1 AND ${SEED_LAST_ID}`;
  await runner.query(
    `DELETE FROM \`org_unit_change_log\` WHERE \`org_unit_id\` ${range}`,
  );
  await runner.query(
    `UPDATE \`org_units\` SET \`successor_id\` = NULL WHERE \`id\` ${range}`,
  );
  await runner.query(
    `DELETE FROM \`org_unit_versions\` WHERE \`org_unit_id\` ${range}`,
  );
  await runner.query(`DELETE FROM \`org_units\` WHERE \`id\` ${range}`);
};

// @akili-spec docs/specs/innovation-dev/excel-export
import { writeFileSync } from 'fs';
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { IndicatorsEnum } from '../../../src/domain/entities/indicators/enum/indicators.enum';
import { ActorRolesEnum } from '../../../src/domain/entities/actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../../../src/domain/entities/institution-type-roles/enum/institution-type-role.enum';
import { LinkResultRolesEnum } from '../../../src/domain/entities/link-result-roles/enum/link-result-roles.enum';
import { emptyFullFiltersReportDto } from '../../../src/domain/entities/reports/dto/filters-report.dto';
import { StarResultsExportRepository } from '../../../src/domain/entities/reports/repositories/star-results-export.repository';
import { AppConfig } from '../../../src/domain/shared/utils/app-config.util';
import { ResultRepository } from '../../../src/domain/entities/results/repositories/result.repository';

/**
 * T-02 parity, one-row and EXPLAIN gate for `report_innovation_dev`.
 * Expected cell text is taken from
 * `docs/specs/innovation-dev/excel-export/requirements.md` (cell vocabulary
 * and R-IDX-001…005) and design §3.3–§3.4. A blank catalog name behind an
 * accepted id renders `Unknown (id n)`, including a tool-function line.
 * The green check is
 * `innovation_dev_validation` from
 * `1758125999162-AdaptInnovationDevValidationToManyToolFunctions`.
 *
 * Band `907_000` (FP-45). `906_000` is the Innovation Use export fixture.
 * Readiness ids 7, 8 and 9 are `id = level + 1` for levels 6, 7 and 8
 * because scratch's readiness catalog is empty (falsifier b).
 */
jest.setTimeout(180_000);

const NP = 'Not provided';
const NA = 'Not applicable';
const NM = 'Not mandatory';
const BULLET = '\u2022';
const EM = '\u2014';

const REPORT_YEAR = 2119;
const PLATFORM = 'T02IDXV';
const RESULT_STATUS_ID = 8;
const GROUP_CONCAT_MAX_LEN = 4_194_304;

const TITLE = 'Basin short title';
const EXPLANATION = 'Readiness explanation text';
const BENEFICIARIES = 'Intended beneficiaries text';
const OUTCOME = 'Expected outcome text';
const CONTEXT = 'Tool usefulness context text';
const RESULTS_TEXT = 'Results achieved text';
const OTHER_TOOLS = 'Companion spreadsheet';
const OTHER_TOOLS_INTEGRATION = 'Used in the same workshop';
const EXPANSION_DETAILS = 'Adapted for hillside plots';
const NATURE_NAME = 'Fixture nature';
const TYPE_NAME = 'Fixture type';
const USERS_YET = 'This is yet to be determined';
const USERS_DETERMINED = 'Users have been determined';
const OPT_OUT = 'Opt out';
const PROCEED = 'Proceed';
const EXPANSION_YES_ADAPT = 'Yes, with adaptations';
const ACTOR_FARMERS = 'Farmers';
const ACTOR_RESEARCHERS = 'Researchers';
const ACTOR_OTHER = 'Other';
const ORG_PLAIN = 'Public sector';
const ORG_PARENT = 'Research organization';
const ORG_CHILD = 'National program';
const ORG_INACTIVE_PARENT = 'Inactive root type';
const INSTITUTION_NAME = 'Fixture Known Institute';
const INSTITUTION_ACRONYM = 'FKI';
const LEVEL6_NAME = 'Fixture level 6';
const LEVEL7_NAME = 'Fixture level 7';
const LEVEL8_NAME = 'Fixture level 8';
const TOOL_A = 'Fixture monitoring';
const TOOL_B = 'Fixture outreach';
const TOOL_C = 'Fixture teaching';

const NATURE_ID = 907_601;
const NATURE_NULL_NAME = 907_602;
const NATURE_BLANK_NAME = 907_603;
const TYPE_ID = 907_611;
const TYPE_NULL_NAME = 907_612;
const TYPE_BLANK_NAME = 907_613;
const READINESS_L6 = 7;
const READINESS_L7 = 8;
const READINESS_L8 = 9;
const READINESS_LEVEL_NULL = 907_621;
const READINESS_NAME_NULL = 907_622;
const USERS_BLANK = 907_631;
const DQ_BLANK = 907_641;
const ACTOR_FARMERS_CODE = 907_811;
const ACTOR_RESEARCHERS_CODE = 907_812;
const ACTOR_OTHER_CODE = 5;
const ORG_PLAIN_CODE = 907_701;
const ORG_PARENT_CODE = 907_710;
const ORG_CHILD_CODE = 907_711;
const ORG_INACTIVE_PARENT_CODE = 907_740;
const ORG_INACTIVE_CHILD_CODE = 907_741;
const ORG_OTHER_CODE = 78;
const INSTITUTION_CODE = 907_730;
const TOOL_A_ID = 907_651;
const TOOL_B_ID = 907_652;
const TOOL_C_ID = 907_653;
const TOOL_BLANK_ID = 907_654;
const READINESS_BLANK_NAME = 907_623;
const EXPANSION_BLANK = 907_661;
const ACTOR_BLANK_CODE = 907_813;
const INSTITUTION_BLANK_CODE = 907_731;
const INSTITUTION_BLANK_ACRONYM = 'BLK';
const ORG_BLANK_TYPE_CODE = 907_702;
const ORG_BLANK_PARENT_CODE = 907_720;
const ORG_BLANK_PARENT = 'Fixture parent type';
const ORG_BLANK_CHILD_CODE = 907_721;
const ORG_BLANK_PARENT_WITH_CHILD = 907_722;
const ORG_CHILD_OF_BLANK_PARENT = 907_723;
const ORG_CHILD_OF_BLANK_NAME = 'Named child of blank type';

const CELL_KEYS = [
  'innovation_dev_short_title',
  'innovation_dev_nature',
  'innovation_dev_type',
  'innovation_dev_is_new_variety',
  'innovation_dev_varieties_count',
  'innovation_dev_readiness_level',
  'innovation_dev_readiness_explanation',
  'innovation_dev_anticipated_users',
  'innovation_dev_no_sex_age_disaggregation',
  'innovation_dev_actors',
  'innovation_dev_organizations',
  'innovation_dev_beneficiaries',
  'innovation_dev_expected_outcome',
  'innovation_dev_knowledge_sharing',
  'innovation_dev_dissemination',
  'innovation_dev_tool_useful_context',
  'innovation_dev_results_achieved_expected',
  'innovation_dev_tool_functions',
  'innovation_dev_used_beyond_context',
  'innovation_dev_adoption_context',
  'innovation_dev_linked_tools',
  'innovation_dev_other_tools',
  'innovation_dev_other_tools_integration',
  'innovation_dev_cheaper',
  'innovation_dev_simpler',
  'innovation_dev_performs_better',
  'innovation_dev_desirable',
  'innovation_dev_commercial_viability',
  'innovation_dev_enabling_environment',
  'innovation_dev_evidence_of_uptake',
  'innovation_dev_expansion_potential',
  'innovation_dev_expansion_details',
] as const;

type CellKey = (typeof CELL_KEYS)[number];
type Cells = Record<CellKey, string>;

const LATERAL_ALIASES = ['ra', 'rit', 'ritf', 'lr'] as const;

/**
 * Phase 2 id=1 `<derivedN>` tables of the repository probe
 * (`SELECT gi.result_id` + captured FROM/JOIN + `IN (1, 2, 3)`),
 * measured on scratch before this spec adds a Phase 2 join.
 * NFR-IDX-001 (b): this set stays at these 28 rows.
 */
const PREEXISTING_PHASE2_DERIVED = [
  '<derived3>',
  '<derived4>',
  '<derived5>',
  '<derived7>',
  '<derived8>',
  '<derived9>',
  '<derived10>',
  '<derived11>',
  '<derived13>',
  '<derived15>',
  '<derived16>',
  '<derived18>',
  '<derived23>',
  '<derived24>',
  '<derived25>',
  '<derived26>',
  '<derived28>',
  '<derived30>',
  '<derived31>',
  '<derived33>',
  '<derived34>',
  '<derived35>',
  '<derived36>',
  '<derived37>',
  '<derived39>',
  '<derived40>',
  '<derived41>',
  '<derived45>',
] as const;

const ownedDeletes: Array<{ sql: string; params: unknown[] }> = [];
const resultIds: number[] = [];
let nextCode = 907_000_000_000_000 + Date.now();

function levelText(level: number, name: string): string {
  return `Level ${level}: ${name}`;
}

function unknownId(id: number): string {
  return `Unknown (id ${id})`;
}

function actorLine(
  typeName: string,
  custom: string | null,
  suffix: 'youth' | 'men' | 'not-applicable' | 'none',
): string {
  const customPart = custom === null ? '' : `: ${custom}`;
  const tail =
    suffix === 'youth'
      ? ` ${EM} Women (youth)`
      : suffix === 'men'
        ? ` ${EM} Men (non-youth)`
        : suffix === 'not-applicable'
          ? ` ${EM} Sex and age disaggregation not applicable`
          : '';
  return `${BULLET} ${typeName}${customPart}${tail}`;
}

function orgKnown(acronym: string | null, name: string): string {
  return acronym === null
    ? `${BULLET} ${name}`
    : `${BULLET} ${acronym} - ${name}`;
}

function orgTyped(typeName: string, extra = ''): string {
  return `${BULLET} ${typeName}${extra}`;
}

function toolLine(name: string): string {
  return `${BULLET} ${name}`;
}

function linkLine(
  platform: string | null,
  officialCode: number,
  title: string | null,
): string {
  const code =
    platform === null ? String(officialCode) : `${platform}-${officialCode}`;
  return title === null ? `${BULLET} ${code}` : `${BULLET} ${code} - ${title}`;
}

function joinLines(lines: string[]): string {
  return lines.join('\n');
}

function naCells(): Cells {
  const row = {} as Cells;
  for (const key of CELL_KEYS) {
    row[key] = NA;
  }
  return row;
}

function scalingNm(): Pick<
  Cells,
  | 'innovation_dev_cheaper'
  | 'innovation_dev_simpler'
  | 'innovation_dev_performs_better'
  | 'innovation_dev_desirable'
  | 'innovation_dev_commercial_viability'
  | 'innovation_dev_enabling_environment'
  | 'innovation_dev_evidence_of_uptake'
  | 'innovation_dev_expansion_potential'
> {
  return {
    innovation_dev_cheaper: NM,
    innovation_dev_simpler: NM,
    innovation_dev_performs_better: NM,
    innovation_dev_desirable: NM,
    innovation_dev_commercial_viability: NM,
    innovation_dev_enabling_environment: NM,
    innovation_dev_evidence_of_uptake: NM,
    innovation_dev_expansion_potential: NM,
  };
}

function filledScaling(): Pick<
  Cells,
  | 'innovation_dev_cheaper'
  | 'innovation_dev_simpler'
  | 'innovation_dev_performs_better'
  | 'innovation_dev_desirable'
  | 'innovation_dev_commercial_viability'
  | 'innovation_dev_enabling_environment'
  | 'innovation_dev_evidence_of_uptake'
  | 'innovation_dev_expansion_potential'
  | 'innovation_dev_expansion_details'
> {
  return {
    innovation_dev_cheaper: '1',
    innovation_dev_simpler: '2',
    innovation_dev_performs_better: '3',
    innovation_dev_desirable: '4',
    innovation_dev_commercial_viability: '5',
    innovation_dev_enabling_environment: '1',
    innovation_dev_evidence_of_uptake: '2',
    innovation_dev_expansion_potential: EXPANSION_YES_ADAPT,
    innovation_dev_expansion_details: EXPANSION_DETAILS,
  };
}

/** Level 6, users determined, variety No, one actor, one known organization. */
function level6Cells(over: Partial<Cells> = {}): Cells {
  return {
    ...naCells(),
    innovation_dev_short_title: TITLE,
    innovation_dev_nature: NATURE_NAME,
    innovation_dev_type: TYPE_NAME,
    innovation_dev_is_new_variety: 'No',
    innovation_dev_varieties_count: NA,
    innovation_dev_readiness_level: levelText(6, LEVEL6_NAME),
    innovation_dev_readiness_explanation: EXPLANATION,
    innovation_dev_anticipated_users: USERS_DETERMINED,
    innovation_dev_no_sex_age_disaggregation: 'No',
    innovation_dev_actors: actorLine(ACTOR_FARMERS, null, 'youth'),
    innovation_dev_organizations: orgKnown(
      INSTITUTION_ACRONYM,
      INSTITUTION_NAME,
    ),
    innovation_dev_beneficiaries: BENEFICIARIES,
    innovation_dev_expected_outcome: OUTCOME,
    ...over,
  };
}

function noDetailCells(): Cells {
  return {
    ...naCells(),
    innovation_dev_short_title: NP,
    innovation_dev_nature: NP,
    innovation_dev_type: NP,
    innovation_dev_is_new_variety: NM,
    innovation_dev_readiness_level: NP,
    innovation_dev_readiness_explanation: NP,
    innovation_dev_anticipated_users: NP,
    innovation_dev_no_sex_age_disaggregation: NM,
  };
}

function cellsContainingNp(row: Cells): CellKey[] {
  return CELL_KEYS.filter((key) => String(row[key]).includes(NP));
}

type QueryRow = Record<string, unknown>;
type SqlResult = QueryRow[] & { insertId?: number };

async function q(sql: string, params: unknown[] = []): Promise<SqlResult> {
  return dataSource.query(sql, params);
}

function nextOfficialCode(): number {
  nextCode += 1;
  return nextCode;
}

async function ensureNamed(
  ownedKey: string,
  checkSql: string,
  checkParams: unknown[],
  expectedName: string,
  insertSql: string,
  insertParams: unknown[],
  deleteSql: string,
  deleteParams: unknown[],
): Promise<void> {
  const [existing] = await q(checkSql, checkParams);
  if (!existing) {
    await q(insertSql, insertParams);
    ownedDeletes.push({ sql: deleteSql, params: deleteParams });
    return;
  }
  if (String(existing.name) !== expectedName) {
    throw new Error(
      `${ownedKey} already exists as "${String(existing.name)}", not "${expectedName}"`,
    );
  }
}

interface ActorSeed {
  typeId: number;
  roleId?: number;
  custom?: string | null;
  notApply?: boolean | null;
  womenYouth?: boolean | null;
  womenNotYouth?: boolean | null;
  menYouth?: boolean | null;
  menNotYouth?: boolean | null;
  active?: boolean;
}

interface OrgSeed {
  roleId?: number;
  known?: boolean | null;
  institutionId?: number | null;
  typeId?: number | null;
  subTypeId?: number | null;
  custom?: string | null;
  active?: boolean;
}

interface DevSeed {
  shortTitle?: string | null;
  natureId?: number | null;
  typeId?: number | null;
  readinessId?: number | null;
  explanation?: string | null;
  variety?: boolean | null;
  varietyCount?: number | null;
  usersId?: number | null;
  sexNotApply?: boolean | null;
  beneficiaries?: string | null;
  outcome?: string | null;
  knowledgeSharing?: boolean | null;
  disseminationId?: number | null;
  context?: string | null;
  resultsText?: string | null;
  usedBeyond?: boolean | null;
  adoption?: string | null;
  otherTools?: string | null;
  otherIntegration?: string | null;
  cheaper?: number | null;
  simpler?: number | null;
  performs?: number | null;
  desirable?: number | null;
  commercial?: number | null;
  enabling?: number | null;
  uptake?: number | null;
  expansionId?: number | null;
  expansionDetails?: string | null;
  active?: boolean;
}

function defined<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value;
}

async function insertResult(seed: {
  indicatorId?: number | null;
  active?: boolean;
  snapshot?: boolean;
  platform?: string | null;
  title?: string | null;
  officialCode?: number;
}): Promise<{ id: number; officialCode: number }> {
  const officialCode = seed.officialCode ?? nextOfficialCode();
  const inserted = await q(
    `INSERT INTO results (
       is_active, result_official_code, platform_code, title,
       report_year_id, is_snapshot, indicator_id, result_status_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      seed.active === false ? 0 : 1,
      officialCode,
      seed.platform === undefined ? PLATFORM : seed.platform,
      seed.title ?? null,
      REPORT_YEAR,
      seed.snapshot ? 1 : 0,
      seed.indicatorId === undefined
        ? IndicatorsEnum.INNOVATION_DEV
        : seed.indicatorId,
      RESULT_STATUS_ID,
    ],
  );
  const id = Number(inserted.insertId);
  resultIds.push(id);
  return { id, officialCode };
}

async function insertDev(resultId: number, seed: DevSeed): Promise<void> {
  await q(
    `INSERT INTO result_innovation_dev (
       result_id, short_title, innovation_nature_id, innovation_type_id,
       innovation_readiness_id, innovation_readiness_explanation,
       is_new_or_improved_variety, new_or_improved_varieties_count,
       anticipated_users_id, no_sex_age_disaggregation,
       intended_beneficiaries_description, expected_outcome,
       is_knowledge_sharing, dissemination_qualification_id,
       tool_useful_context, results_achieved_expected,
       is_used_beyond_original_context, adoption_adaptation_context,
       other_tools, other_tools_integration,
       is_cheaper_than_alternatives, is_simpler_to_use, does_perform_better,
       is_desirable_to_users, has_commercial_viability,
       has_suitable_enabling_environment, has_evidence_of_uptake,
       expansion_potential_id, expansion_adaptation_details, is_active
     ) VALUES (${new Array(30).fill('?').join(', ')})`,
    [
      resultId,
      defined(seed.shortTitle, TITLE),
      defined(seed.natureId, NATURE_ID),
      defined(seed.typeId, TYPE_ID),
      defined(seed.readinessId, READINESS_L6),
      defined(seed.explanation, EXPLANATION),
      defined(seed.variety, false),
      defined(seed.varietyCount, null),
      defined(seed.usersId, 2),
      defined(seed.sexNotApply, false),
      defined(seed.beneficiaries, BENEFICIARIES),
      defined(seed.outcome, OUTCOME),
      defined(seed.knowledgeSharing, null),
      defined(seed.disseminationId, null),
      defined(seed.context, null),
      defined(seed.resultsText, null),
      defined(seed.usedBeyond, null),
      defined(seed.adoption, null),
      defined(seed.otherTools, null),
      defined(seed.otherIntegration, null),
      defined(seed.cheaper, null),
      defined(seed.simpler, null),
      defined(seed.performs, null),
      defined(seed.desirable, null),
      defined(seed.commercial, null),
      defined(seed.enabling, null),
      defined(seed.uptake, null),
      defined(seed.expansionId, null),
      defined(seed.expansionDetails, null),
      seed.active === false ? 0 : 1,
    ],
  );
}

async function insertActor(resultId: number, seed: ActorSeed): Promise<void> {
  await q(
    `INSERT INTO result_actors (
       result_id, actor_type_id, actor_role_id, actor_type_custom_name,
       sex_age_disaggregation_not_apply, women_youth, women_not_youth,
       men_youth, men_not_youth, is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resultId,
      seed.typeId,
      seed.roleId ?? ActorRolesEnum.INNOVATION_DEV,
      seed.custom === undefined ? null : seed.custom,
      seed.notApply === undefined ? null : seed.notApply,
      seed.womenYouth ? 1 : seed.womenYouth === false ? 0 : null,
      seed.womenNotYouth ? 1 : null,
      seed.menYouth ? 1 : null,
      seed.menNotYouth ? 1 : null,
      seed.active === false ? 0 : 1,
    ],
  );
}

async function insertOrg(resultId: number, seed: OrgSeed): Promise<void> {
  await q(
    `INSERT INTO result_institution_types (
       result_id, institution_type_role_id, is_organization_known,
       institution_id, institution_type_id, sub_institution_type_id,
       institution_type_custom_name, is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resultId,
      seed.roleId ?? InstitutionTypeRoleEnum.INNOVATION_DEV,
      seed.known === undefined ? null : seed.known,
      seed.institutionId === undefined ? null : seed.institutionId,
      seed.typeId === undefined ? null : seed.typeId,
      seed.subTypeId === undefined ? null : seed.subTypeId,
      seed.custom === undefined ? null : seed.custom,
      seed.active === false ? 0 : 1,
    ],
  );
}

async function insertTool(
  resultId: number,
  toolFunctionId: number,
  active = true,
): Promise<void> {
  await q(
    `INSERT INTO result_innovation_tool_function (
       result_id, tool_function_id, is_active
     ) VALUES (?, ?, ?)`,
    [resultId, toolFunctionId, active ? 1 : 0],
  );
}

async function insertLink(
  resultId: number,
  otherResultId: number,
  active = true,
): Promise<void> {
  await q(
    `INSERT INTO link_results (
       result_id, other_result_id, link_result_role_id, is_active
     ) VALUES (?, ?, ?, ?)`,
    [
      resultId,
      otherResultId,
      LinkResultRolesEnum.INNOVATION_DEV,
      active ? 1 : 0,
    ],
  );
}

const FARMER: ActorSeed = {
  typeId: ACTOR_FARMERS_CODE,
  womenYouth: true,
};

const KNOWN_ORG: OrgSeed = {
  known: true,
  institutionId: INSTITUTION_CODE,
};

async function makeLevel6(
  dev: DevSeed = {},
  children?: { actors?: ActorSeed[]; orgs?: OrgSeed[] },
): Promise<number> {
  const { id } = await insertResult({});
  await insertDev(id, dev);
  const actors = children?.actors ?? [FARMER];
  const orgs = children?.orgs ?? [KNOWN_ORG];
  for (const actor of actors) {
    await insertActor(id, actor);
  }
  for (const org of orgs) {
    await insertOrg(id, org);
  }
  return id;
}

async function loadCells(resultId: number): Promise<Cells | undefined> {
  const [row] = await q(
    `SELECT ${CELL_KEYS.join(', ')} FROM report_innovation_dev WHERE result_id = ?`,
    [resultId],
  );
  return row as Cells | undefined;
}

async function callValidation(resultId: number): Promise<number> {
  const [row] = await q('SELECT innovation_dev_validation(?) AS v', [resultId]);
  return Number(row?.v);
}

async function expectCells(
  label: string,
  resultId: number,
  expected: Cells,
): Promise<Cells> {
  const row = await loadCells(resultId);
  expect({ label, present: row !== undefined }).toEqual({
    label,
    present: true,
  });
  const actual = row as Cells;
  for (const key of CELL_KEYS) {
    expect({ label, cell: key, value: actual[key] }).toEqual({
      label,
      cell: key,
      value: expected[key],
    });
  }
  return actual;
}

async function expectParity(
  label: string,
  resultId: number,
  expected: Cells,
  indicator: number = IndicatorsEnum.INNOVATION_DEV,
): Promise<void> {
  const actual = await expectCells(label, resultId, expected);
  const [subject] = await q(
    'SELECT indicator_id AS indicatorId FROM results WHERE result_id = ?',
    [resultId],
  );
  expect({ label, indicatorId: Number(subject.indicatorId) }).toEqual({
    label,
    indicatorId: indicator,
  });
  if (indicator !== IndicatorsEnum.INNOVATION_DEV) {
    return;
  }
  const fn = await callValidation(resultId);
  const hasNp = cellsContainingNp(actual).length > 0;
  expect({ label, validation: fn, hasNp }).toEqual({
    label,
    validation: hasNp ? 0 : 1,
    hasNp,
  });
}

/** Function TRUE while at least one cell contains Not provided. */
async function expectBreak(
  label: string,
  resultId: number,
  expected: Cells,
): Promise<void> {
  const actual = await expectCells(label, resultId, expected);
  const fn = await callValidation(resultId);
  expect({
    label,
    validation: fn,
    hasNp: cellsContainingNp(actual).length > 0,
  }).toEqual({ label, validation: 1, hasNp: true });
}

function toolBlockBase(over: Partial<Cells> = {}): Cells {
  return {
    ...level6Cells(),
    innovation_dev_is_new_variety: 'Yes',
    innovation_dev_varieties_count: '4',
    innovation_dev_readiness_level: levelText(8, LEVEL8_NAME),
    innovation_dev_knowledge_sharing: 'Yes',
    innovation_dev_dissemination: PROCEED,
    innovation_dev_tool_useful_context: CONTEXT,
    innovation_dev_results_achieved_expected: RESULTS_TEXT,
    innovation_dev_tool_functions: toolLine(TOOL_A),
    innovation_dev_used_beyond_context: 'No',
    innovation_dev_adoption_context: NM,
    innovation_dev_linked_tools: NM,
    innovation_dev_other_tools: OTHER_TOOLS,
    innovation_dev_other_tools_integration: OTHER_TOOLS_INTEGRATION,
    ...filledScaling(),
    ...over,
  };
}

async function makeToolBlock(
  dev: DevSeed = {},
  extras?: {
    actors?: ActorSeed[];
    orgs?: OrgSeed[];
    tools?: number[];
    skipTools?: boolean;
  },
): Promise<number> {
  const id = await makeLevel6(
    {
      variety: true,
      varietyCount: 4,
      readinessId: READINESS_L8,
      knowledgeSharing: true,
      disseminationId: 2,
      context: CONTEXT,
      resultsText: RESULTS_TEXT,
      usedBeyond: false,
      otherTools: OTHER_TOOLS,
      otherIntegration: OTHER_TOOLS_INTEGRATION,
      cheaper: 1,
      simpler: 2,
      performs: 3,
      desirable: 4,
      commercial: 5,
      enabling: 1,
      uptake: 2,
      expansionId: 2,
      expansionDetails: EXPANSION_DETAILS,
      ...dev,
    },
    { actors: extras?.actors, orgs: extras?.orgs },
  );
  if (!extras?.skipTools) {
    for (const toolId of extras?.tools ?? [TOOL_A_ID]) {
      await insertTool(id, toolId);
    }
  }
  return id;
}

describe('report_innovation_dev view (T-02 excel-export)', () => {
  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await q(`SET SESSION group_concat_max_len = ${GROUP_CONCAT_MAX_LEN}`);

    const [year] = await q(
      `SELECT report_year FROM report_years WHERE report_year = ?`,
      [REPORT_YEAR],
    );
    if (!year) {
      await q(`INSERT INTO report_years (report_year) VALUES (?)`, [
        REPORT_YEAR,
      ]);
      ownedDeletes.push({
        sql: `DELETE FROM report_years WHERE report_year = ?`,
        params: [REPORT_YEAR],
      });
    }
    const [platform] = await q(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [PLATFORM],
    );
    if (!platform) {
      await q(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, ?)`,
        [PLATFORM, 'T-02 innovation dev export fixture'],
      );
      ownedDeletes.push({
        sql: `DELETE FROM reporting_platforms WHERE platform_code = ?`,
        params: [PLATFORM],
      });
    }

    await ensureNamed(
      'indicator 1',
      `SELECT indicator_id AS id, name FROM indicators WHERE indicator_id = ?`,
      [IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT],
      'Capacity Sharing for Development',
      `INSERT INTO indicators (indicator_id, name, indicator_type_id) VALUES (?, ?, 1)`,
      [
        IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        'Capacity Sharing for Development',
      ],
      `DELETE FROM indicators WHERE indicator_id = ?`,
      [IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT],
    );
    await ensureNamed(
      'anticipated users 1',
      `SELECT id, name FROM innovation_dev_anticipated_users WHERE id = 1`,
      [],
      USERS_YET,
      `INSERT INTO innovation_dev_anticipated_users (id, name) VALUES (1, ?)`,
      [USERS_YET],
      `DELETE FROM innovation_dev_anticipated_users WHERE id = 1`,
      [],
    );
    await ensureNamed(
      'anticipated users 2',
      `SELECT id, name FROM innovation_dev_anticipated_users WHERE id = 2`,
      [],
      USERS_DETERMINED,
      `INSERT INTO innovation_dev_anticipated_users (id, name) VALUES (2, ?)`,
      [USERS_DETERMINED],
      `DELETE FROM innovation_dev_anticipated_users WHERE id = 2`,
      [],
    );
    await ensureNamed(
      'dissemination 1',
      `SELECT id, name FROM dissemination_qualifications WHERE id = 1`,
      [],
      OPT_OUT,
      `INSERT INTO dissemination_qualifications (id, name) VALUES (1, ?)`,
      [OPT_OUT],
      `DELETE FROM dissemination_qualifications WHERE id = 1`,
      [],
    );
    await ensureNamed(
      'dissemination 2',
      `SELECT id, name FROM dissemination_qualifications WHERE id = 2`,
      [],
      PROCEED,
      `INSERT INTO dissemination_qualifications (id, name) VALUES (2, ?)`,
      [PROCEED],
      `DELETE FROM dissemination_qualifications WHERE id = 2`,
      [],
    );
    await ensureNamed(
      'expansion 1',
      `SELECT id, name FROM expansion_potentials WHERE id = 1`,
      [],
      'Yes',
      `INSERT INTO expansion_potentials (id, name) VALUES (1, 'Yes')`,
      [],
      `DELETE FROM expansion_potentials WHERE id = 1`,
      [],
    );
    await ensureNamed(
      'expansion 2',
      `SELECT id, name FROM expansion_potentials WHERE id = 2`,
      [],
      EXPANSION_YES_ADAPT,
      `INSERT INTO expansion_potentials (id, name) VALUES (2, ?)`,
      [EXPANSION_YES_ADAPT],
      `DELETE FROM expansion_potentials WHERE id = 2`,
      [],
    );
    await ensureNamed(
      'expansion 3',
      `SELECT id, name FROM expansion_potentials WHERE id = 3`,
      [],
      'No',
      `INSERT INTO expansion_potentials (id, name) VALUES (3, 'No')`,
      [],
      `DELETE FROM expansion_potentials WHERE id = 3`,
      [],
    );
    await ensureNamed(
      'link role 2',
      `SELECT link_result_role_id AS id, name FROM link_result_roles WHERE link_result_role_id = ?`,
      [LinkResultRolesEnum.INNOVATION_DEV],
      'Innovation Dev',
      `INSERT INTO link_result_roles (link_result_role_id, name) VALUES (?, 'Innovation Dev')`,
      [LinkResultRolesEnum.INNOVATION_DEV],
      `DELETE FROM link_result_roles WHERE link_result_role_id = ?`,
      [LinkResultRolesEnum.INNOVATION_DEV],
    );
    await ensureNamed(
      'actor 5',
      `SELECT code AS id, name FROM clarisa_actor_types WHERE code = ?`,
      [ACTOR_OTHER_CODE],
      ACTOR_OTHER,
      `INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?)`,
      [ACTOR_OTHER_CODE, ACTOR_OTHER],
      `DELETE FROM clarisa_actor_types WHERE code = ?`,
      [ACTOR_OTHER_CODE],
    );
    await ensureNamed(
      'institution type 78',
      `SELECT code AS id, name FROM clarisa_institution_types WHERE code = ?`,
      [ORG_OTHER_CODE],
      ACTOR_OTHER,
      `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
      [ORG_OTHER_CODE, ACTOR_OTHER],
      `DELETE FROM clarisa_institution_types WHERE code = ?`,
      [ORG_OTHER_CODE],
    );

    const privateRows: Array<{
      insert: string;
      params: unknown[];
      del: string;
      delParams: unknown[];
    }> = [
      {
        insert: `INSERT INTO clarisa_innovation_characteristics (id, name) VALUES (?, ?)`,
        params: [NATURE_ID, NATURE_NAME],
        del: `DELETE FROM clarisa_innovation_characteristics WHERE id = ?`,
        delParams: [NATURE_ID],
      },
      {
        insert: `INSERT INTO clarisa_innovation_characteristics (id, name) VALUES (?, NULL)`,
        params: [NATURE_NULL_NAME],
        del: `DELETE FROM clarisa_innovation_characteristics WHERE id = ?`,
        delParams: [NATURE_NULL_NAME],
      },
      {
        insert: `INSERT INTO clarisa_innovation_characteristics (id, name) VALUES (?, '')`,
        params: [NATURE_BLANK_NAME],
        del: `DELETE FROM clarisa_innovation_characteristics WHERE id = ?`,
        delParams: [NATURE_BLANK_NAME],
      },
      {
        insert: `INSERT INTO clarisa_innovation_types (code, name) VALUES (?, ?)`,
        params: [TYPE_ID, TYPE_NAME],
        del: `DELETE FROM clarisa_innovation_types WHERE code = ?`,
        delParams: [TYPE_ID],
      },
      {
        insert: `INSERT INTO clarisa_innovation_types (code, name) VALUES (?, NULL)`,
        params: [TYPE_NULL_NAME],
        del: `DELETE FROM clarisa_innovation_types WHERE code = ?`,
        delParams: [TYPE_NULL_NAME],
      },
      {
        insert: `INSERT INTO clarisa_innovation_types (code, name) VALUES (?, '')`,
        params: [TYPE_BLANK_NAME],
        del: `DELETE FROM clarisa_innovation_types WHERE code = ?`,
        delParams: [TYPE_BLANK_NAME],
      },
      {
        insert: `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, 6, ?)`,
        params: [READINESS_L6, LEVEL6_NAME],
        del: `DELETE FROM clarisa_innovation_readiness_levels WHERE id = ?`,
        delParams: [READINESS_L6],
      },
      {
        insert: `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, 7, ?)`,
        params: [READINESS_L7, LEVEL7_NAME],
        del: `DELETE FROM clarisa_innovation_readiness_levels WHERE id = ?`,
        delParams: [READINESS_L7],
      },
      {
        insert: `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, 8, ?)`,
        params: [READINESS_L8, LEVEL8_NAME],
        del: `DELETE FROM clarisa_innovation_readiness_levels WHERE id = ?`,
        delParams: [READINESS_L8],
      },
      {
        insert: `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, NULL, 'unused')`,
        params: [READINESS_LEVEL_NULL],
        del: `DELETE FROM clarisa_innovation_readiness_levels WHERE id = ?`,
        delParams: [READINESS_LEVEL_NULL],
      },
      {
        insert: `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, 3, NULL)`,
        params: [READINESS_NAME_NULL],
        del: `DELETE FROM clarisa_innovation_readiness_levels WHERE id = ?`,
        delParams: [READINESS_NAME_NULL],
      },
      {
        insert: `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, 6, '')`,
        params: [READINESS_BLANK_NAME],
        del: `DELETE FROM clarisa_innovation_readiness_levels WHERE id = ?`,
        delParams: [READINESS_BLANK_NAME],
      },
      {
        insert: `INSERT INTO expansion_potentials (id, name) VALUES (?, '')`,
        params: [EXPANSION_BLANK],
        del: `DELETE FROM expansion_potentials WHERE id = ?`,
        delParams: [EXPANSION_BLANK],
      },
      {
        insert: `INSERT INTO clarisa_actor_types (code, name) VALUES (?, '')`,
        params: [ACTOR_BLANK_CODE],
        del: `DELETE FROM clarisa_actor_types WHERE code = ?`,
        delParams: [ACTOR_BLANK_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institutions (code, name, acronym) VALUES (?, '', ?)`,
        params: [INSTITUTION_BLANK_CODE, INSTITUTION_BLANK_ACRONYM],
        del: `DELETE FROM clarisa_institutions WHERE code = ?`,
        delParams: [INSTITUTION_BLANK_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name) VALUES (?, '')`,
        params: [ORG_BLANK_TYPE_CODE],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_BLANK_TYPE_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
        params: [ORG_BLANK_PARENT_CODE, ORG_BLANK_PARENT],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_BLANK_PARENT_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name, parent_code) VALUES (?, '', ?)`,
        params: [ORG_BLANK_CHILD_CODE, ORG_BLANK_PARENT_CODE],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_BLANK_CHILD_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name) VALUES (?, '')`,
        params: [ORG_BLANK_PARENT_WITH_CHILD],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_BLANK_PARENT_WITH_CHILD],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name, parent_code) VALUES (?, ?, ?)`,
        params: [
          ORG_CHILD_OF_BLANK_PARENT,
          ORG_CHILD_OF_BLANK_NAME,
          ORG_BLANK_PARENT_WITH_CHILD,
        ],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_CHILD_OF_BLANK_PARENT],
      },
      {
        insert: `INSERT INTO innovation_dev_anticipated_users (id, name) VALUES (?, '')`,
        params: [USERS_BLANK],
        del: `DELETE FROM innovation_dev_anticipated_users WHERE id = ?`,
        delParams: [USERS_BLANK],
      },
      {
        insert: `INSERT INTO dissemination_qualifications (id, name) VALUES (?, '')`,
        params: [DQ_BLANK],
        del: `DELETE FROM dissemination_qualifications WHERE id = ?`,
        delParams: [DQ_BLANK],
      },
      {
        insert: `INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?)`,
        params: [ACTOR_FARMERS_CODE, ACTOR_FARMERS],
        del: `DELETE FROM clarisa_actor_types WHERE code = ?`,
        delParams: [ACTOR_FARMERS_CODE],
      },
      {
        insert: `INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?)`,
        params: [ACTOR_RESEARCHERS_CODE, ACTOR_RESEARCHERS],
        del: `DELETE FROM clarisa_actor_types WHERE code = ?`,
        delParams: [ACTOR_RESEARCHERS_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
        params: [ORG_PLAIN_CODE, ORG_PLAIN],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_PLAIN_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
        params: [ORG_PARENT_CODE, ORG_PARENT],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_PARENT_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name, parent_code) VALUES (?, ?, ?)`,
        params: [ORG_CHILD_CODE, ORG_CHILD, ORG_PARENT_CODE],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_CHILD_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name) VALUES (?, ?)`,
        params: [ORG_INACTIVE_PARENT_CODE, ORG_INACTIVE_PARENT],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_INACTIVE_PARENT_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, 'Child of inactive root', ?, 0)`,
        params: [ORG_INACTIVE_CHILD_CODE, ORG_INACTIVE_PARENT_CODE],
        del: `DELETE FROM clarisa_institution_types WHERE code = ?`,
        delParams: [ORG_INACTIVE_CHILD_CODE],
      },
      {
        insert: `INSERT INTO clarisa_institutions (code, name, acronym) VALUES (?, ?, ?)`,
        params: [INSTITUTION_CODE, INSTITUTION_NAME, INSTITUTION_ACRONYM],
        del: `DELETE FROM clarisa_institutions WHERE code = ?`,
        delParams: [INSTITUTION_CODE],
      },
      {
        insert: `INSERT INTO tool_functions (id, name) VALUES (?, ?)`,
        params: [TOOL_A_ID, TOOL_A],
        del: `DELETE FROM tool_functions WHERE id = ?`,
        delParams: [TOOL_A_ID],
      },
      {
        insert: `INSERT INTO tool_functions (id, name) VALUES (?, ?)`,
        params: [TOOL_B_ID, TOOL_B],
        del: `DELETE FROM tool_functions WHERE id = ?`,
        delParams: [TOOL_B_ID],
      },
      {
        insert: `INSERT INTO tool_functions (id, name) VALUES (?, ?)`,
        params: [TOOL_C_ID, TOOL_C],
        del: `DELETE FROM tool_functions WHERE id = ?`,
        delParams: [TOOL_C_ID],
      },
      {
        insert: `INSERT INTO tool_functions (id, name) VALUES (?, '')`,
        params: [TOOL_BLANK_ID],
        del: `DELETE FROM tool_functions WHERE id = ?`,
        delParams: [TOOL_BLANK_ID],
      },
    ];
    for (const row of privateRows) {
      await q(row.insert, row.params);
      ownedDeletes.push({ sql: row.del, params: row.delParams });
    }
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }
    const errors: unknown[] = [];
    const tryStep = async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err) {
        errors.push({ label, err });
      }
    };
    if (resultIds.length) {
      const ph = resultIds.map(() => '?').join(', ');
      await tryStep('links', () =>
        q(
          `DELETE FROM link_results WHERE result_id IN (${ph}) OR other_result_id IN (${ph})`,
          [...resultIds, ...resultIds],
        ),
      );
      await tryStep('tool functions', () =>
        q(
          `DELETE FROM result_innovation_tool_function WHERE result_id IN (${ph})`,
          resultIds,
        ),
      );
      await tryStep('actors', () =>
        q(`DELETE FROM result_actors WHERE result_id IN (${ph})`, resultIds),
      );
      await tryStep('orgs', () =>
        q(
          `DELETE FROM result_institution_types WHERE result_id IN (${ph})`,
          resultIds,
        ),
      );
      await tryStep('dev', () =>
        q(
          `DELETE FROM result_innovation_dev WHERE result_id IN (${ph})`,
          resultIds,
        ),
      );
      await tryStep('results', () =>
        q(`DELETE FROM results WHERE result_id IN (${ph})`, resultIds),
      );
    }
    for (const step of [...ownedDeletes].reverse()) {
      await tryStep(step.sql, () => q(step.sql, step.params));
    }
    try {
      if (errors.length) {
        throw new Error(
          `afterAll cleanup had ${errors.length} failed step(s): ${JSON.stringify(
            errors,
            (_key, value) => (value instanceof Error ? value.message : value),
          )}`,
        );
      }
    } finally {
      await dataSource.destroy();
    }
  });

  it('pins the level-6 readiness row at id = level + 1', async () => {
    const [row] = await q(
      `SELECT id, level FROM clarisa_innovation_readiness_levels WHERE id = ?`,
      [READINESS_L6],
    );
    expect({ id: Number(row.id), level: Number(row.level) }).toEqual({
      id: 7,
      level: 6,
    });
  });

  it('actor_type_id and tool_functions.name are NOT NULL, so a NULL name cannot render a bare bullet', async () => {
    const rows = await q(
      `SELECT table_name AS tableName, column_name AS columnName, is_nullable AS nullable
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND (
           (table_name = 'result_actors' AND column_name = 'actor_type_id')
           OR (table_name = 'tool_functions' AND column_name = 'name')
           OR (table_name = 'result_innovation_tool_function' AND column_name = 'tool_function_id')
         )`,
    );
    const flags = Object.fromEntries(
      rows.map((row) => [
        `${row.tableName}.${row.columnName}`,
        String(row.nullable),
      ]),
    );
    expect(flags).toEqual({
      'result_actors.actor_type_id': 'NO',
      'tool_functions.name': 'NO',
      'result_innovation_tool_function.tool_function_id': 'NO',
    });
  });

  it('fully valid level-8 proceed result has no Not provided cell', async () => {
    const id = await makeToolBlock();
    await expectParity('fully valid', id, toolBlockBase());
  });

  it('level 6 hides scaling cells and the function stays true', async () => {
    const id = await makeLevel6({ knowledgeSharing: null });
    await expectParity('level 6', id, level6Cells());
  });

  it('level 6 hides stale knowledge sharing, tools, scaling and expansion behind Not applicable', async () => {
    const id = await makeLevel6({
      knowledgeSharing: true,
      disseminationId: 2,
      context: CONTEXT,
      resultsText: RESULTS_TEXT,
      cheaper: 1,
      simpler: 2,
      performs: 3,
      desirable: 4,
      commercial: 5,
      enabling: 1,
      uptake: 2,
      expansionId: 2,
      expansionDetails: EXPANSION_DETAILS,
    });
    await insertTool(id, TOOL_A_ID);
    const linked = await insertResult({
      indicatorId: IndicatorsEnum.INNOVATION_USE,
      title: 'Stale linked tool',
    });
    await insertLink(id, linked.id, true);
    await expectParity(
      'level 6 stale',
      id,
      level6Cells({
        innovation_dev_knowledge_sharing: NA,
        innovation_dev_dissemination: NA,
        innovation_dev_tool_useful_context: NA,
        innovation_dev_results_achieved_expected: NA,
        innovation_dev_tool_functions: NA,
        innovation_dev_used_beyond_context: NA,
        innovation_dev_adoption_context: NA,
        innovation_dev_linked_tools: NA,
        innovation_dev_other_tools: NA,
        innovation_dev_other_tools_integration: NA,
        innovation_dev_cheaper: NA,
        innovation_dev_simpler: NA,
        innovation_dev_performs_better: NA,
        innovation_dev_desirable: NA,
        innovation_dev_commercial_viability: NA,
        innovation_dev_enabling_environment: NA,
        innovation_dev_evidence_of_uptake: NA,
        innovation_dev_expansion_potential: NA,
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('level 7 with knowledge sharing No and no scaling answers reads Not mandatory', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_L7,
      knowledgeSharing: false,
    });
    await expectParity(
      'level 7 boundary',
      id,
      level6Cells({
        innovation_dev_readiness_level: levelText(7, LEVEL7_NAME),
        innovation_dev_knowledge_sharing: 'No',
        ...scalingNm(),
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('users not determined hides stale actors, organizations and text', async () => {
    const id = await makeLevel6(
      {
        usersId: 1,
        beneficiaries: 'stale beneficiaries',
        outcome: 'stale outcome',
      },
      {
        actors: [{ typeId: ACTOR_FARMERS_CODE, womenYouth: true }],
        orgs: [KNOWN_ORG],
      },
    );
    await expectParity(
      'users not determined',
      id,
      level6Cells({
        innovation_dev_anticipated_users: USERS_YET,
        innovation_dev_actors: NA,
        innovation_dev_organizations: NA,
        innovation_dev_beneficiaries: NA,
        innovation_dev_expected_outcome: NA,
      }),
    );
  });

  it('opt out shows the qualification and hides the tool block', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_L8,
      knowledgeSharing: true,
      disseminationId: 1,
      context: 'stale context',
      resultsText: 'stale results',
    });
    await insertTool(id, TOOL_A_ID);
    await expectParity(
      'opt out',
      id,
      level6Cells({
        innovation_dev_readiness_level: levelText(8, LEVEL8_NAME),
        innovation_dev_knowledge_sharing: 'Yes',
        innovation_dev_dissemination: OPT_OUT,
        ...scalingNm(),
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('an Innovation Use result renders all 32 cells Not applicable', async () => {
    const { id } = await insertResult({
      indicatorId: IndicatorsEnum.INNOVATION_USE,
    });
    await expectParity(
      'indicator 6',
      id,
      naCells(),
      IndicatorsEnum.INNOVATION_USE,
    );
  });

  it('three actors, two organizations, three tool functions and two links stay one row', async () => {
    const id = await makeToolBlock(
      {},
      {
        actors: [
          { typeId: ACTOR_FARMERS_CODE, womenYouth: true },
          { typeId: ACTOR_RESEARCHERS_CODE, menNotYouth: true },
          {
            typeId: ACTOR_OTHER_CODE,
            custom: 'Field team',
            notApply: true,
          },
        ],
        orgs: [KNOWN_ORG, { known: false, typeId: ORG_PLAIN_CODE }],
        tools: [TOOL_A_ID, TOOL_B_ID, TOOL_C_ID],
      },
    );
    const titled = await insertResult({
      indicatorId: IndicatorsEnum.INNOVATION_USE,
      title: 'Linked development title',
    });
    const bare = await insertResult({
      indicatorId: IndicatorsEnum.INNOVATION_USE,
      platform: null,
      title: null,
    });
    const inactiveLinkTarget = await insertResult({
      indicatorId: IndicatorsEnum.INNOVATION_USE,
      title: 'Inactive link target',
    });
    const inactiveTarget = await insertResult({
      indicatorId: IndicatorsEnum.INNOVATION_USE,
      title: 'Inactive target title',
      active: false,
    });
    await insertLink(id, titled.id, true);
    await insertLink(id, bare.id, true);
    await insertLink(id, inactiveLinkTarget.id, false);
    await insertLink(id, inactiveTarget.id, true);
    const expectedLinks = joinLines([
      linkLine(PLATFORM, titled.officialCode, 'Linked development title'),
      linkLine(null, bare.officialCode, null),
    ]);
    await expectParity(
      'many children',
      id,
      toolBlockBase({
        innovation_dev_actors: joinLines([
          actorLine(ACTOR_FARMERS, null, 'youth'),
          actorLine(ACTOR_RESEARCHERS, null, 'men'),
          actorLine(ACTOR_OTHER, 'Field team', 'not-applicable'),
        ]),
        innovation_dev_organizations: joinLines([
          orgKnown(INSTITUTION_ACRONYM, INSTITUTION_NAME),
          orgTyped(ORG_PLAIN),
        ]),
        innovation_dev_tool_functions: joinLines([
          toolLine(TOOL_A),
          toolLine(TOOL_B),
          toolLine(TOOL_C),
        ]),
        innovation_dev_linked_tools: expectedLinks,
      }),
    );
    const [countRow] = await q(
      `SELECT COUNT(*) AS n FROM report_innovation_dev WHERE result_id = ?`,
      [id],
    );
    expect(Number(countRow.n)).toBe(1);
  });

  it('a missing short title is Not provided and nothing else is', async () => {
    const id = await makeLevel6({ shortTitle: null });
    await expectParity(
      'short title',
      id,
      level6Cells({ innovation_dev_short_title: NP }),
    );
  });

  it('a missing nature id is Not provided', async () => {
    const id = await makeLevel6({ natureId: null });
    await expectParity(
      'nature id',
      id,
      level6Cells({ innovation_dev_nature: NP }),
    );
  });

  it('a missing type id is Not provided', async () => {
    const id = await makeLevel6({ typeId: null });
    await expectParity('type id', id, level6Cells({ innovation_dev_type: NP }));
  });

  it('a missing readiness id is Not provided and scaling stays Not applicable', async () => {
    const id = await makeLevel6({ readinessId: null, knowledgeSharing: true });
    await expectParity(
      'readiness id',
      id,
      level6Cells({ innovation_dev_readiness_level: NP }),
    );
  });

  it('a blank readiness explanation is Not provided', async () => {
    const id = await makeLevel6({ explanation: '' });
    await expectParity(
      'readiness explanation',
      id,
      level6Cells({ innovation_dev_readiness_explanation: NP }),
    );
  });

  it('variety Yes with count 0 is Not provided', async () => {
    const id = await makeLevel6({ variety: true, varietyCount: 0 });
    await expectParity(
      'variety count 0',
      id,
      level6Cells({
        innovation_dev_is_new_variety: 'Yes',
        innovation_dev_varieties_count: NP,
      }),
    );
  });

  it('variety No hides a stale positive count', async () => {
    const id = await makeLevel6({ variety: false, varietyCount: 9 });
    await expectParity('variety no stale count', id, level6Cells());
  });

  it('variety NULL reads Not applicable on the count and Not mandatory on the flag', async () => {
    const id = await makeLevel6({ variety: null, varietyCount: 9 });
    await expectParity(
      'variety NULL',
      id,
      level6Cells({
        innovation_dev_is_new_variety: NM,
        innovation_dev_varieties_count: NA,
      }),
    );
  });

  it('a missing anticipated-users id is Not provided and the actor block stays Not applicable', async () => {
    const id = await makeLevel6({ usersId: null });
    await expectParity(
      'anticipated users',
      id,
      level6Cells({
        innovation_dev_anticipated_users: NP,
        innovation_dev_actors: NA,
        innovation_dev_organizations: NA,
        innovation_dev_beneficiaries: NA,
        innovation_dev_expected_outcome: NA,
      }),
    );
  });

  it('users determined with no active actors reads Not provided on Actors only', async () => {
    const id = await makeLevel6({}, { actors: [], orgs: [KNOWN_ORG] });
    await expectParity(
      'actors empty',
      id,
      level6Cells({ innovation_dev_actors: NP }),
    );
  });

  it('an Other actor with a NULL custom name shows Other: Not provided', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [{ typeId: ACTOR_OTHER_CODE, custom: null }],
        orgs: [KNOWN_ORG],
      },
    );
    await expectParity(
      'actor other null name',
      id,
      level6Cells({
        innovation_dev_actors: actorLine(ACTOR_OTHER, NP, 'none'),
      }),
    );
  });

  it('an Other actor with an empty custom name is accepted and renders the colon', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [{ typeId: ACTOR_OTHER_CODE, custom: '' }],
        orgs: [KNOWN_ORG],
      },
    );
    await expectParity(
      'actor other empty name',
      id,
      level6Cells({
        innovation_dev_actors: actorLine(ACTOR_OTHER, '', 'none'),
      }),
    );
  });

  it('users determined with no active organizations reads Not provided on Organizations only', async () => {
    const id = await makeLevel6({}, { actors: [FARMER], orgs: [] });
    await expectParity(
      'organizations empty',
      id,
      level6Cells({ innovation_dev_organizations: NP }),
    );
  });

  it('a known organization with no institution id reads Not provided', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: true, institutionId: null }],
      },
    );
    await expectParity(
      'known org missing institution',
      id,
      level6Cells({ innovation_dev_organizations: `${BULLET} ${NP}` }),
    );
  });

  it('an unknown organization with no type reads Not provided', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: false, typeId: null }],
      },
    );
    await expectParity(
      'unknown org missing type',
      id,
      level6Cells({ innovation_dev_organizations: `${BULLET} ${NP}` }),
    );
  });

  it('an unknown organization whose type has children and no sub-type reads Not provided in the sub-type slot', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: false, typeId: ORG_PARENT_CODE, subTypeId: null }],
      },
    );
    await expectParity(
      'org type has children',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(ORG_PARENT, ` > ${NP}`),
      }),
    );
  });

  it('an inactive child still counts as having children, so a missing sub-type is Not provided', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [
          { known: false, typeId: ORG_INACTIVE_PARENT_CODE, subTypeId: null },
        ],
      },
    );
    await expectParity(
      'org inactive child',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(ORG_INACTIVE_PARENT, ` > ${NP}`),
      }),
    );
  });

  it('an unknown organization whose type has no children does not require a sub-type', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: false, typeId: ORG_PLAIN_CODE }],
      },
    );
    await expectParity(
      'org type without children',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(ORG_PLAIN),
      }),
    );
  });

  it('organization type 78 with a NULL custom name shows Other (Not provided)', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: false, typeId: ORG_OTHER_CODE, custom: null }],
      },
    );
    await expectParity(
      'org 78 null name',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(ACTOR_OTHER, ` (${NP})`),
      }),
    );
  });

  it('organization type 78 with an empty custom name is accepted and renders empty parentheses', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: false, typeId: ORG_OTHER_CODE, custom: '' }],
      },
    );
    await expectParity(
      'org 78 empty name',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(ACTOR_OTHER, ' ()'),
      }),
    );
  });

  it('a NULL is_organization_known flag takes the not-known branch', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: null, typeId: ORG_PLAIN_CODE, institutionId: null }],
      },
    );
    await expectParity(
      'org known flag null',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(ORG_PLAIN),
      }),
    );
  });

  it('blank beneficiaries are Not provided when users are determined', async () => {
    const id = await makeLevel6({ beneficiaries: '' });
    await expectParity(
      'beneficiaries',
      id,
      level6Cells({ innovation_dev_beneficiaries: NP }),
    );
  });

  it('a blank expected outcome is Not provided when users are determined', async () => {
    const id = await makeLevel6({ outcome: null });
    await expectParity(
      'outcome',
      id,
      level6Cells({ innovation_dev_expected_outcome: NP }),
    );
  });

  it('knowledge sharing NULL at level 7 is Not provided and dissemination is Not applicable', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_L7,
      knowledgeSharing: null,
    });
    await expectParity(
      'knowledge sharing NULL',
      id,
      level6Cells({
        innovation_dev_readiness_level: levelText(7, LEVEL7_NAME),
        innovation_dev_knowledge_sharing: NP,
        innovation_dev_dissemination: NA,
        ...scalingNm(),
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('a NULL sex-and-age flag reads Not mandatory', async () => {
    const id = await makeLevel6({ sexNotApply: null });
    await expectParity(
      'sex age flag NULL',
      id,
      level6Cells({ innovation_dev_no_sex_age_disaggregation: NM }),
    );
  });

  it('dissemination NULL while knowledge sharing is Yes is Not provided', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_L8,
      knowledgeSharing: true,
      disseminationId: null,
    });
    await expectParity(
      'dissemination NULL',
      id,
      level6Cells({
        innovation_dev_readiness_level: levelText(8, LEVEL8_NAME),
        innovation_dev_knowledge_sharing: 'Yes',
        innovation_dev_dissemination: NP,
        ...scalingNm(),
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('a blank tool context is Not provided and the other tool cells are not', async () => {
    const id = await makeToolBlock({ context: '' });
    await expectParity(
      'tool context',
      id,
      toolBlockBase({ innovation_dev_tool_useful_context: NP }),
    );
  });

  it('blank results text is Not provided', async () => {
    const id = await makeToolBlock({ resultsText: null });
    await expectParity(
      'results text',
      id,
      toolBlockBase({ innovation_dev_results_achieved_expected: NP }),
    );
  });

  it('no active tool function is Not provided', async () => {
    const id = await makeToolBlock({}, { skipTools: true });
    await expectParity(
      'tool functions empty',
      id,
      toolBlockBase({ innovation_dev_tool_functions: NP }),
    );
  });

  it('used beyond NULL is Not provided and adoption is Not applicable', async () => {
    const id = await makeToolBlock({ usedBeyond: null, adoption: 'stale' });
    await expectParity(
      'used beyond NULL',
      id,
      toolBlockBase({
        innovation_dev_used_beyond_context: NP,
        innovation_dev_adoption_context: NA,
      }),
    );
  });

  it('used beyond Yes with a blank adoption context is Not provided', async () => {
    const id = await makeToolBlock({ usedBeyond: true, adoption: '' });
    await expectParity(
      'adoption blank',
      id,
      toolBlockBase({
        innovation_dev_used_beyond_context: 'Yes',
        innovation_dev_adoption_context: NP,
      }),
    );
  });

  it('proceed with no tool function and a blank adoption marks those two cells and leaves optional tools Not mandatory', async () => {
    const id = await makeToolBlock(
      {
        usedBeyond: true,
        adoption: null,
        otherTools: null,
        otherIntegration: null,
      },
      { skipTools: true },
    );
    await expectParity(
      'proceed with gaps',
      id,
      toolBlockBase({
        innovation_dev_tool_functions: NP,
        innovation_dev_used_beyond_context: 'Yes',
        innovation_dev_adoption_context: NP,
        innovation_dev_other_tools: NM,
        innovation_dev_other_tools_integration: NM,
      }),
    );
  });

  it('a NULL expansion potential leaves expansion details Not applicable', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_L8,
      knowledgeSharing: false,
      expansionId: null,
      expansionDetails: 'stale details',
    });
    await expectParity(
      'expansion NULL',
      id,
      level6Cells({
        innovation_dev_readiness_level: levelText(8, LEVEL8_NAME),
        innovation_dev_knowledge_sharing: 'No',
        ...scalingNm(),
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('a NULL readiness level renders Unknown and leaves scaling Not applicable', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_LEVEL_NULL,
      knowledgeSharing: true,
    });
    await expectParity(
      'level NULL',
      id,
      level6Cells({
        innovation_dev_readiness_level: unknownId(READINESS_LEVEL_NULL),
      }),
    );
  });

  it('a NULL nature name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6({ natureId: NATURE_NULL_NAME });
    await expectParity(
      'nature null name',
      id,
      level6Cells({
        innovation_dev_nature: unknownId(NATURE_NULL_NAME),
      }),
    );
  });

  it('a NULL type name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6({ typeId: TYPE_NULL_NAME });
    await expectParity(
      'type null name',
      id,
      level6Cells({ innovation_dev_type: unknownId(TYPE_NULL_NAME) }),
    );
  });

  it('a NULL readiness name renders Level plus Unknown', async () => {
    const id = await makeLevel6({ readinessId: READINESS_NAME_NULL });
    await expectParity(
      'readiness null name',
      id,
      level6Cells({
        innovation_dev_readiness_level: `Level 3: ${unknownId(READINESS_NAME_NULL)}`,
      }),
    );
  });

  it('an empty tool-function name renders Unknown for the accepted id', async () => {
    const id = await makeToolBlock({}, { tools: [TOOL_BLANK_ID] });
    await expectParity(
      'tool name empty',
      id,
      toolBlockBase({
        innovation_dev_tool_functions: toolLine(unknownId(TOOL_BLANK_ID)),
      }),
    );
  });

  it('a blank nature name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6({ natureId: NATURE_BLANK_NAME });
    await expectParity(
      'nature blank name',
      id,
      level6Cells({
        innovation_dev_nature: unknownId(NATURE_BLANK_NAME),
      }),
    );
  });

  it('a blank type name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6({ typeId: TYPE_BLANK_NAME });
    await expectParity(
      'type blank name',
      id,
      level6Cells({ innovation_dev_type: unknownId(TYPE_BLANK_NAME) }),
    );
  });

  it('a blank anticipated-users name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6({ usersId: USERS_BLANK });
    await expectParity(
      'users blank name',
      id,
      level6Cells({
        innovation_dev_anticipated_users: unknownId(USERS_BLANK),
        innovation_dev_actors: NA,
        innovation_dev_organizations: NA,
        innovation_dev_beneficiaries: NA,
        innovation_dev_expected_outcome: NA,
      }),
    );
  });

  it('a blank dissemination name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_L8,
      knowledgeSharing: true,
      disseminationId: DQ_BLANK,
    });
    await expectParity(
      'dissemination blank name',
      id,
      level6Cells({
        innovation_dev_readiness_level: levelText(8, LEVEL8_NAME),
        innovation_dev_knowledge_sharing: 'Yes',
        innovation_dev_dissemination: unknownId(DQ_BLANK),
        ...scalingNm(),
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('a blank readiness name behind an accepted id renders Level plus Unknown', async () => {
    const id = await makeLevel6({ readinessId: READINESS_BLANK_NAME });
    await expectParity(
      'readiness blank name',
      id,
      level6Cells({
        innovation_dev_readiness_level: `Level 6: ${unknownId(READINESS_BLANK_NAME)}`,
      }),
    );
  });

  it('a blank expansion-potential name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6({
      readinessId: READINESS_L7,
      knowledgeSharing: false,
      expansionId: EXPANSION_BLANK,
    });
    await expectParity(
      'expansion blank name',
      id,
      level6Cells({
        innovation_dev_readiness_level: levelText(7, LEVEL7_NAME),
        innovation_dev_knowledge_sharing: 'No',
        ...scalingNm(),
        innovation_dev_expansion_potential: unknownId(EXPANSION_BLANK),
        innovation_dev_expansion_details: NA,
      }),
    );
  });

  it('a blank actor-type name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [{ typeId: ACTOR_BLANK_CODE, womenYouth: true }],
        orgs: [KNOWN_ORG],
      },
    );
    await expectParity(
      'actor type blank name',
      id,
      level6Cells({
        innovation_dev_actors: actorLine(
          unknownId(ACTOR_BLANK_CODE),
          null,
          'youth',
        ),
      }),
    );
  });

  it('a blank known-institution name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: true, institutionId: INSTITUTION_BLANK_CODE }],
      },
    );
    await expectParity(
      'institution blank name',
      id,
      level6Cells({
        innovation_dev_organizations: orgKnown(
          INSTITUTION_BLANK_ACRONYM,
          unknownId(INSTITUTION_BLANK_CODE),
        ),
      }),
    );
  });

  it('a blank institution-type name with no children renders Unknown', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [{ known: false, typeId: ORG_BLANK_TYPE_CODE }],
      },
    );
    await expectParity(
      'org type blank name',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(unknownId(ORG_BLANK_TYPE_CODE)),
      }),
    );
  });

  it('a blank sub-type name behind an accepted id renders Unknown', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [
          {
            known: false,
            typeId: ORG_BLANK_PARENT_CODE,
            subTypeId: ORG_BLANK_CHILD_CODE,
          },
        ],
      },
    );
    await expectParity(
      'subtype blank name',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(
          ORG_BLANK_PARENT,
          ` > ${unknownId(ORG_BLANK_CHILD_CODE)}`,
        ),
      }),
    );
  });

  it('a blank institution-type name that has one child renders Unknown then the child name', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [FARMER],
        orgs: [
          {
            known: false,
            typeId: ORG_BLANK_PARENT_WITH_CHILD,
            subTypeId: ORG_CHILD_OF_BLANK_PARENT,
          },
        ],
      },
    );
    await expectParity(
      'parent type blank name with child',
      id,
      level6Cells({
        innovation_dev_organizations: orgTyped(
          unknownId(ORG_BLANK_PARENT_WITH_CHILD),
          ` > ${ORG_CHILD_OF_BLANK_NAME}`,
        ),
      }),
    );
  });

  it('an inactive innovation-dev row is invisible to the view while the function can still pass', async () => {
    const id = await makeLevel6({ active: false });
    await expectBreak('inactive rid', id, noDetailCells());
  });

  it('role-2 actors and organizations satisfy the function and are Not provided in the view', async () => {
    const id = await makeLevel6(
      {},
      {
        actors: [
          {
            typeId: ACTOR_RESEARCHERS_CODE,
            roleId: ActorRolesEnum.INNOVATION_USE,
            womenYouth: true,
          },
        ],
        orgs: [
          {
            ...KNOWN_ORG,
            roleId: InstitutionTypeRoleEnum.INNOVATION_USE,
          },
        ],
      },
    );
    await expectBreak(
      'role 2 rows',
      id,
      level6Cells({
        innovation_dev_actors: NP,
        innovation_dev_organizations: NP,
      }),
    );
  });

  it('a live result with no detail row fails the common fields and leaves conditional cells Not applicable', async () => {
    const { id } = await insertResult({});
    await expectParity('no detail row', id, noDetailCells());
  });

  it('snapshot and soft-deleted results are absent, and no result id is repeated', async () => {
    const snapshot = await insertResult({ snapshot: true });
    await insertDev(snapshot.id, {});
    const deleted = await insertResult({ active: false });
    await insertDev(deleted.id, {});
    const absent = await q(
      `SELECT result_id AS resultId FROM report_innovation_dev WHERE result_id IN (?, ?)`,
      [snapshot.id, deleted.id],
    );
    expect(absent).toEqual([]);
    const dupes = await q(
      `SELECT result_id AS resultId, COUNT(*) AS n
       FROM report_innovation_dev
       GROUP BY result_id
       HAVING COUNT(*) > 1`,
    );
    expect(dupes).toEqual([]);
  });

  describe('EXPLAIN gate', () => {
    it('merges four laterals on 200 mixed results and keeps Phase 2 at 60 top-level rows', async () => {
      const bulkIds: number[] = [];
      const mix = [
        IndicatorsEnum.INNOVATION_DEV,
        IndicatorsEnum.INNOVATION_USE,
        IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      ];
      const anchor = await insertResult({
        indicatorId: IndicatorsEnum.INNOVATION_USE,
        title: 'Explain anchor',
      });
      for (let i = 0; i < 210; i += 1) {
        const row = await insertResult({ indicatorId: mix[i % 3] });
        bulkIds.push(row.id);
        await insertDev(row.id, {
          readinessId: READINESS_L8,
          knowledgeSharing: true,
          disseminationId: 2,
          variety: true,
          varietyCount: 2,
        });
        await insertActor(row.id, FARMER);
        await insertOrg(row.id, KNOWN_ORG);
        await insertTool(row.id, TOOL_A_ID);
        await insertLink(row.id, anchor.id, true);
      }
      expect(bulkIds.length).toBeGreaterThanOrEqual(200);

      const inList = bulkIds.map(() => '?').join(', ');
      const [actorCount] = await q(
        `SELECT COUNT(*) AS n FROM result_actors WHERE result_id IN (${inList})`,
        bulkIds,
      );
      const [orgCount] = await q(
        `SELECT COUNT(*) AS n FROM result_institution_types WHERE result_id IN (${inList})`,
        bulkIds,
      );
      const [toolCount] = await q(
        `SELECT COUNT(*) AS n FROM result_innovation_tool_function WHERE result_id IN (${inList})`,
        bulkIds,
      );
      const [linkCount] = await q(
        `SELECT COUNT(*) AS n FROM link_results WHERE result_id IN (${inList}) AND is_active = 1`,
        bulkIds,
      );
      const childCounts = {
        actors: Number(actorCount.n),
        organizations: Number(orgCount.n),
        toolFunctions: Number(toolCount.n),
        links: Number(linkCount.n),
        results: bulkIds.length,
      };
      expect(childCounts).toEqual({
        actors: 210,
        organizations: 210,
        toolFunctions: 210,
        links: 210,
        results: 210,
      });

      const captured: { sql: string; params: unknown[] }[] = [];
      const fakeRunner = {
        connect: async () => undefined,
        startTransaction: async () => undefined,
        commitTransaction: async () => undefined,
        rollbackTransaction: async () => undefined,
        release: async () => undefined,
        query: async (sql: string, params?: unknown[]) => {
          captured.push({ sql, params: params ?? [] });
          return [];
        },
      };
      const repo = new StarResultsExportRepository(
        { createQueryRunner: () => fakeRunner } as never,
        { ARI_CLIENT_HOST: 'https://star.example' } as AppConfig,
        {
          findResultsV2: async () => ({
            data: bulkIds.map((result_id) => ({ result_id })),
            pagination: { hasNextPage: false },
          }),
        } as unknown as ResultRepository,
      );
      await repo.findStarResultsMetadataRows(emptyFullFiltersReportDto());
      const phase2 = captured.find((call) =>
        call.sql.includes('FROM report_general_information gi'),
      );
      expect(phase2).toBeDefined();
      const capturedSql = phase2?.sql ?? '';
      const params = phase2?.params ?? [];
      expect(capturedSql).toContain('WHERE gi.result_id IN');
      expect(params).toHaveLength(bulkIds.length * 2);

      const fromAt = capturedSql.indexOf('FROM report_general_information gi');
      const whereAt = capturedSql.indexOf('WHERE gi.result_id IN');
      expect(fromAt).toBeGreaterThanOrEqual(0);
      expect(whereAt).toBeGreaterThan(fromAt);
      const phase2Probe = `SELECT gi.result_id\n${capturedSql.slice(fromAt, whereAt)}WHERE gi.result_id IN (1, 2, 3)`;
      writeFileSync('/tmp/t02-idx-phase2-probe.sql', phase2Probe);
      const [modeRow] = await q(`SELECT @@SESSION.sql_mode AS mode`);
      await q(
        `SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'`,
      );
      let topLevel: QueryRow[] = [];
      try {
        const explained = await q(`EXPLAIN ${phase2Probe}`);
        topLevel = explained.filter((row) => Number(row.id) === 1);
      } finally {
        await q(`SET SESSION sql_mode = ?`, [modeRow.mode]);
      }
      expect(topLevel).toHaveLength(60);
      const topTables = topLevel.map((row) => String(row.table ?? ''));
      const derivedTables = topTables
        .filter((table) => /^<derived\d+>$/.test(table))
        .sort(
          (left, right) =>
            Number(/^<derived(\d+)>$/.exec(left)?.[1]) -
            Number(/^<derived(\d+)>$/.exec(right)?.[1]),
        );
      expect(derivedTables).toEqual([...PREEXISTING_PHASE2_DERIVED]);
      expect(topTables).toContain('riu');
      expect(topTables).toContain('ciul');
      expect(topTables).not.toContain('report_innovation_dev');
      expect(capturedSql).not.toContain('report_innovation_dev');

      const phase3Call = captured.find((call) =>
        call.sql.includes('FROM report_innovation_dev'),
      );
      expect(phase3Call).toBeDefined();
      const phase3 = phase3Call?.sql ?? '';
      const phase3Params = phase3Call?.params ?? [];
      expect(phase3Params).toEqual(bulkIds);
      expect((phase3.match(/\?/g) ?? []).length).toBe(bulkIds.length);
      for (const key of CELL_KEYS) {
        expect(phase3).toContain(key);
      }
      const plan = planText(
        await q(`EXPLAIN FORMAT=TREE ${phase3}`, phase3Params),
      );
      writeFileSync('/tmp/t02-idx-explain.txt', plan);

      const materializes = plan
        .split('\n')
        .filter((line) => line.includes('Materialize'));
      expect(materializes).toHaveLength(4);
      for (const line of materializes) {
        expect(line).toContain('invalidate on row from root');
      }
      for (const alias of LATERAL_ALIASES) {
        const found = lateralCorrelation(plan, alias);
        expect({ alias, correlatedOnResultId: found !== null }).toEqual({
          alias,
          correlatedOnResultId: true,
        });
      }
      const planLines = plan.split('\n');
      const rootFilterAt = planLines.findIndex((line) =>
        line.includes('root.result_id in ('),
      );
      expect(rootFilterAt).toBeGreaterThanOrEqual(0);
      const rootAccess = planLines
        .slice(rootFilterAt + 1)
        .find((line) => /-> .* on root\b/.test(line));
      expect(rootAccess).toMatch(
        /(?:Table scan on root|(?:Covering )?Index (?:range scan|lookup) on root using PRIMARY)\b/,
      );
      expect(plan).not.toMatch(/\bHash\b/);
      // Phase 3 tree only. Phase 2's 28 pre-existing <derived…> rows
      // are compared on the traditional EXPLAIN above.
      expect(plan).not.toMatch(/<derived/);

      const samples: number[] = [];
      for (let run = 0; run < 3; run += 1) {
        const started = process.hrtime.bigint();
        await q(phase3, phase3Params);
        samples.push(Number(process.hrtime.bigint() - started) / 1e6);
      }
      const timing = summarize(samples);
      writeFileSync(
        '/tmp/t02-idx-timing.json',
        JSON.stringify(
          {
            samples,
            ...timing,
            childCounts,
            derivedCount: derivedTables.length,
            derivedTables,
          },
          null,
          2,
        ),
      );
      expect(samples).toHaveLength(3);
    });
  });
});

function planText(rows: QueryRow[]): string {
  return rows.map((row) => String(row.EXPLAIN ?? '')).join('\n');
}

function lateralCorrelation(plan: string, alias: string): string | null {
  const lines = plan.split('\n');
  const access =
    /(?:Index (?:range )?scan|Index lookup|Table scan) on ([A-Za-z0-9_]+)\b/;
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes('Materialize (invalidate on row from root)')) {
      continue;
    }
    const indent = lines[i].indexOf('->');
    const block = [lines[i]];
    for (let j = i + 1; j < lines.length; j += 1) {
      const childIndent = lines[j].indexOf('->');
      if (childIndent !== -1 && childIndent <= indent) {
        break;
      }
      block.push(lines[j]);
    }
    const owned = block.some((line) => access.exec(line)?.[1] === alias);
    if (!owned) {
      continue;
    }
    const compact = block.join('\n').replace(/\s+/g, '');
    const namedFilter = compact.includes(`${alias}.result_id=root.result_id`);
    const indexRef = block.some(
      (line) =>
        access.exec(line)?.[1] === alias &&
        line.includes('(result_id=root.result_id)'),
    );
    if (namedFilter || indexRef) {
      return block.join('\n');
    }
    return null;
  }
  return null;
}

function summarize(samples: number[]): { median: number; spread: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { median, spread: sorted[sorted.length - 1] - sorted[0] };
}

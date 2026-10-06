import { writeFileSync } from 'fs';
import type { QueryRunner } from 'typeorm';
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { ActorRolesEnum } from '../../../src/domain/entities/actor-roles/enum/actor-roles.enum';
import { IndicatorsEnum } from '../../../src/domain/entities/indicators/enum/indicators.enum';
import { InstitutionTypeRoleEnum } from '../../../src/domain/entities/institution-type-roles/enum/institution-type-role.enum';
import { LinkResultRolesEnum } from '../../../src/domain/entities/link-result-roles/enum/link-result-roles.enum';
import { QuantificationRolesEnum } from '../../../src/domain/entities/quantification-roles/enum/quantification-roles.enum';
import { emptyFullFiltersReportDto } from '../../../src/domain/entities/reports/dto/filters-report.dto';
import { StarResultsExportRepository } from '../../../src/domain/entities/reports/repositories/star-results-export.repository';
import { AppConfig } from '../../../src/domain/shared/utils/app-config.util';
import { ResultRepository } from '../../../src/domain/entities/results/repositories/result.repository';

/**
 * T-02 (`docs/specs/innovation-use/excel-export`) — parity, one-row,
 * EXPLAIN and timing harness for `report_innovation_use` on the scratch
 * schema. Expected cell text is built from requirements R-IUX-001…006 and
 * design §3.2–§3.4. This file does not read the view to decide what to
 * expect.
 *
 * Band `906_000` (FP-45; `905_000` is `sp-versioning-pool-funding`).
 * Report year `2118`. Platform `T02IUXV`.
 *
 * What this file cannot reach (KZ-017): Dev/Prod data volume, live CLARISA
 * content, and the production MySQL version (design P-4).
 *
 * Falsifier (e) is a known blind spot of the EXPLAIN gate: dropping the
 * `indicator_id = 6` guard inside the laterals does not change plan shape.
 * Its value shows up only in the timing reading.
 */

jest.setTimeout(180_000);

const NP = 'Not provided';
const NA = 'Not applicable';
const NM = 'Not mandatory';
const BULLET = '\u2022';
const EM = '\u2014';

const REPORT_YEAR = 2118;
const PLATFORM = 'T02IUXV';
const GROUP_CONCAT_MAX_LEN = 4_194_304;

const ACTOR_FARMERS_CODE = 906_811;
const ACTOR_FARMERS = 'Farmers';
const ACTOR_RESEARCHERS_CODE = 906_812;
const ACTOR_RESEARCHERS = 'Researchers';
const ACTOR_OTHER_CODE = 5;
const ACTOR_OTHER = 'Other';

const ORG_ROOT_NO_CHILD = 906_701;
const ORG_ROOT_NO_CHILD_NAME = 'Public sector';
const ORG_ROOT_WITH_CHILD = 906_710;
const ORG_ROOT_WITH_CHILD_NAME = 'Research organization';
const ORG_CHILD = 906_711;
const ORG_CHILD_NAME = 'National program';
const ORG_OTHER_ROOT = 906_720;
const ORG_OTHER_ROOT_NAME = 'Private sector';
const ORG_OTHER_CHILD = 906_721;
const ORG_OTHER_CHILD_NAME = 'Firm';
const ORG_INACTIVE_ROOT = 906_740;
const ORG_INACTIVE_ROOT_NAME = 'Inactive root type';
const ORG_INACTIVE_CHILD = 906_741;
const ORG_INACTIVE_CHILD_NAME = 'Child of inactive root';
const ORG_MID_ROOT = 906_750;
const ORG_MID_ROOT_NAME = 'Grandparent type';
const ORG_MID = 906_751;
const ORG_MID_NAME = 'Mid type';
const ORG_MID_CHILD = 906_752;
const ORG_MID_CHILD_NAME = 'Leaf of mid';
const INSTITUTION_KNOWN = 906_730;
const INSTITUTION_KNOWN_NAME = 'Fixture Known Institute';
const INSTITUTION_KNOWN_ACRONYM = 'FKI';
const INSTITUTION_MISSING = 906_799;

const USE_LEVEL_NULL = 906_801;
const USE_LEVEL_MISSING = 906_899;
const READINESS_OK = 906_501;
const READINESS_OK_LEVEL = 3;
const READINESS_OK_NAME = 'Fixture readiness';
const READINESS_NULL_LEVEL = 906_502;
const GEO_CODE = 906_601;
const GEO_NAME = 'Fixture geo scope';

const LEVEL_2_ID = 3;
const LEVEL_2 = 2;
const LEVEL_2_NAME = 'Partners';
const LEVEL_5_ID = 6;
const LEVEL_5 = 5;
const LEVEL_5_NAME = 'Connected next-user';
const LEVEL_6_ID = 7;
const LEVEL_6 = 6;
const LEVEL_6_NAME = 'Unconnected next-user';
const LEVEL_7_ID = 8;
const LEVEL_7 = 7;
const LEVEL_7_NAME = 'Unconnected next-user';
/** global-setup row. This file uses it and must not create or delete it. */
const RESULT_STATUS_ID = 8;

const DEV_TITLE = 'Linked development title';
const DEV_DESCRIPTION = 'Linked development description';

const CELL_KEYS = [
  'innovation_use_level',
  'innovation_use_level_explanation',
  'innovation_use_actors',
  'innovation_use_organizations',
  'innovation_use_quantifications',
  'innovation_use_linked_dev',
  'innovation_use_linked_dev_readiness',
  'innovation_use_linked_dev_description',
  'innovation_use_linked_dev_geo_scope',
] as const;

type CellKey = (typeof CELL_KEYS)[number];
type Cells = Record<CellKey, string>;

/** Aliases of the four per-row laterals. The index MySQL picks is not asserted. */
const LATERAL_ALIASES = ['ra', 'rit', 'rq', 'lr'] as const;

const IU_SELECT_LIST = [
  'iu.innovation_use_level AS innovation_use_level',
  'iu.innovation_use_level_explanation AS innovation_use_level_explanation',
  'iu.innovation_use_actors AS innovation_use_actors',
  'iu.innovation_use_organizations AS innovation_use_organizations',
  'iu.innovation_use_quantifications AS innovation_use_quantifications',
  'iu.innovation_use_linked_dev AS innovation_use_linked_dev',
  'iu.innovation_use_linked_dev_readiness AS innovation_use_linked_dev_readiness',
  'iu.innovation_use_linked_dev_description AS innovation_use_linked_dev_description',
  'iu.innovation_use_linked_dev_geo_scope AS innovation_use_linked_dev_geo_scope',
]
  .map((line) => `        ${line}`)
  .join(',\n');

const IU_JOIN =
  '      LEFT JOIN report_innovation_use iu ON iu.result_id = gi.result_id';

/**
 * Pinned from EXPLAIN of Phase 2 without the view, on this scratch schema,
 * counting every results/root scan line (table, index, covering, range).
 * Updated once the seeded plan is observed. The same seed has produced 3
 * (outer root is a table scan) and 2 (that read is an index lookup on the
 * indicator foreign key). The view must use the same count as the base plan,
 * and that count stays inside this pin.
 */
const BASELINE_RESULTS_SCAN_COUNT = 3;

const RESULTS_SCAN_LINE =
  /(?:Covering )?[Ii]ndex (?:range )?scan on (?:results|root)\b|Table scan on (?:results|root)\b/;

function levelText(level: number, name: string): string {
  return `Level ${level}: ${name}`;
}

function unknownId(id: number): string {
  return `Unknown (id ${id})`;
}

function actorDisaggregated(
  typeName: string,
  custom: string | null,
  counts: [string, string, string, string],
  total: string,
): string {
  const head = custom === null ? typeName : `${typeName}: ${custom}`;
  return `${BULLET} ${head} ${EM} Women (youth): ${counts[0]}; Women (non-youth): ${counts[1]}; Men (youth): ${counts[2]}; Men (non-youth): ${counts[3]}; Total: ${total}`;
}

function actorAggregate(
  typeName: string,
  custom: string | null,
  total: string,
): string {
  const head = custom === null ? typeName : `${typeName}: ${custom}`;
  return `${BULLET} ${head} ${EM} Total: ${total} (sex and age disaggregation not applicable)`;
}

function orgKnown(acronym: string | null, name: string): string {
  const body = acronym ? `${acronym} - ${name}` : name;
  return `${BULLET} ${body}`;
}

function orgUnknown(
  typeName: string,
  sub: string | null,
  count: string,
): string {
  const subPart = sub === null ? '' : ` > ${sub}`;
  return `${BULLET} ${typeName}${subPart} ${EM} Number of organizations: ${count}`;
}

function measureLine(number: string, unit: string, comment: string): string {
  return `${BULLET} Number: ${number}, Unit: ${unit}, Comment: ${comment}`;
}

function devLabel(
  platform: string | null,
  officialCode: number,
  title: string | null,
): string {
  const codePart =
    platform === null ? String(officialCode) : `${platform}-${officialCode}`;
  return title === null ? codePart : `${codePart} - ${title}`;
}

function joinLines(lines: string[]): string {
  return lines.join('\n');
}

describe('report_innovation_use view (T-02 excel-export)', () => {
  const uniqueSuffix = Date.now();
  let nextCode = 906_000_000_000_000 + uniqueSuffix;
  const resultIds: number[] = [];
  let runner: QueryRunner;

  let platformSeeded = false;
  let yearSeeded = false;
  let indicatorTypeSeeded = false;
  const indicatorsSeeded: number[] = [];
  let actorOtherSeeded = false;

  let rule16Probe = 0;

  interface LinkCells {
    innovation_use_linked_dev: string;
    innovation_use_linked_dev_readiness: string;
    innovation_use_linked_dev_description: string;
    innovation_use_linked_dev_geo_scope: string;
  }

  function baseCells(partial: Partial<Cells>): Cells {
    return {
      innovation_use_level: levelText(LEVEL_2, LEVEL_2_NAME),
      innovation_use_level_explanation: NA,
      innovation_use_actors: NM,
      innovation_use_organizations: NM,
      innovation_use_quantifications: NM,
      innovation_use_linked_dev: NP,
      innovation_use_linked_dev_readiness: NA,
      innovation_use_linked_dev_description: NA,
      innovation_use_linked_dev_geo_scope: NA,
      ...partial,
    };
  }

  function nextOfficialCode(): number {
    const code = nextCode;
    nextCode += 1;
    return code;
  }

  async function q(sql: string, params: unknown[] = []): Promise<any> {
    return runner.query(sql, params);
  }

  async function insertResult(seed: {
    indicatorId: number | null;
    active?: boolean;
    snapshot?: boolean;
    platform?: string | null;
    title?: string | null;
    description?: string | null;
    geoScopeId?: number | null;
    officialCode?: number;
  }): Promise<{ id: number; officialCode: number }> {
    const officialCode = seed.officialCode ?? nextOfficialCode();
    const inserted = await q(
      `INSERT INTO results (
         is_active, result_official_code, platform_code, title, description,
         report_year_id, is_snapshot, indicator_id, geo_scope_id, result_status_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seed.active === false ? 0 : 1,
        officialCode,
        seed.platform === undefined ? PLATFORM : seed.platform,
        seed.title ?? null,
        seed.description ?? null,
        REPORT_YEAR,
        seed.snapshot ? 1 : 0,
        seed.indicatorId,
        seed.geoScopeId ?? null,
        RESULT_STATUS_ID,
      ],
    );
    resultIds.push(inserted.insertId);
    return { id: inserted.insertId, officialCode };
  }

  async function insertDetail(
    resultId: number,
    levelId: number | null,
    explanation: string | null,
    active = true,
  ): Promise<void> {
    await q(
      `INSERT INTO result_innovation_use (
         result_id, innovation_use_level_id, innovation_use_level_explanation,
         is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, 1, 1)`,
      [resultId, levelId, explanation, active ? 1 : 0],
    );
  }

  async function insertActor(seed: {
    resultId: number;
    actorTypeId: number;
    customName?: string | null;
    disaggregationNotApply?: boolean | null;
    actorsCount?: number | null;
    womenYouth?: number | null;
    womenNotYouth?: number | null;
    menYouth?: number | null;
    menNotYouth?: number | null;
    roleId?: number;
  }): Promise<void> {
    await q(
      `INSERT INTO result_actors (
         result_id, actor_type_id, actor_type_custom_name,
         sex_age_disaggregation_not_apply,
         women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count,
         actors_count, actor_role_id, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`,
      [
        seed.resultId,
        seed.actorTypeId,
        seed.customName ?? null,
        seed.disaggregationNotApply ?? null,
        seed.womenYouth ?? null,
        seed.womenNotYouth ?? null,
        seed.menYouth ?? null,
        seed.menNotYouth ?? null,
        seed.actorsCount ?? null,
        seed.roleId ?? ActorRolesEnum.INNOVATION_USE,
      ],
    );
  }

  async function insertOrg(seed: {
    resultId: number;
    known: boolean | null;
    institutionId?: number | null;
    typeId?: number | null;
    subTypeId?: number | null;
    count?: number | null;
    roleId?: number;
  }): Promise<void> {
    await q(
      `INSERT INTO result_institution_types (
         result_id, institution_type_role_id, is_organization_known,
         institution_id, institution_type_id, sub_institution_type_id,
         organization_count, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`,
      [
        seed.resultId,
        seed.roleId ?? InstitutionTypeRoleEnum.INNOVATION_USE,
        seed.known,
        seed.institutionId ?? null,
        seed.typeId ?? null,
        seed.subTypeId ?? null,
        seed.count ?? null,
      ],
    );
  }

  async function insertMeasure(
    resultId: number,
    quantificationNumber: number | null,
    unit: string | null,
    description: string | null,
    roleId: number = QuantificationRolesEnum.INNOVATION_USE,
  ): Promise<void> {
    await q(
      `INSERT INTO result_quantifications (
         result_id, quantification_role_id, quantification_number, unit,
         description, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, 1, 1, 1)`,
      [resultId, roleId, quantificationNumber, unit, description],
    );
  }

  async function insertDevCard(
    resultId: number,
    readinessId: number | null,
  ): Promise<void> {
    await q(
      `INSERT INTO result_innovation_dev (result_id, is_active, innovation_readiness_id)
       VALUES (?, 1, ?)`,
      [resultId, readinessId],
    );
  }

  async function linkDev(
    useResultId: number,
    targetId: number,
    options?: { active?: boolean; roleId?: number },
  ): Promise<void> {
    await q(
      `INSERT INTO link_results (
         result_id, other_result_id, link_result_role_id, is_active, created_by, updated_by
       ) VALUES (?, ?, ?, ?, 1, 1)`,
      [
        useResultId,
        targetId,
        options?.roleId ?? LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
        options?.active === false ? 0 : 1,
      ],
    );
  }

  async function seedQualifyingDev(options?: {
    title?: string | null;
    platform?: string | null;
    description?: string | null;
    readinessId?: number | null;
    skipCard?: boolean;
    active?: boolean;
  }): Promise<LinkCells & { id: number }> {
    const title = options && 'title' in options ? options.title : DEV_TITLE;
    const platform =
      options && 'platform' in options ? options.platform : PLATFORM;
    const description =
      options && 'description' in options
        ? options.description
        : DEV_DESCRIPTION;
    const readinessId =
      options && 'readinessId' in options ? options.readinessId : READINESS_OK;
    const dev = await insertResult({
      indicatorId: IndicatorsEnum.INNOVATION_DEV,
      active: options?.active !== false,
      platform,
      title,
      description,
      geoScopeId: GEO_CODE,
    });
    if (!options?.skipCard && options?.active !== false) {
      await insertDevCard(dev.id, readinessId ?? null);
    }
    const readiness =
      readinessId === null || options?.skipCard
        ? NM
        : readinessId === READINESS_NULL_LEVEL
          ? unknownId(READINESS_NULL_LEVEL)
          : levelText(READINESS_OK_LEVEL, READINESS_OK_NAME);
    return {
      id: dev.id,
      innovation_use_linked_dev: devLabel(
        platform ?? null,
        dev.officialCode,
        title ?? null,
      ),
      innovation_use_linked_dev_readiness: readiness,
      innovation_use_linked_dev_description: description ?? NM,
      innovation_use_linked_dev_geo_scope: GEO_NAME,
    };
  }

  async function seedUseBase(options?: {
    indicatorId?: number;
    active?: boolean;
    snapshot?: boolean;
    level?:
      | 'none'
      | { id: number | null; explanation?: string | null; active?: boolean };
    withLink?: boolean;
    link?: LinkCells;
  }): Promise<{ id: number; link: LinkCells }> {
    const subject = await insertResult({
      indicatorId: options?.indicatorId ?? IndicatorsEnum.INNOVATION_USE,
      active: options?.active !== false,
      snapshot: options?.snapshot === true,
    });
    const level = options?.level ?? {
      id: LEVEL_2_ID,
      explanation: null,
      active: true,
    };
    if (level !== 'none') {
      await insertDetail(
        subject.id,
        level.id,
        level.explanation ?? null,
        level.active !== false,
      );
    }
    let link: LinkCells = {
      innovation_use_linked_dev: NP,
      innovation_use_linked_dev_readiness: NA,
      innovation_use_linked_dev_description: NA,
      innovation_use_linked_dev_geo_scope: NA,
    };
    if (options?.link) {
      link = options.link;
    } else if (options?.withLink !== false && options?.active !== false) {
      const dev = await seedQualifyingDev();
      await linkDev(subject.id, dev.id);
      link = dev;
    }
    return { id: subject.id, link };
  }

  async function callValidation(resultId: number): Promise<number> {
    const [row] = await q('SELECT innovation_use_validation(?) AS v', [
      resultId,
    ]);
    return Number(row.v);
  }

  async function loadCells(resultId: number): Promise<Cells | undefined> {
    const rows = await q(
      `SELECT ${CELL_KEYS.join(', ')} FROM report_innovation_use WHERE result_id = ?`,
      [resultId],
    );
    return rows[0];
  }

  function cellsContainingNp(row: Cells): CellKey[] {
    return CELL_KEYS.filter((key) => String(row[key] ?? '').includes(NP));
  }

  async function expectCase(
    label: string,
    resultId: number,
    expected: Cells,
    npCells: CellKey[],
    expectedIndicator: number = IndicatorsEnum.INNOVATION_USE,
  ): Promise<void> {
    const row = await loadCells(resultId);
    expect(row).toBeDefined();
    const actual = row as Cells;
    for (const key of CELL_KEYS) {
      expect({ label, cell: key, value: actual[key] }).toEqual({
        label,
        cell: key,
        value: expected[key],
      });
    }
    expect({ label, npCells: cellsContainingNp(actual) }).toEqual({
      label,
      npCells,
    });
    const [subject] = await q(
      'SELECT indicator_id AS indicatorId FROM results WHERE result_id = ?',
      [resultId],
    );
    const indicatorId = Number(subject.indicatorId);
    expect({ label, indicatorId }).toEqual({
      label,
      indicatorId: expectedIndicator,
    });
    if (expectedIndicator !== IndicatorsEnum.INNOVATION_USE) {
      return;
    }
    const fn = await callValidation(resultId);
    const hasNp = npCells.length > 0;
    expect({
      label,
      validation: fn,
      cellsContainNotProvided: cellsContainingNp(actual).length > 0,
    }).toEqual({
      label,
      validation: hasNp ? 0 : 1,
      cellsContainNotProvided: hasNp,
    });
  }

  beforeAll(async () => {
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await q(`SET SESSION group_concat_max_len = ${GROUP_CONCAT_MAX_LEN}`);
    // Scratch defaults include ONLY_FULL_GROUP_BY; Dev does not. Phase 2
    // selects report_oicr, which errors 1055 under the container default.
    // Same session mode as report-oicr-number-rendering.fixture-spec.ts.
    await q(
      `SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'`,
    );

    const [platform] = await q(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = ?`,
      [PLATFORM],
    );
    if (!platform) {
      await q(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES (?, ?)`,
        [PLATFORM, 'T-02 innovation use export fixture'],
      );
      platformSeeded = true;
    }

    const [year] = await q(
      `SELECT report_year FROM report_years WHERE report_year = ?`,
      [REPORT_YEAR],
    );
    if (!year) {
      await q(`INSERT INTO report_years (report_year) VALUES (?)`, [
        REPORT_YEAR,
      ]);
      yearSeeded = true;
    }

    const [indicatorType] = await q(
      `SELECT indicator_type_id FROM indicator_types WHERE indicator_type_id = 1`,
    );
    if (!indicatorType) {
      await q(
        `INSERT INTO indicator_types (indicator_type_id, name) VALUES (1, 'Fixture indicator type')`,
      );
      indicatorTypeSeeded = true;
    }

    const indicatorRows: [number, string][] = [
      [
        IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        'Capacity Sharing for Development',
      ],
      [IndicatorsEnum.INNOVATION_DEV, 'Innovation Development'],
      [IndicatorsEnum.INNOVATION_USE, 'Innovation Use'],
    ];
    for (const [id, name] of indicatorRows) {
      const [existing] = await q(
        `SELECT indicator_id FROM indicators WHERE indicator_id = ?`,
        [id],
      );
      if (!existing) {
        await q(
          `INSERT INTO indicators (indicator_id, name, indicator_type_id) VALUES (?, ?, 1)`,
          [id, name],
        );
        indicatorsSeeded.push(id);
      }
    }

    const [otherActor] = await q(
      `SELECT code FROM clarisa_actor_types WHERE code = ?`,
      [ACTOR_OTHER_CODE],
    );
    if (!otherActor) {
      await q(`INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?)`, [
        ACTOR_OTHER_CODE,
        ACTOR_OTHER,
      ]);
      actorOtherSeeded = true;
    }
    await q(
      `INSERT INTO clarisa_actor_types (code, name) VALUES (?, ?), (?, ?)`,
      [
        ACTOR_FARMERS_CODE,
        ACTOR_FARMERS,
        ACTOR_RESEARCHERS_CODE,
        ACTOR_RESEARCHERS,
      ],
    );

    await q(
      `INSERT INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, NULL, 1), (?, ?, NULL, 1), (?, ?, NULL, 1)`,
      [
        ORG_ROOT_NO_CHILD,
        ORG_ROOT_NO_CHILD_NAME,
        ORG_ROOT_WITH_CHILD,
        ORG_ROOT_WITH_CHILD_NAME,
        ORG_OTHER_ROOT,
        ORG_OTHER_ROOT_NAME,
      ],
    );
    await q(
      `INSERT INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, ?, 1), (?, ?, ?, 1)`,
      [
        ORG_CHILD,
        ORG_CHILD_NAME,
        ORG_ROOT_WITH_CHILD,
        ORG_OTHER_CHILD,
        ORG_OTHER_CHILD_NAME,
        ORG_OTHER_ROOT,
      ],
    );
    await q(
      `INSERT INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, NULL, 0), (?, ?, NULL, 1)`,
      [
        ORG_INACTIVE_ROOT,
        ORG_INACTIVE_ROOT_NAME,
        ORG_MID_ROOT,
        ORG_MID_ROOT_NAME,
      ],
    );
    await q(
      `INSERT INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, ?, 1), (?, ?, ?, 1)`,
      [
        ORG_INACTIVE_CHILD,
        ORG_INACTIVE_CHILD_NAME,
        ORG_INACTIVE_ROOT,
        ORG_MID,
        ORG_MID_NAME,
        ORG_MID_ROOT,
      ],
    );
    await q(
      `INSERT INTO clarisa_institution_types (code, name, parent_code, is_active) VALUES (?, ?, ?, 1)`,
      [ORG_MID_CHILD, ORG_MID_CHILD_NAME, ORG_MID],
    );
    await q(
      `INSERT INTO clarisa_institutions (code, name, acronym) VALUES (?, ?, ?)`,
      [INSTITUTION_KNOWN, INSTITUTION_KNOWN_NAME, INSTITUTION_KNOWN_ACRONYM],
    );
    await q(
      `INSERT INTO clarisa_innovation_use_levels (id, level, name) VALUES (?, NULL, ?)`,
      [USE_LEVEL_NULL, 'Name must not appear'],
    );
    await q(
      `INSERT INTO clarisa_innovation_readiness_levels (id, level, name) VALUES (?, ?, ?), (?, NULL, ?)`,
      [
        READINESS_OK,
        READINESS_OK_LEVEL,
        READINESS_OK_NAME,
        READINESS_NULL_LEVEL,
        'Readiness name must not appear',
      ],
    );
    await q(`INSERT INTO clarisa_geo_scope (code, name) VALUES (?, ?)`, [
      GEO_CODE,
      GEO_NAME,
    ]);

    const [fnRow] = await q('SHOW CREATE FUNCTION innovation_use_validation');
    const body = String(fnRow['Create Function'] ?? '');
    rule16Probe = (body.match(/indicator_id = 2/g) || []).length;
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }
    try {
      await q('SET FOREIGN_KEY_CHECKS = 1');
      for (const resultId of resultIds) {
        if (resultId === undefined || resultId === null) {
          continue;
        }
        await q(
          `DELETE FROM link_results WHERE result_id = ? OR other_result_id = ?`,
          [resultId, resultId],
        );
        await q(`DELETE FROM result_actors WHERE result_id = ?`, [resultId]);
        await q(`DELETE FROM result_institution_types WHERE result_id = ?`, [
          resultId,
        ]);
        await q(`DELETE FROM result_quantifications WHERE result_id = ?`, [
          resultId,
        ]);
        await q(`DELETE FROM result_innovation_use WHERE result_id = ?`, [
          resultId,
        ]);
        await q(`DELETE FROM result_innovation_dev WHERE result_id = ?`, [
          resultId,
        ]);
        await q(`DELETE FROM results WHERE result_id = ?`, [resultId]);
      }

      await q(`DELETE FROM clarisa_institution_types WHERE code = ?`, [
        ORG_MID_CHILD,
      ]);
      await q(
        `DELETE FROM clarisa_institution_types WHERE code IN (?, ?, ?, ?)`,
        [ORG_INACTIVE_CHILD, ORG_MID, ORG_CHILD, ORG_OTHER_CHILD],
      );
      await q(`DELETE FROM clarisa_institution_types WHERE code IN (?, ?)`, [
        ORG_INACTIVE_ROOT,
        ORG_MID_ROOT,
      ]);
      await q(`DELETE FROM clarisa_institution_types WHERE code IN (?, ?)`, [
        ORG_CHILD,
        ORG_OTHER_CHILD,
      ]);
      await q(`DELETE FROM clarisa_institution_types WHERE code IN (?, ?, ?)`, [
        ORG_ROOT_NO_CHILD,
        ORG_ROOT_WITH_CHILD,
        ORG_OTHER_ROOT,
      ]);
      await q(`DELETE FROM clarisa_institutions WHERE code = ?`, [
        INSTITUTION_KNOWN,
      ]);
      await q(`DELETE FROM clarisa_actor_types WHERE code IN (?, ?)`, [
        ACTOR_FARMERS_CODE,
        ACTOR_RESEARCHERS_CODE,
      ]);
      if (actorOtherSeeded) {
        await q(`DELETE FROM clarisa_actor_types WHERE code = ?`, [
          ACTOR_OTHER_CODE,
        ]);
      }
      await q(`DELETE FROM clarisa_innovation_use_levels WHERE id = ?`, [
        USE_LEVEL_NULL,
      ]);
      await q(
        `DELETE FROM clarisa_innovation_readiness_levels WHERE id IN (?, ?)`,
        [READINESS_OK, READINESS_NULL_LEVEL],
      );
      await q(`DELETE FROM clarisa_geo_scope WHERE code = ?`, [GEO_CODE]);
      for (const indicatorId of indicatorsSeeded) {
        await q(`DELETE FROM indicators WHERE indicator_id = ?`, [indicatorId]);
      }
      if (indicatorTypeSeeded) {
        await q(`DELETE FROM indicator_types WHERE indicator_type_id = 1`);
      }
      if (yearSeeded) {
        await q(`DELETE FROM report_years WHERE report_year = ?`, [
          REPORT_YEAR,
        ]);
      }
      if (platformSeeded) {
        await q(`DELETE FROM reporting_platforms WHERE platform_code = ?`, [
          PLATFORM,
        ]);
      }
    } finally {
      await runner.release();
      await dataSource.destroy();
    }
  });

  it('rule-16 probe on the live function is non-zero', () => {
    expect(rule16Probe).toBeGreaterThan(0);
  });

  it('fully valid result: level below 6 hides a stale explanation and a zero count is not Not provided', async () => {
    const { id, link } = await seedUseBase({
      level: { id: LEVEL_2_ID, explanation: 'STALE-JUSTIFICATION' },
    });
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_FARMERS_CODE,
      disaggregationNotApply: false,
      womenYouth: 0,
      womenNotYouth: 2,
      menYouth: 3,
      menNotYouth: 4,
    });
    await insertOrg({
      resultId: id,
      known: true,
      institutionId: INSTITUTION_KNOWN,
    });
    await insertMeasure(id, 12.5, 'kg', 'field note');
    await expectCase(
      'fully-valid',
      id,
      baseCells({
        innovation_use_actors: actorDisaggregated(
          ACTOR_FARMERS,
          null,
          ['0', '2', '3', '4'],
          '9',
        ),
        innovation_use_organizations: orgKnown(
          INSTITUTION_KNOWN_ACRONYM,
          INSTITUTION_KNOWN_NAME,
        ),
        innovation_use_quantifications: measureLine('12.5', 'kg', 'field note'),
        ...link,
      }),
      [],
    );
    const row = await loadCells(id);
    expect(row?.innovation_use_level_explanation).not.toContain(
      'STALE-JUSTIFICATION',
    );
  });

  it('rule 2: Other with a blank custom name', async () => {
    const { id, link } = await seedUseBase();
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_OTHER_CODE,
      customName: null,
      disaggregationNotApply: false,
      womenYouth: 1,
      womenNotYouth: 1,
      menYouth: 1,
      menNotYouth: 1,
    });
    const actors = actorDisaggregated(
      ACTOR_OTHER,
      NP,
      ['1', '1', '1', '1'],
      '4',
    );
    expect(actors).toContain(`Other: ${NP}`);
    await expectCase(
      'rule-2',
      id,
      baseCells({ innovation_use_actors: actors, ...link }),
      ['innovation_use_actors'],
    );
  });

  it('rule 3: one disaggregated count is null and the total is the sum of the rest', async () => {
    const { id, link } = await seedUseBase();
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_FARMERS_CODE,
      disaggregationNotApply: false,
      womenYouth: 1,
      womenNotYouth: 1,
      menYouth: null,
      menNotYouth: 1,
    });
    const actors = actorDisaggregated(
      ACTOR_FARMERS,
      null,
      ['1', '1', NP, '1'],
      '3',
    );
    expect(actors).toContain(`Men (youth): ${NP}`);
    await expectCase(
      'rule-3',
      id,
      baseCells({ innovation_use_actors: actors, ...link }),
      ['innovation_use_actors'],
    );
  });

  it('rule 4: all-zero disaggregated counts put Not provided in the Total slot', async () => {
    const { id, link } = await seedUseBase();
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_FARMERS_CODE,
      disaggregationNotApply: false,
      womenYouth: 0,
      womenNotYouth: 0,
      menYouth: 0,
      menNotYouth: 0,
    });
    const actors = actorDisaggregated(
      ACTOR_FARMERS,
      null,
      ['0', '0', '0', '0'],
      NP,
    );
    expect(actors).toContain(`Total: ${NP}`);
    await expectCase(
      'rule-4',
      id,
      baseCells({ innovation_use_actors: actors, ...link }),
      ['innovation_use_actors'],
    );
  });

  it('rule 5: aggregate actors_count of 0', async () => {
    const { id, link } = await seedUseBase();
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_FARMERS_CODE,
      disaggregationNotApply: true,
      actorsCount: 0,
    });
    const actors = actorAggregate(ACTOR_FARMERS, null, NP);
    expect(actors).toContain(`Total: ${NP}`);
    await expectCase(
      'rule-5',
      id,
      baseCells({ innovation_use_actors: actors, ...link }),
      ['innovation_use_actors'],
    );
  });

  it('rule 6: a known organization with no institution id', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({ resultId: id, known: true, institutionId: null });
    const orgs = `${BULLET} ${NP}`;
    expect(orgs).toBe(`${BULLET} ${NP}`);
    await expectCase(
      'rule-6',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      ['innovation_use_organizations'],
    );
  });

  it('rule 7: an unknown organization with no type', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({
      resultId: id,
      known: false,
      typeId: null,
      count: 5,
    });
    const orgs = orgUnknown(NP, null, '5');
    expect(orgs.startsWith(`${BULLET} ${NP}`)).toBe(true);
    await expectCase(
      'rule-7',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      ['innovation_use_organizations'],
    );
  });

  it('rule 8: a root type that has children and no sub-type', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({
      resultId: id,
      known: false,
      typeId: ORG_ROOT_WITH_CHILD,
      subTypeId: null,
      count: 4,
    });
    const orgs = orgUnknown(ORG_ROOT_WITH_CHILD_NAME, NP, '4');
    expect(orgs).toContain(`> ${NP}`);
    await expectCase(
      'rule-8',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      ['innovation_use_organizations'],
    );
  });

  it('rule 8b: a sub-type whose parent is not the chosen type', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({
      resultId: id,
      known: false,
      typeId: ORG_ROOT_WITH_CHILD,
      subTypeId: ORG_OTHER_CHILD,
      count: 4,
    });
    const orgs = orgUnknown(ORG_ROOT_WITH_CHILD_NAME, NP, '4');
    expect(orgs).toContain(`> ${NP}`);
    expect(orgs).not.toContain(ORG_OTHER_CHILD_NAME);
    await expectCase(
      'rule-8b',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      ['innovation_use_organizations'],
    );
  });

  it('rule 8: an inactive root that has children does not require a sub-type', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({
      resultId: id,
      known: false,
      typeId: ORG_INACTIVE_ROOT,
      subTypeId: null,
      count: 4,
    });
    const orgs = orgUnknown(ORG_INACTIVE_ROOT_NAME, null, '4');
    expect(orgs).not.toContain(`> ${NP}`);
    await expectCase(
      'rule-8-inactive-root',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      [],
    );
  });

  it('rule 8: a non-root type that has children does not require a sub-type', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({
      resultId: id,
      known: false,
      typeId: ORG_MID,
      subTypeId: null,
      count: 4,
    });
    const orgs = orgUnknown(ORG_MID_NAME, null, '4');
    expect(orgs).not.toContain(`> ${NP}`);
    await expectCase(
      'rule-8-non-root',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      [],
    );
  });

  it('rule 9: organization_count is null', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({
      resultId: id,
      known: false,
      typeId: ORG_ROOT_NO_CHILD,
      count: null,
    });
    const orgs = orgUnknown(ORG_ROOT_NO_CHILD_NAME, null, NP);
    expect(orgs).toContain(`Number of organizations: ${NP}`);
    await expectCase(
      'rule-9',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      ['innovation_use_organizations'],
    );
  });

  it('rule 10: a quantification number of 0', async () => {
    const { id, link } = await seedUseBase();
    await insertMeasure(id, 0, 'kg', null);
    const quants = measureLine(NP, 'kg', NM);
    expect(quants).toContain(`Number: ${NP}`);
    await expectCase(
      'rule-10-zero',
      id,
      baseCells({ innovation_use_quantifications: quants, ...link }),
      ['innovation_use_quantifications'],
    );
  });

  it('rule 10: a negative number stays in the cell and the function is true', async () => {
    const { id, link } = await seedUseBase();
    await insertMeasure(id, -3, 'kg', null);
    const quants = measureLine('-3', 'kg', NM);
    expect(quants).toContain('Number: -3');
    expect(quants).not.toContain(NP);
    await expectCase(
      'rule-10-negative',
      id,
      baseCells({ innovation_use_quantifications: quants, ...link }),
      [],
    );
  });

  it('rule 11: a blank unit', async () => {
    const { id, link } = await seedUseBase();
    await insertMeasure(id, 12.5, null, null);
    const quants = measureLine('12.5', NP, NM);
    expect(quants).toContain(`Unit: ${NP}`);
    await expectCase(
      'rule-11',
      id,
      baseCells({ innovation_use_quantifications: quants, ...link }),
      ['innovation_use_quantifications'],
    );
  });

  it('rule 14: no active detail row', async () => {
    const { id, link } = await seedUseBase({ level: 'none' });
    await expectCase(
      'rule-14',
      id,
      baseCells({
        innovation_use_level: NP,
        innovation_use_level_explanation: NA,
        ...link,
      }),
      ['innovation_use_level'],
    );
  });

  it('rule 15: level 7 with a blank explanation', async () => {
    const { id, link } = await seedUseBase({
      level: { id: LEVEL_7_ID, explanation: null },
    });
    await expectCase(
      'rule-15',
      id,
      baseCells({
        innovation_use_level: levelText(LEVEL_7, LEVEL_7_NAME),
        innovation_use_level_explanation: NP,
        ...link,
      }),
      ['innovation_use_level_explanation'],
    );
  });

  it('level 5 (catalog id 6) with a blank explanation does not require one', async () => {
    const { id, link } = await seedUseBase({
      level: { id: LEVEL_5_ID, explanation: null },
    });
    await expectCase(
      'level-5',
      id,
      baseCells({
        innovation_use_level: levelText(LEVEL_5, LEVEL_5_NAME),
        innovation_use_level_explanation: NA,
        ...link,
      }),
      [],
    );
  });

  it('rule 15: level 6 (catalog id 7) with a blank explanation', async () => {
    const { id, link } = await seedUseBase({
      level: { id: LEVEL_6_ID, explanation: null },
    });
    await expectCase(
      'rule-15-level-6',
      id,
      baseCells({
        innovation_use_level: levelText(LEVEL_6, LEVEL_6_NAME),
        innovation_use_level_explanation: NP,
        ...link,
      }),
      ['innovation_use_level_explanation'],
    );
  });

  it('rule 16: the only role-5 link points at a soft-deleted development result', async () => {
    const { id } = await seedUseBase({ withLink: false });
    const deleted = await seedQualifyingDev({
      active: false,
      title: 'Deleted development',
    });
    await linkDev(id, deleted.id);
    await expectCase(
      'rule-16',
      id,
      baseCells({
        innovation_use_linked_dev: NP,
        innovation_use_linked_dev_readiness: NA,
        innovation_use_linked_dev_description: NA,
        innovation_use_linked_dev_geo_scope: NA,
      }),
      ['innovation_use_linked_dev'],
    );
  });

  it('rule 16: an inactive role-5 link does not qualify', async () => {
    const { id } = await seedUseBase({ withLink: false });
    const dev = await seedQualifyingDev({ title: 'Inactive link target' });
    await linkDev(id, dev.id, { active: false });
    await expectCase(
      'rule-16-inactive-link',
      id,
      baseCells({
        innovation_use_linked_dev: NP,
        innovation_use_linked_dev_readiness: NA,
        innovation_use_linked_dev_description: NA,
        innovation_use_linked_dev_geo_scope: NA,
      }),
      ['innovation_use_linked_dev'],
    );
  });

  it('rule 16: an active role-5 link to an indicator-1 target does not qualify', async () => {
    const { id } = await seedUseBase({ withLink: false });
    const target = await insertResult({
      indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    });
    await linkDev(id, target.id);
    await expectCase(
      'rule-16-indicator-1-target',
      id,
      baseCells({
        innovation_use_linked_dev: NP,
        innovation_use_linked_dev_readiness: NA,
        innovation_use_linked_dev_description: NA,
        innovation_use_linked_dev_geo_scope: NA,
      }),
      ['innovation_use_linked_dev'],
    );
  });

  it('capacity sharing (indicator 1) renders all nine cells Not applicable', async () => {
    const subject = await insertResult({
      indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    });
    const expected = baseCells({
      innovation_use_level: NA,
      innovation_use_level_explanation: NA,
      innovation_use_actors: NA,
      innovation_use_organizations: NA,
      innovation_use_quantifications: NA,
      innovation_use_linked_dev: NA,
      innovation_use_linked_dev_readiness: NA,
      innovation_use_linked_dev_description: NA,
      innovation_use_linked_dev_geo_scope: NA,
    });
    await expectCase(
      'capacity-sharing',
      subject.id,
      expected,
      [],
      IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    );
  });

  it('NULL actor flag is the disaggregated branch', async () => {
    const { id, link } = await seedUseBase();
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_FARMERS_CODE,
      disaggregationNotApply: null,
      womenYouth: 1,
      womenNotYouth: 2,
      menYouth: 3,
      menNotYouth: 4,
    });
    const actors = actorDisaggregated(
      ACTOR_FARMERS,
      null,
      ['1', '2', '3', '4'],
      '10',
    );
    expect(actors).not.toContain('sex and age disaggregation not applicable');
    await expectCase(
      'null-actor-flag',
      id,
      baseCells({ innovation_use_actors: actors, ...link }),
      [],
    );
  });

  it('NULL is_organization_known is the not-known branch', async () => {
    const { id, link } = await seedUseBase();
    await insertOrg({
      resultId: id,
      known: null,
      typeId: ORG_ROOT_NO_CHILD,
      count: 3,
    });
    const orgs = orgUnknown(ORG_ROOT_NO_CHILD_NAME, null, '3');
    await expectCase(
      'null-org-flag',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      [],
    );
  });

  it('JD-1: a known organization whose institution row is missing renders Unknown (id n)', async () => {
    const { id, link } = await seedUseBase();
    await q('SET FOREIGN_KEY_CHECKS = 0');
    try {
      await insertOrg({
        resultId: id,
        known: true,
        institutionId: INSTITUTION_MISSING,
      });
    } finally {
      await q('SET FOREIGN_KEY_CHECKS = 1');
    }
    const orgs = orgKnown(null, unknownId(INSTITUTION_MISSING));
    expect(orgs).toBe(`${BULLET} ${unknownId(INSTITUTION_MISSING)}`);
    expect(orgs).not.toContain(NP);
    await expectCase(
      'catalog-missing-institution',
      id,
      baseCells({ innovation_use_organizations: orgs, ...link }),
      [],
    );
  });

  it('a missing innovation-use level catalog row renders Unknown (id n) and the function stays true', async () => {
    const { id, link } = await seedUseBase({ level: 'none' });
    await q('SET FOREIGN_KEY_CHECKS = 0');
    try {
      await insertDetail(id, USE_LEVEL_MISSING, null);
    } finally {
      await q('SET FOREIGN_KEY_CHECKS = 1');
    }
    await expectCase(
      'catalog-missing-level',
      id,
      baseCells({
        innovation_use_level: unknownId(USE_LEVEL_MISSING),
        innovation_use_level_explanation: NA,
        ...link,
      }),
      [],
    );
  });

  it('a present use-level row whose level is NULL renders Unknown (id n), not Not provided', async () => {
    const { id, link } = await seedUseBase({
      level: { id: USE_LEVEL_NULL, explanation: null },
    });
    await expectCase(
      'level-column-null',
      id,
      baseCells({
        innovation_use_level: unknownId(USE_LEVEL_NULL),
        innovation_use_level_explanation: NA,
        ...link,
      }),
      [],
    );
  });

  it('a present readiness row whose level is NULL renders Unknown (id n)', async () => {
    const dev = await seedQualifyingDev({ readinessId: READINESS_NULL_LEVEL });
    const { id } = await seedUseBase({ withLink: false, link: dev });
    await linkDev(id, dev.id);
    await expectCase(
      'readiness-level-null',
      id,
      baseCells({
        ...dev,
        innovation_use_linked_dev_readiness: unknownId(READINESS_NULL_LEVEL),
      }),
      [],
    );
  });

  it('a null development title omits the title segment', async () => {
    const dev = await seedQualifyingDev({ title: null });
    const { id } = await seedUseBase({ withLink: false, link: dev });
    await linkDev(id, dev.id);
    expect(dev.innovation_use_linked_dev).not.toContain(' - ');
    await expectCase('dev-title-null', id, baseCells({ ...dev }), []);
  });

  it('a null development platform leaves the bare official code', async () => {
    const dev = await seedQualifyingDev({ platform: null });
    const { id } = await seedUseBase({ withLink: false, link: dev });
    await linkDev(id, dev.id);
    expect(dev.innovation_use_linked_dev.startsWith(`${PLATFORM}-`)).toBe(
      false,
    );
    await expectCase('dev-platform-null', id, baseCells({ ...dev }), []);
  });

  it('an inactive detail row behaves as no detail row', async () => {
    const { id, link } = await seedUseBase({
      level: {
        id: LEVEL_2_ID,
        explanation: 'stored but inactive',
        active: false,
      },
    });
    await expectCase(
      'inactive-riu',
      id,
      baseCells({
        innovation_use_level: NP,
        innovation_use_level_explanation: NA,
        ...link,
      }),
      ['innovation_use_level'],
    );
  });

  it('two qualifying links, three actors, two organizations and two measures stay one row', async () => {
    const lowerIdDev = await seedQualifyingDev({
      title: 'Lower id development',
      description: 'Lower id description',
    });
    const higherIdDev = await seedQualifyingDev({
      title: 'Higher id development',
      description: 'Higher id description',
    });
    expect(higherIdDev.id).toBeGreaterThan(lowerIdDev.id);
    const { id } = await seedUseBase({ withLink: false, link: lowerIdDev });
    await linkDev(id, higherIdDev.id);
    await linkDev(id, lowerIdDev.id);
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_FARMERS_CODE,
      disaggregationNotApply: false,
      womenYouth: 1,
      womenNotYouth: 0,
      menYouth: 0,
      menNotYouth: 1,
    });
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_OTHER_CODE,
      customName: 'Extension group',
      disaggregationNotApply: true,
      actorsCount: 4,
    });
    await insertActor({
      resultId: id,
      actorTypeId: ACTOR_RESEARCHERS_CODE,
      disaggregationNotApply: null,
      womenYouth: 2,
      womenNotYouth: 2,
      menYouth: 2,
      menNotYouth: 2,
    });
    await insertOrg({
      resultId: id,
      known: true,
      institutionId: INSTITUTION_KNOWN,
    });
    await insertOrg({
      resultId: id,
      known: false,
      typeId: ORG_ROOT_WITH_CHILD,
      subTypeId: ORG_CHILD,
      count: 3,
    });
    await insertMeasure(id, 12.5, 'kg', 'field note');
    await insertMeasure(id, -3, 'ha', null);
    const actors = joinLines([
      actorDisaggregated(ACTOR_FARMERS, null, ['1', '0', '0', '1'], '2'),
      actorAggregate(ACTOR_OTHER, 'Extension group', '4'),
      actorDisaggregated(ACTOR_RESEARCHERS, null, ['2', '2', '2', '2'], '8'),
    ]);
    const orgs = joinLines([
      orgKnown(INSTITUTION_KNOWN_ACRONYM, INSTITUTION_KNOWN_NAME),
      orgUnknown(ORG_ROOT_WITH_CHILD_NAME, ORG_CHILD_NAME, '3'),
    ]);
    const quants = joinLines([
      measureLine('12.5', 'kg', 'field note'),
      measureLine('-3', 'ha', NM),
    ]);
    await expectCase(
      'two-links',
      id,
      baseCells({
        innovation_use_actors: actors,
        innovation_use_organizations: orgs,
        innovation_use_quantifications: quants,
        ...lowerIdDev,
      }),
      [],
    );
    const [countRow] = await q(
      `SELECT COUNT(*) AS n FROM report_innovation_use WHERE result_id = ?`,
      [id],
    );
    expect(Number(countRow.n)).toBe(1);
    expect(lowerIdDev.innovation_use_linked_dev).toContain(
      'Lower id development',
    );
    expect(lowerIdDev.innovation_use_linked_dev).not.toContain(
      'Higher id development',
    );
  });

  it('snapshot and soft-deleted results are absent, and no result id is repeated', async () => {
    const snapshot = await seedUseBase({ snapshot: true });
    const deleted = await seedUseBase({ active: false });
    const present = await q(
      `SELECT result_id FROM report_innovation_use WHERE result_id IN (?, ?)`,
      [snapshot.id, deleted.id],
    );
    expect(present).toEqual([]);
    const duplicates = await q(
      `SELECT result_id, COUNT(*) AS n
       FROM report_innovation_use
       GROUP BY result_id
       HAVING COUNT(*) > 1`,
    );
    expect(duplicates).toEqual([]);
  });

  it('EXPLAIN gate on the real Phase 2 SQL plus a 3+3 timing reading', async () => {
    expect(rule16Probe).toBeGreaterThan(0);
    const bulkIds: number[] = [];
    const innovationUseIds: number[] = [];
    const innovationDevIds: number[] = [];
    const otherIndicatorIds: number[] = [];
    const mix = [
      IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      IndicatorsEnum.INNOVATION_DEV,
      IndicatorsEnum.INNOVATION_USE,
    ];
    for (let i = 0; i < 210; i += 1) {
      const indicatorId = mix[i % 3];
      const row = await insertResult({ indicatorId });
      bulkIds.push(row.id);
      if (indicatorId === IndicatorsEnum.INNOVATION_USE) {
        innovationUseIds.push(row.id);
      } else if (indicatorId === IndicatorsEnum.INNOVATION_DEV) {
        innovationDevIds.push(row.id);
      } else {
        otherIndicatorIds.push(row.id);
      }
    }
    expect(bulkIds.length).toBeGreaterThanOrEqual(200);
    for (let i = 0; i < innovationUseIds.length; i += 1) {
      const resultId = innovationUseIds[i];
      const devId = innovationDevIds[i % innovationDevIds.length];
      const otherId = otherIndicatorIds[i % otherIndicatorIds.length];
      await insertActor({
        resultId,
        actorTypeId: ACTOR_FARMERS_CODE,
        disaggregationNotApply: true,
        actorsCount: 2,
      });
      await insertActor({
        resultId,
        actorTypeId: ACTOR_FARMERS_CODE,
        disaggregationNotApply: true,
        actorsCount: 1,
        roleId: ActorRolesEnum.INNOVATION_DEV,
      });
      await insertOrg({
        resultId,
        known: false,
        typeId: ORG_ROOT_NO_CHILD,
        count: 1,
      });
      await insertOrg({
        resultId,
        known: false,
        typeId: ORG_ROOT_NO_CHILD,
        count: 1,
        roleId: InstitutionTypeRoleEnum.INNOVATION_DEV,
      });
      await insertMeasure(resultId, 1, 'kg', null);
      await insertMeasure(
        resultId,
        1,
        'kg',
        null,
        QuantificationRolesEnum.ACTUAL_COUNT,
      );
      await linkDev(resultId, devId);
      await linkDev(resultId, otherId, {
        roleId: LinkResultRolesEnum.LINK_RESULT_SECTION,
      });
    }

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
    expect(capturedSql).not.toContain('report_innovation_use');

    const selectMarker = 'lkr.link_results AS link_results';
    const whereMarker = 'WHERE gi.result_id IN';
    const selectAt = capturedSql.indexOf(selectMarker);
    const whereAt = capturedSql.indexOf(whereMarker);
    expect(selectAt).toBeGreaterThan(-1);
    expect(whereAt).toBeGreaterThan(-1);
    const withSelect =
      capturedSql.slice(0, selectAt + selectMarker.length) +
      ',\n' +
      IU_SELECT_LIST +
      capturedSql.slice(selectAt + selectMarker.length);
    const whereAt2 = withSelect.indexOf(whereMarker);
    const withView =
      withSelect.slice(0, whereAt2) +
      IU_JOIN +
      '\n' +
      withSelect.slice(whereAt2);
    expect(withView).toContain(
      'LEFT JOIN report_innovation_use iu ON iu.result_id = gi.result_id',
    );
    for (const key of CELL_KEYS) {
      expect(withView).toContain(`iu.${key} AS ${key}`);
    }

    const basePlan = planText(
      await q(`EXPLAIN FORMAT=TREE ${capturedSql}`, params),
    );
    const withPlan = planText(
      await q(`EXPLAIN FORMAT=TREE ${withView}`, params),
    );
    writeFileSync('/tmp/t02-explain-base.txt', basePlan);
    writeFileSync('/tmp/t02-explain-with.txt', withPlan);

    const phase2Rows = await q(capturedSql, params);
    const basePrimary = countPrimaryLookups(basePlan);
    const withPrimary = countPrimaryLookups(withPlan);
    const baseScans = countResultsScans(basePlan);
    const withScans = countResultsScans(withPlan);
    writeFileSync(
      '/tmp/t02-plan-counts.json',
      JSON.stringify(
        {
          phase2Rows: phase2Rows.length,
          basePrimary,
          withPrimary,
          baseScans,
          withScans,
        },
        null,
        2,
      ),
    );
    expect(phase2Rows.length).toBe(bulkIds.length);
    expect(withPrimary).toBe(basePrimary + 1);
    expect(
      (basePlan.match(/Materialize \(invalidate on row from root\)/g) || [])
        .length,
    ).toBe(0);
    expect(
      (withPlan.match(/Materialize \(invalidate on row from root\)/g) || [])
        .length,
    ).toBe(4);
    const lateralExcerpts: string[] = [];
    for (const alias of LATERAL_ALIASES) {
      const found = lateralCorrelation(withPlan, alias);
      lateralExcerpts.push(
        found ?? `MISSING ${alias}.result_id = root.result_id`,
      );
      expect({
        alias,
        correlatedOnResultId: found !== null,
      }).toEqual({
        alias,
        correlatedOnResultId: true,
      });
    }
    writeFileSync(
      '/tmp/t02-explain-laterals.txt',
      lateralExcerpts.join('\n---\n'),
    );
    expect(baseScans).toBeGreaterThanOrEqual(BASELINE_RESULTS_SCAN_COUNT - 1);
    expect(baseScans).toBeLessThanOrEqual(BASELINE_RESULTS_SCAN_COUNT);
    expect(withScans).toBe(baseScans);

    const time = async (sql: string): Promise<number[]> => {
      const samples: number[] = [];
      for (let run = 0; run < 3; run += 1) {
        const started = Date.now();
        await q(sql, params);
        samples.push(Date.now() - started);
      }
      return samples;
    };
    const beforeRaw = await time(capturedSql);
    const afterRaw = await time(withView);
    const before = summarize(beforeRaw);
    const after = summarize(afterRaw);
    const timing = {
      beforeRaw,
      afterRaw,
      before,
      after,
      rows: phase2Rows.length,
    };
    writeFileSync('/tmp/t02-timing.json', JSON.stringify(timing, null, 2));
    expect(beforeRaw).toHaveLength(3);
    expect(afterRaw).toHaveLength(3);

    const cardinalities = await q(
      `SELECT 'result_actors' AS tbl, actor_role_id AS role_id, COUNT(*) AS n
         FROM result_actors GROUP BY actor_role_id
       UNION ALL
       SELECT 'result_institution_types', institution_type_role_id, COUNT(*)
         FROM result_institution_types GROUP BY institution_type_role_id
       UNION ALL
       SELECT 'result_quantifications', quantification_role_id, COUNT(*)
         FROM result_quantifications GROUP BY quantification_role_id
       UNION ALL
       SELECT 'link_results', link_result_role_id, COUNT(*)
         FROM link_results GROUP BY link_result_role_id
       UNION ALL
       SELECT 'results', indicator_id, COUNT(*)
         FROM results GROUP BY indicator_id`,
    );
    writeFileSync(
      '/tmp/t02-cardinalities.json',
      JSON.stringify(cardinalities, null, 2),
    );
  });
});

function planText(rows: { EXPLAIN?: string }[]): string {
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

function countPrimaryLookups(plan: string): number {
  return (
    plan.match(
      /Single-row index lookup on root using PRIMARY \(result_id=root\.result_id\)/g,
    ) || []
  ).length;
}

function countResultsScans(plan: string): number {
  return plan.split('\n').filter((line) => RESULTS_SCAN_LINE.test(line)).length;
}

function summarize(samples: number[]): { median: number; spread: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { median, spread: sorted[sorted.length - 1] - sorted[0] };
}

import { QueryRunner } from 'typeorm';
import { LoggerUtil } from '../../domain/shared/utils/logger.util';
import {
  SEED_ELEMENTS,
  SEED_IOB_YEAR,
  SEED_LEVELS,
  SEED_LINKS,
  SEED_OBJECTIVES,
  SEED_PORTFOLIO_ID,
  SEED_RESPONSIBLES,
  StrategyFrameworkSeedElement,
  StrategyFrameworkSeedResponsible,
} from './seed-data/strategy-framework.data';

/**
 * Strategy framework seed (R-STF-011, design section 3.4, D-STF-7, D-STF-8,
 * D-STF-24).
 *
 * Lives outside `src/db/migrations` because the TypeORM loader treats every
 * exported function there as a migration. `1795000000003-seedStrategyFramework`
 * calls these functions on a query runner that already owns a transaction.
 *
 * Every insert is `INSERT ... SELECT ... WHERE NOT EXISTS` with bound
 * parameters. Levels, elements, objectives and links are guarded on their
 * fixed id. Responsibles are guarded on `(element_id, staff_carnet)`.
 * Elements are inserted parents first. A second call inserts 0 rows while
 * the staff table is unchanged.
 *
 * A candidate matches one active staff row by trimmed email
 * (case-insensitive), otherwise by the exact trimmed full name. Any other
 * result is skipped and logged. The staff carnet is never taken from the
 * data file.
 *
 * @akili-spec institutional-performance/strategy-framework
 */

export type ResponsibleMatchReason =
  | 'matched'
  | 'ambiguous'
  | 'no email hit'
  | 'no exact name hit'
  | 'no email hit; no exact name hit';

export interface StaffCandidate {
  carnet: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: number | boolean | null;
}

export interface ResponsibleMatch {
  elementCode: string;
  name: string;
  email: string | null;
  position: number;
  reason: ResponsibleMatchReason;
  carnet: string | null;
  detail: string | null;
}

const affectedRows = (result: unknown): number =>
  Number((result as { affectedRows?: number } | undefined)?.affectedRows ?? 0);

const boundList = (values: readonly number[]): string =>
  values.map(() => '?').join(', ');

const isActiveStaff = (staff: StaffCandidate): boolean =>
  Number(staff.is_active) === 1;

const staffFullName = (staff: StaffCandidate): string =>
  `${(staff.first_name ?? '').trim()} ${(staff.last_name ?? '').trim()}`;

const wantedName = (name: string): string => name.replace(/\s+/g, ' ').trim();

const wantedEmail = (email: string | null): string =>
  email?.trim().toLowerCase() ?? '';

/**
 * Email first. An ambiguous email is not resolved by the name. Zero email
 * hits fall through to the exact full name. Inactive rows are not a match.
 */
export const matchResponsibleCandidate = (
  staff: readonly StaffCandidate[],
  candidate: StrategyFrameworkSeedResponsible,
): Pick<ResponsibleMatch, 'reason' | 'carnet' | 'detail'> => {
  const email = wantedEmail(candidate.email);
  const name = wantedName(candidate.name);
  const steps: Array<{
    label: 'email' | 'name';
    test: (row: StaffCandidate) => boolean;
  }> = [
    ...(email
      ? [
          {
            label: 'email' as const,
            test: (row: StaffCandidate) => wantedEmail(row.email) === email,
          },
        ]
      : []),
    {
      label: 'name' as const,
      test: (row: StaffCandidate) => staffFullName(row) === name,
    },
  ];

  let sawInactive = false;
  for (const step of steps) {
    const hits = staff.filter(step.test);
    const active = hits.filter(isActiveStaff);
    if (active.length === 1) {
      return {
        reason: 'matched',
        carnet: String(active[0].carnet),
        detail: null,
      };
    }
    if (active.length > 1) {
      return { reason: 'ambiguous', carnet: null, detail: step.label };
    }
    if (hits.length > 0) {
      sawInactive = true;
    }
    if (step.label === 'email') {
      continue;
    }
  }

  const detail = sawInactive ? 'inactive staff only' : null;
  if (email) {
    return {
      reason: 'no email hit; no exact name hit',
      carnet: null,
      detail,
    };
  }
  return { reason: 'no exact name hit', carnet: null, detail };
};

export const resolveResponsibleMatches = async (
  runner: QueryRunner,
  candidates: readonly StrategyFrameworkSeedResponsible[] = SEED_RESPONSIBLES,
): Promise<ResponsibleMatch[]> => {
  const staff: StaffCandidate[] = await runner.query(
    `SELECT \`carnet\` AS carnet, \`first_name\` AS first_name, \`last_name\` AS last_name, \`email\` AS email, \`is_active\` AS is_active
       FROM \`alliance_user_staff\`
      WHERE \`deleted_at\` IS NULL`,
  );
  return candidates.map((candidate) => {
    const match = matchResponsibleCandidate(staff, candidate);
    return {
      elementCode: candidate.elementCode,
      name: candidate.name,
      email: candidate.email,
      position: candidate.position,
      ...match,
    };
  });
};

const insertOne = async (
  runner: QueryRunner,
  sql: string,
  params: readonly unknown[],
): Promise<number> => affectedRows(await runner.query(sql, [...params]));

const insertLevels = async (runner: QueryRunner): Promise<number> => {
  let inserted = 0;
  for (const level of [...SEED_LEVELS].sort((a, b) => a.depth - b.depth)) {
    inserted += await insertOne(
      runner,
      `INSERT INTO \`framework_levels\`
         (\`id\`, \`portfolio_id\`, \`depth\`, \`name\`, \`plural_name\`, \`short_label\`, \`is_indicator_level\`)
       SELECT ?, ?, ?, ?, ?, ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM \`framework_levels\` AS existing WHERE existing.\`id\` = ?
       )`,
      [
        level.id,
        SEED_PORTFOLIO_ID,
        level.depth,
        level.name,
        level.pluralName,
        level.shortLabel,
        level.isIndicatorLevel,
        level.id,
      ],
    );
  }
  return inserted;
};

const levelId = (depth: number): number => {
  const level = SEED_LEVELS.find((item) => item.depth === depth);
  if (!level) {
    throw new Error(`strategy framework seed has no level at depth ${depth}`);
  }
  return level.id;
};

const insertElements = async (runner: QueryRunner): Promise<number> => {
  const idByCode = new Map(
    SEED_ELEMENTS.map((element) => [element.code, element.id]),
  );
  const ordered = [...SEED_ELEMENTS].sort(
    (a, b) => a.depth - b.depth || a.id - b.id,
  );
  let inserted = 0;
  for (const element of ordered) {
    inserted += await insertOne(
      runner,
      `INSERT INTO \`framework_elements\`
         (\`id\`, \`portfolio_id\`, \`level_id\`, \`parent_id\`, \`code\`, \`name\`, \`description\`)
       SELECT ?, ?, ?, ?, ?, ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM \`framework_elements\` AS existing WHERE existing.\`id\` = ?
       )`,
      [
        element.id,
        SEED_PORTFOLIO_ID,
        levelId(element.depth),
        parentId(element, idByCode),
        element.code,
        element.name,
        element.description,
        element.id,
      ],
    );
  }
  return inserted;
};

const parentId = (
  element: StrategyFrameworkSeedElement,
  idByCode: ReadonlyMap<string, number>,
): number | null => {
  if (element.parentCode === null) {
    return null;
  }
  const id = idByCode.get(element.parentCode);
  if (id === undefined) {
    throw new Error(
      `strategy framework seed parent ${element.parentCode} is missing for ${element.code}`,
    );
  }
  return id;
};

const insertObjectives = async (runner: QueryRunner): Promise<number> => {
  let inserted = 0;
  for (const objective of [...SEED_OBJECTIVES].sort((a, b) => a.id - b.id)) {
    inserted += await insertOne(
      runner,
      `INSERT INTO \`institutional_objectives\`
         (\`id\`, \`portfolio_id\`, \`year\`, \`code\`, \`statement\`)
       SELECT ?, ?, ?, ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM \`institutional_objectives\` AS existing WHERE existing.\`id\` = ?
       )`,
      [
        objective.id,
        SEED_PORTFOLIO_ID,
        SEED_IOB_YEAR,
        objective.code,
        objective.statement,
        objective.id,
      ],
    );
  }
  return inserted;
};

const insertLinks = async (runner: QueryRunner): Promise<number> => {
  const objectiveId = new Map(
    SEED_OBJECTIVES.map((objective) => [objective.code, objective.id]),
  );
  const elementId = new Map(
    SEED_ELEMENTS.map((element) => [element.code, element.id]),
  );
  let inserted = 0;
  for (const link of [...SEED_LINKS].sort((a, b) => a.id - b.id)) {
    const objective = objectiveId.get(link.objectiveCode);
    const element = elementId.get(link.elementCode);
    if (objective === undefined || element === undefined) {
      throw new Error(
        `strategy framework seed link ${link.id} points at ${link.objectiveCode} / ${link.elementCode}`,
      );
    }
    inserted += await insertOne(
      runner,
      `INSERT INTO \`institutional_objective_elements\`
         (\`id\`, \`institutional_objective_id\`, \`element_id\`)
       SELECT ?, ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM \`institutional_objective_elements\` AS existing WHERE existing.\`id\` = ?
       )`,
      [link.id, objective, element, link.id],
    );
  }
  return inserted;
};

const insertResponsibles = async (
  runner: QueryRunner,
  matches: readonly ResponsibleMatch[],
): Promise<number> => {
  const elementId = new Map(
    SEED_ELEMENTS.map((element) => [element.code, element.id]),
  );
  let inserted = 0;
  for (const match of matches) {
    if (match.reason !== 'matched' || match.carnet === null) {
      continue;
    }
    const element = elementId.get(match.elementCode);
    if (element === undefined) {
      throw new Error(
        `strategy framework seed responsible points at ${match.elementCode}`,
      );
    }
    inserted += await insertOne(
      runner,
      `INSERT INTO \`framework_element_responsibles\`
         (\`element_id\`, \`staff_carnet\`, \`position\`)
       SELECT ?, ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM \`framework_element_responsibles\` AS existing
         WHERE existing.\`element_id\` = ? AND existing.\`staff_carnet\` = ?
       )`,
      [element, match.carnet, match.position, element, match.carnet],
    );
  }
  return inserted;
};

export const seedStrategyFramework = async (
  runner: QueryRunner,
): Promise<number> => {
  const logger = new LoggerUtil({ name: 'seedStrategyFramework' });
  const matches = await resolveResponsibleMatches(runner);
  let inserted = 0;
  inserted += await insertLevels(runner);
  inserted += await insertElements(runner);
  inserted += await insertObjectives(runner);
  inserted += await insertLinks(runner);
  inserted += await insertResponsibles(runner, matches);

  const unmatched = matches.filter((match) => match.reason !== 'matched');
  for (const match of unmatched) {
    const detail = match.detail ? `; ${match.detail}` : '';
    logger._warn(
      `unmatched responsible on ${match.elementCode} "${match.name}" <${match.email ?? 'no email'}> (${match.reason}${detail})`,
    );
  }
  logger._log(
    `strategy framework responsibles: ${matches.length - unmatched.length} matched, ${unmatched.length} unmatched`,
  );
  return inserted;
};

const countOf = async (
  runner: QueryRunner,
  sql: string,
  params: readonly number[],
): Promise<number> => {
  const rows: Array<{ cnt: number | string }> = await runner.query(sql, [
    ...params,
  ]);
  return Number(rows[0]?.cnt ?? 0);
};

const deleteByIds = async (
  runner: QueryRunner,
  table: string,
  column: string,
  ids: readonly number[],
): Promise<void> => {
  await runner.query(
    `DELETE FROM \`${table}\` WHERE \`${column}\` IN (${boundList(ids)})`,
    [...ids],
  );
};

/**
 * Refuses when a non-seed row hangs off the seeded ids. Otherwise deletes
 * one statement per element depth, deepest first, after the rows that
 * reference those elements.
 */
export const removeStrategyFrameworkSeed = async (
  runner: QueryRunner,
): Promise<void> => {
  const elementIds = SEED_ELEMENTS.map((element) => element.id);
  const objectiveIds = SEED_OBJECTIVES.map((objective) => objective.id);
  const childElements = await countOf(
    runner,
    `SELECT COUNT(*) AS cnt
       FROM \`framework_elements\`
      WHERE \`parent_id\` IN (${boundList(elementIds)})
        AND \`id\` NOT IN (${boundList(elementIds)})`,
    [...elementIds, ...elementIds],
  );
  const foreignLinks = await countOf(
    runner,
    `SELECT COUNT(*) AS cnt
       FROM \`institutional_objective_elements\`
      WHERE \`element_id\` IN (${boundList(elementIds)})
        AND \`institutional_objective_id\` NOT IN (${boundList(objectiveIds)})`,
    [...elementIds, ...objectiveIds],
  );
  if (childElements !== 0 || foreignLinks !== 0) {
    throw new Error(
      `strategy framework seed down refused: ${childElements} non-seed elements under a seeded parent; ${foreignLinks} links to a seeded element from a non-seeded objective`,
    );
  }

  await deleteByIds(
    runner,
    'framework_element_responsibles',
    'element_id',
    elementIds,
  );
  await deleteByIds(
    runner,
    'institutional_objective_elements',
    'id',
    SEED_LINKS.map((link) => link.id),
  );
  for (const depth of [3, 2, 1]) {
    await deleteByIds(
      runner,
      'framework_elements',
      'id',
      SEED_ELEMENTS.filter((element) => element.depth === depth).map(
        (element) => element.id,
      ),
    );
  }
  await deleteByIds(runner, 'institutional_objectives', 'id', objectiveIds);
  await deleteByIds(
    runner,
    'framework_levels',
    'id',
    SEED_LEVELS.map((level) => level.id),
  );
};

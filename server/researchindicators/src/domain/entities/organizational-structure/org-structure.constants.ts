import { OrgLevelCode } from './organizational-structure.types';

/**
 * Fixed facts of the module (design.md section 2.1).
 * The level rules key on the four SEEDED control-list value ids (D-ORG-4):
 * the id is the only immutable reference to a value.
 */
export const ORG_LEVEL_LIST_KEY = 'org.level';

export const ORG_LEVEL_IDS = {
  L1: 20,
  L2: 21,
  L3: 22,
  L4: 23,
} as const;

/** Level value id to level label. */
export const ORG_LEVEL_BY_ID: Readonly<Record<number, OrgLevelCode>> = {
  20: 'L1',
  21: 'L2',
  22: 'L3',
  23: 'L4',
};

/** Allowed parent levels per level (R-ORG-003): L1 none, L2 under L1, L3 under L2, L4 under L2 or L3. */
export const ORG_ALLOWED_PARENT_LEVELS: Readonly<Record<number, number[]>> = {
  [ORG_LEVEL_IDS.L1]: [],
  [ORG_LEVEL_IDS.L2]: [ORG_LEVEL_IDS.L1],
  [ORG_LEVEL_IDS.L3]: [ORG_LEVEL_IDS.L2],
  [ORG_LEVEL_IDS.L4]: [ORG_LEVEL_IDS.L2, ORG_LEVEL_IDS.L3],
};

export const ORG_CODE_PREFIX = 'ORG-';

/** Accepted years: 2000 to current + 10 (design 5.1). */
export const ORG_MIN_YEAR = 2000;
export const ORG_MAX_YEARS_AHEAD = 10;

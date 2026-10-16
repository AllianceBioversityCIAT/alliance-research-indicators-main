import {
  ORG_ALLOWED_PARENT_LEVELS,
  ORG_LEVEL_BY_ID,
} from './org-structure.constants';
import { findCovering } from './org-version-timeline.util';

/**
 * Pure hierarchy validation for the save engine (design 5.3, R-ORG-003, I-3,
 * I-4). No I/O: the service loads every version once and passes them in.
 */
export interface GraphVersion {
  unitId: number;
  from: number;
  to: number | null;
  parentId: number | null;
  levelId: number;
}

export interface HierarchyViolation {
  field: 'parent' | 'level';
  description: string;
}

const INF = Number.POSITIVE_INFINITY;
const label = (levelId: number): string =>
  ORG_LEVEL_BY_ID[levelId] ?? `level ${levelId}`;

const formatRange = (from: number, to: number): string => {
  if (to === INF) return `${from} onward`;
  return to - 1 === from ? `${from}` : `${from}-${to - 1}`;
};

/** Sub-ranges of `[from, to)` that no version in `covering` covers. */
const uncovered = (
  from: number,
  to: number,
  covering: Array<{ from: number; to: number | null }>,
): Array<[number, number]> => {
  const gaps: Array<[number, number]> = [];
  let cursor = from;
  for (const p of covering) {
    if (p.from > cursor) gaps.push([cursor, Math.min(p.from, to)]);
    cursor = Math.max(cursor, p.to ?? INF);
    if (cursor >= to) return gaps;
  }
  if (cursor < to) gaps.push([cursor, to]);
  return gaps;
};

/**
 * Checks every version of the saved entry from `fromYear` on, against the
 * rest of the structure as stored: parent level, parent active in every year
 * the version covers, and no cycle in any boundary year from `fromYear` to the
 * last version start or end of any entry (the structure only changes at those
 * years). Returns the first violation or `null`. Does not re-validate the
 * entry's children (design 5.3 checks the saved entry's versions only).
 */
export const findHierarchyViolation = (input: {
  unitId: number;
  versions: GraphVersion[];
  others: GraphVersion[];
  fromYear: number;
}): HierarchyViolation | null => {
  const { unitId, versions, fromYear } = input;
  const byUnit = new Map<number, GraphVersion[]>();
  for (const v of input.others) {
    if (v.unitId === unitId) continue;
    byUnit.set(v.unitId, [...(byUnit.get(v.unitId) ?? []), v]);
  }
  for (const list of byUnit.values()) list.sort((a, b) => a.from - b.from);
  byUnit.set(
    unitId,
    [...versions].sort((a, b) => a.from - b.from),
  );

  for (const v of byUnit.get(unitId)) {
    if (v.to !== null && v.to <= fromYear) continue;
    const from = Math.max(v.from, fromYear);
    const to = v.to ?? INF;
    const allowed = ORG_ALLOWED_PARENT_LEVELS[v.levelId];
    if (!allowed) {
      return {
        field: 'level',
        description: `Level ${v.levelId} has no hierarchy rules`,
      };
    }
    if (allowed.length === 0) {
      if (v.parentId !== null) {
        return {
          field: 'parent',
          description: `A ${label(v.levelId)} cannot have a parent`,
        };
      }
      continue;
    }
    if (v.parentId === null) {
      return {
        field: 'parent',
        description: `A ${label(v.levelId)} needs a parent`,
      };
    }
    const parentVersions = (byUnit.get(v.parentId) ?? []).filter(
      (p) => p.from < to && (p.to ?? INF) > from,
    );
    const wrong = parentVersions.find((p) => !allowed.includes(p.levelId));
    if (wrong) {
      return {
        field: 'parent',
        description: `A ${label(v.levelId)} cannot sit under a ${label(wrong.levelId)} (allowed: ${allowed.map(label).join(', ')})`,
      };
    }
    const gaps = uncovered(from, to, parentVersions);
    if (gaps.length > 0) {
      return {
        field: 'parent',
        description: `The parent is not active in ${gaps.map(([a, b]) => formatRange(a, b)).join(', ')}, which this version covers`,
      };
    }
  }

  const boundaries = new Set<number>([fromYear]);
  for (const list of byUnit.values()) {
    for (const v of list) {
      for (const year of [v.from, v.to]) {
        if (year !== null && year > fromYear) boundaries.add(year);
      }
    }
  }
  const parentAt = (id: number, year: number): number | null =>
    findCovering(byUnit.get(id) ?? [], year)?.parentId ?? null;

  for (const year of [...boundaries].sort((a, b) => a - b)) {
    const seen = new Set<number>();
    let current = parentAt(unitId, year);
    while (current !== null && !seen.has(current)) {
      if (current === unitId) {
        return {
          field: 'parent',
          description: `This change would make the entry its own ancestor from ${year} (cycle)`,
        };
      }
      seen.add(current);
      current = parentAt(current, year);
    }
  }
  return null;
};

export interface ChildLevelConflict {
  childId: number;
  from: number;
  to: number | null;
}

/**
 * I-3 for CHILDREN (R-ORG-003 "Parent rules, per version"): after the saved
 * entry's level changed, every version of another entry whose parent is the
 * saved entry must still be allowed under the saved entry's level in each
 * year they overlap, from `fromYear` on. Returns the year ranges that break
 * the rule, per child.
 */
export const findChildLevelConflicts = (input: {
  unitId: number;
  versions: GraphVersion[];
  others: GraphVersion[];
  fromYear: number;
}): ChildLevelConflict[] => {
  const conflicts: ChildLevelConflict[] = [];
  for (const child of input.others) {
    if (child.unitId === input.unitId || child.parentId !== input.unitId) {
      continue;
    }
    const childTo = child.to ?? INF;
    if (childTo <= input.fromYear) continue;
    const allowed = ORG_ALLOWED_PARENT_LEVELS[child.levelId] ?? [];
    for (const v of input.versions) {
      const from = Math.max(child.from, v.from, input.fromYear);
      const to = Math.min(childTo, v.to ?? INF);
      if (from < to && !allowed.includes(v.levelId)) {
        conflicts.push({
          childId: child.unitId,
          from,
          to: to === INF ? null : to,
        });
      }
    }
  }
  return conflicts;
};

/** One sentence naming each child (by `codeOf`) and the years it would break. */
export const describeChildLevelConflicts = (
  conflicts: ChildLevelConflict[],
  codeOf: (id: number) => string,
  newLevelId: number,
): string =>
  `A ${label(newLevelId)} cannot be the parent of: ${conflicts
    .map((c) => `${codeOf(c.childId)} (${formatRange(c.from, c.to ?? INF)})`)
    .join(', ')}. Move or change those entries first`;

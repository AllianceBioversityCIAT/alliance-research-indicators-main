/**
 * Pure helpers over an entry's version ranges (design.md section 2.1, D-ORG-2).
 * No I/O. T-01 holds only the year-coverage predicate and its SQL twin;
 * the save-engine functions (locate, split, propagate, assertTimeline) arrive
 * with T-02.
 *
 * A version covers the half-open range `[from, to)`; `to === null` is
 * open-ended. A year N is covered when `from <= N AND (to IS NULL OR to > N)`
 * (R-ORG-006 AC.1).
 */
export const isYearCovered = (
  from: number,
  to: number | null,
  year: number,
): boolean => from <= year && (to === null || to > year);

/**
 * The same predicate as SQL, for an alias of `org_unit_versions` and a SQL
 * expression for the year (a column or a literal; the caller binds any
 * parameter inside it). It adds no `?` itself. The pure function above is what
 * unit tests pin; the real database is what pins THIS string (KZ-001: SQL
 * precedence and `IS NULL` cannot be shown by a mocked query).
 */
export const yearCoverageSql = (alias: string, yearExpr: string): string =>
  `(${alias}.valid_from_year <= ${yearExpr} AND (${alias}.valid_to_year IS NULL OR ${alias}.valid_to_year > ${yearExpr}))`;

// ---------------------------------------------------------------------------
// T-02: save-engine functions (design 5.2 steps 5-6, invariants I-1 and I-2).
// ---------------------------------------------------------------------------

/** One version of an entry. `id` is the persisted row id; a new half of a split has none. */
export interface TimelineVersion {
  id?: number;
  from: number;
  to: number | null;
  name: string;
  acronym: string | null;
  levelId: number;
  parentId: number | null;
  directorCarnet: string | null;
}

export type VersionedField =
  | 'name'
  | 'acronym'
  | 'levelId'
  | 'parentId'
  | 'directorCarnet';

export const VERSIONED_FIELDS: readonly VersionedField[] = [
  'name',
  'acronym',
  'levelId',
  'parentId',
  'directorCarnet',
];

/** Fields a save wants to set. A key that is absent means "leave as is"; `null` clears. */
export type VersionChanges = Partial<Pick<TimelineVersion, VersionedField>>;

export type VersionDiff = Partial<
  Record<VersionedField, { old: unknown; new: unknown }>
>;

export interface ApplyChangeResult {
  /** The whole resulting timeline, ordered by `from`. */
  versions: TimelineVersion[];
  kind: 'edit_in_place' | 'new_version' | 'none';
  /** Old and new value of each field that actually changed at the located version. */
  diff: VersionDiff;
}

/** The invariant of design 3.2 I-1 / I-2 does not hold: a bug, never a user error. */
export class OrgTimelineInvariantError extends Error {
  constructor(message: string) {
    super(`Version timeline invariant broken: ${message}`);
    this.name = 'OrgTimelineInvariantError';
  }
}

export const findCovering = <T extends Pick<TimelineVersion, 'from' | 'to'>>(
  versions: T[],
  year: number,
): T | undefined => versions.find((v) => isYearCovered(v.from, v.to, year));

/**
 * Design 5.2 steps 5 and 6. A version that starts in `year` is edited in
 * place; otherwise the covering version `[a, b)` is split into `[a, year)`
 * (old values, keeps its id) and `[year, b)` (new values). Then every changed
 * field is replaced in each LATER version only where that version still holds
 * the value being replaced (R-ORG-004 "A later deliberate change is kept").
 * A change equal to the current values is `none`. Never mutates its input.
 */
export const applyChange = (
  versions: TimelineVersion[],
  year: number,
  changes: VersionChanges,
): ApplyChangeResult => {
  const ordered = versions
    .map((v) => ({ ...v }))
    .sort((a, b) => a.from - b.from);
  const target = findCovering(ordered, year);
  if (!target) {
    throw new OrgTimelineInvariantError(`no version covers year ${year}`);
  }

  const diff: VersionDiff = {};
  for (const field of VERSIONED_FIELDS) {
    if (changes[field] === undefined) continue;
    if (target[field] !== changes[field]) {
      diff[field] = { old: target[field], new: changes[field] };
    }
  }
  if (Object.keys(diff).length === 0) {
    return { versions: ordered, kind: 'none', diff };
  }

  const apply = (version: TimelineVersion) => {
    for (const field of Object.keys(diff) as VersionedField[]) {
      (version[field] as unknown) = diff[field].new;
    }
  };

  let result: TimelineVersion[];
  let kind: ApplyChangeResult['kind'];
  if (target.from === year) {
    apply(target);
    result = ordered;
    kind = 'edit_in_place';
  } else {
    const newHalf: TimelineVersion = { ...target, from: year };
    delete newHalf.id;
    apply(newHalf);
    target.to = year;
    result = [...ordered, newHalf].sort((a, b) => a.from - b.from);
    kind = 'new_version';
  }

  for (const later of result.filter((v) => v.from > year)) {
    for (const field of Object.keys(diff) as VersionedField[]) {
      if (later[field] === diff[field].old) {
        (later[field] as unknown) = diff[field].new;
      }
    }
  }
  return { versions: result, kind, diff };
};

/** Rows to write after `applyChange`: versions without an id are inserts; the rest that differ are updates. */
export const changedVersions = (
  before: TimelineVersion[],
  after: TimelineVersion[],
): { inserts: TimelineVersion[]; updates: TimelineVersion[] } => {
  const byId = new Map(before.map((v) => [v.id, v]));
  const inserts: TimelineVersion[] = [];
  const updates: TimelineVersion[] = [];
  for (const version of after) {
    const old = version.id === undefined ? undefined : byId.get(version.id);
    if (!old) {
      inserts.push(version);
    } else if (
      old.from !== version.from ||
      old.to !== version.to ||
      VERSIONED_FIELDS.some((field) => old[field] !== version[field])
    ) {
      updates.push(version);
    }
  }
  return { inserts, updates };
};

/** The years `[from, to)` between two consecutive versions where the entry had no version (D-ORG-17). */
export interface TimelineGap {
  from: number;
  to: number;
}

/** Every gap of a timeline, ordered. A version that is open-ended or contiguous with the next leaves none. */
export const gapsOf = (
  versions: Array<Pick<TimelineVersion, 'from' | 'to'>>,
): TimelineGap[] =>
  versions.flatMap((v, index) => {
    const next = versions[index + 1];
    return next && v.to !== null && v.to < next.from
      ? [{ from: v.to, to: next.from }]
      : [];
  });

const sameGaps = (a: TimelineGap[], b: TimelineGap[]): boolean =>
  a.length === b.length &&
  a.every((gap, i) => gap.from === b[i].from && gap.to === b[i].to);

const describeGaps = (gaps: TimelineGap[]): string =>
  gaps.length === 0
    ? 'none'
    : gaps.map((g) => `[${g.from}, ${g.to})`).join(' ');

/**
 * I-1 / I-2: at least one version, strictly ascending starts (so one version
 * per start year), no empty range, each version ends exactly where the next
 * starts, and an open-ended version is only the last one, only for an entry
 * that has not ended. Throws `OrgTimelineInvariantError` (a bug, so a 500 and
 * a rollback, never a 400).
 *
 * `gaps` (D-ORG-17) is the EXACT set of gaps the result must have: the gaps of
 * the input (a gap is an inactive period and no write may fill, shrink or move
 * it), plus the one a reactivation adds. Default none. A gap the result lacks
 * or has extra is a bug, which also catches an end that stretches the version
 * before a gap across it.
 */
export const assertTimeline = (
  versions: Array<Pick<TimelineVersion, 'from' | 'to'>>,
  options: { ended: boolean; gaps?: TimelineGap[] },
): void => {
  if (versions.length === 0) {
    throw new OrgTimelineInvariantError('an entry needs at least one version');
  }
  versions.forEach((v, index) => {
    const next = versions[index + 1];
    if (v.to !== null && v.to <= v.from) {
      throw new OrgTimelineInvariantError(
        `version from ${v.from} has an empty range`,
      );
    }
    if (next) {
      if (next.from <= v.from) {
        throw new OrgTimelineInvariantError(
          `versions are not strictly ordered (${v.from} then ${next.from})`,
        );
      }
      if (v.to === null || v.to > next.from) {
        throw new OrgTimelineInvariantError(
          `version [${v.from}, ${v.to}) overlaps the one from ${next.from}`,
        );
      }
    } else if (options.ended && v.to === null) {
      throw new OrgTimelineInvariantError(
        'an ended entry cannot have an open-ended last version',
      );
    }
  });
  const expected = options.gaps ?? [];
  const actual = gapsOf(versions);
  if (!sameGaps(actual, expected)) {
    throw new OrgTimelineInvariantError(
      `gaps are ${describeGaps(actual)}, expected ${describeGaps(expected)}`,
    );
  }
};

// ---------------------------------------------------------------------------
// T-03: lifecycle operations (design 5.4, 5.5; D-ORG-11). Pure, no I/O.
// @akili-spec institutional-performance/organizational-structure
// ---------------------------------------------------------------------------

/** A rule of the lifecycle the caller broke: always a 400 naming `field`. */
export interface TimelineRuleViolation {
  field: string;
  description: string;
}

export type EndTimelineResult =
  | { ok: true; versions: TimelineVersion[]; dropped: TimelineVersion[] }
  | { ok: false; violation: TimelineRuleViolation };

/**
 * Ends an entry from year `endYear` (inactivate and logical delete).
 * `endYear` must be later than the first year (R-ORG-008: it cannot end before
 * it existed). A version that starts AFTER `endYear` is a scheduled change and
 * rejects the request (D-ORG-11). A version that starts exactly AT `endYear`
 * would cover no year, so it is dropped (and returned, so the log keeps it).
 * The last remaining version then gets `to = endYear`. Never mutates its input.
 */
export const endTimeline = (
  versions: TimelineVersion[],
  endYear: number,
): EndTimelineResult => {
  const ordered = versions
    .map((v) => ({ ...v }))
    .sort((a, b) => a.from - b.from);
  const first = ordered[0];
  if (!first) {
    throw new OrgTimelineInvariantError('an entry needs at least one version');
  }
  if (endYear <= first.from) {
    return {
      ok: false,
      violation: {
        field: 'fromYear',
        description: `fromYear ${endYear} must be later than the first year of the entry (${first.from})`,
      },
    };
  }
  const scheduled = ordered.find((v) => v.from > endYear);
  if (scheduled) {
    return {
      ok: false,
      violation: {
        field: 'fromYear',
        description: `The entry has a change scheduled from ${scheduled.from}, after ${endYear}; remove or move the scheduled change first`,
      },
    };
  }
  const dropped = ordered.filter((v) => v.from === endYear);
  const kept = ordered.filter((v) => v.from < endYear);
  const lastKept = kept[kept.length - 1];
  // The version before E already ends earlier: E is where the entry came back
  // after an inactive period (D-ORG-17). Stretching it to E would fill the gap.
  if (lastKept.to !== null && lastKept.to !== endYear) {
    return {
      ok: false,
      violation: {
        field: 'fromYear',
        description: `The entry is active again only from ${endYear} (it was inactive from ${lastKept.to}); end it from a later year`,
      },
    };
  }
  lastKept.to = endYear;
  return { ok: true, versions: kept, dropped };
};

export type ReopenTimelineResult =
  | { ok: true; versions: TimelineVersion[]; added: TimelineVersion }
  | { ok: false; violation: TimelineRuleViolation };

/**
 * Reactivates an entry from year `year` (R-ORG-007 AC.2): the last version's
 * values become a new open-ended version `[year, null)`. `year` must not be
 * before the year the entry ended (`endedFrom`); later than it leaves the years
 * in between without a version (the entry was inactive then). Never mutates its
 * input.
 */
export const reopenTimeline = (
  versions: TimelineVersion[],
  year: number,
  endedFrom: number,
): ReopenTimelineResult => {
  const ordered = versions
    .map((v) => ({ ...v }))
    .sort((a, b) => a.from - b.from);
  const last = ordered[ordered.length - 1];
  if (!last) {
    throw new OrgTimelineInvariantError('an entry needs at least one version');
  }
  if (year < endedFrom) {
    return {
      ok: false,
      violation: {
        field: 'fromYear',
        description: `fromYear ${year} is before the year the entry ended (${endedFrom})`,
      },
    };
  }
  const added: TimelineVersion = { ...last, from: year, to: null };
  delete added.id;
  return { ok: true, versions: [...ordered, added], added };
};

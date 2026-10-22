import {
  OrgLevelCode,
  OrgSaveOutcome,
  OrgStaffOption,
  OrgUnitCreatePayload,
  OrgUnitUpdatePayload,
  OrgUnitVersionView,
  OrgYearViewRow
} from '@shared/interfaces/org-structure.interface';
import { ORG_LEVEL_LABELS, isEndedInYear } from './org-tree.util';

// @akili-spec institutional-performance/organizational-structure T-02 (client half) — design §5.2,
// §6.5; requirements R-ORG-003, 004, 005, 013, 016, 017. Pure functions: no I/O, no Angular. The
// server owns every rule; the client mirrors only what the form needs to offer and to send.

/** `org.level` list value ids -> level code (D-ORG-4: ids 20-23). */
export const ORG_LEVEL_CODE_BY_ID: Record<number, OrgLevelCode> = { 20: 'L1', 21: 'L2', 22: 'L3', 23: 'L4' };
export const ORG_LEVEL_ID_BY_CODE: Record<OrgLevelCode, number> = { L1: 20, L2: 21, L3: 22, L4: 23 };
/** Parent levels a level may sit under (R-ORG-003): L1 none, L2 under L1, L3 under L2, L4 under L2 or L3. */
export const ORG_ALLOWED_PARENTS: Record<OrgLevelCode, OrgLevelCode[]> = { L1: [], L2: ['L1'], L3: ['L2'], L4: ['L2', 'L3'] };
export const MAX_DELEGATES = 20;

export interface OrgParentOption {
  id: number;
  label: string;
}

/** The level a row's `+` pre-selects for the new child (Division -> Department -> Office -> Unit). */
export function nextLevelId(parentLevel: OrgLevelCode): number | null {
  const next: Record<OrgLevelCode, OrgLevelCode | null> = { L1: 'L2', L2: 'L3', L3: 'L4', L4: null };
  const code = next[parentLevel];
  return code ? ORG_LEVEL_ID_BY_CODE[code] : null;
}

/** Path of an entry in the viewed rows, root first: `Division / Department / Office`. */
export function pathOf(row: OrgYearViewRow, byId: Map<number, OrgYearViewRow>): string {
  const names: string[] = [];
  const seen = new Set<number>();
  let cursor: OrgYearViewRow | undefined = row;
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    names.unshift(cursor.version.name);
    cursor = cursor.version.parentId === null ? undefined : byId.get(cursor.version.parentId);
  }
  return names.join(' / ');
}

/** Parent picker: allowed levels only, not the entry itself, not ended on or before *Applies from year* (R-ORG-003, 013). */
export function parentOptions(rows: OrgYearViewRow[], levelId: number | null, appliesFromYear: number, selfId: number | null): OrgParentOption[] {
  const level = levelId === null ? undefined : ORG_LEVEL_CODE_BY_ID[levelId];
  if (!level) return [];
  const allowed = ORG_ALLOWED_PARENTS[level];
  const byId = new Map(rows.map(r => [r.id, r]));
  return rows
    .filter(r => r.id !== selfId && allowed.includes(r.version.levelCode) && !isEndedInYear(r, appliesFromYear))
    .map(r => ({ id: r.id, label: `${r.code} ${pathOf(r, byId)} (${ORG_LEVEL_LABELS[r.version.levelCode]})` }));
}

/**
 * Years the *Applies from year* select offers: from the current year on, up to next year at least (D-ORG-20);
 * earlier ones only with *Back-date* (R-ORG-005).
 */
export function appliesFromYears(minYear: number, maxYear: number, currentYear: number, backdate: boolean): number[] {
  const first = backdate ? minYear : currentYear;
  const last = Math.max(maxYear, currentYear + 1);
  const years: number[] = [];
  for (let y = first; y <= last; y++) years.push(y);
  return years;
}

/**
 * Default *Applies from year* (D-ORG-23): the viewed *Structure year* when it is the current year or later,
 * otherwise the current year. A past year is never the default, so *Back-date* stays a deliberate step.
 */
export function defaultAppliesFromYear(structureYear: number, currentYear: number): number {
  return Math.max(structureYear, currentYear);
}

export interface OrgFormState {
  code: string;
  levelId: number | null;
  name: string;
  acronym: string;
  parentId: number | null;
  director: OrgStaffOption | null;
  delegates: OrgStaffOption[];
  appliesFromYear: number;
  backdate: boolean;
}

// Delegates compare as a SET: reordering chips is not a change (R-ORG-017).
export const sameList = (a: string[], b: string[]) => a.length === b.length && a.every(v => b.includes(v)) && b.every(v => a.includes(v));

export interface OrgChanges {
  code: boolean;
  versioned: boolean;
  delegates: boolean;
}

/**
 * Which parts of an existing entry the form changed. Only the code is unversioned (R-ORG-002); delegates are
 * a versioned field like the director (R-ORG-017, D-ORG-24), so a delegates change also sets `versioned`.
 * `delegates` stays as its own flag: it says whether `delegateCarnets` goes into the B10 body.
 */
export function detectChanges(form: OrgFormState, row: OrgYearViewRow): OrgChanges {
  const v = row.version;
  const delegates = !sameList(
    form.delegates.map(d => d.carnet),
    row.delegates.map(d => d.carnet)
  );
  return {
    code: form.code.trim() !== row.code,
    versioned:
      delegates ||
      form.name.trim() !== v.name ||
      form.acronym.trim() !== (v.acronym ?? '') ||
      form.levelId !== v.levelId ||
      form.parentId !== v.parentId ||
      (form.director?.carnet ?? null) !== (v.director?.carnet ?? null),
    delegates
  };
}

export interface OrgDelegatesReplaced {
  /** Start year of the version whose list the save would replace. */
  from: number;
  /** Its current delegates, names joined with `, ` (`none` when it has none). */
  names: string;
}

/**
 * D-ORG-25: the delegates sent for *Applies from year* replace the whole list of the version covering that
 * year. When that is NOT the version on screen and its list differs from the form's (as a set), returns what
 * would be replaced so the form can warn before *Save*; otherwise `null`. A year no version covers (a gap)
 * replaces nothing. `versions` come from B6, oldest first; `to` is exclusive.
 */
export function delegatesReplaced(
  versions: OrgUnitVersionView[],
  viewedFrom: number,
  appliesFromYear: number,
  formCarnets: string[]
): OrgDelegatesReplaced | null {
  const target = versions.find(v => v.from <= appliesFromYear && (v.to === null || appliesFromYear < v.to));
  if (!target || target.from === viewedFrom) return null;
  const current = target.delegates ?? [];
  if (
    sameList(
      current.map(d => d.carnet),
      formCarnets
    )
  )
    return null;
  return { from: target.from, names: current.length ? current.map(d => d.name ?? d.carnet).join(', ') : 'none' };
}

/** B9 body: carnets only, never names or emails (R-ORG-016, 017). */
export function buildCreatePayload(form: OrgFormState, currentYear: number): OrgUnitCreatePayload {
  const payload: OrgUnitCreatePayload = { levelId: form.levelId as number, name: form.name.trim(), appliesFromYear: form.appliesFromYear };
  if (form.code.trim()) payload.code = form.code.trim();
  if (form.acronym.trim()) payload.acronym = form.acronym.trim();
  if (form.parentId !== null) payload.parentId = form.parentId;
  if (form.director) payload.directorCarnet = form.director.carnet;
  if (form.delegates.length > 0) payload.delegateCarnets = form.delegates.map(d => d.carnet);
  if (form.backdate && form.appliesFromYear < currentYear) payload.backdate = true;
  return payload;
}

/** B10 body: only the fields that changed; `appliesFromYear` only with a versioned change (design §4 B10). */
export function buildUpdatePayload(form: OrgFormState, row: OrgYearViewRow, changes: OrgChanges, currentYear: number): OrgUnitUpdatePayload {
  const v = row.version;
  const payload: OrgUnitUpdatePayload = {};
  if (changes.code) payload.code = form.code.trim();
  if (changes.versioned) {
    if (changes.delegates) payload.delegateCarnets = form.delegates.map(d => d.carnet);
    if (form.name.trim() !== v.name) payload.name = form.name.trim();
    if (form.acronym.trim() !== (v.acronym ?? '')) payload.acronym = form.acronym.trim();
    if (form.levelId !== v.levelId) payload.levelId = form.levelId as number;
    if (form.parentId !== v.parentId) payload.parentId = form.parentId;
    if ((form.director?.carnet ?? null) !== (v.director?.carnet ?? null)) payload.directorCarnet = form.director?.carnet ?? null;
    payload.appliesFromYear = form.appliesFromYear;
    if (form.backdate && form.appliesFromYear < currentYear) payload.backdate = true;
  }
  return payload;
}

export interface OrgSaveToast {
  severity: 'success' | 'info';
  detail: string;
}

/**
 * Toast for what the SERVER did (R-ORG-013 AC.2): *updated in place*, *new version from Y* or
 * *back-dated from Y*. Derived only from `outcome`, never from the viewed version: the server decides
 * in place vs new version against the version covering *Applies from year* (design §4 B9/B10).
 */
export function saveToast(outcome: OrgSaveOutcome | undefined): OrgSaveToast {
  if (!outcome) return { severity: 'success', detail: 'Entry saved' };
  const year = outcome.appliesFromYear;
  switch (outcome.action) {
    case null:
      return { severity: 'info', detail: 'No changes' };
    case 'code_change':
      return { severity: 'success', detail: 'Code updated' };
    case 'create':
      return { severity: 'success', detail: outcome.backdated ? `Entry created, back-dated from ${year}` : `Entry created from ${year}` };
    case 'new_version':
      return { severity: 'success', detail: outcome.backdated ? `Entry back-dated from ${year}` : `Entry saved as a new version from ${year}` };
    default:
      return { severity: 'success', detail: outcome.backdated ? `Entry back-dated from ${year}` : 'Entry updated in place' };
  }
}

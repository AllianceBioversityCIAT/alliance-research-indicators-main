import {
  OrgLevelCode,
  OrgSaveOutcome,
  OrgStaffOption,
  OrgUnitCreatePayload,
  OrgUnitUpdatePayload,
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

/** Years the *Applies from year* select offers: from the current year on; earlier ones only with *Back-date* (R-ORG-005). */
export function appliesFromYears(minYear: number, maxYear: number, currentYear: number, backdate: boolean): number[] {
  const first = backdate ? minYear : currentYear;
  const last = Math.max(maxYear, currentYear);
  const years: number[] = [];
  for (let y = first; y <= last; y++) years.push(y);
  return years;
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
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every(v => b.includes(v)) && b.every(v => a.includes(v));

export interface OrgChanges {
  code: boolean;
  versioned: boolean;
  delegates: boolean;
}

/** Which parts of an existing entry the form changed. Code and delegates are not versioned (R-ORG-002, 017). */
export function detectChanges(form: OrgFormState, row: OrgYearViewRow): OrgChanges {
  const v = row.version;
  return {
    code: form.code.trim() !== row.code,
    versioned:
      form.name.trim() !== v.name ||
      form.acronym.trim() !== (v.acronym ?? '') ||
      form.levelId !== v.levelId ||
      form.parentId !== v.parentId ||
      (form.director?.carnet ?? null) !== (v.director?.carnet ?? null),
    delegates: !sameList(
      form.delegates.map(d => d.carnet),
      row.delegates.map(d => d.carnet)
    )
  };
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
  if (changes.delegates) payload.delegateCarnets = form.delegates.map(d => d.carnet);
  if (changes.versioned) {
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
    case 'delegates_change':
      return { severity: 'success', detail: 'Delegates updated' };
    case 'create':
      return { severity: 'success', detail: outcome.backdated ? `Entry created, back-dated from ${year}` : `Entry created from ${year}` };
    case 'new_version':
      return { severity: 'success', detail: outcome.backdated ? `Entry back-dated from ${year}` : `Entry saved as a new version from ${year}` };
    default:
      return { severity: 'success', detail: outcome.backdated ? `Entry back-dated from ${year}` : 'Entry updated in place' };
  }
}

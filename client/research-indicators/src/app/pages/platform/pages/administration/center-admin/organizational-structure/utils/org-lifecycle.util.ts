import { MainResponse } from '@shared/interfaces/responses.interface';
import { OrgLifecycleAction, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { appliesFromYears } from './org-form.util';
import { isEndedInYear } from './org-tree.util';

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — design §5.4, §5.5,
// §6.2 dialog row; requirements R-ORG-005, 007, 008, 013. Pure functions: the server owns every rule,
// the client only offers what it will accept and says what the server will do.

export interface OrgSuccessorOption {
  id: number;
  label: string;
}

/** Successor candidates: another entry of the SAME level that is still active in *From year* (R-ORG-007 AC.3). */
export function successorOptions(candidates: OrgYearViewRow[], entry: OrgYearViewRow, year: number): OrgSuccessorOption[] {
  return candidates
    .filter(c => c.id !== entry.id && c.version.levelId === entry.version.levelId && !isEndedInYear(c, year))
    .map(c => ({ id: c.id, label: `${c.code} ${c.version.name}` }));
}

/** *From year* choices: the current year on, earlier ones with *Back-date*; a reactivation never precedes the year it ended (§5.4). */
export function lifecycleYears(
  action: OrgLifecycleAction,
  range: { min: number; max: number; current: number },
  backdate: boolean,
  entry: OrgYearViewRow
): number[] {
  const years = appliesFromYears(range.min, range.max, range.current, backdate);
  const floor = action === 'reactivate' ? (entry.statusFromYear ?? range.min) : range.min;
  return years.filter(y => y >= floor);
}

/** Default *From year*: the current year, or the year the entry ended from when that is later (reactivate). */
export function defaultLifecycleYear(action: OrgLifecycleAction, current: number, entry: OrgYearViewRow): number {
  return action === 'reactivate' ? Math.max(current, entry.statusFromYear ?? current) : current;
}

/** §5.5: physical when the first version starts in the current year or later, else logical. `null` = not known. */
export function deleteMode(firstVersionFrom: number | null, currentYear: number): 'physical' | 'logical' | null {
  if (firstVersionFrom === null) return null;
  return firstVersionFrom >= currentYear ? 'physical' : 'logical';
}

/** The server's own message (it names the blocker: children, linked count...). Never the exception class name. */
export function serverMessage(response: MainResponse<unknown> | undefined, fallback: string): string {
  const errors = response?.errorDetail?.errors as unknown;
  if (typeof errors === 'string' && errors.trim()) return errors.trim();
  if (Array.isArray(errors) && errors.length > 0) return errors.map(e => (typeof e === 'string' ? e : JSON.stringify(e))).join(' ');
  if (errors && typeof errors === 'object') {
    const message = (errors as { description?: unknown }).description;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return fallback;
}

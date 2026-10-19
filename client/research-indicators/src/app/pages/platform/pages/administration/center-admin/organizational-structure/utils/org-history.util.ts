import { OrgChangeLogAction, OrgChangeLogActor, OrgChangeLogRow, OrgUnitVersionView } from '@shared/interfaces/org-structure.interface';
import { ORG_LEVEL_CODE_BY_ID } from './org-form.util';
import { ORG_LEVEL_LABELS } from './org-tree.util';

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — design §4 B6, §6.6;
// requirements R-ORG-009, R-ORG-017. Pure display helpers for the History tab: no I/O, no Angular.

export const ORG_ACTION_LABELS: Record<OrgChangeLogAction, string> = {
  seed: 'Seeded',
  create: 'Created',
  edit_in_place: 'Edited in place',
  new_version: 'New version',
  code_change: 'Code changed',
  delegates_change: 'Delegates changed',
  inactivate: 'Inactivated',
  reactivate: 'Reactivated',
  delete_logical: 'Deleted (logical)',
  delete_physical: 'Deleted (physical)'
};

const FIELD_LABELS: Record<string, string> = {
  code: 'Code',
  name: 'Name',
  acronym: 'Acronym',
  levelId: 'Level',
  parentId: 'Parent',
  director: 'Director',
  directorCarnet: 'Director',
  delegates: 'Delegates',
  delegateCarnets: 'Delegates',
  status: 'Status',
  statusFromYear: 'Ended from',
  successorId: 'Successor',
  lastVersionEnd: 'Last version ends',
  droppedVersions: 'Dropped versions',
  newVersion: 'New version'
};

// Fields whose values are carnets: shown as names when the panel already holds them (no extra API call).
const CARNET_FIELDS = new Set(['delegates', 'delegateCarnets', 'directorCarnet', 'director']);

export interface OrgDiffLine {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface OrgVersionRow {
  years: string;
  name: string;
  level: string;
  parent: string;
  director: string;
}

const EMPTY = '—';

/** One value of a diff: lists join with `, `; a staff ref shows its name; empty and null show a dash. */
export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (Array.isArray(value)) return value.length === 0 ? EMPTY : value.map(formatDiffValue).join(', ');
  if (typeof value === 'object') {
    const ref = value as Record<string, unknown>;
    if ('carnet' in ref) return typeof ref['name'] === 'string' && ref['name'] ? ref['name'] : String(ref['carnet']);
    return Object.entries(ref)
      .map(([key, inner]) => `${key}: ${formatDiffValue(inner)}`)
      .join(', ');
  }
  return String(value);
}

/** `names` maps carnet -> display name, built from data already on screen; unknown carnets stay as carnets. */
export function diffLines(row: OrgChangeLogRow, names?: ReadonlyMap<string, string>): OrgDiffLine[] {
  const resolve = (field: string, value: unknown): unknown => {
    if (!names || !CARNET_FIELDS.has(field)) return value;
    const one = (v: unknown) => (typeof v === 'string' ? (names.get(v) ?? v) : v);
    return Array.isArray(value) ? value.map(one) : one(value);
  };
  return Object.entries(row.changes ?? {}).map(([field, change]) => ({
    field,
    label: FIELD_LABELS[field] ?? field,
    before: formatDiffValue(resolve(field, change?.old)),
    after: formatDiffValue(resolve(field, change?.new))
  }));
}

/** Name, else email, else `User #id`, else a neutral label (seed rows carry no user). */
export function actorLabel(actor: OrgChangeLogActor | null | undefined): string {
  return actor?.name?.trim() || actor?.email?.trim() || (actor?.id != null ? `User #${actor.id}` : 'Unknown user');
}

/** `to` is exclusive (a version `[a, Y)` ends the year before `Y`): *2026–2027*, *2028 onwards*. */
export function versionYears(from: number, to: number | null): string {
  if (to === null) return `${from} onwards`;
  return to - 1 <= from ? String(from) : `${from}–${to - 1}`;
}

export function versionRows(versions: OrgUnitVersionView[]): OrgVersionRow[] {
  return versions.map(v => {
    const code = v.levelCode ?? ORG_LEVEL_CODE_BY_ID[v.levelId];
    return {
      years: versionYears(v.from, v.to),
      name: v.name,
      level: code ? `${code} ${ORG_LEVEL_LABELS[code]}` : String(v.levelId),
      parent: v.parentId === null ? EMPTY : [v.parentCode, v.parentName].filter(Boolean).join(' ') || String(v.parentId),
      director: v.director ? (v.director.name ?? v.director.carnet) : EMPTY
    };
  });
}

/** UTC `yyyy-MM-dd HH:mm`; a value that is not a date is shown as received. */
export function formatLogTime(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : new Date(time).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

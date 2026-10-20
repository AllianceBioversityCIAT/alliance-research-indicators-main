// @akili-spec institutional-performance/organizational-structure T-01 (client half) — design §4 B1, B2.
// Client-side shapes for the Organizational Structure module. One global structure: no type here
// carries a portfolio (R-ORG-001).

export type OrgUnitStatus = 'active' | 'inactive' | 'deleted';

/** `L1` Division · `L2` Department · `L3` Office · `L4` Unit (control list `org.level`, ids 20-23). */
export type OrgLevelCode = 'L1' | 'L2' | 'L3' | 'L4';

/** A staff member joined from `alliance_user_staff`; `isActiveStaff` drives the *Inactive staff* mark (R-ORG-016). */
export interface OrgStaffRef {
  carnet: string;
  name: string | null;
  email: string | null;
  isActiveStaff: boolean;
}

/** The version of an entry that covers the viewed year (B1 `version`). `to: null` = open-ended. */
export interface OrgUnitVersionView {
  from: number;
  to: number | null;
  name: string;
  acronym: string | null;
  levelId: number;
  levelCode: OrgLevelCode;
  parentId: number | null;
  parentCode: string | null;
  parentName: string | null;
  director: OrgStaffRef | null;
}

/** One entry of the year view (design §4 B1). `delegates` is the CURRENT list, whatever the year (R-ORG-017). */
export interface OrgYearViewRow {
  id: number;
  code: string;
  status: OrgUnitStatus;
  statusFromYear: number | null;
  version: OrgUnitVersionView;
  delegates: OrgStaffRef[];
  /** Start year of the next version after the viewed year, when one exists (R-ORG-006 AC.3). */
  scheduledFromYear: number | null;
}

/** design §4 B2: the selectable years and the server's current year. */
export interface OrgYearRange {
  min: number;
  max: number;
  current: number;
}

/** Display strings for one table row; `DataTable` columns are typed by field (design §6.4, P-7). */
export interface OrgTableRow {
  id: string;
  code: string;
  level: string;
  name: string;
  acronym: string;
  parent: string;
  director: string;
  delegates: string;
  status: string;
  since: string;
}

// @akili-spec institutional-performance/organizational-structure T-02 (client half) — design §4 B3, B4,
// B9, B10. Write shapes carry staff by `carnet` ONLY: names and emails are never sent (R-ORG-016, 017).

/** B4 row: an ACTIVE staff member (P-14). `isActiveStaff` is only present on already-stored people (B1). */
export interface OrgStaffOption {
  carnet: string;
  name: string | null;
  email: string | null;
  isActiveStaff?: boolean;
}

/** B3 `data`. */
export interface OrgCodeProposal {
  code: string;
}

/** B9 body. `id`, `portfolioId`, director name/email and delegate names/emails are never part of it. */
export interface OrgUnitCreatePayload {
  code?: string;
  levelId: number;
  name: string;
  acronym?: string;
  parentId?: number;
  directorCarnet?: string;
  delegateCarnets?: string[];
  appliesFromYear: number;
  backdate?: boolean;
}

/** B10 body: only what changed. `appliesFromYear` is sent only with a versioned-field change. */
export interface OrgUnitUpdatePayload {
  code?: string;
  name?: string;
  acronym?: string;
  levelId?: number;
  parentId?: number | null;
  directorCarnet?: string | null;
  delegateCarnets?: string[];
  appliesFromYear?: number;
  backdate?: boolean;
}

/** What the server actually did (design §4 "B9/B10 response `outcome`"); `action: null` = nothing written. */
export interface OrgSaveOutcome {
  action: 'create' | 'edit_in_place' | 'new_version' | 'code_change' | 'delegates_change' | null;
  appliesFromYear: number | null;
  backdated: boolean;
}

/** B9 / B10 `data`: `id` reselects the entry; `outcome` drives the success toast. */
export interface OrgUnitSaved {
  id: number;
  outcome?: OrgSaveOutcome;
}

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — design §4 B6,
// B11, B12, B13. Contract coded against the design table; the server half may name log fields
// differently, in which case only this block and `org-history.util.ts` change.

export type OrgLifecycleAction = 'inactivate' | 'reactivate' | 'delete';

/** B11 / B12 body. `successorId` exists on inactivate only. */
export interface OrgLifecyclePayload {
  fromYear: number;
  successorId?: number;
  backdate?: boolean;
}

/** B13 `data`: the server decides physical vs logical (§5.5). */
export interface OrgDeleteResult {
  id: number;
  mode: 'physical' | 'logical';
  /** The end year actually applied: `null` for a physical delete; an inactive entry keeps its own end year. */
  fromYear: number | null;
}

export type OrgChangeLogAction =
  | 'seed'
  | 'create'
  | 'edit_in_place'
  | 'new_version'
  | 'code_change'
  | 'delegates_change'
  | 'inactivate'
  | 'reactivate'
  | 'delete_logical'
  | 'delete_physical';

/** One changed field of a log row: `{ old, new }` (design §3.1). Lists (delegates) are carnets; objects (`newVersion`) are plain records. */
export interface OrgChangeLogDiffEntry {
  old: unknown;
  new: unknown;
}

/** Who wrote the row; any part may be null (seed rows, deleted users). */
export interface OrgChangeLogActor {
  id: number | null;
  name: string | null;
  email: string | null;
}

/** B6 `log[]` / B7 row (R-ORG-009), as the server returns it. */
export interface OrgChangeLogRow {
  id: number;
  unitId: number;
  action: OrgChangeLogAction;
  appliesFromYear: number | null;
  backdated: boolean;
  changes: Record<string, OrgChangeLogDiffEntry>;
  createdAt: string;
  createdBy: OrgChangeLogActor;
}

/** B6 `data`: every version of the entry (oldest first) and its log (newest first). */
export interface OrgHistory {
  versions: OrgUnitVersionView[];
  log: OrgChangeLogRow[];
}

// @akili-spec institutional-performance/organizational-structure T-04 (client half) — design §4 B8, §6.6.

/** One registered consumer and how many of its records use the entry. */
export interface OrgLinkedConsumer {
  consumer: string;
  count: number;
}

/** B8 `data`: the child count plus one row per registered consumer. */
export interface OrgLinkedData {
  childCount: number;
  consumers: OrgLinkedConsumer[];
}

/**
 * Client-facing (camelCase) shapes for the Organizational Structure API
 * (design.md section 4). Entities stay snake_case to match the DB; the read
 * service maps between them.
 */

/** Canonical level label, derived from the seeded value id (D-ORG-4). */
export type OrgLevelCode = 'L1' | 'L2' | 'L3' | 'L4';

export type OrgUnitStatus = 'active' | 'inactive' | 'deleted';

export type OrgChangeAction =
  | 'seed'
  | 'create'
  | 'edit_in_place'
  | 'new_version'
  | 'inactivate'
  | 'reactivate'
  | 'delete_logical'
  | 'delete_physical'
  | 'code_change'
  | 'delegates_change';

/** A staff member joined from `alliance_user_staff` (R-ORG-016, R-ORG-017). */
export interface OrgStaffRef {
  carnet: string;
  name: string;
  email: string | null;
  // "Active staff" rule for T-01 (read side): `alliance_user_staff.is_active`,
  // the column the existing staff search filters on. The write-side picker
  // rule is settled in T-02 (design P-14).
  isActiveStaff: boolean;
}

/** One B1 row: an entry with the version that covers the viewed year. */
export interface YearViewRow {
  id: number;
  code: string;
  status: OrgUnitStatus;
  statusFromYear: number | null;
  version: {
    from: number;
    to: number | null;
    name: string;
    acronym: string | null;
    levelId: number;
    /** From `levelId` (D-ORG-4), never from the editable list code. */
    levelCode: OrgLevelCode | null;
    /** Editable display name of the level value (`control_list_values.value`). */
    levelName: string | null;
    parentId: number | null;
    parentCode: string | null;
    parentName: string | null;
    director: OrgStaffRef | null;
  };
  /** Delegates of the version shown: the one covering the year, or the last one of an `includeEnded` row (R-ORG-017, D-ORG-24). */
  delegates: OrgStaffRef[];
  /** Smallest version start after the viewed year, if any (R-ORG-006 AC.3). */
  scheduledFromYear: number | null;
}

/** B2. */
export interface YearRange {
  min: number;
  max: number;
  current: number;
}

/** One version of an entry as B5 returns it. */
export interface OrgUnitVersionResponse {
  id: number;
  from: number;
  to: number | null;
  name: string;
  acronym: string | null;
  levelId: number;
  /** From `levelId` (D-ORG-4), never from the editable list code. */
  levelCode: OrgLevelCode | null;
  /** Editable display name of the level value (`control_list_values.value`). */
  levelName: string | null;
  parentId: number | null;
  parentCode: string | null;
  parentName: string | null;
  director: OrgStaffRef | null;
  /** Delegates of THIS version (R-ORG-017, D-ORG-24). */
  delegates: OrgStaffRef[];
}

/** B5: the entry and all its versions (oldest first), each with its own delegates. */
export interface OrgUnitDetailResponse {
  id: number;
  code: string;
  status: OrgUnitStatus;
  statusFromYear: number | null;
  successorId: number | null;
  versions: OrgUnitVersionResponse[];
}

/**
 * What a B9/B10 save actually did (design 4, "B9/B10 response outcome"): the
 * action the service logged, `null` when nothing was written. When one save
 * logs a version action together with a code change, the version action is
 * reported. `delegates_change` is never reported: a delegates change is a
 * versioned change like any other (D-ORG-24).
 */
export interface OrgSaveOutcome {
  action: 'create' | 'edit_in_place' | 'new_version' | 'code_change' | null;
  appliesFromYear: number | null;
  backdated: boolean;
}

/** B9 / B10 `data`: the B5 shape plus `outcome`. */
export type OrgUnitSaveResponse = OrgUnitDetailResponse & {
  outcome: OrgSaveOutcome;
};

/** One change-log row as B6 and B7 return it (R-ORG-009). `createdBy` joins `sec_users`. */
export interface OrgChangeLogRow {
  id: number;
  unitId: number;
  action: OrgChangeAction;
  appliesFromYear: number | null;
  backdated: boolean;
  /** `{ field: { old, new } }`; for a physical delete, the last values. */
  changes: Record<string, { old: unknown; new: unknown }>;
  createdAt: string;
  createdBy: { id: number | null; name: string | null; email: string | null };
}

/** B6: the entry's versions (oldest first) and its log (newest first). */
export interface OrgUnitHistoryResponse {
  versions: OrgUnitVersionResponse[];
  log: OrgChangeLogRow[];
}

/** B13. */
export interface OrgDeleteResult {
  id: number;
  mode: 'physical' | 'logical';
  /** The end year actually applied: null for a physical delete; for an already-inactive entry, its existing end year. */
  fromYear: number | null;
}

// ---------------------------------------------------------------------------
// T-04: consumer contract (design 4, C1-C3, B8; D-ORG-18).
// ---------------------------------------------------------------------------

/** The version of an entry that covers a requested year (C1). */
export type OrgResolvedVersion = Omit<
  OrgUnitVersionResponse,
  'id' | 'delegates'
>;

/**
 * One C1 row (R-ORG-010). `version` is `null` when no version covers `year`:
 * at or after the entry's end, inside a D-ORG-17 gap, or before its first
 * version (D-ORG-18). `status` is the status AS OF `year`, never the current one.
 */
export interface OrgResolvedUnit {
  id: number;
  code: string;
  year: number;
  status: OrgUnitStatus;
  /** The year the entry ended (inactive or deleted), as stored; `null` while active. */
  statusFromYear: number | null;
  successorId: number | null;
  version: OrgResolvedVersion | null;
  /** Delegates of the covering version, i.e. of the requested year; `[]` when `version` is null (R-ORG-010 AC.3, D-ORG-24). */
  delegates: OrgStaffRef[];
}

/** C1 row for an id that does not exist (never did, or physically deleted), D-ORG-19. */
export interface OrgMissingUnit {
  id: number;
  missing: true;
}

/** One C1 row: a resolved entry or a `missing` marker, in request order. */
export type OrgResolveRow = OrgResolvedUnit | OrgMissingUnit;

/** One link of the C2 chain, as of the requested year. */
export interface OrgAncestorNode {
  id: number;
  code: string;
  name: string;
  acronym: string | null;
  levelId: number;
  levelCode: OrgLevelCode | null;
  levelName: string | null;
  parentId: number | null;
}

/** One link of the C3 chain. */
export interface OrgSuccessorNode {
  id: number;
  code: string;
  status: OrgUnitStatus;
  statusFromYear: number | null;
  successorId: number | null;
}

/** B8: child count plus one row per registered consumer that reports a record. */
export interface OrgLinkedData {
  /** Distinct entries with a version under this entry that covers the current year or later. */
  childCount: number;
  consumers: Array<{ consumer: string; count: number }>;
}

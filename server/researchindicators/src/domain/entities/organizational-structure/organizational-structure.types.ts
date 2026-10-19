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
  /** CURRENT list, not per year (R-ORG-017, D-ORG-15). */
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
}

/** B5: the entry, all its versions (oldest first) and its current delegates. */
export interface OrgUnitDetailResponse {
  id: number;
  code: string;
  status: OrgUnitStatus;
  statusFromYear: number | null;
  successorId: number | null;
  versions: OrgUnitVersionResponse[];
  delegates: OrgStaffRef[];
}

/**
 * What a B9/B10 save actually did (design 4, "B9/B10 response outcome"): the
 * action the service logged, `null` when nothing was written. When one save
 * logs a version action together with a code or delegates change, the version
 * action is reported.
 */
export interface OrgSaveOutcome {
  action:
    | 'create'
    | 'edit_in_place'
    | 'new_version'
    | 'code_change'
    | 'delegates_change'
    | null;
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

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

// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-01, T-UI-08)
//
// Client-side TypeScript interfaces that mirror the shipped backend response DTOs:
//   pi-delegates/dto/pi-delegate-response.dto.ts
//   users/active (GET /api/users/active?search=<optional>)
//
// Canonical source of truth for:
//   GET  /api/pi-delegates?projectId          → MainResponse<ProjectDelegates>
//   GET  /api/pi-delegates/by-delegate?…      → MainResponse<DelegateProjects>
//   GET  /api/users/active?search=<optional>  → MainResponse<ActiveUser[]>

/**
 * Active user returned by GET /api/users/active.
 * Only Accepted + is_active users are returned by the backend.
 */
export interface ActiveUser {
  /** sec_users.sec_user_id */
  sec_user_id: number;
  /** sec_users.first_name — may be null */
  first_name: string | null;
  /** sec_users.last_name — may be null */
  last_name: string | null;
  /** sec_users.email */
  email: string;
}

/**
 * A single delegate's identity — element type of ProjectDelegates.delegates.
 */
export interface DelegateSummary {
  /** sec_users.sec_user_id of the delegate. */
  delegate_user_id: number;
  /** Delegate's full name (first_name + ' ' + last_name). */
  name: string;
  /** sec_users.email of the delegate. */
  email: string;
  /** Whether the delegate's account is active in sec_users. */
  is_active: boolean;
  /** sec_users.first_name — may be null. */
  first_name?: string | null;
  /** sec_users.last_name — may be null. */
  last_name?: string | null;
  /** sec_users.carnet — may be null. */
  carnet?: string | null;
  /** sec_users.status_id — may be null. */
  status_id?: number | null;
}

/**
 * A project summary — element type of DelegateProjects.projects.
 */
export interface ProjectSummary {
  /** agresso_contracts.agreement_id (Agresso project code). */
  project_code: string;
  /** agresso_contracts.description (project name). */
  project_name: string | null;
}

/**
 * Enriched response for GET /api/pi-delegates?projectId.
 *
 * One project with its active delegates.
 */
export interface ProjectDelegates {
  /** agresso_contracts.agreement_id (Agresso project code). */
  project_code: string;
  /** agresso_contracts.description (project name). */
  project_name: string | null;
  /** agresso_contracts.is_pool_funding_contributor cast from tinyint to boolean. */
  is_pool_funding_contributor: boolean;
  /**
   * sec_users.sec_user_id of the project's Principal Investigator
   * (projectLeadId → alliance_user_staff.carnet → sec_users.email), or null when
   * the lead has no STAR account. This is the user the backend's PI-exclusion
   * rule (R-PID-008) rejects as a delegate of this same project, so the UI
   * disables that option instead of letting the request 400.
   */
  pi_user_id: number | null;
  /** agresso_contracts.contract_status. */
  status: string | null;
  /** agresso_contracts.start_date. */
  start_date: Date | null;
  /** agresso_contracts.end_date. */
  end_date: Date | null;
  /** Active delegates for this project (may be an empty array). */
  delegates: DelegateSummary[];
}

/**
 * Enriched response for GET /api/pi-delegates/by-delegate?delegate_user_id=<id>.
 *
 * One person with the active projects they are delegated for.
 */
export interface DelegateProjects {
  /** sec_users.sec_user_id of the delegate. */
  delegate_user_id: number;
  /** Delegate's full name (first_name + ' ' + last_name). */
  name: string | null;
  /** sec_users.email of the delegate. */
  email: string | null;
  /** Whether the delegate's account is active in sec_users. */
  is_active: boolean;
  /** sec_users.first_name — may be null. */
  first_name?: string | null;
  /** sec_users.last_name — may be null. */
  last_name?: string | null;
  /** Active project assignments for this delegate (may be an empty array). */
  projects: ProjectSummary[];
}

/**
 * One entry in the delegation history log.
 * Returned by GET /api/pi-delegates/history?project_id=<code>
 *           or GET /api/pi-delegates/history?delegate_user_id=<id>
 * Entries are returned NEWEST-FIRST by the backend.
 */
export interface PiDelegateHistoryEntry {
  /** Primary key of the history row. */
  pi_delegate_history_id: number;
  /** 'assign' = role was granted; 'revoke' = role was revoked. */
  action: 'assign' | 'revoke';
  /** The person who performed the action. */
  actor: {
    user_id: number | null;
    name: string | null;
  };
  /** The person whose delegate role changed. */
  delegate: {
    user_id: number;
    name: string | null;
  };
  /** The project this delegation event relates to. */
  project: {
    project_code: string;
    project_name: string | null;
  };
  /** ISO 8601 timestamp of when the action occurred. */
  created_at: string;
}

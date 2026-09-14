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
  /** Active project assignments for this delegate (may be an empty array). */
  projects: ProjectSummary[];
}

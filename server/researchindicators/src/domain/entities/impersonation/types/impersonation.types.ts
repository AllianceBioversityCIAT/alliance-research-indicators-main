// @akili-spec changes/profile-simulation
import { ImpersonationEndReasonEnum } from '../enum/impersonation-end-reason.enum';

/**
 * `sec_roles` row shape read via raw SQL (OQ-5, T-01 DESCRIBE on dev
 * 2026-08-25). `role_id` mirrors `sec_role_id` so the shape matches what
 * the client `Role` interface reads from `sec_user_roles.role_id`.
 */
export interface ImpersonationRole {
  role_id: number;
  sec_role_id: number;
  focus_id: number;
  name: string;
  is_active: boolean;
  justification_update: string | null;
}

/** `sec_user_roles` row joined with its `sec_roles` definition. */
export interface ImpersonationUserRoleEntry {
  is_active: boolean;
  user_id: number;
  role_id: number;
  role: ImpersonationRole;
}

/**
 * Full target profile shape, as returned by `findProfile`/`start` and
 * stored client-side as `dataCache().user` (R-IMP-002). Mirrors
 * `sec_users` columns plus the full `user_role_list`.
 */
export interface TargetProfile {
  sec_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  status_id: number;
  user_role_list: ImpersonationUserRoleEntry[];
}

/** Minimal actor identity, as returned by GET /current (R-IMP-004). */
export interface ImpersonationActorSummary {
  sec_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/** Raw row shape produced by `ImpersonationUserRepository.searchUsers`. */
export interface ImpersonationUserRow {
  sec_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles: { role_id: number; name: string }[];
}

export type ImpersonationBlockedReason = 'system_admin' | 'inactive' | 'self';

/** `searchUsers` result row (R-IMP-001), decorated with `simulable`. */
export interface ImpersonationUserSearchResult extends ImpersonationUserRow {
  simulable: boolean;
  blocked_reason?: ImpersonationBlockedReason;
}

/** Session fields surfaced to API consumers (never the full entity). */
export interface ImpersonationSessionSummary {
  session_id: string;
  started_at: Date;
  expires_at: Date;
  ended_at?: Date;
  end_reason?: ImpersonationEndReasonEnum;
}

export type ImpersonationResolveState =
  | 'valid'
  | 'ended'
  | 'expired'
  | 'invalid';

/** Result of `ImpersonationService.resolve` (§5 "Resolve on every request"). */
export interface ResolveResult {
  state: ImpersonationResolveState;
  target?: TargetProfile;
  session?: ImpersonationSessionSummary;
}

/** Result of `ImpersonationService.start`. */
export interface StartResult {
  session: ImpersonationSessionSummary;
  user: TargetProfile;
}

/** Result of `ImpersonationService.current`. */
export interface CurrentResult {
  active: boolean;
  session?: ImpersonationSessionSummary;
  actor?: ImpersonationActorSummary;
  user?: TargetProfile;
}

/** Input for `ImpersonationService.logAction` (R-IMP-005). */
export interface LogActionInput {
  session_id: string;
  method: string;
  route_pattern: string;
  path: string;
  status_code: number;
  result_official_code?: number;
}

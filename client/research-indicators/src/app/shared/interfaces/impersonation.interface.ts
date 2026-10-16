// @akili-spec changes/profile-simulation
import { UserCache } from './cache.interface';

/** Row shape for `GET /api/impersonation/users` (R-IMP-001, design §4). */
export interface ImpersonationUserRow {
  sec_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles: { role_id: number; name: string }[];
  simulable: boolean;
  blocked_reason?: 'system_admin' | 'inactive' | 'self';
}

/** `{session_id, started_at, expires_at}` as returned by `/start` (design §4). */
export interface ImpersonationSessionInfo {
  session_id: string;
  started_at: string;
  expires_at: string;
}

/** Full session summary returned by `/end` (superset of the design table — T-04 review note). */
export interface ImpersonationSessionSummary extends ImpersonationSessionInfo {
  ended_at?: string;
  end_reason?: 'manual' | 'expired' | 'superseded' | 'logout';
}

/** Minimal actor identity surfaced by `GET /current` (design §4). */
export interface ImpersonationActorSummary {
  sec_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * `TargetProfileDto` (server, D-imp-16) — the client `UserCache` shape
 * minus `roleName`, which the client computes via the preferred-role rule.
 */
export type ImpersonationTargetProfile = Omit<UserCache, 'roleName'>;

/** `POST /api/impersonation/start` response data. */
export interface ImpersonationStartResponse {
  session: ImpersonationSessionInfo;
  user: ImpersonationTargetProfile;
}

/** `GET /api/impersonation/current` response data. */
export type ImpersonationCurrentResponse =
  | { active: false }
  | {
      active: true;
      session: ImpersonationSessionInfo;
      actor: ImpersonationActorSummary;
      user: ImpersonationTargetProfile;
    };

/** `POST /api/impersonation/end` response data. */
export type ImpersonationEndResponse = ImpersonationSessionSummary;

/**
 * Shape persisted under `localStorage['impersonation']` while a simulation
 * is active (design §5 "Client storage rule"). `actor` is the FULL admin
 * `UserCache` snapshot captured at `start()` time (not the minimal
 * `ImpersonationActorSummary` `/current` returns) so `end()` can restore
 * every field the admin session needs (`roleName`, `user_role_list`, …).
 */
export interface ImpersonationStoredState {
  session: ImpersonationSessionInfo;
  actor: UserCache;
}

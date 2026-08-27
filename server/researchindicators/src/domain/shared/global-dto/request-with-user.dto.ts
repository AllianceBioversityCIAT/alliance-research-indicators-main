// @akili-spec changes/profile-simulation
import { Request } from 'express';
import { RequestAuthType } from '../enum/request-auth-type.enum';

/**
 * How `req.user` was established by `JwtMiddleware.use` (design §2.2/§5).
 * `'bypass'` is `ENV.LOCAL_AUTH_BYPASS` (local dev only); `'machine'` is the
 * base64 `{client_id, client_secret}` token path; `'jwt'` is a ROAR-issued
 * Bearer token.
 */
export type ImpersonationCredential = 'jwt' | 'machine' | 'bypass';

/**
 * Effective identity attached to the request by any of the three
 * `JwtMiddleware` branches. Deliberately loose (index signature) — the
 * three sources (`AppSecretsService.validation`, `RoarManagementService
 * .validateToken`, the bypass literal, and the impersonation target swap)
 * all produce slightly different supersets of `User`; only `sec_user_id`
 * and `roles` are load-bearing for `applyImpersonation` and the existing
 * guards (`RolesGuard`, `ResultOwnerGuard`, `CurrentUserUtil`).
 */
export interface RequestUser {
  sec_user_id: number;
  roles: number[];
  [key: string]: any;
}

/**
 * `req.impersonation` state set by `applyImpersonation` (design §5 step
 * 6/7). `invalid: 'ended'` marks the actor's own ended/expired session,
 * tolerated only on `/impersonation/end` and `/impersonation/current`.
 */
export interface RequestImpersonationState {
  session_id: string;
  invalid?: 'ended';
}

/**
 * Replaces the middleware's former local `RequestWithCustomAttrs`.
 * `user` is always the *effective* identity (target, while simulating);
 * `actor` is the real admin identity, set only while a session header is
 * honoured (design §2.1/§5).
 */
export interface RequestWithUser extends Request {
  user: RequestUser;
  actor?: RequestUser;
  impersonation?: RequestImpersonationState;
  credential: ImpersonationCredential;
  /** Stamped by JwtMiddleware — see `request-auth-type.enum.ts` (cross-platform-duplicate-resolution spec). */
  authType?: RequestAuthType;
}

// @sdd-spec results/cross-platform-duplicate-resolution

/**
 * How the current request was authenticated.
 *
 * `JwtMiddleware` accepts three kinds of principal and, before this marker
 * existed, set `request.user` to a shape-identical object for all of them — a
 * `sec_users` row with a `roles` array. Nothing downstream could tell a partner
 * integration's machine token from a person's ROAR session, so a guard that
 * needed to distinguish them had nothing to read.
 *
 * That mattered because `app_secret_host_list` is an origin allowlist for the
 * whole token, and a secret with **zero** host rows skips the origin check
 * entirely — so a machine token whose responsible user holds `SYSTEM_ADMIN`
 * satisfies `@Roles(SYSTEM_ADMIN)` from any origin.
 */
export enum RequestAuthType {
  /** A person's ROAR session token. */
  ROAR_JWT = 'ROAR_JWT',
  /** A partner integration's base64 `{client_id, client_secret}` token. */
  MACHINE_TOKEN = 'MACHINE_TOKEN',
  /** `ARI_LOCAL_AUTH_BYPASS` — local development only, never a deployed environment. */
  LOCAL_BYPASS = 'LOCAL_BYPASS',
}

/** Request property carrying {@link RequestAuthType}. */
export const REQUEST_AUTH_TYPE_KEY = 'authType';

/**
 * Read scope for the `by-user` and `history` endpoints.
 *
 * MANAGED (default) — the historical behaviour: only the projects the queried
 * user manages, as Principal Investigator or as an active delegate.
 *
 * ALL — the administrator view: every project in `agresso_contracts` and every
 * active delegation in `pi_delegates`, regardless of who the caller is.
 * Reserved for SYSTEM_ADMIN and CENTER_ADMIN — the service throws 403 for
 * anyone else, so the parameter can never widen a normal user's result set.
 */
export enum PiDelegateScopeEnum {
  MANAGED = 'managed',
  ALL = 'all',
}

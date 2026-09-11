# Proposal — Center Admin Re-Sync (bilateral module)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/center-admin-resync` |
| Parent Spec | `bilateral/prms-sync` (see [`../family.md`](../family.md)) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-08-21 |
| Depends on | `prms-sync/sync-engine` |
| Slug | `center-admin-resync` — derived from free-text argument |

## 2. Intent

Center Admins can see each eligible result's PRMS sync status from the bilateral administration surface and manually re-trigger the sync for results whose push failed (or never happened), so a transient Normalizer failure never strands a result.

## 3. Problem / Current Behavior

- After child 2, a failed sync leaves the result in `FAILED` with no recovery path other than re-opening the result and clicking again — invisible at scale.
- The bilateral admin module (Center Admin → Bilateral Mapping / AGRESSO Pool Funding surfaces) has no notion of sync state.

## 4. Proposed Outcome

- Sync-status visibility (badge column + filter) on the agreed bilateral admin surface — exact host screen decided at specify (Bilateral Mapping table vs a small dedicated "PRMS Sync" list; mockup Image #60 arbitrates).
- **Re-sync action** per row for `FAILED`/eligible-unsynced results, reusing the child-1 endpoint (same guards; `centerAdminGuard` client-side, `@Roles(CENTER_ADMIN, …)` server-side — SYSTEM_ADMIN bypasses by design).
- Server: at most a thin list/aggregate endpoint (status + last attempt + error summary per result, paginated); **no new sync logic** — the engine is the only writer.
- Attempt history stays auditable (log table from child 1); the UI shows last outcome + timestamp, not the raw payloads.

## 5. Scope

Client: bilateral admin surface changes + tests. Server: read/list endpoint only (+ Swagger + tests) if the existing list endpoints can't carry the fields.

## 6. Non-Goals

- No PI panel (child 4). No automatic retries/cron. No editing of sync payloads. No un-sync.

## 7. Affected Users, Systems, And Specs

Center Admins (new operational capability); bilateral admin pages; child-1 endpoint (second consumer — its idempotency/guards get exercised from a second surface).

## 8. Visual Reference

- Source: User-provided mockup (**Image #60**) may cover this surface — re-share to persist under `../mockup/`. Otherwise offer generated mockup at `/akili-specify`.

## 9. Requirement Delta Preview

### ADDED
- Sync-status column/filter + re-sync action for Center Admins; sync-status list endpoint (if needed).

### MODIFIED
- Bilateral admin surface layout (one column + one action).

### REMOVED
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | Extend the existing bilateral admin table with status + retry | Zero new navigation; smallest surface |
| B | New dedicated "PRMS Sync" admin page | Cleaner separation but new route/screen for a thin list; only if the mockup demands it |

## 11. Risks, Dependencies, And Open Questions

Blocked by `sync-engine`. OQ: which exact admin screen hosts it (mockup). Risk: re-sync of an already-accepted result must stay a 409 no-op (engine idempotency), so a stale table can't double-push.

## 12. Success Criteria

- A Center Admin can find every `FAILED` result of their scope in ≤ 2 clicks and re-sync it; success updates the row without reload.
- Non-center-admins never see the action (client) and are rejected server-side (test both, KZ-017-aware).

## 13. Next Step

```text
/akili-specify bilateral/prms-sync/center-admin-resync
```

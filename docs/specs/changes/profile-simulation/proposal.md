# Proposal — Profile Simulation (User Impersonation) for System Admins

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `changes/profile-simulation` |
| **Slug** | `profile-simulation` — derived from the free-text argument ("User Impersonation / Profile Simulation"); the full text is proposal context, not a directory name |
| **Type** | **Change** (new capability, both tiers) |
| **Approval Mode** | `gated` (default) |
| **Depends on** | none |
| **Parallel-safe** | **no** — touches `JwtMiddleware`, `CurrentUserUtil`, the navbar and `CacheService`, which every other client/server spec also relies on |
| **Source** | Jira **PARI-242** (branch `JuankCadavid/PARI-242`); requirement text pasted by the user |
| **Date** | 2026-08-25 |

## Intent

Let a **System Admin** operate STAR *as* another existing user — same roles, projects, results, dashboards and write behaviour — from the account menu, with an unmistakable "simulation active" state, a one-click exit, and a server-side audit trail of who simulated whom, when, and what they changed.

## Problem / Current Behavior

- Admins hold `SYSTEM_ADMIN`, which **bypasses every role check** server-side (`RolesGuard`, `roles.guard.ts:30`) and unlocks every feature client-side (`RolesService.isSystemAdmin`). Their view is structurally different from any reporter's, so user-reported bugs about visibility, permissions or project scope often cannot be reproduced.
- The only workarounds today are asking for credentials or maintaining throwaway accounts — both slow and both a security smell.
- There is **no notion of "acting on behalf of"** anywhere: `request.user` (set once in `JwtMiddleware`) *is* the actor, and `AuditableEntity.created_by/updated_by` record only that single id.

Relevant existing pieces (verified 2026-08-25):

| Piece | Where | Relevance |
| --- | --- | --- |
| JWT validation → `request.user` | `server/.../shared/middlewares/jwr.middleware.ts` | Single choke point where an effective user can be swapped |
| `CurrentUserUtil` (request-scoped, already supports a "system user" override) | `shared/utils/current-user.util.ts` | Audit fields derive from it — natural place for `actor` vs `effective user` |
| `sec_users` table (same MySQL DB, owned by ROAR) | joined in `result-status-workflow.repository.ts:95`, `gloabl-queries.const.ts:10` | User directory for search — **read-only from ARI** |
| Login / refresh / `authorization/users/current` | client `api.service.ts:135-142,1026` → `managementApiUrl` (ROAR) | Identity comes from ROAR; ARI cannot mint a ROAR token for someone else |
| Account dropdown | `client/.../alliance-navbar.component.html` | Where "Simulate another profile" goes |
| `CacheService.dataCache().user` + `RolesService` computed signals | `shared/services/cache/` | The client's whole role model reads from one signal — swapping it swaps the experience |
| `jWtInterceptor` | `shared/interceptors/jwt.interceptor.ts` | Where an impersonation header would be attached to every ARI request |

## Proposed Outcome

1. A System Admin sees **"Simulate another profile"** in the account dropdown; nobody else does (and the backend refuses it for anyone else regardless).
2. They search by email/name, see name · email · id · roles, and cannot pick other System Admins or inactive accounts.
3. A confirmation states plainly that writes hit the simulated user's real data and that the session is audited.
4. After confirming, every ARI API call and every client-side role check behaves as the simulated user. Writes are stored **attributed to the simulated user** in `created_by/updated_by` (so the data looks exactly as if they did it), **and** the impersonation session id is recorded so the admin remains traceable.
5. A persistent banner shows the simulated identity and an **End simulation** button; logout, token expiry, or a new tab without the session state all drop back to the admin.
6. Nested simulation is impossible (the option is hidden and the server rejects a simulation header from an already-simulated request).

## Scope

| In | Out |
| --- | --- |
| Server: `POST /api/v1/impersonation/start`, `POST …/end`, `GET …/users?search=` (SYSTEM_ADMIN only) | Changing ROAR / Cognito, minting tokens for other users |
| Server: `impersonation_sessions` table (admin id, target id, started/ended at, reason?) + migration | Impersonating *from* the `/admin` SSR panel |
| Server: `JwtMiddleware` honours `X-Impersonation-Session: <id>` **only** when the JWT user is SYSTEM_ADMIN and the session is open and belongs to them; swaps `request.user`, keeps `request.actor` | Allowing `CENTER_ADMIN` / `TECHNICAL_SUPPORT` to simulate (open question below) |
| Server: audit — `CurrentUserUtil` exposes `actor`; mutation log (method, path, result id, session id) for writes during a session | Full field-level diffing of every change (existing audit columns already cover *what* rows) |
| Client: dropdown entry, search dialog, confirm dialog, banner, `ImpersonationService` (signal + `localStorage`), interceptor header, `End simulation` | Simulating across other frontends (TIP, PRMS) |
| Client: swap `dataCache().user` with the target's profile (`authorization/users/current` equivalent served by ARI for the target) so `RolesService` / guards mirror the target | Socket impersonation beyond re-connecting with the same header (verify in specify) |
| Tests: middleware allow/deny matrix, nested rejection, audit attribution, navbar visibility per role | — |

## Non-Goals

- Not a second identity provider; the admin's own ROAR JWT stays the only credential in flight.
- Not a "view as" read-only mode — the requirement explicitly wants writes to behave as the user's.
- Not a general delegation/proxy feature for non-admin roles.

## Affected Users, Systems, And Specs

| Affected | Detail |
| --- | --- |
| System Admins | Primary users |
| Simulated users | Their data can change; they see nothing different (audit only) |
| `JwtMiddleware`, `RolesGuard`, `ResultStatusGuard`, `ResultOwnerGuard` | Must all read the *effective* user — verify nothing else caches `request.user` |
| `CurrentUserUtil` and every `audit()` caller | Attribution semantics extended |
| Navbar, `CacheService`, `RolesService`, `jWtInterceptor`, `centerAdminGuard`, WebSocket service | Client mirror of the swapped identity |
| TRD §10 (Security), design.md §8 components + §12 decisions | Docs to update at archive |
| Kaizen | **KZ-002** — enumerate by *what renders* the role (navbar, sidebar, section-header, all modals), not by feature folder |

## Visual Reference

- Source: **Generated mockup (claude-design)**
- Location: `docs/specs/changes/profile-simulation/mockup/` — working artboards `Main.dc.html` (account menu), `SearchUser.dc.html`, `Confirm.dc.html`, `ActiveSimulation.dc.html`, `canvas.json`; assembled canvas `star-profile-simulation.html`. Live canvas: <https://claude.ai/code/artifact/385d7c04-1da0-4eb4-a1ca-46d4cb4cf4b4>
- Notes: four static screens matching the real navbar/dropdown (`#173f6f`, Space Grotesk / Barlow, 290 px dropdown, 12 px radii). Banner uses `--ac-orange-1` to stay distinct from the red "Testing Environment" badge and the red Log out. Confirmation uses a red data-impact callout. Avatar swaps to the simulated user's initials with an orange ring.

## Requirement Delta Preview

### ADDED Requirements

- Account menu option "Simulate another profile", visible and callable only for `SYSTEM_ADMIN`.
- User search endpoint over `sec_users` (email/name, ≥3 chars, excludes admins/inactive), returning name, email, id, roles.
- Explicit confirmation dialog with a data-impact warning before the session starts.
- Server-side impersonation session: start/end endpoints, persisted record (admin, target, timestamps), automatic close on logout/expiry.
- Every ARI request carrying a valid session header resolves `request.user` to the target; `request.actor` stays the admin.
- Persistent banner + End simulation control; avatar/account panel reflect the simulated user.
- Audit: writes attributed to the target in `created_by/updated_by`; session id and actor logged per mutation.
- Nested simulation rejected client- and server-side.

### MODIFIED Requirements

- `JwtMiddleware` / `CurrentUserUtil`: identity resolution gains an "effective vs actor" distinction.
- `jWtInterceptor`: attaches the session header to ARI-bound requests when a simulation is active.
- `ActionsService.logOut()`: ends any open simulation first.

### REMOVED Requirements

- None.

## Approach Options

| Option | How | Pros | Cons |
| --- | --- | --- | --- |
| **A — Server-side session + header (recommended)** | Admin keeps their own JWT; ARI stores an `impersonation_sessions` row and the client sends `X-Impersonation-Session`. `JwtMiddleware` validates JWT → checks SYSTEM_ADMIN → loads session → swaps `request.user`. | No change to ROAR/Cognito; session is revocable and auditable server-side; nested/forged use rejected centrally; smallest blast radius (one middleware, one util). | Client must fetch the target's profile from ARI (new endpoint reading `sec_users` + `user_roles`); WebSocket handshake must forward the header. |
| B — ROAR issues an impersonation token | Ask ROAR Management for a token whose subject is the target and whose claims name the actor. | Cleanest identity story; every consumer (TIP, sockets) works unchanged. | Requires a change in an external system we don't own; timeline unknown; audit split across two systems. |
| C — Client-only swap | Client fetches target profile and swaps `dataCache().user`; API calls still run as admin. | Trivial to build. | **Fake**: server still sees SYSTEM_ADMIN, so visibility/permission bugs are *not* reproduced and writes are mis-attributed. Fails the core hypothesis. Rejected. |

## Recommended Approach

**Option A.** It is the smallest change that makes the *server* — where every trust decision is actually made (TRD §10.1) — behave as the simulated user, keeps the admin's real credential as the only secret, and gives us a first-class, revocable audit record. Attribution rule: `created_by/updated_by = target` (data must look as if the user did it), `impersonation_session_id` on a mutation log = traceability to the admin.

## Risks, Dependencies, And Open Questions

| # | Item | Type |
| --- | --- | --- |
| R1 | Any code path that reads `req.user` *before* the middleware swap, or caches user identity per process (e.g. socket rooms keyed by `sec_user_id`), will leak the admin identity. Enumerate with `codegraph_callers(CurrentUserUtil)` + grep `request.user`/`req.user` during specify. | Risk |
| R2 | `sec_users` is ROAR-owned; ARI must stay read-only and must not assume columns beyond those already joined (`sec_user_id`, `first_name`, `last_name`, `email`, `is_active`). Verify `user_roles` linkage for role display. | Dependency |
| R3 | `SYSTEM_ADMIN` bypass in `RolesGuard` disappears while simulating (by design) — but `ResultOwnerGuard`/`ResultStatusGuard` semantics for the target must be confirmed, not assumed (KZ-001: assert on the guard's real decision). | Risk |
| R4 | Migrations are not applied by the pipeline (K-015); the new table needs a human-applied migration in dev before testing. | Dependency |
| OQ1 | Should `TECHNICAL_SUPPORT` (7) also be allowed to simulate? Requirement says System Admin only — proposal follows that. | Open question |
| OQ2 | Session TTL: fixed (e.g. 2 h) or bound to the admin's JWT expiry only? Proposal assumes JWT expiry + explicit end. | Open question |
| OQ3 | Should the simulated user be notified/able to see that they were simulated (e.g. in their profile)? Out of scope unless product says otherwise. | Open question |
| OQ4 | Do we need a free-text "reason" on start for the audit record? Cheap to add; recommend yes. | Open question |

## Success Criteria

- A System Admin can start a simulation in ≤ 3 clicks from the dropdown and end it in 1.
- While simulating, `GET /api/v1/…/my-projects`-style endpoints return exactly the target's data (asserted on the response, not the mock).
- A write during simulation stores `created_by = target` **and** an audit row with `actor = admin`, `session_id`.
- Non-admin JWT + valid session header → `403`; admin + closed/foreign session → `403`; simulated request + start → `409`.
- Navbar entry is absent for non-admins (component test per KZ-002 on the navbar itself).

## Next Step

```text
/akili-specify changes/profile-simulation
```

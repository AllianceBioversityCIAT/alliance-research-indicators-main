# Requirements — Changes / Profile Simulation (User Impersonation)

- **Module:** auth (cross-cutting: `shared/middlewares`, `shared/utils`, new `entities/impersonation`; STAR navbar + auth plumbing)
- **Spec id:** 2026-08-profile-simulation
- **Status:** approved (2026-08-25, gated)
- **Owner:** Juan Carlos Cadavid
- **Depth:** Full (auth, new table + migration, cross-cutting middleware, both packages)
- **Type:** Change · **Approval Mode:** gated
- **Linked PRD section:** `docs/prd.md` §3.4 System Admin persona, §6 US-SA-*, §5.2 "Custom AuthZ engine" non-goal (authorization stays backend-enforced — this spec respects it)
- **Linked proposal:** ./proposal.md (approved 2026-08-25)
- **Linked tickets:** PARI-242
- **Last updated:** 2026-08-25

---

## 1. Context

System Admins hold `SYSTEM_ADMIN`, which bypasses every server role check and unlocks every client feature, so they cannot reproduce what a Contributor, MEL Expert or Center Admin actually sees. This spec adds **profile simulation**: an admin picks an existing STAR account and, until they end the simulation, every ARI request and every client role decision is made **as that user**, with writes attributed to that user and an audit trail tying the session back to the admin.

**Not changing:** ROAR/Cognito authentication (the admin's own JWT remains the only credential), the `/admin` SSR panel, other frontends (TIP/PRMS), and the `ServerResponseDto` envelope.

**Identity facts this spec relies on (verified 2026-08-25):** `JwtMiddleware` sets `request.user` once per request; `CurrentUserUtil` derives audit ids from it; `sec_users` / `sec_user_roles` / `sec_roles` live in ARI's MySQL and are already read (never written) by ARI; the client's whole role model reads `CacheService.dataCache().user` through `RolesService`.

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Actor** | The authenticated System Admin whose JWT is on the request |
| **Target / simulated user** | The `sec_users` account being simulated |
| **Effective user** | Whom the server treats as `request.user` for authorization and audit: the target while a valid session header is present, else the actor |
| **Simulation session** | Server-side record (`impersonation_sessions`) that authorizes one actor→target simulation for a bounded time |
| **Session header** | `X-Impersonation-Session: <session_id>` sent by the client on ARI requests while simulating |

---

## 3. Functional requirements

Numbering: `R-IMP-NNN`. Server first (foundational), then client.

### R-IMP-001 — Search simulable users

- **As a** System Admin
- **I want** to search STAR accounts by email or name
- **So that** I can find the exact account to simulate

**Details:**
- Inputs: `GET /api/impersonation/users?search=<text>`; `search` trimmed, min 3 chars, max 100.
- Behavior: case-insensitive `LIKE` over `sec_users.email`, `first_name`, `last_name`; max 20 rows ordered by email; each row carries `sec_user_id`, `first_name`, `last_name`, `email`, `is_active`, `roles[] {role_id, name}` and a computed `simulable: boolean` with `blocked_reason` (`'system_admin' | 'inactive' | 'self'`) when false.
- Outputs: `200`, data `ImpersonationUserDto[]`.
- Errors: `400` when `search` < 3 chars; `403` for any effective user without `SYSTEM_ADMIN`; `403` when the request itself carries a session header (see R-IMP-003).
- Permissions: `@Roles(SYSTEM_ADMIN)` — and because `RolesGuard` auto-passes `SYSTEM_ADMIN`, the guard alone is the gate.

#### Scenario: Match found
- GIVEN an admin with a valid JWT and no session header
- WHEN they query `search=rojas`
- THEN `200` with every `sec_users` row whose email/first/last name contains "rojas"
- AND rows of other System Admins, inactive users and the admin themself are returned with `simulable=false` and a `blocked_reason`
- BUT it must NOT return more than 20 rows
- AND IT MUST reject `search=ro` with `400`.

#### Scenario: Non-admin
- GIVEN a Contributor JWT
- WHEN they call the endpoint
- THEN `403` via the standard envelope.

**Acceptance criteria:**
- [ ] AC.1 — `search=rojas` returns ≤ 20 rows, each with `simulable` and roles.
- [ ] AC.2 — A `SYSTEM_ADMIN` target row has `simulable=false, blocked_reason='system_admin'`.
- [ ] AC.3 — Contributor JWT → `403`; `search=ro` → `400`.

---

### R-IMP-002 — Start a simulation session

- **As a** System Admin
- **I want** to start a simulation of one selected account
- **So that** the platform behaves as that user from now on

**Details:**
- Inputs: `POST /api/impersonation/start` body `{ target_user_id: number, reason?: string (≤ 500) }`.
- Behavior: validates the target is active, exists, is not a `SYSTEM_ADMIN`, is not the actor; closes any still-open session of the same actor (one open session per actor); inserts `impersonation_sessions` row (`actor_user_id`, `target_user_id`, `reason`, `started_at`, `expires_at = now + TTL`); returns the session and the **target profile** in the **full** shape the client stores as `dataCache().user` (`sec_user_id, first_name, last_name, email, is_active, status_id, user_role_list[{is_active, user_id, role_id, role:{role_id, sec_role_id, focus_id, name, is_active, justification_update}}]` — the role sub-fields are what `RolesService` reads for Center Admin access).
- Outputs: `201`, data `{ session: { session_id, started_at, expires_at }, user: TargetProfileDto }`.
- Errors: `400` invalid body; `403` non-admin; `404` target not found or inactive; `409` target is a System Admin or is the actor; `409` when the request carries a session header (nested).
- Permissions: `@Roles(SYSTEM_ADMIN)`.

#### Scenario: Happy path
- GIVEN admin A and active Contributor M
- WHEN A posts `{target_user_id: M}`
- THEN `201` with a `session_id` and M's profile including `user_role_list`
- AND an `impersonation_sessions` row exists with `actor=A, target=M, ended_at=NULL`
- BUT it must NOT leave two open sessions for A (a previous open one is ended with `end_reason='superseded'`)
- AND IT MUST refuse with `409` when the target holds `SYSTEM_ADMIN`.

#### Scenario: Nested attempt
- GIVEN a request that already carries a valid `X-Impersonation-Session`
- WHEN `/start` is called
- THEN `409` "Nested simulation is not allowed" (the effective user is a non-admin anyway, so `403` would also fire; the middleware must reject with `409` **before** the role guard so the reason is explicit).

**Acceptance criteria:**
- [ ] AC.1 — `201` payload + DB row as above.
- [ ] AC.2 — `409` for admin target, self target, nested call; `404` for inactive/unknown target.
- [ ] AC.3 — Starting twice ends the first session with `end_reason='superseded'`.

---

### R-IMP-003 — Effective identity resolution

- **As a** System Admin in simulation
- **I want** every ARI request that carries my session header to be authorized and audited as the target
- **So that** what I see and change is exactly what the target would see and change

**Details:**
- Inputs: any request to `/api/*` with `Authorization: Bearer <admin ROAR JWT>` and `X-Impersonation-Session: <id>`.
- Behavior (after JWT validation, before any guard):
  1. No header → unchanged behaviour.
  2. Header present and the JWT user is **not** `SYSTEM_ADMIN` → `403 'Impersonation not allowed'`.
  3. Header present but the credential is a machine token → `403`.
  4. Session not found, `ended_at` set, `expires_at` past, or `actor_user_id ≠` JWT user → `403 'Impersonation session invalid'` with response header `X-Impersonation-Error: SESSION_INVALID` (the envelope's `errors` stays a string; machine-readable codes travel in that header).
  5. Otherwise `request.user` = target profile (`sec_user_id, first_name, last_name, email, roles[]` from `sec_users`+`sec_user_roles`), `request.actor` = the JWT user, `request.impersonation = { session_id }`.
- All existing guards (`RolesGuard`, `ResultOwnerGuard`, `ResultStatusGuard`) and `CurrentUserUtil.user/user_id/roles/audit()` read the effective user with **no change** to their logic.
- Outputs: none of its own.
- Errors: as above; `/impersonation/start` and `/impersonation/users` with a header → `409`/`403` per R-IMP-001/002.

#### Scenario: Visibility
- GIVEN M can access 2 projects and A (admin) can access all
- WHEN A calls the my-projects endpoint with M's session header
- THEN the response lists exactly M's 2 projects
- AND IT MUST evaluate `RolesGuard` against M's roles (the `SYSTEM_ADMIN` bypass does not apply).

#### Scenario: Write attribution
- GIVEN the same session
- WHEN A creates a result
- THEN `results.created_by = M.sec_user_id`
- AND an `impersonation_actions` row exists for that request (R-IMP-005)
- BUT it must NOT write A's id anywhere in the domain row's audit columns.

#### Scenario: Forged / foreign session
- GIVEN admin B sends admin A's `session_id`
- WHEN any endpoint is called
- THEN `403` with header `X-Impersonation-Error: SESSION_INVALID`.

**Acceptance criteria:**
- [ ] AC.1 — Middleware unit matrix: no header / non-admin+header / machine token+header / unknown / ended / expired / foreign / valid → expected outcome for each.
- [ ] AC.2 — With a valid header, `request.user.sec_user_id === target` and `request.actor.sec_user_id === admin`.
- [ ] AC.3 — e2e: a mutation during simulation stores `created_by = target`.
- [ ] AC.4 — Enumeration of `req.user`/`request.user`/`request['user']` readers outside the middleware is recorded in `design.md` and each is confirmed to read the effective user (KZ-002: enumerate by *what reads the identity*, not by feature folder).

---

### R-IMP-004 — End, inspect and auto-expire a session

- **As a** System Admin
- **I want** to end the simulation immediately, and have it end by itself on logout/expiry
- **So that** I can never be left silently acting as someone else

**Details:**
- Inputs: `POST /api/impersonation/end` (body empty; session identified by the header); `GET /api/impersonation/current` (header optional).
- Behavior:
  - `/end`: sets `ended_at=now, end_reason='manual'`; idempotent (`200` even if already ended); callable by the actor only.
  - `/current`: returns `{ active: false }` without a header, or `{ active: true, session, actor: {sec_user_id, first_name, last_name, email}, user: TargetProfileDto }` with a valid one — used by the client to rehydrate after reload.
  - Expiry: `expires_at = started_at + ARI_IMPERSONATION_TTL_MINUTES` (env, default `240`); a request after expiry is `403` (R-IMP-003) and the row is lazily marked `end_reason='expired'`.
  - Logout: the client calls `/end` before clearing tokens (R-IMP-011); the server additionally treats an invalid/expired ROAR JWT as "session unusable" simply because the JWT check fails first.
- Errors: `/end` without header → `400`; `/end` by someone other than the actor → `403`.

#### Scenario: Manual end
- GIVEN an active session
- WHEN the actor posts `/end`
- THEN `200` and the row has `ended_at` set
- AND the next request with the same header (any route other than `/end`/`/current`) is `403` + `X-Impersonation-Error: SESSION_INVALID`
- BUT it must NOT accept `/end` from a different admin for that session (`403`).

#### Scenario: Expiry
- GIVEN a session started 241 minutes ago (TTL 240)
- WHEN any request carries its header
- THEN `403` and the row is marked `end_reason='expired'`.

**Acceptance criteria:**
- [ ] AC.1 — `/end` twice → `200`, `200`; row ended once.
- [ ] AC.2 — `/current` reflects `active` correctly in both states.
- [ ] AC.3 — Expired session → `403` + `end_reason='expired'`.

---

### R-IMP-005 — Audit trail

- **As a** Security reviewer
- **I want** every simulation and every mutating request inside it recorded
- **So that** any change can be traced to the admin who actually made it

**Details:**
- Behavior: `impersonation_sessions` holds start/end/reason/actor/target. `impersonation_actions` gets one row per **non-GET** request served under a session: `session_id, method, route_pattern (≤ 255), path (resolved URL ≤ 512), status_code, result_official_code (nullable, from the `:resultCode` path token — the official code, not `result_id`), created_at`. Written by a dedicated interceptor from the handler's returned status or the thrown exception's status (so `status_code` is real on both success and error paths), never blocking the response on a logging failure (log via `LoggerUtil` at `error` and continue).
- Retention: rows are never deleted by the app (append-only).
- Read access: no read endpoint in this spec — SQL/admin access only (OQ-3).

#### Scenario: Mutation logged
- GIVEN an active session
- WHEN `PATCH /api/results/123/general-information` returns `200`
- THEN one `impersonation_actions` row exists with `method='PATCH'`, `status_code=200`, `result_official_code=123`
- AND a mutation that throws `409` logs `status_code=409`
- BUT it must NOT log `GET` requests
- AND IT MUST still return the handler's response when the audit insert throws (failure logged).

**Acceptance criteria:**
- [ ] AC.1 — Interceptor unit test: non-GET under session → insert called with the right fields; GET → not called; insert rejects → response unchanged + `LoggerUtil.error` called.
- [ ] AC.2 — e2e: one row per mutation, none for reads.

---

### R-IMP-006 — Client: entry point in the account menu

- **As a** System Admin
- **I want** a "Simulate another profile" option in the account dropdown
- **So that** the capability is discoverable where my identity lives

**Details:**
- Visible only when `RolesService.isSystemAdmin()` is true **and** no simulation is active. Visual reference: mockup artboard 1 (`mockup/Main.dc.html`) — outlined primary-blue button above the red "Log out", same 290 px dropdown.

#### Scenario: Visibility
- GIVEN a logged-in Contributor
- WHEN the dropdown opens
- THEN the option is absent from the DOM
- AND IT MUST be present for a System Admin with no active simulation
- BUT it must NOT be present while a simulation is active (nested prevention).

**Acceptance criteria:**
- [ ] AC.1 — Navbar component test: absent for role 3, present for role 1, absent for role 1 + active session.

---

### R-IMP-007 — Client: user search dialog

- **As a** System Admin
- **I want** to search and pick an account with enough detail to be sure
- **So that** I don't simulate the wrong person

**Details:** Visual reference: artboard 2 (`mockup/SearchUser.dc.html`).
- Single text input (label "User email or name", required marker), debounced 300 ms, queries R-IMP-001 at ≥ 3 chars.
- States: **idle** (helper "Type at least 3 characters"), **loading** (skeleton rows / spinner in the input), **results** (count label "N matches", rows with initials avatar, name, `email · ID`, role chips, `Select`), **not-simulable rows** (greyed, chip in red for System Admin, action "Not allowed", disabled, tooltip = reason), **empty** ("No users match"), **error** (inline message + retry, envelope description shown).
- Escape / Cancel closes without side effects.

#### Scenario: Select
- GIVEN results for "rojas"
- WHEN the admin clicks `Select` on a simulable row
- THEN the confirmation dialog (R-IMP-008) opens with that user
- BUT it must NOT allow clicking `Not allowed` rows (button disabled, no handler).

**Acceptance criteria:**
- [ ] AC.1 — Component tests for the six states, driven by a mocked `ApiService` response (KZ-015: arrange the transition idle→loading→results, not the end state).
- [ ] AC.2 — Fewer than 3 chars never issues a request.

---

### R-IMP-008 — Client: confirmation before starting

- **As a** System Admin
- **I want** an explicit warning that actions will affect real data
- **So that** I never start a simulation by accident

**Details:** Visual reference: artboard 3 (`mockup/Confirm.dc.html`). Title "Start simulation as {name}?", target summary card, red callout "Actions affect real data" naming the admin and the target, `Cancel` / `Start simulation` (primary). While the start call is in flight the primary button shows a spinner and both buttons are disabled. On `201`: dialog closes and R-IMP-009 applies. On error: inline envelope description, dialog stays open.

#### Scenario: Confirm
- GIVEN the dialog for M
- WHEN `Start simulation` is clicked
- THEN `POST /impersonation/start` is called once with `{target_user_id: M}`
- AND on success the active-simulation state is entered
- BUT it must NOT call `/start` from `Cancel` or Escape.

**Acceptance criteria:**
- [ ] AC.1 — Component test: one call on confirm, zero on cancel; error keeps the dialog open with the message.

---

### R-IMP-009 — Client: active-simulation state

- **As a** System Admin in simulation
- **I want** the whole app to behave and look like the target's session, with an unmistakable indicator
- **So that** I reproduce the user's experience and never forget I'm simulating

**Details:** Visual reference: artboard 4 (`mockup/ActiveSimulation.dc.html`).
- **State:** an `ImpersonationService` holds `session {session_id, started_at, expires_at}`, `actor` (admin snapshot) and `active` signal; persisted in `localStorage` so a reload restores it (after re-validating with `/current`). While active, the persisted `data.user` is the **target** and the actor is kept separately, so a token refresh can never persist a half-swapped identity and ending always restores the admin.
- **Identity swap:** `dataCache().user` is replaced by the target profile from `/start` — carrying the **full** role shape (`role.focus_id`, `role.sec_role_id`, …) so `RolesService`, `centerAdminGuard`, `getInitials()`, `roleName` all reflect the target, including a simulated Center Admin keeping center-admin access. Tokens (`access_token`, `refresh_token`, `exp`) are **not** touched.
- **Header:** `jWtInterceptor` adds `X-Impersonation-Session` to ARI main-API requests only — never to ROAR calls (login/refresh/current-user, identified by the auth-call marker rather than by host, since `mainApiUrl` may equal `managementApiUrl`), file-manager, text-mining or document-overview hosts; a request retried after a token refresh keeps the header.
- **Banner:** 44 px bar above the navbar, background `--ac-orange-2` (new AA-compliant token), text "SIMULATION ACTIVE · You are viewing STAR as {name} ({email} · {role}). Changes you make are saved to this user's data.", right side "Started {HH:mm} · by {admin name}" and a white `End simulation` button. The platform content offset equals the **measured** navbar + banner height (today it is hardcoded `pt-[88px]/[109px]`; this spec binds it to the measurement).
- **Avatar / panel:** navbar avatar shows the target's initials with an orange ring; the dropdown header reads "Account · Simulated", shows an orange note "Simulated by {admin} (System Admin)", an orange `End simulation` button and `Log out (ends simulation)`.
- **Socket:** `WebsocketService.configUser` is re-run with the target's `sec_user_id`/name on start and with the admin's on end.
- **Responsive:** at height < 768 px (`hasSmallScreen()`) the banner text collapses to "Simulating {name}" + button.
- **a11y:** banner is `role="status"` `aria-live="polite"`; `End simulation` is keyboard-reachable and the first focusable element after the banner mounts.

#### Scenario: Behaves as target
- GIVEN M (Contributor) is simulated
- WHEN the admin opens My Projects and the Center Admin route
- THEN My Projects lists M's projects (server-side, via the header) and the Center Admin route is refused by `centerAdminGuard`
- AND IT MUST send the header on every ARI main-API request, including one retried after a 401 refresh
- BUT it must NOT send the header on ROAR auth calls (login / refresh-token / current-user).

#### Scenario: Reload
- GIVEN an active simulation and a page reload
- WHEN the app boots
- THEN `/current` is called with the stored header and, if `active`, the simulated state is restored
- AND IT MUST clear the stored state and show a toast "Simulation ended" when `/current` returns `active=false` or `403`.

**Acceptance criteria:**
- [ ] AC.1 — Interceptor test: header present on a plain main-API request and on its post-401 retry; absent on a request carrying the auth-call marker and on the three non-ARI hosts.
- [ ] AC.2 — `RolesService.isSystemAdmin()` is false while simulating a Contributor; `canAccessCenterAdmin()` is true while simulating a Center Admin.
- [ ] AC.3 — Banner renders with the target identity and `role="status"`; layout offset equals navbar + banner height (measured in a real browser at the HITL pause — jsdom cannot measure layout).
- [ ] AC.4 — Reload restore + invalid-session cleanup covered by service tests.

---

### R-IMP-010 — Client: ending the simulation

- **As a** System Admin
- **I want** to return to my own session in one click, and automatically on logout or when the server rejects the session
- **So that** I am never stranded as another user

**Details:**
- `End simulation` (banner or panel) → `POST /impersonation/end` → restore admin `user` into `dataCache`, clear the stored state, re-run socket `configUser` with the admin, navigate to `/home`, toast "Simulation ended — you are back as {admin}". If `/end` fails, restore locally anyway and log the error.
- `logOut()` first awaits `/end` (best effort, 3 s timeout) then proceeds as today.
- Any ARI response carrying `X-Impersonation-Error: SESSION_INVALID` triggers the same local restore + toast "Simulation expired" (and suppresses the generic 403 toast for that response).

#### Scenario: One-click end
- GIVEN an active simulation
- WHEN `End simulation` is clicked
- THEN the banner disappears, the avatar shows the admin's initials, `RolesService.isSystemAdmin()` is true
- AND IT MUST stop sending the header immediately
- BUT it must NOT clear `access_token` / `refresh_token`.

**Acceptance criteria:**
- [ ] AC.1 — Service test: end → state cleared, user restored, `/end` called once.
- [ ] AC.2 — `logOut()` calls `/end` before removing `data` from `localStorage`.
- [ ] AC.3 — A `403` response with `X-Impersonation-Error: SESSION_INVALID` auto-ends locally with exactly one toast.
- [ ] AC.4 — After end + reload, `localStorage['data'].user` is the admin (no stranded identity).

---

## 4. Non-functional requirements

### NFR-IMP-001 — Security: server is the only authority
- **Category:** security
- **Target:** Zero client-side path to an elevated or swapped identity without a server-validated session: the header is meaningless without a `SYSTEM_ADMIN` JWT **and** a matching open session row.
- **How verified:** middleware unit matrix (R-IMP-003 AC.1) + e2e forged/foreign session → `403`.

### NFR-IMP-002 — Security: no privilege escalation through simulation
- **Category:** security
- **Target:** A simulated Contributor can never perform an action the real Contributor cannot; a `SYSTEM_ADMIN` target is never simulable.
- **How verified:** e2e — same endpoint called as real M and as simulated M returns identical status codes for an allow and a deny case.

### NFR-IMP-003 — Performance
- **Category:** performance
- **Target:** Session resolution adds ≤ 15 ms p95 per request (one indexed PK read on `impersonation_sessions` plus one profile read joining `sec_user_roles`→`sec_roles`, no cache — D-imp-4); user search ≤ 500 ms p95 on the dev DB.
- **How verified:** timing logged in the middleware at `debug` level over 50 requests; **disqualifier:** if the 50 samples span more than 2× the median (shared dev DB noise) the number is not evidence — report the spread.

### NFR-IMP-004 — Observability
- **Category:** observability
- **Target:** `LoggerUtil` lines at `warn` for session start/end/expiry/rejection with `{actor_user_id, target_user_id, session_id, reason}`; never log tokens.
- **How verified:** unit tests assert the logger calls; grep the diff for `access_token` in log calls (must be zero hits).

### NFR-IMP-005 — a11y (client)
- **Category:** a11y
- **Target:** Banner and dialogs meet WCAG 2.1 AA: white on the mockup's `#f58220` is ≈ 2.59:1 and fails for 14 px text — therefore the banner MUST use a dedicated darker orange token with white text ≥ 4.5:1 (design: `--ac-orange-2 = #b3561a`, ≈ 4.9:1); dialogs trap focus; `Escape` closes.
- **How verified:** axe on the rendered dialog/banner in a real browser at the HITL pause (jsdom cannot compute contrast) — recorded as a human check.

---

## 5. Data requirements

| Change | Detail |
| --- | --- |
| **New table** `impersonation_sessions` | `session_id CHAR(36) PK (uuid)`, `actor_user_id BIGINT NOT NULL`, `target_user_id BIGINT NOT NULL`, `reason TEXT NULL`, `started_at TIMESTAMP(6) NOT NULL`, `expires_at TIMESTAMP(6) NOT NULL`, `ended_at TIMESTAMP(6) NULL`, `end_reason ENUM('manual','expired','superseded','logout') NULL` + `AuditableEntity` columns. Indexes: `idx_impersonation_sessions_actor_open (actor_user_id, ended_at)`, `idx_impersonation_sessions_target (target_user_id)`. No FK to `sec_users` (ROAR-owned table; ARI never alters it). |
| **New table** `impersonation_actions` | `action_id BIGINT AI PK`, `session_id CHAR(36) NOT NULL` (FK → sessions), `method VARCHAR(10)`, `route_pattern VARCHAR(255)`, `path VARCHAR(512)`, `status_code SMALLINT`, `result_official_code BIGINT NULL`, `created_at TIMESTAMP(6)`. Index `idx_impersonation_actions_session (session_id)`. |
| Read-only reads | `sec_users`, `sec_user_roles`, `sec_roles` (for role names). |
| Migration | `<timestamp>-createImpersonationTables.ts`, append-only. **Human-applied on dev (K-015)** — the pipeline does not run migrations. |
| OpenSearch | none. |

---

## 6. API surface delta

| Method + URL | Roles / guards | Notes |
| --- | --- | --- |
| `GET /api/impersonation/users?search=` | `@Roles(SYSTEM_ADMIN)`, `RolesGuard`; rejected with a session header | R-IMP-001 |
| `POST /api/impersonation/start` | same; `409` with a session header | R-IMP-002 |
| `POST /api/impersonation/end` | header required; actor only | R-IMP-004 |
| `GET /api/impersonation/current` | any authenticated JWT user | R-IMP-004 |

All four: Swagger `@ApiTags('Impersonation')`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery/@ApiBody`, plus `@ApiHeader({name: 'X-Impersonation-Session'})` where relevant. Machine tokens (`client_id/client_secret`) are **not** accepted by any of them and may never carry the header.

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| ROAR | none — its JWT stays the credential; `sec_*` tables read only |
| Socket.IO | no new server event; client re-issues `config-user` with the effective identity |
| STAR client | in scope (same monorepo): navbar, new dialogs, `ImpersonationService`, `jWtInterceptor`, `ActionsService.logOut`, `WebsocketService` |
| `/admin` SSR, TIP, PRMS, AICCRA | none |

---

## 8. Defect classes and gates

| Defect class | Gate | Blind spot / substitute |
| --- | --- | --- |
| Middleware grants a swap it should refuse (forged, foreign, expired, non-admin, machine token) | `jwr.middleware.spec.ts` matrix + e2e forged session | unit mocks the repo — e2e must hit the DB |
| A guard or util still reads the actor after the swap | R-IMP-003 AC.4 enumeration + e2e visibility scenario | grep over `src` cannot see `test/` — enumerate both (KZ-017) |
| Wrong audit attribution | e2e asserts `created_by` **in the DB row** (KZ-001) | — |
| Audit interceptor breaks a response | interceptor spec with a rejecting insert | — |
| Header leaks to ROAR / file-manager hosts, or is dropped on the 401 retry | `jwt.interceptor.spec.ts` marker-based assertions + retry assertion | host-string assertions are not falsifiable when `mainApiUrl === managementApiUrl` — assert on the marker |
| Server logs attribute the request to the target only | log-field assertions in the three interceptor/filter specs (`actorId` present) | — |
| Client role model not swapped | `RolesService` + navbar specs with a simulated Contributor | — |
| Layout offset / contrast / focus order | **no automated gate** — human check in a real browser at the HITL pause (T6 review acceptable) | jsdom cannot measure layout or contrast |
| Migration not applied in dev | `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` (normalize ANSI before counting, K-014) | pipeline never applies migrations (K-015) |
| Silent drift between mockup and build | human side-by-side at HITL | accepted risk |

---

## 9. Assumptions, dependencies, risks

- **A1** `sec_user_roles.role_id` values match `SecRolesEnum`; `sec_roles.name` exists for chip labels (verify in T-01; if absent, map names from the enum client-side).
- **A2** `JwtMiddleware` runs before all guards and interceptors — true today (`app.module.ts` `forRoutes('*')`).
- **D1** Human-applied migration on the shared dev DB before any e2e run.
- **R1** Process-level caches keyed by user id (if any) could serve admin data to the target — design must list them (none found in `CacheService`/socket at proposal time; re-verify).
- **R2** `ResultOwnerGuard` treats `CENTER_ADMIN` as owner-bypass — a simulated Center Admin keeps that, by design.

---

## 10. Open questions

| # | Question | Proposed default | Owner | Due |
| --- | --- | --- | --- | --- |
| OQ-1 | Allow `TECHNICAL_SUPPORT` (7) to simulate? | No — SYSTEM_ADMIN only (requirement text) | Product | before T-04 |
| OQ-2 | TTL value | 240 min via env | Security | before T-04 |
| OQ-3 | Read UI for the audit tables | Not in this spec; SQL only | Product | next spec |
| OQ-4 | Should the target ever be notified? | No | Product | before archive |

---

## 11. Requirement ID index

| ID | Title | Tier |
| --- | --- | --- |
| R-IMP-001 | Search simulable users | server |
| R-IMP-002 | Start a simulation session | server |
| R-IMP-003 | Effective identity resolution | server |
| R-IMP-004 | End, inspect, auto-expire | server |
| R-IMP-005 | Audit trail | server |
| R-IMP-006 | Account-menu entry | client |
| R-IMP-007 | Search dialog | client |
| R-IMP-008 | Confirmation dialog | client |
| R-IMP-009 | Active-simulation state | client |
| R-IMP-010 | Ending the simulation | client |
| NFR-IMP-001..005 | security ×2, performance, observability, a11y | both |

---

## 12. Sign-off

- [ ] Engineering lead — Juan Carlos Cadavid
- [ ] MEL / product owner — <name>
- [ ] Security review (auth touched) — <name>
- [ ] DevOps (migration on dev) — <name>

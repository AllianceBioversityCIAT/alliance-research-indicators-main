# Design — Changes / Profile Simulation (User Impersonation)

- **Module:** auth (cross-cutting) — server `entities/impersonation` + `shared/middlewares` + `shared/Interceptors`; client `shared/services`, `shared/components`, `shared/interceptors`
- **Spec id:** 2026-08-profile-simulation
- **Status:** approved (2026-08-25, gated; revised after Judgment Day round 1 — see ./judgment.md)
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** ./requirements.md
- **Linked proposal:** ./proposal.md (Option A — server-side session + header)
- **Linked TRD:** ../../../trd/trd.md §10.1/§10.2 (security model), §4.1/§4.2 (modules); server interceptor order is read from `app.module.ts` (`APP_INTERCEPTOR` registrations), not from TRD §8.3 (which documents the **client** interceptor order)
- **Visual reference:** ./mockup/ (`Main`, `SearchUser`, `Confirm`, `ActiveSimulation` artboards) · <https://claude.ai/code/artifact/385d7c04-1da0-4eb4-a1ca-46d4cb4cf4b4>
- **Template note:** follows `general-setup/design.md`; §2.0/§2.4 added, §6 repurposed for the STAR client (monorepo), §13 Budget inserted (Open questions → §14, References → §15)
- **Last updated:** 2026-08-25

---

## 1. Goals & non-goals

**Goals**
1. Make the **server** the sole authority for "who is acting" during a simulation (R-IMP-003, NFR-IMP-001/002).
2. Reuse the single identity choke point (`JwtMiddleware` → `request.user`) so no guard, util or service changes its logic (R-IMP-003 AC.4).
3. Persist a revocable, expiring session and an append-only action log with **real** status codes (R-IMP-002/004/005).
4. Mirror the swap in STAR by replacing the one signal its role model reads (`dataCache().user`) and attaching one header (R-IMP-006..010).
5. Keep the mockup's look while meeting AA contrast (NFR-IMP-005).

**Non-goals**: token minting, ROAR changes, admin SSR panel, audit read UI, delegation for non-admin roles, cross-frontend simulation.

---

## 2. Architecture

### 2.0 Cross-check (KZ-016)
Read back against every `BUT`/`AND IT MUST` in `requirements.md` and against module constraints:
- `CurrentUserUtil` is `Scope.REQUEST`. **Nothing new injects it**: `ImpersonationUserRepository` injects `EntityManager` only (it is modeled on the *SQL* of `AppSecretRepository.getUserValidation`, **not** on its constructor, which injects `CurrentUserUtil` and would cascade REQUEST scope into `JwtMiddleware` and the global interceptor). `created_by/updated_by` on `impersonation_sessions` are set **explicitly by the service** to `actor_user_id`. ✔
- `JwtMiddleware` is registered in `app.module.ts` with `forRoutes('*')`; `ImpersonationModule` is imported by `EntitiesModule` (exports the service) so the middleware can inject `ImpersonationService`. ✔
- `bilateral-project-mapping.controller.ts` header comment: audit "written from `request.user`, not from any global util" — still true; it receives the effective user. ✔
- "Header only to ARI main API, never to ROAR": gated on a **call marker**, not on host substrings (the example env has `mainApiUrl === managementApiUrl`, so a host check is not falsifiable) — see §5. ✔
- "Nested → 409 before RolesGuard" for `/start`, `403` for `/users`: raised in the middleware. ✔
- "`/end` by someone other than the actor → 403": foreign/unknown sessions are **never** tolerated; only the actor's own ended/expired session is (§5 step 6). ✔
- `RolesGuard` is **not** global: every impersonation handler that needs it declares `@UseGuards(RolesGuard)` explicitly. ✔

### 2.1 Request flow (server)

```mermaid
sequenceDiagram
  participant C as STAR client
  participant M as JwtMiddleware
  participant I as ImpersonationService
  participant G as RolesGuard / ResultOwnerGuard / ResultStatusGuard
  participant H as Handler
  participant A as ImpersonationAuditInterceptor
  C->>M: Bearer <admin JWT> + X-Impersonation-Session
  M->>M: validate credential (unchanged) → actor
  M->>I: resolve(session_id, actor, route)
  I-->>M: target profile | rejection code
  M->>M: req.actor = actor; req.user = target; req.impersonation = {session_id}
  M->>G: next()
  G->>H: effective user
  H-->>A: ServerResponseDto | thrown HttpException
  A->>I: logAction(session_id, method, route_pattern, path, status) [non-GET, fire-and-forget]
  A-->>C: unchanged envelope (errors stay a string; code travels in X-Impersonation-Error)
```

### 2.2 Composition

**Server — new, `src/domain/entities/impersonation/`**
- `impersonation.module.ts` — TypeORM entities; exports `ImpersonationService`.
- `impersonation.controller.ts` — `users`, `start`, `end`, `current`. `@UseGuards(RolesGuard)` + `@Roles(SYSTEM_ADMIN)` on `users`/`start`. Swagger complete.
- `impersonation.service.ts` — session lifecycle, target resolution, action logging, explicit audit-column population.
- `dto/start-impersonation.dto.ts`, `dto/search-users.dto.ts`, `dto/impersonation-user.dto.ts`, `dto/target-profile.dto.ts`.
- `entities/impersonation-session.entity.ts`, `entities/impersonation-action.entity.ts`.
- `repositories/impersonation-user.repository.ts` — raw queries over `sec_users` / `sec_user_roles` / `sec_roles` (first `src` consumer of `sec_roles`). Constructor: `EntityManager` only.
- `enum/impersonation-end-reason.enum.ts`, `enum/impersonation-error-code.enum.ts`.
- `src/db/migrations/<timestamp>-createImpersonationTables.ts`.
- `src/domain/shared/Interceptors/impersonation-audit.interceptor.ts` (+ spec) — note the capital-I folder.
- `src/domain/shared/errors/impersonation.exception.ts` — `ImpersonationException extends ForbiddenException|ConflictException` carrying `code`; the middleware sets the `X-Impersonation-Error` response header before throwing.
- `src/domain/shared/global-dto/request-with-user.dto.ts` — `RequestWithUser { user; actor?; impersonation?: { session_id; invalid?: 'ended' } ; credential: 'jwt' | 'machine' | 'bypass' }`.

**Server — modified**
- `shared/middlewares/jwr.middleware.ts` — new private `applyImpersonation(req, res, credential)` invoked from **all three** `req.user` assignment branches (bypass, machine, JWT) before their `next()`.
- `domain/entities/entities.module.ts` — import + export `ImpersonationModule` (repo convention).
- `app.module.ts` — register `ImpersonationAuditInterceptor` as `APP_INTERCEPTOR` (position irrelevant, see §5).
- `main.ts` — CORS `exposedHeaders: ['X-Impersonation-Error']` so the browser can read it.
- `domain/routes/main.routes.ts` — mount at `impersonation`.
- `shared/Interceptors/logging.interceptor.ts`, `shared/Interceptors/response.interceptor.ts`, `shared/error-management/global.exception.ts` — add `actorId` + `impersonationSessionId` to the existing `userId` log fields (no shape change to `errors`).
- `shared/utils/app-config.util.ts` — `IMPERSONATION_TTL_MINUTES` getter (single config surface; `env.utils.ts` untouched); `.env.example` updated.

**Client — new, `client/research-indicators/src/app/`**
- `shared/services/impersonation.service.ts` (+ spec) — depends **only** on `CacheService`, `ApiService`, `Router` (no `ActionsService`, no `WebsocketService` → no DI cycle). Signals `active`, `session`, `actor`, `restoring`; methods `start(res)`, `end(reason): Promise<EndOutcome>`, `restore()`.
- `shared/components/all-modals/modals-content/simulate-profile-modal/` — `simulate-profile-modal.component` (content rendered inside the shared `app-modal` wrapper — **no `p-dialog`**), with child standalone components `user-search-step/` and `confirm-step/` (+ specs).
- `shared/components/simulation-banner/` (+ spec).
- `shared/interfaces/impersonation.interface.ts`.

**Client — modified**
- `shared/types/modal.types.ts` — add `'simulateProfile'` to `ModalName`.
- `shared/services/cache/all-modals.service.ts` — `modalConfig` entry + the literal key in `closeAllModals()`.
- `shared/components/all-modals/all-modals.component.html` — host `app-modal` for the new name.
- `shared/components/alliance-navbar/alliance-navbar.component.{html,ts,spec}` — banner rendered **inside this component above `#navbar`**; `ResizeObserver` observes the component host element (so `navbarHeight` = navbar + banner); menu option; avatar ring; "Account · Simulated" panel.
- `pages/platform/platform.component.html` — replace hardcoded `pt-[88px]`/`pt-[109px]` with `[style.paddingTop.px]="cache.navbarHeight()"`.
- `shared/interceptors/jwt.interceptor.ts` — impersonation header on non-auth calls; retry path clones the **already-decorated** request.
- `shared/interceptors/http-error.interceptor.ts` — when `X-Impersonation-Error` header is present: skip the generic 403 toast, call `impersonation.end('server-invalid')` then `actions.showToast('Simulation expired')`.
- `shared/services/to-promise.service.ts` — sets the `X-Ari-Auth-Call: 1` marker when `config.isAuth` (ROAR-bound call).
- `shared/services/actions.service.ts` — injects `ImpersonationService` (one direction); `logOut()` awaits `impersonation.end('logout')` (3 s cap); `updateLocalStorage(…, isRefresh=true)` persists tokens only — never rewrites `data.user`.
- `shared/services/api.service.ts` — four methods.
- `app.component.ts` — calls `impersonation.restore()` at bootstrap when the storage key exists.
- `styles/colors.scss` — `--ac-orange-2` in `:root`, the `$colors` map (so `.abc-/.atc-orange-2` exist) and the `[data-theme='dark']` block.

### 2.3 Reuse
`RolesGuard`, `ResultOwnerGuard`, `ResultStatusGuard`, `CurrentUserUtil` (unchanged), `ResponseUtils.format`, `GlobalExceptions`, `LoggerUtil`, `AppConfig`, `AllModalsService` + `app-modal` wrapper, `RolesService`, `CacheService`, `ToPromiseService`, `WebsocketService.configUser` (already public), PrimeNG `p-avatar`/`p-skeleton`, existing toast.

### 2.4 Identity readers enumeration (R-IMP-003 AC.4)
Enumerated by *what reads the identity* (KZ-002), across `src/` **and** `test/` (no `req.user` reader under `test/` — re-confirm at T-05).

**Server**

| Reader | Reads | After this design |
| --- | --- | --- |
| `jwr.middleware.ts` (3 assignment branches) | sets `request.user` | each branch calls `applyImpersonation` → effective user + `actor` |
| `roles.guard.ts` | `request.user.roles` | effective ✔ |
| `result-owner.guard.ts` | `request.user.sec_user_id/roles` | effective ✔ |
| `current-user.util.ts` | `request['user']` | effective ✔ (`setSystemUser` cron override untouched) |
| `bilateral.controller.ts` (**6** sites), `bilateral-project-mapping.controller.ts` (3), `automapper.controller.ts` (1) | `request.user` param | effective ✔ |
| `logging.interceptor.ts`, `response.interceptor.ts`, `global.exception.ts` | `request.user.sec_user_id` for `userId` log field | effective id **plus** new `actorId`/`impersonationSessionId` fields |
| `app-secrets.service.validation` | builds `user` for machine tokens | header + machine → `403` |
| `server.gateway.ts` `by_user_id` | body field | client sends the effective id |

**Client**

| Reader | After this design |
| --- | --- |
| `RolesService.*` computed (incl. `canAccessCenterAdmin` → `role.focus_id`/`sec_role_id`) | reads swapped `dataCache().user` → needs the **full** `Role` shape (§4) |
| `centerAdminGuard` | via `RolesService` ✔ |
| `cache.isMyResult` (`created_by === user.sec_user_id`) | swapped ✔ |
| `actions.getInitials()`, navbar name/email/`roleName` | swapped ✔ |
| `WebsocketService.runsockets()` (reads user once at construction) | `configUser` re-run on start/end by the banner/navbar orchestration |
| `CacheService.dataCache` hydration from `localStorage['data']` | while active, `data.user` **is the target** (§5 storage rule) so boot is consistent |

No process-level cache keyed by user id found (`CacheService`, `ClarisaProjectsService`, `MappingPhaseResolver` cache by config). Re-verify at T-05 (R1).

---

## 3. Data model

**`impersonation_sessions`** — `ImpersonationSession extends AuditableEntity`

| Column | TypeORM / DB |
| --- | --- |
| `session_id` | `char(36)` PK, uuid v4 generated in service |
| `actor_user_id` | `bigint NOT NULL` |
| `target_user_id` | `bigint NOT NULL` |
| `reason` | `text NULL` |
| `started_at`, `expires_at` | `timestamp(6) NOT NULL` |
| `ended_at` | `timestamp(6) NULL` |
| `end_reason` | `enum('manual','expired','superseded','logout') NULL` |
| inherited | `created_at`, `created_by` (= actor, set by service), `updated_at`, `updated_by` (= actor on end), `is_active` (default true, filtered `= true` on resolve), `deleted_at` (never set) |
| indexes | `idx_impersonation_sessions_actor_open (actor_user_id, ended_at)`, `idx_impersonation_sessions_target (target_user_id)` |

**`impersonation_actions`** — `ImpersonationAction` (append-only; `created_at` only)

| Column | TypeORM / DB |
| --- | --- |
| `action_id` | `bigint AI PK` |
| `session_id` | `char(36) NOT NULL`, `@ManyToOne(ImpersonationSession)` FK |
| `method` | `varchar(10) NOT NULL` |
| `route_pattern` | `varchar(255) NOT NULL` — Express `req.route?.path ?? req.originalUrl` (coalesce: unmatched routes have no `req.route`) (e.g. `/results/:resultCode/general-information`) |
| `path` | `varchar(512) NOT NULL` — `originalUrl` truncated |
| `status_code` | `smallint NOT NULL` |
| `result_official_code` | `bigint NULL` — from `req.params[RESULT_CODE_PARAM]` (this is the **official code**, not `result_id`) |
| `created_at` | `timestamp(6) default now` |
| index | `idx_impersonation_actions_session (session_id)` |

No FK to `sec_users` (ROAR-owned). No OpenSearch decoration. Migration `createImpersonationTables`; `down` drops in reverse order.

---

## 4. API surface

Common: `ServerResponseDto` envelope; `errors` **remains a string** (unchanged `GlobalExceptions`); machine-readable codes travel in the response header `X-Impersonation-Error` (values in `ImpersonationErrorCode`: `NOT_ALLOWED`, `NESTED`, `SESSION_INVALID`, `SESSION_HEADER_REQUIRED`, `TARGET_NOT_FOUND`, `TARGET_IS_ADMIN`, `TARGET_IS_SELF`).

### GET /api/impersonation/users
- **Controller:** `impersonation.controller.ts` · **Roles/Guards:** `@UseGuards(RolesGuard)` `@Roles(SYSTEM_ADMIN)` · **Interceptors:** global only
- **Query DTO:** `SearchUsersDto { search: string (3–100, trimmed) }`
- **Response data:** `ImpersonationUserDto[]` = `{ sec_user_id, first_name, last_name, email, is_active, roles: {role_id, name}[], simulable, blocked_reason? }`
- **Errors:** `400` (DTO) · `403` non-admin · `403` + `X-Impersonation-Error: NESTED` when a session header is present (middleware)
- **Notes:** ≤ 20 rows, ordered by email.

### POST /api/impersonation/start
- **Roles/Guards:** `@UseGuards(RolesGuard)` `@Roles(SYSTEM_ADMIN)` · **Body DTO:** `StartImpersonationDto { target_user_id: positive int; reason?: ≤ 500 }`
- **Response data:** `{ session: {session_id, started_at, expires_at}, user: TargetProfileDto }`
- **`TargetProfileDto`** = the client `UserCache` shape (minus `roleName`, which the client computes — §5 step 2; D-imp-16): `sec_user_id, first_name, last_name, email, is_active, status_id, user_role_list: [{ is_active, user_id, role_id, role: { role_id, sec_role_id, focus_id, name, is_active, justification_update } }]` — sourced from `sec_user_roles` + `sec_roles`. **OQ-5 resolved (T-01, `DESCRIBE` on dev 2026-08-25):** `sec_roles` has `sec_role_id (PK), name varchar(60), focus_id bigint NOT NULL, is_active, justification_update text, description, is_internal`; `sec_user_roles` has `sec_user_role_id (PK), user_id, role_id, is_active`; `sec_users` has `sec_user_id, first_name, last_name, email, status_id, is_active, deleted_at, last_login_at, carnet`. Every field the client `Role` reads exists — no `null` fallback needed. Role names come only via `sec_user_roles.role_id → sec_roles.sec_role_id`. `RolesService.userHasCenterAdminAccess` is exercised in the e2e with a real Center Admin target.
- **Errors:** `400` · `403` non-admin · `404` `TARGET_NOT_FOUND` (missing/inactive) · `409` `TARGET_IS_ADMIN` / `TARGET_IS_SELF` · `409` `NESTED` (middleware)

### POST /api/impersonation/end
- **Roles/Guards:** none beyond authentication · **Header:** `X-Impersonation-Session` required → `400 SESSION_HEADER_REQUIRED`
- **Response data:** `{ session_id, ended_at, end_reason }`; idempotent `200` for the actor's own already-ended session
- **Errors:** `403 SESSION_INVALID` for unknown or **foreign** sessions (middleware — never tolerated)

### GET /api/impersonation/current
- **Roles/Guards:** none beyond authentication
- **Response data:** `{ active: false }` | `{ active: true, session, actor: {sec_user_id, first_name, last_name, email}, user: TargetProfileDto }`
- **Errors:** `403 SESSION_INVALID` for unknown/foreign; the actor's own ended/expired session → `{ active: false }`.

---

## 5. Workflows & business rules

**Start (R-IMP-002)**
1. Middleware: credential ok, no header → actor is `req.user`.
2. `RolesGuard` → SYSTEM_ADMIN.
3. Service: `findProfile(target)`; `404` if null/inactive; `409` if `roles ∋ 1`; `409` if self.
4. Transaction: open sessions of the actor → `ended_at=now, end_reason='superseded', updated_by=actor`; insert new session (`created_by=actor`, `expires_at = now + AppConfig.IMPERSONATION_TTL_MINUTES`).
5. `LoggerUtil.warn('impersonation.start', {actor_user_id, target_user_id, session_id})`. `201`.

**Resolve on every request (R-IMP-003)** — `applyImpersonation(req, res, credential)` called by each branch of `JwtMiddleware.use` right after `req.user` is assigned and before its `next()`:
1. Header absent → return.
2. `credential === 'machine'` → throw `403 NOT_ALLOWED`.
3. `req.user.roles ∌ SYSTEM_ADMIN` → `403 NOT_ALLOWED`.
4. Route `/impersonation/start` → `409 NESTED`; route `/impersonation/users` → `403 NESTED`.
5. `service.resolve(session_id, actor_id)`: one PK read, **no cache** (K-016); filters `is_active = true`. Not found **or** `actor_user_id ≠ actor_id` → `403 SESSION_INVALID` (always — including `/end`/`/current`).
6. Owned but `ended_at` set, or `expires_at < now` (mark `end_reason='expired'` first): route is `/impersonation/end` or `/impersonation/current` → `req.actor = req.user; req.impersonation = { session_id, invalid: 'ended' }`; continue. Any other route → `403 SESSION_INVALID`.
7. Valid → `req.actor = req.user; req.user = { ...targetProfile, roles: targetProfile.user_role_list.filter(r => r.is_active).map(r => r.role_id) }` (guards read `user.roles: number[]` — D-imp-16); a `valid` result whose `target` is null (user vanished mid-session) is treated as `SESSION_INVALID` → `403`; `req.impersonation = { session_id }`; `LoggerUtil.debug` resolve latency.
8. Every throw above first does `res.setHeader('X-Impersonation-Error', code)`.
`credential === 'bypass'` (local dev only) behaves like `'jwt'` with the hard-coded admin as actor.

**Audit (R-IMP-005)** — `ImpersonationAuditInterceptor` (global). When `req.impersonation?.session_id && !invalid && method !== 'GET'`, pipe `tap({ next: dto => log(dto.status ?? 200), error: err => log(err instanceof HttpException ? err.getStatus() : 500) })`. The status comes from the handler's `ServerResponseDto` / the thrown exception — **not** from `res.statusCode` (which `GlobalExceptions` sets outside the chain). `logAction` is fire-and-forget; rejection → `LoggerUtil.error`, response unaffected. Registration order is therefore irrelevant.

**End (R-IMP-004)** — actor's own open session → `ended_at=now, end_reason ∈ {'manual','logout'}, updated_by=actor`; `invalid:'ended'` → return the existing row `200`. `LoggerUtil.warn('impersonation.end')`.

**Client storage rule (R-IMP-009/010)** — while active, `localStorage['data'].user` **holds the target** (so `CacheService` hydrates a consistent identity on reload and token refreshes may persist `data` freely); `localStorage['impersonation']` holds `{ session, actor }`. `updateLocalStorage(…, isRefresh=true)` writes only `access_token`/`exp`. Ending rewrites `data.user = actor` and removes `impersonation`.

**Client start (R-IMP-007→009)**
1. Modal (registry `simulateProfile`, `app-modal` wrapper): step 1 search (debounce 300 ms, min 3), step 2 confirm → `api.startImpersonation`.
2. On `201`: `impersonation.start(res)` → stores `{session, actor: dataCache().user}`, sets `dataCache.user = res.user` (with `roleName` via the existing preferred-role rule) and persists `data`; the calling component then runs `websocket.configUser(target)`, `router.navigate(['/home'])`, `actions.showToast(...)`.
3. `jWtInterceptor`: on requests **without** the `X-Ari-Auth-Call` marker and bound to the ARI main API, add `X-Impersonation-Session` when `impersonation.active()`; requests carrying the marker (ROAR login/refresh/current-user) get the marker stripped and **no** impersonation header. The 401-refresh retry clones `clonedRequest` (headers preserved), not the original `req`.

**Client end (R-IMP-010)** — `impersonation.end(reason)`: best-effort `api.endImpersonation()` (3 s cap), restore `dataCache.user = actor`, rewrite `data`, clear `impersonation`, resolve `{ actor }`. Callers (banner, navbar, `httpErrorInterceptor`, `logOut`) then run `configUser(actor)`, navigate `/home`, toast. `logOut()` awaits it first when active.

**Client restore** — `app.component` bootstrap: if `localStorage['impersonation']` exists, `restoring.set(true)`, call `/current` with the stored header; `active:true` → adopt returned `user`/`actor`; else run the local end path with toast "Simulation ended". `rolesGuard` waits on `restoring()` (returns a `UrlTree`-free promise) so no route resolves against a half-restored identity.

---

## 6. Frontend component architecture (STAR)

| Component / service | Responsibility | Tokens & specs from mockup |
| --- | --- | --- |
| `ImpersonationService` | state machine idle→starting→active→ending; storage rule; identity swap/restore | — |
| `SimulateProfileModalComponent` (`simulateProfile`) | content of the shared `app-modal` wrapper (title "Simulate another profile", cancel only); hosts the two steps | title `.sg` 18/600 `--ac-primary-blue-400`, helper `.description` |
| `UserSearchStepComponent` | input (`.label`, required `text-red-500`), debounce, six states, row list | rows 12/14 px padding, avatar 40 px radius 12 `--ac-primary-blue-100`/`-600`; role chip 10 px uppercase, border `color-mix(in srgb, var(--ac-primary-blue-600) 40%, transparent)`; blocked rows bg `--ac-grey-100`, chip `--ac-red-1`, "Not allowed" disabled + tooltip |
| `ConfirmStepComponent` | summary card + red callout + actions | callout `color-mix` on `--ac-red-1` (border 25 %, bg 5 %); primary `--ac-primary-blue-500` |
| `SimulationBannerComponent` | 44 px bar above `#navbar` inside the navbar component; `role="status" aria-live="polite"`; compact when `hasSmallScreen()` (`< 768` px height) | bg **`--ac-orange-2` = `#b3561a`** (white text ≈ 4.9:1 ✔ AA), same value in dark theme (surface token; deviates from the "lighten in dark" convention on purpose — it is a background, not a foreground); button white/`--ac-orange-2` |
| `AllianceNavbarComponent` | option button (outlined `--ac-primary-blue-400`), avatar ring `outline: 2px solid var(--ac-orange-2)`, "Account · Simulated" panel, note bg `color-mix(orange-2 12 %, white)`; hosts the banner and measures host height | existing dropdown dimensions |

**Token added**: `--ac-orange-2` (root var + `$colors` map + dark block). The mockup's `#f58220` banner (white text ≈ 2.59:1) is **replaced** — approved deviation.

**UI states owned per component:** search step — idle/loading/results/blocked-rows/empty/error; confirm step — idle/submitting/error; banner — normal/compact; navbar — admin-idle/admin-simulating/non-admin; app — `restoring`.

---

## 7. Integration impact
- **ROAR:** none (read-only `sec_*`; `sec_roles` first read from `src`).
- **Socket.IO:** client re-emits `config-user` with the effective identity; no server change.
- **CORS:** `exposedHeaders` gains `X-Impersonation-Error`.
- **Env:** `ARI_IMPERSONATION_TTL_MINUTES` (default `240`, read through `AppConfig`).

## 8. Security & authorization
- `users`/`start`: `SYSTEM_ADMIN` only (explicit `@UseGuards(RolesGuard)`), rejected with a session header. `end`/`current`: any authenticated ROAR user; foreign/unknown sessions `403`. Machine tokens never accepted with a header.
- Session id v4 uuid; ownership checked on every request; expiry server-side; `is_active` honoured.
- No new secrets. PII: staff names/emails already exposed by `alliance-user-staff`; search is admin-only.
- Threats: forged id (403), replay after end (403 except the actor's own idempotent `/end`), foreign admin (403), nested (409/403 + non-admin effective user), machine-token elevation (403), `localStorage` tampering (server ignores).

## 9. Observability
- `LoggerUtil.warn` on start/end/expired/rejected `{actor_user_id, target_user_id, session_id, code}`; `debug` resolve latency (NFR-IMP-003). Existing per-request log lines gain `actorId`/`impersonationSessionId`. Never tokens.
- `impersonation_actions` joined to `impersonation_sessions` is the audit query surface.

## 10. Testing strategy
- **Server unit:** `jwr.middleware.spec.ts` — matrix × 3 credential branches (no header / machine+header / non-admin / nested start 409 / nested users 403 / unknown / foreign / owned-ended on `/end` / owned-ended elsewhere / expired / valid); asserts `X-Impersonation-Error` header. `impersonation.service.spec.ts` (start rules, supersede, explicit `created_by`, idempotent end). `impersonation.controller.spec.ts`. `impersonation-audit.interceptor.spec.ts` — GET skip; success status from DTO; **thrown 409 logs 409**; rejecting insert leaves response intact.
- **Server e2e** (`test/impersonation.e2e-spec.ts`, dev DB + applied migration): forged/foreign/expired → 403 with header; nested; visibility; `created_by = target` **read from the DB**; one action row per mutation with real status; **Center Admin target keeps center-admin access** (`RolesService` shape). Each test names its failing input (K-012).
- **Client unit:** `impersonation.service.spec.ts` (storage rule, end rewrites `data.user`), `jwt.interceptor.spec.ts` (marker present → no header; absent → header; **retry after 401 keeps the header**), `http-error.interceptor.spec.ts` (header-driven auto-end, no double toast), navbar spec (three role states + banner presence), search-step spec (six states, transitions per KZ-015), confirm-step spec, banner spec (`role="status"`, compact), `roles.service.spec.ts` (simulated Center Admin → `canAccessCenterAdmin()` true; simulated Contributor → `isSystemAdmin()` false), `actions.service.spec.ts` (`logOut` order; refresh never rewrites `data.user`), `roles.guard.spec.ts` (`restoring` wait).
- **Human/T6 at HITL:** offset = measured navbar+banner, contrast, focus order, mockup fidelity.

## 11. Rollout
1. Migration first, human-applied on dev (K-015), verified with `migration:show` (ANSI-normalized, K-014); then merge code.
2. No feature flag (role-gated); env TTL has a default.
3. Backout: revert PRs; `npm run migration:revert` drops both tables.
4. Comms: MEL/product informed; `impersonation_*` tables are the audit source.

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-imp-1 | 2026-08-25 | Server-side session + `X-Impersonation-Session` header, admin JWT unchanged | Server stays the trust authority; revocable & auditable |
| D-imp-2 | 2026-08-25 | Swap `request.user` in `JwtMiddleware` (all three credential branches), keep `request.actor` | Single choke point ⇒ no guard/util changes (J-13) |
| D-imp-3 | 2026-08-25 | `created_by/updated_by` = target on domain rows; admin traceability via audit tables | Data must look as if the user did it |
| D-imp-4 | 2026-08-25 | No in-process session cache | K-016 |
| D-imp-5 | 2026-08-25 | `/end`/`/current` tolerate only the **actor's own** ended/expired session; foreign/unknown always 403 | Idempotent end + safe rehydration without a cross-admin hole (J-06) |
| D-imp-6 | 2026-08-25 | Search returns blocked users with `simulable=false` | Admin sees why |
| D-imp-7 | 2026-08-25 | `--ac-orange-2 = #b3561a` (≈ 4.9:1), same in dark; replaces `#f58220` (≈ 2.59:1) | NFR-IMP-005 (J-05) |
| D-imp-8 | 2026-08-25 | Client identity swap = replace `dataCache().user`; while active `data.user` persists the **target**, actor lives in `impersonation` key | Consistent boot, refresh-safe, restorable (J-11, J-26) |
| D-imp-9 | 2026-08-25 | Modal via `AllModalsService` + `app-modal` wrapper, no `p-dialog` | Client convention (J-15) |
| D-imp-10 | 2026-08-25 | Audit interceptor reads status from the DTO / thrown `HttpException`, fire-and-forget | Real status on every path (J-02) |
| D-imp-11 | 2026-08-25 | Error codes in `X-Impersonation-Error` response header; `errors` stays a string | `GlobalExceptions` flattens `errors`; changing it breaks existing toasts (J-01) |
| D-imp-12 | 2026-08-25 | Impersonation header gated on the `X-Ari-Auth-Call` marker, not on host strings | `mainApiUrl` may equal `managementApiUrl` (J-17) |
| D-imp-13 | 2026-08-25 | `ImpersonationService` depends only on cache/api/router; side effects by callers | Break DI cycle (J-09) |
| D-imp-14 | 2026-08-25 | Banner inside the navbar component; platform padding bound to `navbarHeight()` | Only measured path (J-04) |
| D-imp-17 | 2026-08-25 | Endpoint paths are `/api/impersonation/*` — this app enables URI versioning but registers **no** version segment (`main.ts` `setGlobalPrefix('api')`, no `@Controller({version})`, no version node in `main.routes.ts`; client `mainApiUrl` ends in `/api`). The `/api/v1` wording in the baseline TRD §6.2 is drift — flagged for T-13/archive | T-04 review; root guide §5: fix the doc, never let docs and code drift |
| D-imp-16 | 2026-08-25 | `TargetProfileDto` omits `roleName` (client computes it) and carries no `roles[]`; the middleware derives `req.user.roles` from active `user_role_list` and rejects a null target | T-02 review: `RolesGuard`/`ResultOwnerGuard` read `user.roles`; keeping one source (`user_role_list`) avoids two role lists drifting |
| D-imp-15 | 2026-08-25 | `ImpersonationAction` does **not** extend `AuditableEntity` (append-only, `created_at` only) — a deliberate exception to `src/CLAUDE.md` §7; FK named readably `fk_impersonation_actions_session` and declared on the entity | An audit row is immutable by definition; a derived sha1 FK name would drift on the next `migration:generate` (T-01 review advisories) |

**Reversion challenge (Step 2.3):** replacing the hardcoded `pt-[88px]/[109px]` with the measured height changes delivered layout code. *What does removing it break?* Nothing that is covered: the values are visual constants with no test; the measured value equals them when no banner is present (88/109 = navbar heights). Recorded; no design change.

## 13. Budget (Step 2.4)

| Metric | Estimate | Revised (2026-08-26, tripwire fired after T-04, user-approved continue) |
| --- | --- | --- |
| Tasks | 13 | 13 (unchanged) |
| LOC | ≈ 1,700 (server ≈ 750, client ≈ 950, tests included) | ≈ 4,500 total (server actual 3,413 at T-04: prod 1,541 / tests 1,872; client ≈ 1,100 remaining) |
| Review rounds | 2 | 2 average per task (3-attempt ceiling unchanged) |

Still **Full**. `/akili-execute` trips on > 15 tasks, > **6,000** LOC, or > 3 review rounds on any task. Original estimate undercounted test volume (~55% of insertions — security matrices and review-driven proofs); production LOC is proportionate and no out-of-scope files exist.

## 14. Open questions
Carried from requirements §10 (OQ-1..4) with the stated defaults. **OQ-5 closed** — see §4 `TargetProfileDto` (all columns present on dev).

**Environment note (T-01):** `npm run migration:generate` currently fails against dev with `Table 'alliancereportingdb.orm_metadata' doesn't exist` (TypeORM's bookkeeping table for stored generated columns; pre-existing, caused by `result_pool_funding_alignment_sp.active_primary_alignment`). The T-01 migration was hand-authored to the generator's format. Creating `orm_metadata` on dev is a human decision outside this spec.

## 15. References
- TRD §10 security model; `app.module.ts` for server interceptor registration; `docs/ux-ui/design.md` §7.1 tokens, §8.1 components.
- `AppSecretRepository.getUserValidation` — SQL pattern reused (not its DI).
- ./judgment.md — round-1 ledger.
- Jira PARI-242.

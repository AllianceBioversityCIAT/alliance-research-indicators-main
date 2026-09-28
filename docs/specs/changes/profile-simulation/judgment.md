# Judgment Day — Changes / Profile Simulation · `design.md`

- **Target:** `docs/specs/changes/profile-simulation/design.md` (frozen 2026-08-25, pre-fix)
- **Context:** `requirements.md`, `proposal.md`, `general-setup/design.md`, root `CLAUDE.md` §4, TRD §8.3/§10, codebase
- **Judges:** A and B — `akili-reviewer` on `opus`, blind, read-only, identical brief (author = fable → author ≠ auditor ✔)
- **Round:** 1 · **Status:** awaiting fix approval

## Frozen ledger (round 1)

| # | State | A | B | Finding (merged) | Fix direction |
| --- | --- | --- | --- | --- | --- |
| J-01 | **CONFIRMED SEVERE** | A-01 | B-01 | `errors.code` is unreachable: `GlobalExceptions` flattens `errors` to a string, so `403 + errors.code==='IMPERSONATION_SESSION_INVALID'` can never match; `global.exception.ts` not in modified list; changing the shape breaks the existing 403 toast | Keep `errors` a string; carry the code in a **response header** `X-Impersonation-Error: <code>` set by the middleware before throwing (client reads `error.headers`), or a dedicated exception class that `GlobalExceptions` maps to `errors: { code, message }` only for that class. Choose the header (no envelope change) |
| J-02 | **CONFIRMED SEVERE** | A-02 | B-05 | Audit interceptor "after ResponseInterceptor sees final status" is inverted; on exceptions `GlobalExceptions` sets status outside the chain → 4xx/5xx logged as 200 | Log from `tap({next, error})`: success status from the `ServerResponseDto.status` the handler returns; error status from `HttpException.getStatus()` in the `error` callback; register position irrelevant. Spec asserts the status for a thrown 409 |
| J-03 | **CONFIRMED SEVERE** | A-03 | B-04 | `TargetProfileDto.user_role_list[].role` lacks `focus_id`, `sec_role_id`, etc. → a simulated Center Admin loses center-admin access | Return the full client `Role` shape (`role_id, sec_role_id, focus_id, name, is_active, justification_update`) from `sec_user_roles` + `sec_roles`; add `status_id`, `roleName` computed client-side |
| J-04 | **CONFIRMED SEVERE** | A-04 | B-03 | `navbarHeight` is measured on `#navbar` inside the navbar component and the content offset is hardcoded `pt-[88px]/pt-[109px]` — the banner would overlap content | Render the banner **inside** `AllianceNavbarComponent` above `#navbar`'s wrapper (so the observer measures it) **and** replace the hardcoded `pt-*` with `[style.paddingTop.px]="cache.navbarHeight()"`; add `bannerHeight` signal as fallback. Requirements R-IMP-009 premise corrected |
| J-05 | **CONFIRMED SEVERE** | A-09 | B-02 | `--ac-orange-2 #c4621a` on white = 4.11:1, fails AA | Light `#b3561a` (≈4.9:1) / dark `#ff9d56`-family per token convention (A-27); record computed ratios |
| J-06 | **CONFIRMED SEVERE** | A-07 | B-07 | `/end` tolerance rule lets a foreign/forged session receive 200; `req.actor` undefined on that path | Middleware for `/end`/`/current`: **foreign or unknown** → still `403`; only **ended/expired owned-by-actor** sessions are tolerated (`invalid: 'ended'`). Set `req.actor = req.user` on every header path |
| J-07 | CONFIRMED (A severe / B warning) | A-08 | B-08 | Nested code contradiction: §4 `/users` 403 vs §5 409 | `/start` → 409 `IMPERSONATION_NESTED`; `/users` → 403 `IMPERSONATION_NESTED`; align §4/§5 with R-IMP-001/002 |
| J-08 | CONFIRMED (A severe / B warning) | A-10 | B-10 | Three log readers missing from enumeration (`logging.interceptor`, `response.interceptor`, `global.exception`) → logs attribute to target with no actor | Add rows; add `actorId`/`impersonationSessionId` fields to those three log lines (NFR-IMP-004) |
| J-09 | CONFIRMED (B severe / A warning) | A-16 | B-06 | Circular root DI: `ActionsService ↔ ImpersonationService ↔ WebsocketService` | `ImpersonationService` depends only on `CacheService`, `ApiService`, `Router`; toasts raised by callers; `ActionsService` and `WebsocketService` inject `ImpersonationService` (one direction); socket reconfigure done by `ActionsService`-level orchestration |
| J-10 | SUSPECT (A severe only) — **verified by orchestrator in `jwt.interceptor.ts:78-83`** | A-05 | — | 401-refresh retry re-clones the original `req` → header dropped → mutation attributed to admin | Retry must clone `clonedRequest` (or re-add the header) |
| J-11 | SUSPECT (A severe only) — **verified in `actions.service.ts:284-289`** | A-06 | — | Token refresh persists the swapped `user` into `localStorage['data']`; restore never rewrites it → admin stranded as target after reload | `ImpersonationService` owns writing `data.user`; on end, rewrite `data` with the actor; `updateLocalStorage(…, true)` must not persist a simulated user (write `actor` instead) |
| J-12 | CONFIRMED WARNING | A-11 | B-17 | Modeling on `AppSecretRepository` cascades REQUEST scope; `created_by` population unspecified | Repository injects `EntityManager` only; `created_by = actor_user_id` set explicitly by the service |
| J-13 | CONFIRMED WARNING | A-12 | B-11 | Middleware has 3 `req.user` assignments / 4 exits; bypass branch undefined | Extract `resolveImpersonation(req)` called from JWT branch and machine branch (→403); bypass branch: honour header (dev only) |
| J-14 | CONFIRMED WARNING | A-13 | B-13 | Modal registration touches `modal.types.ts`, `all-modals.service.ts` (config + `closeAllModals`), `all-modals.component.html` | List all four |
| J-15 | CONFIRMED WARNING | A-15 | B-14 | `p-dialog` contradicts registry/`app-modal` wrapper convention | Use `app-modal` wrapper; no `p-dialog` |
| J-16 | CONFIRMED WARNING | A-18 | B-09 | `bilateral.controller.ts` has 6 sites, not 5 | Fix count |
| J-17 | CONFIRMED WARNING | A-20 | B-12 | `mainApiUrl === managementApiUrl` in the example env → host-substring branch can't separate them | Gate the header on **not** `isAuth` config instead of host: `ToPromiseService` sets a marker header `X-Ari-Auth-Call` (stripped by interceptor) or the interceptor checks `req.context`; test asserts on the marker, falsifiable |
| J-18 | CONFIRMED WARNING | A-24 | B-15 | Folder is `shared/Interceptors/` (capital I) | Fix path |
| J-19 | CONFIRMED WARNING | A-19 | B-21 | `configUser` already public; `reconfigureUser` redundant | Call `configUser` |
| J-20 | WARNING (A only) | A-14 | B-23 (sugg.) | `entities.module.ts` registration omitted | Add |
| J-21 | WARNING (A only) | A-17 | — | TRD §8.3 mis-cited (client order) | Cite TRD §10.1 + `app.module.ts` |
| J-22 | WARNING (A only) | A-21 | — | `httpErrorInterceptor` already toasts every 403 → double toast | Exclude `IMPERSONATION_*` responses from the generic toast |
| J-23 | WARNING (A only) | A-22 | — | `AuditableEntity` columns unlisted; `is_active`/`deleted_at` ignored by resolve | List; resolve filters `is_active = true` |
| J-24 | WARNING (A only) | A-23 | — | Client identity readers not enumerated (`cache.isMyResult`, `centerAdminGuard`, `RolesService`) | Add client table to §2.4 |
| J-25 | WARNING (B only) | — | B-16 | `result_id` parsed from `resultCode` = official code, not `result_id` | Store `result_official_code` column instead |
| J-26 | WARNING (B only) | — | B-18 | Boot race: `dataCache` hydrates admin profile sync; `/current` async | Persist the **target** in `data.user` while active (so boot is consistent), validate with `/current`, and gate routes on `impersonation.restoring()` |
| J-27 | WARNING (B only) | — | B-19 | `path` stores only `originalUrl`, requirement wants pattern + URL | Add `route_pattern` column |
| J-28..J-35 | INFO | A-25..A-30 | B-20, B-22, B-24, B-25 | Template drift, `< 768` vs `≤`, dark-token convention, hex literal, TTL config surface, `validateToken` naming, 2.59:1 arithmetic, `$colors` map, `@UseGuards(RolesGuard)` explicit | Apply where cheap during the fix round |

**Counts:** confirmed severe **6** (J-01..06) + severity-split confirmed **3** (J-07..09) · suspect severe **2** (J-10, J-11 — orchestrator-verified in code) · confirmed warning 8 · single-judge warning 8 · info 8. **Contradictions:** none.

## Rounds

| Round | Action | Result |
| --- | --- | --- |
| 1 | Judges A + B | ledger above |
| 1-fix | User chose **Fix only** (no re-judge). Orchestrator applied J-01..J-11, J-12..J-27 and the cheap INFO items to `design.md` (rewritten) and to `requirements.md` (R-IMP-003/004/005/009/010, NFR-IMP-005, §5, §8). Correction-closure sweeps run over the spec folder for the superseded strings (`errors.code`, `#c4621a`, `2.9:1`, `result_id`, `reconfigureUser`, `p-dialog`, `5 sites`, `shared/interceptors/impersonation`, `navbarHeight already`). | **no scoped re-judgment — accepted by user** |

**Terminal:** `JUDGMENT: APPROVED ✅ (fix-only, user-accepted without re-judgment)` — residual risk: fixes were not independently re-verified.

# Execution Log — Changes / Profile Simulation

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `changes/profile-simulation` |
| **Spec id** | 2026-08-profile-simulation |
| **Approval Mode** | gated |
| **Leader** | Claude (fable) — T1 |
| **Implementer / Reviewer** | `.claude/agents/akili-implementer.md` (sonnet) / `.claude/agents/akili-reviewer.md` (opus, read-only) |
| **Budget (design §13)** | 13 tasks · ≈ 1,700 LOC · 2 review rounds — tripwire > 15 / > 2,200 / > 3 |
| **Branch** | `JuankCadavid/PARI-242` (worktree) |
| **Environment pre-check (2026-08-25)** | Docker up; `.env` symlinked from the main checkout; client `environment*.ts` symlinked; `node_modules` installed fresh in both packages (worktree); no `mysql` CLI — DB reachability via the typeorm passthrough |
| **Started** | 2026-08-25 |

## Task Execution History

_(entries appended per task)_

---

## T-01 — Schema, entities, migration, enums

- **Status:** **PASS** — Reviewer PASS (attempt 2) + RB-2 human gate satisfied → task **`[x]`**
- **Date:** 2026-08-25
- **Attempts:** 2 (Implementer `akili-implementer`/sonnet; Reviewers `akili-reviewer`/opus ×2 in parallel on attempt 1 — migration surface → lens split: A readability/reliability, B risk/resilience; scoped re-audit by A on attempt 2)
- **Requirements covered:** requirements §5 (data), R-IMP-002/004/005 data columns, OQ-5 (closed)

### Attempt 1 — effort high
- Files: `src/domain/entities/impersonation/entities/impersonation-{session,action}.entity.ts`, `…/enum/impersonation-{end-reason,error-code}.enum.ts`, `src/db/migrations/1787699586530-createImpersonationTables.ts`, `.env.example`
- Implementer verification: `npx eslint <paths>` clean · `npx tsc -p tsconfig.build.json --noEmit` 0 errors · `migration:show` (ANSI-stripped) exactly 1 pending `[ ] CreateImpersonationTables1787699586530` · migration **not** applied (K-015) · `DESCRIBE sec_roles / sec_user_roles / sec_users` captured (read-only ts-node script, deleted afterwards)
- **Environment finding:** `npm run migration:generate` fails on dev — `QueryFailedError: Table 'alliancereportingdb.orm_metadata' doesn't exist` (TypeORM bookkeeping for stored generated columns; pre-existing, caused by `result_pool_funding_alignment_sp.active_primary_alignment`). Migration hand-authored to the generator's format; Reviewer B byte-matched the `AuditableEntity` DDL prefix against `1782400514019-CreateStrategicObjectivesTable.ts`. Creating `orm_metadata` on dev = human decision (recorded in design §14).
- Reviewer A — **FAIL**: (1) OQ-5 not recorded in design §4/§14, RB-1 open; (2) `impersonation_actions.method/route_pattern/path/status_code` nullable in entity + migration while design §3 / requirements §5 mark only `result_official_code` NULL. Uncovered (human): migration unexecuted (K-006/RB-2).
- Reviewer B — **FAIL**: (1) OQ-5 not recorded (same); (2) migration unexecuted — human-owned, not chargeable. Verified DDL column-for-column, `down` order, no `namedPlaceholders` trap; FK sha1 name "unverified".
- Leader adjudication: OQ-5 = Leader doc edit (Implementer delivered the `DESCRIBE` in its report) → written into design §4/§14, RB-1 closed, not charged. Nullability = real conformance defect → attempt 2. FK-name advisory adopted as D-imp-15 (design §3 does not name the FK).

### Attempt 2 — effort xhigh
- Files: `impersonation-action.entity.ts` (four columns `nullable: false`/`!`; `@JoinColumn({ foreignKeyConstraintName: 'fk_impersonation_actions_session' })` — option confirmed at `node_modules/typeorm/decorator/options/JoinColumnOptions.d.ts:16`; append-only comment), migration (four `NOT NULL`; FK renamed in `up`/`down`)
- Implementer verification: eslint clean · tsc build 0 errors · `grep -n NULL` on migration → only `result_official_code` bare NULL in the actions table · `migration:show` still exactly one pending
- Reviewer A — **PASS**: "Both blocking issues are closed … entity and DDL agree column-for-column; delta touched exactly the two files claimed (blob hashes), no collateral edits; `namedPlaceholders` trap still untripped."

### ADVISORY (recorded, non-gating)
- **Forward pointer → T-05:** `route_pattern` is now `NOT NULL` but design §3 sources it from `req.route?.path` (undefined on unmatched routes) → `logAction` would silently drop the row. T-05 must coalesce (`req.route?.path ?? req.originalUrl`) and cover `req.route === undefined`.
- **Forward pointer → T-12:** `sec_roles.focus_id` is `NOT NULL` on dev, so the "Center Admin with `focus_id = null`" failing input is only constructible in the unit spec (fabricated DTO), not e2e.
- **Forward pointer → T-02:** clamp/parse `IMPERSONATION_TTL_MINUTES` (a ms value pasted as minutes overflows `TIMESTAMP` 2038 ceiling); pick one clock (Node) for `expires_at` write and comparison and state it.
- **Forward pointer → T-13:** `package.json` `migration:scan` script vs `src/CLAUDE.md` §7 claim that the scanner "was withdrawn" — one is stale.
- `action_id` typed `number` for a bigint PK (safe: `bigNumberStrings: false`), sibling exemplar uses `string` — cosmetic.
- Design §3 `impersonation_actions` rows now carry explicit `NOT NULL` markers (Leader edit after PASS).

### RB-2 — human-approved migration apply on dev (user approved option 1, 2026-08-25 18:13 COT; executed by the Leader)
- [x] `npm run migration:dev:execute` → `1 migrations are new migrations must be executed` … `Migration CreateImpersonationTables1787699586530 has been executed successfully` (6 DDL statements logged: 2 CREATE TABLE, 3 CREATE INDEX, 1 ADD CONSTRAINT `fk_impersonation_actions_session`) → `migration:show`: `[X] 383 CreateImpersonationTables1787699586530`
- [x] `npm run migration:revert` → FK, 3 indexes, both tables dropped in reverse order; `Migration … has been reverted successfully` → `migration:show`: `[ ] CreateImpersonationTables1787699586530`
- [x] `npm run migration:dev:execute` (re-apply) → the shell wrapper hit a 5-min cap during output capture, so the final state was **re-measured separately**: `migration:show` → `[X] 384 CreateImpersonationTables1787699586530`; `INFORMATION_SCHEMA.TABLES` → `impersonation_actions`, `impersonation_sessions` both present. Forward and backward paths proven (K-006).
- Disqualifier check: no `error` line in any of the three runs' stripped output.

---

## T-02 — Repository + `ImpersonationService`

- **Status:** **PASS** (attempt 1) → `[x]`
- **Date:** 2026-08-25
- **Attempts:** 1 (Implementer `akili-implementer`/sonnet, effort high; Reviewer `akili-reviewer`/opus, lenses reliability + risk)
- **Requirements covered:** R-IMP-001 (search rules), R-IMP-002 (all clauses), R-IMP-004 (end/expiry/current), R-IMP-005 (`logAction`); T-01 forward pointers (TTL clamp, single Node clock) discharged
- **Files (9 new/changed, +1,294):** `impersonation/{impersonation.service.ts,+spec, impersonation.module.ts, repositories/impersonation-user.repository.ts,+spec, types/impersonation.types.ts, errors/impersonation-service.error.ts}`, `shared/utils/app-config.util.ts` (+spec) `IMPERSONATION_TTL_MINUTES` clamp [1,1440] default 240
- **Implementer verification:** `npx jest src/domain/entities/impersonation src/domain/shared/utils/app-config.util.spec.ts --silent` → 3 suites / 41 tests green · mutation proof: supersede block removed → `expect(queryBuilder.set).toHaveBeenCalledWith(...) — Number of calls: 0` (spec:258), restored · `npx eslint` over both paths clean (after `prettier --write`, a fixer not a gate) · `tsc -p tsconfig.build.json --noEmit` 0 errors
- **Leader full-suite re-measure (isolated):** `npm test -- --silent` → 340 suites / 2,449 tests passed
- **Reviewer verdict:** PASS — "every acceptance item implemented and proven at the level the task's disqualifier permits; DI constraints hold exactly (no `CurrentUserUtil`, repository = `EntityManager` only, no cache); `?`+array parameterization is the exempted case in `src/CLAUDE.md` §7; all four recorded deviations defensible." Deviations accepted: no `roleName` (client computes), `blocked_reason` precedence self > system_admin > inactive, plain `@Injectable` repository (no local entity for `sec_*`), `ImpersonationServiceError extends HttpException` keeps `errors` a string (verified against `global.exception.ts:29`).
- **Decisions (Leader, recorded in design):** D-imp-16 — `TargetProfileDto` without `roleName`; middleware derives `req.user.roles` from active `user_role_list`; null target ⇒ `SESSION_INVALID`. NFR-IMP-003 wording corrected (PK read + profile join, ≤ 15 ms).

### ADVISORY (recorded, non-gating)
- **→ T-03:** derive `roles[]` on swap (D-imp-16); guard `resolve()` returning `valid` with `target: null` → `403 SESSION_INVALID`.
- **→ T-04:** coerce `is_active` tinyint `1/0` → boolean in the DTO mapping (client `RolesService` may compare `=== true`); LIKE wildcards `%`/`_` in `search` are not escaped (parameterized, admin-only, capped at 20) — escape in the DTO/service if desired.
- **→ T-05:** `impersonation.service.ts` added to the file list — `warn` lines for `end` and lazy `expired` (NFR-IMP-004).
- **→ T-06:** assert on `is_active` wire type; the ownership check (`findOne` `where` with `actor_user_id` + `is_active`) is only falsifiable there (KZ-001 — the unit suite drives `findOne` by return value; a `resolve` that dropped the actor filter stays green).
- Test hygiene: TTL mutated in a test body rather than `beforeEach`; supersede-before-insert ordering not asserted. Recorded; no task change.

---

## T-03 — Middleware `applyImpersonation`, exception + header, CORS

- **Status:** **PASS** (attempt 3 of 3 — ceiling reached, passed on final) → `[x]`
- **Date:** 2026-08-26
- **Attempts:** 3 (Implementer sonnet, xhigh; Reviewers opus ×2 parallel lenses on attempt 1: security PASS / resilience FAIL; scoped re-audits by the resilience reviewer)
- **Requirements covered:** R-IMP-003 (all steps + scenarios + AC.1/2), R-IMP-002 nested 409, R-IMP-001 nested 403, R-IMP-004 foreign `/end` 403, NFR-IMP-001/002

### Attempt 1 — logic correct, evidence FAIL
- `applyImpersonation(req,res,credential)` called from all 3 credential branches; 15 new spec cases; security reviewer PASS ("no path reaches next() with a header but no ownership check; tolerance unreachable by a foreign session — verified in the service source; CORS additive-only").
- Resilience reviewer FAIL: the claimed K-004 red (`{state:'valid'}` stub swap) could not have produced the pasted output — the stub carries no `target`, so the null-target reject keeps the test green; also not the mandated middleware mutation (KZ-014).

### Attempt 2 — evidence fixed, new FAIL (Leader-induced)
- Real middleware mutation (tolerate `invalid` on `/end` inside step 5) → verbatim red `Received promise resolved instead of rejected`, restore proven by line-count stat + green re-run. Reviewer closed issue 1 and **withdrew** its own step-6 mutation suggestion (TS2367 dead code).
- Leader-directed additions: human messages per code (R-IMP-003 verbatim), `resolve()` failure → 503. FAIL on the Leader's own directive: `X-Impersonation-Error: RESOLVE_FAILED` extended design §4's closed vocabulary and, with §2.2's presence-based client rule, a DB blip would silently end a valid simulation.

### Attempt 3 — PASS
- Header + enum member removed (`grep -rn RESOLVE_FAILED src` → 0); `applyImpersonation` moved out of the JWT `try` (catch reverted to original narrow form — pre-existing auth path now byte-equivalent in behaviour); `actorId` declared after step 3; 503 spec case asserts the header is NOT set.
- Reviewer PASS: "impersonation rejections escape `use` structurally; no behavioural change to the pre-existing auth path; 11-case matrix + header-on-every-rejection contract intact." 22/22 green · eslint clean · tsc 0 errors.

### ADVISORY (recorded)
- `Logger` vs `LoggerUtil` (3 call sites) — accepted whole-file convention deviation from design §9; normalize only as its own task.
- `RequestWithUser.user/credential` non-optional though unset on JwtMiddleware-excluded routes.
- Rejection `warn` lines unasserted → owned by T-05 (spy on the middleware logger).
- Session-id shape guard (uuid-v4 precheck) and role-definition `is_active` question (does real login filter `sec_roles.is_active`? verify at T-06) — recorded for T-06.
- Boot-level DI proof (middleware ← ImpersonationService via EntitiesModule) → T-06.

---

## T-04 — Controller, DTOs, module wiring, Swagger

- **Status:** **PASS** (attempt 2) → `[x]`
- **Date:** 2026-08-26
- **Attempts:** 2 (Implementer sonnet, medium→high; Reviewer opus full 4R)
- **Requirements covered:** R-IMP-001 (400/403/≤20/simulable + LIKE escaping), R-IMP-002 (201 payload, 404/409), R-IMP-004 (`/end` 400-without-header/idempotent, `/current` both states), §6 Swagger

### Attempt 1 — code conformant, evidence FAIL
- Reviewer: all endpoints/DTOs/wiring/filter conform (filter scoping verified against Nest's router-exception-filters source; `is_active` coercion at all 3 levels; LIKE escaping correct end-to-end). FAIL: acceptance box #2 (runtime route enumeration) substituted by a decorator grep — a presence count; the spec's testing module had no RouterModule/prefix, so a wrong mount would stay green.
- **Reviewer discovery, repo-wide:** this app registers **no `/v1` segment** — live paths are `/api/impersonation/*`. Spec docs corrected (requirements §6, design §4, tasks acceptance filter), recorded as **D-imp-17**; TRD §6.2 drift flagged for T-13/archive.

### Attempt 2 — PASS
- New `impersonation.routes.spec.ts`: static assertion over the real `route` array + live HTTP proof (`RouterModule.register` + real `ImpersonationModule` with mocked providers + `setGlobalPrefix('api')`): users 200 / start 201 / end-no-header 400 / current 200 / `GET /api/v1/...` 404. K-004: deleting the routes node → 6/6 red (`impersonationRouteEntry … Received: undefined`; live block cascades in `RouterModule.deepCloneRoutes`), restored byte-identical.
- Shared `RequestWithUser` imported (local stand-in deleted); `actorId()` throws `UnauthorizedException` when unresolvable (+test); live `GET /users?search=ro` → 400 proves the pipe is attached. 5 suites / 60 tests green · eslint clean · tsc 0 errors. Leader fixed two stray `/api/v1` docstrings inline.
- Reviewer PASS; also verified the working tree already had both docstring fixes and the three spec docs clean of `/api/v1/impersonation`.

### ADVISORY (recorded)
- routes.spec `/v1` 404 test cannot fail for its stated reason (harness never enables versioning) — the four positive assertions carry the box; retitle when convenient.
- `/end` returns `ImpersonationSessionSummary` (superset of design §4's `{session_id, ended_at, end_reason}`) — **T-07 must write the client contract against what ships.**
- `end`/`current` accept an unvalidated inline body (unknown `reason` → 'manual', tested) — matches exemplar convention.
- Middleware spec fixtures still use `/v1` URLs — harmless (matcher is version-agnostic); T-03's file.

**Leader full-suite re-measure after T-03+T-04 (isolated):** `npm test -- --silent` →
Test Suites: 343 passed, 343 total
Tests:       2496 passed, 2496 total

---

## Budget tripwire — fired after T-04, resolved

- Design §13 budget: ≈1,700 LOC, tripwire >2,200. Actual server-only at T-04: **3,413 insertions** (prod 1,541 / tests 1,872; `git diff 701821be..HEAD --numstat -- server/`).
- Cause: test volume ~55% of insertions (T-03/T-04 security matrices, review-mandated proofs); no scope creep (all files within task lists).
- User decision 2026-08-26: **continue** — budget revised in design §13 to ≈4,500 (trip >6,000), rounds unchanged.

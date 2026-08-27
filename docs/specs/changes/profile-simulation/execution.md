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

---

## T-07 — Client foundation: token, interfaces, ApiService, ImpersonationService

- **Status:** **PASS** (attempt 1) → `[x]` (client full-suite re-measure recorded below, after the concurrent server worker finished)
- **Date:** 2026-08-26
- **Attempts:** 1 (Implementer sonnet, high; Reviewer opus, full 4R)
- **Requirements covered:** R-IMP-009 storage rule, R-IMP-010 (`BUT` tokens untouched, AC.4), NFR-IMP-005 token value; D-imp-8/13/16/17
- **Files (6, +548):** `styles/colors.scss` (`--ac-orange-2 #b3561a` ×3 sites incl. `$colors` map → `.abc-/.atc-orange-2`), `shared/interfaces/impersonation.interface.ts`, `api.service.ts` (4 methods, no version segment), `shared/services/impersonation.service.ts` (+spec), `to-promise.service.ts` (additive `headers?` Config — Leader-delegated choice so T-07 is self-contained; isolation proven: spec-tsc baseline 936→934 with the change, no new error category)
- **Implementer verification:** scoped jest 9/9 · mutation: removing `localStorage.setItem('data', …)` from `end()` → 5 red, restored 9/9 · bare eslint clean (3 files; `to-promise.service.ts` is in eslint's `ignores` by repo config — recorded as excluded-by-config, not lint-clean) · `tsc -p tsconfig.app.json --noEmit` clean
- **Reviewer verdict:** PASS — contract checked against the built server DTOs; tokens structurally untouched (`{...prev, user}` only); 3 s race leak-free; JSON clone lossless for `UserCache`; **`restore()` retaining the full actor snapshot judged a refinement the spec text must adopt** (done — design §5 amended); `end('server-invalid')` skipping the API call judged correct (foreign/unknown `/end` would just 403 again).

### ADVISORY (recorded)
- **→ T-08:** stale `impersonation` key + different admin logs in → boot-restore's 403 path would write admin A's snapshot into admin B's `data.user` (server authority unaffected). Mitigate in T-08: clear the key on login, or drop (not apply) the snapshot when `/current` rejects as foreign.
- `getBlob`/`getWithParams` ignore `config.headers` (unused by impersonation) — symmetry note.
- Signals exported writable; `.asReadonly()` would harden ownership — style only.

---

## T-05 — Audit interceptor + log attribution + reader re-enumeration

- **Status:** **PASS** (attempt 2) → `[x]`
- **Date:** 2026-08-26
- **Attempts:** 2 (Implementer sonnet high→xhigh; Reviewer opus, reliability + risk)
- **Requirements covered:** R-IMP-005 (all clauses), R-IMP-003 AC.4 (re-enumeration), NFR-IMP-004
- **Files (13, +796/−27):** `Interceptors/impersonation-audit.interceptor.ts` (+spec), `app.module.ts` (APP_INTERCEPTOR + honest position comment), `logging/response` interceptors + `global.exception` (+specs — `actorId`/`impersonationSessionId` fields), `logger.util.ts` (DTO extension), `impersonation.service.ts` (+spec — NFR-IMP-004 warns for `end`/`expired`), `jwr.middleware.spec.ts` (rejection-warn spy)

### Attempt 1 — FAIL (2 findings)
- (1) `result_official_code` gated on route pattern containing `'results'` — a stale clause from the Leader's own brief (the corrected spec has no filter); reviewer found real mutating routes losing the code (`green-checks/new-reporting-cycle/:resultCode`, `result-user/author-contact/...:resultCode`), unrecoverable in an append-only table. (2) K-004 red was mechanical (`getResponse is not a function`), not a value-red.

### Attempt 2 — PASS
- Filter removed; `parseInt` + `Number.isSafeInteger`; red-first proof: flipped case + green-checks-pinned case → `Tests: 2 failed` on the old code, 13/13 after. Value-red for the mutation: `Expected {"status_code": 409} / Received {…"status_code": 200…}`, restored, green. Advisories adopted (non-string route.path guard, sync-throw wrap, honest comments).
- Reviewer PASS: "both findings genuinely closed; other 11 files byte-identical; K-004 satisfied on its own terms."
- **Enumeration (R-IMP-003 AC.4):** 43 literal hits / 0 in `test/`; literal grep undercounts optional-chained readers (design §2.4 updated with the widened pattern); new reader `impersonation.controller.ts` `actorId()` added to the table.
- **Leader full-suite re-measure (isolated):**
Test Suites: 344 passed, 344 total
Tests:       2518 passed, 2518 total

### ADVISORY (recorded)
- **Design-level accepted gap (added to design §5):** guard-level denials (`RolesGuard`/`ResultStatusGuard`) produce no `impersonation_actions` row — Nest runs guards before interceptors; the audit trail records what reached a handler. Carried as OQ-6 for product.
- `ResponseInterceptor.isError()` returned-not-thrown 500-rewrite records the DTO's pre-rewrite status — accepted, documented in the code comment.
- Stored `route_pattern` carries the Express regex + global prefix — audit SQL should expect it.

**Leader client full-suite re-measure after T-07 (serial, after the server run):**
Test Suites: 312 passed, 312 total
Tests:       6545 passed, 6545 total

---

## T-08 — Client interceptors, auth plumbing, restore

- **Status:** **PASS** (attempt 2) → `[x]`
- **Date:** 2026-08-26
- **Attempts:** 2 (Implementer sonnet high→xhigh; Reviewer opus, security/correctness + reliability)
- **Requirements covered:** R-IMP-009 (header MUST incl. post-401 retry, BUT not on ROAR calls, Reload), R-IMP-010 (`logOut` order, AC.3 one toast, AC.4), R-IMP-004 client use; D-imp-12; T-07 forward pointer (stale key on login) discharged
- **Attempt 1 — FAIL:** the `X-Ari-Auth-Call` strip was host-gated (only inside the four-host branch), so with `managementApiUrl ≠ mainApiUrl` login/current-user would reach ROAR with the marker intact (CORS break); all attempt-1 marker tests ran at the equal-hosts case and could not see it.
- **Attempt 2 — PASS:** capture+strip once at the top of the interceptor before any branching; new unequal-hosts test, red-first `Expected: false / Received: true` on `headers.has('X-Ari-Auth-Call')`, restored 27/27. Leader-adopted: auto-end value-matched to `SESSION_INVALID` only (design §2.2 reconciled with R-IMP-010; `NESTED` suppresses the generic toast without ending); `active()` short-circuit → one end+toast across concurrent 403s; rejection handlers on `end()`/bootstrap `restore()`; `applyAuthMarker` in `getBlob`.
- Reviewer PASS: strip at the right layer; the short-circuit test models production faithfully (`end('server-invalid')` is synchronous to `active.set(false)`); J-10 retry clones the decorated request on both flows; refresh persists tokens only (payload-level assertion); `rolesGuard.decide()` byte-equivalent.
- Per-file runs: 27/30/46/8/79/21 = **211 green** · eslint 0 errors (spec files + `to-promise.service.ts` are in eslint `ignores` — pre-existing scope gap, disclosed) · `tsc -p tsconfig.app.json` clean.
- ADVISORY recorded: marker strip sits after the `no-auth-interceptor` early return (unreachable combination today — zero production `no-auth-interceptor` call sites; one-line hoist if that changes); env-restore tidiness in the new spec.

---

## T-09 — Modal registration + SimulateProfileModal + UserSearchStep

- **Status:** **PASS** (attempt 2) → `[x]`
- **Date:** 2026-08-26
- **Attempts:** 2 (Implementer sonnet high→xhigh; Reviewer opus, readability + reliability)
- **Requirements covered:** R-IMP-007 (all clauses, six states, AC.1 KZ-015 transitions, AC.2), NFR-IMP-005 (Escape; focus trap = wrapper's Tab trap)
- **Attempt 1 — FAIL (3):** envelope description read from `res?.description` (always undefined — lives in `errorDetail.description`) with a fixture the pipeline never emits; Escape asserted as wrapper-handled but `modal.component.ts` implements the Tab trap only (K-004 unseen assertion); tooltip on a `disabled` button (unreachable) with a `??`-tautology assertion.
- **Attempt 2 — PASS:** all three fixed with red-first proofs (`Expected substring "Server unavailable"…`; `closeModal Number of calls: 0`; `aria-disabled Expected "true" / Received null`); five advisories adopted with their own red-firsts: reopen-reset gated on the `false→true` edge of `computed(isOpen)` (a write to ANY modal key no longer bounces the step), post-debounce current-query `filter`, monotonic stale-response guard, "20+ matches" cap label, duplicate title removed (D-imp-18).
- Reviewer PASS: fixes at the root; the edge-gate fixture genuinely exercises the unrelated-key write; debounce contract preserved.
- 22/22 green (both spec files) · eslint clean · `tsc -p tsconfig.app.json` clean · hex-grep 0 · scss ≤ 414 B.
- **Forward pointers → T-12 (HITL/axe):** tooltip reachable by hover but not keyboard (span lacks `tabindex`; native `disabled` removes the button from tab order — add `tabindex="0"` or drop native disabled for `aria-disabled`); no `aria-live` region announcing loading→results/error; wrapper-title 16/500 vs mockup 18/600 visual delta (D-imp-18).
- **Forward pointer → T-11:** navbar entry point opens `allModals.openModal('simulateProfile')`.

**Leader client full-suite re-measure after T-08+T-09 (isolated):**
Test Suites: 314 passed, 314 total
Tests:       6593 passed, 6593 total

---

## T-10 — ConfirmStepComponent

- **Status:** **PASS** (attempt 2) → `[x]`
- **Date:** 2026-08-26
- **Attempts:** 2 (Implementer sonnet medium→high; Reviewer opus, reliability + correctness)
- **Requirements covered:** R-IMP-008 (all clauses + AC.1), design §5 client-start orchestration (D-imp-13 caller side)
- **Files (7, ≈500):** `confirm-step/` (4 files) + wiring in `simulate-profile-modal.component.{ts,html,spec}`
- **Attempt 1 — FAIL (evidence-only):** the "zero `/start` calls on Escape" test never dispatched Escape (construction-only placebo, K-004). Everything else verified clean on attempt 1, incl. the critical `successfulRequest:false` guard (a 409 lands on the error path, `res.data` never dereferenced) and the real call-order log (`impersonation.start → closeModal → configUser → navigate → toast`).
- **Attempt 2 — PASS:** Escape assertion moved to the parent spec's real Escape test (rendered ConfirmStep, genuine document keydown) — red proof via a temp Escape→`start()` HostListener: `Expected 0 / Received 1 — {"target_user_id": 1042}` at spec:193, byte-identical restore; placeholder test deleted (32→31). Advisories adopted: `try/finally` pending reset (also fixes a stuck-pending on a rejecting promise), class-doc sentence on in-flight-close semantics (continuation completes deliberately — dropping it would orphan the server session).
- Reviewer PASS — verified the red-proof line arithmetic against the hunk headers; `try/finally` regression-checked (double-click mutation still red).
- **Decisions:** Cancel closes the modal (mockup has no third step; `back` output kept, parent wires to `closeModal`) · callout copy names admin AND target (deliberate mockup deviation, R-IMP-008 requires the names) · `reason?` not collected (optional per R-IMP-002, recorded).
- **Forward pointers → T-12:** `role="alert"`/`aria-live` on the error line + `aria-busy` on the pending button (axe/HITL); in-flight-close behaviour worth a manual sanity check.

---

## T-11 — SimulationBanner, navbar changes, platform offset

- **Status:** **PASS** → `[x]`
- **Date:** 2026-08-26
- **Attempts:** 1 implementer run + 1 resume (the first worker died mid-task on a session limit — runtime failure per K-009, NOT a work FAIL; a resume worker verified the inherited tree per K-011 and completed it); Reviewer opus (reliability + risk) PASS
- **Requirements covered:** R-IMP-006 (three clauses + AC.1), R-IMP-009 banner/avatar/panel/responsive/a11y + AC.3 unit half (pixel measurement owed to T-12), R-IMP-010 AC.1; D-imp-14/16/18
- **Files (9, +727/−16):** `simulation-banner/` (new ×4), `alliance-navbar/` (×4), `platform.component.html`
- **Resume findings (recorded):** two false-passing tests in the inherited spec fixed — an undrained 4-hop chained-await under `fakeAsync`+`tick` (→ real macrotask hop) and an OnPush dirty-marking no-op in `openDropdown()` that made three dropdown assertions vacuous (→ click the real `[dropdown-button]`); avatar-swap case added; K-004 mutation re-run first-hand (dropping `!active()` → RED with the button rendered, restored). Also surfaced a Leader bookkeeping bug: a bulk status edit had collided T-09's and T-11's identical status lines (corrected in tasks.md).
- **Verification:** 66/66 green (both suites) · eslint clean · `tsc -p tsconfig.app.json` clean · `ng build --configuration production` exit 0, no warnings naming these components (navbar css under budget minified) · no new hex literals · both `pt-*` constants gone.
- **Reviewer PASS** — verbatim copy match vs requirements + mockups; `navbarHeight`'s four consumers verified conceptually sound with the banner included; both resume fixes judged sound ("the vacuity is proven gone, not argued").

### ADVISORY (recorded; #1–#3 join T-12's HITL checklist)
1. New stacking context: navbar `:host` z-index 3 caps the dropdown's `z-[9999]` — check dropdown over sidebar/popovers in the browser (T-12).
2. `:host { display: block }` missing on the banner — measure the host height in the browser (T-12); one line if it misbehaves.
3. Cold-load offset flash (padding-top 0 for ~1 frame until the first ResizeObserver delivery) — eyeball at T-12.
4. No double-submit guard on `endSimulation()` — harmless today (`/end` is idempotent 200).
5. Focus effect re-fires when `hasSmallScreen()` flips while active (focus steal on resize) — recorded.
6. TZ-fragile started-time assertion (`/^\d{2}:32$/` vs UTC fixture) — breaks under half-hour offsets; pin TZ if CI ever moves.
7–10. Readability notes (unreachable fallback, test title overstatement, duplicated `endSimulation` helper — spec-conformant per §5 caller rule, pre-existing platform ternary).

**Leader client full-suite re-measure after T-10+T-11 (isolated):**
Tests: 6620 passed, 6620 total (all suites green)

---

## T-12 — Role-model specs + socket orchestration + HITL visual check

- **Status:** unit half **PASS** (attempt 2) · task **`[~]`** — HITL browser half (screenshots, measured padding, real-browser axe, tab order) still owed
- **Date:** 2026-08-26
- **Attempts (unit half):** 2 (Implementer sonnet medium→high; Reviewer opus)
- **Files:** `roles.service.spec.ts` only (+23/−1); socket/nav/toast orchestration was delivered under T-10/T-11
- **Attempt 1 — FAIL (evidence):** the mutation run (`if (false && …)`) only loosens the guard — the new positive case could never redden; acceptance names the DTO-drop mutation.
- **Attempt 2 — PASS:** DTO-drop mutation on the new fixture → red at spec:141 (`Expected: true / Received: false`), byte-identical restore, 24/24. **1 red, not the Reviewer's predicted 2 — worker reported the deviation honestly; Reviewer confirmed the 2-red prediction was its own K-004 error** (a predicted, unobserved count carried from a different mutation) — logged here against the reviewer, per its own request. Case-3 comment trimmed (null-vs-absent claim removed).
- Three cases: simulated Contributor → `isSystemAdmin()`/`canAccessCenterAdmin()` false · simulated Center Admin (full role shape) → true · `focus_id: null` input-shape guard.

### Owed before `[x]` (HITL half — Leader + human, real browser)
- [ ] App running THIS worktree's code (docker decision pending: the running `ari_*` containers belong to `bilateral-visual-improvements`)
- [ ] Two screenshots vs mockup artboards 1/4 · measured `#content` padding = navbar+banner host height · axe: 0 contrast violations on banner + both dialog steps · tab-order + Escape note
- [ ] T-11 advisories #1–3 (dropdown z-index over sidebar/popovers; banner `:host` display; cold-load offset flash) · T-09/T-10 aria advisories eyeballed

---

## T-06 — Server e2e · IN PROGRESS `[~]` (two runtime failures; code written, evidence pending)

- **Date:** 2026-08-26
- **State:** `test/impersonation.e2e-spec.ts` written complete per the work order (R-IMP-001..005 e2e clauses, NFR-IMP-003 latency block, Center Admin read-only case); `npx eslint` clean; `tsc --noEmit` clean. **No run evidence exists** — the suite has never been observed green or red (K-004: nothing may be asserted from it yet).
- **Runtime failure 1:** the worker's background jest run was killed externally with zero output (`[killed]` was the entire log; not an auth failure — no output at all).
- **Runtime failure 2:** the worker died on the account's weekly usage limit (resets 03:00 America/Bogota) before the foreground re-run; the admin JWT also expired.
- **Fixtures agreed with the human:** targets `sec_user_id 105` (Contributor, writes, cleanup owed) and `15` (Center Admin, read-only start/end only); actor `sec_user_id 1`. Token supplied per-run via `ARI_E2E_ADMIN_TOKEN` env var, never written to the repo.
- **Next:** fresh token from the human + explicit approval for the Leader-inline execution fallback (run + evidence collection only; the spec authorship is the dead worker's, and the review gate stays independent), or a fresh worker after the limit reset. Latency block to run at 25 samples (recorded deviation).

## T-12 HITL half — handed to the human 2026-08-26

Checklist delivered (stack swap to this worktree, 2 screenshots vs artboards 1/4, DevTools offset snippet, Lighthouse/axe contrast on banner + dialog, focus/Escape notes, T-11 advisories #1–3, role-visibility checks, end + logout paths). Evidence pending.

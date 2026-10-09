# Execution Log — Bilateral / Pooled Funding Contribution Monitor

## Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/pooled-funding-monitor` |
| Branch / baseline | `plc-monitor` @ `f93bde88` |
| Leader | Claude Code session (Opus 5.5, T1) |
| Implementer | `akili-implementer` wrapper (sonnet, T2) |
| Reviewer | `akili-reviewer` wrapper (opus, T3, read-only) — author ≠ auditor |
| Approval Mode | pre-approved (Daniela Pino, 2026-10-08) — routine continue gates logged `auto-approved (pre-approved mode)`; exceptions stop |
| Budget (design §13) | 13 tasks · ≈ 2,400 LOC · ≤ 2 review rounds/task (≈ 18 total) |
| Started | 2026-10-08 |

## Task Execution History

### Wave 1 — T-01 (server) ∥ T-08 (client)

Parallel-safe per root guide §4.3: different packages, separate `node_modules`, build outputs and ports; each worker runs **scoped** tests only. The Leader re-runs the package suites after both report.

#### T-08 — Extract the Results Center result-link builder to a shared util — **PASS** (2026-10-08)

- **Attempts:** 1 (attempt 1 reported with a `Not Done` item — `openResult` still held an inline copy of the rule — and K-004 unmet for the comparison; the Leader returned it to the same worker before review, per Step 2.3 item 0; no Reviewer cycle consumed).
- **Skills / effort:** `angular-developer` · medium.
- **Files:** `client/.../shared/utils/result-link.util.ts` (new), `result-link.util.spec.ts` (new, 5 tests), `results-center-table.component.ts` (`openResult`, `getResultHref`, `getResultRouteArray`, `getResultQueryParams` delegate through private `resultLink()`).
- **K-019 old-vs-new comparison** (temporary spec, deleted after the run; this table is the only surviving record). Old = pre-edit rule re-implemented inline; new = real component methods; compared href, route array, query params and `openResult` navigate args:

| Context | Case | New output | Result |
|---|---|---|---|
| results-center | STAR s6 [2024,2025] | `["/result","STAR-12","general-information"]` `{version:2025, from:"results-center"}` | SAME |
| results-center | STAR s6 [] | `["/result","STAR-12"]` `{from:"results-center"}` | SAME |
| results-center | STAR s4 [2024] | `["/result","STAR-12"]` `{from:"results-center"}` | SAME |
| results-center | TIP s6 [2025] | `["/result","TIP-7","general-information"]` `{version:2025, from:"results-center"}` | SAME |
| project | STAR s6 [2024,2025] | `["/result","STAR-12","general-information"]` `{version:2025}` | SAME |
| project | STAR s6 [] | `["/result","STAR-12"]` `{}` | SAME |
| project | STAR s4 [2024] | `["/result","STAR-12"]` `{}` | SAME |
| project | TIP s6 [2025] | `["/result","TIP-7","general-information"]` `{version:2025}` | SAME |

- **K-004:** `Math.max`→`Math.min` in the util ⇒ comparison red (`Expected: 0 / Received: 2`; the s6 [2024,2025] rows gave `version=2024`); restored ⇒ green. (A first `sed` break silently failed on macOS and produced a false "pass" — re-done with python3.)
- **Verification:** `npx jest src/app/shared/utils/result-link.util.spec.ts src/app/pages/platform/pages/results-center --silent --coverage=false` → 10 suites, 533 tests passed. `npx eslint` clean. Existing results-center specs unedited.
- **Reviewer (opus, attempt 1):** `STATUS: PASS` — refactor is behaviour-preserving; `resultEntryQueryParamsForNavigation(extra = {})` makes the explicit `{}` identical to the old no-arg call; signatures of the four public methods unchanged.
- **Issues noted (non-blocking):** 5 pre-existing `tsc -p tsconfig.spec.json` errors in `results-center-table.component.spec.ts` (`updateFn` unknown ×3, `MouseEvent` casts ×2) — file untouched by this task; out of scope.
- **Requirements covered:** R-PFM-013 (link rule half; the View rendering half is T-13).
- **Continue gate:** auto-approved (pre-approved mode).

#### T-01 — Pure derivation functions and enums — attempt 1: **FAIL**

- **Skills / effort:** `nestjs-expert`, `tdd` · medium.
- **Files:** `server/.../pooled-funding-monitor/derivation/pfm-derivation.ts` + `.spec.ts` (42 tests), `enum/pfm-{scope,star-label,mapping-state,prms-status,status-filter,chip}.enum.ts` (8 new files).
- **Implementer verification:** `npx jest src/domain/entities/pooled-funding-monitor --silent` → 42 passed; eslint + prettier clean. K-004 mutation runs: status 7→Draft ⇒ 1 red; synced-without-history→Not sent ⇒ 5 red; No-SP check removed ⇒ 5 red; needsAttention including out-of-scope ⇒ 3 red; isReady without Approved ⇒ 3 red; all restored green.
- **Review input deviation:** the change set is 8 new untracked files only, so the Reviewer was given their paths to read in full instead of an inline 668-line diff (diff ≡ file contents). Recorded per Step 2.3.
- **Reviewer (opus):** `STATUS: FAIL` — verbatim issue:
  1. **Discovered Issue:** `PfmScopeEnum.PORTFOLIO = 'portfolio'` in `enum/pfm-scope.enum.ts` does not match the API contract. Design §4 says `scope=mine|all` (default `mine`); `?scope=all` would be rejected and the client store mirroring `?scope=` would be built against the wrong value. **Violated Rule:** design.md §4, summary endpoint, "Query: `scope=mine|all` (default `mine`)". **Remediation:** change to `ALL = 'all'`, or amend design §4 with a logged decision first.
- **Decisions judged conforming by the Reviewer:** (a) mapping checks "no alignment → Not started" before "has_contribution=0 → No SP contribution" — `has_contribution` is NOT NULL on the entity, so NULL only arises from a missing row; design §5's bullet order is the imprecise part. (b) case-insensitive PRMS history status, fallback Pending Review; (d) unmapped status → raw name, empty PI line; (e) Approved with null date → "Approved"; (g) red evidence via mutation runs; (h) DD-PFM-6 stage assignment deferred to T-03.
- **ADVISORY (recorded, non-gating):** RELIABILITY — UTC formatting can shift the day if the Node process TZ ≠ UTC (mysql2 reads DATETIME in process-local time; no `timezone` in `orm.config`). To be handled where dates are read (T-02 brief). READABILITY — design §4 `chip_counts` keys (`attention`, `mapping`, `ready`, `pending`, `prms_rejected`, `synced`) differ from `PfmChipEnum` values; T-03/T-05 need an explicit mapping (`pending` = Awaiting PI, not PRMS Pending Review).

#### T-01 — attempt 2: **PASS** (2026-10-08)

- **Effort:** high (bumped per rework rule).
- **Change:** `enum/pfm-scope.enum.ts` → `{ MINE = 'mine', ALL = 'all' }`; case-insensitive grep for `portfolio` in the module → no hits.
- **Verification:** `npx jest src/domain/entities/pooled-funding-monitor --silent` → 1 suite, 42 passed; eslint + prettier clean.
- **Reviewer (opus):** `STATUS: PASS` — issue 1 resolved; attempt-1 audit of the rest of T-01 stands.
- **ADVISORY carried (non-gating):** UTC-vs-process-TZ date shift (→ T-02 brief); `chip_counts` keys vs `PfmChipEnum` mapping (→ T-03/T-05 briefs).
- **Decision recorded:** mapping-state precedence = no alignment → *Not started* before `has_contribution=0` → *No SP contribution* (Reviewer: conforms; design §5 bullet order is imprecise, not the code).
- **Requirements covered:** R-PFM-004, R-PFM-009 (status matching), R-PFM-010 (chip matching), R-PFM-012 (rank), Glossary §2.
- **Total:** 2 attempts, 2 review rounds. **Continue gate:** auto-approved (pre-approved mode).

#### T-06 — Design tokens + `pfm-status-badge` — **PASS** (2026-10-08)

- **Attempts:** 1 (first report omitted the `--ac-pfm-seg-*` family that design §6.2 lists and had no K-004 red; returned to the same worker before review, per Step 2.3 item 0).
- **Skills / effort:** `angular-developer`, `ui-ux-pro-max` · medium.
- **Files:** `client/.../src/styles/colors.scss` (+22 tokens in `:root`, +22 in `[data-theme='dark']`: status pairs success/info/review/neutral/danger/warning(+border), `outscope-fg`, and 8 `seg-*` incl. `seg-pending-group` for the mockup's group-bar amber); new `pages/.../pooled-funding-monitor/components/pfm-status-badge/` (ts, html, spec — no `.scss`).
- **Verification:** `npx jest src/app/pages/platform/pages/pooled-funding-monitor --silent --coverage=false` → 17/17. eslint clean. No new `.scss` (staged + untracked checks empty). No hex in new component files. K-004: PRMS Rejected tone DANGER→SUCCESS ⇒ 1 red (`prms "Rejected" renders a pill with the danger token`), restored ⇒ 17/17.
- **Reviewer (opus):** `STATUS: PASS` — labels match server enums; PRMS Not sent → "—"; SP badge binds DB color as `--sp` + `color-mix` (DD-PFM-8); Tailwind runtime CDN generates classes composed in TS.
- **ADVISORY (non-gating, carried to HITL in T-13):**
  - RISK — light neutral pair `#6b7a89` on `#eef1f5` ≈ 3.9:1 and "—" `#6b7a89` on white ≈ 4.4:1 (hand-computed, unmeasured) — below AA 4.5:1 for small text. NFR-PFM-004 requires AA → **must be measured at the T-13 HITL; darken `--ac-pfm-neutral-fg` if confirmed.**
  - a11y — bare "—" has no accessible name → T-13 brief: `aria-label="Not sent"` (or visually-hidden text).
  - READABILITY — badge value names typed as string literals; switch to the shared client type once T-07's `pfm.interfaces.ts` exists.
  - READABILITY — Tailwind `text-xs` vs STAR `fs-*` scale (design §6.2) — pick deliberately in later UI tasks.
  - DOCS — client guide asks new tokens to be listed in `client/research-indicators/README.md` and `docs/ux-ui/design.md` §7 → deferred to `/akili-archive` documentation pass.
  - Dark palette implementer-chosen → covered by the NFR-PFM-004 dark-mode HITL check.
- **Unrun check:** `tsc -p tsconfig.spec.json` on the new spec not run (Reviewer note); Leader full-suite + tsc pass scheduled at the end of PR 2.
- **Requirements covered:** NFR-PFM-003, NFR-PFM-004 (non-color cue; contrast pending HITL), R-PFM-004 rendering, R-PFM-012 ("—").
- **Continue gate:** auto-approved (pre-approved mode).

#### T-02 — Repository: base monitored-results SQL, monthly series, filter options — **PASS** (2026-10-08)

- **Attempts:** 1 · **Skills / effort:** `nestjs-expert`, `systematic-debugging` · high.
- **Files (new):** `repositories/pooled-funding-monitor.repository.ts` (`findMonitoredResults`, `countContributingProjects`, `findMonthlySyncs`, `findFilterOptions`; `PfmMonitoredRow extends PfmRawRow`; pure `splitSciencePrograms` for DD-PFM-7), `repositories/pooled-funding-monitor.repository.spec.ts` (17 unit), `test/pooled-funding-monitor.integration-spec.ts` (21 on real MySQL).
- **SQL approach:** raw `DataSource.query`, all request values bound; `effectivePoolFundingContributorSql('ac')` literal alias; PI predicate `projectLeadId IN (carnet via sec_users→alliance_user_staff) OR EXISTS active pi_delegates`, parenthesised; filters STAR / non-snapshot / active / `deleted_at IS NULL` / indicators {1,2,3,4,6} / primary active link / active contract; duplicate-current-row guard (newest `result_id` per platform+code); approval date `MAX(COALESCE(custom_date, created_at))` over versions of (code, year, platform); latest PRMS history `{status, justification}` ordered `COALESCE(decided_at, occurred_at) DESC, id DESC` (same as the history modal reader); dates emitted TZ-stable via `UNIX_TIMESTAMP` → ISO-Z string (resolves T-01 advisory).
- **Seeded vs independent count (real MySQL, scratch schema; independent SQL shares no text with the repository):**

| Scope | Repository | Independent SQL |
|---|---|---|
| Portfolio | 7 | 7 |
| PI A | 4 | 4 |
| PI B | 3 | 3 |

  Independent query: `SELECT COUNT(DISTINCT r.result_official_code) FROM results r WHERE r.platform_code='STAR' AND r.is_snapshot=0 AND r.is_active=1 AND r.indicator_id<>5 AND r.result_id IN (SELECT rc.result_id FROM result_contracts rc WHERE rc.is_primary=1 AND rc.is_active=1 AND rc.contract_id IN (<hand-named projects>))`. Also asserted: delegate = PI A; revoked delegate / stranger = 0; exclusions (OICR, TIP, AICCRA, non-primary, non-contributing, inactive result/link/contract, no contract); snapshot pair → 1 row; NULL-role single SP → primary, two → none; approval date across UTC midnight; latest history per (code, year).
- **K-004 reds:** drop platform filter → 7 fail; remove PI-OR parentheses → isolation fails (+7 rows, KZ-017 precedence case); plain `DATE_FORMAT` → session-TZ test fails; drop `result_year` from history lookup → 1 fail; remove duplicate guard → 4 fail. All restored.
- **Verification — Leader re-measured in a quiet window:** `npx jest src/domain/entities/pooled-funding-monitor --silent` → 2 suites, 59/59; `PFM_MYSQL_PASSWORD=*** npx jest --config test/jest-integration.json test/pooled-funding-monitor --silent` → 21/21. eslint + prettier clean (implementer).
- **Test DB handling:** disposable scratch schema `ari_scratch_test` only; seeding in one transaction rolled back in `afterAll` (asserts `results` empty). `alliancereportingdb` received read-only SELECTs only. PRMS log/history tables absent in scratch → created as TEMPORARY by replaying the real migration `up()` classes (`1789479131116`, `1790023167000`, `1790086170692`), FKs skipped (history has none by design).
- **RB-1 status:** Reviewer ruling — PRMS branch **verified against a migration-faithful replica**, not inconclusive; remaining gap: *not yet run against a persistent, migrated table*. RB-1 stays open.
- **Pre-existing defect found (out of scope, reported to owner):** `npm run migration:test:execute` on a clean scratch schema fails at `1787600000000-createPiDelegates` with `ER_FK_INCOMPATIBLE_COLUMNS` (charset/collation mismatch vs `agresso_contracts.agreement_id`); a partial empty `pi_delegates` table was left in the scratch schema. A worker attempt to hand-create tables on the scratch container was blocked by the permission classifier and was not retried.
- **Reviewer (opus):** `STATUS: PASS` — no injection, all ORs parenthesised, scope from authenticated user only, predicate = My Projects minus `created_by`. Judgment calls accepted: `ac.is_active=1`; newest-row duplicate guard; no `event_source` filter on latest history (a STAR re-push after REJECTED must read Pending Review); SP options only from `has_contribution=1`; months returned sparse, zero-fill in T-03; `userId` required for MINE.
- **ADVISORY (non-gating; carried into later briefs):** `results.updated_at` nullable vs `Date` type → T-05 renders "—"; duplicate guard lacks `deleted_at IS NULL` in its subquery (edge anomaly); `synced_this_year` cannot be the sum of monthly rows if it means distinct results → T-03 decides; raw `Error` for MINE without user id → T-05 makes unreachable / maps to HTTP; mixed `decided_at`/`occurred_at` clocks (same as history modal); 5 correlated subqueries per row → first suspect if NFR-PFM-002 misses in T-05; `npm run test:integration` needs `PFM_MYSQL_PASSWORD` (precedent: pi-delegates).
- **Requirements covered:** R-PFM-003, R-PFM-002 (data predicate), R-PFM-004 (sources), R-PFM-008 (data), R-PFM-009 (options).
- **Continue gate:** auto-approved (pre-approved mode).

#### T-03 — Pure aggregation functions — **PASS** (2026-10-08)

- **Attempts:** 1 (first report left `totals.monitored_total` ambiguous — implemented as the need-attention count; Leader ruled before review: = all monitored results of the unfiltered scope set, the mockup's `TOTALS.flagged`, same population as KPI card 2; same worker fixed it). · **Skills / effort:** `nestjs-expert`, `tdd` · medium.
- **Files (new):** `derivation/pfm-aggregation.ts` (`assignPfmStage`, `buildPfmPipeline`, `buildSpCoverage`, `buildMonthlySeries`, `buildPfmSummary`, `PFM_CHIP_COUNT_KEYS`, `applyPfmFilters`, `applyPfmChip`, `countPfmChips`, `buildPfmGroups`, `buildPfmQueue`, `pfmAttentionFlag`, `rankPfmRows`), `pfm-aggregation.spec.ts` (19 tests, 13-row hand-classified fixture).
- **Leader rulings applied:** chip enum ↔ `chip_counts` keys in one constant (`awaiting_pi`→`pending`); `synced_this_year` is an input (distinct results, queried in T-05); monthly = last 6 UTC months zero-filled; order filters → chip counts → chip → groups; `filter_options` from the repository; `is_pi_of_any` an input.
- **K-004 reds:** DD-PFM-6 branch removed ⇒ 2 red; stage rule dropping a row ⇒ 2 red; chip before counting ⇒ 2 red; old `monitored_total` meaning ⇒ 5 red. All restored.
- **Verification — Leader re-measured:** `npx jest src/domain/entities/pooled-funding-monitor --silent` → 3 suites, 78/78 passed; eslint clean, tsc no pfm errors (implementer).
- **Reviewer (opus):** `STATUS: PASS` — re-derived every stage value by hand from the fixture; precedence and partition exact; R-PFM-005 equalities hold; order per R-PFM-010; synced out-of-scope row → In-PRMS stage is correct, so header figures equal the three group sums.
- **ADVISORY (non-gating; carried into briefs):** T-11 must render `in_scope` / `out_of_scope` as sent and derive shares from group sums (never `total − out_of_scope`); `pfmAttentionFlag` copy has no §4 response field → T-13 owns the flag copy client-side (or T-05 adds it; decide once); SP sort is plain string (fine for zero-padded codes); the "cards agree" test could also assert the sum equality directly.
- **Requirements covered:** R-PFM-005, R-PFM-006, R-PFM-007, R-PFM-008, R-PFM-010, R-PFM-011, R-PFM-015, R-PFM-002 (`is_pi_of_any` passthrough), NFR-PFM-006.
- **Continue gate:** auto-approved (pre-approved mode).

#### T-04 — `NotContributorOnlyGuard` — attempt 1: **FAIL** (spec premise defect)

- **Skills / effort:** `nestjs-expert` · medium.
- **Files:** `guards/not-contributor-only.guard.ts` + `.spec.ts` (12 tests). Implementer verification: guards 12/12, module 4 suites / 90; eslint clean. K-004: `every`→`some` ⇒ `[3,9]` red.
- **Leader correction before review:** the T-04 Done line "`[3]` red under `some`" was non-falsifiable (`some` still denies `[3]`); corrected to `[3, 9]`.
- **Reviewer (opus):** `STATUS: FAIL` — verbatim issue:
  1. **Discovered Issue:** A machine-token request carries a real integer `sec_user_id` and real roles, so the guard's machine-token check never fires. Path: `jwr.middleware.ts` L100-108 `req.user = isValid.user` ← `AppSecretsService.validation` (`app-secrets.service.ts` L120-127) → `app-secret.repository.ts` L18-35 `getUserValidation(responsible_user_id)` returns `{sec_user_id:int, roles: JSON_ARRAYAGG(role_id)}`. Reachable: an `app_secrets` row whose responsible user is SYSTEM_ADMIN ⇒ `{sec_user_id:<int>, roles:[1]}` ⇒ `canActivate` true. The spec's "machine token" fixture `{roles:[1]}` is a shape no real machine request has. **Violated Rule:** design §8 "Machine token | Refused (403)", design §4 "403 for … machine tokens", requirements §8 "Machine tokens: not supported". Root: the spec's own false premise (tasks T-04 Behavior "no `sec_user_id` (machine token)", design §5 step 1). **Remediation:** deny when `request.credential === 'machine'` (set by `JwtMiddleware.applyImpersonation` on all branches; typed at `request-with-user.dto.ts` L47); realistic fixture `{user:{sec_user_id:7, roles:[1]}, credential:'machine'}` → deny; allow fixtures carry `credential:'jwt'`; K-004 by deleting the credential check; correct the premise in tasks/design/docstring.
- **ADVISORY:** a user with no active roles arrives as `roles=[null]` (LEFT JOIN + `JSON_ARRAYAGG`) → `[null].every(r=>r===3)` is false ⇒ allowed. Harden: ignore non-integer roles before the empty/every check. (Leader folds this into attempt 2 because it is the same clause — "empty role list → deny" — not new scope.)
- **Spec correction (not a Pivot):** the requirement is unchanged (machine tokens refused); only the design's *detection mechanism* was wrong. Corrected design §5 step 1, design §8 row, tasks T-04 Behavior + Tests. Correction-closure sweep: grep `machine token|no \`sec_user_id\`` over requirements/design/tasks — remaining hits (requirements §8, design §4 L172, design §10 test row) state the behaviour, not the mechanism, and stay true.

#### T-04 — attempt 2: **PASS** (2026-10-08)

- **Effort:** high (bumped). **Change:** deny on `request.credential === 'machine'` (literal verified: `ImpersonationCredential = 'jwt' | 'machine' | 'bypass'`, set on every middleware branch); non-integer roles filtered before the empty/every check (`[null]` case); sec_user_id/roles checks kept as defense in depth; docstring corrected.
- **Tests (18):** deny `[3]`, `[3,3]`, `[]`, `[null]`, `[3,null]`, roles missing, no / string `sec_user_id`, missing / null user, machine + `[1]`, machine + `[9]`; allow `[3,9]`, `[3,null,9]`, `[1]`/`[10]`/`[7]` (`jwt`), `[1]` (`bypass`).
- **K-004:** credential check deleted ⇒ 2 red (both machine cases); integer filter removed ⇒ 2 red (`[null]`, `[3,null]`); `every`→`some` ⇒ `[3,9]` red (attempt 1).
- **Verification — Leader re-measured:** `npx jest src/domain/entities/pooled-funding-monitor --silent` → 4 suites, 96/96. eslint clean (implementer).
- **Reviewer (opus):** `STATUS: PASS` — credential always set before the guard; tests discriminate. Ruling on `bypass`: correct to allow — set only when `ARI_LOCAL_AUTH_BYPASS==='true'` and not production (`env.utils.ts` L124-129), stands for a human stub user (SYSTEM_ADMIN), so the "user-scoped data" reason for refusing machine tokens does not apply; denying it would make the page unusable in local dev.
- **Hand-off to T-05:** confirm end-to-end that the routes are not in the JWT exclude list (401 without token).
- **Total:** 2 attempts, 2 review rounds. **Requirements covered:** R-PFM-001 (403 clause), NFR-PFM-001 (role part), DD-PFM-2.
- **Continue gate:** auto-approved (pre-approved mode).

#### T-05 — Service, controller, module registration, Swagger, e2e — attempt 1: **FAIL** (parallel lens review)

- **Skills / effort:** `nestjs-expert`, `api-design-principles`, `error-handling-patterns` · high. **Review mode:** parallel lens reviewers (security-relevant task): (A) spec + risk/security, (B) spec + API contract/reliability.
- **Files:** new module/controller/service (+ specs), `dto/pfm-query.dto.ts`, `dto/pfm-response.dto.ts`, `test/pooled-funding-monitor.e2e-spec.ts`; modified `entities.module.ts`, `main.routes.ts`, repository (+ `countSyncedThisYear`, `isPiOfAnyContributingProject`, extracted `piPredicate()`), `pfm-derivation.ts` (`updated_at: Date | null` → "—"), integration spec.
- **Implementer verification:** unit 6 suites / 114; integration 27; e2e 24 (minimal Nest testing module, real middleware/guard/pipe/service/repository/interceptor/filter, ROAR stubbed); eslint clean; `npm run build` compiles. K-004: guard removed ⇒ 2 red; MINE→portfolio ⇒ 5; main.routes removed ⇒ 19; 404 removed ⇒ 1; COUNT(DISTINCT)→COUNT ⇒ 3.
- **Leader re-measure (quiet window, reviewers read-only):** full server suite `npm test -- --silent` → 427 suites, 4123 tests passed.
- **Timing (NFR-PFM-002): INCONCLUSIVE** — local DB probe `ER_NO_SUCH_TABLE alliancereportingdb.result_prms_sync_history` (RB-1); scratch has 6 seeded rows (meaningless for timing). Recorded as a gap, **not** a pass; the "Timing table recorded" Done item stays unchecked pending owner decision on RB-1.
- **Reviewer B (contract lens):** `STATUS: PASS` — §4 shapes field-by-field, Swagger complete, 404 body identical for foreign/non-existent project, assumptions accepted (`result_code`="STAR-<code>", `type`=indicator name, `updated_at` server label or "—", per-controller ValidationPipe, whitelist strips forged ids, empty-after-filters → 200 []). ADVISORY: 403 body envelope never asserted; `updated_at` is a UTC display label → note in T-07 interfaces + confirm at HITL; group expansion re-runs full base query (NFR unmeasured); per-request `LoggerUtil`; `type` accepts any int (could `@IsIn([1,2,3,4,6])`); non-integer `sec_user_id` from ROAR would 403 everyone (unconstructible).
- **Reviewer A (security lens):** `STATUS: FAIL` — verbatim issue:
  1. **Discovered Issue:** The `entities.module.ts` registration is not proven by an HTTP call, and its evidence was never observed failing. The e2e host imports `PooledFundingMonitorModule` directly (e2e L108-114), so deleting the `entities.module.ts` import leaves all 24 HTTP cases green; only a `Reflect.getMetadata('imports', EntitiesModule)` assertion remains (L698-703), with no K-004 red. The "can't boot AppModule" premise is contradicted: `test/prms-webhook.e2e-spec.ts` (same family) retargets `ARI_MYSQL_*`→`ARI_TEST_MYSQL_*` and boots AppModule (L24-30, 98-106); `pi-delegates.e2e-spec.ts` and `prms-sync.e2e-spec.ts` likewise. **Violated Rule:** tasks.md T-05 "e2e (boots the app, hits real URLs)" + Done "module appears in both registrations"; design §10 "Boot the app and hit the real URL (KZ-017)"; requirements §6 "Module/route not reachable" row; root CLAUDE.md §4.3 K-004; server `src/CLAUDE.md` §4 step 4. **Remediation:** (a) mandatory — remove the module from `entities.module.ts` imports, observe the metadata test red, restore, record; (b) add one AppModule-boot case (prms-webhook retarget pattern) making an authenticated request to `/api/pooled-funding-monitor/summary` asserting status ≠ 404 (403 via machine secret or 200 via `ARI_LOCAL_AUTH_BYPASS`; unauthenticated 401 does not prove the route since JwtMiddleware runs on `*`). If booting AppModule would touch shared infra unacceptably, (b) may become an owner-accepted gap with the static chain stated (`app.module.ts` L38 `RouterModule.register(mainRoute)`, L40 `EntitiesModule`).
  - ADVISORY A: every endpoint 500s with the SQL error text on a DB without `result_prms_sync_history` (`GlobalExceptions` copies `exception.message`; platform-wide behaviour) → rollout must confirm migrations `1790086170692`, `1791213000000`, `1791214000000` are applied on Prod before release. The e2e's `AppSecretsService` stub accepts any machine token — proves rejection only.

#### T-05 — attempt 2: **Reviewer PASS — task held at `[~]` (owner decision RB-1 pending)** (2026-10-08)

- **Effort:** xhigh (bumped). **Changes:** new `test/pooled-funding-monitor.app-boot.e2e-spec.ts` boots the real `AppModule` (DB retargeted to the scratch schema with pre-boot loopback + `/scratch/i` refusal and post-boot DataSource/empty-`results` assertion; outbound hosts and MQ sunk to `127.0.0.1:9`; auth via in-process `ARI_LOCAL_AUTH_BYPASS` with `ARI_IS_PRODUCTION=false`); `/summary?scope=all` 200, `/queue?scope=all` 200, `/queue/projects/P-NOPE/results` 404 with `errors === 'Project not found'` (service rule, not a route miss). 403 envelope (`status`, `path`, `timestamp`) now asserted for contributor-only and machine-token cases.
- **K-004:** module removed from `entities.module.ts` imports ⇒ metadata test red (1/24) **and** app-boot spec red 3/3 (`Received: 404` ×2; `"Cannot GET …"` instead of `"Project not found"`); restored.
- **Verification:** unit 6 suites / 114; integration 27; e2e 2 suites / 27; eslint clean; `npm run build` compiles; scratch `results` 0 rows. Leader full-suite re-measure (attempt 1 code + unchanged tracked diff): 427 suites / 4123 passed.
- **Reviewer A (security, re-review):** `STATUS: PASS` — the 200 + service-404 combination is only possible through AppModule → EntitiesModule → module + `RouterModule.register(mainRoute)`. AGRESSO `:80` refusal explained (URL concatenated without separator → default port on 127.0.0.1; still loopback). Missed-variable sweep: every boot-time outbound reader is sunk; request-only readers (PRMS normalizer, TOC hosts, DynamoDB lazy SDK) not reached by the spec.
- **ADVISORY (non-gating, recorded):**
  - RISK (reachable) — the app-boot spec replays migrations `1789479131116`, `1790023167000`, `1790086170692` on scratch **without inserting their `migrations` rows** (the prms-webhook precedent does); a later `npm run migration:test:execute` on that scratch DB will hit `ER_TABLE_EXISTS_ERROR`. The scratch DB **currently** holds those tables persistently. Recovery: `compose:test:down` → `compose:test:up` → `migration:test:bootstrap` (disposable data only). Reported to the owner.
  - RISK — do not run this spec concurrently with `test:fixtures` / `test:integration` (shared scratch DDL).
  - READABILITY — sink list is hand-maintained; comment the boot-time readers; add lazy readers (`ARI_PRMS_NORMALIZER_HOST`, `ARI_PRMS_TOC_HOST`, `ARI_TOC_INTEGRATION_HOST`) as cheap insurance.
- **Open Done item:** "Timing table recorded" — NFR-PFM-002 **INCONCLUSIVE** (local DB lacks `result_prms_sync_history`; RB-1). Per Step 2.3 item 0 the task cannot reach `[x]` with an outstanding gap → **`[~]`**, escalated to the owner (RB-1: apply local migrations and measure, or waive with the gap recorded).
- **Total:** 2 attempts, 3 review rounds (2 parallel lenses + 1 re-review).

#### Escalation 2026-10-08 — budget tripwire + RB-1 (owner decisions)

- **Budget tripwire fired** after 7/13 tasks: `git diff --shortstat f93bde88..HEAD -- server/ client/` → 5,288 insertions (prod 2,100 · test 3,188) vs design §13 budget ≈ 2,400 for the whole spec. Cause: real-MySQL integration + e2e + AppModule-boot harnesses (≈ 1,750 test LOC not sized in the budget) and a heavier SQL repository. Review rounds 11 for 7 tasks (budget ≈ 18 / 13).
- **Owner (Daniela Pino):** RB-1 → "Ejecútalas tú" (Leader to apply the local migrations); budget → asked to `/compact` and continue with T-07 (recorded as: continue, revised cap ≈ 2,000 more client LOC, ≤ 2 rounds/task; re-escalate if exceeded).
- **RB-1 executed by the Leader:** target verified (`localhost:3307/alliancereportingdb`); `migration:show` (ANSI-stripped) listed exactly 3 pending — `1790086170692`, `1791213000000`, `1791214000000`; `npm run build` → exit 0; `npm run migration:execute` → all 3 "executed successfully"; re-check → 0 pending. **RB-1 closed.**

#### T-05 — timing closed → **PASS / done** (2026-10-08)

- **NFR-PFM-002 measurement (Leader, quiet window, read-only session):** harness `scratchpad/scripts/pfm-timing.js` — compiled `PooledFundingMonitorService` + repository on the local DB, `SET SESSION TRANSACTION READ ONLY`, scope `all`, user 1, 1 warm-up + 5 runs each. Volume: 155 monitored results, 43 project groups, biggest group `A1080` (20 results).

| Endpoint (service call) | Runs (ms) | Median | Spread | Target |
|---|---|---|---|---|
| summary | 17, 16, 16, 17, 16 | 16 ms | 2 ms | p95 ≤ 2 s |
| queue | 18, 20, 19, 21, 21 | 20 ms | 3 ms | p95 ≤ 2 s |
| group rows (`A1080`) | 18, 17, 17, 16, 16 | 17 ms | 2 ms | p95 ≤ 1 s |

  Spread ≤ 15 % of median (well under the 50 % no-pass threshold). **What this cannot reach (KZ-017):** service-level timing excludes HTTP/middleware overhead, and 155 rows says nothing about Prod volume (≈ 4k in the mockup) — the 5 correlated subqueries per row (T-02 advisory) remain the first suspect if Prod misses. Recorded as a scope gap, not as a Prod pass.
- **Continue gate:** owner-directed (compact, then T-07).

#### T-07 — `ApiService` methods, interfaces, `PfmStore` → **PASS / done** (2026-10-08)

- **Implementer (akili-implementer, sonnet, medium) — attempt 1:**
  - Added `pfm.interfaces.ts` (wire types mirroring the server DTOs/enums; exported const arrays + unions for the T-13 badge; `updated_at` documented as a server UTC display label; `pfmQueryString` omits null/undefined/'').
  - Added `services/pfm-store.service.ts` (+ spec, 11 tests). Provided per page (`@Injectable()`, not root); the page must provide it and call `init()`. Per-section seq counters guard against stale responses; group rows are deduped while in flight.
  - Added `GET_PfmSummary`, `GET_PfmQueue`, `GET_PfmProjectResults` to `api.service.ts` (+3 URL tests).
  - K-004 reds observed, each reverted:
    1. Removing the cache guard failed "second expand makes no new call".
    2. Removing `chip.set(null)` failed "filter change sets chip null".
    3. Removing `resetGroups()` from `setScope` failed "scope change … empties groupRows".
  - `tsc -p tsconfig.spec.json --noEmit` reported 945 errors in total, all pre-existing; none are in the new files.
  - The mutation grep over the new files matched only `Set.delete`.
- **Reviewer (akili-reviewer, opus) — STATUS: PASS:**
  - The wire types match the server DTOs and enums one for one, and the project-results response is an array.
  - The store follows §6.4 and R-PFM-002/009/011/014/016.
  - The spec asserts signal values, so the disqualifier does not apply.
- **Leader re-measure:** `npx jest src/app/pages/platform/pages/pooled-funding-monitor src/app/shared/services/api.service.spec.ts --silent --coverage=false` → 3 suites, 275/275 passed.
- **ADVISORY (non-gating):**
  - RELIABILITY — `setFilter` has no same-value guard, so re-setting the same value clears the chip and refetches. T-12 should wire `p-select` onChange only, or add a guard.
  - READABILITY — the chip has two "none" values, `null` and `'all'`. T-12/T-13 must treat both as *All results*.
- **What this cannot reach (KZ-017):** real HTTP, a router round-trip inside a mounted component, and rendering. These are covered by T-09+ and the HITL.
- **Budget:** about 660 LOC (prod ≈ 420, test ≈ 240) and 1 round, against the revised cap of about 2,000 client LOC and ≤ 2 rounds per task.

#### T-09 — Page shell → **Reviewer PASS · HITL pending** (2026-10-08)

- **Implementer (sonnet) attempt 1, effort medium.**
  - Built the route `pooled-funding-contribution-monitor` (`canMatch: [rolesGuard, pooledFundingMonitorGuard]`), `pooledFundingMonitorGuard` (awaits `PoolFundingFlagsService.load()`, allows only when `canAccessPooledFundingMonitor()` and `sectionEnabled()` are true, otherwise sends the user to `/home`), and `RolesService.canAccessPooledFundingMonitor` (`some(role_id !== 3)`).
  - Built the page component: provides `PfmStoreService` and calls `init()`; scope toggle with `aria-pressed`; `pfm-kpi-cards`; 2-tab tablist with roving tabindex and arrow/Home/End keys; PI-empty state; skeleton and error-with-retry per section.
  - Added a route spec that walks the real `routes` array and awaits `loadComponent()`.
  - K-004 reds observed: the guard condition, the RolesService predicate, an injected "Sync now" button, `piEmpty` forced false, and a renamed route path.
- **Reviewer (opus) round 1 — STATUS: FAIL.**
  - (1) The PI-empty button read "Switch to Whole portfolio"; design §6.3 says "View whole portfolio", and there was an extra sub-line.
  - (2) KPI card 2's accent used `--ac-pfm-seg-ready` (light blue); the mockup uses navy `#0d2b4e` (R-PFM-005).
- **Implementer attempt 2, effort high.**
  - Fixed the label and removed the sub-line.
  - Added the new token `--ac-pfm-accent-navy` in `colors.scss`: light `#0d2b4e`, dark `#7c9cb9`.
  - Fixed the honesty of the guard spec comment.
  - `aria-controls` is now set only on the selected tab.
  - K-004 reds observed for the label and the token.
- **Reviewer round 2 — STATUS: PASS.**
- **Leader verification.**
  - K-004 for the `aria-controls` assertion, which was unseen: I bound the attribute unconditionally and got 1 failed / 42 passed; I restored it.
  - Re-measure: `npx jest src/app/pages/platform/pages/pooled-funding-monitor src/app/shared/guards/pooled-funding-monitor.guard.spec.ts src/app/shared/services/cache/roles.service.spec.ts src/app/app.routes.spec.ts --silent --coverage=false` gave 8 suites and 83/83 passing.
  - Implementer: tsc spec total 945 (unchanged), none in T-09 files; `ng build --configuration development` passes.
- **Open Done item — running-app check (KZ-017).**
  - It needs an authenticated Cognito session in a browser, which the Leader cannot drive headless.
  - It is **batched into the consolidated owner HITL at T-13** (open `/pooled-funding-contribution-monitor`, quote what is observed). T-09 therefore stays **`[~]`/HITL pending**; T-10 proceeds on the code dependency.
- **ADVISORY (non-gating):**
  - Risk: the flag read fails open. `PoolFundingFlagsService` returns true on error, so the page opens when the flag read fails. This is shared-service behaviour; the server still enforces access.
  - Dark mode: the `h1` uses `--ac-primary-blue-300`, which is low contrast in dark mode, and the cards share the page background token. Check at HITL.
  - Copy: the mockup subtitle says "sync approved results … to PRMS" on a view-only page. Confirm with the owner at HITL.
- **Budget:** about 720 LOC over 2 rounds. Client total after T-07 and T-09 is about 1,380 of the revised cap of about 2,000. **Projection:** T-10 through T-13 will exceed the cap, so expect a re-escalation.

#### T-10 — Sidebar monitor item → **PASS / done** (2026-10-08)

- **Implementer (sonnet, medium), attempt 1:**
  - `piOptions()` now returns *My PI Delegates* when `canSeePiDelegates()` holds. It then adds the monitor (`/pooled-funding-contribution-monitor`, `pi-chart-bar`, 13px) when both `canAccessPooledFundingMonitor()` and `sectionEnabled()` hold.
  - The section guard changed from `canSeePiDelegates()` to `piOptions().length > 0`. That one `@if` wraps both the expanded and the collapsed branch.
  - The existing hidden-section test was renamed to "hides the whole PI section when no PI option is visible". Its assertions are unchanged.
- **Case (b) red BEFORE the change:** 3 failed, 37 passed.
  - The (b) assertion failed with `Expected substring: "PRINCIPAL INVESTIGATOR"` / `Received string: " RESOURCES keyboard_double_arrow_left  About Indicators ACCOUNTAsk for HelpLog out"`.
  - The collapsed (b) assertion failed with `Received: null`.
  - The (a) assertion failed with `Expected: 1 Received: -1`.
- **Case (d) red:** removing `sectionEnabled()` failed only (d). The guard was then restored.
- **Reviewer (opus): STATUS: PASS.**
  - The visibility test was not weakened, and both branches are gated.
  - The flag is loaded app-wide: `app.config.ts` initializer plus `cognito.service.ts` after login.
  - *My PI Delegates* is unchanged when there is no monitor access.
- **Leader re-measure:** `npx jest src/app/pages/platform/platform.component.spec.ts src/app/shared/components/alliance-sidebar --silent --coverage=false` gave 2 suites, 54/54.
- **tsc:** 945, at baseline. The 7 TS2352 errors in the sidebar spec were there before this change; the comparison was by count only.
- **ADVISORY:**
  - Flag fail-open: the item is visible until the flag read resolves, and stays visible if the read fails. This is shared-service design, and the server still enforces access.
  - The comment above `piOptions()` reads awkwardly.
  - Not reached by these tests: real nav rendering in the running app. That goes to the T-13 HITL.
- **Budget:** about 77 LOC, 1 round. Client total is about 1,460 of the revised cap of about 2,000.

#### T-11 — Coverage tab → **PASS / done** (2026-10-08)

- **Implementer (sonnet, medium), attempt 1:**
  - New components: `pfm-coverage-tab`, `pfm-pipeline-card`, `pfm-sp-coverage-card` and `pfm-sync-activity-card`.
  - `<app-pfm-coverage-tab>` is wired into the coverage panel after T-09's skeleton and error branches.
  - Values and order are rendered exactly as the server sends them. Share %, widths and heights are presentation only.
  - K-004 reds observed:
    - Removing the `value > 0` segment filter failed "zero stage renders no segment".
    - Gating the month label on `synced > 0` failed "month without syncs still renders its label".
    - Combined run: 2 failed, 32 passed. Both were restored.
- **Leader adjudication (R-PFM-016):**
  - The three cards all come from the single summary request, so the "per section" state is the summary section.
  - The T-09 panel-level skeleton plus error/Retry satisfies the requirement's own scenario. The Reviewer confirmed this.
- **Reviewer (opus) STATUS: PASS.**
  - Stage order, labels, notes and segment tokens match the mockup and `PFM_STAGES`.
  - SP row format, subtitle and legend copy match per scope.
  - There is no client recomputation (NFR-PFM-006).
  - The style-binding tests are labelled binding-only, so the disqualifier is not triggered.
  - Dropping "· N in June, the cycle high" is correct: `monthly` covers only 6 months.
- **Leader re-measure:**
  - `npx jest src/app/pages/platform/pages/pooled-funding-monitor --silent --coverage=false` → 9 suites, 56/56.
  - NFR-PFM-003: no `.s?css` in `git status`, and no hex in non-spec pfm `.ts`/`.html`.
  - From the Implementer: tsc at 945 (baseline), and `ng build` passes.
- **ADVISORY (carry to the T-13 HITL):**
  - The pipeline subtitle `createdNote` ("across all/your projects contributing to Pool funding") is omitted.
  - The sync-activity subtitle "Results pushed to PRMS over the {year} reporting cycle" is omitted.
  - There is a single `h-48` skeleton instead of card-shaped blocks.
  - An empty `sp_coverage` shows no message.
  - The pipeline segment `<ul>` should get `aria-hidden`.
  - The SP bar has no outer track (the mockup uses a light track).
- **Budget:** about 490 LOC, 1 round. The client total is about 1,950 against the revised cap of about 2,000. **T-12 and T-13 will exceed the cap. Re-escalate after T-12 or T-13 per the owner rule.**

#### Escalation 2026-10-08 — client budget cap reached after T-11

- **Where the client stands:** about 1,950 LOC against the revised cap of about 2,000. T-12 and T-13 are still open, estimated at 900–1,100 LOC, roughly half of it tests.
- **Owner decision (Daniela Pino):** "Seguir hasta T-13 (Recomendado)". The client cap is raised to about 3,200 LOC, with at most 2 rounds per task. Visual HITL happens at the end.

#### T-12 — Queue tab: filters, chips, footer → **PASS / done** (2026-10-08)

- **Implementer (sonnet), attempt 1, effort medium.** Added `pfm-queue-tab`, which injects the page-scoped store.
  - **Filters:** 4 `p-select`s built from `filter_options`. The SP filter is grouped by category. Each binds `(onChange)`.
  - **Chips:** 7, in mockup order, with counts taken straight from `chip_counts`. The selected chip has `aria-pressed`, a check icon, and bold + underline.
  - **Rest of the tab:** Reset, a count line per scope plus the legend, and an empty state when the filters match nothing. The group area is a placeholder for T-13.
  - **Loading:** the queue panel shows the full skeleton only on the first load.
  - **K-004 reds observed:**
    - Chip counts set to `groups.length` made the count test fail.
    - Removing `aria-pressed` failed 2 tests.
    - Disabling the marker failed its test.
    - Reset calling only `setChip(null)` failed the Reset test.
- **Reviewer (opus) round 1 — STATUS: FAIL.** A queue refetch that failed or was still in flight rendered the previous query's chip counts, groups and `monitored_total` under the new filters, chip and scope. This violates NFR-PFM-006 and R-PFM-016.
- **Implementer attempt 2, effort high, remediation (a).** Added `stale = loading || error`.
  - While stale, chip counts and the count line are hidden.
  - The groups area shows nothing on error and a skeleton while loading.
  - Filters, Reset, the chips without numbers, and the legend stay visible.
  - Two page-level transition tests were added. K-004 red: with the guards reverted, both failed. Test 1 rendered "Showing 41 results across 6 projects · 99 flagged portfolio-wide" next to the error. Test 2 showed the leftover chip count "41".
- **Reviewer round 2 — STATUS: PASS.**
- **Leader re-measure:** `npx jest src/app/pages/platform/pages/pooled-funding-monitor --silent --coverage=false` gave 10 suites, 70/70. The NFR-PFM-003 greps are clean. The implementer reports tsc at 945 (baseline), eslint clean, and `ng build` OK.
- **ADVISORY (for the HITL / not gating):**
  - Project options show "CODE — name"; the mockup shows names only.
  - "All Science Programs" sits in a group of one item.
  - The active chip's count badge is not filled with the accent colour, as it is in the mockup.
  - `filter_options` stay stale during the refetch that follows a scope change.
  - The `noOldNumbers` check scans the whole page.
  - Dark-mode contrast of the selected chip is not yet verified.
- **Budget:** about 470 LOC over 2 rounds. Client total is about 2,420 of the revised cap of about 3,200.

#### T-13 — Project groups, result rows, View → **Reviewer PASS · HITL pending** (2026-10-08)

- **Implementer, attempt 1 (sonnet, medium effort)**
  - Added `pfm-project-group`:
    - The header is a native `<button>` with `aria-expanded`/`aria-controls`.
    - It shows the code, name, "Lead PI: … · donor", and the count.
    - A stacked bar has one `title` per segment; zero-value segments are filtered out.
    - The flag shows "N need(s) attention" or "All clear".
    - Rows load lazily through the store: a 3-row skeleton first, and an error with Retry per group.
  - Added `pfm-result-row`, with columns in mockup order: Result, STAR status, Pool funding mapping, PRMS status, Updated, Action.
    - View is the only action and appears on every row.
    - The title and View use `buildResultLink` through a real `routerLink` with `queryParams`.
  - Rows sit in `overflow-x-auto` with a `min-w-[62rem]` grid.
  - The badge `value` is typed with the shared unions.
  - K-004 reds observed:
    - `aria-expanded` hardcoded.
    - `snapshot_years` dropped, which made the `?version=` test fail.
    - View hidden on out-of-scope rows.
    - The text "Sync" injected.
- **Reviewer round 1 — STATUS: FAIL:** on Not-sent rows the dash had `title="Not sent"`, which shadowed the PRMS hint "Not synced to PRMS yet". This breaks R-PFM-012 and R-PFM-004.
- **Implementer, attempt 2 (high effort)**
  - Removed the dash `title`; `aria-label="Not sent"` stays.
  - The spec asserts the effective tooltip (`closest('[title]')`) equals the hint. The red was observed: `Expected: "Not synced to PRMS yet"` / `Received: "Not sent"`.
  - Leader-directed a11y fix: the bar inside the button changed from `<ul>` to `aria-hidden` `<span>`s, plus an `sr-only` summary of the non-zero segments. Its red was observed by changing the separator.
- **Reviewer round 2 — STATUS: PASS.**
- **Leader closing re-measure (quiet window, no worker active)**
  - Full client suite: `npx jest --silent --coverage=false` gave 357 suites and 8019/8019 passing.
  - `npx tsc -p tsconfig.spec.json --noEmit` reports 945 errors, the same as the baseline. 0 of them match `pooled-funding-monitor|result-link|pfm`.
  - The implementer reports eslint clean on the feature, the NFR-PFM-003 greps clean, and `ng build` passing.
- **Open Done item (consolidated HITL, owner):** see "HITL checklist" below. Until it is quoted here, T-09 and T-13 stay `[~]`.
- **ADVISORY:**
  - The mapping cell adds `mapping_note` and a primary-SP badge that the mockup group row does not show. Judge this at the HITL.
  - Enter/Space depend on the native `<button>`, so they are untested in jsdom.
  - Whether the `sr-only` text is actually hidden and announced needs a browser check.
  - A group-body id would break if a project code contains spaces. This was not reproducible from the fixtures.
- **Budget:** about 500 LOC over 2 rounds. The client total is about 2,920 against the revised cap of about 3,200.

#### HITL checklist (owner, running app) — pending

1. Open `/pooled-funding-contribution-monitor` with an allowed role. The page renders, with no `NG04002`. **(T-09, KZ-017)**
2. The sidebar shows the monitor under *My PI Delegates*. A contributor-only user does not see it.
3. Click **View** on one approved result that has a snapshot and on one draft. Both open the correct result page. **(T-13)**
4. Compare the page side by side with `mockup/pooled-funding-contribution-monitor.html` at ≥ 1280 px and at 1024 px, in light and in dark mode.
   - Bar proportions.
   - KPI navy accent.
   - Titles in dark mode, where `--ac-primary-blue-300` has low contrast.
   - Contrast of the selected chip.
   - Light neutral fg at about 3.9:1.
   - Omitted subtitles: pipeline `createdNote` and sync-activity `monthSub`.
   - Project option labels "CODE — name".
   - Mapping-cell extras.
5. Keyboard pass:
   - Toggle and tabs: arrows, Home and End.
   - Chips.
   - A group header with Enter and Space.
   - Focus is visible throughout.

#### HITL round 1 (owner, 2026-10-09) — coverage tab restyle → **PASS (code); owner re-check pending**

- **Owner observation (verbatim):** "portafolio coverage no esta con estilos, debe ser como la priemra foto y esta como la segunda sin clores y todo plano, ajustalo". The owner sent two screenshots: the mockup target and the running app. The running app showed:
  - cards on the page background with no surface of their own;
  - the pipeline header, tiles and bar laid out differently from the mockup;
  - SP rows split over two lines;
  - month values printed above zero-height bars.
- **Implementer (sonnet, high):**
  - New tokens in `colors.scss`, each with a light and a dark value: `--ac-pfm-surface`, `--ac-pfm-surface-border` and `--ac-pfm-month-1..6`.
  - The card surface is applied to the pipeline, SP, sync, KPI and group cards.
  - Pipeline: title and scope subtitle on the left, total on the right, figure line, 26px bar, 5-column tiles.
  - SP rows on a single grid line, with a mono count.
  - Sync card: subtitle "Results pushed to PRMS over the {year} reporting cycle", the label "RESULTS SYNCED PER MONTH", and a 6-shade month ramp. Month values are now `sr-only` text plus a `title`.
  - Active tab is navy with a 3px underline.
- **Reviewer round 1: FAIL.**
  - (1) `min-h-[6px]` made a zero month render a visible bar, which breaks R-PFM-008.
  - (2) The stage note was no longer visible, which breaks R-PFM-006 L216.
- **Leader adjudication:**
  - (1) Fixed in code.
  - (2) Treated as an owner decision, because the owner's target screenshot has no notes. R-PFM-006 is amended and **DD-PFM-13** is recorded in `design.md`. The note stays available as a tooltip and as `sr-only` text.
- **Implementer fix:**
  - The minimum height now applies only when `synced > 0`. K-004 red observed: `Expected substring: not "min-h-"` / `Received string: "bg-[var(--ac-pfm-month-2)] min-h-[6px] rounded-t-md w-full"`.
  - An `sr-only` note was added to each tile. K-004 red observed: `Received: undefined`.
- **Reviewer round 2: PASS.**
- **Leader re-measure:** PFM jest 12 suites, 87/87. Implementer gates: tsc 945, hex grep clean, eslint clean, `ng build` OK.
- **ADVISORY (accessibility):**
  - `--ac-pfm-month-1` and not-started bars are about 1.3–1.4:1 against their background (non-text).
  - `--ac-pfm-neutral-fg` on white is about 4.4:1 for small labels.
  - Month values are not visible as text.

#### HITL round 2 (owner, 2026-10-09) — equal-height coverage cards → **PASS (code); owner re-check pending**

- **Owner (verbatim):** "sync activity card esta mas pequeno en H que el de al lado, arregla eso".
- **Cause:** the component hosts were inline, so the `<section>` did not fill its stretched grid cell.
- **Fix (sonnet):**
  - The SP, sync and pipeline hosts get `block h-full`, and each section gets `h-full`.
  - The sync section is a `flex-col` and its chart is `flex-1 min-h-[150px]`. Bars are absolutely positioned inside a `relative flex-1` box.
  - The zero-month rule is unchanged. One assertion was added (`h-full`).
- **Reviewer:** STATUS: PASS.
- **Leader re-measure:** PFM jest gave 12 suites, 88/88 passing.
- **Not reached:** jsdom does not compute layout. Equal height and non-collapsed bars need a browser check.

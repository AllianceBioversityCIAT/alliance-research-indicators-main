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

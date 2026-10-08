# Execution — Bilateral / Pool Funding Reporting Year

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/bilateral/pool-funding-reporting-year/` |
| Run | `run_e714cc92a465` (Orca) |
| Branch | `pull-prms-result` · baseline `a280ba9ff` |
| Leader | Claude Opus 5.5 (this session) |
| Implementer | Grok `grok-4.7-high` via Cursor (Orca `/orchestration`) — standing split: Grok implements, Claude reviews |
| Reviewer | Claude `akili-reviewer` wrapper (fresh context, different weights from the Implementer) |
| Approval mode | pre-approved (owner standing direction 2026-10-06: continue task to task; stop only on FATAL_FAIL / HALT / Pivot / tripwire) |
| Budget (tripwire) | 9 tasks · ~850 LOC · ~13 review rounds (design §0) |

## 2. Task Execution History

### T-01 — `ReportingYearResolver`, `AppConfigKey.ARI_PRMS_SYNC`, seed migration → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_fa3848013b10` / `ctx_5bbda0c936d0` |
| Implementer | Cursor · `grok-4.7-high`, effort medium, skills `nestjs-expert`, `tdd` |
| Reviewer | Claude `akili-reviewer` (fresh context) — **PASS** |
| Requirements covered | R-PRY-001 (both scenarios), NFR-PRY-002 |

**Files changed (6):**
- `server/researchindicators/src/domain/shared/utils/reporting-year.resolver.ts` (new)
- `server/researchindicators/src/domain/shared/utils/reporting-year.resolver.spec.ts` (new)
- `server/researchindicators/src/domain/shared/utils/global-utils.module.ts`
- `server/researchindicators/src/domain/entities/app-config/enum/app-config-key.enum.ts`
- `server/researchindicators/src/db/migrations/1791488432640-seedPrmsSyncReportingYear.ts` (new)
- `server/researchindicators/src/db/migration-specs/1791488432640-seedPrmsSyncReportingYear.spec.ts` (new)

**Implementer verification (as reported):**
- The targeted suites (resolver spec and migration spec) passed: 2 suites, 15 tests. `npx eslint` on all 6 files exited 0. `npx tsc --noEmit -p tsconfig.json` exited 0.
- Falsifiers were observed red, then reverted:
  - (a) A memo field that returns the first value made the "row changes" case fail with `Expected: 2027` / `Received: 2026`.
  - (b) Replacing `^\d{4}$` with `Number.isFinite(Number(trimmed))` made the `'20265'` case fail with `Expected: 2026` / `Received: 20265`.
  - (c) Dropping the `is_active` filter made the inactive case (fixture `'2027'`) fail with `Expected: 2026` / `Received: 2027`.
- The migration ran on the disposable TEST schema (`ari_scratch_test` @ 127.0.0.1:3307), not on the shared Dev DB:
  - `migration:test:execute` emitted `INSERT IGNORE INTO app_config ... ["ARI_PRMS_SYNC","2026",...,"API","PRMS"]`.
  - A second `up` with an existing `'2030'` value left it at `'2030'`.
  - `migration:test:revert` emitted `DELETE` by key.
  - The migration was then re-applied.
- The migration spec asserts the `INSERT IGNORE` text and the absence of `ON DUPLICATE KEY UPDATE`.

**Evidence re-run (Leader inline): VERIFIED.**
- The same targeted test command gave 2 suites and 15 tests passed. eslint exited 0 and tsc exited 0.
- The full server suite (`npm test -- --silent`) gave **423 suites / 4047 tests passed**.

**Not Done / Assumptions (verbatim gist, no owed items):**
- Nothing in T-01's scope is pending.
- The logger is `LoggerUtil._warn`, instantiated inside the class. The constructor still takes only `DataSource`.
- The first scratch `migration:test:execute` also applied three migrations that were already pending on the branch: `UpdateSPVersioning1790948647174`, `BackfillPrmsResultCodeOnLiveVersions1791316921000` and `UpdateSPVersionDeletePRMSPhase1791468452856`. This affected the scratch schema only. The scratch container was started for the test and stopped afterwards.

**ADVISORY (4R, non-gating):**
1. `^\d{4}$` accepts `'0000'`/`'1999'` without a warning. This matches the spec's literal wording; a range check is candidate future work.
2. `INSERT IGNORE` does not re-activate an existing *inactive* row; the resolver then falls back to 2026. **Forward pointer → T-09:** mention this in the rollout note.
3. `down` deletes the row unconditionally, admin edits included. This follows the spec and the exemplars, and the fallback is a safe 2026.
4. The migration spec duplicates the description string.
5. KZ-017 scope: the migration spec proves the emitted SQL, not MySQL behaviour. Idempotence rests on the scratch run.

**Decisions / issues:**
- The worker wrote its report to `docs/specs/.../t-01-implementer-report.md`, which is outside the brief's file scope. The Leader removed the file and folded its content into this entry.
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer not reported by host, ended complete; reviewer 16 calls, 62585 tokens, ended complete`.

### T-02 — ToC and CLARISA consume the year; env var retired → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_e4687ddcac8e` / `ctx_e6d305a36dee` |
| Implementer | Cursor · `grok-4.7-high`, effort medium, skills `nestjs-expert`, `tdd` |
| Reviewer | Claude `akili-reviewer` (fresh context) — **PASS** |
| Requirements covered | R-PRY-002 "Change without deploy" (ToC/CLARISA clauses + BUT), "Env var retired" (THEN + AND IT MUST), NFR-PRY-001 (ToC/CLARISA half) |

**P-6 answer:**
- The owner answered on 2026-10-08, before dispatch: *"Yes, both set 2026"*. Dev on-prem and Prod AWS both set `ARI_PRMS_SYNC=2026`.
- So always sending `?year=` and `?phase=` does not change behaviour. P-6 moves from UNVERIFIED to `user-stated`, and RB-1 is closed.

**Consumer grep (`getTocResultsForSps\|getTocResults(`, over `src/` and `test/`, before the edits):**
- Real callers:
  - `bilateral.service.ts` :407 (`getTocResultsForSps`), :968 and :1370 (`getTocResults`), plus a comment at :354.
  - `pool-funding-mapping-apply.service.ts:612`.
- Definitions in `toc-integration.service.ts`: :48 and :126, plus an internal call at :135 and a comment at :72.
- Specs: `toc-integration.service.spec.ts`, `bilateral.service.spec.ts`, `bilateral.service.getHlosIndicatorsForResult.spec.ts`.
- Excluded on purpose: `PrmsTocService.getTocResults` (`prms-toc.service.ts` and its spec) is a different class and was not modified.

**Files changed (18):**
- `server/researchindicators/.env.example`
- `toc-integration.service.ts` and its spec
- `clarisa-projects.service.ts` and its spec
- `app-config.util.ts`
- `env.utils.ts`
- `bilateral.service.ts`, plus 7 `bilateral.service*.spec.ts` files (constructor and resolver realignment)
- `pool-funding-mapping-apply.service.ts` and its spec
- `test/bilateral-primary-contributing-sp.integration-spec.ts`

**Implementer verification (as reported):**
- eslint on 17 `.ts` files exited 0. `tsc --noEmit` exited 0. The full suite had 423 suites and 4048 tests passing.
- The env grep exited 1 with zero hits. It cannot see `dist/` or `.env`; `.env` was untouched on purpose.
- Falsifier (a): restoring the shared `cacheKey()` gave `Expected number of calls: 2 / Received number of calls: 1` at `expect(httpGet).toHaveBeenCalledTimes(2)`. The two payloads differ (`toc_result_id` 2026 vs 2027), and the next line asserts on the payload.
- Falsifier (b): allowing stale-on-error across phases gave `Received promise resolved instead of rejected … "short_name": "OLD"` at `await expect(service.findProjectById(1)).rejects.toBeInstanceOf(ServiceUnavailableException)`.
- Both mutations were reverted and the suite went back to green.

**Evidence re-run (Leader inline): VERIFIED.**
- The env grep had 0 hits. `tsc --noEmit -p tsconfig.json` exited 0. `npx eslint` on the 17 changed `.ts` files exited 0.
- The full server suite (`npm test -- --silent`) had **423 suites / 4048 tests passing**.

**Scope gap (KZ-017):**
- `test/bilateral-primary-contributing-sp.integration-spec.ts` was type-checked but **not executed**, because `npm test` uses `rootDir: src`.
- **Forward pointer → T-03:** T-03 already owes `npm run test:integration` for this file, and that run covers the T-02 change too.

**ADVISORY (4R, non-gating):**
1. `cacheKey()` is now the public Map key, not the cache identity. A rename such as `mapKey` is optional.
2. In `getCachedAll`, `now` is taken before `resolve()`. The skew is milliseconds against a 5-minute TTL.
3. The `resolve()` call at `bilateral.service.ts:972` sits inside an existing `try`, so a throw would be swallowed. That is unreachable today, because the resolver degrades to 2026 instead of throwing. **Forward pointer → T-03:** re-check this when the year is threaded properly.
4. After a year change, the old year's ToC entries stay in memory until a restart. They are small, and they are never served for the new year.

**Decisions / issues:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer not reported by host, ended complete; reviewer 14 calls, 88450 tokens, ended complete`.

### T-03 — Bilateral year threading, constant removal, read flags → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_70df2359d4df` / `ctx_663debb416dc` |
| Implementer | Cursor · `grok-4.7-high`, effort high (size L), skills `nestjs-expert`, `tdd` |
| Reviewer | Claude `akili-reviewer` (fresh context) — **PASS** |
| Requirements covered | R-PRY-002 (2027 editable / 2026 read-only clause; row wins over env; no constant reader), R-PRY-006 (all clauses) |

**Files changed (15):**
- Server (12):
  - `toc-level-rules.util.ts` and its spec: the constant and its spec are removed.
  - `bilateral.service.ts`: the year is resolved once in `getHlosIndicatorsForResult`, `getAlignment`, `updateAlignment`, `upsertContribution`, `deleteContribution`, `listIndicators` and `importAlignmentFromPrms`.
    - There is a private `buildAlignment(…, year)`.
    - The year is threaded into `toWire*`, `resolveLiveTargetValue`, `validateTocAlignments` and `findTocResultIdByTitle`.
  - `bilateral.service.spec.ts`, the `getHlosIndicatorsForResult` spec, the `updateAlignment.tocAlignments` spec, and `bilateral.controller.spec.ts` (the Swagger field list).
  - Both alignment and HLOS DTOs.
  - `pool-funding-mapping-apply.service.ts` and its spec: the year goes through `apply → applyUnsafe → resolveIndicator → liveTargetValue` and `getTocResults(sp, level, year)`, with `targetYear` = year.
  - `prms-sync-response.interpreter.ts`: comment only.
- Client (3, comments only, needed for the constant grep): `pool-funding-alignment.interface.ts`, `result-sidebar.component.ts`, `result-sidebar.component.spec.ts`.

**Implementer verification (as reported):**
- `tsc` exited 0, and again after the falsifier revert. eslint on the 12 server files exited 0.
- The `MAPPABLE_LIVE_VERSION` grep returned no lines (exit 1).
- The full suite had 423 suites and 4058 tests passing. The first full run had 1 failure, because the controller-spec metadata did not list the two new fields; that expectation was updated.
- Falsifiers, each observed red and then reverted:
  - (a) Hard-coding 2026 in `resolveLiveTargetValue` gave `Expected: "77" Received: "12"` at `expect(indicator.target_value).toBe('77')`. The resolver is set to 2027, and the fixture has 2026 = '12' and 2027 = '77'.
  - (b) Computing `has_pool_funding_data` as `has_contribution === true` gave `Expected: true Received: false` for the (false, unsynced, no code) row.
  - (c) Re-importing `MAPPABLE_LIVE_VERSION` gave `bilateral.service.ts(47,3): error TS2305: Module '"./utils/toc-level-rules.util"' has no exported member 'MAPPABLE_LIVE_VERSION'`.

**Integration suite: run and quoted, environment-blocked (recorded gap, not a pass):**
- `npm run test:integration` gave `Test Suites: 4 failed, 4 total; Tests: 17 failed, 3 passed, 20 total`. The causes:
  - `PID_MYSQL_PASSWORD` is unset.
  - The PRMS suites hit unknown columns on the incomplete scratch schema.
  - The bilateral file failed with `T13_MYSQL_PASSWORD is not set`.
- The bilateral file was then retargeted to the scratch DB at 127.0.0.1:3307. That gave `Tests: 4 failed, 5 passed, 9 total`, with these failures:
  - The provenance check failed because the host equals `ARI_TEST_MYSQL_HOST`.
  - Three round-trips failed with `QueryFailedError: Table 'ari_t13.clarisa_levers' doesn't exist`.
- `migration:test:bootstrap` on a fresh scratch container had already failed at `CreateClarisaInnovationUseLevels` (`ER_TABLE_EXISTS_ERROR`). This is pre-existing and was not retried.
- The scratch container was stopped. The shared Dev DB was not touched.
- The Reviewer confirmed the failures are environmental: the diff touches nothing under `test/` and no schema.
- The spec stubs the resolver to 2026 (`:369`, `:634`), so even a green run would not exercise year threading.
- This is logged as **RB-4**. Re-check it once the scratch schema and credentials are restored.

**Evidence re-run (Leader inline): VERIFIED.**
- The constant grep (server `src`/`test` plus client `src`) had 0 hits. Server `tsc` exited 0. eslint on the 12 changed server files exited 0.
- The full server suite (`npm test -- --silent`) had **423 suites / 4058 tests passing**.
- The client `result-sidebar` spec had 156/156 passing.

**Forward pointers closed:**
- T-02 advisory 3: `findTocResultIdByTitle` now takes `year` as a parameter, and the resolve sits outside its `try`.
- T-02 integration gap: the integration suite was run, but it is environment-blocked (RB-4).

**Not Done / Assumptions (carried verbatim in gist):**
- The integration run does not exercise the year-threading behaviour.
- `assertTocMappingVersionUnlocked(context, year)` now takes the resolved year so that the deleted export still compiles. Its 409 code is unchanged. The Reviewer judged this a forced compile consequence of D-5/D-10, not scope creep. **Forward pointer → T-04:** delete the function and its call.
- `getEditableContributionContext(resultId, _year)` is threaded but unused. **Forward pointer → T-04:** it must use `year`.
- The client response fields are unchanged, as owned by T-06.

**ADVISORY (4R, non-gating):**
1. The write-path snapshot (`validateTocAlignments` → `target_year`/`target_value`) has no test with the resolver at 2027. **Forward pointer → T-04** (it touches `updateAlignment` specs): it may add one 2027-result case `[advisory-grade]`.
2. `has_pool_funding_data` reads `visibleAlignment`, which is gated on eligibility. A result that is no longer a contributor reads `false`. There is no UI effect, because the contract gate hides the tab anyway. This is candidate one-line wording for design §5.
3. The unused `_year` parameter is covered by the T-04 pointer above.

**Decisions / issues:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer not reported by host, ended complete; reviewer 11 calls, 87603 tokens, ended complete`.

### T-06 — Client contract + `BilateralService.editable` → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_4dfeeeed5df8` / `ctx_c9ae6e1c40b7`. Ran in parallel with T-04 (server), which is cross-package and edit-safe. |
| Implementer | Cursor · `grok-4.7-high`, effort medium, skills `angular-developer`, `tdd` |
| Reviewer | Claude `akili-reviewer` (fresh context) — **PASS** |
| Requirements covered | R-PRY-003 "Past-year answered, never synced": the AND clause that controls cannot change data (via `editable`) |

**Files changed (3):**
- `client/research-indicators/src/app/shared/interfaces/bilateral/pool-funding-alignment.interface.ts`: adds `has_pool_funding_data?` and `reporting_year?`, and rewrites the `version_locked` comment.
- `client/research-indicators/src/app/shared/services/bilateral.service.ts`: adds `if (alignment.version_locked === true) return false;` after the `is_read_only` check and above the center-admin bypass.
- `client/research-indicators/src/app/shared/services/bilateral.service.spec.ts`: 3 owner-fixture cases.

`toc-catalog.fixture.ts` is unchanged: the new fields are optional and the fixture has a different type.

**Consumer grep:** the only production binding is `pool-funding-alignment.component.ts:213` (`readonly editable = this.bilateralService.editable`). Every other hit is that page's `this.editable()` calls or a spec.

**Implementer verification (as reported):**
- The scoped `bilateral.service.spec.ts` run passed 76/76.
- Falsifier: dropping the new line made "false for an owner when version_locked is true" fail with `Expected: false / Received: true` at `expect(service.editable()).toBe(false)` (spec :737). The line was then restored.
- `npm run lint -- --quiet` reported "All files pass linting".

**`tsc -p tsconfig.spec.json`: the Done item is read as "no change from the baseline".**
- The project has a pre-existing baseline of **945** errors (root `CLAUDE.md` §4.3, K-004).
- After this change the count is still **945**.
- The touched files carry **6** errors, all pre-existing TS2352 casts in the spec. That error set is identical to HEAD, per the Implementer's comparison.
- None of these errors are on the new tests or the production lines.
- The Reviewer accepted this reading on condition that it is recorded explicitly. "Clean" is not literally true.

**Evidence re-run (Leader inline, after both parallel workers had reported): VERIFIED.**
- The scoped spec passed 76/76.
- `tsc -p tsconfig.spec.json` gave **945** `error TS` lines, of which 6 are in the touched files.
- Lint passed: "All files pass linting".
- The full client suite (`npm test -- --silent`) passed: **341 suites / 7855 tests**.

**ADVISORY (non-gating):**
- No test pins *center admin + locked → false*. The line's position above the admin bypass makes this behave correctly; a one-line case would pin it. Not in the task's test list.

**Decisions / issues:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer not reported by host, ended complete; reviewer 7 calls, 37713 tokens, ended complete`.

### T-04 — Server write guard `pool_funding_year_locked` → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_ddbe81125bfd` / `ctx_7d0c9d8b420f`. Ran in parallel with T-06 (client). |
| Implementer | Cursor · `grok-4.7-high`, effort high, skills `nestjs-expert`, `error-handling-patterns`, `tdd` |
| Reviewer | **Parallel lens mode** (authorization / write gate). Two fresh Claude `akili-reviewer` contexts: (1) conformance + reliability → **PASS**; (2) risk + resilience / security → **PASS** |
| Requirements covered | R-PRY-004: legacy body on a past year (409 + nothing written + no emit), current year still writable, contribution POST/PATCH/DELETE, source gates first, response changes |

**First-step greps:**
- `getEditableContributionContext` has two callers plus its definition: `bilateral.service.ts:1595` (`upsertContribution`), `:1684` (`deleteContribution`), and the definition at `:1835`. **P-11 holds.**
- Before the edit, `toc_mapping_version_locked` appeared only in `bilateral.service.ts`, `bilateral.controller.ts` and `bilateral.service.updateAlignment.tocAlignments.spec.ts`, with 0 hits in `test/`. After the edit there are 0 hits in `src` and `test`.

**Files changed (7):**
- `bilateral.service.ts`: adds `assertReportingYearWritable`. It runs in `updateAlignment` after both source gates, and in `getEditableContributionContext(resultId, year)` after the PRMS gate. Both placements come before the contributor and synced checks and before any transaction or emit. `assertTocMappingVersionUnlocked` and its call are deleted.
- `bilateral.controller.ts`: Swagger 409.
- Specs:
  - `bilateral.service.spec.ts`
  - `bilateral.service.updateAlignment.reportingYear.spec.ts` (new)
  - `bilateral.service.updateAlignment.tocAlignments.spec.ts`
  - `bilateral.service.sourceReadOnlyGate.spec.ts`
  - `bilateral.service.normalizeLeverCodes.spec.ts`

**Implementer verification (as reported):**
- 5 scoped suites, 119 tests: green. `tsc`: 0. `eslint`: 0.
- Falsifiers, each observed red and then reverted:
  - (a) Guard moved after the transaction: `Expected number of calls: 0, Received number of calls: 3` at `expect(save).not.toHaveBeenCalled()`.
  - (b) Guard wrapped in `if (dto.toc_alignments)`, 2025 legacy body: `Expected constructor: ConflictException, Received value: undefined` at `expect(thrown).toBeInstanceOf(ConflictException)`.
  - (c) Guard removed from `getEditableContributionContext`: the same `ConflictException` vs `undefined` on POST, PATCH and DELETE.
- K-018 realignment, from the failing run: `Expected: "toc_mapping_version_locked", Received: "pool_funding_year_locked"`. The 2024 and 2025 legacy bodies are now rejected.

**Evidence re-run (Leader inline, after the parallel workers had reported): VERIFIED.**
- The `toc_mapping_version_locked` grep finds 0 hits. `tsc --noEmit -p tsconfig.json` exits 0. `npx eslint` on the 7 changed files exits 0.
- The full server suite (`npm test -- --silent`) passes: **424 suites / 4068 tests**.

**Not Done / Assumptions (carried verbatim in gist):**
- The `[advisory-grade]` 2027 write-path snapshot case was **not** added. It needs a full ToC catalog fixture, and it was optional.
- Current-year write fixtures that omitted `report_year_id` now set 2026. Without it, `Number(undefined)` would lock them. The Reviewer confirmed that `findPoolFundingAlignmentContext` really selects `r.report_year_id` (`result.repository.ts:203`), so these fixtures match production rows.

**Reviewer findings on the questions asked (both lenses):**
- **No bypass.** All four HTTP write routes are guarded. `importAlignmentFromPrms`, the PRMS webhook mapping-apply and the versioning stored procedures are system-driven, and R-PRY-004 does not require the guard on them. No role bypasses the guard: it lives in the service, and `SYSTEM_ADMIN` skips only `RolesGuard`.
- **409 shape.** The guard throws `ConflictException({ message: { description, code } })`, the same packing as the removed 409, so the envelope stays consistent and nothing sensitive leaks.
- **Null `report_year_id` is now write-locked.** This follows design §2.1 ("a null year counts as a mismatch, consistent with `version_locked`") and the GET side already shows such a result as locked. The behaviour change is that a legacy-body PATCH on a null-year result now gets a 409. Nothing is deleted. Both reviewers flagged this for the rollout note, below.

**ADVISORY (non-gating):**
1. Six `mockResolvedValueOnce` values queued in the three contribution year-lock tests are never consumed, and `clearAllMocks` does not drain them. The suite is order-dependent but green today. Fix: `mockReset` in a scoped `afterEach`.
2. The 409 text for a null or undefined year reads "result year 0" or "NaN". The `code` is correct and the client matches on `code`. Consider printing "unknown" instead.
3. There is no test for a null `report_year_id` (null counts as a mismatch).
4. There is no contribution-path test for a 2025 non-contributor or a synced result. The guard is shared, and these cases are optional.
5. Transient config read: if only the `app_config` query fails, the resolver falls back to 2026. On an env configured for 2027, that request then treats 2026 as writable. The spec accepts this (NFR-PRY-002). A stricter write-only failure mode is candidate future work.
6. The Swagger 409 text on the contribution routes does not mention `pool_funding_year_locked`. Design only asked for the PATCH route, so this is a docs gap, not a violation.

**Forward pointer → T-09 rollout note:** state that results with a null `report_year_id` are locked for writes (advisory 3 and the null-year finding above), and that a transient `app_config` read failure falls back to 2026 (advisory 5).

**Decisions / issues:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer not reported by host, ended complete; reviewer-1 17 calls, 78173 tokens, ended complete; reviewer-2 19 calls, 92268 tokens, ended complete`.

### T-07 — Sidebar: section visibility + PRMS SYNC hidden → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_fe2544c77500` / `ctx_c15546a71f36`. Ran in parallel with T-05 (server). |
| Implementer | Cursor · `grok-4.7-high`, effort medium, skills `angular-developer`, `tdd` |
| Reviewer | Claude `akili-reviewer` (fresh context) — **PASS** |
| Requirements covered | R-PRY-003: all 4 state-table rows; "Past-year synced result" (THEN, AND card, BUT no button); "Past-year, never touched" (hidden); "Current year unaffected" |

**Files changed (3):**
- `result-sidebar.component.ts`: the year gate is now `version_locked === true && has_pool_funding_data !== true`. The gate comment is rewritten.
- `result-sidebar.component.html`: the PRMS SYNC button is wrapped in `version_locked !== true`. The card and legacy block are unchanged.
- `result-sidebar.component.spec.ts`: four §5 rows, each with distinct year and data:
  - ineligible, 2024, has data → hidden
  - current year 2026 → button enabled
  - locked, 2023 vs configured 2027, no data → hidden
  - locked, 2025 synced, code 9746 → shown, button absent, card rendered

**Consumer grep (`sidebar-prms-sync-button`):**
- The executable hits are only `result-sidebar.component.spec.ts` and `.html`. There is no e2e file.
- `dist/` and `coverage/` also match. Those are generated files and nothing executes them.
- `hasPoolFundingOption` is read by the computed in `.ts`, the `@if` in `.html`, and the spec expectations.

**Implementer verification (as reported):**
- The sidebar spec passed 160/160 (`--coverage=false`).
- `tsc -p tsconfig.spec.json` stayed at the baseline of 945, with the spec file's 19 errors as the identical normalized set. The component `.ts` and `.html` have 0 errors.
- Lint is clean.
- Initial red, before the change, in the "§5 locked with data" case: `Matcher error: received value must not be null nor undefined. Received has value: undefined` at `expect(poolFundingItem()?.textContent).toContain('Pool funding alignment')`.
- Falsifiers, each reverted afterwards:
  - (a) Restoring hide on `version_locked === true` makes the same case fail with `Received has value: undefined`.
  - (b) Using `[disabled]` instead of omitting the button makes `expect(syncButton()).toBeNull()` receive `<button ... data-testid="sidebar-prms-sync-button" disabled="" ...>PRMS SYNC</button>`.
- KZ-015 transition: the locked-with-data case first renders 2026 unlocked with the button enabled. It then flips to `version_locked: true` with code 9746 and asserts the button is absent while the item and card stay.

**Evidence re-run (Leader inline, after both parallel workers reported): VERIFIED.**
- The sidebar spec passed 160/160.
- `tsc -p tsconfig.spec.json` reported **945** errors, the baseline.
- Lint printed "All files pass linting".
- The full client suite (`npm test -- --silent`) passed **341 suites / 7855 → 7859 tests**.
- `npm run build` completed with "Application bundle generation complete". No warning names `ResultSidebarComponent`. The NG8102, NG8107 and NG8112 warnings and the SCSS budget warnings are all on files T-07 did not touch. The Reviewer recommended this build because it is the only gate that type-checks templates.

**Not Done / Assumptions (carried verbatim in gist):**
- The three existing "locked → hidden" specs (`:410`, `:421`, `:458`) did **not** go red.
- Their fixtures omit `has_pool_funding_data`, and design §5 line 168 says that case keeps today's hide.
- The block comment was updated, and no assertion was rewritten without a failure (K-018).

**Decisions:**
- The Reviewer recommends correcting design §12.1 row wording. That row predicts a red for those specs which cannot occur.
- This is recorded here rather than edited mid-run, because it is a doc-accuracy fix and not a requirement change. **Forward pointer → T-09** (docs task).

**ADVISORY (non-gating):**
1. The button's year rule lives in the template, while the section rule is in a `computed`. A `prmsSyncButtonVisible()` computed would give the button rule one testable choke point.
2. Pre-existing hex literals on the button and the legacy span predate this diff. They are left for a separate token cleanup.
3. State-table row 2 ("current year, any data") is tested only with data. The no-data variant runs through unchanged older code.

**Decisions / issues:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer not reported by host, ended complete; reviewer 11 calls, 56444 tokens, ended complete`.

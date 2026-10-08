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

### T-05 — PRMS sync gate `reporting_year` → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_9d14b2f6dd3e` / `ctx_12145de457e6`. Ran in parallel with T-07 (client) |
| Implementer | Cursor · `grok-4.7-high`, effort high, skills `nestjs-expert`, `tdd` |
| Reviewer | Claude `akili-reviewer` (fresh context) — **PASS** |
| Requirements covered | R-PRY-005 "Push on past year": THEN; no Normalizer call; no log row; ordering after `not_already_synced` |

**Consumer grep:** `SyncGateSnapshot|loadGateSnapshot` over `src` and `test` returned 9 files.
- **Changed (6):** `sync-gate.ts`/`.spec`, `result-prms-sync-log.repository.ts`/`.spec`, `result-prms-sync.service.spec.ts`, `test/result-prms-sync-claim-concurrency.integration-spec.ts`.
- **Unchanged (3), because the new snapshot fields are optional (design §10):** `result-prms-sync.service.ts`, `result-prms-sync.controller.spec.ts`, `knowledge-product.builder.spec.ts`.
- The Reviewer also grepped the whole repo outside `docs/` for anything that enumerates gate entry IDs. Nothing on the client or in a socket event enumerates them, so no consumer misses the new `'reporting_year'`.

**Implementer verification (as reported):**
- Scoped run: 3 suites, 80 tests pass. `tsc` exit 0. `eslint` exit 0.
- Pre-implementation reds observed:
  - `decision.allowed`: Expected false, Received true.
  - entry id: Expected `"reporting_year"`, Received `null`.
  - SQL: Expected substring `"r.report_year_id"`, absent from the SELECT.
  - `snapshot.report_year`: undefined.
- Falsifiers, each reverted after observing red:
  - (a) `persistsRow: true` → `Expected number of calls: 0, Received number of calls: 1` on the log insert (failureReason "Result year 2025 is not the reporting year 2026").
  - (b) Entry placed before `not_already_synced` → `Expected "not_already_synced", Received "reporting_year"`.
  - (c) `!==` without `Number()` → `Expected true, Received false` on `decision.allowed` for the string `'2025'` vs `2025`.
- Integration: `npm run test:integration -- --testPathPattern=result-prms-sync-claim-concurrency --forceExit` → 1 suite, 3 failed, `connect ECONNREFUSED 127.0.0.1:3307`. This is environmental: no scratch container was running, and none was started. The shared Dev DB was not used.

**Evidence re-run (Leader inline, after both parallel workers reported): VERIFIED.** Server `tsc` exit 0. `npx eslint` on the 6 changed files exit 0. Full server suite (`npm test -- --silent`): **424 suites / 4080 tests passed**.

**Not Done / Assumptions (carried verbatim in gist):**
- The integration assertions never ran.
- The refusal sentence is "Result year {year} is not the reporting year {configured}", with `null` when the year is null. The design requires both years to be named but does not fix the wording.
- `ResultPrmsSyncModule` is not edited, because the resolver comes from the `@Global()` `GlobalUtilsModule`.
- A non-2026 configured year (2027) is used in the gate mismatch case, the service null-year case and the repository stub.

**RB-4 updated:**
- This run failed on a different, earlier cause (`ECONNREFUSED`, container not running) than the one T-03 recorded (credentials unset, schema incomplete). It therefore says nothing about whether RB-4's original cause still holds.
- The claim-concurrency integration spec mocks `loadGateSnapshot` with year-less facts, so even a working environment would not exercise the year gate there (KZ-017).
- Only the repository spec's SQL-text assertion proves the SELECT, and nothing yet runs that SELECT against a real schema.

**ADVISORY (non-gating):**
1. `loadGateSnapshot` resolves the year before checking that the result exists, which costs one extra `app_config` read on a missing result. This is harmless.
2. If a future builder sets `reporting_year` without `report_year`, `NaN` would refuse every push without explanation. A comment on the optional field is suggested.
3. KZ-017 scope, as noted under RB-4 above.

**Decisions / issues:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer not reported by host, ended complete; reviewer 17 calls, 67626 tokens, ended complete`.

### T-08 — Page read-only mode (`reporting-year` cause) — in progress

**Runtime event, attempt 1, Grok/Cursor (`task_bb322f1f61e0` / `ctx_ce2a1131b99d`):**
- The worker read 15 files with no edits. A claude-mem hook then blocked a full-file `Read` of `pool-funding-alignment.component.ts`, and the turn ended idle without a report.
- Poked once (idle-without-report protocol). The terminal then showed `You're out of usage. Switch to Auto, or ask your admin to increase your limit to continue.`, a provider-limit death.
- Tree probe: clean, no partial edits.
- The owner chose a re-route, recorded verbatim: option "Claude implementer (Sonnet)".
- The Cursor worker was stopped and the Orca task marked failed.
- This is a **recorded exception** to the standing "Grok implements" split. Author ≠ auditor still holds: Implementer Sonnet, Reviewer Opus.
- `runtime events: provider-limit death ×1 → owner-approved re-route (fresh worker, rung 4 equivalent)`.

**Execute-time spec edit (2026-10-08):**
- Change: `design.md` §6 gains the row "Save, past reporting year", and `tasks.md` T-08 scope gains a matching bullet.
- Cause:
  - R-PRY-003 says "AND no Save action is available".
  - Design §6 assumed `showSave=false` hides Save.
  - The shared `NavigationButtonsComponent` actually renders Save whenever `isEditableStatus() || showSave`, so `showSave=false` leaves it on screen (disabled).
- The owner decided, verbatim: *"el save solo debería aparecer cuando el resultado está con el año configurado; de resto no debería salir"*.
- Resolution: an opt-in `@Input() hideSave = false` on the shared component. Pool Funding passes `version_locked === true`, and the default leaves the other 12 usages unchanged.
- The owner approved this scope growth.
- `continuations: 1 (Save absent on past year, per amended §6)`.

**Attempt 1 (Claude `akili-implementer`, Sonnet, effort high), Reviewer verdict: FAIL**

Implementer evidence:
- Scoped jest: 4 suites / 414 tests.
- Falsifiers (a)–(d) observed red:
  - (a) `Expected: "reporting-year" Received: "synced"`
  - (b) `expect(lockBannerCount()).toBe(1)` → `Received: 2`
  - (c) matcher → `Received: {"summary": "Synced to PRMS", ...}`
  - (d) Save present when `!hideSave &&` is dropped

Leader re-run (VERIFIED, matching the report):
- Scoped jest 414/414. `tsc -p tsconfig.spec.json` 945 (baseline), 0 errors in navigation-buttons. Lint passes.
- Full client suite: 341 suites / 7875 tests on the second run. The first run showed 1 suite failing to load with 0 failing tests, the known flaky-runner signature.
- `npm run build` completes. The only `PoolFundingAlignmentComponent` warnings are the two pre-existing NG8102 at html :203 and :256 (`sp.allocation ?? '—'`), the same ones seen in the T-07 build.

Reviewer FAIL report (verbatim):

> 1. **Discovered Issue:** In production, `isVersionLocked409` never fires for the year lock. Here is the chain:
>    - `GlobalExceptions` sets `description: exception?.name`, which is `"ConflictException"`, and puts `exception.response.message` into `errors` (`server/researchindicators/src/domain/shared/error-management/global.exception.ts:31-44`).
>    - T-04 throws `ConflictException({ message: { description, code: 'pool_funding_year_locked' } })` (`bilateral.service.ts:1137-1142`).
>    - So the wire body is `{ description: "ConflictException", errors: { description: "Pool Funding is read-only: …", code: "pool_funding_year_locked" } }`.
>    - `BilateralService.patchAlignment` returns only `errorDetail.description` (`client/research-indicators/src/app/shared/services/bilateral.service.ts:248`), and `onSave` passes that string to the matcher (`pool-funding-alignment.component.ts:1027`).
>
>    The implementer assumed the prose sits beside the code in `description`. It does not: both the code and the prose are inside `errors`. The new prose-match is as dead as the code-match.
>
>    **Reachable:** open a 2026 result, change the configured reporting year to 2027 in `app_config` (wait out the 5-minute cache), then click Save. The response drops into the generic 409 branch. That branch refetches the alignment, so the year banner does appear, but the user gets a toast saying **"Synced to PRMS — This result was synced to PRMS"**, which is false. The ToC catalog refetch and `versionLockedFrom409` are also skipped.
>
>    The tests pass because they mock `description: 'pool_funding_year_locked'`, a shape this server never sends. That makes them presence tests, not proof of behavior. The falsifier (c) result is real, but it shows the matcher code works, not that it is reachable.
>    - **Violated Rule:** `design.md` §5 "409 on the client"; §4 / design.md:131 (code is in `errors.code`); client half of R-PRY-004 (`requirements.md:180-186`).
>    - **Remediation Suggestion:**
>      - In `BilateralService.patchAlignment`, read `errorDetail.errors.code` and `errors.description`. Accept `errors` either as an object or as stringified JSON, the same way `extractPrimarySpError` does. Add them to `PatchAlignmentResult` as `code` and `errorDescription`.
>      - Make `isVersionLocked409` match on `code === 'pool_funding_year_locked'`. Drop the `'is not the reporting year'` prose match, or keep it only against `errors.description`.
>      - Add a test in `bilateral.service.spec.ts` that sends the real `GlobalExceptions` body and asserts `code` is extracted.
>      - Change the component tests to mock `{ description: 'ConflictException', code: 'pool_funding_year_locked' }`.
>      - Falsifier: delete the extraction and confirm the component test goes red.

ADVISORY (attempt 1):
1. **Same pattern elsewhere:** the old `toc_mapping_version_locked` and `PRMS_SOURCED_409_DESCRIPTION` matches compare against the top-level `description` and are probably dead the same way. This is pre-existing code outside T-08, and its reachability is unverified.
2. **Banner year source:** `currentMetadata().report_year` is acceptable. Add a comment that the metadata is per-result.
3. **Toast copy:** the year-lock toast still reads "Theory of Change alignment is locked for this version". Once Issue 1 is fixed the toast will appear, so key its copy on `code`.
4. **SP card focus:** the card keeps `tabindex`/`role` while `aria-disabled`. Design §6 allows this.
5. **`hideSave` blast radius:** clean.

Effort bumped high → xhigh for attempt 2 (rework rule). The same implementer context is kept, per the close-workers rule: a worker stays alive through a FAIL.

**Attempt 2 (same Claude `akili-implementer` context, Sonnet, effort xhigh). Reviewer verdict: PASS**
- **Fix:**
  - `BilateralService` gains a private `extractErrorCode`, modelled on `extractPrimarySpError`. It reads `errorDetail.errors` whether that arrives as an object or as stringified JSON.
  - `PatchAlignmentResult` gains optional `code` and `errorDescription`, spread in only when present.
  - `isVersionLocked409(description, code?)` matches on `code` (`pool_funding_year_locked`, `toc_mapping_version_locked`). The legacy description path is kept and the prose match is dropped. `PRMS_SOURCED_409_DESCRIPTION` is untouched.
  - `[advisory-grade]` The year-lock toast detail now reads "This result is outside the configured reporting year and is read-only. Your changes were not applied." The ToC copy is kept for the legacy path.
  - `[advisory-grade]` Added a comment that `currentMetadata()` is per-result.
- **Tests:**
  - Service spec: the real `GlobalExceptions` body, the stringified variant, and non-code 409 shapes.
  - Component mocks now use `{ description: 'ConflictException', code: 'pool_funding_year_locked' }`.
  - New cases: the neutral toast, and a code-less ConflictException not read as a year lock.
- **Falsifiers (observed red, then reverted):**
  - Extraction removed. The service spec fails with `Expected: "pool_funding_year_locked", Received: undefined` plus a `toEqual` mismatch at `:1184`. Component specs mock the service, so they stay green.
  - Matcher code check removed. The component fails with `Expected: ObjectContaining {"summary": "Version locked"}` / `Received: {"summary": "Synced to PRMS", ...}`, and the toast case fails with `Expected: "Version locked" Received: "Synced to PRMS"`.
- **Reviewer:**
  - Traced server → `GlobalExceptions` → `ToPromiseService` (`errorDetail: error?.error`) → `extractErrorCode` → `onSave`.
  - The `code` field name is compiler-checked on the error branch of the union, so the residual the implementer declared (no single test joining service and component) is accepted.
  - No regression in the attempt-1 parts.

**Evidence re-run (Leader inline): VERIFIED.**
- Scoped jest (pool-funding-alignment folder, navigation-buttons, `bilateral.service.spec.ts`): 5 suites / 494 tests.
- `tsc -p tsconfig.spec.json`: 945 errors, the baseline. Per-file, normalized:
  - `pool-funding-alignment.component.spec.ts`: 3 errors (2× TS2322, 1× TS2740). Same as HEAD per the attempt-1 comparison.
  - `bilateral.service.spec.ts`: 6× TS2352, the pre-existing casts recorded at T-06.
  - `navigation-buttons`: 0.
- Lint: "All files pass linting".
- Full client suite (`npm test -- --silent`): **341 suites / 7879 tests**.
- `npm run build`: re-run after attempt 2, "Application bundle generation complete". The only Pool Funding template warnings are the pre-existing NG8102 at html :203 and :256.

**Final status: PASS (attempt 2 of 3).**
- **Requirements covered:** R-PRY-003 "Past-year answered, never synced" (answer shown, controls inert, no Save — absent per amended §6, single banner) and the client side of R-PRY-004.
- **Files changed (8):**
  - `pool-funding-alignment.component.{ts,html,spec.ts}`
  - `navigation-buttons.component.{ts,html,spec.ts}`
  - `shared/services/bilateral.service.{ts,spec.ts}`
- **Not committed:** owner standing rule "no commit before visual approval". The changes stay uncommitted in the tree and are committed after the T-09 HITL check.

**ADVISORY:**
1. The toast summary "Version locked" could become "Reporting year locked" if QA finds it ambiguous.
2. Pre-existing `PRMS_SOURCED_409_DESCRIPTION` and the legacy `toc_mapping_version_locked` description matches compare against the top-level `description`. That field is "ConflictException" for any `ConflictException`, so those matches are probably dead the same way. This is outside T-08 and its reachability is unverified. It is candidate follow-up work, not a new task (advisories never become tasks).
3. The SP card stays focusable with `aria-disabled` (allowed by design §6).

**Spawns:**
- implementer-grok: not reported by host, ended died (provider limit).
- implementer-sonnet: attempt 1 — 39 calls, 162558 tokens, ended partial (continuation); continuation — 6 calls, 172670 tokens, ended complete; attempt 2 — 7 calls, 188701 tokens, ended complete.
- reviewer: attempt 1 — 20 calls, 87601 tokens, ended FAIL; attempt 2 — 16 calls, 83515 tokens, ended PASS.

## Budget tripwire — after T-08 (2026-10-08)

| Dimension | Budget (design §0) | Actual | Command |
| --- | --- | --- | --- |
| Tasks | 9 | 8 done, T-09 pending | `tasks.md` |
| LOC incl. tests | ~850 | **+2338 / −376**. Production code alone: +476 / −198 | `git diff --shortstat ec490da3c -- server client` (and the same with `':!*.spec.ts' ':!*integration-spec.ts'`) |
| Review rounds | ~13 | 10 Reviewer verdicts | this log |

**Cause:**
- Test volume makes up ~80% of the inserted lines:
  - per-row cases for every state table
  - falsifier-backed cases
  - realignment of existing bilateral, sync-gate and sidebar specs
- The owner-approved Save amendment added a shared-component input plus its spec.
- T-08 needed one rework.

Production code is within scale.

**Owner decision:** "Seguir con T-09" (continue). T-09 implementation is routed to Claude `akili-implementer` (Sonnet). Cursor usage is still exhausted, and the owner's T-08 re-route answer covered T-09.

### T-09 — Baseline docs, rollout note, e2e + HITL — in progress

**Attempt 1:** Claude `akili-implementer` (Sonnet, effort medium, skill `cognitive-doc-design`).

**Docs changed (3):**
- `docs/trd/trd.md`
  - The representative-endpoints paragraph now covers the Pool Funding reporting-year contract.
  - §9.1 gains a reporting-year row. The lambda-toc row now states the year-keyed cache and `?year=`.
- `docs/ux-ui/design.md`: a decisions-log entry, dated 2026-10-08.
- `design.md` §12.1: the sidebar row is reworded so the "locked → hidden" specs stay green. This closes the T-07 forward pointer.

**e2e boot:**
- First run: `ECONNREFUSED 127.0.0.1:3307`, then a `RangeError: Maximum call stack size exceeded` after the DB retries were exhausted. Classified as environmental.
- Leader probe per *Deferring a check*: `npm run compose:test:up` started `research_indicators_server_test_mysql`, and port 3307 came up. The blocker was the container being down; the assumption was falsified.
- Continuation run of `npm run test:e2e`: `Test Suites: 2 failed, 1 skipped, 3 passed, 5 of 6 total`; `Tests: 12 failed, 20 skipped, 27 passed, 59 total`.
  - Passed: `app`, `results-ai-formalize-bulk`, `pi-delegates`.
  - Failed on the empty scratch schema, both environmental (RB-4):
    - `prms-sync`: `Table 'ari_scratch_test.indicator_types' doesn't exist`
    - `prms-webhook`: `Table 'ari_scratch_test.migrations' doesn't exist`
  - The RangeError did **not** recur, so it is attributed to the missing DB.
- `migration:test:bootstrap`, run once, failed with `ER_FK_INCOMPATIBLE_COLUMNS` (3780) on `FK_pi_delegates_project_id` (RB-4 family). Not retried.
- **Falsifier:** removing `ReportingYearResolver` from the `GlobalUtilsModule` exports turned every app-booting suite red, including `app.e2e-spec.ts`, which had passed. The error, verbatim: `Nest can't resolve dependencies of the ClarisaProjectsService (HttpService, MappingPhaseResolver, ?). Please make sure that the argument ReportingYearResolver at index [2] is available in the ClarisaProjectsModule context.`
- Reverted with `git checkout -- src/domain/shared/utils/global-utils.module.ts`; the tree is clean. Container stopped with `compose:test:down`.

**⚠ Safety finding (pre-existing, outside this spec):**
- `server/researchindicators/.env` points `ARI_MYSQL_HOST` at `192.168.20.210`, database `alliancereportingdb`, which appears to be the shared Dev DB.
- The `pi-delegates` e2e suite attempted an insert against it. It failed with an FK violation (`FK_pi_delegates_project_id`), so nothing changed.
- The e2e harness for that suite does not use the disposable TEST DB. Reported to the owner; not fixed here.

**Evidence re-run (Leader inline): VERIFIED.**
- `npx jest --config ./test/jest-e2e.json test/app.e2e-spec.ts` → 1/1 passed.
- This was chosen because `app.e2e` boots `AppModule` with `synchronize: false` and `migrationsRun: false` and performs no write. The full e2e run was deliberately **not** repeated because `pi-delegates` writes to the shared Dev DB.

**Reviewer verdict (attempt 1): FAIL.**
- The rollout note was missing from `execution.md`. That violates T-09 Scope and the Done item "Prod migration check written into the rollout note".
- Everything else conformed, verified against the working tree: paths, the 409 envelope, the GET fields, the `reporting_year` sync-gate entry, the §9.1 row against the resolver code, the cache keys, and the §12.1 rewording.
- **Remediation:** the Leader, who owns `execution.md`, writes the rollout note below. It is Leader-owned bookkeeping, not production code. Re-review follows (override e).

**ADVISORY (attempt 1):** the §9.1 consumer list omits the PRMS-webhook mapping-apply path (`pool-funding-mapping-apply.service.ts:468`) and the alignment GET flags. Not wrong, only incomplete; recorded, not actioned.

## Rollout note — pool-funding-reporting-year

**(a) Prod migration check (K-015, K-014).**
- On every non-Dev target, Prod (`main`) included, assume the pipeline does not apply migrations. Only the Dev pipeline was re-measured (2026-08-27).
- From `server/researchindicators`, against the target environment, run:
  ```bash
  npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
  ```
- Check the raw output for an error **before** counting. A count over a failed command is a confident zero.
- `SeedPrmsSyncReportingYear1791488432640` must read `[X]`. Applying it on Prod is a human-decided step.
- Until it is applied, the resolver logs a `warn` and falls back to **2026**. That is today's behaviour, so the deploy is safe in either order.

**(b) Year-change runbook.**
1. Set `app_config.simple_value` = `'2027'` (any 4-digit year) on the **active** row `key = 'ARI_PRMS_SYNC'`, via the admin panel or SQL.
2. The change takes effect on the **next request**, with no TTL and no restart, because the resolver is uncached (D-2).
3. The lambda-toc and CLARISA caches are keyed by year/phase, so 2026 data is never served for 2027.
4. Other `app_config`-driven values (for example, the CLARISA mapping phase) keep their own 5-minute TTL (K-016).
5. Expected effect:
   - Results whose `report_year_id` ≠ the new year become read-only in Pool Funding. Writes return 409 `pool_funding_year_locked`, and PRMS push is refused by the `reporting_year` gate.
   - Results of the new year become editable.

**(c) Optional `.env` cleanup.**
- `ARI_PRMS_SYNC` / `PRMS_SYNC_YEAR` are no longer read by the server.
- Per the owner (P-6, 2026-10-08), Dev and Prod both set `2026`, which equals the seed, so removing the variable changes nothing.

**(d) Behaviour notes.**
- An existing **inactive** `ARI_PRMS_SYNC` row is not re-activated by the seed's `INSERT IGNORE`. The resolver then warns and uses 2026. Activate the row by hand if needed.
- Results with a **null `report_year_id`** count as a different year. They are read-only (`version_locked: true`) and their writes return 409. The message reads "result year 0" (or "result year NaN" if the field is absent).
- A **transient `app_config` read failure** falls back to 2026 for that request only (NFR-PRY-002). On an env configured for another year, that single request applies 2026's rules.
- The client match for a year-lock 409 keys on `errors.code` (T-08). A save on a page opened before the year changed lands in the locked state with the toast "This result is outside the configured reporting year and is read-only."

**(e) Known gaps.**
- **RB-4.** The integration suites cannot run here: credentials are unset, the scratch schema is incomplete, and `migration:test:bootstrap` fails. The bilateral and claim-concurrency integration specs stub the year in any case.
- The live `GET /api/configuration/ARI_PRMS_SYNC` → `"2026"` check is owed at the HITL pause.
- **Owner check:** the `pi-delegates` e2e suite writes to the shared Dev DB from `.env`.

**Attempt 2: rollout note added by the Leader. Reviewer verdict: PASS.**
- The note covers T-09 Scope and `design.md` §11 steps 2–4.
- It closes the three forward pointers: inactive row, null year, read failure.
- Its factual claims were checked against the code: migration name, PK `INSERT IGNORE`, the `migration:show` passthrough, resolver fallbacks, the `Number(report_year_id) !== year` test at `bilateral.service.ts:382/:684/:1133-1142`, and the toast copy at `pool-funding-alignment.component.ts:1037`.
- One wording correction was applied afterwards: a null year reads "result year 0", and an absent one reads "NaN". It never reads "null".

**T-09 status: `[~]`.** Every Done item is met except **"HITL quote recorded per item"**, which waits for the owner. The VPN was down at the time of writing, and the check needs the running app.
- `spawns: implementer 14 calls, 80469 tokens, ended partial; implementer (continuation) 19 calls, 90776 tokens, ended complete; reviewer 22 calls, 70465 tokens, ended FAIL; reviewer 15 calls, 59311 tokens, ended PASS`
- `continuations: 1 (e2e boot after the scratch-DB probe)`
- `runtime events: none`

## Pivot-lite record: R-PRY-007 display-only (2026-10-08) — owner-approved scope growth

**Trigger.** During HITL preparation the owner reported that STAR-20081 should show its ToC. A read-only investigation of the Dev DB (VPN up, SELECT only, `SET SESSION TRANSACTION READ ONLY`) found:

| `result_id` | Version | Contracts | Primary? | Contributor? | `is_synced_to_prms` | Alignment + ToC |
| --- | --- | --- | --- | --- | --- | --- |
| 34172 | live | A1708, G224 | none | no; no bilateral mapping | 1 | deactivated |
| 34283 | 2025 snapshot | A1708, G224 | none | no; no bilateral mapping | 0 | active: SP05 · OUTPUT · `toc_result_id 7220` |

- For the live result, the alignment and ToC were deactivated at 22:16:44 by the versioning SP (`1791468452856-UpdateSPVersionDeletePRMSPhase` ~L820-903). That SP moves Pool Funding rows to the new version.
- The section is hidden on both versions by `eligible = false`. This is **not** caused by the year rule.

**Owner decisions, verbatim:**
- *"la version snapshot es la que deberia mostrar el toc … la viva si se somete a las reglas normales … si tiene prms code deberia mostrar esa info"*
- *"si porque en agnos apsados hay contratos que dejan de contribuir al pool funding … se deberia poder ver asi no se pueda editar"*
- Scope option chosen: **"Tarea nueva en este spec"**.

**Amendment.**
- `requirements.md` gains R-PRY-007. Two edits to existing text:
  - the R-PRY-003 state table's `false` row is split
  - the §1 "Not changing" sentence is qualified
- `design.md` gains §5.x. The sidebar table's `eligible === false` row is qualified.
- `tasks.md` gains T-10 (server) and T-11 (client). T-09 now depends on both, and the coverage row is added.

**Correction-closure sweep.** `grep -n -i "eligible"` was run across `requirements.md` and `design.md`. Every remaining site is either a precondition of an eligible-only scenario, which is still true, or the new text.

**Out of scope, recorded for the owner:**
- the versioning SP moves Pool Funding rows from live to snapshot
- the PRMS import does not set a primary contract
- the snapshot's `is_synced_to_prms` is not copied

### T-10 — Server: display-only read → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-08 |
| Final status | PASS (attempt 1 of 3) |
| Implementer | Claude `akili-implementer` (Sonnet, effort medium; Cursor quota still out, owner re-route), skills `nestjs-expert`, `tdd` |
| Reviewer | Claude `akili-reviewer` (Opus, fresh context), **PASS**. The execute-time spec edits (R-PRY-007, R-PRY-003 row split, §1 qualifier, design row, §5.x) were checked as named conformance items. |
| Requirements covered | R-PRY-007 (server) |

**Files changed (6):**
- `result.repository.ts`: the context gains `is_snapshot` and the query selects `r.is_snapshot`.
- `bilateral.service.ts`, in `buildAlignment`:
  - computes `displayOnly`
  - widens `visibleAlignment` / `toc_alignments` to `eligible || displayOnly`
  - ORs `displayOnly` into `is_read_only` and returns `display_only`
  - leaves `eligible` raw and the write paths untouched
- `update-pool-funding-alignment.dto.ts`: `display_only` with `@ApiProperty`.
- Specs: `bilateral.service.spec.ts` (matrix, a fixed STAR-20081 case, a snapshot-only row), `bilateral.controller.spec.ts` (field list), `result.repository.spec.ts` (asserts the SQL selects `r.is_snapshot`, KZ-001).

**Implementer verification (as reported):**
- Scoped: 14 suites, 298 tests. `tsc` exited 0, `eslint` exited 0.
- Falsifier (a), drop `isSnapshot`: the snapshot-only row fails with `Expected: true / Received: false`.
  - The STAR-20081 row stays green under (a), because its PRMS code alone triggers `display_only`. The snapshot-only row was added to give (a) a red that discriminates.
- Falsifier (b), gate the ToC on `eligible` only: STAR-20081 expected `[ObjectContaining {level OUTPUT, sp_code SP05, toc_result_id 7220}]` but received `[]`.
- Falsifier (c), drop `displayOnly` from `is_read_only`: 3 rows fail with `Expected: true / Received: false`.

**Evidence re-run (Leader inline): VERIFIED.**
- `tsc` exited 0, and `eslint` on the 6 changed files exited 0.
- Full server suite (`npm test -- --silent`): **424 suites / 4086 tests**.

**ADVISORY:**
1. `listIndicators` now also returns indicator groups for display-only results. This is a read, consistent with §5.x, but no test covers it.
2. The ToC catalog (`getHlosIndicatorsForResult` / SP catalog) stays `unmapped` for STAR-20081, because it has no bilateral mapping. **Forward pointer → T-11:** the client must render the display-only ToC from the saved read-back fields (`toc_result_title`, `indicator_description`, …), not from a catalog lookup.
3. A comment above `version_locked` / `toc_alignments` is slightly stale.

**Decisions / issues:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer 19 calls, 101812 tokens, ended complete; reviewer 16 calls, 69832 tokens, ended complete`.

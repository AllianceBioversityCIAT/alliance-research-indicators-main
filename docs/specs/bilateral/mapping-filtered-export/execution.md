# Execution Log — Bilateral / Mapping filtered export

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `bilateral/mapping-filtered-export` (AC-1797) |
| Branch | `AC-1797-Move-bilateral-mapping-activation-inactivation-to-the-edit-modal-with-mandatory-justification-and-allow-exporting-the-filtered-list` |
| Started at | `fa0fae7d` (2026-11-17) |
| Leader | Claude Code, `claude-opus-5-5` (T1) |
| Implementer | Cursor CLI · `grok-4.7-*` (T2), dispatched through Orca orchestration. Standing owner routing: "Grok implements, Claude reviews". One fresh worker per task, kept until that task's PASS |
| Reviewer | `akili-reviewer` wrapper (Claude `opus`, T3, read-only) |
| Approval mode | Spec says `gated`. Owner's standing direction: keep going task to task; stop only on `FATAL_FAIL`, HALT, Pivot or the budget tripwire. H-1 and any UI commit wait for the owner |
| Budget (design §14) | 6 tasks · ~1,050 LOC (~450 production, ~600 tests) · 8 review rounds |
| Environment | Unit/supertest/e2e via jest; the migration is hand-run on the disposable scratch DB (`ARI_TEST_MYSQL_*`). The shared DB (`ARI_MYSQL_*`) is read-only and unreachable from this machine today |

### Pre-run notes

- **P-17 (T-01 step 1) — not settled.** A read-only count against `ARI_MYSQL_*` (`SET SESSION TRANSACTION READ ONLY`, `SELECT is_active, deleted_at IS NULL, COUNT(*) … GROUP BY`) returned `ERR ETIMEDOUT connect ETIMEDOUT` on 2026-11-17, the same as 2026-11-05. The impact is Low (such rows keep a blank date). Carried to H-1, where R-MFE-008 is observed on Dev.

## 2. Task Execution History

### T-01 — Server: status audit columns, entity, and writes on real transitions — PASS (attempt 1)

- **Date:** 2026-11-17 · **Final status:** PASS (two parallel lens Reviewers, both PASS)
- **Skills:** `nestjs-expert`, `tdd` (task defaults; the Cursor host has no skill tool, so the worker read both from disk) · **Effort:** `grok-4.7-xhigh` (migration; `max` is barred on T2)
- **Orca:** run `run_674b6b131b1f`, task `task_c4efb3ba3632`, dispatch `ctx_a44fe50141db`; kept through review, released after PASS
- **Attempts:** 1
- **Files changed:**
  - `server/researchindicators/src/db/migrations/1794920220124-addStatusAuditToBilateralProjectMapping.ts` (new)
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/entities/bilateral-project-mapping.entity.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.spec.ts`
- **Step 1 (P-17):** not run. The Leader's read-only attempt timed out (Pre-run notes). Carried to H-1.
- **TDD red (pre-write, assertion level):** deactivate `Expected: 42 / Received: 11`; activate `Expected: 42 / Received: 13`. The AC.2 cases were green before the change by construction; their discriminating reds are falsifiers (a) and (b).
- **Falsifiers (post-change, observed red, reverted):**
  - (a) audit written before every `save()` → idempotent deactivate+notes `Expected: 17 / Received: 42`; update notes `23/42`; update project `29/42`. Idempotent activate stayed green because that path never saves.
  - (b) write moved before the idempotent return → idempotent deactivate `17/42`, idempotent activate `19/42`.
  - (c) `updated_at = updated_at` dropped, then re-run on scratch → the Inactive row's `updated_at` moved from `2024-03-03 03:03:03.123456` to `2026-11-17 12:59:06.204811`. The pin was restored.
- **Migration hand-run (disposable `ari_scratch_test`, container `research_indicators_server_test_mysql`, never `ARI_MYSQL_*`):**
  - before up: id 13 INACTIVE `deleted_at 2019-06-01 00:00:00`, `updated_at 2024-03-03 03:03:03.123456`; id 14 MAPPED `deleted_at NULL`, `updated_at 2024-04-04 04:04:04.654321`.
  - after up: id 13 `status_changed_by NULL`, `status_changed_at 2019-06-01 00:00:00`, `updated_at 2024-03-03 03:03:03.123456`; id 14 both NULL, `updated_at` unchanged.
  - after down: `SHOW CREATE TABLE` has neither column. Seed rows removed.
  - Scope limit (KZ-017): the scratch table has the baseline-era shape (no `reporting_year`). The first check against Dev's real shape is H-1.
- **Implementer verification:** jest folder → `Test Suites: 8 passed` / `Tests: 192 passed`; eslint exit 0; build exit 0. `npm run test:integration` → exit 1 before the named specs' assertions: `PID_MYSQL_PASSWORD is not set…` and `T13_MYSQL_PASSWORD is not set…` (suites refuse to fall back). Recorded as an environment blocker; the task allows this.
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** `Test Suites: 8 passed, 8 total` / `Tests: 192 passed, 192 total` · `ESLINT_EXIT:0` · `BUILD_EXIT:0`.
- **Reviewers (parallel lens mode, migration task):**
  - A, conformance + reliability → **PASS**. Writes happen only in the transition branches. One shared instant is used for `deleted_at` and `status_changed_at`, asserted by identity. Sentinel fixtures; AC.4 holds through `loadCurrentYearRow`.
  - B, risk / data loss → **PASS**. The `updated_at` self-assignment keeps the value at full precision. `is_active` is tinyint. Down is reversible. No named-placeholder hazard. The migration has the newest timestamp. Entity types match. The pre-migration read failure is exactly the window DD-16 accepts.
- **ADVISORY (recorded, not actioned):**
  - **Traceability:** AC.3–AC.5 have no new test of their own. AC.3 is structural (no history write). AC.4 is owned by the existing year-scope tests (`findById year scope (R-APM-004)`). AC.5 holds because the write is in the service and the controller passes `request.user`.
  - **Reliability:** `status_changed_by` is a bigint. Reviewer B confirmed `bigNumberStrings: false`, so it reads back as a number. Re-check on the read side in T-03.
  - **Resilience:** MySQL DDL auto-commits. If the backfill fails after the ALTERs, a re-run hits "duplicate column". This needs a lock timeout on Dev during the deploy, which is unlikely. Merging the two ALTERs into one statement would narrow it.
- **Requirements covered:** R-MFE-007 AC.1–AC.5, R-MFE-008 AC.1–AC.3 (on the scratch shape; Dev at H-1)
- **Open:** the P-17 done criterion stays unchecked and is carried to H-1.
- **Running totals vs budget:** tasks 1/6 · LOC +167/−1 tracked plus the new migration (~200) · review rounds 2/8 (parallel lens counts 2)
- **spawns:** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer A akili-reviewer/opus 10 calls, 69 205 tokens, ended complete · Reviewer B akili-reviewer/opus 12 calls, 66 313 tokens, ended complete
- **Gate:** auto-approved (owner's standing direction: continue until FATAL_FAIL / HALT / Pivot / tripwire)

### T-02 — Server: Science Programs rule and `loadBilateralCohort` in `ClarisaProjectsService` — PASS (attempt 1)

- **Date:** 2026-11-17 · **Final status:** PASS (two parallel lens Reviewers, both PASS)
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd` (read from disk; no skill tool on the host) · **Effort:** `grok-4.7-xhigh` (timeout and cache semantics)
- **Orca:** run `run_674b6b131b1f`, task `task_d4ad6429bee6`, dispatch `ctx_571df61e9fd4`; kept through review, released after PASS
- **Attempts:** 1
- **Files changed:**
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.service.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.service.spec.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.spec.ts`
  - Total +424/−29 (incl. 1 line of Leader bookkeeping)
- **Tests added:**
  - `scienceProgramsFor`: default statuses, the `ENV.BILATERAL_ACCEPTED_SP_STATUSES` override, and a precomputed false flag.
  - Loader: healthy; empty; failing with a cold cache; malformed; never-resolving with a cold cache; same-phase stale (filled by an earlier healthy call); other-phase cache only; no limit.
  - `list()`: "returns the rows when CLARISA fails (R-MFE-006)".
- **Falsifiers (observed red, reverted):**
  - (a) catch only 503 → malformed case `Rejected to value: [TypeError: all.filter is not a function]`.
  - (b) timeout returns false even with a cache → stale case received `available: false, projects: []`.
  - (c) accept a cache from another phase → other-phase case received `available: true`.
- **Implementer verification:** jest clarisa/projects + bilateral-project-mapping → 11 suites / 306 tests passed; eslint clean; build 0.
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** `Test Suites: 11 passed, 11 total` / `Tests: 306 passed, 306 total` · `ESLINT_EXIT:0` · `BUILD_EXIT:0`.
- **Reviewers (parallel lens, effort xhigh):**
  - A, conformance + readability/reliability → **PASS**. `scienceProgramsFor` is a line-for-line extraction. No controller or `list()` expectation changed. Every loader row has a test.
  - B, resilience/concurrency → **PASS**. The timer covers only `connection.get` and is cleared in `finally`. The late rejection is swallowed. The phase check is exact. The fake-timer tests cannot pass vacuously.
- **Decisions made — execute-time spec edit:** `design.md` §5 "CLARISA notice", paragraph 3. "The abandoned call may still finish and fill the cache" was false against the code: a timed-out call's payload is discarded, and the cache is warmed by `list()`, which has no limit. The sentence was rewritten (amended 2026-11-17). Reviewer B confirmed that no requirement depends on the old sentence: R-MFE-011 and R-MFE-003 AC.3 prescribe the notice for "no answer within 10 s AND no feed cached". Carried as a named conformance check into T-03's Reviewer brief.
- **ADVISORY (recorded, not actioned):**
  - **Reliability:** the controller spec mocks `scienceProgramsFor` with a copy of the rule, so the controller tests prove the copy. Fix: delegate the mock to `ClarisaProjectsService.prototype.scienceProgramsFor`.
  - **Reliability (pre-existing, now reachable through the loader):** `getCachedAll` writes `this.cache` before iterating the data. So a malformed 200 after the TTL overwrites the last good feed, and it stays failed for 5 minutes, for the export and for the picker (500 instead of 503). Not a regression. Fix: an `Array.isArray(data)` check before the cache write.
  - **Reliability:** no test pins the discard of the late payload.
  - **Coverage:** two picker-rule edge cases are not pinned: the precomputed flag `true` with no passing mapping, and a project with no `project_mappings_array`.
- **Requirements covered:** R-MFE-004 (allocations rule), R-MFE-006 (`list()` half), R-MFE-011 AC.1 (loader half) and AC.2 (the limit is a parameter, unset in `list()`)
- **Running totals vs budget:** tasks 2/6 · LOC ~+590 · review rounds 4/8
- **spawns:** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer A akili-reviewer/opus 10 calls, 74 830 tokens, ended complete · Reviewer B akili-reviewer/opus 8 calls, 69 599 tokens, ended complete
- **Gate:** auto-approved (owner's standing direction)

### Premise settlement — P-17 and P-18 (2026-11-17, Leader inline, read-only)

The owner connected the VPN. The same read-only script (`SET SESSION TRANSACTION READ ONLY`) ran against `ARI_MYSQL_*`:

```
[{"is_active":1,"deleted_null":1,"n":197},{"is_active":0,"deleted_null":0,"n":1}]
[{"reporting_year":2026,"n":198}]
```

- **P-17 — verified.** The one Inactive row has `deleted_at`, so the backfill leaves no Inactive row with a blank date. T-01's open done criterion is now met.
- **P-18 — volume verified:** 198 rows, all in 2026. That is far below any streaming threshold, so the in-memory plan holds and T-03 step 1 is discharged. The ≤ 15 s timing with a cold CLARISA fetch stays for H-1.
- Ledger rows P-17 and P-18 were updated in `design.md` §13.

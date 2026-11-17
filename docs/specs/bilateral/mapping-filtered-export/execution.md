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
- **spawns:** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer A akili-reviewer/opus 10 calls, 69 205 tokens, ended complete · Reviewer B akili-reviewer/opus: not reported by host, ended complete
- **Gate:** auto-approved (owner's standing direction: continue until FATAL_FAIL / HALT / Pivot / tripwire)

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

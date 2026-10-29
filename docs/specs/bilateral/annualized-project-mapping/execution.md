# Execution Log — Bilateral / Annualized Project Mapping

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `bilateral/annualized-project-mapping` |
| Branch | `AC-1797-Move-bilateral-mapping-activation-inactivation-to-the-edit-modal-with-mandatory-justification-and-allow-exporting-the-filtered-list`, the owner's choice on 2026-10-28 ("Stay on AC-1797") over a dedicated branch, despite RB-3 |
| Leader | Claude Code, `claude-opus-5-5` (T1) |
| Implementer | Cursor CLI · `grok-4.7-*` (T2), dispatched through Orca orchestration. Standing owner routing: "Grok implements, Claude reviews" |
| Reviewer | `akili-reviewer` wrapper (Claude `opus`, T3, read-only) |
| Approval mode | Spec says `gated`. The owner's standing direction is to keep going task to task and stop only on `FATAL_FAIL`, HALT, Pivot or the budget tripwire. Visual HITL (T-07, T-09) and commits of UI changes still wait for the owner's eyes |
| Budget (design §12) | 10 tasks · ~1,500 LOC · ~14 review rounds |
| Persona drift check | `akili doctor --agents` (akili-specs v2.37.2): all four personas `UNMARKED` ("no marker of any kind found"). They are project-customized files. `--fix` was not run, to avoid overwriting the customizations. Reported to the owner |
| Environment | Docker 29.8.2 daemon up. TEST scratch = `docker-compose.test.yml` (`npm run compose:test:up`, 127.0.0.1:3307). `PID_MYSQL_*` absent from `server/researchindicators/.env`, so SQL integration specs are a recorded gap (RB-2) |

## 2. Task Execution History

### T-01 — Migration: annualize the table, archive superseded duplicates, entity column + index — PASS (attempt 1)

- **Date:** 2026-10-28 · **Final status:** PASS
- **Skills:** `nestjs-expert`, `systematic-debugging` (task defaults, unchanged) · **Effort:** `grok-4.7-xhigh`. Correctness-critical migration; `max` is barred on T2, so the T2 ceiling was used.
- **Orca:** run `run_a1a61ffbf937`, task `task_8c57dd5a09d1`, dispatch `ctx_6f5ab131d39d` (terminal `term_25b46fd1-…`). The worker was retained through review and released after PASS.
- **Attempts:** 1
- **Files changed:** `server/researchindicators/src/db/migrations/1792200000000-annualizeBilateralProjectMapping.ts` (new) · `src/domain/entities/bilateral-project-mapping/entities/bilateral-project-mapping-history.entity.ts` (new) · `…/entities/bilateral-project-mapping.entity.ts` · `…/bilateral-project-mapping.module.ts`
- **First step, P-7 (Dev, read-only, `transaction_read_only = 1`):** `row_count 198`, `created_min 2026-09-15 19:41:13.511060`, `created_max 2026-09-15 19:41:13.877610` (system_tz UTC), `active_sum 197`, `inactive_sum 1`, duplicate agreements `[]`, multi-active `[]`, source split `{0,DERIVED,1},{1,DERIVED,197}`. This matches P-6. P-6's `2026-09-16T00:41:13Z` is the same instant read by a UTC-5 client. `created_at` cannot show a phase override, so P-7 stays with the owner on first deploy per environment.
- **Rehearsal (TEST scratch `ari_scratch_test`, worker):** the seeded fixture had 5 rows: `T01-AGR-ACTIVE` (active MANUAL 101 + inactive AI_SUGGESTED 102 with a *newer* `updated_at`), `T01-AGR-INACTIVE` (inactive AI_AUTO 103 older + inactive DERIVED 104 newer) and `T01-AGR-SINGLE` (105). Up → `archived superseded duplicates=[{"archived_count":2}]`. Post-up: `null_year 0`; 3 rows, all 2026; kept 101/104/105 with audit unchanged; history = original_id 102 and 103, `superseded-duplicate`; `uk_bpm_agreement_year` = (`agresso_agreement_id`, `reporting_year`); `active_agreement_id` absent. Down refusal: a 2027 row for `T01-AGR-SINGLE` gave `down refused. Agreements span more than one reporting year: T01-AGR-SINGLE(2). No schema change was applied.` Down: `restore_count 2`; the 5 rows came back identical to the post-seed snapshot. Up 2 green. Full evidence: worker file `/tmp/T-01-evidence.md`.
- **Falsifier 1 (archive step removed), observed red:** `Duplicate entry 'T01-AGR-ACTIVE-2026' for key 'bilateral_project_mapping.uk_bpm_agreement_year'`, `ER_DUP_ENTRY`, errno 1062. Mutation reverted, and the scratch schema was repaired by hand.
- **Falsifier 2 (two active rows; scratch `uk_bpm_active_agreement` dropped first), observed red:** `AnnualizeBilateralProjectMapping1792200000000 up refused. More than one active row for: T01-AGR-SINGLE(2). No schema change was applied.` `SHOW COLUMNS … 'reporting_year'` → `[]`; history table absent. Reverted.
- **Implementer verification:** `npm run build` exit 0 · `npx eslint` 4 files exit 0 · `npm test -- --silent src/domain/entities/bilateral-project-mapping src/domain/tools` → 105 suites / 928 tests passed.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** from `server/researchindicators`, after the worker reported: `npm run build` → `BUILD_EXIT:0` · `npx eslint <4 files>` → `ESLINT_EXIT:0` · same `npm test` → `Test Suites: 105 passed, 105 total` / `Tests: 928 passed, 928 total` · `npm run migration:test:revert` → exit 0, `restoring history rows=[{"restore_count":2}]` · `npm run migration:test:execute` → exit 0, `archived superseded duplicates=[{"archived_count":2}]`, `executed successfully`. Side note: the Leader's first revert attempt reverted `ScopeReportVersionsByPlatform1792100000000`, because the worker had left the scratch schema at pre-annualize state after the falsifiers. Re-executing restored the order. Scratch only.
- **Reviewer (parallel lens mode, migration/data-loss surface):**
  - A, `akili-reviewer`/opus, lens RISK: **`STATUS: PASS`**. "Neither `up` nor `down` can lose a row or an audit field." Checked: abort only on more than one active row and before DDL; keeper = §4.1 step 3 plus an id tie-break; archive before delete; `updated_at = updated_at` on backfill; down refusal before DDL; restore collision-free (archived rows are always inactive); history columns complete; P-28 grep clean; I-8 declared on the entity.
  - B, `akili-reviewer`/opus, lens RELIABILITY: **`STATUS: PASS`**. The restored generated column + `uk_bpm_active_agreement` are identical to `1779190000011`; `reporting_year` is INT NOT NULL with no default; the index matches the entity in name, columns and order; A-16 order holds; P-28 holds (the only colon is inside a quoted COMMENT); timestamp ordering is correct.
- **ADVISORY (labelled advisory, not gating):**
  - RISK/RELIABILITY: `up` and `down` cannot be re-run after a partial failure (DDL auto-commits, no existence guards). Recovery is manual. Only reachable through a concurrent writer during deploy.
  - RISK/RESILIENCE: concurrent-writer window between `ADD COLUMN … NULL` and `MODIFY … NOT NULL`. Old code that inserts during the migration would make the MODIFY fail. Avoid Auto-map during the first deploy.
  - RELIABILITY (I-8 drift, inferred, not run): the history DDL lacks the `AuditableEntity` defaults (`created_at` DEFAULT, `updated_at` ON UPDATE, `is_active` default), and the entity's `reporting_year` COMMENT is missing from the DDL. A future `migration:generate` would probably propose ALTERs, not DROPs. Pre-existing drift of the same class exists on `clarisa_project_short_name`.
  - READABILITY/RISK: `TypeOrmModule.forFeature([…History])` in the module adds nothing for metadata (`orm.config.ts:20` globs entities). It only makes a repository injectable, and its comment is inaccurate.
  - RISK (deploy ordering): from the moment `up` applies, writers that do not set `reporting_year` fail (no default) until T-05/T-06 land.
  - RISK (inherent, matches §4.2): `down` drops the year label of a single-year non-2026 agreement.
  - RISK (harness): the scratch container is polluted (37 migrations booked as run, a half-built `pi_delegates`). Recreate it (`compose:test:down` / `up`) before the T-03/T-04 rehearsals.
- **spawns:** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer A akili-reviewer/opus 15 calls, 80 304 tokens, ended complete · Reviewer B akili-reviewer/opus 15 calls, 79 638 tokens, ended complete
- **Not Done / Assumptions (verbatim from the worker, assumptions only, no owed item):** "Full `migration:test:bootstrap` is red on a pre-existing FK (errno 3780), outside this task. The rehearsal used `migration:test:execute` / `revert` after scratch bookkeeping described above." · "When `updated_at` ties, the keeper is the greater `id`. The fixture's timestamps differ, so that tie-break did not choose the kept row." · "History stores the mapping columns except the generated `active_agreement_id` (recomputed on down) plus `original_id`, `reporting_year`, `archived_at`, `archive_reason`." · "`DB_PORT` was not in `.env`. The Dev survey used port 3306."
- **Issues encountered:** `migration:test:bootstrap` is red at `CreatePiDelegates1787600000000`: errno 3780, `FK_pi_delegates_project_id`, `utf8mb4_0900_ai_ci` vs the scratch `agresso_contracts.agreement_id` `utf8mb3_general_ci`. This is a pre-existing merged migration, not edited, and recorded as a gap. The rehearsal ran this migration alone after the worker booked the other 37 pending migrations as run on scratch.
- **Requirements covered:** R-APM-001 AC.1–3 and the *backfill* scenario (THEN / BUT / AND IT MUST) · NFR-APM-001 (reversible, pre-checked) · NFR-APM-003 (index; `EXPLAIN` is T-03)
- **Decisions:** none beyond the effort choice above.
- **Running totals vs budget (design §12):** tasks 1/10 · LOC +434/−5 (~1,500) · review rounds 2/~14 (two parallel lens verdicts)
- **Final verification:** VERIFIED (above)

### T-02 — Single year definition: `currentReportingYearSql`, resolver executes it — PASS (attempt 1)

- **Date:** 2026-10-28 · **Final status:** PASS
- **Skills:** `nestjs-expert`, `tdd` (task defaults, unchanged) · **Effort:** `grok-4.7-high` (shared rule, well specified)
- **Orca:** task `task_87da2f9b346f`, dispatch `ctx_e6e93a10c2d8` (fresh worker; retained through review, released after PASS)
- **Attempts:** 1
- **Files changed:** `server/researchindicators/src/domain/shared/utils/reporting-year.resolver.ts` · `…/reporting-year.resolver.spec.ts` · `server/researchindicators/test/reporting-year-sql.integration-spec.ts` (new)
- **RB-2 closed by probe (Leader, before dispatch):** the assumption was "the SQL integration cannot run because `PID_MYSQL_*` is absent". The probe showed `PID_MYSQL_*` defaults to the scratch container (127.0.0.1:3307, root, `ari_scratch_test`) and needs only the password. `PID_MYSQL_PASSWORD=<ARI_TEST_MYSQL_USER_PASS> npx jest --config ./test/jest-integration.json test/pi-delegates-auth-sql.integration-spec.ts` → `Tests: 5 passed, 5 total`. Integration specs are runnable for this spec. This is no longer a gap.
- **First step (observed):** the old JS rule and the new SQL rule agree on all 8 cases (`'2027\n'` → 2027 under both). A naive SQL port (`TRIM` + `REGEXP`, no `CHAR_LENGTH`) already disagreed on `'\t2027'` (2026 vs 2027). At HEAD, the flip unit test was green (`12 passed`) and the integration import was a setup red: `TS2305: … has no exported member 'currentReportingYearSql'`.
- **Implementation note:** `CHAR_LENGTH(norm) = 4` was added beside `REGEXP '^[0-9]{4}$'`. On MySQL 8.0.46, `$` matches before a trailing LF (measured: `HEX('2027\n') = 323032370A`, and `TRIM(value) REGEXP '^[0-9]{4}$'` = 1). The Reviewer ruled this faithful to "exactly 4 ASCII digits" and required: it also rejects `\v` and `\f`.
- **Integration (scratch MySQL, TEMPORARY `app_config`, `connectionLimit: 1`):** `Tests: 8 passed, 8 total`: `2027`→2027, `' 2027 '`→2027, `'2027\n'`→2027, `'\t2027'`→2027, `'abc'`→2026, `''`→2026, inactive→2026, missing→2026.
- **Falsifier 1 (normalisation dropped), observed red:** `✕ resolves active '2027\n' to 2027 … Received: 2026` · `✕ resolves active '\t2027' to 2027 … Received: 2026` · `Tests: 2 failed, 6 passed, 8 total`. Reverted.
- **Falsifier 2 (`resolve()` cached), observed red:** `● ReportingYearResolver › returns the new value on the second call when the row changes — Expected: 2027, Received: 2026`. Reverted.
- **Placeholder mutation (`/* ? */` in the fragment), observed red:** `● … exports a fragment with no placeholders — Expected pattern: not /\?/`. Reverted.
- **Consumers (`ReportingYearResolver` in `src/**/*.spec.ts`):** 12 files, 28 hits (the full list is in the worker evidence): the resolver spec, `result-prms-sync-log.repository.spec.ts`, `pool-funding-mapping-apply.service.spec.ts`, `clarisa-projects.service.spec.ts`, and 8 `bilateral.service*.spec.ts` files. The `resolve(): Promise<number>` signature is unchanged.
- **Implementer verification:** eslint exit 0 · `npm test` (utils + 11 consumer specs) → 40 suites / 481 tests passed · integration 8/8 · `npm run build` exit 0.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** from `server/researchindicators`: `npm run build` → `BUILD_EXIT:0` · `npx eslint <3 files>` → `ESLINT_EXIT:0` · `npm test -- --silent src/domain/shared/utils <consumer specs> src/domain/entities/bilateral` (a superset of the worker's list) → `Test Suites: 53 passed, 53 total` / `Tests: 698 passed, 698 total` · integration → `Tests: 8 passed, 8 total`.
- **Reviewer** (`akili-reviewer`/opus, lens checklist): **`STATUS: PASS`**. "T-02 meets design §6.1 and DD-2, and covers the resolver part of R-APM-002 and NFR-APM-002." Rulings: (1) `CHAR_LENGTH(norm) = 4` is faithful and required; (2) the TS warning gate does not break "TS and SQL cannot drift" for the value callers receive, because the returned number is the SQL column (unit case: column 2031 with raw `not-a-year` → 2031).
- **ADVISORY (labelled advisory, not gating):**
  - RELIABILITY/KZ-017: no test runs `resolve()`'s full SQL (including the `raw_value` subquery) against MySQL with `namedPlaceholders: true`. Only the fragment is executed. Read by hand: no failure found.
  - READABILITY/drift: the row filter and the year rule are each written twice (fragment vs the `raw_value` subquery; fragment vs `isUsableReportingYearRaw`). Only the log line could drift. Option: return `is_usable` from SQL.
  - RISK: the integration `beforeEach` `DELETE FROM app_config` would reach a real table only if `CREATE TEMPORARY TABLE` failed and Jest still ran the hooks. That is guarded by the no-default password. Low risk.
  - READABILITY: the unit spec's `yearFromRaw` mock is a third copy of the rule. It is disclosed: only the integration suite proves evaluation.
- **What the checks cannot reach (worker, accepted):** the unit spec mocks `query`; the integration suite never calls `resolve()`; build excludes specs; consumer specs mock `resolve()`. The worker also noted that CodeGraph has no index at this worktree root, so callers came from grep.
- **spawns:** Implementer Cursor/grok-4.7-high: not reported by host, ended complete · Reviewer akili-reviewer/opus 11 calls, 58 617 tokens, ended complete
- **Not Done / Assumptions (verbatim from the worker):** "None owed. Judgment: `CHAR_LENGTH(norm) = 4` is how "exactly 4 ASCII digits" is true on MySQL 8.0.46, because `$` matches before a trailing newline. The warning gate in TS (`\t\r\n` → space, ASCII-space trim, `[0-9]{4}`) only chooses the existing log line. The returned number is the SQL column (unit case: column `2031` with raw `not-a-year` returns 2031)."
- **Requirements covered:** R-APM-002 scenario: THEN (resolver), BUT not wait for a TTL · NFR-APM-002
- **Running totals vs budget (design §12):** tasks 2/10 · LOC +632/−63 (~1,500) · review rounds 3/~14
- **Final verification:** VERIFIED (above)

### T-03 — Year-scope the shared readers and re-create the DB function — attempt 1: FAIL (rework in progress)

- **Date:** 2026-10-28 · **Skills:** `nestjs-expert`, `tdd` (task defaults) · **Effort:** `grok-4.7-xhigh`
- **Orca:** task `task_2abd62d29885`, dispatch `ctx_163b21f98ad6` (terminal `term_50ebd991-…`), retained for rework
- **Files changed (attempt 1):** `src/domain/shared/utils/pool-funding.util.ts` (+spec) · `src/domain/entities/result-prms-sync/repositories/result-prms-sync-aggregate.repository.ts` (+spec) · `result-prms-sync-log.repository.spec.ts` · `results/repositories/result.repository.spec.ts` · `pi-delegates/repositories/pi-delegates.repository.spec.ts` · `agresso-contract/repositories/agresso-contract.repository.spec.ts` · `src/db/migrations/1792300000000-scopePoolFundingValidationToReportingYear.ts` (new) · `src/db/migration-specs/1792300000000-scopePoolFundingValidationToReportingYear.spec.ts` (new) · `test/pool-funding-contributor-year.integration-spec.ts` (new)
- **Implementer evidence (summary):** red at HEAD `Expected: 0, Received: 1` (2027 read); integration green after the change; falsifier 1 (predicate year clause removed) red `Expected: 0, Received: 1`; falsifier 2 (fragment stripped from the migration) → copy-drift spec red; scratch execute/revert/execute with `SHOW CREATE FUNCTION` excerpts (year clause present after up, absent after down); EXPLAIN → `bpm eq_ref key uk_bpm_agreement_year`; build exit 0, eslint exit 0, 8 spec files / 207 tests passed. Full evidence: worker `/tmp/T-03-evidence.md`.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** `npm run build` → `BUILD_EXIT:0` · `npx eslint <11 files>` → `ESLINT_EXIT:0` (a first run exited 2 because a zsh variable did not word-split the 11 paths, a Leader invocation error; re-run with explicit paths → 0) · `npm test -- --silent src/domain/shared/utils src/domain/entities/result-prms-sync src/domain/entities/results/repositories src/domain/entities/pi-delegates src/domain/entities/agresso-contract src/domain/entities/green-checks src/db/migration-specs` → `Test Suites: 75 passed, 75 total` / `Tests: 1011 passed, 1011 total` · integration (`pool-funding-contributor-year` + `reporting-year-sql`) → `Tests: 9 passed, 9 total` · scratch `migration:test:revert` exit 0 / `migration:test:execute` exit 0 for 1792300000000.
- **Reviewer A** (`akili-reviewer`/opus, lens RELIABILITY, SQL/migration): **`STATUS: PASS`**. The `up` body is line-for-line identical to `1786679227000`'s `up` plus the year clause inside the EXISTS; `down` = that body; `READS SQL DATA` only, no DEFINER, same as before; P-28 holds; the aggregate clause is in the LEFT JOIN `ON`; the copy-drift spec is collected by `npm test`. Advisories: copy-drift passes if the literal moves into `down()` or into a comment; no executed per-year check of the stored function; no legacy-flag-1 integration row; the util spec's `toBe` interpolates the fragment.
- **Reviewer B** (`akili-reviewer`/opus, lens RISK, reader completeness/evidence): **`STATUS: FAIL`**. Full report, verbatim:

> STATUS: FAIL
>
> SUMMARY (RISK lens: whether the reader set is complete and the tests can fail, plus baseline spec conformance; SQL/migration correctness is the other reviewer's lens): The reader set is complete. All 7 predicate call sites pick up the year scope by interpolating the helper: agresso-contract 347/399/532, pi-delegates 117 (via `PROJECT_SUMMARY_SELECT`) and 538 (`findProjectSummary`), result 215, prms-sync-log 165. A fresh grep shows no other caller. Every one of them has a regex assertion on the SQL string actually passed to `query`, with the year AND placed inside the EXISTS. None is checked through a builder mock.
> - The aggregate join is scoped and asserted the same way.
> - The DB function is re-created, with copy-drift and `SHOW CREATE` evidence over up, down and up.
> - The `flagCall` matcher change is a necessary disambiguation, not a weakening. Since the fragment was added, the gate-snapshot SQL also contains `FROM app_config`, so the old `find()` would have matched the wrong call. The real button read (`result-prms-sync-log.repository.ts:124-125`) still binds `` WHERE `key` = ? ``, and the params assertion is unchanged.
> - Leaving the green-checks spec unchanged is correct: it pins only the call `pool_funding_alignment_validation(r.result_id)`, and that text did not change.
> - The fixture meets the Disqualifier: the 2027 read, which is the read that tells scoped from unscoped, has only the other year's (2026) row.
> - EXPLAIN is quoted and the key is `uk_bpm_agreement_year`.
> - Two issues block the gate: one part of the R-APM-004 scenario is not evidenced, and the recorded red run does not match the committed test.
>
> ISSUES:
> 1. **Discovered Issue:** The scenario clause "AND IT MUST show … when the year is set back to 2026" is never run. The integration test goes 2026 → 2027 and then reads `bilateral_project_mapping` directly. It never sets `ARI_PRMS_SYNC` back to 2026 and reads through the predicate again. The direct read proves the row was not deleted or deactivated (the BUT clause). It does not show the row becoming visible again on switching back, which is what the coverage row gives to T-03.
>    * **Violated Rule:** `requirements.md` R-APM-004, scenario *prior-year rows are invisible, not gone* (AND IT MUST); `tasks.md` §4 coverage row "R-APM-004 | scenario — AND IT MUST show 2026 rows on switching back | T-03"; root `CLAUDE.md` §4.3 KZ-014 (something not seen cannot be asserted).
>    * **Remediation Suggestion:** After the `mappingRows()` assertion, add `await setReportingYear('2026'); await expect(contributor()).resolves.toBe(1);`.
>
> 2. **Discovered Issue:** The verbatim red run in the evidence is for a test titled "a 2026 mapping is a contributor only in that reporting year". The committed test is titled "treats a 2026 mapping as a contributor in 2026 and not in 2027, and leaves the row in place". So the red was seen on an earlier version of the file, not the committed one. Falsifier 1's output shows no test title, so it does not settle which version it ran against.
>    * **Violated Rule:** `tasks.md` T-03 "Red run: to be observed against `HEAD`"; root `CLAUDE.md` §4.3 K-004 / KZ-014.
>    * **Remediation Suggestion:** After fixing issue 1, re-run Falsifier 1 on the final file: remove the year AND from `pool-funding.util.ts` and run `npx jest --config ./test/jest-integration.json test/pool-funding-contributor-year.integration-spec.ts` without `--silent`, so the test title appears. Record the output verbatim, including the title and the failing line. Restore the clause and show the green run.
>
> ADVISORY:
> - RISK: The year scope inside the stored function is checked only as text (copy-drift plus `SHOW CREATE`). Nothing executes `pool_funding_alignment_validation` to show it tells 2026 from 2027. *Reachability:* if the literal were mistyped, the function would mark a prior-year-only contract as eligible and return `false` for an unanswered alignment, which disables Submit in STAR. The task text does not require an executed check, so this is a recorded gap, not a FAIL. Suggestion: a scratch `SELECT pool_funding_alignment_validation(<id>)` under each year.
> - RISK: AC.3 (the PRMS payload takes its registry code from the current-year mapping) has evidence only at the SQL-string level. Once T-01 allows one row per (agreement, year), the old unscoped LEFT JOIN would produce duplicate rows for a contract with rows in two years. *Reachable:* yes, with one contract that has rows for both 2026 and 2027. The SQL assertion would catch the clause being removed, but no test runs the two-year case. Consider an aggregate test that returns two contract rows, or an integration case.
> - RELIABILITY: The integration fixture has only `legacy flag = 0`. The OR branch for flag = 1 is pinned only as text. This is acceptable because R-APM-004 says that branch is unchanged.

- **Leader adjudication (parallel lens rule):** both issues are in T-03 scope. Issue 1 is a clause tasks.md §4 assigns to T-03. Issue 2 is the task's own Red run line plus K-004. The FAIL consumes attempt 1.
- **Rework plan:** attempt 2 goes to the same Cursor worker (owner rule: keep the worker through FAIL/rework). Reviewer B's report is sent verbatim. **Effort ceiling: held xhigh**: T-03 started at `grok-4.7-xhigh`, the T2 ceiling; `max` is barred on T2 and no stronger Implementer tier is routed under the owner's "Grok implements" rule. Override (e), rework: a conformance Reviewer runs again on attempt 2.
- **spawns (attempt 1):** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer A akili-reviewer/opus 12 calls, 85 297 tokens, ended complete · Reviewer B akili-reviewer/opus 18 calls, 84 759 tokens, ended fail

### T-03 — Year-scope the shared readers and re-create the DB function — attempt 2: PASS (final)

- **Date:** 2026-10-28 · **Final status:** PASS (attempt 2 of 3)
- **Effort:** `grok-4.7-xhigh`, held at the T2 ceiling (`effort ceiling: held xhigh`)
- **Orca:** rework task `task_8247a5add6d7`, dispatch `ctx_572c767e1770`, same worker terminal `term_50ebd991-…` (owner rule: the worker stays through FAIL/rework); released after PASS
- **Attempt history:** attempt 1 FAIL (Reviewer B, two evidence issues: the switch-back clause was not run, and the red was observed on an earlier version of the test file). Attempt 2 was told not to touch what Reviewer A passed.
- **Files changed (attempt 2):** `server/researchindicators/test/pool-funding-contributor-year.integration-spec.ts` only. It adds `setReportingYear('2026')` plus a contributor read through the predicate after the row-still-there assertion. The rest of the change set is byte-identical to attempt 1.
- **Red at HEAD production, final test file (observed):** `pool-funding.util.ts` was replaced with `git show HEAD:…`, then restored byte-identical:
  ```
  ● effectivePoolFundingContributorSql reporting year (real MySQL) › treats a 2026 mapping as a contributor in 2026 and not in 2027, and leaves the row in place
    Expected: 0
    Received: 1
    > 146 |     await expect(contributor()).resolves.toBe(0);
  ```
- **Falsifier 1 on the final file (observed):** only `AND bpm.reporting_year = ${currentReportingYearSql}` was removed → same title, line 146, `Expected: 0 / Received: 1`. Restored byte-identical.
- **Falsifier 2 (attempt 1, unchanged file):** the copy-drift spec went red with the fragment stripped from the migration (see the attempt-1 entry).
- **Green (worker, without `--silent`):** `✓ treats a 2026 mapping as a contributor in 2026 and not in 2027, and leaves the row in place` · `Tests: 1 passed, 1 total` · eslint exit 0.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** integration `pool-funding-contributor-year` + `reporting-year-sql` → `Tests: 9 passed, 9 total` · `npx eslint test/pool-funding-contributor-year.integration-spec.ts` → `ESLINT_EXIT:0` · `npm test -- --silent src/domain/shared/utils src/db/migration-specs` → `Test Suites: 53 passed, 53 total` / `Tests: 455 passed, 455 total` · `setReportingYear('2026')` present at spec lines 142 and 152. The attempt-1 full re-run (build, 11-file eslint, 75 suites / 1011 tests, scratch revert/execute) stands for the unchanged files.
- **Reviewer (attempt 2)** (`akili-reviewer`/opus, lens RISK, rework override (e)): **`STATUS: PASS`**. "Both issues from attempt 1 are fixed." The switch-back read goes through `effectivePoolFundingContributorSql` (legacy flag 0, so only the year-scoped EXISTS can yield 1). The recorded red matches the committed title and lines 145–146, and the failure has the right cause (the 2027 read). Nothing else in scope is broken.
- **ADVISORY (all rounds, labelled advisory, not gating):**
  - RISK: the HEAD red proves only the year-scoping branch. No case reads a 2027-only fixture in 2026.
  - RELIABILITY: copy-drift passes if the literal moves into `down()` or into a comment. Option: assert on the `up()` text and that `down()` lacks `reporting_year`.
  - RISK: no executed per-year check of the stored `pool_funding_alignment_validation` (only text + `SHOW CREATE`). A mistyped literal would disable Submit in STAR.
  - RISK: AC.3 (PRMS payload registry code from the current-year mapping) is evidenced only at the SQL-string level. No test runs a contract with rows in two years through the aggregate.
  - RELIABILITY: no legacy-flag-1 integration row, so OR precedence is pinned as text only.
  - READABILITY: the util spec's `toBe` interpolates the fragment, so fragment-content changes are covered by T-02's tests, not this one.
- **EXPLAIN (NFR-APM-003, scratch):** `id 2 DEPENDENT SUBQUERY bpm eq_ref possible_keys uk_bpm_agreement_year,idx_bpm_agreement key uk_bpm_agreement_year rows 1`. The load benchmark is an accepted gap. The scratch estimate is not a cardinality reading.
- **spawns (attempt 2):** Implementer Cursor/grok-4.7-xhigh (same worker): not reported by host, ended complete · Reviewer akili-reviewer/opus 6 calls, 37 779 tokens, ended complete
- **Not Done / Assumptions (attempt 1, verbatim, nothing owed):** "Not committed (Leader commits)." · "Scratch is left with `1792300000000` applied (up/down/up ends on up)." · "No load benchmark."
- **Requirements covered:** R-APM-004 AC.1, AC.3 (SQL level), AC.4 and the scenario (THEN / BUT must NOT alter / AND IT MUST show on switching back) · NFR-APM-001 (the function migration is reversible) · NFR-APM-003 (`EXPLAIN` quoted)
- **Running totals vs budget (design §12):** tasks 3/10 · LOC +1,168/−79 (~1,500) · review rounds 6/~14. **Forecast:** server + migrations are already at ~1,170 against ~1,100 budgeted for those two lines, with T-04/T-05/T-06 (server) still open. The LOC tripwire will likely fire during T-04 or T-05.
- **Final verification:** VERIFIED (above)

### T-04 — CLARISA unification: one year, retire the old key — attempt 1: FAIL (rework in progress)

- **Date:** 2026-10-28 · **Skills:** `nestjs-expert`, `api-design-principles` (Leader added `api-design-principles` for the endpoint/query removals) · **Effort:** `grok-4.7-high`
- **Orca:** task `task_f2c5ddd3296e`, dispatch `ctx_4a78f3b8678e` (terminal `term_c4b0b584-…`), retained for rework
- **Files changed (attempt 1):** `.env.example` · `app-config-key.enum.ts` (`@deprecated`) · `bilateral-mapping-coverage.service.ts` (+spec) · `bilateral-project-mapping.controller.ts` (+spec) · `dto/coverage-report.query.dto.ts` · `env.utils.ts` · `clarisa-projects.{service,controller}.ts` (+specs) · `clarisa-projects.module.ts` · deleted `mapping-phase.resolver.ts` (+spec) and `dto/clarisa-project-phase.types.ts` · new `src/db/migrations/1793221840500-retireClarisaProjectsPhaseKey.ts`
- **Red at HEAD (observed):** `● ClarisaProjectsService › listBilateralProjects › filters the eligible cohort to ARI_PRMS_SYNC 2026 when the old key row is 2025 (R-APM-002 AC.1)`: Expected `[2]`, Received `[1]`, at `clarisa-projects.service.spec.ts:741`. Falsifier (`listBilateralProjects` back on `MappingPhaseResolver`): same title and line, same red. Reverted.
- **AC.2 grep (worker):** `rg -n 'MappingPhaseResolver|ARI_CLARISA_PROJECTS_PHASE|CLARISA_PROJECTS_PHASE|getEligiblePhases|projects/phases' src test` → 13 matches on 12 lines: the spec (7), the retire migration (2), the enum (2), seed migration `1786738949211` (2); `test/` 0; `.env.example` 0. The grep cannot see `client/` (T-10) or `docs/`.
- **Migration rehearsal (scratch):** the row was present (`simple_value` 2026, `is_active` 1). execute → `is_active 0`; revert → `1`; execute → `0`.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** `npm run build` → `BUILD_EXIT:0` · `npx eslint <all changed .ts>` → `ESLINT_EXIT:0` · `npm test -- --silent src/domain/tools/clarisa src/domain/entities/bilateral-project-mapping src/domain/shared/utils src/domain/entities/app-config` → `Test Suites: 89 passed, 89 total` / `Tests: 717 passed, 717 total` · `migration:test:revert` exit 0 / `migration:test:execute` exit 0 (1793221840500) · `rg -c` AC.2 → enum 1, seed 2, retire 2, spec 7.
- **Reviewer** (`akili-reviewer`/opus, lens checklist): **`STATUS: FAIL`**. Full report, verbatim:

> STATUS: FAIL
>
> SUMMARY: T-04 (attempt 1) does most of its job. The resolver swap, the deletions, the module, ENV and `.env.example` cleanup, the Swagger removals, the `@deprecated` enum member and the retire migration all conform, and the AC.1 red/falsifier evidence is sound because the fixture keys differ (2025 vs 2026). The gate fails on one item: the coverage row that T-04 owns. "R-APM-002 | scenario — AND IT MUST NOT serve another year's feed | T-04 (feed cache keyed by the year)" is not met when a year is carried in. The Implementer's own assumption ("a carried year that differs from the resolver still filters a feed fetched for the resolver year") describes the defect itself. It is not deferrable to T-05.
>
> ISSUES:
> 1. **Discovered Issue:** `listBilateralProjects` resolves `targetPhase` from the carried year (`clarisa-projects.service.ts:85`). It then calls `getCachedAll()` (`:86`), which ignores that year. `getCachedAll` re-reads `reportingYearResolver.resolve()` (`:207`), keys the cache by that year and fetches `api/projects?phase=<resolverYear>` (`:222`). So the cohort is the resolver year's feed filtered by `matchesPhase(p.phase, carried)`. This is reachable two ways.
>    - **Today:** `AutomapperService.resolve(phase)` (`automapper.service.ts:113-115`) still forwards the body `phase`. `POST auto-map/preview {phase:2025}` with `ARI_PRMS_SYNC=2026` fetches the 2026 feed and filters it to 2025. CLARISA filters by phase on its side, so the cohort comes back empty.
>    - **After T-05:** the DD-10 race. `resolve()` reads 2026, an admin saves 2027 mid-request, and `getCachedAll` then fetches the 2027 feed and filters it to 2026. That serves another year's feed under the carried year, which is the scenario's "AND IT MUST NOT" clause.
>
>    The existing spec masks this. At `clarisa-projects.service.spec.ts:688-709` a feed fetched as `?phase=2026` is mocked to contain 2025 rows, and the test asserts id 1. A real CLARISA response would not contain those rows.
>    - **Violated Rule:** requirements.md R-APM-002 scenario: "AND IT MUST NOT serve a CLARISA feed cached for 2026 as 2027's". tasks.md §4: the row "AND IT MUST NOT serve another year's feed → T-04 (feed cache keyed by the year)". design.md §6.1 DD-10: "`ClarisaProjectsService.listBilateralProjects` accepts it, so the cohort and the writes share one year". T-04's Design line names "DD-10 (the `listBilateralProjects` accepts a carried year)". This is T-04's clause, not T-05's: T-05 only changes the automapper so it carries the year, while the guarantee that a carried year selects that year's feed lives inside `ClarisaProjectsService`, which is T-04's scope.
>    - **Remediation Suggestion:**
>      - Change `getCachedAll(year: number)` to take the resolved `targetPhase` from `listBilateralProjects`. Do the same from `listProjectsForCoverage`, and use the resolver for `findProjectById` / `findProjectByExternalCode`. Key the cache and build the fetch path from that argument, and keep the stale-on-error branch keyed by the same year.
>      - Add a test with the resolver at 2026 and a carried 2025: assert `connectionGet` is called with `'api/projects?phase=2025'`, and a follow-up uncarried call makes a second fetch for `?phase=2026` (a cache miss).
>      - Correct the `:688` fixture so a feed contains only the requested phase.
>      - Observe the new test red at the current tree first (K-004).
>
> ADVISORY:
> - RELIABILITY: the migration's `down` sets `is_active = 1` unconditionally, so a row that was already inactive before `up` gets reactivated. Reachable only if the row was inactive before deploy. The scratch pre-check showed it active, so this is acceptable as reversible, but the header could say so.
> - READABILITY: the carried year still travels as the option name `phase`, and the 400 text still reads "Invalid phase". This is tolerable until T-05 renames it; flag it for T-05.
> - Checked and conformant:
>   - `process.env.ARI_CLARISA_PROJECTS_PHASE` test (`spec:1101-1129`): it sets both the old app_config row and the env var to 2025 and asserts slice `[51]` and `phaseUsed` 2026. That proves neither source is read by `listProjectsForCoverage`, a valid negative now that `ENV.CLARISA_PROJECTS_PHASE` is deleted. The try/finally restores the env var correctly.
>   - Swagger: the `phase` `@ApiQuery` was removed from `GET clarisa/projects/bilateral` and `GET coverage-report`. Handlers otherwise unchanged; no new endpoints.
>   - A leftover `phase` query does not 400:
>     - `GET bilateral` binds only the named `@Query` params, so `phase` is ignored with a 200.
>     - `GET coverage-report` uses `ValidationPipe({ whitelist: true, transform: true })` with no `forbidNonWhitelisted`, so `phase` is stripped with a 200. This matches R-APM-003 ("A `phase` query on a GET is stripped and ignored").
>     - The controller-spec `validate()` case runs no pipe, so it proves no validation error but not the stripping. That gap is noted.
>   - Enum JSDoc is accurate (`@deprecated — retained only so migration 1786738949211 compiles; read nowhere`).
>   - P-28: the SQL contains no `?` and no `:word`, the key is backticked and is a single quoted literal. The scratch execute/revert/execute run is evidenced (K-006).
>   - AC.2: the grep scope excludes `client/` (T-10), as declared.

- **Leader adjudication:** in scope. tasks.md §4 assigns "AND IT MUST NOT serve another year's feed" to T-04, and T-04's Design line names DD-10. The FAIL consumes attempt 1.
- **Rework plan:** attempt 2 goes to the same worker (owner rule), with the report verbatim. Effort bumped high → xhigh **in the brief only**: a reused Orca terminal cannot change `--model`, so the model stays `grok-4.7-high` (precedent: agrovoc T-03).
- **spawns (attempt 1):** Implementer Cursor/grok-4.7-high: not reported by host, ended complete · Reviewer akili-reviewer/opus 17 calls, 92 775 tokens, ended fail

### T-04 — CLARISA unification: one year, retire the old key — attempt 2: PASS (final)

- **Date:** 2026-10-28 · **Final status:** PASS (attempt 2 of 3)
- **Effort:** bumped high → xhigh **in the brief only**. The reused terminal kept `grok-4.7-high`.
- **Orca:** rework task `task_cfca0852de06`, dispatch `ctx_ea04b82974be`, same terminal `term_c4b0b584-…`; released after PASS
- **Files changed (attempt 2):** `clarisa-projects.service.ts`, `clarisa-projects.service.spec.ts`. `getCachedAll(phase)` takes the resolved year: `listBilateralProjects` / `listProjectsForCoverage` pass `resolveListingYear(carried)`, while `findProjectById` / `findProjectByExternalCode` pass the resolver year. The cache key, the fetch path `api/projects?phase=` and the stale-on-error branch all use that argument. The `:688` fixture now holds only the requested phase.
- **Red at the attempt-1 tree (observed):** `● … fetches the carried year and refetches when the next call has no carried year (R-APM-002)`: Expected `"api/projects?phase=2025"`, Received `"api/projects?phase=2026"`, `Number of calls: 1`, `> 734 | expect(connectionGet).toHaveBeenNthCalledWith(`.
- **Falsifier (observed, reverted):** the argument was overwritten inside `getCachedAll` (`phase = await this.reportingYearResolver.resolve();`). Same title, same line 734, same red.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** `npm run build` → `BUILD_EXIT:0` · `npx eslint <2 files>` → `ESLINT_EXIT:0` · `npm test -- --silent src/domain/tools/clarisa src/domain/entities/bilateral-project-mapping src/domain/shared/utils src/domain/entities/app-config` → `Test Suites: 89 passed, 89 total` / `Tests: 718 passed, 718 total` · new test by title → `✓ fetches the carried year and refetches when the next call has no carried year (R-APM-002)` · `grep reportingYearResolver clarisa-projects.service.ts` → :58 constructor, :132 fallback, :137, :148 (none inside `getCachedAll`). The attempt-1 migration rehearsal and AC.2 grep stand (unchanged files).
- **Reviewer (attempt 2)** (`akili-reviewer`/opus, rework override (e)): **`STATUS: PASS`**. "The attempt-1 FAIL is fixed." Every path into `getCachedAll` passes a pre-resolved year. The fetch path, the cache hit (`cache.phase === phase` within TTL) and stale-on-error (`this.cache?.phase === phase`, else cold 503) are all keyed by it, so another year's stale feed is never served. The single-slot cache was judged acceptable: a year change is always a miss.
- **ADVISORY (all rounds, labelled advisory, not gating):**
  - RELIABILITY: `getCacheFetchedAt()` reports the age of whichever year occupies the single slot. It could report another year's age if a carried-year listing interleaves with an automapper report. Option: `getCacheFetchedAt(phase)`. *Forward pointer for T-05* (automapper reads it).
  - RESILIENCE: with a single slot, alternating years plus an upstream error gives a 503 where a per-year map would serve stale. This is correct by spec.
  - READABILITY: the file header's resilience paragraph should say "for the same year". The carried year still travels as option `phase`, and the 400 text says "Invalid phase". *Forward pointer for T-05* (rename when automapper carries the year).
  - RELIABILITY: the retire migration's `down` sets `is_active = 1` unconditionally, which reactivates a row that was inactive before `up`.
  - The controller-spec `validate()` case runs no pipe, so the stripping of a leftover `phase` query (whitelist, no `forbidNonWhitelisted` → 200) is shown by reading the code, not executed.
- **spawns:** attempt 1: Implementer Cursor/grok-4.7-high not reported by host, ended complete; Reviewer opus 17 calls, 92 775 tokens, ended fail · attempt 2: Implementer (same worker) not reported by host, ended complete; Reviewer opus 6 calls, 55 366 tokens, ended complete
- **Not Done / Assumptions (attempt 2, verbatim, nothing owed):** "None owed. The cache is one slot: a carried-year fetch replaces another year's warm entry, which is the miss the new test asserts. Lookups by id and external code still use the resolver year, so they refetch when the slot holds a different year. Automapper still forwards `{ phase }` and was not modified (T-05)."
- **Requirements covered:** R-APM-002 AC.1, AC.2 (grep, server), AC.3 (row deactivated by migration), scenario AND IT MUST NOT serve another year's feed · R-APM-003 (`GET clarisa/projects/bilateral` without `phase`) · R-APM-010 (server endpoint removal)
- **Running totals vs budget (design §12):** tasks 4/10 · LOC +1,382/−575 (~1,500) · review rounds 8/~14. **Forecast:** T-05 (size L) will almost certainly cross the LOC budget. The tripwire is evaluated at T-05's finalize.
- **Final verification:** VERIFIED (above)

### T-05 — Automapper: five disjoint buckets, in-place update, coverage with `inactive` — PASS (attempt 1)

- **Date:** 2026-10-28 · **Final status:** PASS
- **Skills:** `nestjs-expert`, `tdd`, `api-design-principles` (task defaults) · **Effort:** `grok-4.7-xhigh` (size L, core owner-decided rules)
- **Orca:** task `task_f75d5726b3e1`, dispatch `ctx_90a3ff9c6f04` (terminal `term_1530f368-…`); released after PASS
- **Attempts:** 1
- **Files changed:** `server/researchindicators/src/domain/entities/bilateral-project-mapping/automapper.service.ts` (+spec) · `automapper.controller.ts` (+spec) · `dto/automapper-run.dto.ts`
- **Red at HEAD (observed, without `--silent`):** `Apply ×3 leaves exactly one current-year row, is_active false, deleted_at untouched`, `automapper.service.spec.ts:1203` `expect(store).toHaveLength(1)`: Expected length 1, Received length 2 (inactive id 1697 + a new active id 9000).
- **Falsifier 1 (observed):** `.andWhere('bpm.is_active = :isActive', { isActive: true })` restored in `classifyAgainstExisting` → same title, `:1458`, Expected length 1 / Received 2. Reverted.
- **Falsifier 2 (observed):** `clarisaFieldUpdate` writes `is_active: true` → `row 6 refreshes CLARISA fields and stays inactive`, `:1389`, Expected false / Received true. Reverted.
- **§6.3 → tests:** `lands each table row in exactly one bucket` covers §6.3 rows 1–6 and R-APM-005 table rows 1–7, with sources DERIVED / AI_AUTO / MANUAL and different projects on the inactive rows (R5 vs R6). Plus dedicated cases: toCreate (with `reporting_year` on the insert), alreadyMapped (MANUAL), row 3 keeps its id and a second Apply writes 0, row 6 stays inactive, A1697 listed under `inactive` not `toCreate`, idempotent create, the §6.4 mixed match, `does not see a prior-year row`.
- **R-APM-009 AC.1:** `197 active, 1 inactive, 198 reachable → 197 / 0 / 1 / 198` green. **R-APM-003:** a real Nest HTTP test: `POST auto-map/preview {phase:2025}` → 400, nothing classified; `GET coverage?phase=2025` → 2026 figures.
- **Implementer verification:** build exit 0 · eslint 5 files exit 0 · `npm test -- --silent src/domain/entities/bilateral-project-mapping src/domain/tools/clarisa src/domain/shared/utils` → 85 suites / 700 tests passed · `phase` grep in the controller + DTO → no matches.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** `npm run build` → `BUILD_EXIT:0` · `npx eslint <5 files>` → `ESLINT_EXIT:0` · `npm test -- --silent src/domain/entities/bilateral-project-mapping src/domain/tools/clarisa src/domain/shared/utils src/domain/entities/bilateral` → `Test Suites: 98 passed, 98 total` / `Tests: 946 passed, 946 total` · by title: `✓ R-APM-009 AC.1 — 197 active, 1 inactive, 198 reachable → 197 / 0 / 1 / 198`, `✓ row 6 refreshes CLARISA fields and stays inactive`, `✓ Apply ×3 leaves exactly one current-year row, is_active false, deleted_at untouched` · `grep phase automapper.controller.ts dto/automapper-run.dto.ts` → none.
- **Reviewer** (`akili-reviewer`/opus, lens checklist): **`STATUS: PASS`**. "I found no spec violations in T-05 (attempt 1)." Verified: classify is scoped by `reporting_year = :reportingYear` with no `is_active` filter; automation-owned = `source !== MANUAL`; rows 3/6 write only project id / short name / external code / `updated_by`; the insert year comes from `resolve()` only (DD-10); classification re-runs inside the transaction; §6.4 precedence; DTOs match §5 (`supersede` removed); `{phase}` → 400; controller log fields. KZ-017: a missing year scope in classify is caught by behavior (`does not see a prior-year row`).
- **ADVISORY (labelled advisory, not gating):**
  1. KZ-017: the R-APM-004 scenario "mapped 0" for coverage is evidenced only by argument shape and a regex. In the mixed fixture the 2025 row is masked by an active 2026 row. Option: a fixture whose only rows are active 2025 rows → `{mapped 0}`.
  2. Falsifier 1 trips only on the exact restored string, because the mock QueryBuilder filters on that literal clause. A different spelling of the same filter would not be caught.
  3. DD-10 re-resolution inside `apply` is undetected, because the resolver mock equals the carried year. Option: `apply(…, 2027)` with the resolver at 2026.
  4. **Forward pointer → T-06:** the R-APM-011 AC.5 sequence ("after activate, the next Apply classifies normally") needs T-06's `activate()`. It is **not covered by T-05**. tasks.md §4 assigns it to "T-05 (suite) + T-06 (activate)", so the T-06 brief must carry it, with the test living in T-05's suite.
  5. RESILIENCE: two concurrent Apply runs on a `toCreate` agreement → 1062 on `uk_bpm_agreement_year`, surfaced as a raw error. This is pre-existing (the same was true under the old key).
  6. READABILITY: `counts.updated` counts row 3 only; row-6 writes are counted under `inactive`. Document this in the T-08 client contract, or add `counts.refreshed`.
  7. Gap: the mock QueryBuilder is not MySQL. Collation, `uk_bpm_agreement_year` and `reporting_year NOT NULL` are not exercised by T-05.
- **spawns:** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer akili-reviewer/opus 15 calls, 111 858 tokens, ended complete
- **Not Done / Assumptions (verbatim, translated from the worker's Spanish; assumptions only, nothing owed):** "`counts.updated` is the length of `toUpdate` (row 3). Row 6 writes and is counted under `inactive`, with `refreshed: true`." · "The `ClarisaProjectsService.listBilateralProjects` option is still named `phase`. It was not renamed." · "The POST `{}` in the HTTP test answers 201 because that app does not mount `ResponseInterceptor`; the envelope carries status 200."
- **Requirements covered:** R-APM-005 AC.1–5, table rows 1–7, the A1697 scenario (THEN / BUT / AND IT MUST) · R-APM-003 AC.1, AC.2 · R-APM-009 AC.1 · R-APM-004 AC.2 (preview/coverage) · R-APM-011 "BUT must NOT be reactivated by Apply" · R-APM-002 scenario THEN (coverage/preview)
- **Running totals vs budget (design §12):** tasks 5/10 · LOC **+2,316**/−1,026 (budget ~1,500) · review rounds 9/~14. **BUDGET TRIPWIRE FIRED. See the block below.**
- **Final verification:** VERIFIED (above)

## Budget Tripwire: after T-05 (2026-10-28)

| Measure | Budget (design §12) | Actual after 5/10 tasks | Delta |
| --- | --- | --- | --- |
| Tasks | 10 | 5 done | on plan |
| LOC added (incl. tests) | ~1,500 | +2,316 (deleted −1,026) | **+816 (+54%) with 5 tasks left** |
| Review rounds | ~14 | 9 | on plan so far (2 reworks: T-03, T-04) |

**Cause:** test volume. The spec's own falsifiability rules (KZ-001 executed SQL, generated-SQL assertions per reader, one fixture per §6.3 row, red observed on the final file) put most of the lines into specs: T-03 +536 (7 reader assertions + integration + copy-drift), T-05 +934 (+~600 in `automapper.service.spec.ts`). Production code is close to the design's estimate. The §12 estimate counted "server ~700, migrations ~400" and under-sized the test share. Remaining: T-06 (M, server), T-07 (S, SSR), T-08–T-10 (client, ~350 estimated).
**Status:** stopped for the owner. The tripwire is never logged `auto-approved`.

**Owner decision (2026-10-29):** "Continue to T-06 (Recommended)". The overrun is accepted without re-baselining design §12. The tripwire stays armed against the original figures, so it is re-reported (not re-asked) at each later finalize.

### T-06 — Mapping service: year scope, upsert create, activate, ownership — PASS (attempt 1)

- **Date:** 2026-10-29 · **Final status:** PASS
- **Skills:** `nestjs-expert`, `tdd`, `api-design-principles`, `error-handling-patterns` (task defaults) · **Effort:** `grok-4.7-xhigh` (concurrency + authorization surface)
- **Orca:** task `task_4a9fb2d7850b`, dispatch `ctx_8d4f29edce68` (terminal `term_b2121020-…`); released after PASS
- **Attempts:** 1
- **Files changed:** `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts` (+spec) · `bilateral-project-mapping.controller.ts` (+spec) · `automapper.service.spec.ts` (the R-APM-011 AC.5 sequence test, the forward pointer from T-05)
- **Reds at HEAD (observed, without `--silent`):** `create on an inactive row returns the same id and stays inactive`: Expected 11, Received 99 (`> 619 | expect(result.id).toBe(11)`; prettier later moved it to 624, same text) · `PATCH :id/activate returns 200 for CENTER_ADMIN and passes notes`: Expected 200, Received 404 (`> 363`). The worker also observed, as non-mandated reds: absent `outcome` undefined; list without the year `andWhere`; `findActiveByAgreementId` without `reporting_year`; PATCH of DERIVED stored `AI_SUGGESTED`; prior-year `findById` resolved; updated-outcome stayed 201.
- **Falsifier 1 (observed):** the present branch throws `ConflictException` → `● create on an inactive row returns the same id and stays inactive — ConflictException: Active mapping already exists for this contract`. Reverted (`grep ConflictException` on the service → empty).
- **Falsifier 2 (observed, final spec):** `activate` uses `repo.findOne` without the year check → `● activate on a prior-year id returns 404 — Received promise resolved instead of rejected … > 866`. Reverted.
- **Listed tests → titles:** created → `create on an absent row returns outcome created` + `returns 201 when the upsert outcome is created` · inactive row → `create on an inactive row returns the same id and stays inactive` + `returns 200 when the upsert outcome is updated` · retry → `retries once when the first transaction fails with errno 1213` · `PATCH on a DERIVED row forces MANUAL when the project changes` · `activate is idempotent on an already-active row` · `activate on a prior-year id returns 404` (+ findById/update prior-year 404) · `denied role → 403 for activate` (real `RolesGuard` + `Reflector`, user `CONTRIBUTOR`; `CENTER_ADMIN` → 200 on the same app).
- **AC.5 sequence (forward pointer from T-05, closed):** `a row deactivated → Apply leaves it inactive → activate() → the next Apply classifies it normally, never creating a second row`. It uses the real `BilateralProjectMappingService.deactivate()/activate()` on the store the automapper transaction reads (Reviewer B: a genuine transition test, KZ-015).
- **Testing modules:** the real-service specs now provide `ReportingYearResolver` + `ClarisaProjectsService` (`bilateral-project-mapping.service.spec.ts`, the AC.5 module in `automapper.service.spec.ts`). The `useValue` modules were unchanged and are green.
- **Implementer verification:** build exit 0 · eslint 5 files exit 0 · `npm test -- --silent src/domain/entities/bilateral-project-mapping src/domain/entities/bilateral src/domain/tools/clarisa` → 69 suites / 746 tests passed.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** `npm run build` → `BUILD_EXIT:0` · `npx eslint <5 files>` → `ESLINT_EXIT:0` · `npm test -- --silent src/domain/entities/bilateral-project-mapping src/domain/entities/bilateral src/domain/tools/clarisa src/domain/shared/utils src/admin` → `Test Suites: 101 passed, 101 total` / `Tests: 978 passed, 978 total` · targeted titles (denied role, inactive-row upsert, prior-year 404, AC.5 sequence, retry) → `5 passed` · `@Patch(':id/activate')` + `@ApiOperation` present, class-level `@UseGuards(RolesGuard)` + `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)`.
- **Extra check (Leader, settling Reviewer B advisory 5):** `test/bilateral-primary-contributing-sp.integration-spec.ts` covers the SP chain that calls `findActiveByAgreementId`. It needs `T13_MYSQL_*`, so it was run against the scratch container with a separate database `ari_t13` (created there, disposable): `T13_MYSQL_PASSWORD=<scratch> T13_MYSQL_PORT=3307` → `Tests: 4 failed, 5 passed`. One failure is the suite's own provenance guard (it rejects the ARI_TEST port by design). Three fail with `QueryFailedError: Table 'ari_t13.clarisa_levers' doesn't exist`, which is the harness's schema builder. **Same run with T-06's 5 files swapped back to `HEAD` (then restored, diff re-confirmed +968/−113): identical `4 failed, 5 passed`, same 3× `clarisa_levers` error.** This was not introduced by T-06. The SP-chain integration is a recorded gap (the harness needs its own container / schema build).
- **Reviewer A** (`akili-reviewer`/opus, lens SECURITY/AUTHZ/ownership): **`STATUS: PASS`**. activate inherits the class-level roles (design §9). The test uses the real guard, and removing `@Roles`/`@UseGuards` would turn 403 into 200. `updated_by` comes from `request.user`. The DTO with `forbidNonWhitelisted` rejects extra fields. Prior-year 404 is evidenced. On the absent-branch source question: "conforms to the spec as written" (tasks.md T-06 scope names only the present branch; §6.5 Absent bullet sets no source rule; R-APM-006 presupposes an existing row; HEAD already did `dto.source ?? MANUAL`).
- **Reviewer B** (`akili-reviewer`/opus, lens RELIABILITY/concurrency): **`STATUS: PASS`**. Lock `pessimistic_write` on the current-year row with no `is_active` filter. Retry bounded to one, in a fresh `dataSource.transaction`. Second failure → `sqlErrorsHelper` (1213→409, 1205→503, 1062→400), never a raw 500. External code refreshed only on a project change, null + warn on feed error. Every by-id path goes through `loadCurrentYearRow`.
- **ADVISORY (labelled advisory, not gating):**
  - **RISK, design-level gap (spec tension, presented to the owner at this gate):** a human create on the absent branch, or `PATCH :id` with an unchanged project, can persist `source = AI_AUTO`/`AI_SUGGESTED` (the DTO rejects only DERIVED, P-20). §6.3 treats any non-MANUAL source as automation-owned, so the next Apply overwrites the person's project. Owner options: force MANUAL on every human write, or narrow "automation-owned" to DERIVED.
  - RELIABILITY (DD-10): the year is resolved per attempt in `writeUpsert` and again inside `findProjectById`. A config flip mid-request could mix years between the retry and the external-code lookup. Narrow window.
  - RESILIENCE: `externalCodeFor` (a possible CLARISA HTTP fetch on a cold cache) runs inside the `pessimistic_write` transaction. This widens the lock window toward 1205. Option: compute it before the transaction.
  - KZ-017 test gaps: nothing pins the lock query's `reporting_year` predicate or `setLock('pessimistic_write')`; nothing pins "exactly one retry" (`transaction` called 2×); the retry test never exercises "the retry then takes the update branch".
  - Pre-existing: `sql-errors.const.ts:18` 1062 message typo ("his record already exists"), now reachable on a second upsert failure.
  - READABILITY: the service spec reaches `activate` through an `as unknown as { activate }` cast left over from the red phase.
- **spawns:** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer A opus 17 calls, 94 178 tokens, ended complete · Reviewer B opus 11 calls, 71 077 tokens, ended complete
- **Not Done / Assumptions (verbatim, assumptions only, nothing owed):** "A second retryable failure is `HttpException` via `sqlErrorsHelper` (1213 → 409) and that helper's message, not the driver text." · "`clarisa_external_code` comes from `findProjectById` on the year cache, then `normalizeExternalCode`. Missing project or a thrown feed error stores `null`; only the throw warns." · "An absent insert still stores a submitted non-DERIVED source. `MANUAL` is forced on the present branch (including a same-project resubmit, FB-1) and on PATCH only when `clarisa_project_id` changes."
- **Requirements covered:** R-APM-004 AC.2 (list) + by-id 404s · R-APM-006 AC.1–4 · R-APM-011 AC.1–5 (AC.5 jointly with T-05's suite) and the scenario ("AND IT MUST only by the explicit action")
- **Running totals vs budget (design §12):** tasks 6/10 · LOC +3,284/−1,139 (budget ~1,500; overrun accepted by the owner 2026-10-29) · review rounds 11/~14
- **Final verification:** VERIFIED (above)

## Spec amendment: T-06 gate (2026-10-29)

- **Tension (from T-06 Reviewer A advisory):** design §6.3 makes any non-MANUAL source automation-owned, while the create DTO accepts `AI_AUTO`/`AI_SUGGESTED` (P-20) and T-06 kept `dto.source ?? MANUAL` on the absent branch. So a person's create could be overwritten by the next Apply.
- **Owner decision:** "Force MANUAL on every human write (Recommended)".
- **Execute-time spec edits (recorded at the moment made):** `requirements.md` R-APM-006 gains **AC.5** (every human write stores MANUAL; a submitted `source` is ignored). `design.md` §6.5 *Absent* bullet and *Ownership on human edit* bullet are amended. `tasks.md` gains **T-06b** (S, deps T-06) and a §4 coverage row. These broaden an approved rule at the owner's explicit direction, not by Leader inference. The next Reviewer brief carries "conformance to `design.md#6.5` and R-APM-006 AC.5 as amended 2026-10-29".
- **Correction sweep:** grep for the superseded rule across the spec folder. The only remaining hits are the present-branch wording (still true), the T-06 execution record (history, left unchanged) and the T-06b falsifier text (intended).

### T-06b — Force MANUAL on every human write (owner amendment 2026-10-29) — PASS (attempt 1)

- **Date:** 2026-10-29 · **Final status:** PASS
- **Skills:** `nestjs-expert`, `tdd` · **Effort:** `grok-4.7-medium` (S, well specified)
- **Orca:** task `task_57bbf90fbc00`, dispatch `ctx_7b031e27030e` (ran in parallel with T-08, cross-package); released after PASS
- **Files changed:** `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts` (+spec)
- **Reds at HEAD (observed, without `--silent`):** `create on an absent row with source AI_AUTO stores MANUAL (R-APM-006 AC.5)` :610, Expected "MANUAL" / Received "AI_AUTO" · `PATCH a MANUAL row with an unchanged project and source AI_SUGGESTED stays MANUAL (R-APM-006 AC.5)` :819, Received "AI_SUGGESTED" · `PATCH a DERIVED row with an unchanged project stores MANUAL (R-APM-006 AC.5)` :845, Received "AI_AUTO".
- **Falsifier (observed):** restored `source: dto.source ?? MappingSourceEnum.MANUAL` on the absent insert → :610 red again. Reverted.
- **T-06 test changed:** `create on an absent row returns outcome created` now expects MANUAL stored while the DTO still sends `AI_SUGGESTED`. The old assertion encoded the rule AC.5 replaced.
- **Implementer verification:** build exit 0 · eslint 2 files exit 0 · 21 suites / 409 tests passed.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** run after the parallel client worker reported (root guide: no measurement beside an active worker). `npm run build` → `BUILD_EXIT:0` · `npx eslint <2 files>` → `ESLINT_EXIT:0` · `npm test -- --silent src/domain/entities/bilateral-project-mapping src/domain/entities/bilateral src/domain/tools/clarisa` → `Test Suites: 69 passed, 69 total` / `Tests: 749 passed, 749 total` · `-t "R-APM-006 AC.5"` → 3 passed. The Reviewer was spawned before the re-run (it judged the diff alone) and was told the re-run was pending. Closure waited for it.
- **Reviewer** (`akili-reviewer`/opus, lens checklist; named check "conformance to `design.md#6.5` and R-APM-006 AC.5 as amended 2026-10-29"): **`STATUS: PASS`**. The absent insert, the present branch and `update()` all set MANUAL unconditionally. A PATCH changing only notes/confidence also becomes MANUAL, which the amended text covers ("every `PATCH :id`, project changed or not"). No DTO change. The Disqualifier is met. The changed T-06 test is justified.
- **ADVISORY:** no test pins a notes-only PATCH → MANUAL. `activate()`/`deactivate()` keep the existing source, which is correct and consistent with R-APM-011 AC.5; §6.5 could say so explicitly. Two different citations (FB-1 vs R-APM-006 AC.5) are used for the same rule.
- **spawns:** Implementer Cursor/grok-4.7-medium: not reported by host, ended complete · Reviewer akili-reviewer/opus 8 calls, 62 113 tokens, ended complete
- **Requirements covered:** R-APM-006 AC.5 (amended 2026-10-29)
- **Running totals vs budget (design §12):** tasks 7/11 (T-06b added) · LOC +3,364/−1,144 (overrun accepted 2026-10-29) · review rounds 12/~14
- **Final verification:** VERIFIED (above)

### T-08 — Client contract: API methods, service, interfaces, fixture — PASS (attempt 1), code held uncommitted for the owner's visual check

- **Date:** 2026-10-29 · **Final status:** PASS
- **Skills:** `angular-developer` (task default) · **Effort:** `grok-4.7-high`
- **Orca:** task `task_cbad4149bef9`, dispatch `ctx_a7a73f4df978` (ran in parallel with T-06b, cross-package); released after PASS
- **Files changed:** `shared/interfaces/bilateral/bilateral-project-mapping.interface.ts` · `shared/services/api.service.ts` · `shared/services/bilateral-mapping.service.ts` (+spec) · `testing/bilateral-project-mapping.fixture.ts` · minimal compile edits: `bilateral-mapping.component.ts` (+spec), `bilateral-mapping-coverage.component.ts` (+spec), `automapper-dialog.component.{ts,html}` (+spec)
- **Red at HEAD (observed):** `BilateralMappingService › applyAutoMap › apply body is {}`: Expected `{}`, Received `{ "phase": 2026 }` (`> 402`).
- **Falsifier 1 (observed, final spec):** `applyAutoMap` sends `{ phase: 2026 }` → same title, `> 486`, same red. Reverted.
- **Falsifier 2 (observed, compile gate):** a probe literal with `supersede: []` typed `AutomapperPreviewResponse` → `tsc -p tsconfig.app.json`: `error TS2353: Object literal may only specify known properties, and 'supersede' does not exist in type 'AutomapperPreviewResponse'`, exit 2. Reverted → exit 0.
- **Consumer grep:** `rg -n 'AutomapperPreviewResponse|AutomapperApplyResponse|AutomapperCoverage|supersede|GET_BilateralMappingCoverage|POST_Automapper' client/research-indicators/src` → 73 lines / 18 files: 53 contract hits in 8 files, plus 20 unrelated English "supersede/superseded" (results-center, innovation-use, pi-delegates, pool-funding, impersonation, user-search). The full list is in the worker evidence.
- **Minimal compile edits (T-09/T-10 files):** `list()` and `getCoverage()` no longer pass a phase. The dialog's `previewAutoMap()`/`applyAutoMap()` take no phase. The dialog HTML drops the Superseded apply tile, the Supersede tab and its panel, because they read fields that were removed. Apply is disabled on `counts.toCreate === 0`. The `phase` signal/inputs are kept for the existing copy (T-09). `GET_ClarisaProjectPhases` is untouched (T-10).
- **Evidence re-run (Leader inline, non-author), VERIFIED:** run after both parallel workers reported.
  - `npx tsc -p tsconfig.app.json --noEmit` → `TSC_APP_EXIT:0`, 0 errors.
  - `npx tsc -p tsconfig.spec.json --noEmit` → exit 2, **945 errors, all pre-existing**. HEAD = 945, measured by swapping the 12 T-08 files back to `HEAD` and then restoring them; per-file counts identical; `TS1005` = 0 (no parse abort). T-08 adds no spec type error. **The literal "both tsc gates green" is unattainable on this repo** (the root guide's K-004 note records the same 945).
  - `npm run lint -- --quiet` → `LINT_EXIT:0`, "All files pass linting."
  - `npx jest --coverage=false --silent src/app/shared/services <bilateral-mapping dir>` → `Test Suites: 123 passed, 123 total` / `Tests: 2157 passed, 2157 total`.
  - `✓ apply body is {}`.
  - A path-filtered run with coverage on exits 1 only because of the global coverage floors (K-020), not because of tests.
- **Reviewer** (`akili-reviewer`/opus, lens checklist): **`STATUS: PASS`**. "T-08 matches its task text, R-APM-003 AC.3 and the committed server contract." Field-by-field mirror of `automapper-run.dto.ts`: preview `reporting_year`/`toUpdate`/`inactive`/`refreshed`, no `supersede`; apply counts `updated`/`inactive`, no `superseded`; coverage `reporting_year`/`inactive`; create `outcome`; activate `{}` is valid (`body?` optional). No `phase` on any mapping call. The Pending list is unchanged and pinned by `pending list excludes toUpdate and inactive rows`. The Supersede removal is a minimal compile edit, not T-09 scope creep. Ruling on the tsc Done item: record it as above, never as plain green.
- **ADVISORY (labelled advisory, not gating):**
  - **Forward pointer → T-09 (carry-in, must be in the T-09 brief):** the dialog's Apply button is disabled when `preview.counts.toCreate === 0`. A preview with only `toUpdate` rows (row 3) or row-6 refreshes therefore cannot be applied from STAR. Before T-08, `supersede > 0` enabled it, and `toUpdate` took over that role. Reachable. T-09 must enable Apply on `toCreate + toUpdate` (+ refreshing `inactive` per §6.3).
  - Until T-09, the dialog shows no tab, tile or count for `toUpdate`/`inactive`.
  - READABILITY: `POST_AutomapperPreview`/`POST_AutomapperApply` take `body: object = {}`. Type it `Record<string, never>` (or drop it) so a future `{ phase }` fails at compile time. A stale comment about "optional notes" sits on activate.
  - RELIABILITY: two spec mocks (`apply body is {}`, getCoverage) omit `reporting_year`. They pass only because `jest.Mock` is untyped.
- **spawns:** Implementer Cursor/grok-4.7-high: not reported by host, ended complete · Reviewer akili-reviewer/opus 13 calls, 85 433 tokens, ended complete
- **Not Done / Assumptions (verbatim, translated from the worker; assumptions only, nothing owed):** "`tsc -p tsconfig.spec.json` is not exit 0. The one error in a file this task touched is the HEAD `Select` value-as-type. A whole-tree before/after stash was not run because a server worker is editing `server/` in this checkout." (The Leader has since run the before/after: 945 = 945.) · "`create` does not rewrite `outcome`; it returns `res.data` typed as `BilateralMappingUpsertResult`." · "Activate sends `{}`, not `{ notes }`, matching today's deactivate method." · "The dialog no longer renders the supersede bucket. `toUpdate`/`inactive` are on the type and are not drawn (T-09)."
- **Commit hold (owner rule: no commit of a visible UI change before the owner sees it):** T-08 changes the dialog template (tabs/tiles removed, Apply-disable rule). The 12 client files stay **uncommitted** and will be committed together with T-09 after the owner's visual check. This entry and the checkbox are committed now, as evidence-before-checkbox.
- **Requirements covered:** R-APM-003 AC.3 · R-APM-006 client side (create `outcome`) · R-APM-011 client API (`PATCH_ActivateBilateralMapping`)
- **Running totals vs budget (design §12):** tasks 8/11 · LOC +3,601/−1,275 (overrun accepted 2026-10-29) · review rounds 13/~14
- **Final verification:** VERIFIED (above, with the tsc-spec caveat recorded)

### T-10 — Client env-variable modal: remove the CLARISA-phase selector — PASS (attempt 1), code held uncommitted for the owner's visual check

- **Date:** 2026-10-29 · **Final status:** PASS
- **Skills:** `angular-developer` · **Effort:** `grok-4.7-medium`
- **Orca:** task `task_ec9cb828b6e8`, dispatch `ctx_d838dc034794` (ran in parallel with T-07, cross-package); released after PASS
- **Files changed:** `edit-environment-variable-modal.component.{ts,html,spec.ts}` · `shared/services/api.service.ts` (`GET_ClarisaProjectPhases` + its import removed) · `shared/interfaces/bilateral/bilateral-project-mapping.interface.ts` (`ClarisaProjectPhaseCount`, `ClarisaProjectPhasesResponse` removed; no other importer)
- **Red run:** none expected at HEAD (the selector was keyed to the old key, so `ARI_PRMS_SYNC` was already a plain input); the proof is the falsifier.
- **Falsifier (observed, no `--silent`):** `isClarisaPhaseKey` re-introduced keyed to `ARI_PRMS_SYNC` → `renders a plain value input when editing ARI_PRMS_SYNC`, `spec.ts:171 expect(simpleValueInputExists()).toBe(true)`, Expected true, Received false. Reverted.
- **Consumer grep:** `grep -rnE "clarisa-phase-select|CLARISA_PHASE_CONFIG_KEY|GET_ClarisaProjectPhases|ClarisaProjectPhase" client/research-indicators/src` → 0 (worker and Leader).
- **Evidence re-run (Leader inline, non-author, after both workers reported), VERIFIED:** `tsc -p tsconfig.app.json` exit 0 · `tsc -p tsconfig.spec.json` 945 errors (= HEAD), 0 in the modal files · `npm run lint -- --quiet` "All files pass linting." · `npx jest --silent <modal dir> src/app/shared/services` → 121 suites / 2063 tests passed · grep 0.
- **Reviewer** (`akili-reviewer`/opus, lens checklist): **`STATUS: PASS`**. "T-10 removes the CLARISA-phase selector completely, with no dead code; T-08's hunks are unchanged; the new spec asserts on `ARI_PRMS_SYNC` itself, not only on the old key, so the Disqualifier is met."
- **ADVISORY (not gating, not reworked):**
  - RELIABILITY: the "no phases request" cases (`spec.ts:185`, `:190-199`) cannot go red as written, because the component no longer injects `ApiService`, so the Proxy records nothing. The removal is proven by the code and the grep = 0. A stronger form would use `HttpTestingController.expectNone(/projects\/phases/)`.
  - READABILITY: `phaseRequests()` (`spec.ts:159-161`) has a dead second condition.
- **spawns:** Implementer Cursor/grok-4.7-medium: not reported by host, ended complete · Reviewer akili-reviewer/opus 9 calls, 60 012 tokens, ended complete
- **Commit hold:** the modal is a visible UI change and `api.service.ts`/the interface file also carry T-08's held hunks, so the T-10 files stay uncommitted and are committed with T-08/T-09 after the owner's visual check.
- **Requirements covered:** R-APM-010 AC.1 · R-APM-008 AC.2
- **Final verification:** VERIFIED (tsc-spec caveat as in T-08)

### T-07 — `/admin` SSR page: Activate, Year column, upsert outcome, copy — PASS (attempt 1), code held uncommitted for the owner's manual check

- **Date:** 2026-10-29 · **Final status:** PASS (owner manual check pending)
- **Skills:** `react-doctor` · **Effort:** `grok-4.7-medium`
- **Orca:** task `task_640eb989a6d5`, dispatch `ctx_e430519ef65d` (parallel with T-10, cross-package); advisory follow-up on the same terminal: task `task_bea1b00a1156`, dispatch `ctx_196de6fddb34`; released after PASS
- **Files changed:** `server/researchindicators/src/admin/client/pages/BilateralProjectMappings.tsx` (+75/−13). `admin.service.ts` unchanged: `list()` returns whole entities, so `reporting_year` already reaches the page.
- **Change:** `reporting_year` on the row type and a **Year** column (empty-state `colSpan` 7 → 8) · `activateRow` → `PATCH /api/bilateral-project-mappings/:id/activate` with confirmation, body `{ notes }`, error surfaced, refresh · inactive rows show **Activate** in place of the disabled "Already inactive" control · create shows `outcome` from `body.data` ("Mapping created (id N)." / "Existing mapping updated (id N).") in an `alert alert-success` · no "re-create" wording.
- **Tests:** no automated coverage. `rg -n BilateralProjectMappings src/admin --glob '*.spec.*'` → only `admin.service.spec.ts` and `admin.controller.spec.ts` (the list wrapper); no spec imports the page.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** `npm run build` exit 0 (nest + vite) · `npx eslint <page>` exit 0 · `npm test -- --silent src/admin` 3 suites / 11 tests passed (they cover none of this diff) · `grep -ciE "re-create|recreate" <page>` → 0.
- **Reviewer** (`akili-reviewer`/opus, lens checklist): **`STATUS: PASS`**. "All four scope bullets are present, the activate call matches the deactivate call field for field, and `outcome` is read from the correct envelope level." Body `{ notes }` is accepted by `BilateralProjectMappingNotesDto` under `forbidNonWhitelisted`.
- **ADVISORY → fixed (same worker):** the edit-form hint "An inactive mapping is reactivated." could never show next to an inactive row and read as if editing reactivates. Now: "Contract is immutable. To change an inactive mapping, activate it first from the row Activate button." eslint 0, build 0, grep 0 (worker); Leader grep confirms `:596`.
- **spawns:** Implementer Cursor/grok-4.7-medium ×2 dispatches: not reported by host, ended complete · Reviewer akili-reviewer/opus 9 calls, 67 952 tokens, ended complete
- **Owner manual check (Done item, OPEN):** `/admin/bilateral-project-mappings` → filter "Inactive only" → an Inactive row shows **Activate** → click → confirm → after reload the row is Active. New mapping on a contract that already has a row this year → "Existing mapping updated (id …)". The Year column shows `reporting_year`. A page with no inactive row is not evidence.
- **Commit hold:** visible UI change → the page stays uncommitted until the owner's check.
- **Requirements covered:** R-APM-011 (SSR clause) · R-APM-006 (outcome surfaced) · R-APM-007 (SSR Year column)
- **Final verification:** VERIFIED (automated part); manual part pending

### T-09 — Client UI: year from coverage, Year column, Activate, readiness note, dialog — PASS (attempt 1), code held uncommitted for the owner's visual check

- **Date:** 2026-10-29 · **Final status:** PASS (owner visual check pending)
- **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `grok-4.7-high`
- **Orca:** task `task_f37a07b21f04`, dispatch `ctx_12cb19580b3e`; advisory test follow-up on the same terminal: task `task_292e5ed4e2e5`, dispatch `ctx_b454d1750af9`; released after PASS
- **Files changed (T-09's own, on top of T-08/T-10):** `bilateral-mapping.component.{ts,html,spec.ts}` · `bilateral-mapping-coverage.component.{ts,html,scss,spec.ts}` · `automapper-dialog.component.{ts,html,spec.ts}`
- **Change:** `reportingYear = signal<number | null>(null)`, set only from the coverage strip's new `reportingYear` output; header badge and help text render the year only when known · Year column after *Last Updated*, sortable · **Activate** in the deactivate slot of inactive rows, with confirmation; reloads list and coverage · created/updated toast from `outcome` · coverage: `inactive` figure and the 5 exclusive R-APM-008 states · dialog: year line from `reporting_year`, *To Update* and *Inactive* tabs, Updated/Inactive apply counts, no supersede · **carry-in:** `canApply = toCreate + toUpdate + inactive.filter(refreshed).length > 0`.
- **Red at baseline (observed, no `--silent`):** `R-APM-007 — header and help show the year emitted after coverage loads, never a literal` → Expected `"2027"`, Received `undefined` (`> 1809`).
- **Falsifier 1 (observed):** header badge hard-coded `2026` → same title, Expected `"2027"`, Received `"2026"` (`> 1894`). Reverted.
- **Falsifier 2 (observed):** `reachable === 0` branch removed → `R-APM-008 — reachable = 0 says CLARISA has no eligible projects for the loaded year`, Expected "CLARISA has no eligible projects for 2027 yet", Received "No mappings for 2027 yet — run Auto-map" (`> 240`). Reverted.
- **Falsifier 3 (follow-up, observed):** `refreshed` filter dropped from `canApply` → `disables Apply when the only item is an inactive row with refreshed=false`, `automapper-dialog.component.spec.ts:549` Expected true, Received false. Reverted.
- **R-APM-008 state → test:** loading / CLARISA error / `reachable = 0` / `reachable > 0, mapped = 0` / normal — one `R-APM-008 — …` case each; every case holds `getCoverage` pending, asserts the state absent, then resolves (KZ-015).
- **Literal-year grep:** `grep -nE "20[0-9]{2}"` over the three templates → 0. The doc comment at `bilateral-mapping-coverage.component.ts:52` now reads `{year}`.
- **Evidence re-run (Leader inline, non-author), VERIFIED:** `tsc -p tsconfig.app.json` exit 0 · `tsc -p tsconfig.spec.json` 945 (= HEAD; 1 pre-existing `TS2749` on `Select` in the page spec, present at HEAD) · `npm run lint -- --quiet` "All files pass linting." · jest (mapping folder + `shared/services` + env modal) 124 suites / 2185 tests passed; after the follow-up, mapping folder 3 suites / 125 tests passed · literal-year grep 0.
- **Reviewer** (`akili-reviewer`/opus, lens full): **`STATUS: PASS`**. "Every item in scope is present, nothing is out of scope, and I found no blocking issue." `canApply` matches the carry-in exactly; the 5 states are exclusive and use the requirement's wording verbatim; tokens only (3 SCSS lines on `var(--ac-grey-500)`).
- **ADVISORY:**
  - Tests → **fixed** (same worker): refreshed / non-refreshed `canApply` cases, coverage reload after Activate, Activate error toast; comment year → `{year}`.
  - **RELIABILITY → owner question (open):** when every eligible contract is deactivated (`reachable > 0`, `mapped = 0`, `inactive > 0`), the strip says "No mappings for {year} yet — run Auto-map", but Auto-map never reactivates, and the Inactive card is hidden in that state. This follows R-APM-008's table literally. Raised at the visual check.
- **spawns:** Implementer Cursor/grok-4.7-high ×2 dispatches: not reported by host, ended complete · Reviewer akili-reviewer/opus 10 calls, 78 742 tokens, ended complete
- **Owner visual check (Done item, OPEN):** column fit with the Year column, the four-card grid at `sm`, Activate icon position, readiness note states, dialog tabs (jsdom cannot measure layout).
- **Commit hold:** T-08 + T-09 + T-10 client files stay uncommitted until the owner's visual check.
- **Requirements covered:** R-APM-006 (toast) · R-APM-007 AC.1, AC.2 · R-APM-008 AC.1 · R-APM-009 AC.2 · R-APM-011 (client Activate)
- **Running totals vs budget (design §12):** tasks 11/11 code-complete (T-07/T-09 wait on the owner check) · review rounds 16/~14 (over, reported per the owner's standing decision)
- **Final verification:** VERIFIED (automated part; tsc-spec caveat as in T-08); visual part pending

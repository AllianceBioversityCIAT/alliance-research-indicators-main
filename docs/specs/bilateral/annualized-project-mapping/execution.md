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
- **spawns:** Implementer Cursor/grok-4.7-high: not reported by host, ended complete · Reviewer akili-reviewer/opus: not reported by host at the time of writing, ended complete
- **Not Done / Assumptions (verbatim from the worker):** "None owed. Judgment: `CHAR_LENGTH(norm) = 4` is how "exactly 4 ASCII digits" is true on MySQL 8.0.46, because `$` matches before a trailing newline. The warning gate in TS (`\t\r\n` → space, ASCII-space trim, `[0-9]{4}`) only chooses the existing log line. The returned number is the SQL column (unit case: column `2031` with raw `not-a-year` returns 2031)."
- **Requirements covered:** R-APM-002 scenario: THEN (resolver), BUT not wait for a TTL · NFR-APM-002
- **Running totals vs budget (design §12):** tasks 2/10 · LOC +632/−63 (~1,500) · review rounds 3/~14
- **Final verification:** VERIFIED (above)

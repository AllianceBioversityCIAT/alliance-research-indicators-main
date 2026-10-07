# Execution log — Innovation Development / Excel export section

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/innovation-dev/excel-export/` |
| Approval Mode | gated (inherited from `requirements.md`) |
| Branch | `AC-1681-Include-the-Innovation-use-data-in-the-excel-export` |
| Started | 2026-10-06 |
| Leader | Claude Code session, `claude-opus-5-5` (T1) |
| Implementer | Cursor CLI, Grok (`grok-4.7-*`), via Orca orchestration — standing user routing ("Grok implements, Claude reviews") |
| Reviewer | `akili-reviewer` wrapper (Claude `opus`, read-only `Read/Grep/Glob`) — author ≠ auditor on both axes |
| Budget (design §15) | 5 tasks · ~2,300 LOC · ~12 review rounds |

### Run notes (Step 0)

- **Dev DB scope, restated by the user before the run (2026-10-06).** The June Dev-only Innovation Development work (`5b426acf`) is treated as non-existent (HITL ruling 2). The user clarified that Dev will be **restored from a snapshot on Thursday**, not reverted migration by migration. Consequence for G-IDX-2 (T-05): a restore removes both the June view and this spec's migration record, so the next `dev` deploy (`migration:execute`) re-creates `report_innovation_dev`. The rollout rule becomes "restore + a `dev` redeploy afterwards" instead of the `1781300000000.down()` rule. To be applied at T-05.
- **Constitution read.** `docs/ux-ui/design.md` was not re-read: no task in this spec touches a UI surface (design §6 "Frontend impact: None"). Every brief names it `none`.
- **Skills.** The tasks' skills (`nestjs-expert`, `tdd`, `systematic-debugging`) are Claude Code skills; a Cursor worker cannot load them. Each brief carries their discipline in prose (precedent).
- **Environment pre-check (Step 2.1).** Scratch MySQL container `research_indicators_server_test_mysql` is up (disposable, `ARI_TEST_MYSQL_*`). Dev is reachable only for the read-only P-12 / P-14 probes named by the tasks.
- **Forward pointer from the precedent (archive `innovation-use--excel-export` T-01 FAIL B-1).** `clarisa_innovation_readiness_levels.level` is nullable, so `CONCAT('Level ', cirl.level, …)` behind an accepted id must use the `Unknown (id n)` fallback when the catalog row is missing **or** its `level` is NULL. Carried into the T-01 brief for col 86.

---

## Task Execution History

### T-01 — Settle P-12, then author the `report_innovation_dev` view migration

- **Status:** PASS (attempt 1).
- **Date:** 2026-10-06
- **Effort:** xhigh — correctness-critical SQL transcription (D1).
- **Review mode:** parallel lens reviewers (task touches migrations): A = reliability + risk, B = readability + resilience, both with baseline spec conformance.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-xhigh`, Orca `run_ae4bc0c80537` / `task_4e51e4f90a53` / `ctx_fc5e703d6b13` (retained until PASS). Brief: `T-01-brief.md` (session scratchpad).
- **Files changed:** `server/researchindicators/src/db/migrations/1791700000000-CreateReportInnovationDevView.ts` (new, 460 lines) · `server/researchindicators/src/db/migration-specs/1791700000000-CreateReportInnovationDevView.spec.ts` (new, 239 lines).
- **P-12 (settled — VERIFIED).** Read-only on Dev (`ARI_MYSQL_*`, node mysql2, `SELECT` only):
  - `SELECT COUNT(*) AS c FROM result_actors ra JOIN results r ON r.result_id = ra.result_id WHERE r.indicator_id = 2 AND r.is_active AND ra.is_active AND ra.actor_role_id <> 1` → `[{"c":0}]`
  - `SELECT COUNT(*) AS c FROM result_institution_types rit JOIN results r ON r.result_id = rit.result_id WHERE r.indicator_id = 2 AND r.is_active AND rit.is_active AND rit.institution_type_role_id <> 1` → `[{"c":0}]`
- **Implementer verification:** migration spec 6/6; eslint exit 0; prettier clean. Falsifier reds (assertion level, each reverted): (d) actors lateral guard removed → `expect(received).toEqual(expected)` Expected `[]` Received `[0]` at spec:223; (b) top-level `ORDER BY root.result_id` → `expect(received).not.toMatch` `/\b(?:GROUP\s+BY|DISTINCT|HAVING|ORDER\s+BY|LIMIT|UNION)\b/i`; (a) `/* :fake */` → `expect(received).toBeNull()` Received `[":fake"]`. Scratch: applied; `SELECT * FROM report_innovation_dev LIMIT 1` → 0 rows (scratch `results` empty), 33 columns; revert dropped the view (head back to `1791600000000`); re-apply OK.
- **Not Done / Assumptions (verbatim from the report):** "literal B-1 cannot read 0 while design §3.1's GROUP_CONCAT ORDER BY stays in VIEW_DEFINITION. The same LIKE already reads 1 on report_innovation_use. Spec (b) strips lateral bodies and is green; it cannot see stored VIEW_DEFINITION. The SQL-text spec cannot prove cell values (KZ-001). Empty scratch results means LIMIT 1 did not exercise a row." — Leader reading: no blocker, no owed item; a spec tension (below) plus assumptions. No continuation.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** `npx jest <spec> --silent` → 6 passed · `npx eslint <both>` exit 0 · `npx prettier --check <both>` clean · `typeorm migration:show` on `orm.test.config.ts` (ANSI stripped, no error lines) → 0 `[ ]`, last `[X] 423 CreateReportInnovationDevView1791700000000` · `information_schema.COLUMNS` → 33, `result_id` + the 32 `innovation_dev_*` aliases in §3.2 order · stored `VIEW_DEFINITION`: `LIKE '%order by%'` = 1, `LOCATE('order by `root`.`result_id`')` = 0, tail ends `where ((root.is_active = true) and (root.is_snapshot = false))` — no top-level ORDER BY.
- **Reviewer A (reliability + risk): PASS** — every green-check clause of `1758125999162` traced to its cell/slot; `applies` COALESCE-wrapped whole; NULL-safe Yes/No; L7 on `cirl.level`; col 85 `> 0`; org CASE in the function's branch order with the unfiltered "has children" test; NULL `is_organization_known` → not-known; `IS NOT NULL` for actor 5 / org 78; the precedent NULL-`level` trap closed on col 86 and every catalog cell/slot via `Unknown (id n)`; no row multiplication (PK joins, aggregate-only laterals); enums resolve to the function's literals.
- **Reviewer B (readability + resilience): PASS** — aliases match §3.2 in order and name; mandatory/applies pairs match; line formats match §3.4; `down()` exact and idempotent; header names the T-02 fixture path.
- **ADVISORY (recorded, not gating):**
  - (B) Spec (d) uses `includes('root.indicator_id = 2')`: passes with an `OR`-joined guard, a guard in the inner SELECT list, or `= 20`. Suggest `/\bWHERE\s+root\.indicator_id\s*=\s*2\s+AND\b/` plus no `\bOR\b` in the lateral WHERE.
  - (B) Spec (e) prefix check is tautological; it does not prove the select list is exactly `result_id` + 32 aliases, nor their order. Suggest extracting top-level aliases after `stripLaterals` and `toEqual`.
  - (A, B) Spec (b) does not reject a top-level aggregate or a SELECT-list subquery, which NFR-IDX-001 *BUT* / design §3.1 forbid and the tasks.md coverage row 322 assigns to (b). No violation today.
  - (A) A blank (`''`/whitespace) catalog name behind an accepted mandatory id (82, 83, 88, 95) yields `''` → `NP`. Unreachable through app flows; code follows design §3.1's literal `COALESCE(name, …)`.
  - (A) `U` = `anticipated_users_id = 2`, the function triggers on any value other than 1/NULL. Equivalent while the catalog has only 1 and 2 (design-mandated §3.2).
  - (B) `IFNULL(CONCAT_WS(…), '')` in the linked-tools lateral is dead code.
  - (B) A tool-function line could render a bare `• ` if both `tf.name` and the id are NULL — T-02 to confirm or rule out.
  - (A) No row was ever evaluated (empty scratch `results`); D1 stays uncovered until T-02.
- **Forward pointers → T-02:** blank-name catalog row (A); bare `• ` tool-function line (B); D1 coverage depends entirely on the parity fixture — do not slim it.
- **Spec tension (one-line amendment proposed at the continue gate):** tasks.md T-01 step 4 / Disqualifier require B-1 (`VIEW_DEFINITION LIKE '%order by%'`) to read `0`, but design §3.1 row 4 mandates `GROUP_CONCAT(… ORDER BY <child pk> …)` inside the laterals, so no conforming view can read `0`. Both Reviewers concur it is a falsifier-wording defect. Proposed: B-1 reads "the stored `VIEW_DEFINITION` has no top-level `ORDER BY` — `LOCATE('order by `root`.`result_id`', VIEW_DEFINITION) = 0` and the definition ends at the root `WHERE`". Measured: `0`, and it does.
- **spawns:** implementer (Cursor grok-4.7-xhigh) not reported by host, ended complete · reviewer A 15 calls, 107,802 tokens, ended complete · reviewer B 11 calls, 77,339 tokens, ended complete.

#### T-01 closing summary

- **Final status:** PASS, attempt 1 of 3 (0 FAIL, 0 checkpoints, 0 continuations, 0 runtime events).
- **Review rounds used:** 2 verdicts. Budget: ~12 across the spec.
- **Requirements covered:** R-IDX-001…005 at text level, NFR-IDX-001 *BUT* (text), NFR-IDX-004, the exclusions. Behavioural proof is T-02 (KZ-001).
- **Premises settled:** P-12 VERIFIED (0 / 0 on Dev).
- **Skills deviation:** `tdd`, `nestjs-expert` could not load on the Cursor host; the brief carried their discipline in prose.
- **Constitution impact:** none.
- **Decisions made:** B-1 amendment **approved by the user at the T-01 continue gate (2026-10-06, answer "1")**. Execute-time spec edit: `tasks.md` baseline table row B-1 (now `LOCATE('order by `root`.`result_id`', VIEW_DEFINITION) > 0`), T-01 step 4 and Disqualifier (B-1 measures the top-level order only). No requirement's meaning changed. Re-measured after the edit: `0`. Carry to the T-02 Reviewer as a named conformance check (`tasks.md` B-1 as amended 2026-10-06).
- **Worker:** `ctx_fc5e703d6b13` released after PASS.

### T-02 — Fixture suite: green-check parity, one row per result, EXPLAIN gate

- **Status:** `[~]` PAUSED (spec paused by the user, 2026-10-06) — not reviewed, not committed.
- **Date:** 2026-10-06
- **Effort:** xhigh.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-xhigh`, Orca `run_ae4bc0c80537` / `task_52d3d53dc47b` / `ctx_e7ba9d89e47c` (fresh worker). Brief: `T-02-brief.md` (session scratchpad). Full report: `/tmp/t02-innovation-dev-t02-report.md`.
- **Files changed (uncommitted, left in the working tree):** `server/researchindicators/test/fixtures/innovation-dev/report-innovation-dev-view.fixture-spec.ts` (new, 2,073 lines).
- **Implementer verification:** 56/56; eslint and prettier clean; `git diff -- src` empty; scratch head `CreateReportInnovationDevView1791700000000`. Falsifier reds (scratch `CREATE OR REPLACE`, then restored, suite green again): (a) variety NULL expected `Not applicable` received `Not provided`; (b) `cirl.id >= 7` → level 6 knowledge sharing expected `Not applicable` received `Not provided`; (c) knowledge sharing NULL expected `Not provided` received `No`; (d) org 78 empty expected `• Other ()` received `• Other (Not provided)`; (e) count 0 expected `Not provided` received `0`; (f) derived `GROUP BY` actors lateral → `Expected substring: "invalidate on row from root"` received `-> Materialize  (cost=0..0 rows=0)`.
- **EXPLAIN:** 210 results, 210 rows per child table at plan time. Phase 3: 4 × `Materialize (invalidate on row from root)` over `Index lookup … (result_id=root.result_id)`; root `Table scan on root` (reading). Phase 2 B-7: 60 top-level rows, 28 of them `<derivedN>` (pre-existing), `riu`/`ciul` still top-level. Timing (reading): 45.4 / 43.5 / 44.8 ms, median 44.8, spread 1.9.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** `npm run test:fixtures -- report-innovation-dev-view` → 56 passed · eslint exit 0 · prettier clean · `git status` shows only the new fixture folder.
- **Spec tensions raised at the gate, unresolved (spec paused before the answer):**
  1. A blank (`''`) catalog name behind an accepted id (nature, type, anticipated users, dissemination) renders `Not provided` while `innovation_dev_validation` is TRUE — contradicts requirements §3 ("never NP"). The fixture currently pins it as a break (`expectBreak`). Options offered: (a, recommended) harden the T-01 view so blank names fall to `Unknown (id n)` (T-01 rework, migration unpushed); (b) document it as a third divergence in NFR-IDX-002.
  2. T-02 step 6(b) "no `<derived…>` row at `id = 1`" cannot hold: the unmodified Phase 2 already has 28 derived tables of 60. Proposed amendment: "no view that is merged today becomes un-merged; the count stays 60" (also NFR-IDX-001 (b) wording).
- **Pause record:** the user stopped this spec to first specify an Excel-wide change — the workbook layout (`report_workbook_column_group`, `report_workbook_sheet`) moves from the DB to server code, and group-band merges are computed from tagged column objects in `star-results-metadata.columns.ts`. That change reshapes T-03 (layout migration) and part of T-04; both must be re-planned against it before this spec resumes. Worker `ctx_e7ba9d89e47c` released.
- **spawns:** implementer (Cursor grok-4.7-xhigh) not reported by host, ended complete.

---

## Pivot Record: T-02 gate — resume after the Excel-wide layout spec (2026-10-06)

- **Trigger:** two spec tensions raised at T-02's gate (above), plus `docs/specs/reports/excel-layout-server-side` (done, `0197c92b`), which moved the workbook layout into server code and removed `STAR_RAW_COLUMN_GROUP_FALLBACK` and the banner literal this spec's T-03/T-04 targeted.
- **User rulings (2026-10-06, AskUserQuestion):**
  1. Blank catalog name → **fix the view** (A-1): `COALESCE(NULLIF(name, ''), CONCAT('Unknown (id ', id, ')'))`; T-01 reopened, its unpushed migration `1791700000000` (`e5db630a`) edited in place after a scratch revert. T-02's blank-name cases replace the `expectBreak` pins.
  2. T-02 step 6(b) → **amend**: "no view merged today becomes `<derived…>`; the top-level count stays 60" (the 28 pre-existing derived rows stay). Same wording in NFR-IDX-001 (b) and design §10.
  3. T-03/T-04 re-plan → **Leader amends, user approves the diff**: no group row (T-03 keeps only the dictionary half, files renamed `…InnovationDevDictionary…`); T-04 adds `INNOVATION_DEVELOPMENT` to `STAR_RAW_SECTIONS` and 32 `StarRawSectionColumn`s, band and banner derived, and updates the excel-layout specs that pin 11 bands / column 80. D9 / R4 / G-IDX-3 resolved by the excel-layout spec.
- **ADR impact:** none.
- **Documents amended:** `requirements.md` (§3 cell vocabulary note, glossary, §1 scope, R-IDX-006, NFR-IDX-001 (b), NFR-IDX-003, D9, §6, R4), `design.md` (Document Control, Executive Summary, §2, §2.1, §3.1, §5, §10, §11, P-7, P-10, §15), `tasks.md` (header, T-01 A-1, T-02 steps 2/6(b), T-03, T-04, T-05, coverage map).
- **Correction closure:** forward sweep `grep -n -i "fallback\|group row\|column_group\|ColumnGroup\|column-group\|D9\|R4\|G-IDX-3\|layout migration\|<derived\|Unknown (id"` over the spec folder — every remaining hit is amended text or an unaffected reference (P-16, P-17, design §3.2a). Backward: requirements D9 ← design §1 non-goal (still accurate), T-05 coverage line updated. `git diff` of the three documents read: every removed line is an intended removal.
- **Briefs to re-issue:** none in flight (T-02 worker `ctx_e7ba9d89e47c` was released at the pause); every new brief carries the amended text.
- **OQ-1 / OQ-2 answered at this gate:** OQ-1 confirmed as proposed; OQ-2 keep column 89 (recorded in `requirements.md` §10). T-03 unblocked.
- **User approval of the amendments:** "Approve" (2026-10-06).

### Approval mode change (2026-10-06)

- **User:** "vamos a agilizar esto vas a seguir desarrollando las tareas a menos de que salga un fatal fail en el review de resto sigues y recuerda que cada que salga un pass en la tarea cierras el worker y mandas la otra tarea en otro worker".
- **Effect:** from here the continue gate auto-passes (`pre-approved` for routine progress). Stops remain for a Reviewer `FATAL_FAIL`, and — per the command's exception list — a HALT after 3 failed attempts, a Pivot, or a budget tripwire are reported. One fresh Cursor worker per task; released right after its Reviewer PASS.

### T-01 — Amendment A-1: blank catalog names → `Unknown (id n)` (rework)

- **Status:** PASS (rework attempt 1). T-01 closed again.
- **Date:** 2026-10-06
- **Effort:** high. **Review mode:** parallel lens reviewers (migration surface): A = reliability + risk, B = readability + resilience. Override (e) rework applies.
- **Implementer:** Cursor `grok-4.7-high` (fresh worker), Orca `run_230d9e1c0beb` / `task_b8d3cf4ba559` / `ctx_23e1eb01459c`. Brief: `IDX-T-01-A1-brief.md` (session scratchpad). Report: `/tmp/idx-t01-a1-report.md`.
- **Files changed:** `server/researchindicators/src/db/migrations/1791700000000-CreateReportInnovationDevView.ts` (edited in place; `e5db630a` unpushed) · `server/researchindicators/src/db/migration-specs/1791700000000-CreateReportInnovationDevView.spec.ts` (+ assertion (g)).
- **Sites changed (name operand only):** helper `catalogName` `:41` (nature, type, anticipated users, dissemination, expansion) · readiness name `:58` (`:53` whole-cell fallback has no name operand, unchanged) · actor type `:264` · known institution `:322` (acronym slot unchanged) · institution type `:333/:355/:375` · sub-type `:363` · tool function `:404–405` (`NULLIF(tf.name,'') IS NOT NULL` / `NULLIF(tf.name,'')`, falls through to the existing `Unknown (id n)` branch).
- **Implementer verification:** migration spec 7/7; falsifier — readiness `NULLIF` removed → `(g) every catalog-name COALESCE wraps the name in NULLIF` red, `expect(bareNames).toEqual([])` `Received ["cirl.name"]`, restored. Scratch: head confirmed, `migration:test:revert` (one `DROP VIEW`), `migration:test:execute`; B-1 = 0. Fixture `report-innovation-dev-view`: **5 failed / 51 passed** — the 4 `expectBreak` pins (`nature/type/users/dissemination blank name`) now read `Unknown (id 9076xx)` (expected `Not provided`), and `tool name empty` (`expectParity`) now reads `• Unknown (id 907654)` (expected `• `). These are the behavioural proof of A-1; T-02 flips the pins.
- **Not Done / Assumptions (verbatim):** "a blank tool-function name is a catalog-name slot under A-1, so it now renders `Unknown (id n)` even though that turns a previously green `expectParity` pin red." — supported by tasks.md T-02 ("and any other catalog-name cell or slot"); no blocker.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** migration spec `Tests: 7 passed` · `npx eslint` both files exit 0 · `npx prettier --check` clean · fixture `Tests: 5 failed, 51 passed, 56 total`, the same 5 cases.
- **Reviewer A (reliability + risk): PASS** — only name operands changed; ids, `applies`, `mandatory`, `report_field`, readiness fallback, acronym slot byte-identical; 12 COALESCE sites + tool slot covered; no new `NP` path; no `?`/`:word`; (g) not tautological.
- **Reviewer B (readability + resilience): PASS** — 12 sites counted independently; `down()`/`CREATE OR REPLACE` unchanged; count pin judged a strength; parser whitespace-independent.
- **ADVISORY (recorded, not gating):** (A1/B1) assertion (g) cannot see the tool-function `IF` site — the named guard for it is T-02's `tool name empty` pin (B suggests rewriting it as a 13th `COALESCE`); (A2/B5) whitespace-only names fall back only via PAD SPACE collation (spaces), a tab/newline name would render a blank bullet — the spec says "blank (`''`)"; worth one case if catalogs can hold such values; (A3) the committed T-01 state leaves 5 known reds in the uncommitted T-02 fixture until T-02 lands — do not read them as a regression; (B2) duplicated quote-skipping scanner in the spec helpers; (B4) (g) is text-only, not evidence about cell values (KZ-001); (B6) other local scratch DBs that applied the original `e5db630a` keep the old view until revert + re-apply.
- **runtime events:** none.
- **spawns:** implementer (Cursor grok-4.7-high) not reported by host, ended complete · reviewer A 8 calls, 58,465 tokens, ended complete · reviewer B 8 calls, 55,315 tokens, ended complete.
- **Requirements covered:** requirements §3 note (amended), design §3.1 (amended).
- **Continue gate:** auto-approved (user approval-mode change, above).

### T-02 — Fixture suite (resumed after the pause)

#### Attempt 1 (continuation after the Pivot) — Reviewer FAIL

- **Implementer:** Cursor `grok-4.7-xhigh` (fresh worker), Orca `run_230d9e1c0beb` / `task_1c17164014f5` / `ctx_24dd8626f49b`. Brief: `IDX-T-02-brief.md` (session scratchpad). Report: `/tmp/idx-t02-report.md`.
- **runtime events:** idle-without-report ×1 (VPN cut the worker after it wrote its report and before `worker_done`; context 81%) → recovered by leader.md idle protocol step 2 (report file found complete). No attempt consumed.
- **Files changed:** `server/researchindicators/test/fixtures/innovation-dev/report-innovation-dev-view.fixture-spec.ts` (untracked, 2,130 lines).
- **Implementer verification:** 56/56 after restore. Falsifiers red on behavioural assertions, each restored: (a) variety NULL `Not applicable` vs `Not provided`; (b) `cirl.id >= 7` → level 6 `Not applicable` vs `Not provided`; (c) Yes/No `IF` → `Not provided` vs `No`; (d) org 78 `valid_text` → `• Other ()` vs `• Other (Not provided)`; (e) `> 0` dropped → `Not provided` vs `0`; (f) derived `GROUP BY` actors → `Expected substring: "invalidate on row from root"` / `Received "-> Materialize  (cost=0..0 rows=0)"`; (g) `nullif(cic.name,'')` removed → `Unknown (id 907603)` vs `Not provided`; tool site `NULLIF(tf.name,'')` removed → `• Unknown (id 907654)` vs `• `. View restored by revert + execute, `SHOW CREATE VIEW` byte-identical to the pre-falsifier dump; B-1 = 0. EXPLAIN (a): 210 results, 4 × `Materialize (invalidate on row from root)` over FK index lookups, `Table scan on root` (reading), no Hash/`<derived`. (b): 60 `id = 1` rows; `<derived…>` set before/after the same 28; `riu`/`ciul` real. Timing 45.85 / 44.30 / 46.43 ms (median 45.85, spread 2.13), reading.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** fixture 56 passed · eslint 0 · prettier clean · scratch `migration:show` last `[X] 425 CreateReportInnovationDevView1791700000000`, no `[ ]`.
- **Reviewer: FAIL** (verbatim):

> 1. **Discovered Issue:** The amended blank-name (A-1) cases cover only 5 of the roughly 11 catalog-name sites: nature, type, anticipated users, dissemination and tool function. There is no blank (`''`) name case for the readiness name (`Level n: Unknown (id n)`), the expansion-potential name (col 111), the actor type name, the known-institution name, the institution type name, or the sub-type name. The T-01 A-1 rework changed each of these sites separately (execution.md T-01 A-1, "Sites changed": `:58`, `:264`, `:322`, `:333/:355/:375`, `:363`). Right now only the SQL-text assertion (g) pins them, and that is a text check, not a behavioural one.
>    * **Violated Rule:** `tasks.md` T-02 Scope 2, amended bullet: "a blank (`''`) name behind an accepted id (nature, type, anticipated users, dissemination, **and any other catalog-name cell or slot**) reads `Unknown (id n)` with the function TRUE". Also `requirements.md` §3, amended note at L87.
>    * **Remediation Suggestion:** Seed `''`-named catalog rows in band 907_xxx: a readiness level with `name = ''`, an expansion potential, an actor type, an institution, an institution type with no children, and a child sub-type under a parent. Add one `expectParity` case per slot, with the expected values `Level n: Unknown (id n)`, `Unknown (id n)` in col 111 (level ≥ 7), `• Unknown (id n) — …`, `• ACR - Unknown (id n)`, `• Unknown (id n)` and `• Parent > Unknown (id n)`. The function must be TRUE in every case.
>
> 2. **Discovered Issue:** The fixture never checks that stale data stays hidden, in two scenarios the task lists. (a) The level-6 case seeds `knowledgeSharing: null` and nothing else, so it never shows that stored knowledge-sharing, dissemination, tool context, tool functions, scaling answers and expansion are hidden behind `NA` below level 7. (b) The variety-NULL case seeds `varietyCount: null`, so "blank variety with a stale count → `NA`" is never exercised. Only "variety No" has a stale count.
>    * **Violated Rule:** `tasks.md` T-02 *Requirements covered*: "R-IDX-002: … *BUT* (variety No **or blank** → `NA` with a stale count)" and "R-IDX-004: level < 7 → 94–112 `NA` **with stale data**". Also `requirements.md` R-IDX-004 "Readiness below 7" ("stale knowledge-sharing data stored … the stale values are not shown") and R-IDX-002 *BUT*.
>    * **Remediation Suggestion:** Add a level-6 case seeded with `knowledgeSharing: true`, `disseminationId: 2`, context, results text, one tool function, one link, scaling answers 1–5 and `expansionId: 2` with details. Assert that cells 94–112 are all `NA` and the function is TRUE. Separately, set `varietyCount` to a stale positive value (for example 9) in the variety-NULL case.

- **ADVISORY (recorded, not gating):** (1) 6(a) root access is `Table scan on root`, accepted by the regex — matches the task wording but not design §10's "range/lookup"; recorded here as a **reading at scratch volume** (cost-based; cannot reach Prod volume). (2) "many children" `expect(expectedLinks).not.toContain('Inactive …')` tests the test's own constant (inert line; full-cell equality already proves exclusion). (3) R-IDX-003 "actor with no `actor_type_id`" is unreachable (`NOT NULL` column); the fixture substitutes a schema-constraint check — recorded so it is not read as a missing case. (4) the test writes `/tmp/t02-idx-*` side files (machine-specific paths).
- **spawns:** implementer (Cursor grok-4.7-xhigh) not reported by host, ended died (idle-without-report, report recovered from file) · reviewer not reported by host, ended complete.

#### Attempt 2 — rework

- **Implementer:** same worker (user rule: keep the worker through FAIL until PASS), context 81% at dispatch. Effort stays xhigh (top Grok slug). Attempt History: attempt 1 covered 5 of the catalog-name sites and seeded the level-6 / variety-NULL cases without stale data — do not repeat.
- **Files changed:** same fixture file (attempt 2 delta: 6 blank-name parity cases — readiness, expansion, actor type, known institution, institution type without children, sub-type; a level-6 stale-data case; variety NULL with stale count 9; two inert `not.toContain` lines removed).
- **Implementer verification:** fixture 63/63; eslint 0; prettier clean. One-mutation reds on scratch (each `1 failed, 62 skipped`, restored): readiness `NULLIF` removed → `"Level 6: "` vs `"Level 6: Unknown (id 907623)"`; expansion → `"Not mandatory"` vs `"Unknown (id 907661)"`; actor type → `"•  — Women (youth)"` vs `"• Unknown (id 907813) — Women (youth)"`; institution → `"• BLK - "` vs `"• BLK - Unknown (id 907731)"`; institution type → `"• "` vs `"• Unknown (id 907702)"`; sub-type → `"• Fixture parent type > "` vs `"• Fixture parent type > Unknown (id 907721)"`; level-6 stale: `cirl.level >= 7` dropped from dissemination → `"Proceed"` vs `"Not applicable"`; variety COALESCE unwrapped → `"9"` vs `"Not applicable"`. View restored (revert + execute), `SHOW CREATE VIEW` has `nullif(cic.name,'')`, B-1 = 0.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** `npm run test:fixtures -- report-innovation-dev-view` → `Tests: 63 passed, 63 total` · eslint 0 · prettier clean.
- **Reviewer: PASS** — both attempt-1 FAIL items fixed with requirement literals; no attempt-1 case weakened; cleanup intact.
- **ADVISORY (recorded, not gating):** the view has three `COALESCE(NULLIF(parent_type.name,''), …)` sites (`:333` type 78, `:355` parent in `Parent > Sub`, `:375` no children); the fixture behaviourally covers `:375` only. `:355` is reachable (blank-named type with one child → `• Unknown (id n) > <child>`); `:333` needs the shared catalog row 78 blanked (conflicts with `ensureNamed`/FP-51), so its text pin is defensible. **Forward pointer → T-04** (its step 7 re-runs this fixture): carry the `:355` case. Still standing from attempt 1: `/tmp/t02-idx-*` side files; 6(a) `Table scan on root` is a reading at scratch volume.
- **runtime events:** none.
- **spawns:** implementer (same worker) not reported by host, ended complete · reviewer not reported by host, ended complete.
- **Requirements covered:** NFR-IDX-002, NFR-IDX-001 (a)/(b) as amended, R-IDX-001…005 scenarios, D1–D3.
- **Final:** PASS on attempt 2. Continue gate auto-approved (approval-mode change).

### T-03 — Settle P-14, then author the dictionary migration with a realistic round trip

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-xhigh` (fresh worker), Orca `run_230d9e1c0beb` / `task_9b5b5eb7269e`. Brief: `IDX-T-03-brief.md` (session scratchpad). Scope 2 settled by the Leader (OQ-1 confirmed, OQ-2 keep → design §3.2a unchanged, 32 rows).
- **Files changed:** `server/researchindicators/src/db/migrations/1791800000000-StarRawInnovationDevDictionary.ts` (new) · `…/migration-specs/1791800000000-StarRawInnovationDevDictionary.spec.ts` (new) · `server/researchindicators/test/fixtures/innovation-dev/star-raw-innovation-dev-dictionary.fixture-spec.ts` (new).
- **P-14:** Dev read-only `SELECT` → `connect ETIMEDOUT` 192.168.20.210:3306 (VPN outage that evening). P-14 stays `UNVERIFIED`; the guard protects every environment.
- **Implementer verification:** spec 7/7; fixture 2/2; view fixture 63/63; eslint/prettier clean. Reds before the final migration: band `Expected length: 32 Received length: 0`; guard `Received promise resolved instead of rejected`. Falsifiers (reverted): (a) `field_label = 'Actors'` UPDATE → IU byte-identical red (IU `Actors` id 274 changed); (b) seed-constant `down()` → `"sort_order": 59` expected vs `58`; (c) `''` explanation → `null` vs `""`; (d) guard removed → altered-label test resolves instead of rejecting. Scratch executed → reverted → executed, 0 pending. **Deviation:** a 37-row seed pre-state was committed to scratch to apply the migration and left in post-`up()` shape. Assumption: the 32 explanations were authored from R-IDX-002…005 (design says only "an explanation").
- **Evidence re-run (Leader inline, non-author): VERIFIED** — spec 7/7; `npm run test:fixtures -- innovation-dev` 6 suites / 83 tests; eslint 0; prettier clean.
- **Reviewer A (reliability + risk): FAIL** (verbatim):

> 1. **Discovered Issue:** On a fresh scratch container, `migration:test:bootstrap` will now fail at this migration. … `src/db/baseline/README.md` says the baseline holds no data apart from the 348 `migrations` rows. … tasks.md B-2 measured … Only the 6 Innovation Use rows exist, and there is no `Link to Innovation Use` anchor. So `readAnchor()` throws `anchor Link to Innovation Use matched 0 rows`, TypeORM rolls back, and every migration after `1791800000000` (including T-04's) never gets applied on any new container. The worker's scratch run only passed because 37 pre-state rows were committed into scratch by hand first. Those rows are still there in post-`up()` shape, which contradicts the Done criterion. …
>    - **Violated Rule:** tasks.md T-03 Done criteria: "Applied on scratch, then reverted, then re-applied; scratch left with the pre-state rows removed (fixture cleans up)". Also `server/researchindicators/src/CLAUDE.md` §7 / K-006 …
>    - **Remediation Suggestion:** This needs a Leader decision and a design §5 amendment … In both `up()` and `down()`, do nothing only in the exact never-seeded state: the anchor is absent, there is no `Innovation details` row, and there is no `Innovation Development` row. Any partial state … must still throw. Add a migration-spec case for the empty state (no writes) and one for the partial state (throws). Then delete the 37 hand-seeded rows on scratch and prove a fresh `compose:test:down` → `up` → `migration:test:bootstrap` reports 0 pending. Re-run the full `npm run test:fixtures`.

  ADVISORY (A): `down()` does not check `A+1…A+27` is empty before moving rows back (hypothetical later migration only); `down()` resets explanations to NULL (accepted, §5); fixture finds IU rows by fill (asserted first, loud on drift); the 32 authored explanations are worth a product read before T-04 shows them.
- **Reviewer B (readability + resilience): PASS** — §5 followed; placeholder check masks quoted strings so `?` in labels is handled; fixture rolls back. Same bootstrap gap raised as the top advisory; recommends amending the Done criterion and running the full `test:fixtures`. ADVISORY (B): no test pins the guard as strictly byte-exact (both mismatch cases append `" changed"`; a normalising comparison would stay green — add a dropped-trailing-space case, e.g. `'Readiness explanation'` at index 4); re-check P-14 when Dev answers; `@akili-spec` TSDoc sits on a type, not the class; fixture header still claims B-2; after `up()` only IU rows and groups are asserted (rows outside the block checked only after `down()`).
- **Leader adjudication:** FAIL stands (one reviewer FAIL, in scope). It is a spec tension (design §5 "anchor exactly 1 row" vs a schema-only scratch baseline), resolved as an execute-time design edit that does not change a requirement's meaning: **design §5 amended** (never-seeded → no-op in `up()`/`down()`; partial states still throw) and the T-03 scratch Done criterion clarified (2026-10-06, under the user's "keep going unless FATAL_FAIL" direction). Both sections are named conformance checks in the attempt-2 Reviewer brief.
- **spawns:** implementer (Cursor grok-4.7-xhigh) not reported by host, ended complete · reviewer A 11 calls, 87,507 tokens, ended complete · reviewer B 15 calls, 91,595 tokens, ended complete.

#### Attempt 2 — rework

- **Implementer:** same worker `ctx_9af809b038c1` (keep through FAIL). Effort stays xhigh. Attempt History: attempt 1 made the anchor guard throw on a never-seeded DB and hid it by hand-seeding scratch — do not repeat.
- **runtime events (attempt 2):** the dispatch had settled on attempt 1's `worker_done`, so Orca rejected attempt 2's heartbeats and `worker_done` ("Rejected worker_done: T-03 attempt 2"); the report file + idle terminal were used as the completion signal. No attempt consumed.
- **Implementer verification (attempt 2):** `readPresence()` (one SELECT, three counts) → all zero returns before any anchor/section read; anchor 0 with a section count > 0 throws `anchor absent while seed or final rows exist` before any write; anchor present keeps the byte-exact guard. New spec cases seen red then restored: empty state (early returns removed → `Expected length: 0 / Received length: 32` writes; `down()` 28); partial details/development (→ `Received promise resolved instead of rejected`); dropped trailing space at block index 4 (compare via `trimEnd()` → resolves instead of `block position 5 label mismatch`). Spec 12/12 (19/19 with the view spec). Scratch: reverted with the hand rows present, deleted the 31 hand-inserted rows (IU rows kept), B-2 `6 6 0 0`; execute/revert/execute = presence SELECT only. Fresh container (`compose:test:down/up` + `migration:test:bootstrap`): stopped at two **pre-existing** migrations — `CreatePiDelegates1787600000000` (`ER_FK_INCOMPATIBLE_COLUMNS`, collation; known OPEN-ITEMS §3.3 FU-2) and `LinkResultOicrsAndOtherResearchArea1790688406000` (FK to empty `portfolios`, new finding) — hand-patched on the disposable scratch only; then 0 pending, `[X] 414 StarRawInnovationDevDictionary1791800000000` ran the presence SELECT only. Full `test:fixtures`: 6 failed / 21 passed — 5 pre-existing `ResultPolicyChangeModule` bootstrap failures (OPEN-ITEMS §3.3 FU-3) and the T-02 EXPLAIN gate (needs indicator id 1, absent on a fresh scratch — forward pointer to T-04). This task's fixture passed.
- **Evidence re-run (Leader inline, non-author): VERIFIED** — both migration specs 19/19; dictionary fixture 2/2; eslint 0; prettier clean. View fixture on the fresh scratch: 62/63 (only the EXPLAIN gate, the seeding gap above).
- **Reviewer (attempt 2, reliability + risk): PASS** — attempt-1 FAIL fixed per amended design §5; byte-exact guard, id-keyed writes, relative `down()`, §3.2a labels, no group row all intact; partial states throw before writes.
- **ADVISORY (recorded, not gating):** a fresh-container bootstrap reaches 0 pending only after hand-patching the two pre-existing migrations — **forward pointer → T-05**: file the `portfolios` FK failure next to FU-2 in OPEN-ITEMS; the no-op rests on three markers (a manual delete of the anchor + first seed row would make `up()` silently skip — not reachable from any migration/seed path); T-02 EXPLAIN seeding gap already forwarded to T-04.
- **spawns (attempt 2):** implementer (same worker, context ~88%) not reported by host, ended complete · reviewer not reported by host, ended complete.
- **Requirements covered:** R-IDX-006 (dictionary half), NFR-IDX-003 (dictionary half), NFR-IDX-004, D5.
- **Final:** PASS on attempt 2. Continue gate auto-approved.

### Budget tripwire after T-03 (2026-10-06)

- **LOC:** design §15 estimated ~2,300 for the whole spec; T-01…T-03 already total 4,586 lines (`wc -l` of the view migration + spec, the two fixtures, the dictionary migration + spec). Cause: the parity fixture (~2,130 vs ~800 estimated — the amendment cases, NULL/blank/stale cases and the EXPLAIN gate) and the guarded dictionary migration (~560 vs ~300). **Review rounds:** 10 verdicts so far vs ~12 budgeted, with T-04 and T-05 to go.
- **Handling:** reported to the user at this gate; under the user's standing direction ("seguir … a menos de que salga un fatal fail") execution continues to T-04 without a pause. Recorded, not hidden.

### T-04 — TS wiring: Phase 3 query and merge, `INNOVATION_DEVELOPMENT` section and 32 tagged columns, notice removal

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-xhigh` (fresh worker), Orca `run_230d9e1c0beb` / `task_63d253cfab99` / `ctx_04a706a7fa8a`. Brief: `IDX-T-04-brief.md` (session scratchpad). Forward pointers carried: T-02 review `:355` parent-type blank-name case [advisory-grade]; fresh-scratch indicator-1 seeding gap in the T-02 EXPLAIN gate (required for step 7).
- **Files changed:** `server/researchindicators/src/domain/entities/reports/repositories/star-results-export.repository.ts` + `.spec.ts` · `…/handlers/star-results-metadata/star-results-metadata.innovation-dev.columns.ts` (new) + `.spec.ts` (new) · `…/star-results-metadata.sections.ts` + `.spec.ts` · `…/star-results-metadata.columns.ts` · `…/star-results-metadata.banner-subtitle.ts` · `…/star-results-metadata-workbook.handler.ts` + `.spec.ts` · `…/core/excel-workbook.column-groups.spec.ts` · `server/researchindicators/test/fixtures/innovation-dev/report-innovation-dev-view.fixture-spec.ts`.
- **Consumer sweep (step 1; src / test / client, totals before filtering; client 0 for every symbol):** `STAR_RESULTS_METADATA_RAW_COLUMNS` 12 · `STAR_RAW_SECTIONS` 14 · `deriveColumnGroups` 17 · `STAR_RAW_SHEET_PREAMBLE_BASE` 3 (unaffected) · `STAR_RAW_COMING_SOON_NOTICE` 0 (was 3; removed) · `bannerNotice` 9 (handler line removed; builder capability kept, `excel-workbook.builder.spec.ts:1019,1051` untouched) · `findStarResultsMetadataRows` 22 + 2 test · `queryPhase2WithGroupConcatLimit` 2. `api.service.ts:386` stores the blob (P-8).
- **Implementer verification:** full `npm test -- --silent` 430 suites / 4071 tests; build 0; reports targeted 19/159. Step 7 — before: fresh scratch, EXPLAIN gate `FK_d2e8a705ce8be71c6a65c925b03` on `indicator_id`; after: fixture seeds indicator 1 via `ensureNamed` (owned delete), EXPLAIN gate uses the repository's captured Phase 2/3 SQL → 64/64; 60 top-level rows, the same 28 `<derived…>`, `riu`/`ciul`; innovation-use fixture 38/38. Falsifiers (restored): (a) no `String()` + id `'7'` → `"dev-0"` vs `"Not applicable"`; (b) notice line → `sheetContainsComingSoon` `Expected false / Received true`; (c) header changed → `"Short title"` vs `"Short title changed"`; (d) `header: 1` → `TS2322 Type 'number' is not assignable to type 'string'`, build exit 1; (e) col 81 tagged `INNOVATION_USE` → `Expected value "BW3:CB3"` absent from merges.
- **Not Done / Assumptions (verbatim):** "Advisory `:355` scratch falsifier was not observed red. `SHOW CREATE VIEW` did not re-execute (`ERROR 1064` near the trailing charset clause). Both the mutated statement and the restore statement failed to parse, so the live view was not replaced. … The new parity case itself is in the 64 green tests." — advisory-grade item; no blocker, no owed task item.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** `npm test -- --silent` → 430 suites / 4071 tests · `npm run build` 0 · `npm run test:fixtures -- innovation-dev` → 6 suites / 84 tests · eslint 0 on every changed/new src+test file.
- **Preview read (Leader, ExcelJS load of `/tmp/innovation-dev-T-04-preview.xlsx`):** sheets `Raw data | Data dictionary`; 112 columns; merges `… BI3:BV3 BW3:CB3 CC3:DH3`, banner `C1:DH1`; row 3 col 81–112 `INNOVATION DEVELOPMENT`; headers `Short title` … `Expansion and adaptation details`; the Innovation Dev mock row shows values, the other-indicator row `Not applicable`; no `coming soon`.
- **Reviewer: PASS** — DD-1 merge contract, Phase 3 in the same transaction, 32 aliases/labels byte-equal to §3.2/§3.2a and tagged, columns 1–80 unmoved, notice removed with builder capability kept, read-backs locate headers by content, required forward pointer done without weakening assertions; the merge test can catch (a).
- **ADVISORY (recorded, not gating):** the `:355` parity case was never seen red (scratch mutation did not parse) — coverage not yet falsified (K-004), open item; the repository imports `STAR_INNOVATION_DEV_RAW_COLUMNS` from the handler layer to build its SQL (deliberate single source per DD-5; worth a comment); the merge copies `devRow[key]` without a fallback (unreachable while the view is migration-pinned); keep `~1%ni` out of commits.
- **runtime events:** none. **spawns:** implementer (Cursor grok-4.7-xhigh, ended at 87.6% context) not reported by host, ended complete · reviewer not reported by host, ended complete.
- **Status:** PASS (attempt 1).
- **User visual approval (D7):** the Leader opened `/tmp/innovation-dev-T-04-preview.xlsx` listing what to check (band CC–DH, banner C1:DH1, headers row 4, DEV-2 values vs KP-3 `Not applicable`, no `coming soon`). User, 2026-10-06: "si ok haz commit pero si faltan tareas no mas por ahora". What that covered: the mocked-data preview's Raw data layout — not Dev/Prod data. The user also paused the run after this commit: T-05 is not started.

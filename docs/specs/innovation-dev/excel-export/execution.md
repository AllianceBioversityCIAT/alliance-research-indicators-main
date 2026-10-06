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

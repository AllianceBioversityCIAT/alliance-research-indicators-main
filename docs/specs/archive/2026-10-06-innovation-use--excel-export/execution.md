# Execution log — Innovation Use / Excel export section

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/innovation-use/excel-export/` (AC-1681, family row 7) |
| Approval Mode | gated (inherited from `requirements.md`) |
| Branch | `AC-1681-Include-the-Innovation-use-data-in-the-excel-export` |
| Started | 2026-10-05 |
| Leader | Claude Code session, `claude-opus-5-5` (T1) |
| Implementer | Cursor CLI, Grok (`grok-4.7-*`), via Orca orchestration — standing user routing ("Grok implements, Claude reviews") |
| Reviewer | `akili-reviewer` wrapper (Claude `opus`, read-only `Read/Grep/Glob`) — author ≠ auditor on both axes (weights and context) |
| Budget (design §15) | 5 tasks · ~1,450 LOC · ~11 review rounds |

### Run notes (Step 0)

- **Persona drift.** `akili doctor --agents` (akili-specs v2.32.0) reports all four personas `UNMARKED` (no section markers). `--fix` was **not** run: the personas carry ARI-specific content that a template refresh could overwrite. Reported to the user. Mitigation: the Implementer is a non-wrapper host (Cursor), so its brief carries the checkpoint bounds (3 same-failure cycles / 60 tool calls) and the seven checkpoint fields explicitly; the Reviewer brief carries the report contract.
- **Model registry drift.** `cursor-agent models` (2026-10-05) no longer lists `cursor-grok-4.6-*`; it lists `grok-4.7-{low,medium,high,xhigh}[-fast]` and `cursor-grok-4.5-high[-fast]`. Effort is baked into the slug.
- **Skills.** The task's skills (`nestjs-expert`, `tdd`, `systematic-debugging`) are Claude Code skills; a Cursor worker cannot load them. The brief states the discipline they carry (red→green with assertion-level reds; root-cause before fix) instead.
- **Environment pre-check (Step 2.1).** Scratch MySQL container `research_indicators_server_test_mysql` is up on `127.0.0.1:3307` (disposable, `ARI_TEST_MYSQL_*` / `orm.test.config.ts`). The shared Dev database is out of bounds for T-01.

---

## Task Execution History

### T-01 — Bring scratch to HEAD, then author the `report_innovation_use` view migration

- **Status:** PASS (attempt 2)
- **Date:** 2026-10-05
- **Effort:** xhigh (attempt 1) — correctness-critical SQL transcription (D1); `grok-4.7-xhigh` is the top Grok slug, so the rework bump cannot raise effort further and keeps it.
- **Review mode:** parallel lens reviewers (task touches migrations): A = reliability + risk, B = readability + resilience, both with baseline spec conformance.

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-xhigh`, Orca `run_4c517d276821` / `task_1a499437d332` / `ctx_5e220bd2e5f9`. Brief: `T-01-brief.md` (session scratchpad).
- **Files changed:** `server/researchindicators/src/db/migrations/1791300000000-CreateReportInnovationUseView.ts` (new, 358 lines) · `server/researchindicators/src/db/migration-specs/1791300000000-CreateReportInnovationUseView.spec.ts` (new, 212 lines).
- **P-13 scratch-only workaround (exact, from the Implementer report; no migration file edited):**
  1. Collation alignment on `ari_scratch_test`:
     ```sql
     ALTER TABLE agresso_contract_countries DROP FOREIGN KEY FK_13feff5cf0e0a5284efdbe4986c;
     ALTER TABLE pooled_funding_contracts DROP FOREIGN KEY FK_7b48a2e3bf656efd12ac188a845;
     ALTER TABLE result_contracts DROP FOREIGN KEY FK_4b8eb4ce310754d6fd971f47157;
     ALTER TABLE user_agresso_contract DROP FOREIGN KEY FK_cca0330a53abf0648e997929081;
     ALTER TABLE agresso_contracts MODIFY agreement_id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL;
     ALTER TABLE agresso_contract_countries MODIFY agreement_id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL;
     ALTER TABLE pooled_funding_contracts MODIFY agreement_id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL;
     ALTER TABLE result_contracts MODIFY contract_id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL;
     ALTER TABLE user_agresso_contract MODIFY agreement_id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL;
     -- then the four FKs re-added with the same names, ON DELETE/UPDATE NO ACTION
     ```
  2. `DROP TABLE pi_delegates;` — empty orphan left by the earlier errno-3780 run (`CREATE TABLE` auto-commits), which made the re-run fail with errno 1050.
  3. Migration `1790688406000` hit errno 1452 (`clarisa_levers.portfolio_id = 2`, empty scratch catalogs):
     ```sql
     INSERT INTO portfolios (id, name, description, start_year, end_year) VALUES (2, 'Portfolio 2', 'Scratch-only parent …', 2022, 2030);
     ALTER TABLE TEMP_result_external_oicrs DROP COLUMN source;  -- undo the half-applied, auto-committed ALTER
     ```
  4. `npm run migration:test:execute` then applied the remaining migrations to `RemoveDownloadUrlFromOicrNotificationTemplate1791214000000`.
- **Implementer verification:** migration spec 6/6 green; Falsifier reds observed at assertion level — (d) guard removed from the quantifications lateral → `expect(missing).toEqual([])` received `[2]`; (b) top-level `GROUP BY root.result_id` → `expect(stripped).not.toMatch(/\b(?:GROUP\s+BY|DISTINCT|HAVING|ORDER\s+BY|LIMIT|UNION)\b/i)` failed; (a) `-- :fake` → `expect(masked.match(NAMED_PLACEHOLDER)).toBeNull()` received `[":fake"]`. All reverted. P-20: view created with no illegal-mix error; `SELECT … LIMIT 1` ran (scratch `results` empty — no populated row). Revert dropped the view (`ERROR 1146`), re-apply succeeded. eslint / prettier clean.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** `npx jest src/db/migration-specs/1791300000000-CreateReportInnovationUseView.spec.ts` → 6 passed · `npx eslint <both>` exit 0 · `npx prettier --check <both>` clean · `migration:show` (ANSI stripped; the single "error" match is the migration name `AddedErrorMessageAiReport1781106535639`) → 0 `[ ]`, 350 `[X]`, last `CreateReportInnovationUseView1791300000000` · rule-16 probe (`typeorm query`) → `1` · `information_schema.COLUMNS` → 10 columns, `result_id` + the 9 `innovation_use_*` aliases in §3.2 order.
- **Reviewer A (reliability + risk): PASS.** All 14 rules traced to the matching cell/slot; JD-1/4/5/8 and the rule-15 NULL trap correct; enums resolve to the function's literals. Raised the NULL-`level` path as ADVISORY.
- **Reviewer B (readability + resilience): FAIL** — verbatim:
  > 1. **Discovered Issue:** `1791300000000-CreateReportInnovationUseView.ts:41-46` (col 75). The JD-1 fallback covers a missing catalog row and a NULL `name`, but not a NULL `level`. `clarisa_innovation_use_levels.level` is `nullable: true` (`clarisa-innovation-use-level.entity.ts:26-31`). With a catalog row `(id=99, level=NULL, name='X')` and an active `riu` row with `innovation_use_level_id = 99`, `CONCAT('Level ', NULL, ': ', 'X')` returns NULL. The value is mandatory, so `report_field` returns `Not provided`, but rule 14 (`riu.innovation_use_level_id IS NOT NULL`) passes. **Reachable**: the input is above; it is schema-legal and needs only a fixture seed. Col 76 is still correct in this case (NA, which matches `IF(useLevel >= 6, …, TRUE)`).
  >    * **Violated Rule:** requirements.md §3 header, "Not provided follows the green check exactly (JD-1)", and NFR-IUX-002 Target ("if and only if"). Also design.md §3.1, last row: a catalog value behind an accepted id is "never passed as a *mandatory* `report_field` argument".
  >    * **Remediation Suggestion:** make the "catalog row present" branch NULL-proof. One way: `IF(ciul.id IS NULL OR ciul.level IS NULL, CONCAT('Unknown (id ', riu.innovation_use_level_id, ')'), CONCAT('Level ', ciul.level, ': ', COALESCE(ciul.name, …)))`. Apply the same fix to the readiness expression at `:311-323` (`cirl.level` is also nullable). There it only produces `Not mandatory` instead of the fallback, so it does not gate, but it should stay consistent. Ask T-02 to add a fixture case for a NULL-level catalog row.
- **Leader adjudication:** FAIL stands. Leader confirmed `level` is `nullable: true` at the entity and that col 75 is `CONCAT('Level ', ciul.level, …)` with no NULL guard. Reviewer A classed it ADVISORY because design §3.2 names only a missing row; but the requirements' JD-1 clause is general ("A cell or slot reads `Not provided` only when the green-check predicate that guards it fails"), and design §3.1's last row forbids a catalog value behind an accepted id from acting as a mandatory argument. The fix is within design; no spec edit and no Pivot.
- **ADVISORY (recorded, not gating):**
  - (B, A-4) Spec assertion (b) does not reject a SELECT-list subquery or a top-level aggregate with no `GROUP BY`, both forbidden by design §3.1; T-02's one-row and EXPLAIN gates are the backstop.
  - (B) Spec (d) `includes('root.indicator_id = 6')` has no word boundary and does not prove an ANDed WHERE term.
  - (B) Spec (e) prefix check is tautological; it does not prove the exact top-level alias list.
  - (B) Comment the deliberately duplicated four-count sum in the actor Total slot.
  - (B) The header's fixture path does not resolve until T-02 lands; re-check then.
  - (B) Quote-masking in (a) matches the driver's own comment blindness (parity, not a hole).
  - (A-2) User text that is literally `Not provided` breaks a naive "contains" parity check; T-02 must assert exact slot text and never seed that string.
  - (A-3) `GROUP_CONCAT` truncation at 1024 bytes outside Phase 2; T-02 must set `group_concat_max_len` (P-18).
  - (A-5) All-zero disaggregated counts: Total reads `Not provided` per design §3.3, while `deriveActorTotal` returns 0. T-02's expected strings follow §3.3.
- **Forward pointers → T-02:** add a fixture case for a NULL-`level` catalog row (col 75 and readiness col 81); A-2, A-3 and A-5 above.
- **spawns:** implementer (Cursor grok-4.7-xhigh) not reported by host — ended complete (worker context 91% at end) · reviewer A 20 calls, 128,049 tokens, ended complete · reviewer B 16 calls, 106,070 tokens, ended complete.

#### Attempt 2

- **Implementer:** Cursor `grok-4.7-xhigh` (fresh worker; the attempt-1 worker was released at 91% context), Orca `task_2b3f563c3062` / `ctx_4831bebfeb32`. Brief: `T-01-a2-brief.md` (session scratchpad) — attempt-1 FAIL report copied verbatim plus the Attempt History line.
- **Files changed:** `server/researchindicators/src/db/migrations/1791300000000-CreateReportInnovationUseView.ts` only — two predicates: col 75 `ciul.id IS NULL` → `ciul.id IS NULL OR ciul.level IS NULL`; col 81 `cirl.id IS NULL` → `cirl.id IS NULL OR cirl.level IS NULL`. The spec file is unchanged, so the attempt-1 falsifier reds still stand.
- **Implementer verification:** scratch revert (`DROP VIEW IF EXISTS report_innovation_use`) then re-apply succeeded. Fix evidence: a standalone SELECT on scratch through the real `report_field`, with catalog rows `(id 99, level NULL)` and `(id 77, level NULL)` → new col 75 cell `Unknown (id 99)` (old: `Not provided`); new col 81 cell `Unknown (id 77)` (old: `Not mandatory`). Spec 6/6; eslint exit 0; prettier clean.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** Spec 6/6 passed · eslint exit 0 · prettier clean · `migration:show` 0 pending / 350 executed, last `CreateReportInnovationUseView1791300000000` · `information_schema.VIEWS.VIEW_DEFINITION` contains both `(ciul.level is null)` and `(cirl.level is null)` (LOCATE → 1, 1) · delta vs attempt 1 (`diff -u`, 20 lines) = exactly the two predicates.
- **Reviewer (`akili-reviewer`, rework override (e), single conformance reviewer on the delta): PASS** — "The attempt-1 FAIL is fixed. Col 75 now shows `Not provided` only when `riu.innovation_use_level_id IS NULL`, which is exactly when green-check rule 14 fails. Col 81 got the same guard. The change adds no new parity break and touches nothing outside the two predicates." Col 76 `COALESCE(ciul.level >= 6, FALSE)` was confirmed unchanged and correct for rule 15. ADVISORY: none (diff under 50 lines).
- **spawns:** implementer (Cursor grok-4.7-xhigh) not reported by host, ended complete · reviewer 5 calls, 52,905 tokens, ended complete.

#### T-01 closing summary

- **Final status:** PASS, attempt 2 of 3 (1 Reviewer FAIL, 0 checkpoints, 0 continuations, 0 runtime events).
- **Review rounds used:** 3 verdicts (2 parallel lens reviewers on attempt 1 + 1 on attempt 2). Budget: ~11 across the spec.
- **Requirements covered:** R-IUX-001…R-IUX-006 at text level, NFR-IUX-001 BUT clause (text), NFR-IUX-004, the exclusions note. Behavioral proof is T-02 (Disqualifier: the migration spec proves text, not behavior).
- **Premises settled:** P-13 (scratch at HEAD through the scratch-only workaround above; the rule-16 probe reads `1`), P-20 (CREATE and an empty SELECT raise no illegal-mix error; a populated, data-dependent collation mix is still only reachable by T-02).
- **Decisions made:** NULL-`level` catalog rows use the JD-1 neutral fallback in cols 75 and 81 (within design §3.1's last row; no spec edit). The inner lateral alias is `bullet_lines` (`lines` is a MySQL reserved word).
- **Skills deviation:** `tdd`, `nestjs-expert` and `systematic-debugging` could not load on the Cursor host; the brief carried their discipline in prose.
- **Constitution impact:** none (no new module, no change to a public surface).
- **Final verification:** the Leader re-run above, VERIFIED.

### T-02 — Fixture suite: green-check parity, one row per result, EXPLAIN gate, timing

- **Status:** `[~]` — paused at the gate on a spec tension (Pivot Detection, lightest form); no Reviewer spawned yet
- **Date:** 2026-10-05
- **Effort:** xhigh (correctness-critical gate for D1–D3)
- **Skills deviation:** same as T-01 (Cursor host; the discipline is carried in the brief).

#### Attempt 1

- **Implementer:** Cursor `grok-4.7-xhigh`, Orca `task_50d5312cbe85` / `ctx_b3e3f9be4ba4` (fresh worker; retained, since the task is not at PASS). Brief: `T-02-brief.md` (session scratchpad). Forward pointers from the T-01 review were carried in the brief: NULL-`level` catalog cases (cols 75, 81), exact slot text and no literal `Not provided` seeded (A-2), the all-zero Total (A-5), and `group_concat_max_len` (A-3).
- **Files changed:** `server/researchindicators/test/fixtures/innovation-use/report-innovation-use-view.fixture-spec.ts` (new). The view migration is byte-identical. The worker's temporary scratch mutator script `t02-mutate-view.ts` was deleted before the report (confirmed absent from the tree).
- **Implementer report (summary; full text at `/tmp/t02-implementer-report.md`):** 31 of 32 tests pass. That covers every rule (2, 3, 4, 5, 6, 7, 8, 8b, 9, 10, 11, 14, 15, 16), the NULL / JD-1 cases (including the two NULL-`level` catalog pointers), one-row (2 links, 3 actors, 2 orgs, 2 measures), snapshot and soft-deleted absence, and the EXPLAIN gate on 210 mixed-indicator results.
  - Falsifiers (a), (b), (c), (d) and (f) were observed red on behavioral assertions, quoted in the report. (e) stayed green, the declared blind spot.
  - EXPLAIN: 4 × `Materialize (invalidate on row from root)` over `Index lookup on ra/rit/rq/lr using FK_ddf5180b…/FK_b13f998d…/FK_8aa7d912…/FK_037db466… (result_id=root.result_id)`. View root: `Single-row index lookup on root using PRIMARY`. Baseline: one `report_general_information` results-scan block; the view added none.
  - P-19 settled (no 61-table error).
  - Timing: 3/3/4 ms before and 3/3/3 ms after, effect 0 ms, spread 1 ms → **inconclusive** per the Disqualifier (near-empty scratch, 1 ms clock).
  - Fixture-local session settings: `group_concat_max_len = 4194304` and `sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'`. The latter is the Dev mode documented by `report-oicr-number-rendering.fixture-spec.ts`; scratch's `ONLY_FULL_GROUP_BY` rejects the existing Phase 2 `report_oicr` select.
- **The one red: design gap reported, not papered over** (verbatim assertion):
  ```
  Object {
    "case": "capacity-sharing",
    "cellsContainNotProvided": false,
  -   "validation": 1,
  +   "validation": 0,
  }
  ```
  A live Capacity Sharing result (indicator 1) renders all 9 cells `Not applicable`, as R-IUX-001 requires. `innovation_use_validation(id)` returns 0 because the result has no `result_innovation_use` row, and the function never checks the indicator. NFR-IUX-002 reads "for every fixture result" function TRUE ⇔ no `Not provided` cell, and it lists "one other-indicator result" among the fixtures. So the two approved clauses cannot both hold for a non-Innovation-Use result.
- **Evidence re-run (Leader inline, non-author): VERIFIED.** `npm run test:fixtures -- report-innovation-use-view` → `Tests: 1 failed, 31 passed, 32 total`; the only failure is `NFR-IUX-002 iff: capacity sharing with no Innovation Use rows disagrees with the function`.
- **Full fixture suite:** `Test Suites: 6 failed, 17 passed, 23 total` / `Tests: 46 failed, 139 passed, 185 total` (Implementer run). This file contributes 1 failure. The other 5 suites (`innovation-use-section-round-trip`, `-role-isolation`, `-edit-plus-add-id-collision`, `-result-creation`, `-level-boundary`) die in Nest bootstrap: `Nest cannot create the ResultPolicyChangeModule instance. The module at index [0] of the ResultPolicyChangeModule "imports" array is undefined.` **Pre-existing:** the Leader reproduced it running `innovation-use-level-boundary` alone. Nothing in T-01/T-02 touches a Nest module. Recorded as an out-of-scope harness defect (a circular import), not a T-02 regression.
- **Leader adjudication: spec tension → Pivot Detection (lightest form).** This is a contradiction between two approved clauses (NFR-IUX-002's "every fixture result" vs R-IUX-001 "Other indicators → all 9 NA"), not an implementation error. No rework attempt is consumed. A one-line amendment goes to the user at the gate, and the answer is recorded in `requirements.md`.
- **spawns:** implementer (Cursor grok-4.7-xhigh) not reported by host, ended partial (one assertion intentionally red; design gap reported).

- **Spec amendment (user-approved at the gate, 2026-10-05):** "Acotar a indicador 6". `requirements.md` NFR-IUX-002 Target now scopes the biconditional to Innovation Use results (`indicator_id = 6`). Other indicators are governed by R-IUX-001 (all 9 cells `Not applicable`), and the function is not evaluated for them. The matching line in `tasks.md` T-02 scope item 3 was amended the same way. Correction sweep, forward (`grep -n -i "every fixture result|if and only if|iff|⇔|for every case|biconditional"` over requirements/design/tasks/judgment): the only other sites are design §3.1's JD-1 row and judgment JD-1, which cite the "if and only if" about catalog-name fallbacks (indicator-6 cases) and stay true. Backward: design §10's "one other-indicator" fixture row still holds, since the case now asserts NA cells. `git diff` of both documents removes only the two amended lines. Meaning check: this narrows a verification target to the population the requirement was about; it changes no cell behavior, so it is an edit-carry, not a full Pivot. **Carry:** the next Reviewer brief checks conformance to `requirements.md#NFR-IUX-002` as amended 2026-10-05.

#### Continuation (same worker, after the amendment)

- **Continuation implementer:** same worker (terminal `term_299dbe10…`), Orca `task_2809e927f930` / `ctx_90cec06acd7d`. `expectCase` now evaluates the function and the biconditional only when `results.indicator_id = 6`; the red Capacity Sharing ⇔ case was removed (R-IUX-001's 9 × NA case remains). K-004 for the helper: forcing the skip for every result turned `rule 2` red (`Expected: not {"indicatorId": 6, "label": "rule-2"}`), restored. eslint and prettier clean.
- **continuations:** 1 (amended NFR-IUX-002 scoping; owed by the user-approved amendment, not a FAIL)
- **Evidence re-run (Leader inline): VERIFIED.** `npm run test:fixtures -- report-innovation-use-view` → `Tests: 31 passed, 31 total` · eslint exit 0 · prettier clean · `git diff --stat -- src/db/migrations src/domain` empty · scratch `VIEW_DEFINITION` still holds the T-01 body (NULL-level guard and `limit 1` present).
- **Reviewer A (reliability + risk): FAIL** — 4 issues (verbatim in the attempt-2 brief, `T-02-a2-brief.md`):
  - (A1) the EXPLAIN population is tailored: child rows deleted before the plan; the 210 bulk results have no children;
  - (A2) multi-condition rule predicates tested on one condition only: rule 8 (inactive root with children; non-root type with children), rule 16 (inactive link; target indicator ≠ 2), rule 15 (no level-6 case, so `> 6` passes);
  - (A3) the 2-links case cannot tell highest `link_result_id` from highest target id;
  - (A4) the skip-branch expect can never fail, and its comment claims a red never seen (K-004/KZ-014).
- **Reviewer B (resilience + readability): FAIL** — 3 issues (verbatim in the brief):
  - (B1) the root-PRIMARY assertion does not discriminate; the base plan already holds that line 7 times;
  - (B2) the baseline results-scan regex misses `Covering index range scan on root using idx_results_snapshot_active_report_year`; the baseline has 2 blocks, not 1;
  - (B3) (a) same as A1; (b) `result_status_id = NULL` makes Phase 2 return 0 rows (it inner-joins `result_status`), so timing and the P-19 proof never evaluated a row.
- **Leader adjudication:** all 7 issues upheld as spec-conformance FAILs (KZ-001: a gate that stays green with the defect present).
  - A1/B3a: design §13 P-5 / §10 row 3. If realistic children flip `lr` to the role index, that is a **DD-4 design question**: the worker must STOP and report it, never route around it; the Leader takes it to the user.
  - B3b: tasks T-02 scope 6 "on the seeded set"; the timing reading is invalidated and must be re-run with Phase 2 returning 210 rows.
  - A2, A3: R-IUX-004 / R-IUX-006 / R-IUX-002 AND IT MUST clauses.
  - A4: K-004 in committed code.
  - B1, B2: design §10 row 3.
- **ADVISORY (recorded):**
  - (A) `sql_mode` override hides any `ONLY_FULL_GROUP_BY` check of the view (Prod mode unknown, P-4);
  - (A) the baseline set compares by membership, not count;
  - (A) untested variants: rule 5 NULL/negative, rule 9 ≤ 0, known org without acronym, unknown org with custom name, all four counts NULL;
  - (A, B) writes to shared `/tmp/t02-*`;
  - (B) put the EXPLAIN test in its own `describe` with its own seed set;
  - (B) `ANALYZE TABLE` leaves statistics on shared scratch;
  - (B) a crashed run leaves banded `results` rows with no pre-clean;
  - (B) self-checks that assert a string the test just built;
  - (B) no R3 maintainer note on re-running the suite when `innovation_use_validation` is redefined;
  - (B) a timing verdict of `fail` turns nothing red; the spec accepts that, but it must be recorded.
- **spawns:** reviewer A 16 calls, 132,276 tokens, ended complete · reviewer B 19 calls, 115,528 tokens, ended complete.

#### Attempt 2

- **Implementer:** same worker (user rule 2026-10-05: keep the worker until Reviewer PASS), context 64% at dispatch. Effort stays xhigh (top slug). Attempt History: attempt 1 tuned the EXPLAIN population (deleted children, NULL status) to obtain the expected plan — do not repeat.
- **Attempt 2 result (Implementer, verified):** all 7 upheld issues addressed.
  - Realistic children across roles; `result_status_id = 8`; Phase 2 returns 210 rows.
  - PRIMARY root lookups: base 7, with view 8 (asserted base + 1).
  - Baseline results-scan count pinned at 3 by constant, with the widened regex.
  - Five new rule-8/15/16 parity cases; tie-break by `link_result_id` disambiguated; explicit `expectedIndicator` guard (K-004 red seen).
  - Falsifiers (a), (b), (c), (d), (f) and the new (g) — top-level `GROUP BY` → primary count 7 ≠ 8 — red, quoted in `/tmp/t02-rework-attempt2-report.md`. (e) could not be observed green, because the unmutated gate is already red.
- **Evidence re-run (Leader inline): VERIFIED.** `npm run test:fixtures -- report-innovation-use-view` → `Tests: 1 failed, 35 passed, 36 total`; the single failure is `EXPLAIN gate on the real Phase 2 SQL plus a 3+3 timing reading` on the `invalidateOnRoot` / index assertion. No diff under `src/db/migrations` or `src/domain`; eslint exit 0.

## Pivot Record: T-02

- **Trigger:** the DD-4 STOP RULE in the attempt-2 brief fired, together with a measured NFR-IUX-001 timing failure. This is spec-level evidence (an approved design decision contradicted by measurement), not an implementation error. The loop is stopped; T-02 stays `[~]`; no Reviewer was spawned on attempt 2.
- **Evidence (scratch, MySQL 8.0.46, 210 seeded results across indicators 1/2/6, realistic children in several roles, Phase 2 returning 210 rows):**
  - The view still merges into Phase 2 (PRIMARY root lookup base + 1; no extra results-scan block). All four collections are `Materialize (invalidate on row from root)` with `child.result_id = root.result_id` in the filter, so the LATERAL shape of DD-1 holds.
  - `result_actors` and `result_institution_types` are read by their `result_id` FK, as designed.
  - **`result_quantifications` is read by the role index** `FK_486a03e0…` (`quantification_role_id=3`), and **`link_results` by `Index scan on lr using PRIMARY (reverse)`**. An earlier run of the same population used `Index range scan … FK_290df356…` (`link_result_role_id = 5`).
  - Per-role child counts at EXPLAIN time were 70–104 rows per role (table in the Implementer report).
  - **Timing:** before [75, 77, 75] ms, median 75; after [125, 126, 128] ms, median 126; spread 3 < effect 51, so the reading is evidence. **+68%, which fails NFR-IUX-001's ≤ 20% target.**
- **What this cannot reach (KZ-017):** Dev/Prod cardinalities. On scratch, each role holds ~70–100 rows in total, so a role-index scan is cheap there and a per-result FK lookup is barely cheaper. On Prod the ratio is very different. The plan is cost-based, so this population cannot settle whether Prod would choose the same path; it only shows the design's assumption is not guaranteed.
- **Affected decisions:** design DD-4 ("No new index … revisit only if the T-02 EXPLAIN/timing shows otherwise") — the revisit condition is met. NFR-IUX-001 (Target: index lookups by `result_id` + ≤ 20% time). DD-1 (LATERAL) stands.
- **Alternatives:**
  1. **Index hint inside the view.** `FORCE INDEX (<result_id FK>)` on `result_quantifications` and `link_results` in the laterals. No schema change; it keeps DD-4's "no new index". A view-definition change (T-01 migration, not yet merged).
  2. **Composite indexes** `(result_id, role_id, is_active)` on the affected child tables. This reverses DD-4: write cost on shared tables used by other indicators, plus a new migration.
  3. **Accept and amend.** Re-scope NFR-IUX-001's gate to the structural property (merged view + per-row `invalidate on row from root` correlated on `result_id`) and treat the access path and timing as cost-based readings for Prod volume. The 20% target stays unmeasured, or is measured on Dev by a human.
- **Leader recommendation:** first a bounded **measurement probe** on scratch by the same worker (no committed change): alternative 1 and alternative 2, each with EXPLAIN + 3+3 timing on the same population. Then the user picks with numbers in hand.
- **Status:** awaiting the user's decision. T-02 remains `[~]`; worker `ctx_0cf481201296` is retained (the user's rule: keep it until PASS).
- **User decision (2026-10-05):** "Sondeo: medir 1 y 2". A bounded measurement probe by the same worker on scratch, leaving no committed change: (1) `FORCE INDEX` of the `result_id` FK inside the laterals, and (2) composite indexes `(result_id, role, is_active)`, each with EXPLAIN + 3+3 timing on the attempt-2 population. The user chooses with the numbers. A probe is a Pivot investigation: it consumes no rework attempt and edits no committed file.

- **User decision (2026-10-05), superseding the probe:** the user questioned the complexity ("las consultas las sacaba relativamente fácil sin duplicados"). The Leader agreed: the index-path and ≤ 20% criteria were Leader-authored at specify time, and no existing `report_*` view is held to them. The probe was stopped mid-run (cleanup instruction sent to the worker; no committed change). **Accepted: alternative 3, "Aceptar y enmendar".**
- **Spec amendment (user-approved):**
  - `requirements.md` NFR-IUX-001 Target: the gate keeps the structural property — merged view, 4 per-row `Materialize (invalidate on row from root)` correlated on `<child>.result_id = root.result_id`, no whole-view materialization, no duplicates. The inner access path is cost-based and not asserted. Timing is recorded as a reading, not a gate; real-volume timing is a human check on Dev at T-05. "How verified" was adjusted to match.
  - `design.md`: §10 EXPLAIN row and timing row; DD-4 marked "revisited 2026-10-05, kept (no new index)".
  - `tasks.md` T-02: covered-requirements line, scope 5 bullet 1, Disqualifier timing bullet, timing Done criterion.
  - Sweep: `grep -n "20 %|20%"` over the three documents leaves only the amendment notes themselves. `git diff --stat`: design 6, requirements 6, tasks 10 changed lines.
  - **Carry:** the next T-02 Reviewer brief checks conformance to `requirements.md#NFR-IUX-001` as amended 2026-10-05.
- **Pivot resolved** (no ADR affected; DD-4 retained).


#### Attempt 2 (continued after the NFR-IUX-001 amendment) → PASS

- **Implementer:** same worker, Orca `task_fc2c1873c4a7` / `ctx_5cd0c3dab8bd`. Before it, the probe dispatch `ctx_17b6d94b0e2e` was stopped. The stop instruction first sat as a queued Cursor follow-up and was delivered by steering with Enter. Cleanup report: no probe index left, real view restored. Leader-verified: no non-FK/non-PRIMARY index on the 4 child tables; `VIEW_DEFINITION` has the NULL-level guard and no `force index`.
- **Change:** the per-child access-path assertion was replaced by `lateralCorrelation(plan, alias)` for `ra`, `rit`, `rq`, `lr`. Each alias must own a `Materialize (invalidate on row from root)` block (its own access line inside the block) that correlates on `result_id`, either as the filter `<alias>.result_id = root.result_id` or as the index ref `(result_id=root.result_id)`. Index names are not asserted. Timing is now a reading only: no verdict and no "20%". **Implementer judgment, Reviewer-accepted:** the baseline results-scan assertion is `baseScans ∈ [2, 3]` plus `withScans === baseScans` in the same run, because the OUTER Phase 2 root read (not a view lateral) flips between a table scan and `Index lookup on root using FK_d2e8a705… (indicator_id=…)` on scratch.
- **Falsifiers (scratch `CREATE OR REPLACE`, restored via `migration:test:revert` + `migration:test:execute`):**
  - (f) actors lateral as a derived `GROUP BY` → `Expected: 4 / Received: 3` (Materialize count);
  - (g) top-level `GROUP BY root.result_id` → `Expected: 8 / Received: 7` at `expect(withPrimary).toBe(basePrimary + 1)`;
  - (h) `rq.result_id = root.result_id` removed → `{"alias":"rq","correlatedOnResultId": true}` expected, `false` received;
  - (e) the four `root.indicator_id = 6` guards dropped → `Tests: 36 passed, 36 total`. **Blind spot (declared, KZ-017):** the guard is a cost tactic and the structural gate cannot see it.
  - Attempt-2 falsifiers (a) level vs id, (b) `<> 0`, (c) rule-6 name-NULL and (d) `LIMIT 1` dropped went red earlier on behavioral parity assertions (quoted in `t02-rework-attempt2-report.md`). The parity cases are unchanged since then.
  - **Correction (Reviewer, KZ-014):** the amendment report said the quoted falsifier line numbers "still match the file". They are 2 lines off: `basePrimary + 1` is at line 1687 (not 1685) and `toBe(4)` at 1695 (not 1693). The asserts themselves are unchanged.
- **EXPLAIN (real T-01 view, 210 results across indicators 1/2/6, realistic children in several roles, `result_status_id = 8`, Phase 2 = 210 rows):**
  - 4 × `Materialize (invalidate on row from root)` (base plan: 0);
  - `ra` by `FK_ddf5180b… (result_id=root.result_id)`, `rit` by `FK_b13f998d… (result_id=root.result_id)`;
  - `rq` by role index `FK_486a03e0… (quantification_role_id=3)` with filter `rq.result_id = root.result_id`; `lr` by `PRIMARY (reverse)` / role index with filter `lr.result_id = root.result_id` — cost-based paths, accepted by the amendment;
  - PRIMARY root lookups: base 7, with view 8; results-scan count: base = with (3, or 2 on runs where the outer read flips).
  - **P-19 settled:** the joined statement plans and executes (no 61-table error).
- **Timing reading (no gate):** before [84, 81, 81] ms, median 81; after [138, 143, 140] ms, median 140; 210 rows. An earlier attempt-2 run: 75 → 126 ms. Real-volume timing is a human check on Dev at T-05 (NFR-IUX-001 as amended).
- **Evidence re-run (Leader inline): VERIFIED.**
  - `npm run test:fixtures -- report-innovation-use-view` → `Tests: 36 passed, 36 total` on two consecutive runs;
  - eslint exit 0; prettier clean;
  - `git diff --stat -- server/researchindicators/src` empty; no "20%" in the file.
- **Reviewer (`akili-reviewer`, rework override (e), single conformance reviewer with both attempt-1 reports): PASS.** "All 7 upheld attempt-1 issues are resolved." A1, A2, A3, A4, B1, B2, B3a and B3b were each marked resolved. Named checks NFR-IUX-002 (amended) and NFR-IUX-001 (amended): met. `lateralCorrelation` fails closed and is block-scoped. The [2,3] band keeps B2's intent and is backstopped by PRIMARY base + 1.
- **ADVISORY (recorded, not gating):**
  - a multiset comparison of scan-line texts would close the compensating-flip window the band leaves;
  - `RESULTS_SCAN_LINE` does not count a full scan of `results r2` inside the link lateral (a cost-based inner path under the amendment);
  - rule 5 is pinned only at `actors_count = 0` and rule 9 only at NULL, so a NULL mis-encoding such as `COALESCE(ra.actors_count, 1) > 0` would stay green (paper mutation, not run; outside scope list 2);
  - plan and timing files are still written to the shared `/tmp/t02-*`;
  - `sql_mode` is overridden for the whole file, so ONLY_FULL_GROUP_BY validity (design §3.1) is not measured;
  - carried from attempt 1: untested variants and the missing R3 maintainer note.
- **spawns:** implementer (Cursor grok-4.7-xhigh, one worker across attempt 1, the amendment continuation, attempt 2, the probe and this continuation) not reported by host — context peaked at 77% with two automatic compactions · reviewer 1 (this verdict) not reported by host.

#### T-02 closing summary

- **Final status:** PASS, attempt 2 of 3 (1 Reviewer FAIL round with 2 lens reviewers; 2 user-approved spec amendments; 1 stopped probe; 0 checkpoints).
- **continuations:** 2 (NFR-IUX-002 scoping; NFR-IUX-001 structural gate).
- **Review rounds used (T-02):** 3 verdicts (2 + 1), within the 3-round budget. Spec total so far: 6 of ~11.
- **Requirements covered:** NFR-IUX-002 (amended), NFR-IUX-001 (amended structural gate + timing reading), R-IUX-001…R-IUX-006 behaviorally, D1–D3.
- **Premises settled:** P-5 re-measured at HEAD on seeded rows (merge holds; access paths cost-based), P-18 (fixture sets `group_concat_max_len`), P-19 (no join-limit error).
- **Decisions made:** NFR-IUX-002 scoped to indicator 6 (user, 2026-10-05). NFR-IUX-001 reduced to a structural gate with timing as a reading; DD-4 kept, no new index (user, 2026-10-05). Fixture `sql_mode` set to the Dev mode.
- **Out-of-scope finding:** 5 sibling fixture suites fail in Nest bootstrap (`ResultPolicyChangeModule` imports index [0] undefined) — pre-existing; reproduced alone.
- **Constitution impact:** none.

### T-03 — Layout migration: INNOVATION USE column group and data dictionary rows

- **Status:** in progress (attempt 1)
- **Date:** 2026-10-05 · started on the user's instruction ("sí, hazlo así y sigue con T-03")
- **Implementer:** Cursor `grok-4.7-high` (Size S, pattern copy → `high`, not `xhigh`), fresh worker. Orca `task_e1dd5b84d3e7` / `ctx_d270656ab693`. Brief: `T-03-brief.md` (session scratchpad). The T-02 worker was released after its PASS (`ctx_5cd0c3dab8bd`).
- **Dev access note:** step 1 authorizes exactly two read-only `SELECT`s on the shared Dev DB (CORE target) through `npm run typeorm query`. All writes go to scratch.

#### Attempt 1 → PASS

- **Files changed:** `server/researchindicators/src/db/migrations/1791400000000-StarRawInnovationUseColumnGroup.ts` (224 lines) · `…/src/db/migration-specs/1791400000000-StarRawInnovationUseColumnGroup.spec.ts` (241) · `…/test/fixtures/innovation-use/star-raw-innovation-use-column-group.fixture-spec.ts` (338).
- **Dev readings (P-11 / P-16): UNVERIFIED → handed to T-05.** Both mandated read-only `SELECT`s against the CORE target failed before any row returned: `Error: connect ETIMEDOUT … errorno: 'ETIMEDOUT', code: 'ETIMEDOUT', syscall: 'connect', fatal: true`. No other route was tried (per the Disqualifier). The seeded round trip uses the 10 fallback groups from `sheet-presentation.ts`, explicitly not presented as a Dev reading.
- **Colour:** `FF6A1B9A` (`private static readonly FILL_ARGB`), distinct from the 10 group colours; a repo-wide grep finds it only in the three new files. Shown to the user at the T-05 visual check.
- **Implementer judgment (Reviewer-confirmed):** `down()` also keys on `section_fill_argb`, because the seed already holds `Actors` / `Organizations` dictionary rows (`star-results-metadata-dictionary.seed.ts:381-391`). The fixture seeds those labels so the guard is live.
- **Implementer verification:** spec 5/5. Round trip on empty tables and on seeded tables (10 groups + 3 dictionary rows): byte-identical after `down()`. Falsifiers red:
  - (a) no `COALESCE` → `QueryFailedError: Column 'sort_order' cannot be null`;
  - (b) `down()` by `sort_order >= 0` → `Expected length: 10 / Received length: 0`;
  - (c) `UPDATE … from_col = from_col + 1` → spec `not /\bUPDATE\b/i` red, and seeded identity `from_col` 1 vs 2.
  Applied on scratch; T-02 fixture still 36/36.
- **Evidence re-run (Leader inline): VERIFIED.** Migration spec `Tests: 5 passed` · `npm run test:fixtures -- star-raw-innovation-use-column-group` `Tests: 2 passed` · `npm run test:fixtures -- report-innovation-use-view` `Tests: 36 passed` · eslint exit 0 · prettier clean · scratch `migration:show`: `[X] 417 StarRawInnovationUseColumnGroup1791400000000`, 0 pending.
- **Reviewer (`akili-reviewer`, override (b): stored fields / shared layout tables): PASS** — "Every sort_order is computed in SQL as `COALESCE(MAX(sort_order),0)+k` … every value is bound as a param. Nothing is UPDATEd, and `down()` deletes exactly the 10 inserted rows. The spec and the seeded round trip both catch falsifiers (a)–(c)." The labels match design §3.2 in order; the section is on the first row only (safe because the handler maps `r.section ?? ''`, `…workbook.handler.ts:204`).
- **ADVISORY (recorded):**
  - the seeded case does not pin the new rows' `sort_order` (expected group 11, dictionary 65–73); only the empty case pins `+k`;
  - correction (KZ-014): the Implementer report says the seed's `Actors`/`Organizations` have "a null section", but the seed stores `''` (`seed.ts:382,388`); `down()` is unaffected (fill key);
  - JD-6 cosmetic window applies (deploy order is checked at T-05);
  - the reviewer had no `SendMessage` and delivered via handback (K-009 recorded, not a non-delivery).
- **spawns:** implementer (Cursor grok-4.7-high) not reported by host, ended complete · reviewer 1 not reported by host, ended complete.
- **Closing:** PASS attempt 1. Review rounds spec total: 7 of ~11. Requirements covered: R-IUX-007 (DB rows), NFR-IUX-003 (`down()`), NFR-IUX-004, D5. Constitution impact: none.

### T-04 — TS wiring: Phase 2 join, 9 column specs, fallback group, banner span, notice

- **Status:** in progress (attempt 1)
- **Date:** 2026-10-05 · started on the user's instruction ("sí, sigue con T-04")
- **Implementer:** Cursor `grok-4.7-high` (Size M, shared export → `high`), fresh worker. Orca `task_ab24ebd34df6` / `ctx_bd4700c6235a`. Brief: `T-04-brief.md` (session scratchpad).
- **Decisions made (brief):** the new notice text is fixed as "Note: The Innovation Development section (readiness level, innovation nature, innovation type, and related fields) is not yet included in this export — this section is coming soon." (R-IUX-008; wording pending OQ-1 confirmation at T-05). Step 7 also removes the T-02 fixture's test-local join append, closing T-02's "Ordering note".

#### Attempt 1 → PASS

- **Files changed:**
  - `src/domain/entities/reports/repositories/star-results-export.repository.ts` (+ `.spec.ts`)
  - `…/handlers/star-results-metadata/star-results-metadata.columns.ts`
  - `….sheet-presentation.ts`
  - `….banner-subtitle.ts`
  - `star-results-metadata-workbook.handler.spec.ts`
  - `test/fixtures/innovation-use/report-innovation-use-view.fixture-spec.ts`

  The `banner-subtitle.spec.ts` does not pin the notice and was left unchanged. Diff: 7 files, ~360 lines.
- **Red-then-green (pins updated before the wiring):**
  - notice pin `Expected: "Note: The Innovation Development section … is not yet included in this export — this section is coming soon." / Received: "… and the Innovation Use section are not yet included … — these sections are coming soon."`;
  - `Expected length: 83 / Received length: 74`;
  - join pin `Expected substring: "LEFT JOIN report_innovation_use iu ON iu.result_id = gi.result_id"`.

  Then `Tests: 32 passed, 32 total` across the 3 files.
- **Read-back:** `StarResultsMetadataWorkbookHandler › reads Innovation Use values back under headers 75–83`. It uses the real handler and builder, with `findColumnGroups` → `[]` so the fallback runs, and ExcelJS reads the buffer back. It asserts:
  - banner merge `C1:CE1`;
  - group merge `BW4:CE4` with label `INNOVATION USE`;
  - OICR `BI4:BV4` and `Impact Areas` in column 74 unchanged;
  - all 9 header/value pairs, including a two-line Actors cell.
- **Falsifiers (finished code, reverted):**
  - (a) key typo → Actors `Received: ""`;
  - (b) banner 74 → `Expected value: "C1:CE1"` / received `"C1:BV1"`;
  - (c) old notice → pin red;
  - (d) `header: 1` → `npm run build` exit 1 `TS2322 … columns.ts:262`. **Jest also went red** (ts-jest type diagnostics), so the task's prediction "jest stays green" was false. It is reported as observed (K-004), and a note was added to `tasks.md` T-04 Falsifier (d).
- **Step 7 (closes T-02's "Ordering note"):** the fixture now uses the captured repository SQL as-is and asserts it contains `report_innovation_use`, the join and the 9 select items. The baseline strips exactly the `IU_SELECT_LIST`/`IU_JOIN` chunks, asserts each was present first, and asserts the baseline then contains no `report_innovation_use`. Result: `Tests: 36 passed, 36 total`.
- **Implementer note:** `ExcelColumnSpec` has no wrap field; the bullet columns use width 56, matching the existing `\n`-separated `quantification` column. Wrapping and readability are judged at the T-05 visual check.
- **Evidence re-run (Leader inline, run alone): VERIFIED.**
  - `npm test -- --silent` → `Test Suites: 423 passed, 423 total` / `Tests: 4021 passed, 4021 total`;
  - `npm run build` exit 0;
  - `npm run test:fixtures -- report-innovation-use-view` → `Tests: 36 passed, 36 total`;
  - `npx eslint` exit 0 and prettier clean on the 7 touched files.
- **Reviewer (`akili-reviewer`, override (b): shared export / response shape): PASS.** "The T-04 diff meets R-IUX-007, R-IUX-008, R-IUX-001 (Excel row) and D4/D8 … found no conformance issue." Keys = view aliases, headers = T-03 dictionary labels, in order. Nothing existing moved. The fallback matches the migration. The read-back proves value-under-header. The fixture baseline cannot leave the join behind.
- **ADVISORY (recorded):**
  - the read-back test keeps its own copy of the 9 headers, and nothing checks TS headers against the DB dictionary on the DB-layout path (T-05's human check covers it; an OQ-1 label change touches the specs, the test and a new migration together);
  - D6 deploy order (code before view → every export 500s) stays a T-05 check.
- **spawns:** implementer (Cursor grok-4.7-high) not reported by host, ended complete · reviewer 1 not reported by host, ended complete.
- **Closing:** PASS attempt 1. Review rounds spec total: 8 of ~11. Requirements covered: R-IUX-001 (Excel row), R-IUX-007, R-IUX-008, D4, D8; T-02's ordering note closed. Constitution impact: none (no module or public surface change; the `findStarResultsMetadataRows` signature is unchanged).
- **Commit deferred:** per the user's standing rule (no commit of a visual change before they see it), the T-04 code stays staged-but-uncommitted until the user has opened a generated `.xlsx` (T-05 step 3). `execution.md` and `tasks.md` are updated now (evidence before checkbox).

- **Visual preview (2026-10-05, toward T-05 step 3):** the Leader generated `~/Downloads/star_results_metadata_innovation_use_preview.xlsx` with a scratch-only script (not in the repo; session scratchpad `gen-iu-xlsx.ts`).
  - **Real code, mocked data:** the real `StarResultsMetadataWorkbookHandler` and `ExcelWorkbookBuilder`, the dictionary seed plus the T-03 migration's 9 rows, and the fallback column groups. Data rows are illustrative strings in the spec formats, NOT output of the view.
  - **Leader-checked in the file:** Raw data has 83 columns; merges `C1:CE1` (banner), `BI4:BV4` (OICR, unchanged), `BW4:CE4` (INNOVATION USE, fill `FF6A1B9A`); the new notice text; the dictionary's Innovation Use section at rows 108–116.
  - **User's response:** "haz commit". The user did not itemize which visual criteria they checked, so T-05 step 3's per-item criteria (colour, merged cells, bullet wrapping, `Not applicable` row, dictionary, notice) are **not** ticked on this basis (KZ-002); T-05 still owns them.
- **Commit (user-instructed 2026-10-05):** T-04 committed after the preview.

### T-05 — Rollout and human gates

- **Status:** `[~]` — step 5 (docs) PASS; steps 1–4 are human gates and remain open (tracked in `OPEN-ITEMS.md` §3.3 as G1–G6)
- **Date:** 2026-10-05 · docs on the user's instruction ("sí, haz la documentación")
- **Step 5 (docs) — author:** Leader inline (three small documentation edits; no code). Independence is kept by the Reviewer below.
  - `docs/trd/trd.md` ADR-11 checklist cell: the R3 line, verbatim from the task — "`report_innovation_use` transcribes `innovation_use_validation`; any migration redefining it, `valid_text` or `report_field` must run `report-innovation-use-view.fixture-spec.ts`."
  - `docs/specs/innovation-use/family.md` row 7: `specifying` → `executing`, with the 4 commit ids (unpushed) and the open T-05 gates.
  - `docs/specs/innovation-use/OPEN-ITEMS.md` new §3.3:
    - G1 P-4 Prod MySQL version;
    - G2 P-12 Prod deploy order;
    - G3 visual check, explicitly NOT discharged by the mocked-data preview;
    - G4 OQ-1;
    - G5 P-11/P-16 Dev readings;
    - G6 real-volume timing;
    - FU-1 LATERAL for the other `report_*` views;
    - FU-2 scratch collation defect;
    - FU-3 the 5 pre-existing Nest-bootstrap fixture failures;
    - FU-4 the broken `migration:scan`.
- **Falsifier / red run (task):** `grep -c report_innovation_use docs/trd/trd.md` → `0` at the start of step 5 (observed), then `1` after the edit (observed).
- **Reviewer (`akili-reviewer`, override (a): the ADR-11 line is an obligation other readers execute): PASS** — "All three doc edits for T-05 step 5 are accurate … The ADR-11 line uses the exact R3 wording from `tasks.md:223`, and the family row 7 status and OPEN-ITEMS §3.3 claim nothing beyond what `execution.md`, `design.md` §13/§14 and `tasks.md` RB-2 support." ADVISORY: none.
- **spawns:** reviewer 1 not reported by host, ended complete.
- **Open (human, blocking `main`):** G1 and G2. Also open: G3–G6. T-05 cannot reach `[x]` until they are settled with quoted evidence (KZ-002).

## Summary (as of 2026-10-05)

| Task | Status | Attempts | Review verdicts | Commit |
| --- | --- | --- | --- | --- |
| T-01 view migration | PASS | 2 | 3 (FAIL+PASS lens pair, PASS) | `c26aaff4` |
| T-02 parity + EXPLAIN fixture | PASS | 2 (+2 continuations, 1 stopped probe) | 3 (FAIL, FAIL, PASS) | `0091be2e` |
| T-03 layout migration | PASS | 1 | 1 | `7dd41597` |
| T-04 TS wiring | PASS | 1 | 1 | `abf90565` |
| T-05 rollout + human gates | `[~]` docs PASS; G1–G6 open | — | 1 (docs) | this commit |

- **Budget (design §15):** 5 tasks as estimated; ~1,450 LOC estimated (actual well above it for T-02's fixture, ~1,820 lines alone); review verdicts 9 against ~11. No tripwire fired on review rounds.
- **User-approved spec amendments:** NFR-IUX-002 scoped to indicator 6; NFR-IUX-001 reduced to a structural gate with timing as a reading (DD-4 kept).
- **Pushed:** nothing. The user pushes.

## Pivot Record: QA feedback (2026-10-06) → T-06

- **Trigger:** the user's QA review (first reported as "BI", corrected by the user to QA) asked for the export to keep only one *linked* field, *Linked innovation development*, placed right after *Use level justification*. The user agreed the other three linked cells are fine but not needed now, and expects them to be requested again later.
- **Constraint (user, 2026-10-06):** "las migraciones ya se aplicaron en la db compartida así que ajustes en las migraciones ya no se pueden". `1791300000000` and `1791400000000` are applied on the shared database, so they are immutable (ADR-5). The commits are still unpushed (`git status -sb`: ahead 6).
- **Decision (user-approved plan):** keep the view unchanged, so all 9 cells stay available for a future request. Export 6 columns at 75–80 in the order level · justification · linked dev · actors · organizations · quantifications. Apply the layout change through a **new** migration that touches only the Innovation Use rows and re-orders them among themselves; `down()` restores the 9-row state exactly.
- **Spec amendments (Correction Closure):**
  - `requirements.md`: Executive Summary, §1 affected surface, R-IUX-006 (4 view cells, 1 exported), R-IUX-007 (6 columns 75–80, order, scenario 80 columns), §6 data requirements.
  - `design.md`: Executive Summary layout bullet, §2.1 (new migration row; columns and presentation rows), new §3.2a export subset, §10 rows (unit specs, read-back), **DD-7**.
  - `tasks.md`: new **T-06** and its summary row. T-01…T-04 stay as historical records.
  - Sweep: `grep -n "83|75–83|9 columns|A–CE"` over the three documents. The remaining "9 cells" mentions (R-IUX-001 "Other indicators", NFR-IUX-002) refer to the **view**, which still has 9 cells, and stay true.
  - `git diff`: 7 removed lines, each replaced by its amended form; 72 added.
- **Affected ADR:** none (ADR-5 upheld: no applied migration is edited).
- **Carry:** the T-06 Reviewer brief checks conformance to `requirements.md#R-IUX-006`, `#R-IUX-007` and `design.md#3.2a` / DD-7 as amended 2026-10-06.

### T-06 — QA feedback: export 6 of the view's 9 columns (75–80)

- **Status:** in progress (attempt 1)
- **Date:** 2026-10-06

- **Implementer:** Cursor `grok-4.7-high`, fresh worker, Orca `task_42e47945f204` / `ctx_09a4f0051412`. Brief: `T-06-brief.md` (session scratchpad).

#### Attempt 1 → PASS

- **Files changed:**
  - new: `src/db/migrations/1791500000000-StarRawInnovationUseExportSubset.ts`, its spec, `test/fixtures/innovation-use/star-raw-innovation-use-export-subset.fixture-spec.ts`;
  - modified: `star-results-export.repository(.spec).ts`, `star-results-metadata.columns.ts`, `….sheet-presentation.ts`, `…workbook.handler.spec.ts`, `report-innovation-use-view.fixture-spec.ts`.
  - **Not touched:** `1791300000000` and `1791400000000` (`git diff` empty) and the view.
- **Migration `1791500000000`:**
  - `up`:
    - group `to_col` 83 → 80, keyed on workbook + sheet + label + `from_col = 75` + `to_col = 83`;
    - re-order the 6 kept IU dictionary rows to `MIN(sort_order) + offset` in the §3.2a order (nested derived table, avoiding MySQL 1093);
    - `DELETE` the 3 view-only rows keyed on workbook + fill `FF6A1B9A` + labels.
  - `down`:
    - restore the R-IUX-002…006 order at base+0…5;
    - re-insert the 3 rows exactly as `1791400000000` did, at base+6…8 (new ids — accepted by the Reviewer for NFR-IUX-003: nothing references dictionary ids);
    - group 80 → 83.
- **Red-then-green:** `Expected length: 80 / Received length: 83`; header order `Expected: "Linked innovation development" / Received: "Actors"`.
- **Falsifiers (finished code, reverted):**
  - (a) keys swapped → value-under-header red;
  - (b) `DELETE` by label only → the seeded decoy row from another section (`Linked innovation readiness level`, fill `FF00897B`, sort 70) is lost, round trip red;
  - (c) banner 83 → `Expected value: "C1:CB1"` red;
  - (d) hardcoded `sort_order` → `71…76` expected, `0…5` received.
- **Round trip (seeded, base 71, rolled back):** after `up`: group 75–80, IU rows 71…76 in the §3.2a order, other rows byte-identical. After `down`: groups and kept rows byte-identical incl. ids; re-inserted rows identical except id.
- **Evidence re-run (Leader inline, run alone): VERIFIED.**
  - `npm test -- --silent` → `Test Suites: 424 passed` / `Tests: 4030 passed`;
  - `npm run build` exit 0;
  - `npm run test:fixtures -- --testPathPattern='star-raw-innovation-use|report-innovation-use-view'` → 3 suites, `Tests: 39 passed`;
  - scratch `migration:show`: `[X] 418 StarRawInnovationUseExportSubset1791500000000`, 0 pending;
  - eslint exit 0 and prettier clean on all touched files.
  - The 5 pre-existing Nest-bootstrap fixture failures (OPEN-ITEMS FU-3) are unchanged and not caused by T-06.
- **Reviewer (`akili-reviewer`, override (b): stored fields on shared layout tables / shared export; named checks R-IUX-006, R-IUX-007, design §3.2a / DD-7 as amended 2026-10-06): PASS.** The new migration's WHERE clauses are bounded to the IU identifiers. The re-order is contiguous. `down()` matches `1791400000000`'s rows character by character. 1093 is avoided and executed on real MySQL. Phase 2 selects exactly 6. The read-back covers `BW4:CB4`, `C1:CB1` and `BI4:BV4`.
- **ADVISORY (recorded):**
  - if Dev's INNOVATION USE group was hand-edited away from 75–83, the group `UPDATE` changes 0 rows while the dictionary half applies (strict keys never widen) — the human check on Dev after deploy must confirm the band reads 75–80 (added to T-05 G3/G5);
  - the Done criterion "preview shown before commit" is a human gate.
- **Preview:** the Leader regenerated `~/Downloads/star_results_metadata_innovation_use_preview_v2.xlsx` with the real handler and builder and mocked data; the dictionary in the preview mimics the migration's order. Checked: 80 columns; `BW4:CB4`, `C1:CB1`, `BI4:BV4`; headers 75–80 in the §3.2a order; dictionary rows 108–113 in the same order. **User confirmation pending; commit deferred.**
- **spawns:** implementer (Cursor grok-4.7-high) not reported by host, ended complete · reviewer 1 not reported by host, ended complete.
- **Review rounds spec total:** 11 of ~11 (T-06 was added after the budget was set; no tripwire is claimed for a user-added task).

- **Preview approved:** after seeing `star_results_metadata_innovation_use_preview_v2.xlsx`, the user said "haz commit de T-06 y sigue con T-07" (2026-10-06). It covers the export subset and its order. The per-item T-05 G3 visual checks on real Dev data stay open (KZ-002).

- **Commit:** `2cc75999` (T-06 + the 2026-10-06 spec amendment), on the user's instruction.

## Spec amendment (2026-10-06): linked dev as a hyperlink → T-07

- **Trigger (user):** "es posible que en el campo linked sea un hipervínculo … ARI_CLIENT_HOST podríamos usarlo para armar la url al resultado hacia general information". Approved with "haz commit de T-06 y sigue con T-07".
- **Amendments:**
  - `requirements.md` R-IUX-006: an amendment note and a new scenario "Linked dev is a hyperlink", incl. *BUT must NOT* link `Not provided` / `Not applicable`.
  - `design.md` §3.2a: "Hyperlink (T-07)" paragraph and **DD-8**.
  - `tasks.md`: new **T-07** and its summary row.
  - `git diff`: 1 line removed (design §3.2a paragraph, extended), 44 added.
- **Decision (Leader, stated to the user, not objected to):** the link exists only when the target's `platform_code` is not NULL. A NULL platform falls back to plain text.
- **Carry:** the T-07 Reviewer brief checks conformance to `requirements.md#R-IUX-006` and `design.md#3.2a` / DD-8 as amended 2026-10-06.

### T-07 — Linked innovation development as a hyperlink

- **Status:** in progress (attempt 1)
- **Date:** 2026-10-06
- **Implementer:** Cursor `grok-4.7-high`, fresh worker, Orca `task_8cd5ac814b35` / `ctx_dc9112607999`. Brief: `T-07-brief.md` (session scratchpad).

#### Attempt 1 → PASS

- **Files changed:**
  - new: `src/db/migrations/1791600000000-AddLinkedDevCodeToReportInnovationUseView.ts` + its spec;
  - modified: `star-results-export.repository(.spec).ts`, `star-results-metadata.columns.ts`, `…workbook.handler.spec.ts`, `report-innovation-use-view.fixture-spec.ts`.
  - Applied migrations `1791300000000` / `1791400000000` / `1791500000000` untouched (`git diff` empty).
- **View:** `CREATE OR REPLACE VIEW` = the `1791300000000` definition + the lateral's `CONCAT(r2.platform_code, '-', CAST(r2.result_official_code AS CHAR)) AS dev_code` + trailing `innovation_use_linked_dev_code`. `down()` = `new CreateReportInnovationUseView1791300000000().up(queryRunner)`.
- **Phase 2:** `CONCAT('${ARI_CLIENT_HOST}/result/', iu.innovation_use_linked_dev_code, '/general-information') AS innovation_use_linked_dev_url` (mirrors `platform_link`). Column 77 `hyperlink` with `urlField`, `displayField`, `linkAppearance`, no `emptyDisplay`; still 80 columns.
- **Red run (deviation recorded, Reviewer-accepted):** the pin reds were observed after the code existed, by removing and then restoring the behavior. They are real assertion-level reds (K-004 met), but not a pins-first ordering. They are not to become the norm.
- **Falsifiers (finished code, restored):**
  - (a) `CONCAT_WS` → the platform-NULL case `Expected: null / Received: "907791300652210"`;
  - (b) `emptyDisplay: 'Not available'` → `Expected: "Not provided" / Received: "Not available"`;
  - (c) suffix dropped → the repository-spec substring red (the read-back is mocked, so it cannot see SQL — declared KZ-017);
  - (d) `down()` as `DROP VIEW` → spec (f) red, and the scratch revert gave `ER_NO_SUCH_TABLE`.
- **Evidence re-run (Leader inline, run alone): VERIFIED.**
  - `npm test -- --silent` → `Test Suites: 425 passed` / `Tests: 4036 passed`;
  - `npm run build` exit 0;
  - `npm run test:fixtures -- --testPathPattern='star-raw-innovation-use|report-innovation-use-view'` → 3 suites / `Tests: 41 passed`;
  - scratch `migration:show`: `[X] 421 AddLinkedDevCodeToReportInnovationUseView1791600000000`, 0 pending;
  - eslint exit 0; prettier clean.
- **Reviewer (`akili-reviewer`, override (b): stored view / shared export; named checks R-IUX-006, design §3.2a, DD-8 as amended 2026-10-06): PASS.** The view was compared line by line with `1791300000000`: identical except the two additions. `down()` restores it. No placeholders. The URL mirrors `platform_link`. Column 77 has no `emptyDisplay`, so a `Not provided` / `Not applicable` cell can never carry a URL. The read-back is exact. The fixture covers the whole scope-3 list.
- **ADVISORY (recorded):**
  - the red-run ordering deviation (above);
  - the STAR fixture case inserts `reporting_platforms` 'STAR' when missing and never deletes it (shared-catalog pattern; harmless while `maxWorkers: 1`);
  - TIP/PRMS target URLs (`/result/TIP-<code>/general-information`) are not exercised — confirm the client route grammar before rollout (added to T-05 G3).
- **Preview:** the Leader generated `~/Downloads/star_results_metadata_innovation_use_preview_v3.xlsx` (real handler and builder, mocked data, example host). Column 77: row 6 `{text: 'STAR-1234 - Drought-tolerant bean variety', hyperlink: 'https://star.example.org/result/STAR-1234/general-information'}`, row 7 `Not provided` (plain), row 8 `Not applicable` (plain). **User confirmation pending; commit deferred.**
- **spawns:** implementer (Cursor grok-4.7-high) not reported by host, ended complete · reviewer 1 not reported by host, ended complete.
- **Preview approved:** the user asked whether `star.example.org` was a defect. The Leader explained it is the preview's mocked row; the real URL uses `this.appConfig.ARI_CLIENT_HOST` (`star-results-export.repository.ts:148`). The user then said "sí, haz commit de T-07" (2026-10-06).
- **Dev finding (2026-10-06, user-reported, no change made):** the user's local server against the shared DB failed with `Cannot merge already merged cells` at `ExcelWorkbookBuilder.renderPreamble` (`excel-workbook.builder.ts:226`, the column-group merge loop).
  - The user's screenshot of `report_workbook_column_group` on that DB: `INNOVATION DETAILS 61–87` (sort 10), `INNOVATION USE 75–80` (sort 12), `OICR DETAILS 88–101` (sort 11).
  - Cause: a Dev-only Innovation Development development shifted OICR to 88–101 and added a band over 61–87, which overlaps ours. This **falsifies P-11 on Dev** (it holds on the base branch / Prod).
  - Per the user, that development will be removed on Thursday; its layout rows must be reverted with it (OICR back to 61–74, the INNOVATION DETAILS row deleted) for the export to render on Dev.
  - Our migrations reference no Innovation Development rows (confirmed to the user); no change on our side. Until then the Dev export likely fails for every user.
- **Commit:** T-07 committed on the user's instruction.


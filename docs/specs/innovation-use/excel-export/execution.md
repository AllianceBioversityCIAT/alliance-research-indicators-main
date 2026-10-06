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


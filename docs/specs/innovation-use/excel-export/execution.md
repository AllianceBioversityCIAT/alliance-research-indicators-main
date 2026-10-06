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


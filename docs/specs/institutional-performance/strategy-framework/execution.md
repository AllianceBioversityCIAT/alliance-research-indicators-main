# Execution Log — Institutional Performance / Strategy Framework

## Document Control

- **Spec:** `docs/specs/institutional-performance/strategy-framework` (id `2026-11-strategy-framework`)
- **Branch:** `institutional-kpis` · spec docs committed at `87fcde63b` before execution
- **Approval mode:** `gated` in the proposal; run under the owner's standing direction to continue task to task and stop only on `FATAL_FAIL`, HALT, Pivot or the budget tripwire (recorded as `auto-approved (owner standing direction)` per gate)
- **Leader:** Claude Code, `claude-opus-5-5` (T1) · Implementer: Grok via Cursor CLI (Orca `/orchestration`), fresh worker per task · Reviewer: `akili-reviewer` wrapper (opus, T3, read-only) — standing split: Grok implements, Claude reviews
- **Started:** 2026-11-19
- **Budget (design §14):** 17 tasks · ≈ 9,000 LOC (server ≈ 4,800, client ≈ 4,200) · ≈ 26 review rounds · intermediate tripwire after T-05: server actuals vs 2,000 LOC

## Environment pre-check (2026-11-19)

- `server/researchindicators/.env`: `ARI_MYSQL_HOST=192.168.20.210` (shared Dev — never written), `ARI_TEST_MYSQL_*` = `127.0.0.1:3307/ari_scratch_test` (docker `research_indicators_server_test_mysql`, MySQL 8.0.46).
- The scratch container was stopped; started. Its schema had drifted: 325 applied, 51 pending, first pending failing on `Table 'pi_delegates' already exists` (MySQL 1050).
- **Deviation from `tasks.md` *Shared rules* (owner decision 2026-11-19, "Reconstruir scratch"):** the rule "never run `migration:test:bootstrap` / `baseline:test:load`" was written for the requester's Windows machine, where the local DB held real data. On this machine the local test DB is the disposable scratch. Bootstrap was attempted and failed for a pre-existing reason unrelated to this spec: after the 2026-08-14 baseline, `CreatePiDelegates1787600000000` fails with `Referencing column 'project_id' and referenced column 'agreement_id' … are incompatible` (`agresso_contracts` is `utf8mb3` in the baseline). The migration chain cannot be replayed from the snapshot.
- **Owner decision (2026-11-19):** load a **read-only copy of Dev** into the scratch and apply only this family's migrations on top. Done:
  - `mysqldump --single-transaction --quick --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF --routines --triggers --hex-blob` of `alliancereportingdb` from `ARI_MYSQL_HOST`, run inside the scratch container → 83,329,789 bytes, `-- Dump completed on 2026-11-19 14:52:44`. Read-only: one consistent snapshot transaction, no locks, no writes. Dev size before the dump: 130 MB, 225 tables, 395 `migrations` rows.
  - `DEFINER=` clauses stripped (the Dev definer user does not exist locally; first load failed with MySQL 1449); scratch schema recreated with Dev's default `utf8mb3` / `utf8mb3_general_ci`; load exit 0 → 204 base tables + 21 views (= 225), 24 routines, 395 `migrations` rows, 3,092 `alliance_user_staff` rows.
  - `migration:show` on the TEST datasource (ANSI stripped; the only `error` match is the name `AddedErrorMessageAiReport1781106535639`, K-014): 365 `[X]`, 11 `[ ]` — the 11 are this family's control-lists (`17909000000000…3`) and org-structure (`1791000000000…6`) migrations, merged on this branch but not on Dev.
  - `npm run migration:test:execute` → exit 0, all 11 "executed successfully"; re-count: **0 pending**.
- **Consequence for every task:** "local DB" in `tasks.md` means this scratch (Dev copy + family migrations). It is disposable and owned by this run; the shared Dev DB stays read-only.

## Task Execution History

### Execute-time spec edit — migration block renumbered (P-11, 2026-11-19)

- **Observed before T-01 dispatch** (`git fetch origin`; newest migration timestamp per remote branch): `origin/dev` and the `AC-1797-…` branch hold `1794920220124-addStatusAuditToBilateralProjectMapping.ts` — above the planned block `1793500000000`. `origin/staging`/`origin/main` top out at `1792764939185`; `origin/ci/*` at `1793389030636`.
- **Edit (no change of meaning — P-11 pre-authorised the renumber):** block `1793500000000…003` → **`1795000000000…003`** in `design.md` (§2.1 file table rows 82–87, §3.3 line 159 with the new evidence) and `tasks.md` (T-01, T-02, T-09 scopes). Sweep: `grep -rn 1793500` over the spec folder → 0 after the edit. The P-11 ledger row (design §13) keeps its 2026-11-17 observation as history.
- Carried to the next two Reviewer briefs as a named conformance check: "conformance to `design.md` §3.3 as amended 2026-11-19".

### T-01 — ODS Admin role: enum, guarded migration, pre-merge checks

- **Status:** PASS (attempt 2) — 2026-11-19
- **Dispatch (2026-11-19):** Grok `grok-4.7-high` via Cursor, Orca run `run_674b6b131b1f`, task `task_5d70f00c5268`, dispatch `ctx_da263864eb9e` (retained until PASS). Skills: `nestjs-expert` (task default, no deviation). Effort high (migration on a shared-DB path). Exemplar: `1789000000000-insertInnovationUseLinkedDevRole.ts` + spec. Kaizen rows carried: K-004, KZ-014, K-014, KZ-017. Forward pointers: none (first task).
- **Attempt 1 — Implementer report:** files `sec_role.enum.ts` +1, `src/db/migrations/1795000000000-createOdsAdminRole.ts` +110, `src/db/migration-specs/1795000000000-createOdsAdminRole.spec.ts` +318.
  - Red (greenfield): TS2307 module not found / TS2339 `ODS_ADMIN` missing → then 8 passed. Baseline `grep -c ODS_ADMIN` → 0.
  - Falsifier 1 (`down` counts `is_active = 1` only): inactive case → counts 0 (expected 1), deleted 1, thrown null — red; reverted. Falsifier 2 (`INSERT IGNORE`, no name check): "other name" case → thrown null (expected StringContaining "Hand Made Role") — red; reverted.
  - K-004 build: `const k004WrongType: string = SecRolesEnum.ODS_ADMIN` → TS2322, exit 1; reverted → exit 0. `npx eslint` 3 files exit 0.
  - `npm test -- --silent`: Suites 1 failed / 491 passed / 492; Tests 1 failed / 5482 passed / 5483 — `lenient-callback-json.spec.ts › still parses a well-formed callback body` 5000 ms timeout (file untouched; passes in isolation, 4 passed).
  - Real run on scratch `127.0.0.1:3307/ari_scratch_test`: execute → `INSERT … [11,"ODS Admin",1,"Role for users who maintain the institutional strategy framework and its institutional objectives.",0]`, "executed successfully"; second direct `up()` → only `SELECT`, one row; second CLI execute → "No migrations are pending"; `down` with `sec_user_roles` id 4443 `is_active=0` and `sec_user_role_results` id 1 `is_active=0` → "Cannot remove ODS Admin (sec_role_id 11): sec_user_role_results has 1 row(s); sec_user_roles has 1 row(s)", role kept; test rows deleted; `migration:test:revert` → five COUNTs + `DELETE … [11]`, "reverted successfully", counts 0/0/0; final execute → row `11 | ODS Admin | focus_id 1 | is_internal 0`.
  - `npm run migration:scan` → `MODULE_NOT_FOUND scripts/scan-migration-placeholders.js`, exit 1.
  - **Not Done / Assumptions (verbatim summary):** description is role prose (the spec only requires a non-empty string); a table.column repeated in `information_schema` is counted once; scratch left with the migration applied. No owed items, no blocker → not a continuation.
  - Cannot reach (worker): the spec does not prove the FK walk (the real run does); `npm test` does not run e2e/integration; build does not execute the migration.
- **Leader evidence re-run (non-author, inline): VERIFIED** — `npx jest src/db/migration-specs/1795000000000-createOdsAdminRole.spec.ts` 8/8; `npx eslint` 3 files exit 0; `npm run build` exit 0. `scripts/` holds only `load-baseline.js`; `git log -- scripts/scan-migration-placeholders.js` empty — the script never existed.
- **Attempt 1 — Reviewer (`akili-reviewer`, opus): `STATUS: FAIL`** — no code defect; all three files conform to §3.3 as amended 2026-11-19, D-STF-5, P-2/P-11/P-17/P-22; Disqualifier met (inactive rows inserted on purpose). Two Done criteria unmet, both Leader-owned docs:
  1. *Discovered:* the two read-only Dev pre-merge checks (P-17, P-31) are not in `execution.md` with owner *dev lead*. *Violated:* `tasks.md` § T-01 Scope bullet "Record in `execution.md`…" and Done criteria. *Remediation:* add both SQL statements with owner and timing.
  2. *Discovered:* Done criterion "`npm run migration:scan` clean" cannot be met — the script never existed; server guide §7 records the scanner as withdrawn (K-006); design §3.3 names a gate that does not exist. *Violated:* `tasks.md` § T-01 Done criteria; `design.md` §3.3 SQL text rule gates. *Remediation:* record a spec deviation; stand-in = the real run + a by-hand read for `?` / `:word`; apply to T-02 and T-09. (Reviewer checked by hand: every value bound, the only `?` are real placeholders, comments are TSDoc.)
  - ADVISORY (recorded, not gating): RISK — check-then-act window in `down()` would silently delete an assignment if an FK were `ON DELETE CASCADE`. **Leader check, scratch:** `information_schema.REFERENTIAL_CONSTRAINTS` for `REFERENCED_TABLE_NAME='sec_roles'` → all five FKs `NO ACTION` (`sec_role_endpoint_permissions`, `sec_user_roles`, `sec_role_functional_permissions`, `sec_user_role_contracts`, `sec_user_role_results`) — a late assignment makes the `DELETE` fail, not cascade; not reachable today. READABILITY — the spec's runner stand-in detects "active-only" by `/is_active/`; a comment would help. RELIABILITY — keep the real-run output as the `down` evidence (done above).
- **Leader adjudication:** both issues are in scope and Leader-owned (no Implementer change). Fixed in attempt 2:
  - **Execute-time spec edit (2026-11-19):** `design.md` §3.3 SQL text rule — gate `npm run migration:scan` replaced by "a real run … plus a by-hand read of each migration for `?` / `:word` outside bound placeholders", with an amendment note citing server guide §7 / K-006; `tasks.md` Done criteria of T-01, T-02, T-09 changed the same way. No requirement's meaning changes: the real run, the stronger gate, was already required. Carried as a named conformance check into the next two Reviewer briefs.

#### Dev pre-merge checks — owner: dev lead (read-only on Dev, before the PR with T-01 is merged to `dev`)

The Dev pipeline runs `migration:execute` on deploy (root `CLAUDE.md` §4.3, 2026-08-27 correction), so `up()` runs on Dev at merge. `up()` throws on purpose if id 11 already holds another name (P-17), which would block that deploy.

1. `SELECT sec_role_id, name FROM sec_roles WHERE sec_role_id = 11;` — expected: no row, or one row named `ODS Admin`. Any other name: stop and decide before merging (P-17).
2. `SELECT id, name, start_year, end_year, is_active FROM portfolios;` — feeds the seed's portfolio resolution and the objectives' default year (P-31); record the output in this file.

Not run by the Leader: Dev is shared and the owner runs these checks (standing rule). Read-only state of the scratch copy on 2026-11-19: `sec_roles` max id 10 before T-01.

- **Attempt 2 — Reviewer (same `akili-reviewer` context, scoped to the two attempt-1 issues; code diff unchanged): `STATUS: PASS`** — "Both issues are fixed at source, so T-01 now meets every Done criterion." Dev checks present verbatim with owner, timing, decision rule and reason; `migration:scan` replaced at design §3.3 and T-01/T-02/T-09 Done criteria, remaining hits are history only; by-hand placeholder read met for T-01.
  - ADVISORY: READABILITY (open, non-gating) — comment the `/is_active/` detection in the spec's runner stand-in. RISK — the P-31 output is recorded only once the dev lead runs it; **forward pointer to T-09:** check that the P-31 portfolios output is in this file before dispatching T-09.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer (opus) attempt 1 — 71,784 tokens, 8 tool calls, ended fail; reviewer attempt 2 — not reported by host, ended complete.
- **Requirements covered:** R-STF-013 (role, next free id, focus application, idempotent `up`, guarded `down`); R-STF-014 enum basis.
- **Running totals (budget, design §14):** tasks 1/17 · LOC 429 (server, incl. 318 spec) · review rounds 2/≈26. Within budget.
- **Final verification:** Leader re-run VERIFIED (spec 8/8, eslint 0, build 0); real-run evidence quoted above.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-02 — Framework and objective table migrations

- **Status:** PASS (attempt 3) — 2026-11-19
- **Dispatch (2026-11-19):** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_4f9132062931`, dispatch `ctx_a9b6d68ff3eb` (retained). Skills `nestjs-expert` (default). Effort high. Exemplars `1791000000003-createOrgUnitDelegates.ts` (+ `staff-carnet-column.ts`), `1791000000000-createOrgUnits.ts`, spec layout from T-01. Kaizen carried: K-004, KZ-014, K-014, KZ-017. Forward pointers into T-02: none.
- **Attempt 1 — Implementer report:** new `1795000000001-createFrameworkTables.ts` +114, `1795000000002-createInstitutionalObjectives.ts` +71, specs +138 / +111.
  - P-1 before writing: `rg -l -i 'framework_element|framework_level|FrameworkElement|FrameworkLevel'` over server and client `src` → 0 files. P-30 scratch `SELECT VERSION()` → 8.0.46.
  - Before: `migration:show` (ANSI stripped) 377 `[X]`, 2 `[ ]`; `SHOW TABLES LIKE 'framework%'` empty. Execute exit 0; `indicator_portfolio_key bigint GENERATED ALWAYS AS (IF(is_indicator_level = 1, portfolio_id, NULL)) STORED` + `uq_framework_levels_indicator`; `staff_carnet varchar(10) … utf8mb4_0900_ai_ci`; EXTRA `STORED GENERATED`; all five tables `utf8mb4_0900_ai_ci`.
  - 1062 `Duplicate entry '2' for key 'framework_levels.uq_framework_levels_indicator'`; 1452 on `FK_framework_element_resp_staff_carnet`; 1451 on `FK_framework_elements_parent_id`, child kept.
  - Falsifiers (restored): DROP unique index → both indicator-level inserts pass (2 rows); parent FK CASCADE → child deleted, no 1451. Cleanup: five tables 0 rows.
  - up/down/up: both downs drop in reverse order, SHOW TABLES empty; re-execute "2 migrations are new", five CREATEs, EXTRA again STORED GENERATED.
  - By-hand placeholder read: zero `?` / `:word` in both files incl. TSDoc. Jest: red first (escaped backticks), then 9/9. eslint exit 0. `npm test -- --silent`: 494/494 suites, 5492/5492 tests.
  - Assumptions (no owed items): `staff_carnet` varchar(10) as the live column; `statement`, `position` NOT NULL, `description` NULL; the jest spec asserts DDL text, not MySQL.
- **Leader re-run (non-author, inline): VERIFIED** — jest 2 suites 9/9; eslint exit 0; scratch `information_schema`: EXTRA `STORED GENERATED`; DELETE_RULEs: elements→level/parent/portfolio RESTRICT, responsibles→element CASCADE, →staff RESTRICT, levels→portfolio RESTRICT, IOB→portfolio RESTRICT, IOB links→element RESTRICT, →objective CASCADE.
- **Attempt 1 — Reviewer (`akili-reviewer`, opus): `STATUS: FAIL`** — DDL matches §3.1 exactly; named checks 1 (renumber) and 2 (no `migration:scan`, by-hand read) hold; run evidence meets Tests/Falsifier/Disqualifier/K-006. One issue:
  1. *Discovered:* the scope names an `information_schema.COLUMNS.EXTRA = 'STORED GENERATED'` check inside the migration specs; neither spec has one — `1795000000001-createFrameworkTables.spec.ts:66` is titled as if it proved EXTRA but only asserts the DDL text. The property is proven by the scratch run, but no committed check would catch a regression. *Violated:* `tasks.md` T-02 Scope; `design.md` Testing row "Migration specs"; root `CLAUDE.md` §5 (no doc/code drift). *Remediation:* (a) doc fix — EXTRA is a real-DB check, rename the test; or (b) a committed fixture/integration check seen red once.
  - ADVISORY: RISK — no DB rule stops `level_id` / `parent_id` pointing at another portfolio's row (design I-1 leaves it to the service); **forward pointer to T-05:** service tests must cover the cross-portfolio *level* case, not only cross-portfolio parent. RELIABILITY — `varchar(10)` hard-coded while charset is read at run time (matches live column, baseline:936, `1791000000005`). READABILITY — `idx_iob_portfolio_year` duplicates the leading columns of `uq_iob_portfolio_year_code` (design-mandated; candidate for a later revision). RISK — both `down`s drop user data unguarded (matches §3.3; runbook line). RISK — Prod MySQL version (P-30) unread, human-owned before Prod. **Forward pointer to T-03:** `indicator_portfolio_key` mapped `insert:false/update:false`, `migration:generate` must report no changes.
- **Leader adjudication:** in scope; take (a) + (b) together — the committed check belongs where MySQL is reachable. **Execute-time spec edit (2026-11-19):** `tasks.md` T-02 Scope → migration specs assert the DDL text; EXTRA observed in this task's scratch run and **committed in T-10's schema integration suite**; T-10 Scope gains that assertion (observed red once); `design.md` §10 Testing rows "Migration specs" and "Integration" changed the same way. Meaning unchanged: the EXTRA check stays mandatory and committed, in the suite that can reach it (server guide §9: no MySQL in unit tests). **Forward pointer to T-10** recorded by that Scope line. Rework sent to the same worker (follow-up dispatch `ctx_7e18fce9f7f9`): rename the spec test title / comment only, effort bump high → xhigh not applicable (rename is mechanical; no fix failed).
- **Attempt 2 — Implementer (same worker, follow-up `ctx_7e18fce9f7f9`):** `1795000000001-createFrameworkTables.spec.ts` only — test renamed "contains the STORED generated-column DDL"; KZ-017 header now says it asserts DDL text and the EXTRA read lives in T-10's schema suite. 8 lines replaced, net 0. Jest 5/5, eslint exit 0. **Leader re-run: VERIFIED** (jest 5/5, eslint 0).
- **Attempt 2 — Reviewer: `STATUS: FAIL`** — spec file and four of five doc sites fixed; one stale site: *Discovered:* `design.md:405` P-35 mitigation still "covered by the migration-spec `EXTRA` check". *Violated:* contradicts `design.md:313` and `tasks.md:88`; root `CLAUDE.md` §5. *Remediation:* reword P-35 to the integration-suite placement and grep `migration-spec.*EXTRA`. (Leader's attempt-1 sweep missed the restated claim — K-003 / KZ-005 "sweep the claim, not the string".)
- **Attempt 3 — Leader docs fix:** P-35 mitigation → "covered by the `EXTRA` check in the Integration schema suite (T-10), observed in T-02's scratch run (amended 2026-11-19)". Sweep `grep -n EXTRA` over design/tasks/requirements → design 313, 314, 405; tasks 88, 220 — all consistent.
- **Attempt 3 — Reviewer: `STATUS: PASS`** — "T-02 now passes … DDL matches §3.1 exactly; named checks hold; run evidence observed and confirmed by the non-author re-run; the spec test no longer claims more than it proves; docs no longer drift." No new advisory.
- **spawns:** implementer (Cursor/Grok) ×2 (initial + follow-up) — not reported by host, ended complete; reviewer (opus, one context resumed) — 83,615 → 91,489 tokens reported across attempts 1–2, attempt 3 not reported; ended fail, fail, complete.
- **Requirements covered:** R-STF-002, R-STF-003, R-STF-004, R-STF-005 (schema-level), R-STF-009, R-STF-010 (tables), §7 constraints.
- **Running totals (design §14):** tasks 2/17 · LOC 863 (server: T-01 429 + T-02 434) · review rounds 5/≈26. Within budget.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-03 — Entities, repositories and module shell

- **Status:** PASS (attempt 1) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-medium` via Cursor, task `task_bb1bca4b05e1`, dispatch `ctx_ce91e67e8d59`. Skills `nestjs-expert`. Effort medium (mechanical mapping of an approved schema). Exemplar `src/domain/entities/organizational-structure/`. Forward pointer copied from T-02's Reviewer (`insert:false/update:false` + generate no-diff). `migration:generate` steered to `orm.test.config.ts` (the npm script targets `ARI_MYSQL_*`).
- **Attempt 1 — Implementer report:** new tree `src/domain/entities/strategy-framework/` — 5 entities (+78, +74, +56, +49, +54), 5 aggregate repositories (+10 each), `portfolio-lookup.repository.ts` +34, `strategy-framework.module.ts` +25, `framework-level.entity.spec.ts` +26, `strategy-framework.repositories.spec.ts` +77.
  - Falsifier (`insert:false` removed): `Expected: false Received: undefined at expect(args?.options.insert).toBe(false)` — red; restored.
  - eslint new tree exit 0; jest 2 suites / 9 tests; `npm test -- --silent` 496/496 suites, 5501/5501 tests; `npm run build` exit 0.
  - `migration:generate` on the TEST datasource, three runs: (1) `QueryFailedError: Table 'ari_scratch_test.orm_metadata' doesn't exist` on the pre-existing generated column `result_pool_funding_alignment_sp.active_primary_alignment` — no file; (2) with a temporary empty `orm_metadata`: the only framework SQL is `ALTER TABLE framework_levels CHANGE indicator_portfolio_key … AS (IF(is_indicator_level = 1, portfolio_id, NULL)) STORED NULL` + `UPDATE orm_metadata`, no DROP/ADD; unrelated FK/index drift from org_units*, control_list*, result_pool_funding*, sec_users, pi_delegates, report_workbook*, sync_process_logs, clarisa_science_programs; (3) with the expression row inserted: no `framework_` / `institutional_objective` / `indicator_portfolio_key` statement. Temporary table dropped, generated files deleted.
  - **Not Done / Assumptions (verbatim summary):** "No changes in database schema were found" unreachable on this scratch (unrelated drift; `orm_metadata` missing); module not in `main.routes.ts` / `entities.module.ts`, exports empty (T-07); aggregate repositories other than `PortfolioLookupRepository.findById` are constructor shells. No owed item.
- **Leader re-run (non-author, inline): VERIFIED** — jest 2 suites 9/9; eslint 0; build 0; no tmp migration left; scratch has no `orm_metadata` / `typeorm_metadata` table (cleanup held).
- **Attempt 1 — Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — entities match T-02's DDL column for column (types, lengths, nullability, defaults, index/FK names, ON DELETE); `indicator_portfolio_key` mapped exactly per §2.1 (`generatedType: 'STORED'`, same `asExpression`, `insert:false`, `update:false`) — closes T-02's forward pointer; `PortfolioLookupRepository` DataSource-only, no `CurrentUserUtil` (D-STF-11, P-21), projects `id, name, start_year, end_year, is_active`.
  - (i) Disqualifier intent met by runs 2 + 3 (no drop / re-add; no framework DDL with the expression stored). **Recorded as:** Done criterion "`migration:generate` no-diff" **satisfied by runs 2 and 3, not quoted** — run 1's cause is pre-existing (Dev has no `orm_metadata` while `1786636994078`'s generated column exists). Run 3's expression equality rests on the Reviewer's text comparison with the migration, not on the diff (the row was hand-inserted).
  - (ii) Missing `orm_metadata` row = spec gap, not a T-03 defect. **Execute-time spec edit (2026-11-19):** `design.md` §13 P-35 gains the premise (generate is clean only with the expression in `orm_metadata`; Dev lacks the table; with an empty table generate emits `ALTER … CHANGE indicator_portfolio_key …` — prune it). Documentation of an observed premise; no requirement changes.
  - ADVISORY: RISK — future `migration:generate` output may carry that `CHANGE` (now in P-35). RELIABILITY — `PortfolioLookupRepository.findById` does not filter `deleted_at` / `is_active`; **forward pointer to T-07/T-09:** state the inactive/deleted-portfolio behaviour when turning a missing portfolio into a 404. READABILITY — "read-only" lookup extends `Repository<Portfolio>`; consider a narrower wrapper or a doc note. RISK — **forward pointer to T-07:** carry the `Reflect.getMetadata('imports', EntitiesModule)` module-graph assertion (src `CLAUDE.md` §4, KZ-017). RELIABILITY — MySQL 3105 on a write stays with T-10's insert test.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer (opus) — not reported by host, ended complete.
- **Requirements covered:** R-STF-002, 003, 004, 009 (data mapping); R-STF-012 Details (module, exports reserved).
- **Running totals (design §14):** tasks 3/17 · LOC 1,407 (server; T-03 544) · review rounds 6/≈26. Within budget.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-04 — Pure utilities: tree, codes, errors, constants

- **Status:** PASS (attempt 1) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, task `task_1a109bd96f7d`, dispatch `ctx_40af11d2a1a7`. Skills `nestjs-expert`, `tdd` (task default). Effort high (table-driven algorithms with three falsifiers). Exemplar `org-hierarchy.util.ts` + spec, `org-structure.constants.ts`.
- **Attempt 1 — Implementer report:** new `framework-code.util.ts` +85 / spec +113, `framework-tree.util.ts` +171 / spec +229, `framework-errors.ts` +42 / spec +76, `strategy-framework.constants.ts` +55 / spec +42.
  - Pre-implementation: 4 suites FAIL, TS2307 (setup red, not an assertion red). After: 35 passed. eslint 8 files exit 0. `npm test -- --silent` 500/500 suites, 5536/5536 tests.
  - Falsifiers (each restored): (1) child scan `parentId === parentId` → row «moved 1.7 under area 2 still blocks 1.7 under area 1» (`framework-code.util.spec.ts:67`): Expected `"code": "1.8"`, Received `"1.7"`; (2) `escapeRegExp` removed → row «parent 1.1 does not match a 121.x code»: Expected `"1.1.1"`, Received `"1.1.4"`; (3) root scan at depth 1 only → row «root skips a hand-typed 5 on a dimension»: Expected `"6"`, Received `"5"`.
  - Assumptions (no owed item): `DEFAULT_LEVELS.plural_name` from R-STF-002; move-violation texts not fixed by the design (literal: «no level below <name>», «an element never changes depth»); `wayOut` interpolates N as is («those 1»); `proposeElementCode` throws `Error` on an unknown parent (service resolves 404 first).
  - Cannot reach: MySQL / collation, `GlobalExceptions` JSON (tests read `getResponse()`), a cycle through the API, BigInt vs Number.
- **Leader re-run (non-author, inline): VERIFIED** — jest 4 suites 35/35; eslint 0; build 0.
- **Attempt 1 — Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — way-out texts match design §5.4 L230 exactly; R-STF-006 fixes no way-out wording; Disqualifier met (`1.1, 1.3 → 1.4` gap; `A.b` / `Axb.9` non-numeric + escape near-miss; `IOB-1, IOB-3, IOB-x → IOB-4`); four-level descendant counts recounted by hand; verbatim texts §5.3 L225, §5.2 L213, A6 L194, §5.2 L217 reproduced; 30-char boundary both sides; `parentId: null` rejected first (A6); error shapes per §2.1 L73.
  - ADVISORY: (1) **RISK, spec tension (reachable):** for N = 1 the §5.4 templates give «Unlink it from those 1 institutional objectives first.» / «Delete or move its 1 Indicators first.», while §5.4's own description example for N = 1 is singular — design contradicts itself; the test pins the plural text. **Presented to the owner as a one-line amendment (2026-11-19) — answer recorded below when given; T-05 is not dispatched before it.** (2) RELIABILITY — `moveViolation` does not check portfolio; **forward pointer to T-05:** R-STF-003 AC.2 "parent of another portfolio" on a move is enforced in the service (with T-02's cross-portfolio *level* pointer). (3) RELIABILITY — `conflict(description, '')` drops the field (`''` falsy); not reachable today; prefer `field !== undefined`. (4) READABILITY — the four-level fixture comment overloads "gap". (5) KZ-017 — GlobalExceptions JSON, collation, real level table belong to T-05 / T-07 / T-10.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer (opus) — not reported by host, ended complete.
- **Requirements covered:** R-STF-002 AC.1 (four-level fixture), R-STF-003 (util level, AC.2), R-STF-005, R-STF-006 (helpers).
- **Running totals (design §14):** tasks 4/17 · LOC 2,220 (server; T-04 813) · review rounds 7/≈26. Within budget; intermediate tripwire is after T-05 (2,000 LOC server **for T-01…T-05** — already above it at T-04: see the note below).
- **Approval:** continue gate `auto-approved (owner standing direction)`.

## Budget Tripwire: T-04 (2026-11-19)

- **Measured by the Leader:** `git diff --numstat e75276055 HEAD -- server` → **2,199 lines added** (1,069 production / 1,130 in `*spec.ts`, 51 %). Budget (design §14): intermediate tripwire **2,000 LOC server after T-05**; whole server ≈ 4,800. **Delta: +199 over the tripwire, one task early;** T-05…T-10 (writes, controller, seed, integration) remain.
- **Cause:** tests are half the diff (migration specs with real-run stand-ins, table-driven util specs), as in the sibling spec (org-structure slice 1: 56 % tests).
- **Owner decision (2026-11-19):** *Re-basar y seguir* — server ≈ 7,000, whole spec ≈ 12,000, review-round cap unchanged; next check after T-08 (server vs 5,000). Applied to `design.md` §14 (new row; the original row kept as history).

## Spec tension: way-out texts for N = 1 (2026-11-19)

- **Source:** T-04 Reviewer advisory 1 — design §5.4 templates yield «Unlink it from those 1 institutional objectives first.» / «Delete or move its 1 Indicators first.» while §5.4's own N = 1 example is singular.
- **Owner decision (2026-11-19):** *Singular cuando N = 1.* **Execute-time spec edit:** `design.md` §5.4 step 2 gains the N = 1 wording; decisions log row **D-STF-27**. Changes a text, not an approved requirement (R-STF-006 fixes no way-out wording). Code change dispatched as **T-04 amendment** (below) before T-05; carried as a named conformance check into the next two Reviewer briefs.

### T-04 amendment — D-STF-27 singular way-out texts

- **Status:** PASS (attempt 1) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-medium`, task `task_6f366e840ee5`, dispatch `ctx_35a1c7c48e99`. Effort medium. Scope: `framework-errors.ts` + spec, plus T-04 Reviewer advisories 3 (`conflict` keeps `field` when `!== undefined`) and 4 (fixture comment).
- **Implementer report:** `framework-errors.ts` +24/−7 (`childrenWayOut(count, levelName, pluralLevelName)`; three N = 1 branches), `framework-errors.spec.ts` +32/−2 (N = 1 / N = 2 table per kind; empty-field assertion), `framework-tree.util.spec.ts` +2/−2. Jest 6 suites / 50 tests; eslint 0; build 0. Falsifier (IOB N = 1 branch reverted): `framework-errors.spec.ts:66` Expected "Unlink it from that institutional objective first." Received "Unlink it from those 1 institutional objectives first." — restored. Assumption: only N === 1 is singular (N = 0 never reaches the helpers — §5.4 "Any non-zero").
- **Leader re-run (non-author, inline): VERIFIED** — jest 6 suites 50/50; eslint 0; build 0.
- **Reviewer (T-04 context resumed): `STATUS: PASS`** — three singular texts word for word against §5.4 L230 / D-STF-27 L359; plurals unchanged; advisories 3 and 4 fixed; signature change breaks no caller (T-04 Consumers: none).
  - ADVISORY → **forward pointer to T-05:** pass the level's `name` as singular and `plural_name` as plural to `childrenWayOut` (both strings — a swap compiles); plus the move-time same-portfolio check in the service (T-04 advisory 2) and the cross-portfolio *level* case (T-02).
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — not reported by host, ended complete.
- **Running totals:** tasks 4/17 (+ amendment) · server LOC ≈ 2,250 · review rounds 8 / ≈ 26 · re-based budget server ≈ 7,000.

### T-07 — Read service, usage registry, context

- **Status:** PASS (attempt 1) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-high`, task `task_99303f627a20`, dispatch `ctx_490862ab888d`. Skills `nestjs-expert`, `api-design-principles`, `tdd` (task default). Effort high. Exemplars `org-structure-read.service.ts`, `org-unit-usage.registry.ts`. Forward pointer from T-03 (inactive/deleted portfolio behaviour) and D-STF-27 (helper argument order) copied into the brief.
- **Implementer report:** `framework-read.service.ts` +726 / spec +905; `framework-usage.registry.ts` +85 / spec +147; `strategy-framework.module.ts` +12/−4 (exports both); `portfolio-lookup.repository.ts` +12 (`findAll`); repositories spec +21. eslint 7 files 0; jest 3 specs 47 passed; `npm test -- --silent` 502/502 suites, 5581/5581 tests; build 0.
  - Falsifier 1 (`PortfoliosService` injected): "reads portfolios through PortfolioLookupRepository, not PortfoliosService" — Expected "PortfolioLookupRepository", Received "PortfoliosService" (spec:106); "instantiates outside a request" — Nest can't resolve PortfoliosService (spec:120). `scope:options` row stayed green. Restored.
  - Falsifier 2 (editor fields in the A1 mapper): "A1 has no editor fields" — Expected path: not "usage", Received value: {} (spec:494). Restored.
  - **Assumptions (design silent; Reviewer: none contradicts the spec):** 404 only when `findById` is null — an `is_active = false` portfolio stays readable (soft delete sets `is_active = false` with `deleted_at`, `portfolios.service.ts:139-140`); "active" (§5.1) applies to A0 and the default; `start_year` tie → lower id; no active portfolio → `defaultPortfolioId` null; `usageLabels` once at A1e top level; IOB rows natural order; R-STF-015 AC.2 follows §5.1 and depends on P-31; "This portfolio has no framework yet" is client text, A1e delivers the virtual levels. **This answers T-03's forward pointer.**
- **Leader re-run (non-author, inline): VERIFIED** — jest module 8 suites 89/89; eslint 0; build 0.
- **Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — A0/A1/A1e/A2/A8 match §4 field for field; A1 carries no editor fields (D-STF-22); empty-portfolio shapes per R-STF-012 AC.1; virtual `DEFAULT_LEVELS` only when no levels; D-STF-27 texts via `framework-errors.ts`; §5.1 rule in order after the active filter; exports both, never depends on `PortfoliosService` (P-21); registry dedup/counters per §5.6; Disqualifier met (overlapping portfolios 3 and 5, gap year 2033, pre-start 2010, all-inactive case).
  - (b) Falsifier text met via instantiation; but `scope:options` can never go red for this hazard (Nest propagates request scope at runtime only) — K-004: not cited as evidence. **Execute-time spec edit (2026-11-19):** T-07 Falsifier text now names `design:paramtypes` + instantiation and records why `scope:options` cannot go red. Test-specificity improvement (a request-scoped stand-in) recorded, not done.
  - ADVISORY: (2) READABILITY — indicator level inferred from `responsibles !== undefined`; mapping `isIndicatorLevel` would be direct. (3) **API CONTRACT — forward pointer to T-08 review:** §4 A1e may read `usageLabels[]` as per element; the implementation puts it at top level — confirm and log a design decision before the client (T-11+) relies on it. (4) RELIABILITY — A8 builds the whole A1e (≤ 500 ids per provider) for one element; watch with child 4's KPI provider. (5) RESILIENCE — a rejecting provider counter makes A1e/A8 `500`; no provider registered in this spec.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — not reported by host, ended complete.
- **Requirements covered:** R-STF-012, R-STF-002 AC.1 (read), R-STF-015 AC.2 (rule), R-STF-009 Details (default year), R-STF-007 (counts, `deletable`, `blockers`).
- **Running totals (design §14, re-based):** tasks 5/17 · server LOC ≈ 4,150 (`git diff --numstat` at commit) · review rounds 9/≈26.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-05 — Element writes, responsibles, staff search, lazy levels, locks

- **Status:** PASS (attempt 1) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-high`, task `task_6c8ccf669fe0`, dispatch `ctx_0ed087a8fb65`. Skills `nestjs-expert`, `error-handling-patterns`, `tdd`. Effort high. Exemplar `organizational-structure.service.ts` + dto/ + write repository. Forward pointers copied: T-02 (cross-portfolio level, I-1), T-04 (move same-portfolio), D-STF-27 (`childrenWayOut` argument order).
- **Implementer report:** `strategy-framework.service.ts` +940 (element half), spec +1121; DTOs create +80, update +82, search-staff +19, element-id-param +12, `framework-write.dto.spec.ts` +146; module +4/−1 (provider, not exported). Jest (service, DTO, read specs) 92/92; eslint 8 files 0; build 0; `npm test -- --silent` 504/504 suites, 5643/5643 tests.
  - Reds (restored): greenfield TS2307; "rejects a newly added inactive staff id" resolved `{"id":22,"code":"1.2.2","source":"read"}` (spec:244); "maps a staff-foreign-key 1452 to 400 responsibleCarnets" Expected 400 Received 404 (spec:1057); "locks the portfolio row before any other statement" expected `SELECT id FROM portfolios WHERE id = ? FOR UPDATE`, received the `framework_levels` SELECT (spec:317).
  - Assumptions: R-STF-001 cross-portfolio *link* is T-06 (matches `tasks.md` §3 coverage); 500 cap names field `portfolioId`; `position` = list index; empty array on a non-indicator level writes no rows; empty description → null; machine tokens rejected by the T-08 guard, not the service.
- **Leader re-run (non-author, inline): VERIFIED** — jest module 10 suites 151/151; eslint 0; build 0.
- **Reviewer (`akili-reviewer`, opus, single reviewer over the whole diff): `STATUS: PASS`** — create/move/responsibles/delete/staff-search order and rules match §5.2–5.4 and I-1…I-8; constraint-name mapping matches the T-02 migrations exactly; staff SQL identical to `org-structure-write.repository.ts` `searchActiveStaff`; all three forward pointers have spec rows; Disqualifier honoured.
  - ADVISORY: (1) the I-1 *level* check is unreachable on a real DB (`loadLevels` filters by portfolio) — **recorded: I-1 for the level holds by construction**; its 400 names `field: 'levelId'`, absent from A5 (cosmetic). (2) Delete blockers are read outside the delete transaction; children/IOB links are FK-protected (1451 → `refusalAfterRace`), but a future provider without an FK to `framework_elements` could race — **forward pointer to child 4 (institutional-indicators) spec.** (3) R-STF-003 BUT "another Dimension" parent is covered at util level, not by a service row. (4) **Doc drift fixed (execute-time edit 2026-11-19):** design §5.4 step 2 example sentence "…that objective first." → "…that institutional objective first." to match D-STF-27. (5) **Forward pointer to T-06:** the IOB-link `FK_iob_elements_element_id` 1452 row belongs on the link insert (the T-05 row proves only the mapper branch).
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — 131,446 tokens, 16 tool calls, ended complete.
- **Requirements covered:** R-STF-003, 004, 005, 006 (elements), R-STF-007 (lazy levels), R-STF-001 AC.1 (element side).
- **Running totals:** tasks 6/17 · server LOC **6,549** (`git diff --numstat e75276055 -- server`, incl. this task: 3,049 production / 3,500 tests) · review rounds 10/≈26.

## Budget Tripwire: T-05 (2026-11-19)

- Re-based budget (design §14, 2026-11-19): server ≈ 7,000; **next check "after T-08: server vs 5,000"**. Measured after T-05: **6,549** — +1,549 over that check, three tasks early; server remaining: T-06 (IOB writes), T-08 (controller), T-09 (seed + data file), T-10 (8 integration suites).
- Cause: tests 53 %; T-05 alone +2,400 (service 940 + spec 1,121).
- **Stopped for the owner's decision** (tripwire is never auto-approved).
- **Owner decision (2026-11-19):** *Re-basar a ~18k y seguir* — server ≈ 12,000, whole spec ≈ 18,000, review-round cap unchanged; next check after T-10. Applied to `design.md` §14 (new row; earlier rows kept as history).

### T-06 — Institutional Objectives writes and carry forward

- **Status:** PASS (attempt 1) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-high`, task `task_37034b6017ec`, dispatch `ctx_e68ef5261bc9`. Skills `nestjs-expert`, `error-handling-patterns`, `tdd`. Effort high. Exemplar: T-05's element half of the same service. Forward pointer copied: T-05 (the IOB-link 1452 row on the link insert).
- **Implementer report:** `strategy-framework.service.ts` +562/−4 (IOB half), spec +701/−23, `framework-read.service.ts` +13, DTOs create-IOB +60, update-IOB +58, carry-forward +15, `framework-write.dto.spec.ts` +83. Initial red TS2339 (`createObjective`). Falsifier 1 — "rejects a target year that already has objectives and writes nothing": Expected length 0, Received 1 (insert IOB 2027 `IOB-1`); Falsifier 2 — "rejects a link to a non-indicator element with its code and stores nothing": Expected 0, Received 1; both restored. eslint 7 files 0; jest 3 specs 114; `npm test -- --silent` 504 suites / 5665 tests; build 0.
  - Assumptions: texts not fixed by the design — "linked indicators are not at the indicator level: <codes>", "linked indicators belong to another portfolio: <codes>", "the next year is outside the portfolio", "the year has no institutional objectives", "the target year already has institutional objectives"; year range reuses "year must be between X and Y"; update locks the IOB row then the portfolio (PATCH carries no `portfolioId`); `LoggerUtil` line on IOB delete; IOB delete 1451 fallback uses `reason: 'referenced'` (not named by the design).
- **Leader re-run (non-author, inline): VERIFIED** — module jest 10 suites 173/173; eslint 0; build 0.
- **Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — R-STF-009 AC.1/AC.2, R-STF-010 incl. BUT, R-STF-006, R-STF-001 (own row: 400 `elementIds`, code `1.1.1` named, zero inserts); §4 A9–A11, §5.2 step 8, §5.4 step 6, §5.5, §5.6; forward pointer honoured (1452 on the link insert, misplaced T-05 row removed); copy only inserts, harness throws on unexpected SQL (Disqualifier met); texts contradict nothing fixed.
  - (a) Lock order: no deadlock constructible today (create/carry forward never lock existing IOB rows; insert-intention not blocked by PK record locks; IOB delete takes no portfolio lock) — serialization, not a cycle; design prescribes no IOB/portfolio order.
  - ADVISORY: RESILIENCE — make one global order portfolio → IOB (plain read of `portfolio_id`, lock portfolio, lock and re-check the IOB) before any future path locks IOB rows under the portfolio; **forward pointer to T-10:** the concurrency suite includes *update vs create on the same portfolio*. RELIABILITY — no service rows for update `elementIds` replace / `[]` clear, year change (range, code collision), cross-portfolio link on update (traced correct by hand). READABILITY — duplicated `trim` helper and `ObjectiveRow` type. RISK — `reason: 'referenced'` recorded above as an assumption.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — not reported by host, ended complete.
- **Requirements covered:** R-STF-009, R-STF-010, R-STF-006 (IOB), R-STF-001 (IOB links).
- **Running totals:** tasks 7/17 · server LOC ≈ 8,050 (re-based server ≈ 12,000) · review rounds 11/≈26.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-08 — Controller, guards, Swagger, module wiring

- **Status:** PASS (attempt 2) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-high`, task `task_b9d064935454`, dispatch `ctx_13825a56b971` (rework follow-up `ctx_8342d5a14e8f`). Skills `nestjs-expert`, `api-design-principles`. Effort high. Exemplar `organizational-structure.controller.ts` + specs. Swagger checked without the shared DB. T-07's `usageLabels` contract question carried.
- **Attempt 1 — Implementer report:** `strategy-framework.controller.ts` +470, controller spec +597, `strategy-framework.swagger.spec.ts` +140, `strategy-framework.global-exceptions.spec.ts` +97, `dto/framework-query.dto.ts` +88, `dto/framework-swagger.dto.ts` +168, module +4/−1, `entities.module.ts` +2, `entities.module.spec.ts` +16, `main.routes.ts` +5. eslint 0; 4 specs green; `npm test -- --silent` 507/507 suites, 5772/5772 tests ("worker failed to exit gracefully", exit 0); build 0.
  - Falsifier 1 (import removed, route node kept): `entities.module.spec.ts:184` `toContain` Expected `[Function StrategyFrameworkModule]` — red; restored. Falsifier 2 (`HumanCredentialGuard` removed from `deleteElement`): "A7 with roles [11] and a machine credential is 403" Expected 403 Received 200 (`controller.spec.ts:383`) — red; restored.
  - Swagger: `SwaggerModule.createDocument` over a test app (prefix `api`, no shared DB): tag "Strategy Framework" on **16 operations** = §4's 13 rows / 16 method+path pairs; none under `/v1/`.
  - Assumptions: A3 uses `getFramework` / `listObjectives` + `proposeElementCode` / `proposeIobCode`; A3 parent of another portfolio → 404 `parentId` (A5 → 400); A11 200, A5 and A10 POST 201.
- **Leader re-run (non-author): VERIFIED** — jest module + `entities.module.spec.ts` 14 suites 286/286; eslint 0; build 0.
- **Attempt 1 — parallel-lens review (authorization surface):**
  - **Reviewer A (reliability + risk): `STATUS: PASS`** — every handler's `@Roles` / guards match R-STF-014, §4, §8, D-STF-20; consumer reads A1/A2 unrestricted; `[9]`/`[3]` 403 over real HTTP; exact role metadata so the SYSTEM_ADMIN bypass (P-4) cannot hide a missing `@Roles`; no `sec_role_endpoint_permissions` (P-6); 7/7 writes have a real-guard machine-token case + a metadata sweep over non-GET handlers; A3 404 is within §4 ("400 · 404 parent"); literal routes before `:id`; R-STF-013 AC.2 covered with a `[9]` control. ADVISORY: live `/swagger` count not observed (**forward pointer to T-10:** quote the live operation count once when the app boots); `forbidNonWhitelisted` on A1/A2 rejects extra query params like `_=123` (§4 requires strictness only on writes); `Number(part)` → NaN delegated to the read service; A3 loads the full view to propose one code (NFR-STF-001 watch).
  - **Reviewer B (readability + resilience, contract): `STATUS: FAIL`** — code conforms (routes, roles, guards, 201/200, wiring, Swagger tag check; `GlobalExceptions` → `errors.blockers` / `errors.field` per `global.exception.ts:33-35`). One issue: *Discovered* — A1e puts `usageLabels` once on the view; §4 (design:189) says "per element … and `usageLabels[]`"; no decision records it; the Swagger text argues with the spec. *Violated* — design §4 A1e; root `CLAUDE.md` §5. *Remediation* — log a decision, amend §4, make the Swagger text cite it.
- **Owner decision (2026-11-19):** keep `usageLabels` **once per view**. **Execute-time spec edit:** design §4 A1e row amended; decision **D-STF-28** logged.
- **Attempt 2 — Implementer (same worker):** A1e `@ApiOperation` description, `FrameworkEditorViewDto.usageLabels` description and DTO comment rewritten to state the contract and cite D-STF-28; swagger spec assertions updated. No behaviour change. 2 suites 104 tests; eslint 0; build 0. **Leader re-run: VERIFIED** (14 suites 286/286; eslint 0; build 0).
- **Attempt 2 — Reviewer B: `STATUS: PASS`** — spec and code agree; no text argues with §4; tests pin both descriptions and the absence of per-element `usageLabels`.
  - ADVISORY (open, non-gating): Swagger response schemas describe the payload as the whole body (real body: envelope with `data`) — generated clients would read `body.levels` as undefined; 409 `blockers` / 400 `field` responses undocumented; `ElementIdParamDto` reused for `objectives/:id`; A3 read weight; two near-duplicate descriptions both pinned.
- **spawns:** implementer (Cursor/Grok) ×2 — not reported by host, ended complete; reviewer A — 93,279 tokens, 9 calls, complete; reviewer B — 101,860 tokens / 13 calls (attempt 1, fail), attempt 2 not reported, complete.
- **Requirements covered:** R-STF-014, R-STF-013 AC.2, NFR-STF-003, NFR-STF-005.
- **Running totals:** tasks 8/17 · server LOC ≈ 9,600 (re-based server ≈ 12,000) · review rounds 14/≈26.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

## Dev pre-merge checks — results (2026-11-19 20:16:34, run by the Leader at the owner's request)

Read-only session on `ARI_MYSQL_*` (`SET SESSION TRANSACTION READ ONLY; START TRANSACTION READ ONLY; … COMMIT`), host `dbprod04.cgiarad.org`, database `alliancereportingdb`. No write issued.

1. **P-17** — `SELECT sec_role_id, name FROM sec_roles WHERE sec_role_id = 11;` → **no row** (`COUNT(*) = 0`). id 11 is free on Dev; T-01's `up()` will insert `ODS Admin` and will not throw. Re-check only if the merge is delayed (another branch could take id 11).
2. **P-31** — `SELECT id, name, start_year, end_year, is_active FROM portfolios;` →

   | id | name | start_year | end_year | is_active |
   | --- | --- | --- | --- | --- |
   | 1 | Portfolio 1 | 2010 | 2025 | 1 |
   | 2 | Portfolio 2 | 2026 | 2030 | 1 |

   **Forward pointer to T-09 (answered):** the seed's target portfolio is **Portfolio 2 (id 2, 2026–2030)**; on 2026-11-19 it is the only portfolio containing today, so the §5.1 default rule resolves to it (R-STF-015 AC.2). The scratch copy holds the same two rows.

## Session pause (2026-11-19)

- **Done:** T-01…T-08 (+ T-04 amendment), all PASS, committed on `institutional-kpis` (not pushed). Server LOC 9,600 (re-based server ≈ 12,000; next budget check after T-10). Review rounds 14/≈26.
- **Next:** T-09 (seed: generator, committed data file, seed migration — unblocked by P-31 above), then T-10 (integration suites; carries forward pointers from T-02 EXTRA check, T-06 update-vs-create concurrency, T-08 live Swagger count). Client T-11…T-16 after; UI changes stay uncommitted until the owner's visual approval.
- **Environment:** scratch `127.0.0.1:3307/ari_scratch_test` = Dev copy + family migrations + `1795000000000…002` applied. Docker container `research_indicators_server_test_mysql` must be running.
- No Orca worker left open for this spec.

## Session resume (2026-11-19, later)

- Seed sources were not on this machine (spec read them from `D:\OneDrive…`). The owner supplied the three workbooks from `~/Downloads/`; the canvas file `project/kpi-framework.json` was fetched from artifact `8tak5qfvNbBhfaH8DvWDpg` (version `1795121106-a3bd`). All four staged in the session scratchpad `t09-sources/` with sha256 (recorded in T-09).
- T-09 (server) and T-11 (client) dispatched in parallel — different packages, editing only; each worker ran its own targeted specs; the Leader ran both full suites sequentially after both reported (root `CLAUDE.md` §4.3).

### T-11 — Client access: roles, guard, sidebar, routes, interceptor exemption, accent tokens

- **Status:** PASS (attempt 1) — 2026-11-19 · **not committed** (UI waits for the owner's visual approval)
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_f6fe03f1b69e`, dispatch `ctx_112bc11cba9e` (retained until PASS, then released). Effort high (shared surfaces). Skills `angular-developer`, `ui-ux-pro-max` — **deviation:** the task names `impeccable-bridge`, which is not installed on this machine; its "Design route" line was skipped and the report reads `design route: impeccable-bridge not installed; finish review: not run (AKILI execute)`. Exemplars `center-admin.guard.ts`, `canAccessCenterAdmin`, existing sidebar groups, `isPrmsSyncError`, `--ac-pfm-*`. Kaizen carried KZ-001, KZ-003, K-004/KZ-014, K-014, KZ-017. Forward pointers into T-11: none.
- **Implementer report:** `roles.service.ts` +6 (+spec 16), `ods-admin.guard.ts` +12 (+spec 49), `app.routes.ts` +26 (`administration/ods-admin/framework`, `…/institutional-objectives`, `canMatch: [odsAdminGuard]`), placeholder `framework.component.ts` / `institutional-objectives.component.ts` (11 each, until T-12/T-16), sidebar `.ts` +23, `.html` gate +1/−1, spec +170, interceptor +11 (+spec 50), `colors.scss` +11, `README.md` +9, `docs/ux-ui/design.md` §7.1 +1. Baseline greps re-observed 0 before editing.
  - Falsifier 1 (gate at `.html:73` unchanged): ODS-only DOM expanded and collapsed — `expect(expandedLabels()).toEqual(['ODS Admin'])` received `Array []` (2 failed) — red; restored. Falsifier 2 (5xx exempted too): "should show toast when 500 comes from /strategy-framework" — `Number of calls: 0` — red; restored.
  - Verification: 11 named specs 338/338 (`--coverage=false`; `jest.config.ts` collects coverage and a targeted run trips the project floor); `npm run lint -- --quiet` clean; `npm run build` exit 0; `tsc -p tsconfig.spec.json` 945 → 942, touched specs hold only pre-existing TS2352 ×4 (sidebar) and TS2769 ×1 (interceptor).
  - Accents: light `#5c7a14 #c05612 #1f5fa8 #1e7a42`, dark `#d4e06a #f0a15a #79b4ea #67d092`; ≥ 4.20:1 on `#fff`/`#f5f5f5`, ≥ 6.81:1 on `#191919`/`#23272d` (the real card arrives in T-12/T-13 — HITL check stays open, T-17).
  - Assumptions: route paths as above (confirmed by the Reviewer against design §6.1 / §2.1); placeholders until T-12/T-16.
- **Leader re-run (non-author): VERIFIED** — 14 suites / 379 tests (sidebar, platform, roles, all guards, interceptor, to-promise, every spec mocking `canAccessCenterAdmin|canAccessAppConfiguration`); lint clean. After both workers reported: **full client suite 392/392 suites, 9235/9235 tests**; `npm run build` exit 0 (budget warnings pre-existing — sidebar scss 6.87 kB untouched by this task).
- **Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — R-STF-013 AC.2, R-STF-014 AC.2, R-STF-015 AC.1, NFR-STF-004 (tokens), §2.1, §6.1, §6.7, D-STF-25, P-25/P-34; ODS-only and Center Admin cases assert rendered DOM with distinguishing mocks; group order Center admin → ODS Admin → System admin; `/pool-funding-*` tests unchanged.
  - ADVISORY: RISK — D-STF-26 read "`400`/`409`" while §2.1 and the task say every 4xx except 401, so `403`/`404` are silent too; **forward pointer to T-12:** the page must render every 4xx inline through `frameworkErrorOf` (incl. `403`, `404`). READABILITY — substring match `/strategy-framework` would also exempt a future `/strategy-framework-x`. RELIABILITY — contrast measured on existing surfaces, not the outline card; HITL (T-17). RESILIENCE — full suite + build outstanding at review time (since run, green).
- **Decision (execute-time spec edit):** `design.md` §12 D-STF-26 wording aligned with §2.1 and T-11 ("every `4xx` except `401`"); no change of meaning — §2.1 and the approved task already said it. Carried as a named conformance check into T-12's Reviewer brief.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — not reported by host, ended complete.
- **Requirements covered:** R-STF-013 AC.2, R-STF-014 AC.2, R-STF-015 AC.1, NFR-STF-004 (tokens).
- **Running totals:** tasks 9/17 (T-09 under review) · client LOC ≈ 400 · review rounds 15/≈26.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-09 — Seed: generator, committed data file, seed migration

- **Status:** PASS (attempt 1) — 2026-11-19
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_ccebfaa40682`, dispatch `ctx_c394e2995760` (follow-up `ctx_efff6ad34d59` for the header fix; released after PASS). Skills `nestjs-expert`, `anthropic-skills:xlsx` (task default). Effort high. Exemplars `org-structure.seed.ts`, `1791000000004-seedOrgStructure.ts`, `1795000000001/2` + specs. Forward pointer copied: P-31 → Portfolio 2 (id 2). Kaizen carried K-004/KZ-014, K-014, KZ-017.
- **Sources (staged in the session scratchpad `t09-sources/`):**

  | File | sha256 | `core.xml` modified | note |
  | --- | --- | --- | --- |
  | `2026_Strategic-Objectives-Tracking-Tool.xlsx` | `b87a5f5064084c398f5a242ee382cc0482fc8285a87775155d9f59b804d152ab` | 2026-11-19T20:18:40Z | re-saved by the owner after the spec's 2026-11-17 read; counts unchanged |
  | `Alliance-Strategy-2026-2030_20260902.xlsx` | `22b0250f844cb43b26ff65174075e65e6c15649c25d725be19d70b13008c61f8` | 2026-10-22T14:16:16Z | matches C-5 date |
  | `Master-Monitoring-Framework_5.28.2026-Combined_20260818_adjusted_MA_v2.xlsx` | `4a17bc155059c73180b258f44d29c1086b69969a3883e127d09744ea87ceb203` | 2026-11-19T17:23:35Z | newer than C-6's 2026-11-10 |
  | `project/kpi-framework.json` (artifact `8tak5qfvNbBhfaH8DvWDpg`, version `1795121106-a3bd`) | `456735a99e9f8c3c1ce7634b869684add51ec97aac60288e597a8169eefcb294` | n/a | 32 `resp` entries |

- **Generator command (throw-away, not committed):** `python3 <scratchpad>/t09-generator/generate_strategy_framework_data.py --sources <scratchpad>/t09-sources --out server/researchindicators/src/db/seeds/seed-data/strategy-framework.data.ts`. Non-person tokens skipped: `TBC and regions`, `or rep TBC` (×2), `BOF rep` (×2), `?`.
- **Implementer report:** `seed-data/strategy-framework.data.ts` +1127 (generated), `strategy-framework.data.spec.ts` +140, `strategy-framework.seed.ts` +450, `strategy-framework.seed.spec.ts` +207, `1795000000003-seedStrategyFramework.ts` +60, `migration-specs/1795000000003-seedStrategyFramework.spec.ts` +200.
  - Red observed: data spec before the data file — `TS2307: Cannot find module './seed-data/strategy-framework.data'`.
  - Falsifier (alias mapping removed): `resolved_links 34 unresolved 2` (`3.2.1 Innovation development`, `4.1.1 Uptake of innovations for system change`) → `AssertionError: expected 36 distinct pairs, got 34`, exit 1; restored.
  - Verification: jest 3 suites / 14 tests; eslint 0; build 0. Scratch `migration:show` (ANSI stripped): 379 executed, 1 pending (`…003`). up → `35 matched, 0 unmatched`, two `START TRANSACTION` (outer + dedicated runner); second seed call `affectedRows` 0; down → all five counts 0 (deletes per depth 3 → 2 → 1); up again → 3 levels, 4/13/31 elements, 28 IOBs, 36 links, 35 responsibles; only `1.3.2` unlinked; `4.6` absent; two links on `4.1.1`; second call `affectedRows` 0 (AC.3).
  - By-hand SQL read (§3.3): `…000` `?` only with parameter arrays (`?.` on line 94 is TS optional chaining); `…001`/`…002`/`…003` no `?`/`:word`; seed SQL all bound `?` with arrays, no comments inside SQL strings.
  - **P-16 (settled):** staff table 3,092 rows, all active — measurable. 35 candidates, **35 matched** by trimmed case-insensitive email, **0 unmatched** (ambiguous 0, no email hit 0, no exact name hit 0). Stored names are legal names (e.g. `Idris Jones` → `IDRIS DAVID JONES HESELTON`; `Mauricio Munoz` via canvas email → `EDGAR MAURICIO MUÑOZ MIRANDA`); email decided every row. R-STF-011 AC.2 unmatched list: none.
  - Assumptions (carried verbatim in substance): descriptions match on casefold, `&`→`and`, collapsed whitespace → 22 indicator and 7 dimension descriptions (`1.1 1.2 1.4 1.6 3.1 4.3 4.5`); area 1 takes the "Institutional Excellence" definition (requirements.md:286 "the area-1 definition included"); area 2 null; links and MMF responsibles resolve by indicator name; `down` uses the same dedicated runner; the TypeORM CLI created `orm_metadata` on the scratch.
- **Leader re-run (non-author): VERIFIED** — jest 3/14, eslint 0, build 0; scratch re-queried: levels 3, depth 1/2/3 = 4/13/31, IOBs 28, links 36, responsibles 35. **Full server suite 510/510 suites, 5786/5786 tests** (run after both T-09 and T-11 workers reported).
- **Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — R-STF-011 AC.1–AC.3, NFR-STF-002 (as far as T-09 can show), §3.3, §3.4; Disqualifier met (data spec recomputes from committed constants); area-1 mapping conformant; responsibles email → exact name → single hit, unmatched via `LoggerUtil`; no AUTO_INCREMENT alter, `WHERE NOT EXISTS`, no `transaction` override.
  - ADVISORY: RISK — `down`'s refusal misses (a) a user link from a **seeded** IOB to a seeded element and (b) a user top-level element on seeded level 1; the RESTRICT FK then aborts the dedicated transaction (fails safe, no data lost) with a raw FK error instead of the named refusal §3.3 promises. RISK — after the refusal passes, `down` also removes user-added responsibles and edits to seeded rows (by design; worth stating at rollout). READABILITY — header carried absolute scratchpad paths with a local username → **fixed before commit** (follow-up `ctx_efff6ad34d59`, data unchanged; jest 2/10, eslint 0; Leader grep 0 local paths, jest 3/14). RELIABILITY — IOB-7 and IOB-27 statements keep a trailing space. RELIABILITY — dedicated-runner behaviour after `…001`/`…002` DDL in the same batch is T-10's.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete (+1 follow-up, complete); reviewer — not reported by host, ended complete.
- **Requirements covered:** R-STF-011 (AC.1–AC.3), NFR-STF-002 (seed transaction; batch proof in T-10).
- **Running totals:** tasks 10/17 · server LOC ≈ 11,800 (9,600 + 2,184; re-based server ≈ 12,000 — **within, ~200 left before T-10**) · client LOC ≈ 400 · review rounds 16/≈26.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-12 — Framework page shell, API methods, types, error util, URL codec, export

- **Status:** PASS (attempt 1) — 2026-11-19 · **not committed** (UI waits for the owner's visual approval)
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_97f3ff8b3ea2`, dispatch `ctx_22ba940807a3` (retained until PASS, then released). Effort high. Skills `angular-developer`, `ui-ux-pro-max` — same `impeccable-bridge` deviation as T-11. Exemplars: organizational-structure and control-lists pages, `ApiService` org-structure methods, `xlsx-export.util.ts`. Forward pointers copied: T-11 Reviewer (every 4xx except 401 rendered inline incl. 403/404; D-STF-26 as amended), D-STF-28 (`usageLabels` once on the view). Kaizen carried KZ-001, K-004/KZ-014, K-014, KZ-017.
- **Implementer report:** new `framework.component.{ts,html,scss,spec.ts}` (192/126/22/271; replaces T-11's placeholder), `url/framework-url.codec(.spec).ts` (62/35), `utils/framework-error.util(.spec).ts` (45/48), `utils/framework-view.util(.spec).ts` (210/190), `shared/interfaces/strategy-framework.interface.ts` (197); `api.service.ts` A0–A11 (15 methods), `xlsx-export.util.ts` additive `writeExportSheets` + `exportSheetsToXlsx` (+spec). Slots left empty for T-13…T-15.
  - Reds: baseline `grep -c exportSheetsToXlsx` = 0; page spec "No tests found, exiting with code 1". Falsifier 1 (title from `name`): received "Portfolio 2 – Monitoring framework" vs expected "Strategy 2026–2030 – Monitoring framework" — red; restored. Falsifier 2 (409 via `handleBadRequest`): "raises no result-title alert" Expected 0 calls, Received 1 (payload `errors.result_official_code` 1234) — red; restored.
  - Verification: 9 suites / 249 tests (incl. consumers xlsx-export, data-table, organizational-structure, control-lists, actions.service); lint clean; `tsc -p tsconfig.spec.json` 942, none in new files; `npm run build` exit 0 (framework scss 521 B; `exceljs` lazy chunk).
- **Leader re-run (non-author): VERIFIED** — same 9 suites / 249 tests; lint clean; **full client suite 396/396 suites, 9256/9256 tests** (no other worker active).
- **Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — §2.1, §4 A0–A11 (paths literal, unversioned; interfaces match `framework-read.service.ts` and write DTOs), §6.2, §6.4, D-STF-9 (`exportRowsToXlsx` byte-identical), D-STF-13, D-STF-23, D-STF-26 as amended (403/404 inline via `it.each`), D-STF-28, P-14, P-28, P-36; export Disqualifier met (real `exceljs` workbook, sheet count + names, `1.2` before `1.10`).
  - ADVISORY: RELIABILITY — `exportWorkbook()` has `try/finally` without `catch`: a failed lazy `exceljs` chunk load or `writeBuffer` error reaches the ErrorHandler with no inline message. READABILITY — §6.2 eyebrow "chip" renders as an uppercase `<p>` (HITL, T-17). RISK — the P-36 page test's `not.toHaveBeenCalled` holds trivially (component never injects `ActionsService`); the observed falsifier is what gives it meaning. RESILIENCE — portfolio is not written to the URL (conformant: §2.1 lists only `?view=&level=`).
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — not reported by host, ended complete.
- **Requirements covered:** R-STF-007 (shell, states), R-STF-008 (export builder; AC.3), R-STF-015 AC.2, R-STF-001 Details "not configured".
- **Running totals:** tasks 11/17 · server LOC ≈ 11,800 (re-based ≈ 12,000) · client LOC ≈ 2,000 · review rounds 17/≈26.

## Session pause (2026-11-19, second)

- **Done this session:** T-09 (committed `8c8c36e63`), T-11 and T-12 (PASS, **client changes uncommitted** — waiting for the owner's visual approval; tree holds T-11 + T-12 client files and `docs/ux-ui/design.md` §7.1 token row).
- **Next:** T-10 (integration suites) — run it with **no other worker active** (performance + concurrency evidence). **Budget:** server ≈ 11,800 of the re-based ≈ 12,000; T-10 (8 integration suites) will very likely cross it → the tripwire stops for the owner at T-10's finalize unless the owner re-bases first (option raised: count the generated 1,127-line data file separately). Client T-13 (outline editor), T-14 (table view), T-16 (IOB page) are eligible after T-12; T-15 after T-13.
- **Carry into T-10:** T-02 EXTRA check, T-06 update-vs-create concurrency, T-08 live Swagger count, T-09 Reviewer note on dedicated runner after `…001`/`…002` DDL in one batch.
- **Environment:** scratch `127.0.0.1:3307/ari_scratch_test` now has `…003` applied (seeded Portfolio 2). Docker `research_indicators_server_test_mysql` must be running.
- No Orca worker left open for this spec.

## Session resume (2026-11-20)

- Scratch container `research_indicators_server_test_mysql` was stopped; started by the Leader. `migration:show` on `orm.test.config.ts` (ANSI stripped, no error lines other than the `AddedErrorMessageAiReport` name): **380 `[X]`, 0 `[ ]`**, `…000`–`…003` applied.
- T-10 dispatched alone (performance + concurrency evidence; no other worker active for the whole task).

### T-10 — Integration suites (schema, CRUD, levels, carry forward, seed, role, wiring, performance)

- **Status:** PASS (attempt 2) — 2026-11-20
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_1df1496586b1`, dispatch `ctx_83d32fe60e16`; rework follow-up task `task_ef1da1782354`, dispatch `ctx_893c2a1453a1`. Skills `nestjs-expert` (task default). Effort high → **xhigh** on attempt 2. Exemplars `test/org-structure-{schema,seed,performance,module-wiring}.integration-spec.ts`, `test/support/org-structure-fixtures.ts`. Forward pointers copied: T-02 (EXTRA), T-06 (update vs create), T-08 (live Swagger count), T-09 (dedicated runner after DDL in one batch). Kaizen carried KZ-001, KZ-014/K-004, K-014, KZ-017. Brief stated the sourced fact that the chain cannot be replayed (Environment pre-check) and required a stop rather than a weaker proof if no P-26 route existed.
- **Attempt 1 — Implementer report:** new `test/strategy-framework-{schema,crud,levels,carry-forward,seed,role,module-wiring,performance}.integration-spec.ts` + `test/support/strategy-framework-fixtures.ts` (1,789 lines). No product code changed.
  - **P-26 route:** side database `ari_scratch_stf_batch` in the scratch container (`CREATE TABLE … LIKE` copies of the parent tables the four migrations reference; only `…000`–`…003` registered), real migration classes through a real `DataSource` / `MigrationExecutor` (`transaction = 'all'`), failure injected on `MysqlQueryRunner.prototype.query` at the 3rd `INSERT INTO \`framework_levels\``; side DB dropped in the test and again in `afterAll`.
  - Reds (Implementer-observed; each needed a temporary product edit, reverted): shared-runner seed → **`framework_levels` = 3 leftover rows**; D-STF-24 dedicated runner → **all counts 0**. Portfolio lock removed → two first creates **`201, 409`**; restored. EXTRA asserted as `VIRTUAL GENERATED` → `Received: STORED GENERATED`; restored.
  - Swagger (TestingModule boot): 16 method+path pairs, tag "Strategy Framework", none under `/v1/`.
  - Performance (Implementer run): A1 p95 2.4 | 2.31 | 3.12 ms, spread 35 % → **inconclusive**; A1e 2.69 | 2.22 | 2.18 (23.42 %); A4 1.79 | 1.69 | 1.71 (5.73 %); budget 300 ms.
  - `--listTests` 31 files incl. the 8; eslint 0; `npm run test:integration -- strategy-framework` 8/8 suites, 30 tests; full `test:integration` 7 failed suites outside this spec. Scratch restored: 380 applied / 0 pending; Portfolio 2 = 3 levels, 4/13/31, 28 IOBs, 36 links, 35 responsibles.
- **Attempt 1 — Leader re-run (non-author): VERIFIED** — `--listTests` 31 (8 `strategy-framework-`); `npx eslint` 9 files exit 0; 8/8 suites, 30/30 tests; performance A1 2.31 | 2.09 | 2.03 (14.07 %) pass, A1e 2.58 | 2.71 | 2.4 (12.82 %) pass, A4 1.76 | 1.72 | 1.84 (7.27 %) pass. Full `npm run test:integration`: 7 failed / 1 skipped / 23 passed (30 of 31), 58 failed tests — `bilateral-primary-contributing-sp` (`T13_MYSQL_PASSWORD is not set`), `pooled-funding-monitor` (`PFM_MYSQL_PASSWORD`), `pi-delegates-auth-sql` (`PID_MYSQL_PASSWORD`), `tip-versioning` (`TIP rows exist in result_prms_sync_log`), `result-prms-sync-claim-concurrency` / `result-prms-sync-log-outcome` (`Unknown column 'result_id'`), `org-structure-lifecycle` (1 of 20, `read ECONNRESET`, B6…B13 403 case — **also fails run alone**; that run loads no T-10 file; whether it failed before this session was **not observed**, so it is recorded open, not as pre-existing). None of the seven references strategy-framework.
- **Attempt 1 — parallel-lens review (migration / data-loss surface):**
  - **Reviewer A (reliability + risk): `STATUS: PASS`** — P-26 is a real proof: real migrations, real executor in `all` mode, injection inside the real seed path on the dedicated runner, `CREATE TABLE` committed before the throw (the D-STF-24 hazard), so 3 vs 0 discriminates. Concurrency meets the Disqualifier: unawaited promises under a held `FOR UPDATE`, asserted ≥ 2 waiters in `performance_schema.data_lock_waits`. Carry forward injected failure is a real rollback (insert 1 succeeds, insert 2 throws → 0 rows); RESTRICT backstop errno 1451; fourth level by raw SQL appears in A1/A1e; seed twice 0; role up/down/up with `down` refusing on an inactive holder. Caveat recorded: the shared-runner and lock-removal reds are Implementer-observed only (temporary product edits, not in the diff).
    - ADVISORY: update-vs-create cannot deadlock by construction (guards regressions, does not prove lock order; riskier pair is IOB update vs IOB create/carry forward); R-STF-006 test matches `/institutional objective/i`, not "1 institutional objective"; API-blocked deletes do not re-read the row and per-blocker free cases are unit-only; role suite killed between `down` and `up` would leave `sec_roles` 11 missing while `migrations` records it; a failed `cleanup()` leaves active `__T10_` portfolios (2026–2030) that could change the §5.1 default on the scratch; inconclusive perf assertion cannot fail — the Leader's re-run is the NFR-STF-001 evidence of record.
  - **Reviewer B (readability + resilience): `STATUS: FAIL`** — per-item coverage complete except one issue. *Discovered:* `strategy-framework-module-wiring` never calls `app.enableVersioning({ type: VersioningType.URI })` (`main.ts:58-60` does), so the "none under `/v1/`" Swagger check and the `/api/v1/… → 404` test pass by construction; docblock overclaims. *Violated:* root `CLAUDE.md` §4.3 KZ-017 / K-004; T-08 Disqualifier carried by the T-08 forward pointer. *Remediation:* enable URI versioning before `app.init()`, observe the red with a temporary `@Version('1')`, revert, quote.
    - ADVISORY: role suite hard-requires zero ODS Admin holders (a local HITL assignment turns it red); no pre-clean of stale `__T10_%` portfolios; registry re-register in `crud` not in `finally`; inconclusive perf assertion tautological; per-blocker free cases unit-only; `.sort()` without comparator in `levels`.
  - **Adjudication:** Reviewer B's issue is in scope (T-08 forward pointer carried by the brief) → attempt consumed.
- **Attempt 2 — Implementer (same worker, effort xhigh):** `strategy-framework-module-wiring.integration-spec.ts` only — `setGlobalPrefix('api')` then `enableVersioning({ type: VersioningType.URI })` (no `defaultVersion`) before `app.init()`, as `main.ts`; docblock states what the boot cannot reach. Gap proven first: temporary `@Version('1')` with no versioning → suite **green** (2 passed). Red with versioning: Swagger listed `GET /api/v1/strategy-framework/framework`; unversioned GET expected 200 received **404**; `/v1/` GET expected 404 received **200**. `@Version` reverted; `git diff --stat -- server/researchindicators/src` empty; 8/8 suites, 30 tests; eslint 0.
- **Attempt 2 — Leader re-run (non-author): VERIFIED** — `git diff --stat -- src` empty; eslint 0; 8/8 suites, 30/30 tests; `enableVersioning` at line 85. Performance this run: A1 2.12 | 1.92 | 3.35 (74.13 %) **inconclusive**; A1e 2.67 | 2.45 | 2.69 (9.85 %) pass; A4 1.95 | 1.82 | 1.77 (10.55 %) pass.
- **Attempt 2 — Reviewer B: `STATUS: PASS`** — fix mirrors `main.ts:57-60,76` (prefix, versioning, order before init and before `createDocument`); both checks now discriminate (red observed, gap observed green first); docblock within what the boot proves. ADVISORY: Swagger assertions sit in `beforeAll` (a failure surfaces as a hook error, not its own test); `console.log` of the pair list adds green-run noise.
- **NFR-STF-001 (KZ-017 — local in-process proxy, not Dev; HTTP, guards and serialization excluded):** A1e and A4 pass in all 3 measured sessions (p95 ≤ 2.71 ms vs 300 ms). **A1: 2 of 3 sessions inconclusive by the > 30 % spread rule** (35 %, 74 %), 1 pass (14.07 %); every A1 p95 observed ≤ 3.35 ms. Reported as spread, not as p95 — at ~2 ms one slow call moves the spread past 30 %; the rule's evidence status for A1 stays *inconclusive* until a Dev measurement (T-17).
- **checkpoints:** none. **continuations:** none.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; implementer follow-up — not reported by host, ended complete; reviewer A — 123,610 tokens, 19 calls, complete; reviewer B attempt 1 — 92,295 tokens, 14 calls, fail; reviewer B attempt 2 — 56,793 tokens, 3 calls, complete.
- **Requirements covered:** R-STF-002 AC.1, R-STF-003 AC.1/AC.2, R-STF-006 AC.1/AC.2, R-STF-010 AC.1/AC.2, R-STF-011 AC.1/AC.3 (AC.2 = seed log, T-09/T-17), R-STF-013 AC.1, NFR-STF-001 (A1 inconclusive, see above), NFR-STF-002.
- **Running totals:** tasks 12/17 · server LOC **13,581** (11,784 committed `git diff --numstat e75276055 HEAD -- server` + 1,797 T-10 test lines) · client LOC ≈ 2,030 (uncommitted T-11 + T-12) · review rounds 20/≈26.

## Budget Tripwire: T-10 (2026-11-20)

- Re-based budget (design §14, 2026-11-19 after T-05): server ≈ 12,000, whole spec ≈ 18,000; check "after T-10 (server close)". **Measured: server 13,581 → +1,581 (+13 %) over ≈ 12,000.** The server side is now complete (T-01…T-10); remaining work is client-only (T-13, T-14, T-15, T-16) plus T-17 (Dev/HITL).
- Cause: T-10's 8 integration suites + fixtures = 1,797 lines (all tests); the generated seed data file (1,127) also counts inside the server figure.
- Whole spec projection: server 13,581 + client ≈ 2,030 so far + T-13…T-16 (estimate unchanged by this check) — the ≈ 18,000 whole-spec figure holds only if the client stays within ≈ 4,400.
- Review rounds 20 of ≈ 26 with 4 client tasks + T-17 left — the round cap will likely be reached too.
- **Stopped for the owner's decision** (the tripwire is never auto-approved).
- **Owner decision (2026-11-20):** *Re-basar y seguir* — server 13,581 accepted, whole spec ≈ 18,000 kept (client ≈ 4,400 remaining inside it), review-round cap raised ≈ 26 → **≈ 32**; next check after T-16 (client close). Applied to `design.md` §14 (new row; earlier rows kept as history).
- **Leader correction (same gate):** the option text offered T-13 and T-14 in parallel; root `CLAUDE.md` §4.3 allows parallel editing only across packages — client tasks run **sequentially** (T-13 → T-14 → T-16 → T-15).

### T-13 — Outline editor and recursive row (mockup)

- **Status:** PASS (attempt 2) — 2026-11-20 · **not committed** (UI waits for the owner's visual approval)
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_bcdf5ca29a96`, dispatch `ctx_0ef4899a9c2f`; rework follow-up task `task_f9db18811601`, dispatch `ctx_41d7ecddd1c0`. Effort high → **xhigh** on attempt 2. Skills `angular-developer`, `ui-ux-pro-max` — same `impeccable-bridge` deviation as T-11/T-12 (not installed; report reads `design route: impeccable-bridge not installed; playbook: n/a; polish: not run; finish review: not run (AKILI execute)`). Exemplar `center-admin/organizational-structure/components/org-tree`. Visual reference `mockup/Main.dc.html` (artboard 3). Kaizen carried KZ-015, KZ-001, KZ-014/K-004, KZ-017. Forward pointers into T-13: none.
- **Attempt 1 — Implementer report:** new `components/outline-node.model.ts`, `components/outline-row/outline-row.component.{ts,html,scss,spec.ts}`, `components/outline-editor/outline-editor.component.{ts,html,scss,spec.ts}`; `framework.component.{ts,html,spec.ts}` edited (outline mounted in the former `outline-editor-slot`, `detailsElementId` recorded for T-15; T-14/T-15 slots left empty). Targeted jest 3 suites / 31 tests.
  - Falsifier 1 (blur without the saving guard): `Expected number of calls: 1, Received: 2` at `outline-row.component.spec.ts:92` — red; reverted. Falsifier 2 (`shownName` always the server name on refresh): `Expected "Dirty area", Received "Server area"` at `outline-editor.component.spec.ts:194` — red; reverted.
  - lint clean; build 0; compiled styles 1,908 B and 919 B (< 4 kB); `tsc -p tsconfig.spec.json` no errors in touched files.
  - Not Done / Assumptions (verbatim): "confirm text uses the stored name, the shared alert X does not return focus (only Close, Cancel and Delete), the refresh-merge test types without moving focus because a focus change blurs and saves, and accents are classes outline-card--accent-N on the tokens because jsdom drops var() on an inline border-left-color." — no owed item, no blocker → not a continuation; the X item was adjudicated by the Reviewer below.
- **Attempt 1 — Leader re-run (non-author): VERIFIED** — framework folder jest 6 suites / 41 tests; lint clean; build exit 0, zero `[ERROR]` lines (budget warnings only on pre-existing files); full client suite 398/398, 9,278/9,278 on the second run (first run: `submission.service.spec.ts` failed to run with 0 failed tests; passes alone, 73/73).
- **Attempt 1 — Reviewer (`akili-reviewer`, opus): `STATUS: FAIL`** — everything in the task's Tests list conforms (state machine driven by input/keydown/blur events — KZ-015; drafts *New*, no `code` sent, `1.7`/`1.8`, Escape removes; refresh merge through the same `absorb()` path; delete colour + `aria-disabled`; blocked dialog blocker + way-out; four depths; no hex; ApiService only; errors via `frameworkErrorOf`; T-14/T-15 slots empty). One issue: *Discovered* — `openConfirm` / `openBlocked` / `openNotice` never set `hideCloseButton`, so the shared alert's X (`global-alert.component.html:5-8`, `closeAlert($index)` with no callback, `.ts:121`) closes the dialog without `focusReturn()`; focus falls to `<body>`. *Violated* — design §6.3 Keyboard bullet (refocus the delete button on close), §6.3 Delete bullet (blocked dialog "Close only"), D-STF-26 (page-managed focus return). *Remediation* — `hideCloseButton: true` on both payloads + payload assertions; do not touch the shared global-alert.
  - ADVISORY: blur from `error` re-sends the save (§6.3 does not define it — **owner decision at visual review**); Enter on an empty name calls `startSave` twice (no request sent); `onKeydown` blurs even when `startSave` returns false, moving focus away from the field holding the error; the alert X is an `<i>` with no tabindex (moot after the fix); delete-path errors render in the alert, not inline (as §6.3 prescribes).
- **Attempt 2 — Implementer (same worker, effort xhigh):** `outline-editor.component.ts` `hideCloseButton: true` on the confirm (line 156) and blocked (line 174) payloads — covers the notice, which reuses `openBlocked`; `outline-editor.component.spec.ts` assertions at lines 288 (blocked), 311 (confirm), 327 (cancel path + focus return). Falsifier: flag removed from the confirm payload → `Expected: true, Received: undefined` at `spec.ts:311` — red; restored. Framework jest 6 / 41; lint clean; build 0; shared global-alert untouched. Not Done / Assumptions: none.
- **Attempt 2 — Leader re-run (non-author): VERIFIED** — flags at component 156/174, assertions at spec 288/311/327; `git status --porcelain -- src/app/shared/components/global-alert` empty; framework jest 6 suites / 41 tests; lint "All files pass linting."; build exit 0. **Full client suite: four runs** — (1) 1 suite failed to run (`filter-by-text-with-attr.pipe.spec.ts`), 0 failed tests, 9,259 run; (2) 2 suites failed to run (`api.service.spec.ts`, `whats-new.component.spec.ts`), 0 failed tests, 8,995 run; (3) non-silent: **398/398 suites, 9,278/9,278 tests**, no "failed to run" text captured; (4) the three suites alone: PASS (19 + 283 tests). Cause of the runner flake **not observed** — recorded open, not as benign (it varied the test count by 283).
- **Attempt 2 — Reviewer: `STATUS: PASS`** — every `showGlobalAlert` call in the outline editor (two call sites; `openNotice` and all `performDelete` paths inherit `openBlocked`) hides the X; blocked dialog has Close only (`hasNoCancelButton: true`); falsifier observed. Coverage gap accepted: the notice path has no assertion of its own (same payload builder as line 288).
- **checkpoints:** none. **continuations:** none.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; implementer follow-up — not reported by host, ended complete; reviewer attempt 1 — 102,385 tokens, 14 calls, fail; reviewer attempt 2 — not reported by host, complete.
- **Requirements covered:** R-STF-007 AC.1–AC.4, R-STF-006 AC.1 (UI side), R-STF-005 scenario (`1.7`), NFR-STF-004 (keyboard, labels, colour not the only cue — contrast, indentation and accent visibility are HITL in T-17).
- **Running totals:** tasks 13/17 · server LOC 13,581 · client LOC ≈ 3,543 (≈ 2,030 T-11/T-12 + 1,513 T-13 new files; uncommitted) · review rounds 22/≈32.
- **Approval:** continue gate `auto-approved (owner standing direction)`.

### T-14 — Table view per level

- **Status:** PASS (attempt 1) — 2026-11-20 · **not committed** (UI waits for the owner's visual approval)
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_0b564bbdc451`, dispatch `ctx_115062772cfc`. Effort medium (shipped table pattern). Skills `angular-developer`, `ui-ux-pro-max` — `impeccable-bridge` deviation as T-11…T-13. Exemplar `configuration/control-lists` (`app-data-table` + `#rowActions`); shared `DataTable` used unchanged. Brief resolved the scope's "T-13 shared handler": the delete flow was private to the outline editor, so T-14 extracts it into one handler both views call, keeping the outline-editor spec's assertions untouched; "edit opens the panel" routes to the page's existing `detailsElementId` (T-15 builds the panel). Kaizen carried KZ-001, KZ-015, KZ-014/K-004, KZ-003.
- **Implementer report:** new `framework-delete.handler.ts` (166), `components/framework-tables/framework-tables.component.{ts,html,scss,spec.ts}` (207/83/30/339); edited `outline-editor.component.ts` (delete flow moved to the handler), `framework.component.{ts,html,spec.ts}` (tables mounted in the former `framework-tables-slot`; `createRequest` stored for T-15), `utils/framework-view.util.ts`.
  - Falsifier (three hard-coded chips): `framework-tables.component.spec.ts:137` expected four chips `Performance Areas (1), Dimensions (1), Indicators (1), Sub-indicators (1)`, received three `Performance Areas (4), Dimensions (13), Indicators (31)` — red; reverted.
  - Framework folder + `shared/components/data-table` jest 8 suites / 64 tests (incl. the outline-editor spec); lint clean; build 0, `framework-tables.component.scss` 572 B; `tsc -p tsconfig.spec.json` 942, none in touched files; `shared/components/data-table` untouched.
  - Assumptions (verbatim): "the parent field is required only below the first level, because the details panel omits parent at depth 1, and the page stores createRequest for T-15 without rendering the panel".
- **Leader re-run (non-author): VERIFIED** — 8 suites / 64 tests; lint "All files pass linting."; build exit 0; `git status --porcelain -- src/app/shared/components/data-table` empty. `outline-editor.component.spec.ts` last written 09:17 (T-13 attempt 2), i.e. **not edited by T-14** — its unchanged assertions passing is the extraction evidence (limit: T-12…T-14 files are untracked, so git cannot isolate per-task edits; timestamps are the only per-file signal). Full client suite: `npm test -- --silent` 1 suite failed to run (`result-ai.constants.spec.ts`), 0 failed tests; `npx jest --silent --json` re-run **399/399 suites, 9,289 tests, 0 failed, 0 runtime errors** (flake did not reproduce for capture — now 4 of 6 `npm test -- --silent` runs this session, a different suite each time; cause not observed).
- **Reviewer (`akili-reviewer`, opus): `STATUS: PASS`** — R-STF-008 AC.1/AC.2, §6.4, D-STF-12, P-23. Chips data-driven (`levelCounts(view)`, no level names in the template; four-level fixture present); falsifier red genuine (count and length both differ — KZ-014); per-level columns asserted in DOM (ancestor codes, Responsibles only at indicator level, `Idris Jones; Philippe Attey (inactive)`); edit → same `detailsElementId` as the outline (`framework.component.spec.ts:292-296`); delete in both views goes through `FrameworkDeleteHandler.request` with T-13's contract intact (confirm text, Close-only blocked dialog, `hideCloseButton: true`, focus return, errors via `frameworkErrorOf`); depth-1 parent assumption reconciles §6.4 ("parent required") with §6.5 ("absent at depth 1"); F-7 through the unmodified `DataTable`, DOM-asserted (pager 10/25/50/100, `1.9` before `1.10`, search, export of filtered rows); standalone/OnPush/signals/ApiService/`var(--ac-*)`.
  - ADVISORY: the natural-sort assertion cannot tell `DataTable`'s default sort from the util's pre-sort (KZ-017 — result correct either way); after-delete focus uses natural code order, not the displayed order (page 2 first row / name-desc sort fall back to `+ <Level>` — focus never lost); **tables' `refresh()` has no `refreshToken` guard and the handler's `busy` flag clears before confirm, so two deletes confirmed back to back can race and an older view landing last can re-show a deleted row (reachable by code reading, not built in a test) — raised to the owner at this gate (KZ-008)**; non-deletable row shows its blocker in an `sr-only` span with no visible tooltip (the editor uses "muted with a tooltip").
- **checkpoints:** none. **continuations:** none.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — 94,567 tokens, 14 calls, complete.
- **Requirements covered:** R-STF-008 AC.1, AC.2.
- **Running totals:** tasks 14/17 · server LOC 13,581 · **client LOC 4,352** (560 tracked + 3,792 untracked, measured; uncommitted) vs client share ≈ 4,419 of the ≈ 18,000 whole (re-based 2026-11-20) — **within by 67, with T-15 and T-16 left: the whole-spec figure will be crossed at T-15/T-16** · review rounds 23/≈32.
- **Approval:** continue gate `auto-approved (owner standing direction)`; budget not yet exceeded (check stays at T-16 per design §14).

### T-16 — Institutional Objectives page

- **Status:** PASS (attempt 2) — 2026-11-20 · **not committed** (UI waits for the owner's visual approval)
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_8945897c5377`, dispatch `ctx_87a30301930a`; rework follow-up task `task_63ed868ecf2d`, dispatch `ctx_0c1a663b4c19`. Effort medium → **high** on attempt 2. Skills `angular-developer`, `ui-ux-pro-max` — `impeccable-bridge` deviation as T-11…T-14. Exemplar `configuration/control-lists` (`app-data-table`); no `p-drawer` / `pFocusTrap` usage in the app (Leader grep → 0). Visual reference `mockup/InstitutionalObjectives.dc.html` (owner unit removed, A-3). Kaizen carried KZ-001, KZ-015, KZ-014/K-004, KZ-017. Forward pointers into T-16: none. Dispatched while T-14's finalize was written (sequential client work — T-14 had reported and closed).
- **Attempt 1 — Implementer report:** replaced the T-11 placeholder: `institutional-objectives.component.{ts,html,scss,spec.ts}`, `objective-view.util.ts`, `components/objective-panel/objective-panel.component.{ts,html,scss,spec.ts}` (1,621-line patch). ApiService / interfaces unchanged. Falsifier (last-year check removed): `institutional-objectives.component.spec.ts:196` `expect(carry.disabled).toBe(true)` → Expected true, Received false — red; reverted. ods-admin jest 9 suites / 65 tests; lint clean; build 0, styles 436 B / 151 B; `tsc -p tsconfig.spec.json` 942, 0 in touched files. Not Done / Assumptions: none.
- **Attempt 1 — Leader re-run (non-author): VERIFIED** — ods-admin 9 suites / 65 tests; lint clean; build exit 0; no change outside `ods-admin/`. Full client suite (`npx jest --silent --json`): 401 suites, 9,244 tests, **0 failed tests**, 1 suite "failed to run": `alliance-sidebar.component.spec.ts` — *"A jest worker process (pid=11291) was terminated by another process: signal=SIGSEGV"* (Node v24.20.0); the suite passes alone, 58/58. **This captures the cause of the recurring runner flake seen in T-13/T-14:** a jest worker crash, not a test result — the suite it was running reports "failed to run".
- **Attempt 1 — Reviewer (`akili-reviewer`, opus): `STATUS: FAIL`** — everything else conforms (year label "2026 · 28 objectives" from DOM; `defaultYear` incl. a non-current default; carry forward disabled in 2030 and on an empty year with no request; exact toast `'28 objectives copied to 2027; 2026 is unchanged'` + singular per D-STF-27; 409 inline for carry forward, delete and save, 401 excluded; no owner field in DOM or request bodies; multiselect indicator-level only, `code · name`, grouped by depth-1 ancestor, visible `label[for]`; focus return to the opener; IOB delete follows `deletable`, Close-only blocked alert; F-7 via shared `DataTable`; standalone/OnPush/signals/ApiService/tokens). One issue: *Discovered* — the focus-trap test asserted `activeElement === cancel || opened.contains(activeElement)` after `focusCode` had already put focus inside the drawer → passes by construction; the panel spec was presence-only. *Violated* — tasks.md § T-16 Tests ("focus trap and return"), NFR-STF-004, design §6.6/§6.5/P-33, reviewer.md §5. *Remediation* — move focus off the first control, reach the `lastfocusableelement` sentinel as a Tab past the last control would, assert exactly `#objectiveCode`, observe red without `pFocusTrap`.
  - ADVISORY: IOB confirm reads "Delete Institutional objective IOB-1?" (R-STF-006/§6.3 template has "· <name>"; IOBs have no name — **owner may want it recorded as a decision**); `reloadYears` has no try/catch (unhandled rejection would leave `loading` true — not reached with current stubs); a failed reload after a successful copy would surface as `carryError` (misleading, not reached); visuals (light/dark, focus ring, contrast, 420 px / 100 % drawer) are T-17 HITL.
- **Attempt 2 — Implementer (same worker, effort high):** spec files only — page spec (~274-290) and panel spec (~108): focus Statement → Save → the `lastfocusableelement` sentinel via a real `.focus()`, then `expect(document.activeElement).toBe(code)`. Falsifier: `pFocusTrap` removed → both red (panel spec:108, page spec:284 — Expected `input#objectiveCode`, Received the Save button); restored. 9 suites / 65 tests; lint clean; build 0. Assumption (verbatim): "a synthetic FocusEvent drops relatedTarget in this jsdom, so the trap treats it as outside and the assertion fails while pFocusTrap is still present — the test uses a real focus(), whose relatedTarget is the Save button; product code was not changed."
- **Attempt 2 — Leader re-run (non-author): VERIFIED** — 9 suites / 65 tests; lint clean; build exit 0; `pFocusTrap` present at `objective-panel.component.html:15`, HTML content identical to attempt 1's patch (mtime moved only through the falsifier edit/revert).
- **Attempt 2 — Reviewer: `STATUS: PASS`** — traced `primeng-focustrap.mjs:69-77`: the assertion lands only if the last-sentinel → first-sentinel → first-focusable chain runs, so the test discriminates a broken wrap, not only a missing directive; a real `focus()` gives the handler the same `relatedTarget` a Tab would. **What the check cannot reach (KZ-017):** jsdom does no Tab-key navigation, so tab order from Save to the last sentinel is not proven (only the trap's response once there); **Shift+Tab** (first sentinel → last control) is untested — both belong to the T-17 HITL pass.
- **checkpoints:** none. **continuations:** none.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; implementer follow-up — not reported by host, ended complete; reviewer attempt 1 — 106,480 tokens, 13 calls, fail; reviewer attempt 2 — not reported by host, complete.
- **Requirements covered:** R-STF-009 AC.1/AC.2, R-STF-010 AC.2 (UI), R-STF-006 (IOB side), NFR-STF-004 (focus trap and return in jsdom; Tab order and Shift+Tab → T-17).
- **Running totals:** tasks 15/17 · server LOC 13,581 · **client LOC 5916** (measured: tracked diff + untracked files; uncommitted) · whole spec ≈ 19497 · review rounds 26/≈32.

## Budget Tripwire: T-16 (2026-11-20)

- Re-based budget (design §14, 2026-11-20 after T-10): whole spec ≈ 18,000 kept, server 13,581 accepted → client share ≈ 4,419; check "after T-16 (client close)". **Measured: client 5916 → +1497 over its share; whole spec ≈ 19497 vs ≈ 18,000.**
- Cause: four client tasks of size L/M/M/M each landed 800–1,600 lines with tests ≈ half (T-13 1,513; T-14 ≈ 880; T-16 ≈ 1,620); the original client estimate (≈ 4,200 for all of T-11…T-16) was sized before the outline editor and the drawer existed.
- Remaining: **T-15** (details panel + staff picker, M) and **T-17** (Dev deploy checks + HITL, S). Review rounds 26 of ≈ 32.
- Open item raised to the owner at this gate (KZ-008, from T-14's Reviewer): two table-view deletes confirmed back to back can race; an older view landing last re-shows a deleted row (server state correct; not in any approved task).
- **Stopped for the owner's decision** (the tripwire is never auto-approved).
- **Owner decisions (2026-11-20):** (1) *Re-basar y seguir* — whole spec ≈ 21,500 (server 13,581, client ≈ 7,900), review-round cap ≈ 32 → **≈ 36**, next check at T-17; applied to `design.md` §14 (new row; earlier rows kept). (2) The table-view delete race is **fixed inside T-15** as an owner-approved scope amendment — recorded in `tasks.md` § T-15 Scope (stale-refresh guard in `framework-tables`, mirroring the outline's `refreshToken`), with its own test and falsifier.

### T-15 — Details panel and staff picker (+ owner scope amendment: table refresh guard)

- **Status:** PASS (attempt 1) — 2026-11-20 · **not committed** (UI waits for the owner's visual approval)
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_a5d20eb96f52`, dispatch `ctx_6ee9fc1d5ce3`. Effort high (accessibility-critical). Skills `angular-developer`, `ui-ux-pro-max` — `impeccable-bridge` deviation as T-11…T-16. Exemplar `institutional-objectives/components/objective-panel` (T-16; its accepted focus-trap test pattern). Brief carried the owner's scope amendment verbatim (tasks.md § T-15). Kaizen carried KZ-015, KZ-001, KZ-014/K-004, KZ-017.
- **Implementer report:** new `components/element-panel/element-panel.component.{ts,html,scss,spec.ts}`, `components/staff-picker/staff-picker.component.{ts,html,scss,spec.ts}` (1,293-line patch); edited `framework.component.{ts,html,spec.ts}` (panel in `element-panel-slot`, opened from `detailsElementId` / `createRequest`), `components/framework-tables/framework-tables.component.{ts,spec.ts}` (`refreshToken` guard). No ApiService change.
  - Falsifiers, all reverted: `pFocusTrap` removed → focus stays on Save (expected `#elementCode`); free-text chips allowed → typing "Nope" leaves 2 chips (expected length 1); refresh guard removed → codes `["1"]` (expected `[]`).
  - ods-admin jest 11 suites / 77 tests; lint clean; build 0; styles 804 B / 746 B; tsc no new errors in touched files. KZ-017 declared: focus ring, contrast, drawer width, real Tab / Shift+Tab order unreachable in jsdom. Not Done / Assumptions: none — notes: Parent is a plain `p-select` (D-STF-14); chips sit beside the autocomplete because PrimeNG 19's multiple `modelValue` stays null with the initial array.
- **Leader re-run (non-author): VERIFIED** — ods-admin 11 suites / 77 tests; lint clean; build exit 0; no file outside `ods-admin/` touched; `framework-delete.handler.ts` (09:31) and `outline-editor.component.{ts,spec.ts}` (09:32 / 09:17) not edited by T-15. Full client suite (`npx jest --silent --json`): **403/403 suites, 9,314 tests, 0 failed, 0 runtime errors**.
- **Reviewer (`akili-reviewer`, opus, full): `STATUS: PASS`** — R-STF-003, R-STF-004 AC.1/AC.2, R-STF-007 (panel), NFR-STF-004, §6.5, D-STF-14, D-STF-26, P-33, and the 2026-11-20 amendment as written. Focus-trap test follows the accepted pattern and discriminates; focus return proven from the outline details and table edit buttons; Parent options exactly depth − 1, wrong depth absent, none at depth 1, `parentId` sent only when changed; actions exactly Delete/Cancel/Save; 409 inline via `frameworkErrorOf`, 401 off the form; panel delete via `FrameworkDeleteHandler` (free + Close-only blocked); picker — no request < 2 chars, 300 ms debounce proven with `fakeAsync` (`tick(299)` 0 calls, `tick(1)` 1), only last-A4-response carnets addable ("Nope" + Enter adds nothing), inactive filtered from search, max 20, inactive tag, reorder `aria-label`s, combobox labelled (`role`, `label for`, `ariaLabelledBy`); chips beside the autocomplete conform (§6.5 sets no position; native `<button>` controls, keyboard-reachable); amendment test resolves newer-then-older and asserts the newer view wins (`framework-tables.component.ts:52,161-164`).
  - ADVISORY: focus return after `+ <Level>` and after Save untested (shared code path with the tested edit button); hint `aria-describedby` set by a DOM write in `effect()` may miss the first render, no assertion (suggest `afterNextRender`); tables' `refresh()` has no try/catch (a rejecting `GET_StrategyFrameworkEditor` would surface through the delete handler's `onDeleted`; reachable only if ApiService rethrows); Tab wraps inside the `<form>`, so the drawer header's Close is not Tab-reachable (Escape/Cancel close; same as T-16) — **T-17 keyboard pass**.
- **checkpoints:** none. **continuations:** none.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — not reported by host, complete.
- **Requirements covered:** R-STF-003 (UI move), R-STF-004 AC.1 (UI)/AC.2, R-STF-007 (Details panel), NFR-STF-004 (jsdom scope; Tab order/Shift+Tab/visuals → T-17); owner amendment (table refresh race).
- **Running totals:** tasks 16/17 · server LOC 13,581 · client LOC 7293 (measured; uncommitted) · whole ≈ 20874 vs re-based ≈ 21,500 · review rounds 27/≈36.
- **Approval:** continue gate reached T-17, which needs the owner (Dev deploy checks + HITL) — stopping.

## T-17 — HITL round 1 (2026-11-23, local, Leader live in Chrome, read-only: local server points at the shared DB)

- **Phantom document scroll (owner-reported).** 47 `sr-only` blocker spans (`position: absolute`) resolved against the shell's `div.grid-container`, outside the `div.content` scroller → `documentElement.scrollHeight` 2,635 at `innerHeight` 817. Fix (Grok worker): `position: relative` on the `:host` of `framework` and `institutional-objectives`. Re-measured live: 817 in editor and table views.
- **Owner-approved findings 1–4 (Grok worker, one rework):**
  1. Escape inside an open select/multiselect/autocomplete closed the whole drawer (unsaved edits lost) → `OverlayEscapeGuardDirective` on both panel forms. Rework: the guard first queried `[aria-expanded="true"]` over the whole document (an unrelated expanded control would swallow every Escape) → scoped to the host form + visible PrimeNG overlay roots. Falsifiers seen red: guard removed (`framework.component.spec.ts:415`), whole-document query restored (`:468`). Live: Parent select, IOB multiselect and staff autocomplete — first Escape closes only the overlay, second closes the drawer, focus on the opener.
  2. IOB table 2,563/1,129 px → Statement and Linked indicators wrap; Code/Actions fixed. Live: 1,129/1,129 at 1280 px, 673/673 at 800 px.
  3. Framework tables, Indicators level 1,202/1,153 → page-scoped `ods-table-wrap.scss` (shared `data-table` untouched). Live: 1,153/1,153 for all three levels at 1280 px; 697/697 at 800 px.
  4. Staff chips rendered as loose text with wrapped buttons → one token-styled row per person, ellipsis + `title`. Live: one line at 1280 px.
- **Design amendment:** §6.6 `linkedIndicatorsText` one per line (was `; `).
- **Leader re-run:** `npx jest src/app/pages/platform/pages/administration/ods-admin --coverage=false` → 11 suites, 82 tests passed. Full client suite not re-run for this round (ods-admin-only change, shared files untouched).
- **Open, owner's call:** delete tooltip names only the way-out (R-STF-006 "names the blocker"); panel Delete red even when not deletable; panel headers differ (Framework chip+code vs IOB title); two "Export .xlsx" buttons in table view; staff search returns gmail accounts; ~5–7 s to first outline paint (re-time on Dev); equal column widths make Responsibles wrap to 3 lines.
- **Not reachable here (KZ-017):** dark mode (the app has none — forcing `.dark-mode` only flips PrimeNG widgets, same on Results Center); write flows (shared DB); pixel comparison with the mockup.
- **Commit:** client still uncommitted, waiting for the owner's visual approval.

## T-17 — HITL round 2 (2026-11-23): alignment with mockup artboards 3–4 (owner-approved)

- **Reference note:** artboard 3 is superseded for the Framework page (requirements.md line 13, A-1 — the dev lead's 2026-11-17 screenshot is the reference); the owner still asked to adopt its detail-level items. Kept as built (owner): separate pages, drawer instead of a fixed side form, inline outline, plain codes `1.2.3`, summary line instead of stat cards.
- **Adopted (Grok worker, one small rework):** shared panel header (eyebrow `<LEVEL> · LEVEL n` / `INSTITUTIONAL OBJECTIVE`, code pill + name / `IOB-n · year`); parent field labelled by the parent level name, side by side with Code; read-only derived ancestors recomputed on parent change; truthful Code helper per mode; outlined Delete; table ancestor columns as `code · name` with the duplicate "Parent code" column dropped (xlsx export unchanged); code pills and semibold names; level chips `Indicators · 31` with filled active state; outline collapse/expand (`aria-expanded`/`aria-controls`, survives refresh, drafts and dirty rows never hidden) and `Find by code or name` search with ancestors; Delete in the IOB panel through the same flow as the row; IOB code pills. Rework: chips had `role=radio` + `aria-checked` + `aria-pressed` → plain buttons with `aria-pressed` in `role=group`; duplicate "Clear" button removed (single in-field ×).
- **Falsifiers seen red:** search hiding a dirty row (`outline-editor.component.spec.ts:454`); derived ancestor not recomputed (`element-panel.component.spec.ts:233`).
- **Leader live check (Chrome, 1280 px):** search `gover` → 1.4.1 and 1.5.2 with ancestors; collapse/expand Area 1; table 1,153/1,153 with no side scroll; both panel headers as specified; IOB panel Delete present.
- **Leader re-run:** ods-admin 11 suites / 88 tests; full client `npm test` → 403/403 suites, 9,325 tests passed.
- **Kept deliberately:** derived ancestor placed under the parent select (mockup puts it last); code pills grey like the outline badges (mockup blue).
- **Commit:** client still uncommitted, waiting for the owner's visual approval.

## Rev 4 execution (2026-11-24)

- Rev-4 spec docs committed as the execution baseline: `c60e4ac87` (the owner's `/akili-execute` call taken as the Phase 3 gate approval). Same standing split and direction as above: Grok implements, Claude reviews; continue until FATAL_FAIL / HALT / Pivot / tripwire. UI code stays uncommitted until the owner's visual approval (T-22).

### T-21 — Shared DataTable: opt-in keyboard row selection

- **Status:** PASS (attempt 1) — 2026-11-24 · **not committed** (UI, waits for T-22 visual approval)
- **Dispatch:** fresh Grok `grok-4.7-high` via Cursor, run `run_674b6b131b1f`, task `task_228562571342`, dispatch `ctx_4c8bab3823af`. Effort medium (S, shared component). Skills `angular-developer`, `ui-ux-pro-max` (task defaults). Exemplar: the component itself. Kaizen carried KZ-015, KZ-001, K-004/KZ-014, KZ-017. Forward pointers: none.
- **Files changed:** `shared/components/data-table/data-table.component.{ts,html,spec.ts}` (+112 / −1).
- **Implementer evidence:** red before implementation — tabindex expected `["0","0","0"]` received `[null,null,null]` (spec:454); Enter expected the UOM-2 row received `[]` (:465); Space `defaultPrevented` expected true received false (:476). Falsifier (a) `keydown.enter` dropped → :465 red, received `[]`; falsifier (b) tabindex unconditional → `hasAttribute('tabindex')` expected false received true (:407); both reverted. KZ-017 declared: real Tab order and focus ring unreachable in jsdom.
- **Leader re-run (non-author): VERIFIED** — `npx jest src/app/shared/components/data-table src/app/pages/platform/pages/administration --coverage=false` 31 suites / 645 tests passed (data-table, control-lists, organizational-structure, ods-admin; consumer specs unchanged); lint clean; `tsc -p tsconfig.spec.json` 943 errors total, 0 in touched files; diff stat = the three files.
- **Reviewer (`akili-reviewer`, opus, full, lens checklist): `STATUS: PASS`** — opted-out DOM unchanged (null attribute bindings; handler early-returns), `target !== currentTarget` before `preventDefault`, Space prevented only on the row, `rowKey` = the `String(row.id)` that `isSelected` compares, events dispatched on the `<tr>`, default test mounts with `selectable=true`, existing assertions untouched.
  - ADVISORY: (1) Enter/Space on a native `<button>` in `#rowActions` fires a synthetic click that bubbles to the row's `(click)` → `rowSelected` (pre-existing click path; jsdom cannot see it). Moot for the ods-admin tables once T-19/T-20 drop `#rowActions`; **forward pointer → T-22 keyboard pass**. (2) duplicated flag check in `onRowKeydown` — keep (P-47 safety). (3) Tab order / focus ring / Space-no-scroll → T-22 Chrome pass.
- **checkpoints:** none. **continuations:** none.
- **spawns:** implementer (Cursor/Grok) — not reported by host, ended complete; reviewer — not reported by host, complete.
- **Requirements covered:** NFR-STF-004 (table rows, jsdom scope), R-STF-008 AC.2 / R-STF-016 AC.1 (selection mechanism; wiring in T-19/T-20).
- **Running totals:** rev-4 tasks 1/5 · rev-4 client LOC +112 · rev-4 review rounds 1/9 (design §14 rev-4 row; corrected below).
- **Approval:** auto-approved (owner standing direction).

#### T-21 — PASS withdrawn, attempt 2 opened (2026-11-24)

- **Cause, observed by the T-18 worker and re-run by the Leader:** `npm run build` → `NG5: Argument of type 'Event' is not assignable to parameter of type 'KeyboardEvent'` at `data-table.component.html:61:38` and `:61:82` (`(keydown.enter)` / `(keydown.space)` → `onRowKeydown($event, row)`). AOT strict templates type a key-alias `$event` as `Event`; jest and `tsc -p tsconfig.spec.json` do not run the template type check (KZ-017: a gate narrower than its claim).
- **Leader defect:** the T-21 brief omitted `npm run build`, which Phase E's shared verification requires for every rev-4 task, and the non-author re-run copied the brief's command list. The Reviewer could not run it (read-only). Counted as an implicit FAIL on attempt 1, so it consumes an attempt. Effort bumped medium → high. Fresh worker, because attempt 1's worker was released at the withdrawn PASS.
- **Attempt 2 (2026-11-24):** fresh Grok `grok-4.7-high`, dispatch `ctx_a184d43d4e24`, task `task_41965a294999`, effort high. The brief carried the NG5 output verbatim and a one-line attempt history. **Files changed:** `data-table.component.ts` only, where `onRowKeydown(event: Event, row)` now narrows with `instanceof KeyboardEvent` before reading `key`. Implementer: build exit 0 ("Application bundle generation complete"); jest 9 suites / 285 tests; lint clean; spec tsc 0 errors in the data-table files.
  - **Leader re-run (non-author, combined with T-18): VERIFIED.** `npm run build` exit 0 with no data-table error. The red is the attempt-1 NG5, seen, so the build gate has been observed failing. jest data-table + `administration/` 33 suites / 656 tests; lint clean; spec tsc 943 total, 0 in touched files.
  - **Reviewer (`akili-reviewer`, opus, full, override e): `STATUS: PASS`.** Guards and their order unchanged; Space `preventDefault` still only on the row (spec 468–486 asserts both sides); emit unchanged; the narrowing is always true for events Angular's key filters deliver. A cross-window event is the only false case, and it is unreachable for a table rendered in the same document. P-47 holds (html untouched).
- **Final status: PASS (attempt 2), 2026-11-24, not committed.** attempts: 2. checkpoints: none. continuations: none. spawns: implementer ×2 (Cursor/Grok, not reported by host; ended complete, complete), reviewer ×2 (not reported by host; complete, complete). Effort: medium → high. Running totals: rev-4 tasks 1/5 · rev-4 review rounds 2/9.
- **Kaizen candidate (for archive):** a brief's verification list must be copied from the phase's *shared* verification as well as the task's Done criteria. The Leader's re-run inherits the brief's list, so a gate left out of the brief is left out twice.
- **Approval:** auto-approved (owner standing direction).

### T-18 — Framework tree table (replaces the outline editor)

- **Attempt 1 (2026-11-24):** fresh Grok `grok-4.7-high`, dispatch `ctx_3ce81751746b`, task `task_43088576b303`, effort high, skills `angular-developer` + `ui-ux-pro-max`, exemplar `center-admin/organizational-structure/components/org-tree/`. Leader narrowing in the brief: `outline-filter.util` had no spec file → `git mv` to `framework-tree/tree-filter.util.ts` plus a new `tree-filter.util.spec.ts`; only the two outline import lines change.
  - **Files:** new `framework-tree/framework-tree.component.{ts,html,scss,spec.ts}`, `tree-filter.util.{ts,spec.ts}` (renamed from `utils/outline-filter.util.ts`); edited `utils/framework-view.util.{ts,spec.ts}`, `outline-editor.component.ts` and `outline-row.component.ts` (imports only). Diff 974 lines.
  - **Implementer:** ods-admin jest 13 suites / 99 tests. Falsifier (a), accent taken from the row's own index → `expect(accentOf('1.2')).toBe(accentOf('1'))` red, received `var(--ac-framework-accent-2)`. Falsifier (b), `target === currentTarget` removed → `expect(selected).toEqual([])` red, received `[1]`. Both reverted. CSS 3,380 B. It reported `failed` only because the build was red on T-21's NG5 (see T-21 above).
  - **Leader re-run (non-author): VERIFIED.** Build exit 0, jest 33 / 656, lint clean, spec tsc 0 in touched files. **Scope limit (KZ-017):** `framework-tree` has no importer yet, so the production build does not AOT-type-check its template; that becomes reachable in T-19.
  - **Reviewer (`akili-reviewer`, opus, full): `STATUS: FAIL`.** One issue: `[ttRow]` ArrowLeft/ArrowRight mutate `node.expanded` and emit `onNodeCollapse`/`onNodeExpand` (`primeng-treetable.mjs:5208-5263`). Both are unbound, so keyboard toggles never reach the collapsed-ids Set or `expansionChanged`. Effects: the state is lost on refresh, and the chevron's first click after a keyboard toggle is a no-op. Violates design §6.3 *Expand state* and *Rows*, T-18 Scope, R-STF-007 "survives a refresh" + AC.3, and NFR-STF-004. The report was relayed verbatim to the same worker.
    - Everything else on the checklist conformed: own chevron with aria, ttRow with no own tabindex, highlight and selected attributes, target guard, + propagation, accent read from the rendered style, 28 px indent, outline not shadow, natural order, no inputs, outputs, search restore, tokens present in both themes, every `$event` typed `Event`.
  - ADVISORY (recorded, not work): dead host binding `--framework-tree-indent-step.px` (the step is the TS constant `indentStep`; note it for T-22 tuning); the capture-phase comment overstates; the chevron is a dead control during an active search; `aria-label` on the role-less `p-treeTable` host is likely ignored (→ T-22 screen-reader pass); Prettier reflowed `tableColumnsForLevel`.
- **Attempt 2:** same worker (retained through the FAIL), effort bumped high → xhigh (steered in the brief; the model slug stays the same).
  - **Files:** `framework-tree.component.{ts,html,spec.ts}`. `(onNodeExpand)`/`(onNodeCollapse)` → `onNodeToggle`; both it and `toggle()` go through `writeCollapsed`, which is the only writer of the Set and the only emitter of `expansionChanged`. New test "keeps ArrowLeft and ArrowRight in the collapsed set across a refresh" covers ArrowLeft → refresh → chevron → search/clear → ArrowRight. Red against the attempt-1 code at spec:234 (`expect(emitted.at(-1)?.has(1)).toBe(true)`, Received undefined), then green.
  - **Leader re-run (non-author): VERIFIED.** jest ods-admin + data-table 14 suites / 116 tests; lint clean; build exit 0; spec tsc 943 total, 0 in framework-tree.
  - **Reviewer (`akili-reviewer`, opus, full, override e): `STATUS: PASS`.** Trace a/b/c resolved; one source of truth. The test discriminates: removing both bindings → spec:234 red, removing only `onNodeExpand` → spec:255 red. Typings checked: `onNodeExpand: EventEmitter<TreeTableNodeExpandEvent>`, which extends `TreeTableNodeCollapseEvent` and adds nothing (`treetable.d.ts:409/415`, `treetable.interface.d.ts:82-98`), so no NG2345 is expected when T-19 wires the tree. This was read from the typings, not compiled. The build in T-19 settles it.
  - ADVISORY (recorded, not work): a toggle made during an active search is ephemeral and is dropped when the search clears; this is allowed by R-STF-007 "force-expanded" → **forward pointer: T-22 HITL notes**. Rename the parameter `collapsed` → `toCollapsed`.
- **Final status: PASS (attempt 2), 2026-11-24, not committed.** attempts: 2. checkpoints: none. continuations: none. spawns: implementer (Cursor/Grok) ×2 turns in one worker, not reported by host, ended fail (red build, not its own) and then complete; reviewer ×2 (not reported by host; FAIL, PASS). Effort: high → xhigh.
- **Forward pointers → T-19:** the AOT strict-template check of `framework-tree` first runs when the page imports it; the tree's own indent step is the TS constant `indentStep`, and the host binding `--framework-tree-indent-step.px` is dead (advisory). **→ T-22:** search-time toggles are ephemeral; `aria-label` sits on the role-less `p-treeTable` host (screen-reader pass); the chevron is inert during search.
- **Running totals:** rev-4 tasks 2/5 · rev-4 client **999 LOC added** / 19 deleted (`git diff HEAD --numstat -- client/`) · rev-4 review rounds **4/9** — *corrected 2026-11-24:* design §14 has its own rev-4 row (≈ 2,300 LOC, ≈ 7 rounds; tripwire 3,000 LOC added or 9 rounds). The earlier T-21 line "28/≈36" counted against the pre-rev-4 re-base by mistake.
- **Approval:** auto-approved (owner standing direction).

### T-19 — first step: P-46 settled live (Leader, 2026-11-24)

- **Where:** Chrome (Claude extension), `localhost:4200/administration/ods-admin/framework`, width 1280, measured at innerHeight **650** and **800** (window 827 / 977). The page as committed (outline editor + drawer), `div.content.scrollTop = 0`. The local server points at the shared DB, and this was read-only.
- **Geometry observed:** `.grid-container` rows `0px <innerHeight>`. `div.content` has `top 0` and `clientHeight == innerHeight` (650 / 800). Navbar (`alliance-navbar`, 51 / 71 px) and section header (`#section-sidebar`, 60.5 / 42 px) are `position: fixed`. The page is offset by the content wrapper's `padding-top`, **111.5 px / 113 px = navbarHeight + headerHeight exactly**, which are the `CacheService` signals (navbar host `ResizeObserver`, `#section-sidebar` rect).
- **Above the list (both heights):** `page-header` 68.5, `summary-line` 21, `framework-banner` 39, section `row-gap` 18 × 3 → **182.5 px**. `.app-page-wrapper` adds margin 25 px top / 70 px bottom (global, `custom-fields.scss:35`) plus `pt-3` 12 px.
- **Verdict P-46: confirmed, with one condition.** `calc(100vh − navbarHeight − headerHeight)` equals the visible height below the fixed chrome. It fits without scrolling only if the page root cancels the wrapper's 25/70 margins and 12 px top padding. That is what design §6.x already requires ("zero vertical padding and margin"); left alone, the page overflows by 107 px.
- **280 px target: confirmed.** At 650: 650 − 111.5 − 182.5 − 16 (bottom gap) = **340 px** for the split row (60 px margin). At 800: ≈ 488 px. Kept as the `min-height` target.
- **Not measured here:** "with a tall element selected" needs the new panel, which does not exist yet. That is T-19 falsifier (c) and the T-22 HITL.
- **Execute-time spec edit (no change of meaning):** `design.md` §6 viewport-fit paragraph and §13 P-46 row, `UNVERIFIED` → verified, with the numbers above. → named conformance check for the T-19 Reviewer: "conformance to `design.md` viewport-fit + P-46 as amended 2026-11-24".

### Execute-time spec edit — overlay guard deletion moved T-19 → T-20 (2026-11-24)

- **Found while composing the T-19 brief:** `ods-admin/overlay-escape-guard.directive.ts` is still used by `institutional-objectives/components/objective-panel` (html + ts + both IOB specs), and the IOB drawer stays until T-20. As written, T-19 would delete the directive and break the IOB build, and its done-criteria grep over all of `ods-admin/` could never reach 0 while the IOB drawer exists.
- **Edit (task ordering only; no requirement or design meaning changes; design §2.1 already lists the directive as retired in rev 4):** T-19 removes the guard from `element-panel` and greps only `ods-admin/framework/`. T-20 deletes the directive file with its last consumer, and its grep now includes `OverlayEscapeGuard`. Recorded in `tasks.md` § T-19 and § T-20.
- Named conformance check for the T-19 and T-20 Reviewers: "conformance to `tasks.md` T-19/T-20 as amended 2026-11-24".

### T-19 — Side panel layout, unsaved-changes guard and the Framework page

- **Attempt 1 (2026-11-24):** fresh Grok `grok-4.7-high`, dispatch `ctx_8e48234acea9`, task `task_5a888fc88985`, effort xhigh (data-loss guard, L). Skills `angular-developer`, `ui-ux-pro-max`. Exemplars: Org Structure page (its sticky panel pattern explicitly not copied, P-42) and `framework-tables` (`refreshToken`, `focusAfterDelete`). The brief carried the measured P-46 geometry, the 2026-11-24 ordering edit and the build-gate lesson.
  - **Files:** new `ods-admin/side-panel-layout/*`, `ods-admin/unsaved-changes.util.{ts,spec.ts}`. Deleted `outline-editor/*` and `outline-row/*`. Edited `framework.component.*`, `element-panel.*`, `framework-tables.*`, `framework-tree.component.html` (`data-row-key` on the `<tr>`), `framework-url.codec.ts` (comment), `framework-delete.handler.ts` (header comment + Prettier reflow; contract unchanged). Kept `overlay-escape-guard.directive.ts` (T-20) and `outline-node.model.ts`.
  - **Implementer:** ods-admin + data-table 14 suites / 98 tests. Falsifier (a), row click without `guardDiscard` → `framework.component.spec.ts:413` `expect(lastAlert().summary).toBe('Discard changes?')` TypeError (undefined). Falsifier (b), stale check removed (`accept()` → true) → `:548` `expect(actions.showToast).not.toHaveBeenCalled()` received 1 (same in `element-panel.component.spec.ts:290`). Both reverted. Styles: side-panel-layout 721 B, framework 1,112, element-panel 1,400, framework-tables 1,025, framework-tree 3,380. It listed every changed or removed assertion (drawer/Escape tests deleted under D-STF-29; edit-row → row click; the delete dialog asserted on the page; Cancel restores values and returns focus to the row).
  - **Leader re-run (non-author), gates: VERIFIED.** jest `administration/` + data-table 33 suites / 639 tests; lint clean; build exit 0; spec tsc 943, 0 under ods-admin; framework grep 0. The specs spell `'p-' + 'drawer'` so the grep does not match the absence assertions (harmless, noted for the Reviewer). Rev-4 LOC: **2,401 added** / 2,780 deleted (new files included via `git add -N`).
  - **Leader live measurement (falsifier c / Done criteria): MISMATCH → implicit FAIL.** Chrome, 1280×650:
    - (1) `div.content` scrollHeight **12,377** vs 650. The page root's `height: var(--framework-column-height)` (`calc(100vh - 111.5px)`) matched but was overridden by `flex: 1 1 0%` from the global `.app-page-wrapper` (`custom-fields.scss:35`) inside a column-flex `:host` with indefinite height. A temporary `flex: none` override gave a 539 px page, `.content` 650/650, list and panel 340 px at top 294, panel bottom 634 ≤ 650. With indicator 1.1.1 selected, the panel's 748 px of content scroll inside its 340 px and the page stays put. **Cause confirmed live.**
    - (2) The tree's Name column collapses: `table-layout: fixed`, five unsized `th` at 137 px each; inside the name cell, toggle 28 + counts 141 (no shrink) leave `.framework-tree__name` at **0 px**, so names render one letter per line and rows are 595 px tall. Override (Name `th` 50% + counts shrink) → 49 px rows, names readable. Responsibles still wraps to 6 lines and the "+ Dimension" button to 2 (advisory-grade).
    - Not caught by T-18's review either: jsdom has no layout (KZ-017). This is the first time the tree rendered in a real browser.
  - **No Reviewer spawned** (MISMATCH → FAIL per Step 2; it adds no review round). The feedback, with measured values and the live-verified causes, was relayed to the same worker.
- **Attempt 2:** same worker (dispatch `ctx_b5d383c01b27`, follow-up), effort held at xhigh (T2 ceiling).
- **Attempt 2 (2026-11-24):** same worker. `framework.component.scss` `flex: none` on the page root. Tree: `[autoLayout]`, Name `th` 50%, name `flex: 1 1 8rem; min-width: 8rem`, counts shrink, nowrap on Code/Level/Actions. Styles: framework 1,126 B, framework-tree 3,526 B.
  - **Leader re-run (non-author): VERIFIED.** jest 33 / 639; lint; build 0; spec tsc 0 under ods-admin; grep 0.
  - **Leader live measurement:** Chrome, indicator 1.1.1 selected.
    - 1280×650: `.content` 650/650, panel 294–634, panel content 748 scrolls inside 340, list 3,040 scrolls inside 340, tree columns 299/61/118/108/97.
    - 1280×800: 800/800, panel 296–784.
    - **Falsifier (c)** (column removed live, `flex: 1 1 0%` + `height: auto`): `.content` 5,463 vs 800 → red, then restored to 800/800. At 650 the red was already seen as attempt 1's 12,377 vs 650.
  - **Reviewers (parallel lens; counted as ONE review round):**
    - **a11y/UI/readability lens:** `STATUS: PASS`. Panel `aside` + label + empty text, header, Delete at the top (edit only, `aria-disabled` + reason), Cancel/Save, failed save `role="alert"`, focus on create/Save/Cancel/delete per §6.9 and §6.5, toggle group `aria-pressed` + chip-follow, empty state in the list slot, stacking below 1024 px, 0 hex, no drawer leftovers.
    - **correctness/data-loss lens:** `STATUS: FAIL`. Issue 1: the dirty baseline (`opened`) is never re-captured after a successful save, edit or create. As a result the panel stays dirty, an already-saved edit prompts, and Cancel restores the pre-save values, which a later Save would send back. Violates §6.5, §6.9 and R-STF-016 Cancel. Issue 2: Keep editing on a portfolio change leaves the `p-select` showing the rejected portfolio (one-way `[ngModel]` with `(onChange)`). Violates R-STF-016 "Keep editing leaves everything as it was" and JC-3. The report was relayed verbatim. The Leader added a narrowing: check the same display defect on the level chips and the Tree/Table toggle.
  - ADVISORY (both lenses, recorded, not work): stale `element-panel.scss:32-34` drawer comment; comment the `'p-' + 'drawer'` split; `host()` returns `document`; inline Name width belongs in SCSS; focus after Save is lost if the saved row is hidden by search or collapse (→ **T-22 keyboard pass**); `promptOpen` WeakMap could stick if the alert is removed without its callbacks (T-20 shares it; not constructed here); browser back/forward bypasses the guard via `queryParamMap` (`replaceUrl` makes it hard to reach).
  - **Spec tension (both lenses):** design §6.9 says the Tree↔Table toggle "keeps the selection and its unsaved edits … nothing is discarded", and also that it is "itself a guarded trigger". R-STF-016 lists the view change as a trigger where Discard proceeds. The code follows R-STF-016. **Raised to the owner as an amendment proposal** (below). The code stays as it is.
- **Attempt 3:** same worker (follow-up), **effort ceiling: held xhigh** (the owner's rule keeps the same worker through FAIL/rework; no in-host T3 Implementer escalation). Rev-4 review rounds 5/9.
- **Attempt 3 (2026-11-24):** same worker, follow-up dispatch `ctx_8ee0b601b616`.
  - **Files:** `element-panel.component.ts`: the prepare key now carries the stored element's code, name, description, parent and carnets, so the refresh after Save re-prepares. `framework.component.ts`: `portfolioSelect()?.writeValue(portfolioId())` on Keep editing. `framework.component.spec.ts`: 4 new tests, each seen red against attempt 2: `:422` (0 expected, received 1), `:445` (old name received), `:468` ("" received), `:577` (rejected portfolio label shown). Chip and toggle were already correct (`:528`, `:540`).
  - **Leader re-run (non-author): VERIFIED.** jest 33 suites / 643 tests, lint clean, build 0, spec tsc 0 under ods-admin, grep 0. No layout file changed since the attempt-2 live measurement.
  - **Reviewer** (`akili-reviewer`, opus, correctness/data-loss, override e/f): **`STATUS: FAIL`**.
    - **Resolved:** both attempt-2 issues, for edit and create. `writeValue` reverts on Keep editing and applies on Discard. The tests discriminate.
    - **New issue (introduced by attempt 3):** edits typed while a Save is in flight are silently discarded. The fields are not disabled during save. When the PATCH resolves, `reloadEditor()` changes the stored stamp, the key differs, and `prepare()` runs `form.reset(existing)` (`element-panel.component.ts:173-179, :326-334`). Same in create, during the POST + GET window. Violates R-STF-016 *Unsaved changes* "BUT it must NOT replace the form without asking" and §6.5.
    - **Remediation proposed:** snapshot `readForm()` at Save and, on success, set `opened` to that snapshot; drop the stored stamp from the key. Alternative: re-prepare only when not dirty. Alternative: disable the form while saving, which is a behaviour change and the owner's call.
    - **ADVISORY:** between save success and refresh, `isDirty()` still compares against the pre-save values, so a row click there asks about already-saved edits (goes away with the snapshot fix). Cascade code changes would change the stamp; no path found today. No regression elsewhere.
  - Rev-4 review rounds: **6/9**.

## HALT: T-19 (2026-11-24)

- **Cause:** 3 attempts consumed:
  1. Leader live-measurement MISMATCH: global wrapper flex overrode the column height; tree Name column 0 px.
  2. Reviewer FAIL: the dirty baseline was not re-captured after save; Keep editing left the portfolio select stale.
  3. Reviewer FAIL: the attempt-3 fix wipes edits typed during an in-flight save.
- **Implementer summaries:** see attempts 1–3 above, all in the same Grok worker (dispatches `ctx_8e48234acea9` → `ctx_b5d383c01b27` → `ctx_8ee0b601b616`). The worker is retained, per the owner's rule (alive until PASS).
- **FAIL reports:** attempt 1 = the Leader's measured MISMATCH (above). Attempts 2 and 3 = the Reviewer reports, recorded above and relayed verbatim to the worker.
- **Final verification output (attempt 3):** jest 33 / 643 green, lint clean, build exit 0, spec tsc 0 in ods-admin, grep 0. Live fit at 1280×650 / 1280×800 green (attempt 2 measurement, layout untouched since).
- **Leader's root-cause hypothesis:** not a spec problem and not one recurring defect. Each attempt fixed what it was told, and the third fix opened a new edge, because the dirty baseline has no single owner: it is re-derived from refresh timing instead of being set by the save that produced it. The Reviewer's snapshot remediation is a small, targeted change. Design §6.5 already implies it ("the values it was opened with"). One open product question: whether fields should be read-only while a save is in flight.
- **Tree state:** holds other PASSed uncommitted work (T-21 data-table, T-18 framework-tree). Per Step 4, a rollback would be a pathspec restore of T-19's files only: `framework.component.*`, `element-panel.*`, `framework-tables.*`, `framework-tree.component.{html,scss}` changes, `framework-url.codec.ts`, `framework-delete.handler.ts`, the deleted `outline-editor/*` and `outline-row/*`, the new `side-panel-layout/*` and `unsaved-changes.util.*`. That is also T-18's tree component, partly. **Rollback NOT executed yet:** it is destructive, it overlaps T-18's PASSed files, and it would discard a mostly-correct L-size diff. The owner decides (options presented in chat).

### Owner decisions at the T-19 HALT (2026-11-24)

- **HALT resolution:** *"Attempt 4 with the snapshot"*. The tree is kept (no rollback). The same worker re-baselines the dirty state to the values actually saved, and adds a test that types during an in-flight save. This is an owner-approved fourth attempt beyond the 3-attempt ceiling. Rev-4 review round 7 of 9 if it reaches a Reviewer.
- **Spec tension §6.9 vs R-STF-016:** *"Ask first"*. **Execute-time spec edit:** `design.md` §6.9, Tree ↔ Table sentence. The view toggle is a guarded trigger; Discard reverts and keeps the selection; the chip follows without a second prompt. The superseded wording is quoted inline. The code already behaves this way. Sweep: `grep -n "nothing is discarded\|its unsaved edits" design.md requirements.md tasks.md` → 0 after the edit. Named conformance check for the next T-19 Reviewer and the T-20 Reviewer: "conformance to `design.md` §6.9 Tree ↔ Table as amended 2026-11-24".
- **Attempt 4 (2026-11-24, owner-approved after the HALT):** same worker, dispatch `ctx_aa481feed588`.
  - **Files:** `element-panel.component.ts` and `framework.component.spec.ts`. `save()` snapshots `readForm()` before PATCH/POST; on success `adoptSaved` makes the snapshot the `opened` baseline (the server's code only if the user left the code field untouched). `storedStamp` was removed from the prepare key.
  - **New tests, each seen red against attempt 3:** `:492` (expected "XY", received "X"), `:518` (create, "XY" vs "X"), `:544` (0 calls expected, received 1).
  - **Leader re-run (non-author): VERIFIED.** jest 33 suites / 646 tests; lint clean; build 0; spec tsc 0 under ods-admin; grep 0. No layout change since the live measurement.
  - **Reviewer** (`akili-reviewer`, opus, correctness/data-loss, override e/f): **`STATUS: PASS`.**
    - Edit and create resolved. The only remaining `form.reset` paths are guarded selection triggers or Cancel/Discard.
    - Cancel and the Tree ↔ Table Discard after a save restore the saved snapshot. Conformance to §6.9 as amended 2026-11-24.
    - Stale data while the form is clean is acceptable (no live sync in the spec).
    - The tests use held promises and real clicks.
  - **ADVISORY** (recorded, not work):
    - Create-mode survival relies on `selectedId` being seen before the refresh GET; this is not constructible under zone timing. An explicit "adopted after save" marker is suggested.
    - A second Save during the post-create GET sends a duplicate POST, rejected by the unique code index (P-30). This is pre-existing.
    - The baseline keeps untrimmed name and description (cosmetic).
    - Discarding during an in-flight PATCH skips the list refresh (pre-existing).
- **Final status: PASS (attempt 4, owner-approved beyond the 3-attempt ceiling), 2026-11-24, not committed.**
  - attempts: 4. checkpoints: none. continuations: none. effort: xhigh (ceiling held).
  - spawns: implementer (Cursor/Grok) — one worker, 4 turns, not reported by host (ended complete ×4); reviewer ×5 (not reported by host: attempt 2 ×2 parallel lenses PASS/FAIL, attempt 3 FAIL, attempt 4 PASS).
  - Live measurement (falsifier c): 1280×650 → `.content` 650/650, panel 294–634; 1280×800 → 800/800, panel 296–784; column removed → 5,463 vs 800 (red), restored.
  - **Forward pointers → T-20:** `promptOpen` WeakMap shared through `unsaved-changes.util` (it must not stick); same baseline-from-save rule for `objective-panel`; same Keep-editing display revert for the year and portfolio selects; same global `.app-page-wrapper` flex override. **→ T-22:** focus after Save when the row is hidden by search or collapse; stale `element-panel.scss:32-34` drawer comment; `aria-label` on the role-less `p-treeTable` host; search-time toggles are ephemeral; Enter on a row-action button.
- **Running totals:** rev-4 tasks 3/5 · rev-4 client **2,600 LOC added** (tripwire 3,000) · rev-4 review rounds **7/9** (attempt 2's parallel lenses counted as one). Not exceeded.
- **Approval:** auto-approved (owner standing direction). The HALT itself was decided by the owner above.

## Session pause (2026-11-24, owner: "vamos parando por hoy")

- **T-20:** dispatched (Grok `grok-4.7-high`, `ctx_610c9eea5424`, task `task_edc4778770b4`, brief = task text + T-19 lessons; Leader-added tests tagged `[advisory-grade]` in a follow-up note) and **stopped by the owner before it reported** (`worker-stop`, terminal closed). Tree probe: `git status` under `institutional-objectives/` and the directive file → **no partial edits**. Not a runtime event and not an attempt: T-20 restarts from scratch with a fresh worker, and the brief is reusable (`brief-T20.md` content = tasks.md § T-20 + the "Lessons from T-19" list recorded under T-19's forward pointers).
- Also released the leftover settled dispatch `ctx_e284f0874b5b` (`terminalState=release_unknown`). No Orca worker is left open for this spec.
- **State:** T-21, T-18 and T-19 PASS, all **uncommitted** (UI, waits for the owner's visual approval in T-22). T-20 todo, T-22 todo. Rev-4 totals: 2,600 LOC added (tripwire 3,000), review rounds 7/9. T-20 will very likely cross the LOC tripwire, which means a stop for the owner.
- **Next:** `/akili-execute institutional-performance/strategy-framework` → T-20 (fresh worker), then T-22 (docs + HITL; the T-22 forward pointers are listed in the T-19 entry).
- **Correction (2026-11-24, owner):** the owner meant "let the worker finish T-20, then stop dispatching", not "stop the worker". T-20 was re-dispatched with the same brief (with the `[advisory-grade]` tag inlined) to a fresh worker. The run stops after T-20 closes; T-22 is not dispatched today.

### T-20 — Institutional Objectives in the side panel

- **Attempt 1 (2026-11-24):** fresh Grok `grok-4.7-high`, dispatch `ctx_b105a8b9c630`, task `task_f516062fc1b6`, effort xhigh. Brief = task text + "Lessons from T-19". Leader-added tests tagged `[advisory-grade]`. Full report: `/tmp/t20-institutional-objectives-report.md` (summary below).
  - **Files:** 8 IOB files (`institutional-objectives.component.*`, `objective-panel.component.*`); deleted `ods-admin/overlay-escape-guard.directive.ts`.
    - Snapshot baseline `adoptSaved`; prepare key `portfolio:id-or-new:token`, with no stored stamp.
    - Extra `holdFormFor` guard against a refresh batched with the new id.
    - `writeValue` on the portfolio and year selects on Keep editing.
    - Refresh in place after Save, Delete and Carry forward.
  - **Falsifiers:**
    - (a) `loading.set(true)` in `onSaved` → `spec:415` `expect(root().querySelector('table')).toBe(table)`, received null.
    - (b) year change unguarded → `spec:574` TypeError on `lastAlert().summary`.
    - Both reverted.
  - **T-19-lesson reds:**
    - `adoptSaved` removed → page `:436`, `:454`, `:482`, `:558`, panel `:252` red.
    - Key stamped + `holdFormFor` removed → page `:502`, `:533`, panel `:236` red.
    - `writeValue` removed → page `:580` (year label `2027 · 0 objectives`), `:598` (portfolio label) red.
    - All reverted.
  - The Implementer listed every changed or removed assertion: row actions → row click/Enter; row-icon colour checks → panel reason; overlay-Escape test retired with the drawer; split-string drawer absence with a comment.
  - **Leader re-run (non-author): VERIFIED.**
    - jest `administration/` + data-table: 33 suites / 662 tests.
    - lint clean; build exit 0; spec tsc 0 under ods-admin.
    - `grep p-drawer|pFocusTrap|OverlayEscapeGuard` over all of `ods-admin/` → 0.
  - **Leader live measurement (Chrome), tallest IOB row (IOB-1, 183 px) selected:**
    - 1280×650 → `.content` 650/650; panel 271–634; panel content 517 scrolls inside 364; list 1,324 scrolls inside 364.
    - 1280×800 → 800/800; panel 281–784.
    - Screenshot taken at 650.
  - **Reviewer: NOT spawned yet — budget tripwire (below).**

## Budget Tripwire: T-20 (2026-11-24)

- **Rev-4 budget** (design §14 rev-4 row): ≈ 2,300 LOC added (≈ 1,100 production, ≈ 1,200 tests), ≈ 7 review rounds. **Tripwire: 3,000 LOC added or 9 rounds.**
- **Measured after T-20's implementation:** **3,831 LOC added** (production 2,133 + tests 1,698; `git diff HEAD --numstat -- client/`, new files included); 3,504 deleted. Review rounds **7/9**, not yet exceeded.
- **Cause:**
  - Production is ~2× the estimate. Two full side-panel pages, a dirty guard with snapshot baselines, and refresh-in-place came to more than the ≈ 1,100 estimated.
  - T-19 needed 4 attempts; each added regression tests (save→click, save→Cancel, in-flight typing, Keep-editing label).
  - T-20 carried the same lesson tests up front. Those tests are ≈ 45 % of the total.
- **Remaining:**
  - T-20's review: ≥ 1 round, round 8/9.
  - T-22: docs + HITL; checklist review, little code.
- **Stopped for the owner's decision.** The tripwire is never auto-approved. "No mandate widens pre-approval: an owner brief that says 'never stop' or 'treat every gate as approved' pre-approves routine gates only."
- T-20's worker stays alive (retained) until the decision, and through any FAIL.
- **Owner decision (2026-11-24):** *"Re-base and run the review"*. New rev-4 cap ≈ 4,500 LOC / 11 rounds, added to `design.md` §14 as a new row (the earlier row is kept). Run T-20's Reviewer now, then stop for today; T-22 tomorrow.
- **Reviewer (`akili-reviewer`, opus, full; round 8/11 under the re-base): `STATUS: FAIL`.**
  - **Holds:** snapshot baseline, refresh in place, guards on the 5 triggers, Delete at the top with `deletable`, focus by key, inline failed save, no drawer, conformance to both 2026-11-24 amendments; `holdFormFor` cannot block a legitimate re-prepare.
  - **Issue:** the `writeValue(current)` added for Keep editing runs **before** the guard on every change. On a clean change, or on Discard, NgModel's viewModel already equals the new value, so it never writes back (`forms.mjs:3373-3379`), and the select keeps showing the old year or portfolio while the table shows the new data set. Violates R-STF-009, JC-3 and R-STF-016 "Discard proceeds".
    - The tests used `triggerEventHandler('onChange')`, which bypasses `onModelChange` (KZ-015).
    - The same defect is in `framework.component.ts:216` (portfolio), introduced in T-19 by the same lesson. **Root cause on the Leader's side:** the T-19 lesson in the T-20 brief said "on Keep editing, call `writeValue`", and both implementations called it unconditionally.
  - ADVISORY: saving an IOB with a changed Year moves it out of the page year, so the selection clears right after the toast (JC-3 vs R-STF-016 "stays selected"; a product note for T-22); `promptOpen` stickiness (not constructible); a `holdFormFor` comment; untrimmed baseline (cosmetic).
- **Attempt 2:** same worker, effort xhigh (held). Scope extended to `framework.component.{ts,spec.ts}` **only for this defect**, as a FAIL remediation of the same root cause; recorded here as a T-19 follow-up fix.
- **Attempt 2 (2026-11-24):** same worker (dispatch `ctx_a4f18565c910`). Report at `/tmp/t20-rework-report.md`.
  - **Change:** `guardDiscard` gains an optional `onKeep` argument, run after the prompt flag clears and only on Keep editing. IOB year/portfolio and Framework portfolio call `writeValue(current)` only from it.
  - **Files changed:** IOB component ts/spec, `framework.component.{ts,spec.ts}`, `unsaved-changes.util.{ts,spec.ts}`. The util has 1 new test; the 2 existing util tests are unchanged.
  - **Red-then-green:** six new `onOptionSelect`-driven tests, each red against attempt 1 on the rendered label while the signal had already moved:
    - IOB `:620` clean year, `:637` Discard year, `:652` clean portfolio, `:669` Discard portfolio;
    - Framework `:676` clean portfolio, `:695` Discard portfolio.
  - **Leader re-run (non-author): VERIFIED.** jest 33 suites / 669 tests; lint clean; build 0; spec tsc 0 under ods-admin; `ods-admin` grep 0.
  - **Leader live check (Chrome):** IOB, a row selected but clean, real option click on 2027 → label "2027 · 0 objectives", "Carry forward to 2028", 0 rows, empty state shown. The attempt-1 viewport measurement stands (no layout change).
  - **Reviewer** (`akili-reviewer`, opus, full, override e/f; round 9/11): **`STATUS: PASS`**.
    - All three selects are correct on the clean, Discard and Keep paths.
    - `close()` runs before `onKeep`, so the flag cannot stick.
    - Other callers are unchanged and nothing regressed.
    - The tests discriminate.
  - **ADVISORY** (recorded, not work):
    - After Keep editing, NgModel's `viewModel` keeps the rejected value. A later *programmatic* set to exactly that value would skip the write (not constructible with seed data). Hardening: set `viewModel` in `onKeep`.
    - Framework `viewChild(Select)` should use a named `#portfolioSelect` ref.
    - `onPortfolioChange` no longer needs `async`.
    - From attempt 1: saving an IOB with a changed Year clears the selection after the toast (JC-3 vs R-STF-016) → **T-22 product note**.
- **Final status: PASS (attempt 2), 2026-11-24, not committed.**
  - attempts: 2 · checkpoints: none · continuations: none · effort: xhigh.
  - spawns: implementer (Cursor/Grok) ×2 turns in one worker, not reported by host (complete, complete); reviewer ×2 (not reported by host; FAIL, PASS).
  - **T-19 follow-up:** the Framework portfolio display defect was fixed here (same root cause).
- **Running totals:** rev-4 tasks 4/5 · rev-4 client **3,981 LOC added** (cap re-based to ≈ 4,500) · review rounds **9/11**.
- **Forward pointers → T-22:** the IOB Year-change-on-save selection clear (product note); the NgModel `viewModel` hardening (advisory); the earlier T-19 pointers.
- **Approval:** auto-approved (owner standing direction). The run stops here per the owner ("finish the worker, then stop for today").

## Session resume (2026-11-25)

- `/akili-execute` → T-22 (the only eligible task). No worker spawned: T-22 is docs + a Leader-run live pass + the owner's verdict (Review: checklist).

### T-22 — Docs, family F-4 and the rev-4 HITL pass

- **Status:** in progress — measurements recorded, **waiting for the owner's verdict**. UI still uncommitted.
- **Docs (Leader, uncommitted):**
  - `family.md` F-4: the 2026-11-17 Strategy Framework child-3 exception (inline name editing) withdrawn, rev-4 note added; Document Control "Last updated" 2026-11-25.
  - `docs/ux-ui/design.md` §12.2: new 2026-11-25 entry — ODS Admin tree/level table beside a viewport-fit side panel (D-STF-29…31, D-STF-36), ask-first unsaved changes, inherited area bar, opt-in `keyboardSelectable`.
  - Client README styles row: not touched — `git diff HEAD -- client/research-indicators/src/styles src/app/theme` is empty (no token changed).
- **Live pass (Leader, Chrome via the extension, 2026-11-25, local client :4200 + local server :3001 on the shared DB — read-only: no Save, Delete or Carry forward was clicked).**
  - **Falsifier — 1280×650, tall Indicator selected (`1.1.1 Process efficiency`, 6-line Responsibles):** `.content` scrollHeight/clientHeight 650/650; list slot 294–634 (3,040 scrolls inside 340); panel slot 294–634 (748 scrolls inside 340). Panel scrolled to the end: Save button bottom 634 ≤ `innerHeight` 650. **Not red.**
  - **1280×800, same selection:** `.content` 800/800; both slots 296–784 (panel 748 inside 489). Table view at 650: 650/650, slots 294–634. IOB at 800 with IOB-1 selected: 800/800, slots 281–784 (panel 526 inside 503).
  - **800 px wide (800×800):** slots stack (list 378–1781, panel 1797–2491); the page scrolls (`.content` 2,507/800), as designed below 1024 px; no horizontal overflow (`scrollWidth` 800 = `clientWidth` 800).
  - **Indent step:** at 800×800 the name text starts at 134 / 162 / 190 px for levels 1 / 2 / 3 (28 px step, padding 0 / 28 / 56). **At 1280×800 it is 146 / 174 / 166** — the level-3 (leaf) name sits 8 px *left* of its parent Dimension's name. There the Name column is 251 px, so parent rows wrap their counts onto a second line while the leaf row has no chevron. Same width at 1280×650 renders 138 / 166 / 194 (correct). **Finding F-1.**
  - **Inherited bar:** every sampled row of area 1 carries `box-shadow: rgb(92,122,20) 4px 0 0 0 inset` on the first cell, levels 1–3; continuous under the selected row (screenshot).
  - **Selected row:** light-blue background + area bar. The `<tr>` outline is not visible at normal zoom.
  - **Dark mode:** not reachable — the app has no dark theme (same finding as the T-17 round 1 record; `localStorage.theme=dark` does not set `data-theme` on this build).
  - **Keyboard — tree:**
    - From the search box, Tab lands on one row (roving `tabindex`).
    - ArrowDown moves between rows; Enter and Space select (`aria-selected="true"`, panel header `INDICATOR · LEVEL 3`).
    - Chevrons are `tabindex=-1` with `aria-label`/`aria-expanded`.
    - Enter on **+ Indicator** opens create `1.2.5 New Indicator` with focus in Code; the tree stays at 48 rows; no row selected.
    - From a row, Tab goes through **every visible `+` button (17 tab stops)** before it reaches the panel. **Finding F-2.**
    - The `p-treeTable` host carries `aria-label="Framework tree"`, but the host has no role and the inner `<table>` has none of its own (forward pointer from T-18 — still open).
  - **Keyboard — Table view (Indicators):** click a row, then Tab moves to the next row (1 px focus outline); Enter selects 1.2.2; Tab + Space selects 1.2.3; `.content` scrollTop stays 0 (Space does not scroll the page). Tree → Table kept the selection and set the `depth-3` chip.
  - **Keyboard — IOB:** from search, Tab → Export → 3 sortable headers → first row; Enter selects IOB-1 (`IOB-2 · 2026` header after Tab + Space); Delete at the top.
  - **Unsaved-changes guard:**
    - Dirty create form + a row click → *Discard changes?*.
    - **Keep editing** keeps "HITL draft" and no row gets selected; **Discard** selects the clicked row.
    - **After either answer, focus is on `<body>`.** **Finding F-3.**
    - Cancel on a dirty edit reverts the text and returns focus to the selected row.
  - **Not exercised (shared DB, writes forbidden):** focus after Save when the row is hidden by search or collapse; IOB Year change on save; Delete focus move. These stay covered by jest only.
  - **Side by side with Organizational Structure (1280×800):**
    - **Same:** split layout, Tree/Table toggle, summary chips, Delete at the panel top, light-blue selected row.
    - **Different:**
      - Org Structure's panel and empty state sit in a white card; the Framework and IOB panels sit on the page background with no card.
      - Org Structure uses an icon-only **+** in a Status column; Framework uses text buttons ("+ Dimension" / "+ Indicator").
      - Org Structure's indent step is 16 px; Framework's is 28 px (owner decision: bigger indent).
      - Org Structure keeps name and count on one line; Framework wraps the count under the name at 1280×800.
      - Org Structure starts collapsed; Framework starts expanded.
  - **Other observations:**
    - "+ + Indicator" (table header) and "+ + Add objective" (IOB) show a plus icon **and** a "+" in the label (F-4).
    - Responsibles still wraps at about 1 word per line (open owner call from 2026-11-23).
    - Two Export buttons on the Table view (open owner call).
    - Search-time toggles are ephemeral (T-18 pointer — R-STF-007 allows it).
- **Evidence screenshots (local, temporary):** tree at 1280×800 (F-1) `/var/folders/hb/4_fzxxh90715phch17y0txgc0000gn/T/claude-chrome-screenshots-9ufuP6/screenshot-1795617599490-2.png`; Org Structure `…/screenshot-1795617669516-3.jpg`.
- **Owner verdict on the findings (2026-11-25):** fix **F-1** (leaf indent) and **F-2/F-3** (keyboard). F-4 (double plus) is accepted as is. The owner then reviewed the page and added two more:
  - **F-5:** the Framework tree search box shows a thick dark outline offset 2 px from the input, cut off by the list slot. Every other input in the app only recolours its own border on focus. Cause: `framework-tree.component.scss:43-49` (`outline: 2px solid …; outline-offset: 2px`). The IOB search is the shared `app-data-table` search, which shows the browser's default outline flush with the input (measured: `outline: rgb(0,95,204) auto 1px`, offset 0). It is the same input as Org Structure's table view and Control Lists, so it is **not changed here** (blast radius).
  - **F-6:** Org Structure wraps its whole detail panel, empty state and form, in a white card (`organizational-structure.component.html:151`: `rounded-lg border border-[var(--ac-grey-200)] bg-[var(--ac-white-1)] p-4`). The Framework and IOB panels sit bare on the page background. Fix it in `side-panel-layout`, so it covers both pages.
- **Rework:** one Grok worker for F-1, F-2, F-3, F-5 and F-6, then a Reviewer, then the Leader re-measures in Chrome, then the owner's visual OK, then the UI commit.
- **Rework attempt 1 (2026-11-25).** Grok `grok-4.7-high` via Cursor, dispatch `ctx_de0ac7e85164`, task `task_5dddc051882d`. Brief: scratchpad `brief-T22-fixes.md` (F-1, F-2, F-3, F-5, F-6; skills `angular-developer`, `ui-ux-pro-max`; effort high).
  - **Files changed:**
    - `framework-tree.component.{html,scss,ts,spec.ts}`
    - `side-panel-layout.component.{html,scss,spec.ts}`
    - `unsaved-changes.util.{ts,spec.ts}`
  - **Falsifiers (Implementer):**
    - F-2 binding removed → `framework-tree.component.spec.ts:142` `Expected "0" Received null`.
    - F-3 restore removed → `unsaved-changes.util.spec.ts:90`.
    - Both reverted.
  - **Leader re-run (non-author): VERIFIED.**
    - jest administration + data-table: 33 suites / 674 tests.
    - lint clean; build exit 0 (framework-tree 3.76 kB, side-panel-layout 0.84 kB); spec tsc 0 under ods-admin.
  - **Leader live check (Chrome):**
    - **F-1:** at 1280×800, name x = 146 / 174 / 202 for levels 1 / 2 / 3; counts aligned with the name.
    - **F-2:** with a Dimension selected, Tab goes row → "Add Indicator under 1.1" → panel Delete. Only that row's + has tabindex 0. From a focused but unselected row, PrimeNG's Tab jumps to the selected row, which is pre-existing `ttRow` behaviour.
    - **F-3:** after Keep editing and after Discard, focus is on the clicked row, not `<body>`.
    - **F-5:** the search box recolours its own border.
    - **F-6:** the card is 8 px radius, 1 px `rgb(232,235,237)` border, 16 px padding.
    - **Falsifier at 1280×650 with 1.1.1 selected:** card 294–634, Save 617 ≤ 650, `.content` 650/650.
    - **IOB at 650:** card 271–634, `.content` 650/650.
  - **Reviewer** (`akili-reviewer`, opus, full): **`STATUS: FAIL`**.
    - F-1, F-2, F-3 and F-6 are sound.
    - F-5: `field__control` added to the search input is an encapsulated class with no effect there. Its test asserts only the class's presence, and the scss comment claims it matches the panel Name field. False: the panel fields use a 2 px outline with a 2 px offset.
    - ADVISORY:
      - F-3 × create-mode focus depends on timer order; Leader to confirm focus on Code.
      - `rovingId` moves before the guard (harmless).
      - Tab after ArrowDown away from the selected row.
      - The util spec cleanup should use `finally`.
  - **Leader live confirmation:** the IOB panel Code field focuses with `outline: rgb(17,47,92) solid 2px; outline-offset: 2px`, the same defect the owner reported on the search box.
  - **Owner decision (2026-11-25):** extend F-5 to every text-like field in both ODS panels; they must use the app-standard focus, where only the field's own border recolours. Scoped to `ods-admin/`.
- **Rework attempt 2:** sent to the same worker (follow-up dispatch `ctx_eb4953b81d26`, task `task_b1331a91b9f9`). It carries the Reviewer issue verbatim, an attempt-history line, the owner's scope decision, and the util-spec cleanup advisory.
- **Rework attempt 2 (2026-11-25):** same worker, follow-up dispatch `ctx_eb4953b81d26`.
  - **Change:**
    - New shared mixins in `ods-admin/ods-field-focus.scss`: `outline: none; outline-offset: 0; border-color: var(--p-form-field-focus-border-color)`. That token is `roartheme.ts` `formField.focusBorderColor` = `{primary.color}`; `focusRing` is 0.
    - Included by the tree search and by both panels (inputs, textareas, `p-select`, `p-multiselect`, `p-autoComplete`). The old offset outline was removed from both panels.
    - `field__control` was removed from the search input, with its presence test.
    - `afterEach` cleanup added to the util spec.
  - **Files changed:**
    - `ods-field-focus.{scss,spec.ts}`
    - `framework-tree.component.{html,scss,spec.ts}`
    - `element-panel.component.scss`
    - `objective-panel.component.scss`
    - `unsaved-changes.util.spec.ts`
  - **Falsifier:** offset outline put back in the mixin → `ods-field-focus.spec.ts:22` red; reverted.
  - **Leader re-run (non-author): VERIFIED.**
    - jest administration + data-table: 34 suites / 675 tests.
    - lint clean; spec tsc 0 under ods-admin.
    - build exit 0: framework-tree 3.79 kB, element-panel 1.72 kB, objective-panel 1.33 kB, side-panel-layout 0.84 kB.
  - **Leader live check (Chrome):**
    - IOB Code, Statement, Year and Linked indicators, and the Framework Name field, all focus with `outline: none`, offset 0 and border `rgb(3,91,169)`.
    - Year was reached by a real Tab and screenshotted: the field's own border recolours, with no detached ring.
  - **Reviewer** (`akili-reviewer`, opus, rework override e): **`STATUS: PASS`**.
    - The token claim was checked at the source (`roartheme.ts:343-349, 450, 575`).
    - No offset outline is left on any panel field; buttons keep their rings.
    - `:host ::ng-deep` stays inside the component.
    - F-1, F-2, F-3 and F-6 show no regressions.
  - **ADVISORY** (recorded, not work):
    - Pin each consumer file to its own mixin in the consumer test.
    - The autocomplete and multiselect selectors are dead in `objective-panel`.
    - From attempt 1: create-mode focus after Discard depends on timer order (Leader: Code focus not re-checked live); Tab after ArrowDown away from the selected row is PrimeNG `ttRow` behaviour.
- **Rework totals:** attempts 2 · checkpoints none · continuations none.
  - Spawns: implementer (Cursor/Grok) ×2 turns in one worker, not reported by host (complete, complete); reviewer ×2 (FAIL, PASS). The worker was released after the PASS (`already_released`).
- **Running totals:**
  - Rev-4 client **4,221 LOC added** (cap ≈ 4,500).
  - Review rounds **11/11**: at the cap, not exceeded. Any further review round trips the tripwire.
- **Next:** the owner's visual approval. Then T-22 → `[x]` and one UI commit for T-18…T-22 plus these fixes.

## Spec amendment B-6 — owner at the T-22 HITL (2026-11-25)

- **Owner, after the F-1…F-6 PASS:** the Table view shows only one level at a time. It should list every Performance Area, Dimension and Indicator in one table, like Organizational Structure. The in-table "+ + Performance Area" button is misaligned and duplicates the header **New Performance Area**. The search box and buttons sit on the dark page background, but on Organizational Structure and Results Center they sit inside the table's container. The tree view has the same problem.
- **Leader finding:** Organizational Structure's whole list column is a card (`organizational-structure.component.html:85`). The ODS list slot is not a card.
- **This changes an approved requirement (R-STF-008), so it was a Pivot-class amendment, approved by the owner in chat before any code:**
  - Chips are count summaries only and do not filter.
  - In the Table view, children are added only from the tree's **+**.
  - Budget re-based to ≈ 5,000 LOC / 14 rounds.
- **Edits:**
  - `requirements.md`: §0b B-6; R-STF-008 rewritten (one table, count chips, no add button, AC.1 = 48 rows); R-STF-016 level-chip trigger removed (details and AC.3).
  - `design.md`: §2 table and diagram; §6.4 amended paragraph; §6.9 chip trigger and chip-follow struck; D-STF-37 and D-STF-38; §14 re-base row.
  - `tasks.md`: new T-23 and a dependency-graph edge.
- **Two-direction sweep:** a forward grep for `level chip`, `per level`, `+ <Level>` and `table per level` across the spec folder. Remaining hits are in historical task text (T-12, T-14, T-19, done), the §13a challenge table (history), counts "per level" (unrelated), and the per-level export workbook (unchanged on purpose). The backward check is §6.9 ↔ R-STF-016, both amended.
- **Not decided here:** the two Export buttons stay an open owner call.
- **T-22:** F-1…F-6 PASS stands. T-22 closes with T-23's owner visual OK, because the owner's verdict on the rev-4 pass is pending T-23.

### T-23 — One Table view and list cards (B-6)

- **Attempt 1 (2026-11-25):** fresh Grok `grok-4.7-high` via Cursor, dispatch `ctx_2e02d9415df4`, task `task_423fa742beba`, effort high. Brief: scratchpad `brief-T23.md` (task text pointer + owner decisions + T-19/T-20 lessons).
  - **Files changed:**
    - `framework-tables.component.{ts,html,scss,spec.ts}` and a new `ods-table-wrap.scss`.
    - `framework.component.{ts,html,spec.ts}`.
    - `framework-url.codec.{ts,spec.ts}`.
    - `side-panel-layout.component.{html,scss,spec.ts}`.
    - `institutional-objectives.component.spec.ts`.
  - **Rewritten assertions:** the Implementer listed each one; the full list is in the worker's `worker_done`. Chips are now a `UL`/`LI` with no `aria-pressed`. The per-level columns test was replaced by Code/Level/Name/Parent/Responsibles. The 48-row test checks the 4/13/31 split. The export file name changed to `strategy-framework.xlsx`. The `+ Level` create test was removed. The old `level=` parameter opens Table and is ignored. The chip guard test was replaced by "does nothing when a level chip is clicked". The codec never serialises `level`.
  - **Falsifiers (both reverted):**
    - (a) Filter the table by the active chip → `framework-tables.component.spec.ts:152` *Expected length 48, Received 4*.
    - (b) Wire the chip back to the guard → `framework.component.spec.ts` (quoted as `:610`; the Reviewer places it at `:607`) *Expected 0 calls, Received 1*.
  - **Leader re-run (non-author): VERIFIED.**
    - jest `administration` + `data-table`: 34 suites / 679 tests.
    - Lint clean; build exit 0; spec tsc 0 errors under ods-admin.
    - `git status -- client/` shows nothing outside ods-admin or data-table.
  - **Leader live check (Chrome):**
    - Table view: one table in a white card (8 px radius, `rgb(232,235,237)` border); chips, search and the table Export are inside the card. Paginator shows 5 pages × 10 = 48 rows. Order is 1, 1.1, 1.1.1, 1.1.2, 1.2, …
    - 1280×800: `.content` 800/800, slots 296–784.
    - 1280×650 with indicator `1.1.2` selected (4-line responsibles): `.content` 650/650, list and panel 294–634, Save bottom 617.
    - Table → Tree keeps the selection and writes no `level` param; the tree list is also a card.
    - IOB list is a card.
    - **Still seen:** IOB **"+ + Add objective"** (plus icon plus "+" in the label). Out of B-6 scope; asked at the owner gate.
  - **Reviewer** (`akili-reviewer`, opus, full): **`STATUS: PASS`**.
    - Single selectable keyboard table; natural sort on two paths.
    - Chips are inert; no chip state is left in the page, URL or guard.
    - Focus after delete is still by `data-row-key`; the list card keeps viewport fit; tokens only; both Exports kept.
  - **ADVISORY** (recorded, not work):
    - The codec `levelDepth` call is a no-op.
    - Dead `actions` rules remain in `ods-table-wrap.scss`.
    - `FrameworkTableCreate` should move next to the panel.
    - Spec title at `:348` still says "a level-table row".
    - Design §6.5 focus sentence: **amended now** as an execute-time edit (`design.md` §6.5, "the next row of the single table in its rendered order on the current page"; carried to the next Reviewer brief if any).
- **Final status: PASS (attempt 1), 2026-11-25, not committed.**
  - attempts: 1 · checkpoints: none · continuations: none.
  - spawns: implementer (Cursor/Grok) — not reported by host (complete); reviewer — not reported by host (PASS).
  - Worker released (`already_released`).
- **Running totals:** rev-4 client **4,376 LOC added** (cap ≈ 5,000) · review rounds **12/14**.
- **Next:** owner visual OK, then T-22 and T-23 `[x]` and one UI commit.

## Owner visual verdict — T-22 and T-23 (2026-11-25)

- **Owner, in chat:** "OK, commit". The owner checked on local `localhost:4200`: Framework in Tree and Table views, and Institutional Objectives.
- The owner had seen IOB's "+ + Add objective" and **accepted it as is** (same call as F-4).
- **T-22 final status: PASS.**
  - Docs: `family.md` F-4 and the ux decision row.
  - Live pass and fixes F-1…F-6: Reviewer PASS on attempt 2.
  - The owner's verdict is recorded above.
  - Open owner calls carried forward, not decided:
    - the two Export buttons;
    - Responsibles column wrap;
    - "+ + Add objective";
    - the IOB search, which uses the shared DataTable focus.
- **T-23 final status: PASS** (Reviewer PASS on attempt 1, owner OK).
- **Not exercised live** (shared DB, writes forbidden): focus after Save when the row is hidden, IOB Year change on save, focus moves after Delete. Jest covers them.
- **Approval:** owner, explicit.

### T-23 follow-up — header Export button and "Add objective" (owner, 2026-11-25)

- **Owner, after the T-23 commit:**
  - the Framework header **Export .xlsx** does not look like the app's export button (Results Center "Export metadata results": outlined, `pi-file-excel`, primary blue);
  - IOB still shows "+ + Add objective", which the owner reversed from the earlier "accept".
- **Attempt 1:** fresh Grok `grok-4.7-medium`, dispatch `ctx_5491043e7894`, brief `brief-T23b.md`.
  - Kept a local `p-button`: the shared `app-filters-action-buttons` disables only while loading, so it would drop the page's `editor() === null || loading()` rule.
  - New styling: outlined, `pi-file-excel`, white background, border and text `--ac-light-blue-400` (`colors.scss:10` = `#035ba9`), 8 px radius.
  - IOB label is now `Add objective`, icon kept; focus-after-delete still finds the button by `data-testid`.
- **Leader Chrome check:** Export rendered 27 px tall against ~34 px for its siblings, so it sat lower than the rest of the row. Sent back to the worker (Leader live finding, before review); follow-up dispatch `ctx_46742accf128`: `size="small"`, 13 px, and no `py-1` / `max-h-27` overrides.
- **Leader re-run (non-author): VERIFIED.** jest administration 33 suites / 664 tests; lint clean; build 0; spec tsc 0 under ods-admin.
- **Leader Chrome check:** Tree, New Performance Area and Export all render at 146–179 px (34 px tall). Export border and text `rgb(3,91,169)` on white. IOB reads "+ icon Add objective".
- **Reviewer** (`akili-reviewer`, opus): **`STATUS: PASS`**.
  - Token checked at source; no hex.
  - The reason for not reusing the shared component is correct.
  - The tests assert the outlined class, the icon, the disabled rule and size parity.
  - 0 `+ Add objective` left in `src`.
  - Not checked: dark theme (none in the app).
- **Final:** PASS. attempts 1 (+1 Leader-feedback turn) · checkpoints none · spawns: implementer ×2 turns (not reported by host), reviewer ×1 (PASS). Worker released.
- **Running totals:** review rounds **13/14** · rev-4 LOC ≈ 4,400 / ≈ 5,000.
- Waiting for the owner's visual OK before the commit.
- **Owner visual OK (2026-11-25):** "ok" — committed.

### T-23 follow-up 2 — page top spacing and rich empty panel (owner, 2026-11-25)

- **Owner:**
  - The page is cramped under the section header.
  - The empty side panel should explain the structure. The owner's mockup has a circle icon, *"Explore the performance framework"*, and rows for Performance Areas / Dimensions / Indicators, using the app's own icons.
- **Leader measurement (Chrome, earlier today):** title top ≈ 10 px below the section header bar; Org Structure ≈ 50 px. The gap was lost when the page root cancelled `.app-page-wrapper`'s 25 px margin for the viewport fit (P-46).
- **Owner decisions:**
  - Adopt the Leader's adjusted version: PrimeIcons, rows built from `levels` with counts, not clickable, depth 1 tinted with the area accent; IOB gets a short version.
  - Top spacing: 24 px.
  - Use the last review round (14/14); a FAIL stops for the owner.
- **Execute-time spec edits (owner-approved, recorded now):**
  - `requirements.md` R-STF-016 Empty state;
  - `design.md` §6.9 Empty state and Top spacing;
  - `design.md` D-STF-39.
- **Attempt 1:** fresh Grok `grok-4.7-high`, dispatch `ctx_be2ad7b1a491`, brief `brief-T23c.md`.
  - **Changes:**
    - New `ods-page-column.scss` mixin. It is the single source of the 24 px (`$ods-admin-top-gap` / `--ods-admin-top-gap`). Column `height: calc(<column-height> - gap - 16px)` with `content-box`.
    - New `ods-empty-panel` component, projected into `side-panel-layout`; the `emptyText` fallback is kept.
    - Framework builds the rows from `levelCounts`. IOB shows `pi-flag` and the short text.
  - **Falsifier:** three hard-coded rows → `framework.component.spec.ts:266` reports *Expected length 4, Received 3*. Reverted.
- **Leader re-run (non-author): VERIFIED.** jest administration: 34 suites / 669 tests. Lint clean, build 0, spec tsc 0 under ods-admin.
- **Leader Chrome check:**
  - 1280×800: the eyebrow is 25 px below the section header (it was about 9 px). `.content` is 800/800 and the slots are 320–784.
  - 1280×650 with 1.1.1 selected: `.content` is 650/650, the slots are 318–634 (314 px), and Save ends at 617.
  - The Framework empty panel shows a circle, title, subtitle and "4 Performance Areas / 13 Dimensions / 31 Indicators", with the first tile accent-tinted.
  - IOB at 650: `.content` is 650/650, the slots are 295–634, and the short flag empty state shows.
- **Reviewer** (`akili-reviewer`, opus, round **14/14**): **`STATUS: PASS`**.
  - The 24 px arithmetic and the box model are correct on both pages.
  - Rows come from data and are not interactive; tokens only.
  - The projection fallback is kept.
- **ADVISORY:**
  - "1 Indicators" uses the plural at count 1, matching the chips; the summary line uses the singular. This is an owner wording call.
  - The accent tile is pale in dark theme. The app has no dark theme today.
  - The empty-panel `<h2>` may skip a heading level; to check at the next a11y pass.
- **Final:** PASS. Attempts 1, checkpoints none. Spawns: implementer (not reported by host), reviewer PASS. Worker released.
- **Running totals:** review rounds **14/14** (cap reached, not exceeded) · rev-4 LOC ≈ 4,600 / ≈ 5,000.

### T-23 follow-up 3 — richer IOB empty panel (owner, 2026-11-25)

- **Owner:** the IOB empty panel looks incomplete next to Framework's.
- **Tripwire:** review rounds were at the 14/14 cap. The Leader stopped and asked; the owner re-based to **16 rounds** (`design.md` §14 row).
- **Owner chose the Leader's proposal:** flag circle, title, subtitle, and three informational rows: objectives count for the year, distinct linked indicators, and a carry-forward hint.
- **Execute-time spec edits:** `design.md` §6.9 Empty state (IOB), `requirements.md` R-STF-016 Empty state (IOB), and the §14 re-base row.
- The spacing and Framework empty-panel change (follow-up 2, PASS) stays uncommitted. It will be committed together with this one after the owner's visual OK.
- **Dispatch:** Grok `grok-4.7-medium`, `ctx_d76798655125`, brief `brief-T23d.md`. **Owner addition, sent to the same worker mid-task:** on wide screens the empty-panel rows sit flush left under a centred header. Centre the rows block: max-width ≈ 26rem, `margin-inline: auto`, rows left-aligned inside it. This applies to both pages.
- **Implementer:** the attempt ran as one dispatch (`ctx_d76798655125`) plus a follow-up turn for the centring (`ctx_144e2d816b30`).
  - `ods-empty-panel` was generalized: inputs for circle, title, subtitle and rows. Framework output is unchanged.
  - IOB shows 3 neutral rows. `n` comes from the year select's `years[].count`; `m` is the number of distinct indicator ids.
  - The rows block is centred: `max-width: 26rem; margin: 16px auto 0`.
  - Falsifier: count links instead of distinct ids → `institutional-objectives.component.spec.ts:364` reports "2" expected, "3" received. Reverted.
- **Leader re-run (non-author): VERIFIED.** jest administration 34 suites / 670 tests. Lint clean, build 0, spec tsc 0 under ods-admin.
- **Leader Chrome check at 1728 px:** the rows block is centred in the Framework panel, with a 105 px gap on each side. IOB shows "28 Objectives · 2026", "30 Linked indicators" and "Carry forward to 2027".
- **Reviewer** (`akili-reviewer`, opus, round **15/16**): **`STATUS: PASS`**.
  - Texts are exact. Distinct ids are counted through a `Set`.
  - `n` refreshes together with the list in every traced state.
  - Framework is unchanged. Tokens only, and every change is under ods-admin.
- **ADVISORY (recorded, not work):**
  - A portfolio with no years shows "0 Objectives · " and "Carry forward to " with no year after them.
  - For one round-trip after a year change, `m` can still be the previous year's count.
  - `track row.label` could collide.
- **Final:** PASS. Attempts 1 (+1 owner-addition turn). Worker released.
- **Running totals:** review rounds **15/16**.

### T-23 follow-up 4 — vertical centring of the empty panel (owner, 2026-11-25)
- **Owner:** the empty panel sits too close to the top of its card.
- **Leader decision:** centre the panel content vertically when there is room. Use `margin-block: auto` on a flex column, not `justify-content: center`, so content that overflows starts at the top and scrolls instead of being clipped.
- **Budget:** this is review round 16/16.
- **Brief:** `brief-T23e.md`.
- **Implementer (dispatch `ctx_5afc55664d2f`):** the panel slot becomes a flex column and keeps `min-height: 0; overflow-y: auto`. The `ods-empty-panel` host gets `flex: 1 0 auto` and the block gets `margin-block: auto`. Files: `side-panel-layout.component.scss`, `ods-empty-panel.component.scss`.
- **Leader re-run (non-author): VERIFIED.** jest administration 34/670 tests; lint clean; build 0; spec tsc 0 under ods-admin.
- **Leader Chrome:**
  - Tall IOB panel, empty: the block is centred, 76 px above and 76 px below.
  - 1280×650 Framework, empty: the block starts at the scroll origin (top 335 = panel top 318 + 16 + 1) and scrolls (382 > 314).
  - 1280×650 with 1.1.1 selected: the form is unchanged (scrollHeight 801, Save at 617); `.content` 650/650.
- **Reviewer** (`akili-reviewer`, opus, round **16/16**): **`STATUS: PASS`**. The forms sit inside a plain slot div whose automatic minimum height is its content, so they cannot shrink or clip. Below 1024 px there is no free space, so the block sits at the top. The comments are true. Tokens only.
- **Final:** PASS. Worker released. Review rounds **16/16** (cap reached).
- **Owner verdict (2026-11-25):** the Framework page "is coming along great"; follow-ups 2–4 committed as a checkpoint. The owner asked next to align Institutional Objectives with the Framework layout (T-23 follow-up 5, below).

### T-23 follow-up 5 — one page layout for both ODS pages (owner, 2026-11-25, B-7)
- **Owner:** the IOB page's table and buttons differ from Framework's; they should be almost identical (no Tree/Table toggle on IOB, which has no tree), with the same positions and a header Export.
- **Owner answers:**
  - Export: one per page, in the header, with Framework's style (owner offered A or B; Leader chose A, remove the in-table Export).
  - Search: Framework style.
  - Commit the approved follow-ups 2–4 first: done, `ddc53c460` + `59b367814`.
  - **Re-base: ≈ 5,400 LOC / 18 review rounds.**
- **Spec:** requirements §0b B-7, R-STF-008/009 amended; design §6.6 amended, D-STF-40, §14 re-base row.
- **Scope note:** one opt-in shared change, `app-data-table` `showToolbar` (default `true`); other consumers unchanged (narrow blast radius).
- **Brief:** `brief-T23f.md`.
- **Implementer attempt 1** (dispatch `ctx_bce2b568411f`, cursor grok-4.7-high): `showToolbar` opt-in on `app-data-table`; new `ods-admin/ods-find-field/`, used by the tree, the Framework table and IOB; IOB header mirrors Framework's with the header Export (`exportRowsToXlsx`, all rows of the year, natural code sort); count line. Falsifiers (a) default `showToolbar=false` and (b) export the filtered rows, both observed red and reverted.
- **Leader re-run (non-author): VERIFIED.**
  - jest administration + data-table: 36 suites / 692 tests.
  - Lint clean.
  - Build exit 0; the only warnings were in components outside this diff.
  - spec tsc: 0 errors under ods-admin.
- **Leader Chrome:**
  - IOB header order is right. There is one Export per page and no in-table search or Export.
  - The find field filters by code and by statement (IOB) and by code and by name (Framework Table).
  - `.content` is 850/850 on both pages.
- **Reviewer** (`akili-reviewer`, opus, round **17/18**): **`STATUS: FAIL`**.
  1. A search miss now shows the true-empty message. Filtering moved to the parents, so `app-data-table` receives `[]` and shows `emptyMessage`.
  - **Confirmed by the Leader in Chrome:** IOB 2026 with `zzz` shows "No institutional objectives for this year yet."
  - **Violates:** R-STF-008 B-7 ("the same field as the Tree view"; the tree shows *No elements match "<term>"*) and R-CTL-008's rule against showing true-empty during a search.
  - **Advisory:**
    - `framework-tables.component.spec.ts:246` asserts an input the test set itself.
    - "1 linked indicators" plural (owner call).
    - `exportObjectives()` has no catch; this matches Framework's export.
- **Rework → attempt 2** (same worker, effort high).
- **Owner addition (2026-11-25, during rework):** move Delete to the panel footer, left-aligned, in the Cancel · Save row, on both panels. This reverses Q-4 / D-STF-33. **Spec:** D-STF-41, with B-4, R-STF-016 and §6.5/§6.6 amended. It is folded into rework attempt 2, so it uses the same review round (18/18).
- **Implementer attempt 2** (dispatches `ctx_fdf933a0e596` + `ctx_3be74385e09e`): no-match `role="status"` line on both pages (table hidden on a miss, `emptyMessage` kept for true-empty); Delete moved to the panel footer (D-STF-41). Falsifier: guard removed → both `zzz` specs red, reverted.
- **Leader re-run (non-author): VERIFIED.** jest 36 suites / 694 tests; lint clean; build 0; spec tsc 0 under ods-admin.
- **Leader Chrome:**
  - IOB `zzz` shows `No objectives match "zzz"`, with no `data-table-empty`.
  - IOB footer: Delete 1077 / Cancel 1552 / Save 1620, all at top 723.
  - **Framework footer defect (Leader):** when Delete is blocked, its reason line under it makes the row centre vertically, so Delete sits 11 px above Cancel/Save (979 vs 990). Fix: align the footer row to the top.
- **Reviewer** (`akili-reviewer`, opus, round **18/18**): **`STATUS: FAIL`**.
  1. **IOB search state survives a reload of the list while its field does not.** The page `query` signal is never reset. The find field is destroyed by `loading()` on a year, portfolio or Retry change and re-created empty. Result: an empty box (no clear button) with `No objectives match "zzz"`, or a silent subset.
  - **Advisory:**
    - `framework-tables.spec:273` role assertion is circular.
    - No spec for true-empty + query.
    - `@if` re-creation resets sort/paginator.
- **Budget tripwire:** review rounds 18/18. Attempt 3 needs a 19th round, so this is an owner stop.
- **Owner (2026-11-25):**
  - **Re-base: 20 review rounds.**
  - The IOB search **is kept** across a year or portfolio change, in line with Q-2. This is the Reviewer's option (a): a controlled find field.
- **Rework → attempt 3** (same worker, effort xhigh).
- **Owner addition during attempt 3:** a blocked Delete must look inactive, with no red hover, and show its reason as a tooltip instead of a line under the button. This also fixes the footer misalignment. D-STF-41 is amended. It is folded into attempt 3 and replaces the earlier footer `align-items` item.
- **Implementer attempt 3** (dispatches `ctx_58af6eab261a` + `ctx_2c940d9bd65e`):
  - `OdsFindFieldComponent` is now controlled (`value` input; all three parents bind `query()`).
  - A blocked Delete looks neutral and shows its reason as a `pTooltip` (hover and focus), with an sr-only reason kept on `aria-describedby`.
  - Falsifier: binding removed → year-change spec red (input ''), reverted.
- **Leader re-run (non-author): VERIFIED.** jest 36 suites / 697 tests; lint pass; build 0; spec tsc 0 under ods-admin.
- **Leader Chrome:**
  - Footer row aligned: Delete, Cancel and Save all at 784–817.
  - Blocked Delete: grey, `cursor: not-allowed`.
  - The tooltip shows the reason on keyboard focus.
  - **Defect:** `<html>` scrollHeight is 979 against innerHeight 850. The only absolute element past the viewport is `p.sr-only#element-delete-reason` (top 978), so the page scrolls (D-STF-31 / Q-5).
- **Reviewer** (`akili-reviewer`, opus, round **19/20**): **`STATUS: FAIL`**.
  1. The sr-only reason has no positioned ancestor and escapes the panel scroller. This matches the Leader's Chrome measurement and repeats a known repo bug (`innovation-use-details` sr-only). Fix: add `position: relative` on `.element-panel__delete` / `.objective-panel__delete`.
  2. The blocked Delete's `:focus-visible` outline uses `--ac-grey-200` (about 1.2:1), so the focus ring is barely visible (WCAG 2.4.7). Fix: `--ac-grey-700`.
  - The controlled field is verified correct.
  - **Advisory:** the tooltip specs read the directive instance rather than the rendered overlay; there are two `.sr-only` sources.
- **HALT: 3 attempts exhausted.** Both fixes are one CSS line each. Owner decision needed for attempt 4.
- **Owner (2026-11-25): attempt 4 authorized** (round 20/20). Same worker.
- **Runtime event (attempt 4):** the follow-up dispatch `ctx_64b7bf1d0bc7` timed out at agent readiness (never started; old worker lost). Rung 1: fresh worker `ctx_1828bfbdf297` with the same task. The attempt counter is unchanged.
- **Implementer attempt 4** (dispatch `ctx_1828bfbdf297`): `position: relative` on `.element-panel__delete` / `.objective-panel__delete` (the sr-only reason is a direct child); blocked Delete `:focus`/`:focus-visible` outline uses `--ac-grey-700`.
- **Leader re-run (non-author): VERIFIED.** jest 36 suites / 697 tests; lint clean; build 0; spec tsc 0 under ods-admin.
- **Reviewer** (`akili-reviewer`, opus, round **20/20**): **`STATUS: PASS`**. Both defects fixed in both panels; no regression from round 19's verified state.
- **Pending:** Leader Chrome re-measure of `html` scrollHeight vs innerHeight. The local dev server rendered a blank app, even at `/` (no console errors, scripts 200), so the owner was asked to restart `ng serve`.
- **Owner (2026-11-26): visual OK on follow-up 5** (from a live screenshot of the restarted app: Delete in the footer, grey blocked Delete, one Export, one find field). Commit authorized; no push. The Leader's Chrome scroll re-measure is carried into follow-up 6 and runs on its result.
- **Owner re-base (2026-11-26):** review budget 20 → **22 rounds** for follow-up 6.

### T-23 follow-up 6 — banner removed, count line inside the list card (B-8 / D-STF-42)
- **Owner (2026-11-26, from a live screenshot):** remove the Framework info banner to give the content more room; move the count line inside the list card, above the search. Decisions: banner removed (the blocked-Delete tooltip already gives the "in use" reason); both pages; commit follow-up 5 first (done: `7e19284ca`, `0f46dde5f`); review cap 22.
- **Spec:** requirements §0b B-8 + amended lines under R-STF-008 / R-STF-009; design §6.4 / §6.6 amended lines, D-STF-42 row, §14 re-base row.
- **Implementer attempt 1** (Grok `grok-4.7-high`, dispatch `ctx_957a9bbc81a7`): banner removed; the count line is the first child of the list slot on both pages (`mt-0 mb-3`). Specs: the banner text assertion was replaced with absence, plus containment/order before the find field (Tree, then after a real Table toggle click; IOB present, then absent on an empty year). Falsifier: summary line back outside `framework-list` → `framework.component.spec.ts:243` red, reverted.
- **Leader re-run (non-author): VERIFIED.** jest 36 suites / 697 tests; lint clean; build OK; spec tsc 0 under ods-admin.
- **Reviewer** (`akili-reviewer`, opus, round **21/22**): **`STATUS: PASS`**. Advisory: the IOB spec's year change uses `triggerEventHandler`. This is pre-existing (it is a context line in the diff), not new.
- **Pending:** Leader Chrome measurement. Leader's Chrome tab renders a blank app (`app-root` empty), so the owner was asked to check.
- **Owner (2026-11-26): commit authorized** ("haz commit"); no push. The Leader's Chrome scroll measurement was not run, because the Leader's tab rendered a blank app. The owner's own view stands as the visual check.

### T-23 follow-up 7 — STAR field look on every ODS field (B-9 / D-STF-43)
- **Owner (2026-11-26, screenshots of General Information's Title vs the Framework panel):** the panel fields are not STAR's field and the asterisk is not red; align every field component. Decisions (AskUserQuestion): reproduce STAR's look on the existing reactive forms, do not reuse `app-input`/`app-textarea`/`app-select`; re-base to ≈ 6,400 LOC / 28 rounds. Same pass: "1 linked indicator" singular, IOB find label "code or statement", Responsibles one line + tooltip ("listo" to the Leader's proposal; the empty-year "Carry forward to" state stays).
- **Leader Chrome measurement (read-only, `localhost:4200`):** STAR — label Space Grotesk 14/450 `#153c71`, asterisk red, gap 10 px, control 1 px rgb(203,213,225) / radius 6 / padding 8×12 / 39 px / Barlow 14 `#4c5158`, focus border `#035ba9`, helper 14 px `#8d9299`. Framework panel — label Barlow 14/500 `#4c5158`, asterisk same grey, gap 4 px, control 1 px `--ac-grey-200` / radius 8 / padding 6×8 / 35 px, p-select text 16 px rgb(51,65,85) / 42 px, hint 12 px.
- **Spec:** requirements §0b B-9; design D-STF-43, §14 re-base row.
- **Implementer attempt 1** (Grok `grok-4.7-high`, dispatch `ctx_f4d1a6ce1d3b`): one partial `ods-field.scss` (`.ods-field` wrapper, gap 10 px), `.label` + `text-red-500` asterisk, `pInputText`/`pTextarea`, helper under the control, warning icon + amber border on touched-empty required, read-only ancestor with the Aura disabled look; singular count strings, IOB find label "code or statement", tree Responsibles one line + tooltip. **Table view Responsibles not changed** (shared `app-data-table` has no cell template; `shared/` out of scope). K-004: asterisk assertion seen red, reverted.
- **Leader re-run (non-author): VERIFIED.** jest ods-admin 16/16 suites (= every spec file under ods-admin), 142 tests; lint clean; build OK, no ods-admin budget warning; spec tsc 0 ods-admin errors. Diff: 29 client files, +362 / −162.
- **Leader Chrome (1728×906, read-only):** Framework panel Code/Name/derived/find/Portfolio/staff search all 39 px, radius 6, padding 8×12, Barlow 14 `#4c5158`, border rgb(203,213,225); labels Space Grotesk `#153c71`, asterisk red, gap 10 px; helper 14 px `#8d9299` — identical to the General Information measurement. IOB: three red asterisks, "28 objectives · 30 linked indicators", find label "Find by code or statement". **No page scroll on either page** (`scrollHeight` = `innerHeight` = 906): this also closes the handoff's unverified D-STF-31 check.

- **Reviewer** (`akili-reviewer`, opus, round **22/28**): **`STATUS: FAIL`**. (1) medium — the tree Responsibles span had `tabindex="0"` on every row, adding N Tab stops against §6.3 "no tabindex of its own" and P-45; the spec locked it in. (2) low — the `nowrap` spec sliced the SCSS to end of file, so other rules' `nowrap` kept it green (K-004/KZ-017). Advisory: Linked indicators with chips may exceed 39 px; `ods-field.scss` rules emitted more than once (harmless). Sent back to the same worker as attempt 2 (fix both, falsify both).

- **Implementer attempt 2** (same worker, dispatch `ctx_7929a4658c3b`): Responsibles span uses the roving `[attr.tabindex]="row.id === activeRowId() ? 0 : -1"`; spec asserts 0 on the active row and -1 on another row with responsibles; the nowrap slice stops at the rule's closing brace. K-004 red seen on both, restored.
- **Leader re-run: VERIFIED.** jest ods-admin 16/16, 142 tests; lint clean. Chrome: Linked indicators with one chip is 47 px (Year select 39 px), the Reviewer's advisory, left for the owner's visual call.

- **Reviewer** (`akili-reviewer`, opus, round **23/28**): **`STATUS: PASS`**. The roving binding is identical to the + button's (one Tab stop); both assertions are falsifiable by reading. Gap stated by the Reviewer: no `git diff` in its role, so "nothing else changed" in the two files is the Leader's diff, not its own.
- **Owner HITL (2026-11-26):** heading glued to the form in both panels. Leader Chrome: eyebrow→title 6 px, title→first label **0 px**. Attempt 3 sent to the same worker: `panel-heading` only, gap 8 px, host margin-bottom 24 px (D-STF-39 rhythm).

- **Implementer attempt 3** (dispatch `ctx_7e5cc072c1a5`): `panel-heading` gap 8 px, `:host` margin-bottom 24 px, new rule-scoped spec; K-004 red seen for both. **Leader re-run: VERIFIED** — jest ods-admin 17/17, 143 tests; lint clean; Chrome on both panels eyebrow→title 8 px, title→first label 24 px, no page scroll at 850 px.
- **Reviewer** (`akili-reviewer`, opus, round **24/28**): **`STATUS: PASS`** (two usages, no parent gap doubles the 24 px; slices cannot cross rules).
- **Owner HITL (2026-11-26):** code pill background #e9ebed → token `--ac-grey-200` (#e8ebed) in the shared `ods-code-pill` mixin; attempt 4 sent to the same worker.
- **Implementer attempt 4** (dispatch `ctx_31b8ec99143a`): one line in `ods-code-pill.scss` plus a brace-scoped assertion; K-004 red seen. **Leader re-run: VERIFIED** — jest 17/17, 144 tests; lint clean; Chrome: tree and panel-heading pills both rgb(232,235,237).

- **Reviewer** (`akili-reviewer`, opus, round **25/28**): **`STATUS: PASS`**. 4 mixin consumers, none overrides background; assertion falsifiable; light contrast 11.1:1. **Pre-existing, open owner call:** in dark mode the pill text `--ac-primary-blue-600` (#0e1620) on `--ac-grey-200` (#3e3e3e) is ≈ 1.70:1 (was ≈ 1.29:1 on grey-100), illegible; needs a text token that lightens in dark mode, outside D-STF-43.
- **Pending:** owner visual OK, then commit (no push).

### T-23 follow-up 8 — STAR buttons, list-card toolbar, icon toggle, sticky band (B-10 / D-STF-44)
- **Owner (2026-11-26, screenshots):** Save must be STAR's green save button and the panel buttons STAR's size; Portfolio + Tree/Table into the list card next to the search; toggle as icons (left list, right tree `pi-sitemap`); count + find band sticky on scroll. AskUserQuestion: both pages (IOB moves Portfolio + Year); re-base 34 rounds / ≈ 7,000 LOC. Follow-up 7 is not committed yet (no owner visual OK); both commit together after the OK.
- **Spec:** requirements §0b B-10; design D-STF-44, §14 re-base row.
- **Implementer attempt 1** (fresh Grok `grok-4.7-high`, dispatch `ctx_99286ec1d16e`): **stopped by the Leader at the owner's pause before it edited anything** (no file under ods-admin newer than the brief). Not a failure; it does not count as a review round. Re-dispatch a fresh worker with the same brief (B-10 / D-STF-44 + the follow-up 7 tree as the base).

### Session pause (2026-11-26, midday)
- **Branch** `institutional-kpis`. Committed on top of `742dc4d0b`: only these spec docs. **The UI of follow-up 7 is uncommitted** in the working tree (31 client files, +389 / −164, incl. new `ods-field.scss` [intent-to-add] and `panel-heading.component.spec.ts` [untracked]). It is complete: attempts 1–4 have Reviewer PASS (rounds 22–25 of 34) and Leader Chrome checks. It is waiting for the owner's visual OK; the owner chose to give follow-up 8 first, and both commit together.
- **Next:** (1) re-dispatch follow-up 8 to a fresh Grok worker with the brief recipe in this entry's spec rows (B-10, D-STF-44); (2) Leader re-run + Reviewer + Chrome (Save green, toolbar in card on both pages, icon toggle Table-left / Tree-right, sticky band, no page scroll); (3) owner visual OK → commit UI (no push).
- **Open owner calls:** Responsibles column width in the tree (names cut); Linked indicators 47 px with chips vs 39 px; dark-mode code pill text ≈ 1.7:1 (pre-existing); Table view Responsibles wraps (needs shared `app-data-table`).


- **Resumed (2026-11-26, afternoon):** Implementer attempt 1 re-dispatched to a fresh Grok `grok-4.7-high` worker, dispatch `ctx_1732bdab6b2d`, same brief (B-10 / D-STF-44 on top of the uncommitted follow-up 7 tree).

- **Implementer attempt 1 report** (`ctx_1732bdab6b2d`): claimed jest 150/150, lint clean, build with no ods-admin warning, spec tsc 0. New partials `ods-action-button.scss`, `ods-list-band.scss` (+ spec). Toggle size copied from My Projects (32 px) because Results Center does not render it.
- **Leader re-run: FAIL.** jest 18/18 suites, 150 tests; lint clean; spec tsc 0 ods-admin — but **`npm run build` exits 1**: TS-993004 "Unable to import symbol OdsPressedDirective … not exported from framework.component.ts". The worker's build claim was false (K-004: a gate cited without being seen). Diff now 38 client files, +926 / −338. Sent back as attempt 2 (own exported file + spec; paste build tail and exit code verbatim). No review round spent.

- **Implementer attempt 2** (same worker): `OdsPressedDirective` moved to its own exported file + spec. **Leader re-run:** `npm run build` exit 0.
- **Owner HITL (live, 2026-11-26):** (1) scrolled rows show above the sticky band; (2) the icon toggle is smaller than the 39 px inputs, misaligned; (3) the active toggle must look like My Projects' (darker background, blue icon). Leader Chrome on `/projects`: 32 × 32 px, active bg #d9e1eb, border rgb(226,232,240), radius 4, icon #035ba9 16 px, inactive icon rgb(100,116,139); source `my-projects.component.scss:93-115` (no token for #d9e1eb / #b8d4e8). Attempt 3 sent: band covers from the scroll container top, toggle 39 × 39 bottom-aligned, My Projects active look.

- **Owner (2026-11-26):** buttons must use `navigation-buttons`' styles (AskUserQuestion answer: "usa son los estilos"; the component itself is a fixed result-page bar with Back/Next/Save only). Added to attempt 3: Save = its Save, Cancel = its Back/Next outline, Delete = same geometry in danger.

- **Implementer attempts 3–4** (same worker): sticky band = first child of a paddingless `.list-scroll` (opaque, z-index 5); toggle My Projects colours; panel buttons with `navigation-buttons` styles (Save green + spinner, Cancel blue outline, Delete red outline); `ods-action-button.scss` removed.
- **Leader re-run: VERIFIED gates** — build exit 0 (no ods-admin warning), jest 19/19 suites, 155 tests, lint clean, spec tsc 0. Diff incl. follow-up 7: 40 files, +1,287 / −496.
- **Leader Chrome (1728×850):** sticky band OK on Framework Tree and IOB (scrolled 400/500 px: 0 row pixels above the band; band top = card top); one Portfolio, none in the header; IOB Portfolio + Year in the band; toggle active bg rgb(217,225,235) + icon #035ba9, aria-pressed/labels correct; no page scroll. **Defects:** (a) toggle is **39 × 27 px**, not 39 × 39 (`!max-h-[27px]` still wins; the spec only checked width); (b) Save 39 px next to Cancel/Delete 43 px (2 px border on the outlines; same as STAR's own bar, but side by side here they misalign).

- **Reviewer** (`akili-reviewer`, opus, round **26/34**): **`STATUS: FAIL`**. (1) major: Portfolio/Year/toggle render only in the loaded branch → destroyed on change (focus lost) and absent on a failed load (user stranded on Retry); (2) moderate: toggle duplicated per view branch, pressed button destroyed on switch; (3) moderate: `aria-pressed`/`aria-label` also on the `p-button` host (generic role), specs assert the host; (4) minor: inactive icon colour literal; (5) minor: below 1024 px the sticky band resolves to the platform scroller. Reviewer read 39×39 from CSS; Leader Chrome measured 39×27 painted (`!max-h-[27px]`).
- **Attempt 5 sent** (same worker): all five + Leader (6) toggle 39×39 painted, (7) Save `border-2 border-transparent` so Save/Cancel/Delete are all 43 px. Band rendered once, always; progress/error inside the list body.

- **Transport:** the reopen of the attempt-4 worker failed (`agent_readiness: timeout`, dispatch `ctx_569faab9cdd7`, released). Attempt 5 retried on a fresh Grok worker, dispatch `ctx_db097aeada40`, with a context message (B-10 / D-STF-44, brief path, base tree).

- **Attempt 5 stopped by the Leader at the owner's request** (owner leaving; dispatch `ctx_db097aeada40`, stopped mid-work). It had already edited ~20 files (framework.*, institutional-objectives.*, element/objective panels, framework-tree/-tables, side-panel-layout.*, ods-list-band.*, ods-pressed.directive.ts). **The working tree is PARTIAL**: no gate was run on it, no report was made. Snapshot of the whole uncommitted client diff (follow-ups 7 + 8 + partial attempt 5): `<git-dir>/strategy-framework-fu7-fu8-partial-2026-11-26.patch` (43 files, +1,552 / −551).

### Session pause 2 (2026-11-26, afternoon)
- **State:** follow-up 7 complete (Reviewer PASS ×4). Follow-up 8: attempts 1–4 done, Reviewer FAIL round 26/34 (5 issues) + 2 Leader Chrome defects; attempt 5 (all seven fixes) **interrupted halfway**.
- **Resume:** (1) run the gates on the tree as is (build, jest ods-admin, lint, spec tsc) to see where attempt 5 stopped; (2) dispatch a fresh Grok worker with the attempt-5 body (the seven items logged above under "Attempt 5 sent") + the context message, telling it the tree holds a partial attempt 5 to finish, not to restart; (3) Leader re-run + Chrome (toggle 39 × 39 painted, Save/Cancel/Delete 43 px, selectors survive a failed load, focus kept on view switch, no row above the band, no page scroll) → Reviewer round 27/34 → owner visual OK → commit 7 + 8 (no push).
- **Open owner calls:** unchanged from "Session pause (midday)".

### Session handoff (2026-11-26)
The owner is closing this session and will continue in a new one with more UI changes. State at close:
- **Branch** `institutional-kpis`, HEAD `8e7daaae7`. The working tree is clean, except that this handoff entry is committed on its own. **Nothing is pushed**; the owner pushes.
- **Done in rev 4:** T-18…T-23 plus T-23 follow-ups 1–6, all with a Reviewer PASS and owner OK. Last commits: `7e19284ca` / `0f46dde5f` (follow-up 5: one page layout, Delete in the footer with a tooltip reason) and `ed247b839` / `8e7daaae7` (follow-up 6: Framework banner removed, count line inside the list card).
- **Budget:** review rounds **21 of 22** used. Any new change needs an owner re-base first (§14 of `design.md`). LOC cap ≈ 5,400 (not re-measured since follow-up 4).
- **Not verified:** the Leader's Chrome check that the page does not scroll at ≥ 1024 px (D-STF-31) after follow-ups 5–6. The Leader's tab at `localhost:4200` rendered a blank app (`app-root` empty). The owner's own view was the visual check. Run this first in the next session.
- **Open owner calls (undecided):**
  1. "1 linked indicators" should be singular.
  2. The IOB find label says "code or name", but it searches code and statement.
  3. The empty-year state shows "Carry forward to …".
  4. The Responsibles column wraps.
- **Next steps:** further owner UI changes (new follow-up: re-base, spec amendment, Grok worker, Reviewer, owner OK, commit). Then the owner pushes and merges to dev, T-17 Dev checks run, and `/akili-validate`.
- **Standing rules:**
  - No push.
  - Commit only after the owner's visual OK.
  - No co-author trailer.
  - Never write to the shared DB (no Save, Delete or Carry forward clicks).
  - All code goes to a fresh Grok worker (`orca orchestration worker-start --agent cursor --model grok-4.7-high`), released after Reviewer PASS.
  - The Reviewer is `akili-reviewer`.
  - Chat in Spanish; the repo is written in English.

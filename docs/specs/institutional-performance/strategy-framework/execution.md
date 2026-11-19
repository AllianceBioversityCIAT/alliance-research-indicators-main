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

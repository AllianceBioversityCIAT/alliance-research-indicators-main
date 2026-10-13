# Execution — Changes / Control Lists: global lists read by key, values applicable per portfolio

## Document Control

- **Spec path:** `docs/specs/changes/control-lists-global-scope/`
- **Spec id:** 2026-10-control-lists-global-scope
- **Branch:** `institutional-kpis`
- **Approval Mode:** `gated` (requirements.md Document Control)
- **Leader:** Claude Code session (Opus 5.5 — at or above the registry's T1 `opus`)
- **Started:** 2026-10-13

---

## Task Execution History

### T-00 — HITL: prepare the local database

- **Final status:** PASS (HITL — requester-approved; the task declares `Review: none`, so there is no Reviewer verdict)
- **Date:** 2026-10-13
- **Executed by:** Leader, inline, under the requester's explicit instruction ("You run it, no export") — a human step, not production code.
- **Requirements covered:** R-CLG-006 *Old local schema* (revert half); requirements §11 "export first" rule.

**Step 1 — hosts (host/name only):**
```
ARI_MYSQL_HOST=127.0.0.1
ARI_MYSQL_NAME=stardb
ARI_TEST_MYSQL_HOST=127.0.0.1
ARI_TEST_MYSQL_PORT=3306
ARI_TEST_MYSQL_NAME=stardb
```
The first `migration:show` failed with `connect ECONNREFUSED 127.0.0.1:3306` (container `ari_local_mysql`, mysql:8.4, `Exited (137)`); the requester restarted it. That failed run was **not** read as a count (K-014).

**Step 2 — export:** requester: no hand-made rows to keep ("no export").

**Pre-revert state** (`migration:show`, ANSI stripped, exit 0; the one `error` match was the migration name `AddedErrorMessageAiReport1781106535639`):
```
[X] 364 CreatePiDelegates1787600000000
[X] 367 CreatePiDelegateHistory1787601000000
[X] 369 CreatePrmsWebhookDeliveryTable1790086170692
[X] 368 CreateControlListCategories1790900000000
[X] 371 CreateControlLists1790900000001
[X] 373 CreateControlListValues1790900000002
```

**Deviation from the plan (disqualifier anticipated, not hit blind).** T-00 step 3 expected three reverts `…002`, `…001`, `…000`. TypeORM 0.3.20 reverts the **highest id** (`MigrationExecutor.js:286` → `getLatestExecutedMigration`, which takes `sortedMigrations[0]` of `ORDER BY id DESC`, `:403`, `:447`). On this DB `CreatePrmsWebhookDeliveryTable` (id 369) ran after `…000` (id 368), so the third revert would have dropped `result_prms_sync_history`. Leader stopped after two reverts and asked. Checked: `result_prms_sync_history` held **0 rows**. **Requester decision:** "Revert both" — revert PrmsWebhook too; T-01's `migration:test:execute` re-applies it.

**Step 3 — reverts (host checked = `127.0.0.1`/`stardb` before each; all exit 0):**
```
== revert 1
query: DROP TABLE `control_list_values`
Migration CreateControlListValues1790900000002 has been  reverted successfully.
== revert 2
query: DROP TABLE `control_lists`
Migration CreateControlLists1790900000001 has been  reverted successfully.
== revert 3
query: DROP TABLE `result_prms_sync_history`
Migration CreatePrmsWebhookDeliveryTable1790086170692 has been  reverted successfully.
== revert 4
query: DROP TABLE `control_list_categories`
Migration CreateControlListCategories1790900000000 has been  reverted successfully.
```

**Step 4 — checks:**
- `SHOW TABLES LIKE 'control_list%'` → empty set. `SHOW TABLES LIKE 'result_prms_sync_history'` → empty set.
- `SELECT id,name FROM migrations ORDER BY id DESC LIMIT 2` → `367 CreatePiDelegateHistory1787601000000`, `364 CreatePiDelegates1787600000000`.
- `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` (exit 0, ANSI stripped; error lines excluding migration names: 0) → `applied: 344`, `pending: 4`:
```
[ ] CreatePrmsWebhookDeliveryTable1790086170692
[ ] CreateControlListCategories1790900000000
[ ] CreateControlLists1790900000001
[ ] CreateControlListValues1790900000002
```

**Decisions:** D-EX-1 — revert by id order through `CreatePrmsWebhookDeliveryTable` (empty table) instead of hand-editing the `migrations` table (requester, 2026-10-13).

**Issues:** the T-00 plan's assumption "three reverts, `…000` third" was false on this DB (an unrelated migration with an older timestamp ran later). It does not change requirements or design. §3.1's "revert by name" rule held; only the expected count was wrong.

**Forward pointers → T-01 (carry in the brief):**
1. Expect **4** pending before `migration:test:execute` (PrmsWebhook included), and quote all four applied afterwards. The `migration:show` loader check must list the control-list migrations **and** PrmsWebhook with no loader error.
2. Do **not** run `migration:test:bootstrap` or `baseline:test:load` (tasks.md *Evidence database*).

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

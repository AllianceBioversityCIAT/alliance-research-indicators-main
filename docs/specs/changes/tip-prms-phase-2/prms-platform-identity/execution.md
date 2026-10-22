# Execution Log — PRMS Sync / Platform identity for TIP results

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/tip-prms-phase-2/prms-platform-identity` (AC-1761 phase 2, family child 1) |
| Leader | Claude Opus 5.5 (session) |
| Implementer | Grok `grok-4.7-high` via Cursor CLI (Orca `/orchestration`, run `run_daaffc9718eb`) — standing split: Grok implements, Claude reviews |
| Reviewer | Claude `akili-reviewer` wrapper (fresh context, different weights from the Implementer) |
| Mode | Spec `gated`; owner standing rule for routine progress: continue task to task, stop only on HALT / FATAL_FAIL / pivot / budget tripwire |
| Budget | 7 tasks · ~850 LOC · 11 review rounds (design §1) |
| Started | 2026-10-21 |

**Wave 1 (2026-10-21):** T-01 (server, `task_87748033efa6` / `ctx_2ae0a9f5a310`) and T-06 (client, `task_52b05daeaa83` / `ctx_6d416ca02a24`) in parallel — separate packages, separate `node_modules`/build output (root `CLAUDE.md` §4.3, `.agents/leader.md` ARI note). T-02 waits for T-01 (same package).

## Task Execution History

### T-06 — Client: Pool Funding section for TIP results — PASS

- **Date:** 2026-10-21 · **Attempts:** 1 · **Effort:** medium · **Skills:** `angular-developer` (task default)
- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_52b05daeaa83` / `ctx_6d416ca02a24`
- **Attempt 1:**
  - **Files changed:** `client/research-indicators/src/app/shared/utils/platform-code.util.ts` (+ spec) — `POOL_FUNDING_PLATFORMS = [STAR, TIP]`; `shared/services/api.service.ts` (+ spec) — `bilateralPath` strips one known `PLATFORM_CODES` prefix, case-insensitive; `shared/services/bilateral.service.spec.ts` — TIP now one request to the numeric path, AICCRA/PRMS zero, AC.0 moved to `AICCRA-99999`; `shared/components/result-sidebar/result-sidebar.component.spec.ts` — hidden (`eligible:false, display_only:false`) → shown (`display_only:true`).
  - **Falsifier (a)** `bilateralPath` strips only `STAR-` → `Expected: ".../v1/results/123/pool-funding-alignment" / Received: ".../v1/results/TIP-123/pool-funding-alignment"`. Reverted.
  - **Falsifier (b)** TIP removed from `POOL_FUNDING_PLATFORMS` → `Expected one matching request for criteria "Match by function: ", found none.` Reverted.
  - **Consumers grep:** `grep -rn "bilateralPath" src` → 4 production callers (`GET_PoolFundingAlignment`, `…SciencePrograms`, `…HlosIndicators`, `PATCH_PoolFundingAlignment`), all through the helper; `pool-funding-alignment.component.spec.ts` has no platform assertion — unchanged.
  - **Implementer verification:** targeted jest 4 suites / 514 (exit 1 only from the global coverage floor on a partial run, K-020; with `--coverage=false` exit 0); lint `All files pass linting.`; build exit 0 (initial 1.35 MB); spec `tsc` 945 pre-existing errors, identical set before/after.
  - **Evidence re-run (Leader-inline, after the concurrent server worker reported — root `CLAUDE.md` §4.3):** VERIFIED — `npx jest <the 4 paths> --silent --coverage=false` → 4/4 suites, 514/514; `npm run lint -- --quiet` → `All files pass linting.`; `npm run build` → 0.
  - **Reviewer (`akili-reviewer`, Claude Opus):** PASS — `[STAR, TIP]` exact; `bilateralPath` one-prefix strip, STAR callers incl. PATCH unchanged; request test asserts the full URL and arranges the transition (KZ-015); sidebar hidden→shown; `editable()` false proven via `isExternalResult()` with an otherwise-editable flush; no template change; consumers updated or justified.
- **Not Done / Assumptions (Implementer, verbatim excerpt; no owed item):** "Rendered read-only UI is deferred to T-07 HITL. jsdom does not render it." · `editable()` proven on `BilateralService.editable` (the component's `readonly editable`) · "Prefixes `bilateralPath` strips are `PLATFORM_CODES` (STAR, TIP, PRMS, AICCRA). The client constant has no BILATERAL member."
- **ADVISORY:** client has no `BILATERAL` platform code, so a `BILATERAL-` code would fall back to STAR and stay unstripped — pre-existing, not a regression; design §10's "BILATERAL keep the guard" wording is inexact for the client · sidebar test's "TIP" framing is cosmetic · no lowercase `tip-123` row in the `bilateralPath` table.
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 21 calls, 67775 tokens, ended complete.
- **Requirements covered:** R-PPI-006 (unit half; rendered state → T-07 HITL).
- **Decisions made:** none beyond the task.
- **Final verification:** VERIFIED (above).

### T-01 — `prmsRef` / `parsePrmsRef`, its SQL form, and the builder — in progress

- **Attempt 1, spawn 1** (Orca `task_87748033efa6` / `ctx_2ae0a9f5a310`): completion report with an owed item in `Not Done / Assumptions` (verbatim): "`ResultPrmsSyncAggregateRepository.loadByResultId` does not select `results.platform_code` (not a T-01 file). An aggregate from that loader has `platform_code` undefined, and the builder then emits the STAR bare code. TIP prefixing is proven when the aggregate carries `platform_code`. Production TIP payloads stay bare until that SELECT is added." · "Absent or null `platform_code` is treated as STAR so the existing STAR fixtures stay byte-identical to HEAD."
- **Evidence re-run of spawn 1 (Leader-inline):** `npx jest src/domain/tools/prms-normalizer src/domain/entities/result-prms-sync --silent` → 23/23 suites, 344/344; eslint 0; `tsc -p tsconfig.json` 0; build 0 — matches the report.
- **Decision — execute-time spec edit (2026-10-21):** the gap is a site the design omitted, not a meaning change — R-PPI-003 already requires the TIP payload to carry `TIP-123`. Amended `design.md` §7.1 (aggregate loader selects `r.platform_code`) + §11 new row P-21 + count line; `tasks.md` T-01 scope (+ `dto/prms-sync-aggregate.ts`, + `result-prms-sync-aggregate.repository.ts` and its spec). Carried to the T-01 Reviewer as a named conformance check, and once more to T-03's.
- **continuations: 1** (aggregate loader SELECT + its spec) — same retained worker.
- **Continuation 1** (Orca `task_206e914d2eb0` / `ctx_f0dadde97756`, same worker):
  - **Files changed:** `result-prms-sync-aggregate.repository.ts` (header SELECT + `r.platform_code`, mapped onto the aggregate; null/blank → null) and its spec (SELECT text; TIP/STAR header mapping; `loadByResultId` → `CommonFieldsBuilder.build` → `'TIP-123'` / `'123'`).
  - **Initial red:** `Expected pattern: /r\.platform_code/`; `Expected: "TIP" / Received: undefined`; `Expected: "TIP-123" / Received: "123"`.
  - **Falsifier:** `r.platform_code` removed from the SELECT → `selects r.platform_code on the header query` — `Expected pattern: /r\.platform_code/` / received SELECT ending at `creator.last_name`. Reverted. Implementer states its limit (KZ-001): the mock row carries `platform_code` whatever the SQL says, so only the SQL-text assertion gates the column; the real SELECT runs in T-07.
- **Attempt 1, files changed (total):** `tools/prms-normalizer/reference/prms-external-reference.ts` (+ spec, new) — `prmsRef`, `parsePrmsRef`, `prmsExternalReferenceSql`; `tools/prms-normalizer/builders/common-fields.builder.ts` (+ spec) — `external_reference` via `prmsRef(platform_code ?? STAR, code)`; `tools/prms-normalizer/dto/prms-sync-aggregate.ts` — optional `platform_code`; `entities/result-prms-sync/repositories/result-prms-sync-aggregate.repository.ts` (+ spec).
- **Falsifiers (spawn 1, verbatim excerpts):** (a) STAR prefixed → `Expected: "123" / Received: "STAR-123"` (prmsRef, round-trip STAR → `Received: null`, builder); (b) leading zeros accepted → `returns null for "TIP-007"` · `Received: {"code": 7, "platform": "TIP"}`; (c) SQL `CASE` STAR branch broken → `evaluates to prmsRef for STAR` · `Expected: "123" / Received: "STAR-123"`. All reverted.
- **Consumers:** `grep -rln "external_reference" src/domain/tools/prms-normalizer --include='*.spec.ts'` → 4 files (`prms-sync-response.interpreter.spec.ts`, `common-fields.builder.spec.ts`, `payload.builder.spec.ts`, `prms-normalizer.service.spec.ts`); none edited except the builder spec's new describe.
- **STAR old-vs-new (K-019):** existing literals `1441061`–`1441064` and `1441080` unchanged and green — zero divergences.
- **Evidence re-run (Leader-inline, after continuation 1):** VERIFIED — `npx jest src/domain/tools/prms-normalizer src/domain/entities/result-prms-sync --silent` → 23/23 suites, 347/347; `npx eslint src/domain/tools/prms-normalizer src/domain/entities/result-prms-sync` 0; `npx tsc --noEmit -p tsconfig.json` 0; `npm run build` 0.
- **Reviewer (`akili-reviewer`, Claude Opus):** PASS — parser is the exact inverse over canonical codes and rejects every listed form; round-trip over every enum value; SQL `CASE` compared against `prmsRef` (JS evaluation acceptable — T-07 owns MySQL); STAR byte-identical; "absent/null platform → STAR" keeps NFR-PPI-001 (column is nullable, HEAD sent bare) and is no TIP hole now that the loader selects it; P-21 amendment is a missing site, not a meaning change.
- **Not Done / Assumptions (verbatim excerpt; no owed item after continuation 1):** "Absent platform → STAR is kept … a null or blank `header.platform_code` is stored as `null`, which the builder still reads as STAR. A header row that actually contains `TIP` or `STAR` is mapped through, so a production TIP payload is prefixed."
- **ADVISORY:** **NULL platform — SQL vs builder disagree:** the `CASE` gives `CONCAT(NULL, …)` = NULL while the builder sends the bare code; reachable when a `results` row has NULL `platform_code` (nullable column; Dev count not obtained — read-only query timed out 2026-10-21) — **forward pointer to T-03, T-05, T-07** · a platform outside the enum would be sent as `FOO-123` and come back UNKNOWN_REFERENCE · **do not ship T-01 without T-03** (claim still writes `String(code)` while the payload carries `TIP-<code>`; nothing pushes TIP until child 3) · `prmsRef(TIP, '007')` gives a non-parseable value — inverse holds for canonical inputs only.
- **spawns:** implementer (Grok/Cursor) spawn 1 + continuation 1 not reported by host, ended complete / complete; reviewer 13 calls, 68067 tokens, ended complete.
- **continuations: 1** (aggregate loader SELECT + spec).
- **Requirements covered:** R-PPI-003; R-PPI-004 parsing half; NFR-PPI-001 (payload half).
- **Decisions made:** execute-time spec edit P-21 (above); `dto/prms-sync-aggregate.ts` added to scope by the same edit.
- **Final status:** PASS on attempt 1 · **Final verification:** VERIFIED.

**Owner decisions after T-01 (2026-10-21):** (1) "Lo prendo yo" — T-02 waits for Docker (Leader pre-check: `docker info` → daemon not running; read-only Dev query also `ETIMEDOUT`). (2) "COALESCE a STAR" — **execute-time spec edit:** `design.md` §7.5 (SQL fragment reads NULL platform as STAR, like the builder) and `tasks.md` T-03 Scope (+ the fragment file, its test and falsifier). Meaning of R-PPI-002/003 unchanged. Carried to the T-03 Reviewer as a named check (with P-21).

### T-02 — Migration and entity columns — in progress

- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_eb327f586e81` / `ctx_af7486c4850b` (fresh worker). Environment pre-check (Leader): `docker info` → 29.8.2; `docker-compose` v5.6.0.
- **Question from the worker (verbatim):** "T-02 SQL, spec, entities, tsc, eslint, and npm run build are green. migration:test:bootstrap on a fresh TEST container (127.0.0.1:3307 ari_scratch_test) dies before T-02 at CreatePiDelegates1787600000000: errno 3780, project_id utf8mb4_0900_ai_ci vs agresso_contracts.agreement_id utf8mb3. Commit 027bc60f changed that CREATE from utf8mb3 (which the migration comment says the FK needs) to utf8mb4. The log and history tables are created by later migrations, so T-02 never runs and falsifier (b) plus the green revert were not observed. May I restore utf8mb3 on that already-committed migration so a fresh bootstrap can reach T-02, or stop with that verification unrun?"
- **Leader answer:** no edit to a committed migration — `027bc60f` is on several remote branches (`git branch -r --contains 027bc60f`); migrations are append-only (root `CLAUDE.md` §4.1). The full bootstrap is a **pre-existing blocker** outside this spec (recorded as RB-3). Verification re-routed to a **targeted run** on a fresh TEST container: `baseline:test:load` → throwaway script (scratchpad, not committed) calling `up()` of `1789479131116`, `1790023167000`, `1790086170692`, seeding the backfill cases, then T-02 `up()` → `down()` → `up()`; falsifier (b) observed on that `down()`. Same claim (the migration runs and reverts on the real table shape), narrower route; the gap is that unrelated later migrations are not replayed.
- **Owner note (2026-10-21):** concern that the local Docker DB is not at parity with Dev/Prod. Answered: schema = Dev snapshot (2026-08-14) + later migrations; **no data**, so real-row backfill is covered by P-19 (Dev) and the in-migration collision abort; any Prod data check is a read-only owner query. Owner: "si los cambios lo haces basado en las entidades no creo que sea problema".
- **Attempt 1, spawn 1 — completion report (summary; full report in the session scratchpad):** migration `1792617297685-addPlatformCodeToPrmsSyncTables.ts` + spec, both entities. Falsifier (a) drop `MODIFY … NOT NULL` → `Expected: < -1 / Received: 7` at `expect(Math.max(updateLog, updateHistory)).toBeLessThan(notNull)`; (c) drop TIP-only branch → `Expected substring: "WHEN COUNT(DISTINCT r.platform_code) = 1 THEN MIN(r.platform_code)"`; (b) column-before-index down → **not red**: `FALSIFIER B: down returned without error` (MySQL 8.0 accepts it). Full bootstrap → `Migration "CreatePiDelegates1787600000000" failed … ER_FK_INCOMPATIBLE_COLUMNS, errno: 3780` (RB-3). Targeted run (fresh container, baseline + `1789479131116`/`1790023167000`/`1790086170692` + T-02): `t02-up ok`, `t02-down ok`, `t02-up-again ok`; log after first up `627/STAR`, `TIP-123/TIP`, `999/STAR`; after up-down-up row 2 = `TIP-123/STAR` (**down does not restore the reference**). Collision `SIGNAL` not exercised on MySQL.
- **Not Done / Assumptions (verbatim excerpt):** "Down does not undo a rewritten reference. A second up then reads `TIP-123` as no match and stores STAR. Observed." · "Out of file scope, these entity specs still assert the old column list / index shape and will fail when run: `result-prms-sync-log.entity.spec.ts` … and `prms-webhook-delivery.entity.spec.ts` … They were not edited." · NULL `results.platform_code` counts as STAR; several non-STAR platforms with no STAR → STAR, not rewritten.
- **Leader check:** `npx jest src/domain/entities/result-prms-sync/entities src/domain/entities/prms-webhook/entities --silent --coverage=false` → `Test Suites: 2 failed` · `Tests: 4 failed, 41 passed` — confirms the consumer gap.
- **continuations: 1** (down restores the rewritten reference; the two entity specs; collision abort exercised on MySQL) — same retained worker (`task_eef3b8bd2eb2` / `ctx_6d80b4a7efd9`). Falsifier (b) recorded as unable to go red on MySQL 8.0; the jest order assertion gates down order.
- **Continuation 1 result (summary):** down restores rewritten references (up→down→up identical: row 2 `TIP-123/TIP`); both entity specs updated; collision exercised on MySQL → `ER_SIGNAL_EXCEPTION` 1644, references unchanged, but the two nullable columns and the check procedure had already been created (DDL implicit commit) — a collision abort would leave the migration half-applied. Leader re-run: migration-specs + entity specs 19/19 suites, 241/241; tsc 0; eslint 0; build 0.

## T-02 discarded by the owner (2026-10-21)

- **Owner (verbatim):** "siento que esta actividad 2 esta abibalente no siento seguridad con esta fallo mucho la conexion con claude y creo que sera mejor descartar todos los cambios de la actividad 2 y retomar magnana esa tarea".
- **Action (Leader, pathspec restore — only T-02's files were uncommitted):** `git restore` of `prms-webhook-delivery.entity.ts` + spec and `result-prms-sync-log.entity.ts` + spec; `git clean -f` of `db/migrations/1792617297685-addPlatformCodeToPrmsSyncTables.ts` and `db/migration-specs/1792617297685-addPlatformCodeToPrmsSyncTables.spec.ts`. `git status --porcelain` after: clean. No Reviewer ran; nothing of T-02 was committed. Workers released; no TEST container running. T-01 and T-06 (committed) are untouched.
- **Carry into the restart (lessons from this attempt, for the fresh brief):**
  1. Full `migration:test:bootstrap` is blocked by a pre-existing defect (RB-3, `CreatePiDelegates1787600000000` errno 3780) — use the targeted run (baseline + `1789479131116`, `1790023167000`, `1790086170692` + this migration).
  2. Falsifier (b) cannot go red on MySQL 8.0 (dropping a column inside a composite index is accepted) — the jest order assertion is the down-order gate.
  3. `down()` must restore rewritten `<platform>-<code>` references, or `up → down → up` mis-tags them.
  4. The entity specs `result-prms-sync-log.entity.spec.ts` and `prms-webhook-delivery.entity.spec.ts` pin the column/index shape — they belong to T-02's Consumers.
  5. The collision check must run **before any DDL** (read-only SELECT), or an abort leaves the schema half-applied — **open owner decision**, design §5 order.
  6. `CAST('TIP-123' AS UNSIGNED)` errors under `STRICT_TRANS_TABLES` — guard the cast.
- **Status:** T-02 `[ ]` — to restart tomorrow with a fresh worker.

## T-02 restart (2026-10-22)

- **Owner decision (open item 5 above):** "Antes de todo" — the collision pre-check runs first, read-only, before any DDL. **Execute-time spec edit:** `design.md` §5 *Migration order* gains step 0 (read-only `SELECT` deriving each log row's platform from the `results` join; a thrown `Error`, no stored procedure). Meaning of R-PPI-001 / NFR-PPI-002 unchanged — it narrows *when* the abort happens so "merges nothing" also means "changes nothing". Carried to the T-02 Reviewer as a named conformance check.
- **Environment pre-check (Leader):** `docker info` → 29.8.2; `orca` at `/usr/local/bin/orca`.
- **Execute-time spec edit (Leader, 2026-10-22):** `design.md` §5 *Down* gains "restore every rewritten log reference to its bare code" before dropping the columns — the 2026-10-21 attempt observed `up → down → up` re-tagging `TIP-123` as STAR. This is what R-PPI-001 "IT MUST be reversible … without losing other data" already requires; a missing step, not a meaning change. Carried to the T-02 Reviewer as a named check.

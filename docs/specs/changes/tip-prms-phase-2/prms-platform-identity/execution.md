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

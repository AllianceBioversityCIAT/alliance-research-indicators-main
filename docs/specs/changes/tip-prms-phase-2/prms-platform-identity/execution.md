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

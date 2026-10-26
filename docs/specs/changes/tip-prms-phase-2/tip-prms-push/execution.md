# Execution Log — TIP Integration / Push TIP Knowledge Products to PRMS

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/tip-prms-phase-2/tip-prms-push` (AC-1761 phase 2, family child 3) |
| Leader | Claude Opus 5.5 (session) |
| Implementer | Grok `grok-4.7-high` via Cursor CLI (Orca `/orchestration`) — standing split: Grok implements, Claude reviews |
| Reviewer | Claude `akili-reviewer` wrapper (fresh context, different weights from the Implementer) |
| Mode | Spec `gated`; owner standing rule for routine progress: continue task to task, stop only on HALT / FATAL_FAIL / pivot / budget tripwire. T-04 step 1 (P-13 count, VPN) and T-06 (live push) need the owner |
| Approval | `tasks.md` Document Control: all three gates approved by the owner 2026-10-26; `/akili-execute` invoked 2026-10-26 after the specify commit `534579d5` |
| Budget | 6 tasks · ~850 LOC · 8 review rounds (design §14) |
| Started | 2026-10-26 |

Every task is in the server package, so tasks run one at a time (root `CLAUDE.md` §4.3), although T-01 and T-02 are independent.

## Task Execution History

Orca run `run_c3dc2881e028`.

### T-01 — Gate: TIP equivalences, only for the TIP sync — PASS

- **Date:** 2026-10-26 · **Attempts:** 1 · **Effort:** high (shared gate on STAR's critical path; task default medium raised) · **Skills:** `nestjs-expert`, `tdd` (task default)
- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_8f09b28121b0` / `ctx_72835d3d27a7` (fresh worker). Brief: scratchpad `t01-brief.md`. Exemplar: existing cases in `sync-gate.spec.ts`.
- **Attempt 1:**
  - **Files changed:** `src/domain/entities/result-prms-sync/eligibility/sync-gate.ts` — optional `platform_code` / `origin` (`'HTTP' | 'TIP_SYNC'`) on `SyncGateSnapshot`; exported `isTipSyncPush` (`origin === 'TIP_SYNC' && platform_code === 'TIP'`); `approved` also passes status 20 when the helper is true; `indicator_mappable` lets KP through when the helper is true (after the null check, before `UNMAPPABLE_INDICATORS`, so OICR stays refused). `sync-gate.spec.ts` — six R-TPP-003 cases through `attemptSend` → `evaluateSyncGate`. `repositories/result-prms-sync-log.repository.ts` — `loadGateSnapshot` selects `r.platform_code`, mapped with the existing `platformCodeOf` (NULL → STAR); `origin` never set. Its spec — SELECT contains `r.platform_code`, mapped value, `origin` undefined.
  - **Pre-lift red (verbatim excerpts):** `sync-gate.spec.ts:356` allowed `Expected: true` / `Received: false`; `:374` `Expected: "alignment_green"` / `Received: "approved"`; `:450` `Expected: "indicator_mappable"` / `Received: "approved"`; repository spec `:647` `toContain('r.platform_code')` absent. The three refusal pins that match today's behaviour were already green (not a red); falsifiers (a)/(b) prove them.
  - **Falsifier (a)** `return snapshot.platform_code === 'TIP';` → `-t "refuses a TIP Knowledge Product in status 20 when origin is absent"`: `Expected: false` · `Received: true` at `sync-gate.spec.ts:393` (`expect(decision.allowed).toBe(false)`). Reverted.
  - **Falsifier (b)** `return snapshot.origin === 'TIP_SYNC';` → `-t "refuses a STAR Knowledge Product in status 6 even when origin is TIP_SYNC"`: `Expected: false` · `Received: true` at `:412`. Reverted (restored line confirmed by read).
  - **Implementer verification:** `npx jest src/domain/entities/result-prms-sync src/domain/tools/prms-normalizer --silent` → 23/23 suites, 366/366; `npx eslint src/domain/entities/result-prms-sync` 0; `npx tsc --noEmit -p tsconfig.json` 0; `npm run build` 0.
  - **Consumers:** the five unit consumers green (inside the 366). `test/result-prms-sync-claim-concurrency.integration-spec.ts` type-checks (`tsconfig.json` excludes only `node_modules`, `dist`, `vite.config.ts`), not executed. `test/prms-sync.e2e-spec.ts` not reached: `connect ECONNREFUSED 127.0.0.1:3307`.
  - **Evidence re-run (Leader-inline):** VERIFIED — same four commands: 23/23, 366/366; eslint 0; tsc 0; build 0.
  - **Leader probe on the e2e deferral (leader.md *Deferring a check*):** assumption "the e2e cannot run because no TEST MySQL". Probe: `npm run compose:test:up` → container up; `npm run migration:test:bootstrap` → baseline loaded, 325 migrations applied, then `Referencing column 'project_id' and referenced column 'agreement_id' in foreign key constraint 'FK_pi_delegates_project_id' are incompatible` (pre-existing RB-2, child 2 used the Dev-dump route). The bootstrap route is confirmed broken; the Dev-dump route is available (VPN up, `nc -z 192.168.20.210 3306` succeeded). The e2e is deferred to T-05, which lists it as a consumer and runs on a Dev-dump container. Container torn down.
  - **Reviewer (`akili-reviewer`, Claude Opus):** PASS — entry order, HTTP statuses, `persistsRow` and descriptions unchanged (read `sync-gate.ts` in full); only the two `fails` predicates gained a TIP-only branch; every case goes through `evaluateSyncGate` (disqualifier not hit); falsifiers show DD-1's two-condition key is load-bearing both ways; nothing in `result-prms-sync/` writes `origin`.
- **Not Done / Assumptions (Implementer, verbatim; no owed item):** "NULL or non-string `platform_code` is mapped with the repository's existing `platformCodeOf` (NULL → `STAR`). `origin` is left unset. The e2e suite did not execute."
- **ADVISORY:** readability — the `indicator_mappable` message still names "Knowledge Product and OICR" (correct for T-01, messages must not change) · reliability — `platformCodeOf` exists in three files (pre-existing duplication) · risk — no test sets `origin: 'HTTP'` explicitly (the absent case covers the branch).
- **Forward pointers → T-03:** the Reviewer must check that no controller or DTO can carry `origin` from user input (design §8). **→ T-05:** run `test/prms-sync.e2e-spec.ts` and the claim-concurrency integration spec on the Dev-dump container; `loadGateSnapshot` returning `platform_code` on real MySQL.
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 12 calls, 71236 tokens, ended complete.
- **Requirements covered:** R-TPP-003 (all five scenarios, unit level), NFR-TPP-001 (gate).
- **Decisions made:** effort raised to high (shared gate). E2e deferred to T-05 after a probe (above).
- **Final verification:** VERIFIED. Review rounds: 1/8. Continue gate: auto-approved (owner standing rule).

### T-04 step 1 — P-13 eligible count on Dev (done early, read-only)

- **Date:** 2026-10-26, run by the Leader while the T-01 Reviewer was active (read-only remote query; touches no `node_modules`, port or build output). VPN was up.
- **Route:** `node_modules/mysql2` script (scratchpad `p13/p13-count.js`), `ARI_MYSQL_*` = `192.168.20.210` / `alliancereportingdb`, `SET SESSION TRANSACTION READ ONLY` + `START TRANSACTION` … `ROLLBACK`, SELECT only.
- **Query:** reporting year = `app_config.ARI_PRMS_SYNC` (active) → **2026**. Base set: `results r` with `platform_code = 'TIP'`, `is_snapshot = 1`, `is_active = 1`, `report_year_id = 2026`, `result_status_id = 20`; primary active contract joined as in `loadGateSnapshot`; contributor = `effectivePoolFundingContributorSql('ac')`; green = `pool_funding_alignment_validation(r.result_id) = 1`.
- **Counts:** `{"base":12,"kp":"12","kp_no_code":"12","kp_no_code_green":"8","kp_no_code_contrib":"6","eligible":"2"}` — 12 TIP 2026 version rows in status 20, all KP, all with `prms_result_code IS NULL`; 8 green; 6 with a contributing primary contract; **2 meet all four conditions**.
- **P-13:** settled — eligible count 2 > 0, so no Pivot. (The count does not check the `'Handled'` evidence link or `payload.poolFunding`, which only the run has in memory.)

### T-02 — Builder: TIP `toc_mapping` override — PASS

- **Date:** 2026-10-26 · **Attempts:** 1 · **Effort:** medium · **Skills:** `nestjs-expert`, `tdd` (task default)
- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_693e2f58aa4c` / `ctx_627bdc28efb9` (fresh worker). Brief: scratchpad `t02-brief.md`. Exemplar: `buildTocMapping` and its spec.
- **Attempt 1:**
  - **Files changed:** `src/domain/tools/prms-normalizer/builders/common-fields.builder.ts` — `build(aggregate, overrides?: { tocMapping?: TipTocMappingDto })` (type reused from `response-year-tip.dto.ts`); with `tocMapping`, `buildTipTocMapping` emits only the seven TIP keys, omits empty / null / whitespace-only values (`0` is sent), drops `toc_internal_id` and `toc_result_indicator_id`, and throws `PrmsPayloadBuildError` `Missing mandatory field 'toc_mapping.science_program_id'` via `requirePresent`; `buildTocMapping(aggregate)` is not called when the override is given; no override → unchanged. `payload.builder.ts` — passes `overrides` through. Both specs.
  - **Falsifier (a)** `{ ...buildTipTocMapping(overrides.tocMapping), ...buildTocMapping(aggregate) }` → `common-fields.builder.spec.ts:809` `expect(payload.toc_mapping).toEqual(sevenTipKeys)`: Expected `"science_program_id": "SP02"`, `"toc_result_id": 19191` · Received `"SP01"`, `6339` (stored values overwrote the TIP keys); also `payload.builder.spec.ts:369` red. Reverted.
  - **Falsifier (b)** assign `''` / `null` instead of omitting → `:821` `toEqual({ science_program_id: 'SP02' })`: `+ "aow_compose_code": ""`, `+ "target_contribution": null`. Reverted.
  - **Implementer verification:** `npx jest src/domain/tools/prms-normalizer --silent` → 14/14 suites, 201/201; `npx eslint src/domain/tools/prms-normalizer` 0; `npx tsc --noEmit -p tsconfig.json` 0; consumers `npx jest src/domain/entities/result-prms-sync --silent` → 9/9, 170/170. Claim-concurrency integration spec type-checked only.
  - **Evidence re-run (Leader-inline):** VERIFIED — `npx jest src/domain/tools/prms-normalizer src/domain/entities/result-prms-sync --silent` 23/23, 371/371 (= 201 + 170); eslint 0; tsc 0.
  - **Reviewer (`akili-reviewer`, Claude Opus):** PASS — seven keys only, no fallback to the stored alignment when the override is given (DD-4), no-override path routes to the original `buildTocMapping`, exact `toEqual` everywhere (disqualifier not hit). Answered the Leader's question: falsifier (a) can only overwrite, never add keys, because every stored key is one of the seven; the extra-key property rests on the fixtures carrying `toc_internal_id` / `toc_result_indicator_id`, and that red had not been observed.
  - **Leader extra falsifier (Reviewer advisory, after the code commit `ee610b96`):** `buildTipTocMapping(overrides.tocMapping)` → `({ ...overrides.tocMapping } as any)` at `common-fields.builder.ts:518` → `npx jest …/common-fields.builder.spec.ts --silent -t "exactly"`: `● … emits exactly the seven TIP keys and no stored-alignment keys` · `- Expected - 0` `+ Received + 2` · `+ "toc_internal_id": "internal-not-sent",` `+ "toc_result_indicator_id": "indicator-not-sent",` at `common-fields.builder.spec.ts:809:35`; `Tests: 1 failed, 46 skipped`. Restored with `git checkout --` from the commit; `git status` clean. The no-extra-keys property is now observed, not argued.
- **Not Done / Assumptions (Implementer, verbatim):** "none"
- **ADVISORY:** reliability — `toEqual` treats an `undefined`-valued key as absent (no wire impact: JSON drops `undefined`) · risk — `build(agg, { tocMapping: null })` quietly uses the stored alignment at this layer; design §5 / JD-6 puts the guard in the service (T-03) · readability — six near-identical omission blocks could be one loop over a key tuple.
- **Forward pointer → T-03:** the service's `TIP_SYNC` guard must throw `PrmsPayloadBuildError('toc_mapping')` for a **null** `tocMapping` too, not only an absent one — `build(agg, { tocMapping: null })` reaches the stored alignment (Reviewer advisory). T-03's Reviewer checks it.
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 12 calls, 63788 tokens, ended complete.
- **Requirements covered:** R-TPP-004 *Payload shape* (TIP fields, BUT not invent — omission), `toc_mapping` row (seven keys).
- **Decisions made:** code committed before the Leader's throwaway falsifier so the restore could come from `HEAD`.
- **Final verification:** VERIFIED. Review rounds: 2/8. Continue gate: auto-approved (owner standing rule).

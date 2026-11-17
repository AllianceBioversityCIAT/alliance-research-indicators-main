# Judgment Day — tip-prms-push design (round 1)

- **Target:** `requirements.md` + `design.md` (draft, 2026-10-26), HEAD `007a18fc`
- **Judges:** two blind read-only `akili-reviewer` instances (A: sonnet, B: opus); author: opus (architect). Neither had DB access.
- **Result:** 0 severe findings confirmed by both · 1 severe suspect (B only), settled by the architect against source · 5 issues raised by both judges at WARNING/SUGGESTION · 9 single-judge WARNING/SUGGESTION.
- **Ledger:** 12 rows confirmed by both; P-13 and P-14 `not re-run` (no DB / live PRMS). Citation nits: P-10 imports are at `result-prms-sync.module.ts:22`, P-11 predicate at `sync-gate.ts:119`.

## Raised by both judges

| ID | Severity | Finding | A | B |
|---|---|---|---|---|
| JD-1 | WARNING | The TIP `toc_mapping` override drops `toc_result_id` and `target_contribution`, which the stored builder sends because PRMS resolves on the ID (`common-fields.builder.ts:213-236`); the TIP DTO carries both (`response-year-tip.dto.ts:13,19`) | J-1 | J-4 |
| JD-2 | WARNING | The summary has no bucket for `AUTH_FAILED`, `TRANSPORT_FAILED`, `UNKNOWN`. `candidates` is undefined (pre or post year filter). The R-TPP-001 "0 candidates" scenario fails: an empty `IN ()` after the year filter. RK-1 says "already synced" where the design says `NOT_SENT` | J-2, J-5 | J-5 |
| JD-3 | WARNING | "The run guard covers the push" holds only for 6 h from run start (`sync-process-log.service.ts:51-64`); a long push can overlap a new run | J-8 | J-2 |
| JD-4 | WARNING | P-13 (an eligible TIP KP exists on Dev) is High and still UNVERIFIED; RK-4 promised the count in design | J-7 | J-6 |
| JD-5 | SUGGESTION | The design does not name how `collectSaved` tells a version save from the live save | J-9 | J-8 |

## Single judge

| ID | Severity | Finding | Judge | Architect settlement |
|---|---|---|---|---|
| JD-6 | **CRITICAL (suspect)** | A null `tocMapping` (handle stopped contributing in TIP while an earlier import left a green alignment) falls back to the stored `toc_mapping` — breaks R-TPP-004 "MUST NOT send `toc_mapping` from the stored alignment" | B J-1 | **Confirmed by re-read:** design §2.1 says "When `tocMapping` is given" and "Without overrides: unchanged"; `tip-integration.service.ts:719` imports only when `poolFunding != null` and nothing clears an earlier alignment |
| JD-7 | WARNING | `created_by` is written only on insert (`results.service.ts:435`; update branch `save-all-sections.service.ts:191-200`), so a legacy row keeps the author of its first import — stale author or permanent refusal | B J-3 | Confirmed by re-read of the cited lines |
| JD-8 | WARNING | Every ineligible TIP KP adds a `REFUSED_BY_STAR` log row on every run (non-contributing, non-ABC lead center) | A J-3 | Valid; pre-filter or accept |
| JD-9 | WARNING | After `UNKNOWN`/`TRANSPORT_FAILED` the next run re-sends without the out-of-band check the engine asks for (`result-prms-sync.constants.ts:19-32`) | A J-4 | Valid |
| JD-10 | WARNING | A null actor binds `undefined` into the raw INSERT; only a real-MySQL test proves it becomes NULL | A J-6 | Valid; integration case |
| JD-11 | SUGGESTION | The R-TPP-005 message is the first failing field (`lead_center` builds before `created_by`) | A J-10 | Valid |
| JD-12 | SUGGESTION | `platform_code`/`origin` must be optional on `SyncGateSnapshot` (literals at `repository:152`, claim-concurrency integration spec `:98`) | A J-11 | Valid |
| JD-13 | SUGGESTION | Design §10 omits the STAR-same-code integration assertion and `npm run build` that requirements §7 lists | B J-7 | Valid |
| JD-14 | SUGGESTION | Write `update(counters)` before the push; record that accepted rows keep being re-imported by later runs (pre-existing) | B J-9 | Valid |

## Verdict

No severe finding was confirmed by both judges, so the auto-fix gate does not apply. JD-6 is a severe single-judge suspect that the architect confirmed at source. All findings were put to the owner at the Phase 2 gate.

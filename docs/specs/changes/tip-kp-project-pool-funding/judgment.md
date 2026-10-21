# Judgment Day — tip-kp-project-pool-funding / design

- **Target:** `requirements.md` + `design.md` as drafted 2026-10-20 (HEAD `3ee449e41`)
- **Judges:** A and B, blind, read-only, Sonnet (author: Opus)
- **Round:** 2 of 2 · **State:** approved

## Premise Ledger attack

No premise contradicted at source. Both judges: P-1…P-6, P-8…P-13 confirmed; P-7 not re-run; P-16, P-17 not refutable from the repo. P-18 partially refuted (C-1, C-2). P-8 cites `toc-integration.types.ts` without its `dto/` folder (B).

## Confirmed by both judges

| ID | Sev (A / B) | Finding | Fix |
| --- | --- | --- | --- |
| C-1 | SEVERE / SEVERE (A-2, B-1) | Mapping map keyed by `public_link` only; `processing()` handles several years (and snapshots) per link, so one year's mapping overwrites another's and lands on the wrong row | Carry the mapping on the mapped object / key by link + year + snapshot flag; lookup uses the save's exact keys plus `is_snapshot` |
| C-2 | WARNING / SEVERE (A-6, B-2) | A row the save **skipped** (`shouldOmit`) or failed to update can still exist and be found → import writes onto a result the sync did not touch | Drive the import only from results the save actually processed |
| C-3 | SEVERE / SEVERE (A-3, B-3) | Unknown primary → `createResult.contract_id = null` → `AgressoContractService.findOne({agreement_id: null})` (TypeORM 0.3 drops null where-values → arbitrary contract's SDGs) and `linkUserToContract(…, null)`; no premise row | Premise row + design rule for the null path |
| C-4 | SEVERE / WARNING (A-1, B-5) | Ledger count line says 14 verified; table has 15. P-14 "9 files (+ dto)" double-counts | Correct counts |
| C-5 | WARNING / WARNING (A-7, B-6) | Actor id source unspecified | `userData?.sec_user_id ?? null` + null test |
| C-6 | WARNING / WARNING (A-5, B-7) | `getTocResultsForSps` is `Promise.all` — one failing level loses the others | Per-level try/catch |
| C-7 | WARNING / WARNING (A-8, B-10) | `target_contribution` → `decimal(18,2)` coercion unspecified | `Number()` + NaN→null; rounding noted |

## Suspect (one judge)

| ID | Sev | Finding |
| --- | --- | --- |
| B-4 | SEVERE | R-TIP-001 "first **known** project" vs design §7.2 "first item, no promotion" contradict for `[unknown, known]` legacy payloads (architect re-check: confirmed by reading both docs) |
| A-9 | WARNING | Multiple catalog matches: first-match rule unstated |
| B-8 | WARNING | NFR-TIP-001 "once per run" is really "once per TTL window" |
| B-9 | WARNING | Re-sync re-inserts alignment rows every run (churn) |
| B-13 | SUGGESTION | `tipIntegrationMapper` reads `result_contracts[0]`, which may no longer be the primary |
| A-10, A-11, A-12, B-12, B-14 | SUGGESTION | Re-sync primary-flip test; non-primary contracts not linked to user; transaction note; inactive agresso contract; eligible-TIP read-only lives on client only |

## Round 1 correction (user chose "Fix and Re-judge", 2026-10-20)

Applied to `requirements.md` + `design.md`: C-1..C-7, B-4, A-9, B-8, B-9, B-13 (D-2 rewritten to per-result save + counter-delta gate; D-8, D-9, D-10 added; P-19..P-23 added; counts corrected).

## Round 2 — scoped re-judgment (both judges)

| Item | A | B |
| --- | --- | --- |
| C-1, C-2, C-4, C-5, C-6, C-7, B-4, A-9, B-8, B-13 | RESOLVED | RESOLVED |
| C-3 | PARTIAL (residual null path) | PARTIAL (same) |
| B-9 | RESOLVED with RA-1 | PARTIAL (RB-1) |

New findings — no SEVERE from either judge:

| ID | Sev | Both? | Finding | Disposition |
| --- | --- | --- | --- | --- |
| RA-1 / RB-2 | WARNING | yes | Catalog failure on a later sync would overwrite resolved level/indicator with nulls | Folded in by the architect: R-TIP-003 clause + scenario, design §7.4 step 1 |
| RA-2 / RB-3 | WARNING | yes | No known project → `createResult` null-contract path still runs | Recorded as accepted residual in R-TIP-002 + D-8, with `warn` |
| RB-1 | WARNING | B | Equality vs `decimal(18,2)` string | Folded in: §7.4 step 3 normalisation + test |
| RB-5 | SUGGESTION | B | ERROR after write → not imported this run | Folded in: R-TIP-003 clause |
| RA-3 / RB-6, RB-4 | SUGGESTION | yes / B | Stale `importTipPoolFunding` name; P-13 `:196` → `:197` | Fixed |
| RA-4 | SUGGESTION | A | Ledger rows not in numeric order (verified rows grouped first) | Kept — grouping is intentional |

Verified by both: `bulkSaveAllSections` is only the loop (`save-all-sections.service.ts:67-74`); counter delta separates omit / success / error (`:131-136`, `:171`, `:180`, `:276`, `:280`); P-19..P-23 reproduce.

JUDGMENT: APPROVED ✅

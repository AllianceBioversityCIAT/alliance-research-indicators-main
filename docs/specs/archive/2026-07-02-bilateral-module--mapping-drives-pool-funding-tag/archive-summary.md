# Archive Summary — Bilateral / Mapping drives the Pool Funding tag

## 1. Document Control

- **Spec id:** 2026-07-mapping-drives-pool-funding-tag
- **Module:** agresso (bilateral)
- **Owner:** PO (bilateral squad)
- **Executed via:** JCSPECS Leader → Implementer → Reviewer triad (`.agents/`)
- **Branch:** AC-1594-bilateral-module-v2

## 2. Original Spec Path

`docs/specs/bilateral-module/mapping-drives-pool-funding-tag/`

## 3. Archive Date

2026-07-02

## 4. Final Status

**COMPLETE.** T-01…T-06 all done; every task passed Reviewer audit on the **first attempt** (zero rework loops, no HALTs, no pivots). Runtime verification executed live on 2026-07-02 with user authorization.

## 5. Requirements Delivered

- **R-BIL-100** — Projects table reports the effective flag (`manual tag OR active bilateral mapping`), derived at read time. Verified live: D504 (mapping active, tag 0) → `true`.
- **R-BIL-101** — `pool-funding-contributor` filter uses the effective value on both count and main queries. Verified live: `=true` includes D504, `=false` excludes it.
- **R-BIL-102** — Ordering uses the effective expression (fieldMap → shared helper).
- **R-BIL-103** — Results read path (`findPoolFundingAlignmentContext`) projects the same effective value; unit-level parity guaranteed by the shared helper.
- **R-BIL-104** — Deactivating the last active mapping drops the derived badge. Verified live: deactivate mapping 11 → `false`.
- **R-BIL-105** — Pure OR precedence: active mapping wins over manual `false`; no suppress state.
- **NFR-BIL-100** — `EXPLAIN` run against CORE: `idx_bpm_agreement` present and in `possible_keys`; optimizer full-scans only because the table holds ~5 rows (cost model). **Caveat:** re-check EXPLAIN when `bilateral_project_mapping` grows materially.

## 6. Files Changed Summary (from execution.md)

| Commit | Task | Files |
| --- | --- | --- |
| `ba4a7d12` | T-01 | `src/domain/shared/utils/pool-funding.util.ts` + spec (new shared helper) |
| `85c3f663` | T-02 | `agresso-contract.repository.ts` (projection/filter/ordering in `getContracts`) + 1 spec assertion |
| `44b8c57e` | T-03 | `result.repository.ts` (projection in `findPoolFundingAlignmentContext`) |
| `2a33e768` | T-05 | `result.repository.spec.ts` (+6 tests: derivation, parity, lifecycle semantics) |
| `9fcccebf` | T-04 | `agresso-contract.repository.spec.ts` (+4 tests with raw-column restoration guards) |
| `983c03aa` | T-06 | `agresso-contract.controller.ts` (find-contracts Swagger description, text-only) |
| `e9a9c1f1`, `e1b154a6` | T-06 | spec docs: EXPLAIN evidence + close-out |

No schema change, no migration, no DTO/route/guard change — read-layer only, per design.

## 7. Test Evidence Summary

No standalone `test-report.md` — **absence accepted**; full evidence embedded in `execution.md` per-task entries:
- Full suite at close: **291 suites / 1790 tests green**; global coverage **81.91% stmts / 74.12% branches / 83.5% funcs / 81.8% lines** (floor 60%).
- New coverage: helper snapshot spec; 4 repository tests (projection/filter/ordering with guards that fail if raw-column behavior is restored); 6 results tests (derivation, parity, pure-OR lifecycle semantics).
- TEST-datasource integration cases skipped (host unreachable from dev machine; `src/CLAUDE.md §9` forbids MySQL in unit tests) — compensated by live verification (§8).

## 8. Validation Summary

No standalone `validation-report.md` — **absence accepted**; live validation recorded in `execution.md` (T-06 Part 2, user-authorized, local instance :3001 → CORE DB):
- D504 derives `true` with no manual tag; filter includes/excludes correctly.
- Lifecycle round-trip: deactivate mapping 11 → `false`; recreate (new **id 12**) → `true`. Data restored.
- Swagger: new description on find-contracts; root endpoint text intentionally unchanged.
- EXPLAIN evidence per §5 NFR-BIL-100.

## 9. Accepted Warnings / Follow-Ups

1. **Rollout comms (pending, owner: user/PO):** notify STAR team + MEL/PO on deploy that mapped contracts surface the badge automatically. Code-only deploy; backout = git revert.
2. **OQ-2 (open, PO decision):** root `GET /api/agresso/contracts` (`findAllContracts`) intentionally still serves **raw-column** pool-funding semantics (filter + `ac.*`). Decide: derive it too, or document raw-by-design.
3. **RB-5 (open, bilateral squad):** pre-existing lint error `bilateral.service.ts:205` (unused `activePortfolio`, committed at `ff4b7e78`) fails repo-wide `npm run lint`. Outside this spec.
4. **D-pf-5 drift (accepted):** OpenSearch `agresso_contracts` document still indexes the raw column; any OpenSearch-served read of the flag won't see mapping-derived values.
5. **NFR re-check (accepted):** re-run EXPLAIN when `bilateral_project_mapping` exceeds ~1k rows to confirm the optimizer switches to `ref` on `idx_bpm_agreement`.

## 10. Historical Notes

- **Doc erratum fixed during T-02:** the find-contracts chain is `AgressoContractController.findContracts` (`@Get('find-contracts')`) → `service.findAgressoContracts` → `repository.getContracts`; earlier drafts mislabeled it as `service.findContracts → repository.findAllContracts` (that chain backs the root endpoint).
- **Option B (read-time derivation) adopted** over write-time (D-pf-2): retroactive, zero backfill, deactivation auto-clears; `EXISTS` chosen over `LEFT JOIN` (D-pf-1) to avoid row multiplication in the aggregate-heavy query.
- **D504 data note:** its active mapping is **id 12** as of 2026-07-02 (id 11 soft-deleted during lifecycle verification; same target CLARISA 22, DESIRA).
- Execution ran T-04/T-05 as parallel Implementer→Reviewer loops (disjoint files) — no conflicts.

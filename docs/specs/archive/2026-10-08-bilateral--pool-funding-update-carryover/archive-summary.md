# Archive Summary — Bilateral / Pool Funding carry-over on "Update result"

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | 2026-10-pool-funding-update-carryover |
| Original path | `docs/specs/bilateral/pool-funding-update-carryover` |
| Archive path | `docs/specs/archive/2026-10-08-bilateral--pool-funding-update-carryover` |
| Archive date | 2026-10-08 |
| Branch | `pull-prms-result` (spec branch — unpushed) |

## 2. Final Status

**DONE — validated WARN, archive-ready.** Owner approved on Dev: "lo veo funcional haz commit".

## 3. Requirements Delivered

| ID | Delivered |
| --- | --- |
| R-PUC-001 | Update result for a year with a version copies that version's Pool Funding (alignment, SPs, ToC, indicator mappings) onto the live result |
| R-PUC-002 | Mapping section links point at the live result |
| R-PUC-003 | Status/year change and copy commit together; no history on failure |
| R-PUC-004 | Live visibility rules unchanged |
| NFR-PUC-001..003 | Audit on copies, no migration, endpoint contract unchanged |

## 4. Files Changed

| File | Change |
| --- | --- |
| `server/.../green-checks/green-checks.service.ts` | `newReportingCycle` transaction + carry-over |
| `server/.../green-checks/repository/green-checks.repository.ts` | `carryOverPoolFunding` |
| `…/green-checks.service.spec.ts`, `…/green-checks.repository.spec.ts` | unit cases (a)–(e), statement order |
| `server/researchindicators/test/fixtures/pool-funding-update-carryover.fixture-spec.ts` | 6 real-MySQL cases |
| `docs/trd/trd.md` §API | carry-over note (validation remediation) |

Commits: `d389741de` (spec) · `08f7a1612` (T-01) · `3ad6a1e55` (T-02) · `f55827849` (T-03) · `c240c2643` (validation) · archive commit.

## 5. Test Evidence

4093/4093 unit tests · 6/6 fixture cases with the real `SP_versioning` · 16 falsifiers observed red · build, `tsc`, eslint clean.

## 6. Validation Summary

WARN, no FAIL. Doc drifts fixed during validation. See `validation-report.md`.

## 7. Accepted Warnings / Follow-ups

| # | Item |
| --- | --- |
| 1 | S-7 owner check did not name a non-eligible result (accepted gap) |
| 2 | S-6 rollback proven by mock only (accepted gap) |
| 3 | Advisory: add `result_status_id = APPROVED` to the in-transaction update (double-click → duplicate history row) |
| 4 | O-1 new year without a version keeps live Pool Funding empty — owner decision |
| 5 | O-2 `display_only` also applies to PRMS-coded/synced live results — owner decision |
| 6 | O-3 plain unique `uq_rpfim_result_indicator_active` also breaks the normal mapping save after two deactivations — needs a migration |
| 7 | Scratch harness: `baseline.sql` (2026-08-14) stale — `pi_delegates` migration fails (errno 3780); refresh the baseline |
| 8 | Results updated before deploy keep an empty live section (no backfill) |

## 8. Historical Notes

- Implemented inline by Claude (Cursor out of tokens, owner-approved); every task reviewed by an independent Sonnet reviewer.
- Judgment-day ran 2 rounds and ended ESCALATED: a fix-caused severe defect was corrected in the final bounded round and bound to executed evidence (fixture S-2b, falsifier f8 = real `ER_DUP_ENTRY`).
- Premise P-5 refuted at execute time: the Dev-sourced baseline has no unique index on `result_pool_funding_alignment`.
- Budget tripwire: ~500 LOC planned vs +793/−40 actual, fixture-heavy.

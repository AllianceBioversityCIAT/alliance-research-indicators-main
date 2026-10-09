# Execution — Bilateral / Pool Funding carry-over on "Update result"

## Document Control

| Field | Value |
| --- | --- |
| Spec | docs/specs/bilateral/pool-funding-update-carryover |
| Approval mode | pre-approved (owner, 2026-10-08) |
| Implementer | **Leader-inline (Claude Opus)** — owner-approved fallback: "Cursor has no tokens, you do the development" (2026-10-08) |
| Reviewer | independent `akili-reviewer` subagent on **Sonnet** (author ≠ auditor on model and context) |
| Baseline | `d389741de` |

## Task Execution History

### T-01 — `carryOverPoolFunding` + `newReportingCycle` transaction — PASS

- **Date:** 2026-10-08 · **Attempts:** 1
- **Files changed:** `server/researchindicators/src/domain/entities/green-checks/green-checks.service.ts`, `…/green-checks.service.spec.ts`, `…/repository/green-checks.repository.ts`, `…/repository/green-checks.repository.spec.ts`
- **Verification:** `npx jest src/domain/entities/green-checks --coverage=false` → 85 passed · `npx tsc --noEmit -p tsconfig.json` → clean · `npx eslint src/domain/entities/green-checks` → clean · full `npm test -- --silent` → 424 suites / 4093 tests passed
- **Falsifiers (observed red, then reverted):**
  - f1 (saveHistory before the transaction) → `✕ (a) carries Pool Funding over…`, `✕ (c) rejects and writes no history when the carry-over fails` — `Expected number of calls: 0 / Received number of calls: 1`
  - f2 (drop `if (snapshot)`) → `✕ (b) does not touch Pool Funding when the year has no snapshot` — `Expected number of calls: 0 / Received number of calls: 1`
  - f3 (drop `newAlignmentId != null` guard) → `✕ skips the SP insert when no live alignment was created` — `Expected: false / Received: true`
- **Evidence re-run:** VERIFIED — Leader is the author here, so the non-author re-run is the Reviewer's read of the reported outputs plus the full-suite run recorded above; T-02 re-executes the code against real MySQL.
- **Reviewer:** `STATUS: PASS` (Sonnet) — column lists match `SP_versioning` and entities; param order matches every `?`; only the mapping table hard-deleted; history `from = APPROVED` after commit; no-snapshot path end state unchanged.
- **ADVISORY (4R, recorded only):** in-transaction `Result.update` does not re-filter `APPROVED` (double click → harmless duplicate history; pre-existing gap) · `saveHistory` failure after commit leaves Draft without history (D-6 residual) · repository test indexes the DELETE by position `calls[3]` · SP deactivation does not set `updated_at` (matches `SP_versioning` style).
- **spawns:** reviewer — not reported by host (11 tool uses, ~73k tokens), ended complete
- **Requirements covered:** R-PUC-001 (wiring S-1…S-4), R-PUC-002 (SQL text), R-PUC-003 S-6, NFR-PUC-001…003
- **Decisions:** Leader-inline implementation per owner; Reviewer on Sonnet to keep author ≠ auditor.

### T-02 — Real-MySQL fixture for the carry-over SQL — PASS

- **Date:** 2026-10-08 · **Attempts:** 2 · **Effort:** medium → high on attempt 2
- **Environment:** scratch MySQL `127.0.0.1:3307` (`docker-compose.test.yml`). `migration:test:bootstrap` failed on `1787600000000-createPiDelegates` with errno 3780 — the Dev-sourced `baseline.sql` (2026-08-14) has `agresso_contracts` in utf8mb3 while commit `027bc60f7` pinned `pi_delegates` to utf8mb4. **Scratch-only workaround:** created `pi_delegates` by hand in utf8mb3 with both FKs, inserted its `migrations` row, then `migration:test:execute` ran the remaining migrations through `SeedPrmsSyncReportingYear1791488432640`. No repo file changed for this. Pre-existing harness defect, out of scope — recorded for the owner.
- **Files changed:** `server/researchindicators/test/fixtures/pool-funding-update-carryover.fixture-spec.ts` (new); `docs/specs/bilateral/pool-funding-update-carryover/design.md` §11 P-5 (execute-time amendment, below).
- **Attempt 1:** `npm run test:fixtures -- pool-funding-update-carryover` → 6 passed. Falsifiers: f4 → ✕ S-2 (`Expected: 0 / Received: 1`), ✕ S-4 — **not** the predicted 1062 (see P-5); f5 → ✕ S-5 (`Expected: 33580 / Received: 33581`); f6 → ✕ S-1; f7 → ✕ S-1 (`indicator_description`/`toc_result_title` swapped); f8 → ✕ S-2b `QueryFailedError: Duplicate entry '33652-L-K-I-K-0' for key 'result_pool_funding_indicator_mapping.uq_rpfim_result_indicator_active'`, ✕ S-8, ✕ S-4; f9 → ✕ S-1, S-2b, S-8, S-5.
  - **Reviewer (Sonnet): `STATUS: FAIL`** — (1) NFR-PUC-001 audit only partly proven: `created_by` not checked on `_sp`, `updated_by` never checked on inserted rows nor on deactivated alignment/SP/ToC, `deleted_at` only on the alignment; (2) `has_contribution` had no distinguishing seed (FP-48), a hard-coded `TRUE` would pass. Advisory: assert live mapping state after re-approval in S-2b.
- **Attempt 2:** added `expectInsertAudit` (S-1, all four tables) and `expectDeactivatedAudit` (S-2, alignment/SP/ToC); S-1 snapshot `has_contribution = 0` (S-2 still copies a 1); S-2b asserts the live mapping is `[['L-K', 0]]` after the real re-approval. Fixture → 6 passed. Falsifiers re-run: f4 ✕ S-2, S-4 · f5 ✕ S-5 · f6 ✕ S-1 · f7 ✕ S-1 · f8 ✕ S-2b, S-8, S-4 · f9 ✕ S-1, S-2b, S-8, S-5 · **new** f10 (drop SP `updated_by`) ✕ S-2 · f11 (hard-code `has_contribution`) ✕ S-1 · f12 (drop ToC `deleted_at`) ✕ S-2 · f13 (`_sp` `created_by` hard-coded) ✕ S-1. All reverted; `git status` shows `src/` clean. `npx eslint` on the fixture clean.
  - **Reviewer (Sonnet): `STATUS: PASS`** — both issues closed, no new defect.
- **ADVISORY (recorded only):** no falsifier run for alignment/ToC `updated_by` (helper covers them) · `pick` stringifies values (`null` vs `'null'` unreachable with current seeds) · killed run leaves `report_years` 2118 seeded (scratch only) · re-run on a clean bootstrap once the baseline is refreshed.
- **Decisions — execute-time spec edit:** `design.md` §11 **P-5** refuted and amended (2026-10-08): the Dev-sourced baseline has **no** unique index on `result_pool_funding_alignment` (`uq_rpfa_active_result` exists only in the migration). Impact Low as the ledger predicted — D-2 stands; deactivation is what keeps one active alignment. No requirement meaning changed.
- **spawns:** reviewer#1 — not reported by host (15 tool uses, ~77k tokens), ended fail · reviewer#2 — not reported by host (3 tool uses, ~41k tokens), ended complete
- **Requirements covered:** R-PUC-001 S-1, S-2 (all clauses), S-4, S-8 · R-PUC-002 S-5 · NFR-PUC-001

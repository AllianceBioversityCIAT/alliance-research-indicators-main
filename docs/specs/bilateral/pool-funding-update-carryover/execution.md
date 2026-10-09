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

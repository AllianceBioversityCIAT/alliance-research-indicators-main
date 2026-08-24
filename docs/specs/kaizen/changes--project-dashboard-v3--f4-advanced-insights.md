# Kaizen Entry — changes/project-dashboard-v3/f4-advanced-insights

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-dashboard-v3/f4-advanced-insights` |
| Date | 2026-08-24 |
| Branch | bilateral-visual-improvements |
| Archive Run | 1 |
| Approval Mode | gated (chain pre-approvals granted at gates; Pivot + FAIL adjudications explicit) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 9/9 | tasks.md |
| Reviewer FAIL rework attempts | 3 (T-03 ×1, T-04 ×1, T-08 ×1 — each closed in one rework) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 + 1 addendum (T-03 — A-1 false; D-F4-7/D-F4-8) | execution.md — ## Pivot Record: T-03 |
| PRODUCT_BUGs | n/a (no separate /akili-test phase; testing embedded per tasks) | — |
| Validation FAIL / WARN | n/a (owner HITL in-session, approved) | execution.md T-09 HITL close |
| Runtime failures | 1 (account session limit mid-T-09 — parked per winding-down, resumed, 0 attempts lost) | execution.md T-09 PARKED |
| Budget vs actual | tasks 9/9 · review rounds 3 vs 2 · LOC ≈ +4,100 vs 1,300–1,700 (~60% test code) | design.md §13 · execution.md §3 |

## Lessons

- **KZ-changes--project-dashboard-v3--f4-advanced-insights-1 — An assumption falsifiable by one command must be verified at specify time, not "at implementation".** (Product + Methodology, High)
  - Root cause: requirements template §8 accepts assumptions with deferred verification and no cost test. A-1 ("`event_type`/`decision` vocabularies are enumerable — verified at implementation") was falsifiable by one grep at specify time; deferring it let design D-F4-6 and task T-03 build on a vocabulary that did not exist, costing a mid-execution Pivot + owner gate + spec amendment sweep.
  - Evidence: execution.md — `## Pivot Record: T-03`; requirements.md §8 A-1 (pre-amendment); design.md D-F4-6→D-F4-7.
  - Standardization: → P1 (local) + upstream recommendation to the AKILI methodology repo (template gap, nothing project-specific).
- **KZ-changes--project-dashboard-v3--f4-advanced-insights-2 — Budget LOC must be estimated as prod + test separately.** (Product, Medium)
  - Root cause: design template §13 has a single LOC line. Under the methodology's own gates (KZ-001 generated-SQL specs, K-004 reds, KZ-015 transition fixtures), test code ran ~60% of insertions — actual ≈ 2.6× the estimate while task count was exact. The tripwire never fired because each task individually looked normal; only the closing sum exposed the miss.
  - Evidence: design.md §13 (1,300–1,700) vs execution.md §3 (~4,100 across 13 commits).
  - Standardization: → P2.
- **KZ-changes--project-dashboard-v3--f4-advanced-insights-3 — The constitution's K-021 line names a template that violates K-021.** (Product, High)
  - Root cause: root `CLAUDE.md` §4.3's K-021 bullet (and this spec's tasks.md, copied from it) names `test/bilateral-primary-contributing-sp.integration-spec.ts` as THE integration template — but that file wires a **real DataSource** (`createT13DataSource()`), so following it literally opens the connection K-021 forbids against the non-disposable dev DB. The pointer was written from the incident spec, not from a conformant exemplar. The T-05 Implementer dodged it only because the brief named F3's in-process sibling first.
  - Evidence: execution.md T-05 (Reviewer advisory 4, file lines cited); root `CLAUDE.md` §4.3 K-021 bullet.
  - Standardization: → P3 (factual-sweep of the constitutional claim).

## Noted, not a lesson

- Persisted shell `cd` produced an empty diff pathspec once and a failed heredoc append once — both caught by K-011 validation before any dispatch; feeds recurrence if it bites a third time.
- Diff transport to wrapper Reviewers as a Leader-validated file read via `Read` (instead of inline) held integrity across 6 audits at large token savings — candidate methodology note if repeated in another spec.
- `setup-jest.ts` lacked `measureText`; first reachable by ≥2-category axes (F4 reach chart). Fixed in-spec, zero delta on 318 suites.
- Session-limit runtime failure handled by the winding-down protocol exactly as written (park `[~]` + resume protocol + zero attempt loss) — the protocol held; nothing to change.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (§ Assumptions) |
| Edit | Add: "An assumption falsifiable by one command (grep/SQL/ls) MUST be verified during specify and its evidence cited inline; 'verified at implementation' is reserved for assumptions requiring runtime/integration evidence, and must name the task that verifies it." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (§ Budget) |
| Edit | Add: "Estimate LOC as production + test separately; under KZ-001/K-004/KZ-015 gates, test LOC runs 1.5–2× production for repository/builder-heavy specs (measured 2026-08-24, f4-advanced-insights: ~60% of +4,100)." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` §4.3 (K-021 bullet) — mirror in `AGENTS.md` |
| Edit | Replace the template pointer: "(template: `test/agresso-contract-indicator-details.integration-spec.ts` — in-process, no DataSource; ⚠ `test/bilateral-primary-contributing-sp.integration-spec.ts` wires a REAL DataSource via `createT13DataSource()` and must NOT be copied for K-021-bounded specs)". |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` (API contracts — agresso-contract reports family; data-model notes) |
| Edit | Add `GET /api/v1/agresso/contracts/reports/insights` (six always-present nullable sections, envelope + partial-failure semantics per F2/F3 idiom) to the reports-family API delta, and note the canonical review vocabulary constant in `result-review-history/constants/` as the forward contract the future `bilateral.reviewDecision` implementation MUST import (D-F4-7/D-F4-8). |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md`/`AGENTS.md` `## Model Routing` + `docs/model-routing.md` |
| Edit | Re-baseline the registry for the Claude 5 generation (T1/T3 rows predate it — this run's Leader passed the checkpoint on the floor-not-ceiling rule); apply the registry's own Re-baseline rule (effort defaults re-swept per generation). |
| Severity | Low |
| Status | pending |

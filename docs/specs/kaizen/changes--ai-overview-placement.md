# Kaizen Entry — changes/ai-overview-placement

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/ai-overview-placement` |
| Date | 2026-08-23 |
| Branch | bilateral-visual-improvements |
| Archive Run | 1 |
| Approval Mode | gated |
| Branch Context | **spec branch** (`bilateral-visual-improvements` ≠ default) — pending items only; digest untouched |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (Lite) | tasks.md |
| Reviewer FAIL rework attempts | **1** (T-01 attempt 1: error alert deleted with the old card) | execution.md T-01 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — `/akili-test` / `test-report.md` absent | — |
| Judgment-day severe findings | n/a — Lite depth, no judgment round | — |
| Validation FAIL / WARN | n/a — `validation-report.md` absent; HITL accepted at archive | archive-summary.md §4 |
| Budget tripwire | review rounds **2 > 1** — tripped, not escalated | tasks.md header vs execution.md |
| `/akili-quick` escalations | 0 | quick-log.md |
| Drift attributable | **1** — untagged post-spec commit `04599a35` superseded D-AIP-5 / R-AIP-002 admin-gate clause | execution.md addendum 2026-08-23 |

## Lessons

- **KZ-changes--ai-overview-placement-1 — A "keep it identical to today" clause freezes today's defects; enumerate the preserved behavior's states before freezing it.** (Product, Medium)
  - Root cause: R-AIP-002 `AND IT MUST keep the admin bottom section's visibility condition semantically identical to today's admin branch` and D-AIP-5 were written from reading the existing computed, not from enumerating its states. The spec's four-cell matrix enumerated *summary × role* but the preserved gate also varied on *docs × loading × error*. Two of those un-enumerated states produced defects: the **error** state was dropped by the Implementer (Reviewer FAIL, T-01 attempt 1), and the **zero-docs admin** state — where the gate hid the only UI that uploads the first document — shipped as-specified and was patched post-spec by `04599a35`, which in turn had to rewrite the Cell-3 test that fenced the frozen gate.
  - Evidence: requirements.md R-AIP-002 (line "AND IT MUST keep … semantically identical"); design.md D-AIP-5; execution.md T-01 attempt 1 Reviewer verdict; execution.md "Addendum — Post-spec drift recorded at archive (2026-08-23)"; commit `04599a35`.
  - Standardization: → P1

## Noted, not a lesson

- Review-round budget (1) exceeded by one attempt without the "exceeding it escalates" step firing — the overrun was the lesson above's error state, not a second failure mode; below a new-ID bar.
- `04599a35` landed without the `[SPEC:…]` prefix. Traceability recovered at archive (execution.md addendum, archive-summary §9). Commit-tagging discipline is already a `CLAUDE.md` §4.3 rule; not a new lesson.
- `tasks.md`/`execution.md` Document Control rows still read `not-started`/`in-progress` at archive time while every task was `done` — fixed at archive. Bookkeeping, not a root cause.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` — the `AND IT MUST` / preservation-clause guidance |
| Edit | Add: *A preservation clause ("identical to today", "byte-for-byte", "as-is") MUST enumerate the states of the behavior it preserves — including its empty/bootstrap and error states — and each state MUST be reachable by its intended user. Freezing a gate freezes its defects: `ai-overview-placement` froze an admin gate whose zero-docs state hid the only upload entry point, and the fix had to break the spec's own fence (`04599a35`).* |
| Severity | Medium |
| Status | pending |

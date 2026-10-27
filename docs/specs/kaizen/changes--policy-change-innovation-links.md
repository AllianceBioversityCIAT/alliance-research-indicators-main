# Kaizen Entry — changes/policy-change-innovation-links

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/policy-change-innovation-links` |
| Date | 2026-10-20 |
| Branch | AC-1754-Activate-the-Innovation-development-and-innovation-use-selector-in-policy-change |
| Branch Context | **spec**. Neither root guide has a `Default Branch:` / `Integration Branch:` pin, so every proposed edit is recorded as pending, and nothing shared is written |
| Archive Run | 1 |
| Approval Mode | interactive (spec) + owner standing direction to continue task to task |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (3 planned, plus T-04 as owner-approved scope) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-02 ×1, T-04 ×1) | execution.md — T-02 attempt 1, T-04 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0. One execute-time spec amendment, corrected the same day (design §6) | execution.md — T-03 HITL follow-up 1 |
| PRODUCT_BUGs | n/a — no `test-report.md` | — |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | n/a — no `validation-report.md`. The human check passed | execution.md — T-03 human check |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0. The T-04 bug came from a Reviewer advisory before closure, not after a skipped review | execution.md — T-03 advisory 1 |
| Runtime events | 2 spawn failures (Cursor CLI logged out) | execution.md — T-01 |
| Budget | 7 review rounds against 4 planned; all overrun is owner scope | execution.md §3 |

## Lessons

- **KZ-changes--policy-change-innovation-links-1 — A client task's Verification line left out the spec type-check gate.** (Product, Medium)
  - Root cause: T-02's `Verification` field in `tasks.md` listed `jest`, `lint` and `build` only, and none of them type-checks `*.spec.ts`. The Leader copies the field into the brief, so the worker never ran the K-002 gate that the client child guide makes mandatory, and the first review failed on missing evidence. The rule lives only in the child guide (§255), and the place where verification is authored, `general-setup/task.md`, does not carry it.
  - Evidence: execution.md — T-02 attempt 1 (Violated Rule: `client/research-indicators/src/CLAUDE.md` "Test code is neither linted nor type-checked (K-002)"). T-03 and T-04 passed first time on this gate only because the Leader added it to their briefs by hand.
  - Standardization: → P1

## Noted, not a lesson

- **KZ-014 recurrence:** in T-04 attempt 1, a test comment asserted a race that the same diff had made unreachable. → P2 (`digest-update`)
- **KZ-007 recurrence:** the Leader wrote an execute-time spec amendment (design §6, the `'result-status': true` flag) from the v1 repository without tracing the client call to the endpoint version it actually hits (`v2/results`). The Implementer caught it before review, so there was no FAIL. → P3 (`digest-update`)
- **Jest SIGSEGV flake:** 4 of 4 first full client runs had 1–2 crashed suites with 0 failed tests, a different suite each time. Root cause: the `workerIdleMemoryLimit` mitigation is gone from `client/research-indicators/jest.config.ts`, which the owner's memory had already flagged on 2026-10-19. Infra, out of spec scope; it costs one re-run per measurement.
- **Cursor CLI logged out at first dispatch.** It showed up as Orca `dispatch_input` failed, twice, and was recovered with the owner's login. Host friction, not a product lesson.
- **The forced-state test pattern** (T-04): a defense-in-depth branch can only be shown red by forcing an unreachable state. That is legitimate if the comment says so. This feeds KZ-014's wording.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (the Verification field guidance) |
| Edit | A client task that adds or edits a `*.spec.ts` MUST list the K-002 gate in its Verification line: `npx tsc -p tsconfig.spec.json --noEmit` as a delta against HEAD (a throwaway `git worktree`, never `git stash`), because jest, lint and build never type-check spec files. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-014 (staging lineage) |
| Edit | Add source `changes/policy-change-innovation-links`; recurrence +1. A T-04 test comment claimed a product race that its own dedupe made unreachable, and the red it backed came from a forced state. Recurrence note: "a forced-state test is valid evidence only when its comment says the state is forced and unreachable." Severity stays High. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-007 (staging lineage) |
| Edit | Add source `changes/policy-change-innovation-links`; recurrence +1. An execute-time spec amendment was premised on the v1 repository's `result-status` join, but the client calls `v2/results` and drops boolean filters. Recurrence note: "verify an amendment's premise on the call path the client actually takes, not on the nearest matching repository method." |
| Severity | High |
| Status | pending |

# Kaizen Entry — changes/prms-pending-review-lock

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/prms-pending-review-lock` |
| Date | 2026-11-19 |
| Branch | fix/prevent-prms-resubmission-during-active-review (spec branch: default `main`, no pins) |
| Archive Run | 1 |
| Approval Mode | gated. Owner standing rule: continue task to task |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 of 5, each on attempt 1 | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 0 | execution.md |
| Budget tripwires | 2: test LOC after T-02 (about 1,062 against about 550); production LOC after T-03 (about 363 against about 300). The owner chose to continue both times | execution.md, *Budget tripwire stop* sections |
| Final size against budget | production about 529 / 300; tests about 1,800 / 550 (×3.3). The T-01 fixture alone is 399 lines | validation-report.md §3; `c3851a247` |
| PRODUCT_BUGs | 0 | — |
| Judgment-day severe findings | resolved before execution (APPROVED) | judgment.md |
| Validation FAIL / WARN | 0 / 5 (F-1 in code; F-3 to F-6 in documents). All fixed | validation-report.md §11 |
| Tasks closed under `REVIEW_WAIVED` / `REVIEW_SKIPPED` | 0 / 0 | execution.md |
| Escaped defects | 0. One HITL false alarm came from data (local-timezone `occurred_at`) | execution.md, T-05 HITL |

## Lessons

- **KZ-changes--prms-pending-review-lock-1: A disjunct inside a scenario's GIVEN was narrowed away by the design. Task review cannot catch that, because the task copies the design.** (Product + Methodology, Medium)
  - **Root cause.** S-19 reads *"GIVEN the push-status request fails **or times out**"*. Design §5.3 rewrote it as *"Read failure (not `successfulRequest`, or a throw)"*, which drops the timeout. T-04's scope copied the design, and the task Reviewer audited against that scope, so the gap passed every task gate. The KZ-016 design cross-check in `general-setup/design.md` names only `AND IT MUST` / `BUT it must NOT` clauses, and a disjunct in a GIVEN falls outside it. The gap was caught only by `/akili-validate`'s clause-level pass. It cost a remediation worker, a review and a design note.
  - **Evidence.** `requirements.md` S-19 (line ~202); `design.md` §5.3 item 4 (before the validation note); `tasks.md` T-04 scope ("Fail-open. A read failure (not `successfulRequest`, or a throw)…"); `validation-report.md` F-1.
  - **Standardization:** P1 (local), P2 (upstream).

## Noted, not a lesson

- **Recurrence, recorded as P3 rather than a new lesson.** The test-LOC budget again under-counted a real-MySQL fixture (399 lines against a 550-line test budget for the whole spec). This is the same root cause as KZ-bilateral--pool-funding-update-carryover-2, whose standardization P2 there (budget a real-DB fixture separately at about 300–450 LOC) is still `pending`. The miss recurred because that edit was never applied.
- **HITL false alarm from data.** A locally run server in a non-UTC timezone wrote STAR push `occurred_at` 5 h off into the shared Dev DB. The history card orders by `COALESCE(decided_at, occurred_at)`, so it showed REJECTED over a newer accepted push. A read-only DB check settled it in minutes. Pinning the mysql2 connection `timezone` (or writing UTC explicitly) would remove the class. Candidate for a product follow-up, not a lesson yet (1 occurrence).
- **Reviewer polish accepted on the evidence re-run alone.** The F-1 rework applied the Reviewer's own proposed shape (A2/A3), and the Leader accepted it on the evidence re-run without a second review. That is reasonable, but it is outside the written loop, so it is noted here.
- Known recurring infrastructure, outside this spec:
  - the TEST bootstrap breaks at `CreatePiDelegates1787600000000`;
  - the client jest runner flakes (a failed suite with zero failed tests, seen 3 times this run, each cleared by a re-run).
- OQ-1 (design §13): the correlator year skew stays open as a product follow-up spec. It is recorded in `archive-summary.md` §9, so it does not leave as a silent placeholder (see `changes--tip-prms-phase-2--prms-platform-identity` P2).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md`, KZ-016 cross-check block (before §2) |
| Edit | Change "(a) every `AND IT MUST` / `BUT it must NOT` clause in `requirements.md`" to "(a) every `AND IT MUST` / `BUT it must NOT` clause **and every disjunct (`or`) in a scenario's GIVEN/WHEN/THEN** in `requirements.md`. A design that names fewer cases than the scenario lists has narrowed it" |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | AKILI methodology: `/akili-specify` design cross-check, and the `/akili-execute` Reviewer brief |
| Edit | The Reviewer audits a task against the requirement scenario text it cites, not only against the task scope copied from the design. A design narrowing of a scenario disjunct is otherwise invisible until validation |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bilateral--pool-funding-update-carryover-2 (pending P2 in that entry file) |
| Edit | Add recurrence: "**Recurred 2026-11-19** (`changes/prms-pending-review-lock`): the T-01 real-MySQL fixture was 399 lines against a 550-line test budget for the whole spec, the tests ended at ×3.3, and two budget tripwires fired. The pending P2 standardization was never applied." Raise severity Medium → High |
| Severity | High |
| Status | pending |

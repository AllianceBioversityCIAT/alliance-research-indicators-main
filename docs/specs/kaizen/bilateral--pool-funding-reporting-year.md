# Kaizen Entry — bilateral/pool-funding-reporting-year

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/pool-funding-reporting-year` |
| Date | 2026-10-08 |
| Branch | pull-prms-result (spec branch: no `Default Branch:` / `Integration Branch:` pin; `main` is the resolved default) |
| Archive Run | 1 |
| Approval Mode | pre-approved (owner standing direction: continue until FATAL_FAIL) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 11 (9 planned + T-10/T-11 amendment) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-08 ×1 dead 409 matcher; T-09 ×1 missing rollout note) | execution.md — T-08, T-09 |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 1 pivot-lite (R-PRY-007 display-only, +2 tasks) + 1 execute-time amendment (§6 `hideSave`) | execution.md — "Pivot-lite record: R-PRY-007"; T-08 "Execute-time spec edit" |
| PRODUCT_BUGs | n/a (no `/akili-test`, no `test-report.md`) | — |
| Judgment-day severe findings | 4 confirmed in round 1, fixed before tasks | judgment.md |
| Validation FAIL / WARN | 0 / WARN (3 clause WARNs, 4 task WARNs, 2 doc violations) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 against `REVIEW_SKIPPED` tasks. 2 doc defects escaped T-09's PASS into validation: the wrong table name `result_prms_sync_history` in trd.md:308, and `display_only` missing from the TRD/UX docs | validation-report.md §7 Q-1/Q-2 |
| Budget tripwire | Fired after T-08. Final actuals: 11 tasks, +2831/−389 (~3.3× LOC), 14 verdicts vs 9 / ~850 / ~13 | design.md §0; execution.md "Budget tripwire" |
| Runtime events | 1 provider-limit death (Cursor quota); 1 idle-without-report (a claude-mem hook blocked a full-file Read) | execution.md — T-08 |

## Lessons

- **KZ-bilateral--pool-funding-reporting-year-1 — The error envelope's shape was not written anywhere a client author reads.** (Product, Medium)
  - **Root cause.** Several sources line up wrongly:
    - Root `CLAUDE.md` §4.1 says errors "use the same shape" as `ServerResponseDto`. It does not say that `GlobalExceptions` sets `description` to the exception *class name* (`"ConflictException"`) and puts the thrown `message` object (`{ description, code }`) into `errors`.
    - Design §5 specified "`isVersionLocked409` also matches `pool_funding_year_locked`" without naming where the code arrives on the wire.
  - **Effect.** The implementer matched on the top-level `description`, and the tests mocked a body shape the server never sends. The suite was green over a matcher that could never fire. Pre-existing matchers (`PRMS_SOURCED_409_DESCRIPTION`) are probably dead the same way.
  - **Evidence.** execution.md — T-08 attempt 1, Reviewer FAIL (Violated Rule: design.md §5 "409 on the client", §4 / design.md:131). validation-report.md §7 advisory, carried as F-6.
  - **Standardization:** → P1.
- **KZ-bilateral--pool-funding-reporting-year-2 — A time-scoped visibility rule was specified without probing a real historical record, so an unchanged gate hid the data the owner expected to see.** (Product + Methodology, High)
  - **Root cause.** `requirements.md` §1 declared the contract-eligibility rule "Not changing". Every fixture and scenario assumed an *eligible* past-year result. Nobody looked at a real snapshot before the HITL.
  - **Effect.** STAR-20081's 2025 snapshot holds an active ToC, but none of its contracts is primary or contributing (contracts stop contributing in past years). `eligible = false` hid it on every version, which the owner found only at the HITL. This forced a pivot (R-PRY-007, two extra tasks, ~+60% of the post-T-08 LOC).
  - **Evidence.** execution.md — "Pivot-lite record: R-PRY-007" (Dev SELECT table for result_id 34172/34283; owner quotes).
  - **Standardization:** → P2 (local) and P3 (upstream).

## Noted, not a lesson

- **Docs task ordering.** T-09 (docs) was executed before the R-PRY-007 amendment added T-10/T-11 and changed the public GET contract. The docs went stale and escaped T-09's PASS; validation caught it (Q-2). One occurrence. If an amendment lands after a docs task again, promote this: *an amendment that changes a public contract re-opens any already-closed docs task*.
- **Wrong table name escaped review.** The Reviewer checked envelope/paths/fields against code but not the persistence claim (trd.md:308). Single instance; it feeds KZ-014/KZ-017-style "a claim checked narrower than stated".
- **claude-mem hook vs headless worker.** A claude-mem hook blocks full-file `Read` on files with prior observations. A headless Grok/Cursor worker treated that as terminal and idled without a report. Mitigation used: briefs now say "read with offset/limit". Watch for recurrence.
- **Single-vendor implementer quota.** The Cursor/Grok quota ran out mid-run (provider-limit death at T-08). The re-route needed an owner decision. Not a methodology defect; operational.
- **e2e against the shared Dev DB.** The `pi-delegates` e2e writes to the shared Dev DB via `.env`, which was discovered during the T-09 e2e boot. Safety follow-up F-5; outside this spec.
- **LOC estimate vs tests.** LOC came in ~3.3× over budget, ~80% of it tests (per-row and falsifier cases plus realignment). This is the 2nd spec where the test share dominated the overrun (see `pool-funding-feature-toggles`); one more and it becomes a `general-setup/design.md` budget-rule lesson.
- **HITL attestation.** The HITL was a blanket approval, not per-item (KZ-002), and was accepted as a recorded exception by the owner.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `CLAUDE.md` §4.1 — the "HTTP envelope" bullet |
| Edit | Append: "On errors, `GlobalExceptions` sets `description` to the exception class name (e.g. `ConflictException`) and puts the thrown `message` payload — e.g. `{ description, code }` — in `errors`. A client that discriminates an error MUST read `errors.code`, never the top-level `description`; mock that real body in specs." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` — the requirement-scoping / "Not changing" guidance |
| Edit | Add: "Before declaring an existing gate 'Not changing' for a rule scoped by time (year, version, snapshot), query at least one real historical record that the rule targets and record which existing gates it passes or fails (date + query). A gate that hides real historical data is in scope." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-specify` requirements template: for a rule scoped by time (year / version / snapshot), require one real-data probe of a historical record, naming which pre-existing gates it passes, before any existing gate may be listed as "Not changing". |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-001 (`staging` lineage) |
| Edit | Recurrence +1 from `bilateral/pool-funding-reporting-year`: the component specs mocked the 409 body as `{ description: 'pool_funding_year_locked' }`, a shape `GlobalExceptions` never emits. The matcher was green over a dead path until the Reviewer traced the real envelope (T-08 attempt 1). Add this spec as a source. |
| Severity | Critical (unchanged) |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` §4.3 — the "CodeGraph" bullet |
| Edit | Append: "In Orca/git worktrees (e.g. `Heavy-DEV`) `.codegraph/` is absent — the index is per checkout — and on 2026-10-08 the `codegraph` CLI was not on `PATH` (MCP `ENOENT`). Probe both before relying on graph lookups; fall back to file reads." |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/trd/trd.md` and `docs/ux-ui/design.md`: every citation of `docs/specs/bilateral/pool-funding-reporting-year` |
| Edit | Repoint to `docs/specs/archive/2026-10-08-bilateral--pool-funding-reporting-year/` (KZ-013: archiving silently breaks the documents that cite the spec path). The code `@akili-spec` tags stay as-is: they are logical spec IDs, per repo convention. |
| Severity | Low |
| Status | pending |

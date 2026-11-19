# Archive Summary — PRMS / Pending-review lock

> **Delivered.** STAR no longer re-pushes a year that PRMS is reviewing or has approved:
> - the server gate refuses the push with a 409 and writes no log row;
> - the version selector warns before an update;
> - the sidebar disables PRMS SYNC while PRMS holds the year.
>
> Validation **PASS** (after remediation). Owner HITL on Dev approved. Unpushed.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `changes/prms-pending-review-lock` (spec id `2026-11-prms-pending-review-lock`) |
| Branch | `fix/prevent-prms-resubmission-during-active-review` (spec branch; nothing pushed) |
| Commits | `c3851a247` T-01 · `95c9c89dc` T-02 · `d562c1f7e` T-03 · `1d4e5e7d3` T-04/T-05 · `f0aa46df0` HITL docs · `d3c01448e` F-1 timeout + validation |

## 2. Original Spec Path

`docs/specs/changes/prms-pending-review-lock/`

## 3. Archive Date

2026-11-19

## 4. Final Status

Done: 5 of 5 tasks, each passing on attempt 1. Validation: PASS. Every WARN is resolved.

## 5. Requirements Delivered

| Requirement | What shipped |
| --- | --- |
| R-PRL-001 | A pure rule `derivePrmsPushStatus` reads the push status per year from `result_prms_sync_history`. Events are ordered by `id`, a decision's year is the callback `phase_year`, and imported rows never outrank real ones |
| R-PRL-002 | Gate entry `prms_resubmittable`. It returns 409 with the PRMS status in the description, makes no Normalizer call, writes no log row, applies to every role and to TIP, and fails closed |
| R-PRL-003 | `GET …/prms-sync?pushYear=` returns `push_status {year, status, resubmittable}`. An invalid `pushYear` returns 400 |
| R-PRL-004 | Version selector. It checks the status of the chosen year first. A held year gets a warning with *Cancel* / *Update anyway*. A failed read or a 10 s timeout fails open. The busy state is guarded |
| R-PRL-005 | Sidebar. PRMS SYNC is disabled while held, with a Pending or Approved tooltip in the designed precedence. After the gate's 409 the sidebar shows its reason and re-reads the status |
| NFR-PRL-001…004 | At most one GET per update. The global alert is reused. The client cannot override the gate. There is one rule, on the server |

## 6. Files Changed Summary

| Area | Files |
| --- | --- |
| Server | `result-prms-sync/`: `eligibility/prms-push-status.ts`, `prms-push-status.reader.ts`, `eligibility/sync-gate.ts`, `repositories/result-prms-sync-log.repository.ts`, `result-prms-sync.service.ts`, `result-prms-sync.controller.ts`, `result-prms-sync-status.reader.ts`, `dto/prms-sync.dto.ts`, `result-prms-sync.module.ts` (each with specs). Also `test/fixtures/prms-push-status.fixture-spec.ts`, and constructor-only edits to 3 integration specs and the TIP service spec |
| Client | the new `prms-push-status.interface.ts`, `api.service.ts` (`GET_PrmsPushStatus`), `version-selector.component.{ts,html}`, `result-sidebar.component.{ts,html}` (each with specs) |
| Size | about 529 production LOC against about 300 planned, and about 1,800 test LOC against about 550 planned. The owner approved both overruns at two budget tripwires |
| Schema | none (no migration) |

## 7. Test Evidence Summary

- Red-first runs and falsifiers were observed for every task and for F-1.
- Unit suites at validation: server 4815 of 4815, client 8930 of 8930. One client suite failed with zero failed tests (runner flake) and passed on re-run.
- The SQL fixture on real MySQL passed 7 of 7.
- The owner's HITL on Dev covered steps 1–4.
- There is no `test-report.md`. Validation verified coverage directly, and its absence is accepted.

## 8. Validation Summary

The first pass was **PASS with WARN**: 0 FAIL and 5 WARN. F-1 was the S-19 timeout, fixed in code. F-3 to F-6 were document drift, fixed. Final verdict: **PASS**. See `validation-report.md`.

## 9. Accepted Warnings Or Follow-Ups

| Item | Note |
| --- | --- |
| OQ-1 (design §13) | The correlator still stores the live row's year on PRMS decision rows, and other readers (the history modal, the monitor) inherit that skew. A follow-up spec is owed |
| A-2 | No test covers the `correlation_outcome = 'CORRELATED'` predicate |
| A-11 / A-12 | The *Update result* `<span>` cannot be reached by keyboard, and the tooltip sits on a disabled button. Both predate this spec |
| A-15 | The sidebar sends one extra GET per result view, including for users who are not the owner |
| A-9 | The TEST bootstrap breaks at `CreatePiDelegates1787600000000`, so the claim-concurrency integration test gives no evidence. This predates the spec |
| Path citation | The header comment of `server/researchindicators/test/fixtures/prms-push-status.fixture-spec.ts:8` cites `docs/specs/changes/prms-pending-review-lock`. Repointing it to this archive path is a one-line comment edit, left for the next worker that touches the file |
| Sign-off | The requirements sign-off checkboxes are the owner's to tick |

## 10. Historical Notes

- PRMS keeps one result code per result across years, so `prms_result_code` cannot separate years. A decision's year is `raw_body.data.obj_version.phase_year`.
- **HITL false alarm.** The sidebar card showed REJECTED while the gate said pending. The cause was the owner's local server writing `occurred_at` 5 h off in the shared Dev DB. The owner fixed the data. The rule orders by `id`, so timestamps cannot affect it.
- There are two execute-time design amendments, §5.1.1 and §4 POST. A third note, the 10 s bound in §5.3, was added at validation.

## 11. Diagrams

The spec has no `diagrams/` folder and made no baseline diagram slot stale.

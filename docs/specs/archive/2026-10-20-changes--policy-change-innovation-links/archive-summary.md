# Archive Summary — Policy Change / Innovation links (AC-1754)

> **Outcome:** delivered. The two "Link to a reported …" pickers on *Policy Change details* are enabled. Each lists only its own result type (Innovation Development / Innovation Use) and leaves out Not approved and Deleted results. Each row shows the result code in bold, the title, and a status tag. The server rejects a link to the wrong result type with `400`. The owner passed the human visual check.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `changes/policy-change-innovation-links` |
| Ticket / branch | AC-1754 · `AC-1754-Activate-the-Innovation-development-and-innovation-use-selector-in-policy-change` |
| Owner | d.casanas@cgiar.org |
| Archived by | `/akili-archive` (Claude Opus 5.5), spec-branch mode: no shared files written |
| Archive commit | **none.** The owner asked to review and commit the archive on return |

## 2. Original Spec Path

`docs/specs/changes/policy-change-innovation-links/`

## 3. Archive Date

2026-10-20

## 4. Final Status

**DONE.** 5 of 5 tasks are `[x]`, each closed by a Reviewer PASS, and T-03 also passed the human check. All five commits are local and not pushed:

| Task | Commit | Attempts |
| --- | --- | --- |
| T-01 Server wrong-type guard (`400`) | `87f64af58` | 1 |
| T-02 Client linkable-results service | `12ac4d7b6` | 2 |
| T-03 Pickers wired, plus the owner's design follow-up (bold code, status tag) | `5c4e6fa13` | 1, plus 1 follow-up |
| T-04 One in-flight request per indicator; error cleared on success (owner-approved) | `344e6eef2` | 2 |
| T-05 Scroll jump + panel width (owner report after archive; app-select `virtualScroll` / `panelStyleClass` inputs) | `713840d82` | 2 (attempt 1 failed the human check) |

## 5. Requirements Delivered

| Requirement | Delivered by |
| --- | --- |
| R-PCIL-001 / 002 — per-type list, statuses 7 and 8 excluded, code + title label and search | T-02, T-03 |
| R-PCIL-003 — picker states from design §5.1, each picker independent | T-02, T-03, T-04 |
| R-PCIL-004 — round trip and clear-one | T-01 (server payload), T-03 (binding, human check) |
| R-PCIL-005 — `400` for a wrong type, nothing written | T-01 |
| NFR-PCIL-001 — no new endpoint or parameter | T-02 (request is exactly `{'indicator-codes': [id]}`) |
| NFR-PCIL-002 — tokens, `&nbsp;` removed, columns aligned | T-03 (+ human check) |
| Design §6 owner amendment — bold code and status tag in option rows | T-03 follow-up |

## 6. Files Changed Summary

| Package | Files |
| --- | --- |
| server | `result-policy-change.service.ts` (+ spec) |
| client | `select.component.{ts,html}` (+ spec; new `virtualScroll` / `panelStyleClass` inputs, defaults unchanged) · `custom-prime-force-styles.scss` · `get-policy-change-linkable-results.service.ts` (new, + spec) · `service-locator.service.ts` (+ spec) · `services.interface.ts` · `result.interface.ts` · `policy-change.component.{html,ts,spec.ts}` |

No migration, no new endpoint.

## 7. Test Evidence Summary

There is no `test-report.md`. `/akili-test` was not run, and the owner accepted that by asking for the archive. The evidence lives in `execution.md`:
- Every task has falsifiers that were seen to go red and were quoted.
- Every client task passed the K-002 spec tsc delta gate.
- The Leader re-ran each task's gates as a non-author.
- The full suites were green when the Leader re-ran them.

Every full client run needed one re-run because of the jest worker SIGSEGV flake. The flake had 0 failed tests and hit a different suite each time.

## 8. Validation Summary

There is no `validation-report.md`. `/akili-validate` was not run, and the owner accepted that. The owner's human visual check stood in for UI validation: light and dark themes, alignment, the per-type lists, round trip, clear-one, and read-only. The owner's words were *"ya quedó"*.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Source |
| --- | --- | --- |
| 1 | A saved link whose target later becomes status 7 or 8 shows the placeholder. The data is kept, only not shown | design §13, accepted |
| 2 | T-01 advisories: `String()` id normalisation; the `0` vs truthiness edge; a test-mock implementation that leaks between tests | execution.md T-01 |
| 3 | Assertions that could be stronger: "no tag on the closed value" is not checked in the read-only tests; the service-spec assertion is slightly weaker than `toHaveBeenCalledWith` | execution.md T-03 follow-up |
| 4 | Budget overrun: 4 tasks and 7 review rounds, against a plan of 3 and 4. All of it is owner-requested scope | execution.md §3 |
| 5 | The jest `workerIdleMemoryLimit` mitigation is still missing from `client/research-indicators/jest.config.ts`, so the SIGSEGV flake hit every first full run | execution.md T-02…T-04 |

## 10. Historical Notes

- **The owner's design ruling at the human check** added the bold code and the status tag (design §6).
- **A wrong premise in that amendment was caught and corrected the same day** (KZ-007 note in design §6). Its first version told the service to send `'result-status': true`, based on the v1 repository. `GET_Results` calls `v2/results`, which always returns the status name, and the client never sends that boolean. The Implementer caught it, and the Leader verified it before correcting the design.
- **T-04 is owner-approved scope beyond the plan.** It came from a T-03 Reviewer advisory, which is the only sanctioned route from an advisory to new work.
- **Two runtime events at the start:** the Cursor CLI was logged out, which caused 2 spawn failures, and both were recovered.

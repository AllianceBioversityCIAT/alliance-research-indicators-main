# Archive Summary — Results Center / External Results Readonly View

## Outcome: delivered and validated (PASS, 0 FAIL). One follow-up is genuinely open — T-11's browser-only verification.

External (TIP / PRMS / AICCRA) results now open STAR's full 12-tab section shell, fully read-only, instead of a ~9-field modal — from Results Center, `search-a-result`, and Home alike. Read-only is enforced on the client **and** at three server mutation endpoints.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/results-center/external-results-readonly-view` |
| Archive path | `docs/specs/archive/2026-07-28-results-center--external-results-readonly-view` |
| Archive date | 2026-07-28 |
| Spec id | 2026-07-external-results-readonly-view |
| Requested by | David Felipe Casañas Hernández |
| Source | Jira user story (pasted directly; no ticket key supplied) |
| Final status | **Implemented + tested + validated.** Validation: PASS, 0 FAIL, 4 WARN. |
| Phases run | propose → specify → judgment-day → execute → test → validate → archive |

---

## 2. Final Status

| Phase | Result |
| --- | --- |
| Judgment Day (design review) | 2 blind judges; converged on `NEEDS CORRECTION`; 3 SEVERE findings, all corrected before execution |
| Execute | 16 of 17 tasks done. 1 HALT (T-04, recovered on a 4th attempt), 8 Reviewer FAIL/rework cycles |
| Test | 3 suites, 3 Testers in parallel, all PASS. Client 307 suites / **6316 tests**; server 321 / **2047**. 0 `PRODUCT_BUG` |
| Validate | **PASS**, 0 FAIL, 4 WARN (author ≠ auditor: `sonnet` implemented, `opus` audited) |

---

## 3. Requirements Delivered

14 functional + 3 non-functional. All have code and test evidence.

| ID | Requirement | Added when |
| --- | --- | --- |
| R-RC-001 | External results navigate into the section shell (6 entry points) | original |
| R-RC-002 | `isExternalResult` signal is the single source of truth | original |
| R-RC-003 / 004 | OICR authors-contact table + admin-only fields read-only | original |
| R-RC-005 | Pool Funding Alignment read-only (client + server TIP/AICCRA gate) | original |
| R-RC-006 | "Request to add" CLARISA links gated | original |
| R-RC-007 | Status-changing sidebar actions hidden | original |
| R-RC-008 / 009 / 010 | Header: synced date, public link, platform deep link | original |
| R-RC-011 | Metadata endpoint returns the 4 fields the header needs | original |
| **R-RC-012** | Submit-status endpoint rejects external results | **added by Judgment Day F-2** |
| **R-RC-013** | Home "My Latest Results" cards route to the shell | **added after T-10 surfaced a scope gap** |
| **R-RC-014** | Shared shell + shared field components respect read-only | **added after T-11's sweep failed** |
| NFR-RC-001 | All 3 server-side mutation guards closed | narrowed then fully closed |
| NFR-RC-002 / 003 | Performance (code-review) / a11y (structural) | original |

**Three requirements did not exist when the spec was approved.** Each came from evidence, not opinion — recorded in §7.

---

## 4. Files Changed

~25 files across both packages. No migration, no new column, no new module.

| Area | Files |
| --- | --- |
| **Client — entry points** | `results-center-table.component.{ts,html,spec}`, `my-latest-results.component.{ts,html,spec}` |
| **Client — shared state** | `cache.service.ts` (+spec), `submission.service.ts` (+spec), `bilateral.service.ts` (+spec), `get-metadata.interface.ts` |
| **Client — shell** | `form-header.component.{ts,html,spec}`, `result-sidebar.component.{ts,html,spec}`, `section-header.component.{ts,spec}`, `submission-history-item.component.{ts,spec}` |
| **Client — tabs** | `oicr-details.*`, `authors-contact-persons-table.*`, `quantification-item.*`, `oicr-form-fields.*`, `innovation-details.html`, `capacity-sharing.ts`, `partners.ts`, `organization-item.ts` (+specs) |
| **Client — test doubles** | `mock-services.mock.ts` + 3 tab specs (T-16 regression repair) |
| **Server** | `results.service.ts`, `metadata-result.dto.ts` (+ new spec), `result-status-workflow.{service,controller}.ts` (+spec), `bilateral.{service,controller}.ts` (+spec), `result-users.controller.ts` (+spec) |
| **Constitution** | `docs/ux-ui/design.md` — corrected a stale flow description + added a decisions-log entry |

16 commits, all prefixed `[SPEC:results-center/external-results-readonly-view]`.

---

## 5. Test Evidence

See `test-report.md`. Client **6316/6316**, server **2047/2047**, lint clean in both — totals independently re-run by the Leader rather than taken from Tester reports.

`/akili-test` found **four ACs that looked covered but were not**, each closed and mutation-verified:

| AC | What was actually missing |
| --- | --- |
| R-RC-011 AC.2 | Zero coverage — nothing asserted the `@ApiProperty` metadata existed |
| R-RC-012 AC.3 | Type-only assertion; the message (which must not collide with a locked client-matched 409 string) was unproven |
| R-RC-001 AC.1 | The **entire** `results-center-table` suite runs under `template: ''`, so no test exercised the real `[routerLink]` |
| `clearOicrSelection()` | Method-level guard untested; only the template guard was proven |

---

## 6. Validation Summary

**PASS, 0 FAIL.** See `validation-report.md`. Negative constraints (`BUT it must NOT`) and strict validations (`AND IT MUST`) are explicitly tested — two of them more strongly than the ACs require: `DELETE_Result` and `PATCH_StatusChangeDate` are proven unreachable **even when their handlers are invoked programmatically**, not merely hidden in the UI.

---

## 7. Accepted Warnings & Follow-Ups

| # | Item | Disposition |
| --- | --- | --- |
| 1 | **T-11's 3 interactive ACs** — header render/degradation, year-badge navigation in the real DOM, STAR visual baseline | **OPEN — tracked, not done.** Blocked on environment, not effort. T-04 and T-14 are direct evidence that green unit tests are insufficient here: both had passing suites over broken DOM behavior. |
| 2 | NFR-RC-003 full a11y (focus order, AT announcement, contrast) | Open — fold into the same manual pass as #1 |
| 3 | Client production build not exercisable locally | Accepted — proven unrelated (both env files are gitignored and lack two properties required by the branch's *other* AC-1672 work; this spec touched none of the erroring files) |
| 4 | `docs/infrastructure.md` has no `## Local Environment` contract | Open — recommend `/akili-constitution` Step 6B. This is what made #1 unresolvable. |
| 5 | AICCRA absent from the client result-interceptor's platform alternation → 400 instead of 409 on one endpoint | Open, pre-existing. Mutation is blocked either way |
| 6 | `multiselect-opensearch` has no `disabled` input at all | Open, currently unused — a trap for its first consumer |
| 7 | `version-selector.updateResult()` lacks the method-level second layer | Open — correctly gated at the template; consistency only |
| 8 | Invalid TS in two spec files (ts-jest error-recovers) | Open, pre-existing |

---

## 8. Historical Notes — how the scope actually moved

The delivered spec is materially larger than the approved proposal, and every increase came from evidence:

1. **Judgment Day** (before any code) caught that the proposal's claim "no server-side platform check exists on three endpoints" was wrong for one (PRMS was already gated) and dangerously incomplete for another: the submit-status endpoint's `Result.update()` silently bumps `updated_at` — the very column this spec repurposes as the sync date. A deferred "optional" item became blocking (R-RC-012).
2. **T-10** was written as a verification task and passed on its facts — but the verification exposed that decision D-3 had answered the wrong question ("does Home have the same *bug*?" → no) instead of the right one ("should Home also route to the shell?" → yes). → R-RC-013.
3. **T-11 failed.** Its exhaustive sweep found 5 ungated controls in files the spec's scope never enumerated — including a **Delete Result** action available to any admin on a federated record. → R-RC-014, and the highest-value finding of the whole spec.
4. **T-16** repaired a regression this spec caused: T-05 changed `FormHeaderComponent`, which all 12 tabs render, and that batch was verified with targeted suites only. 219 tests across 5 suites broke unnoticed.

**T-04 is worth remembering:** it HALTed after 3 attempts on a cascading click-interception bug (year badges → "+N more" toggle → popover panel), where each fix exposed the next layer. The recovery came from a structurally different fix — tagging the cell *wrapper* rather than individual leaves.

**Reviewer self-correction:** during T-15 the Reviewer reversed its own earlier remediation after being asked to verify rather than carry it forward — it had asserted that disabling an `app-select` closed a projected clear icon; reading the shipped template showed `#rows` renders outside the disabled element.

# Requirements — Results / CapDev Email Status Filter

- **Module:** results
- **Spec id:** 2026-08-capdev-email-status-filter
- **Status:** approved (Phase 3 complete — ready for execute)
- **Owner:** ARI squad / product
- **Linked PRD section:** `docs/prd.md` §3.3 Center / General Admin (capacity-sharing bulk upload); Results lifecycle
- **Linked tickets:** Follow-up on **AC-1607**
- **Last updated:** 2026-08-26
- **Depth:** Standard
- **Extends:** `docs/specs/archive/2026-08-11-results--capdev-bulk-upload-notification/` (R-CBU-*)
- **Proposal:** `docs/specs/changes/capdev-email-status-filter/proposal.md`
- **Approval Mode:** gated (inherited)
- **Worktree:** `/Users/pelitos/Documents/CIAT/alliance-research-indicators-ac1607-capdev-email`
- **Execution models:** Cursor-hosted only (no Claude workers)

---

## 1. Executive Summary

CapDev bulk completion emails and CapDev persisted metrics MUST count only results whose **live** status is **Submitted** or **Approved**. Drafts — including rows requested as Submitted/Approved that failed internal completeness validation — MUST NOT appear in the email or inflate CapDev metrics.

`total_results` on the process row remains “all successfully created results in the batch” (any indicator, any status). CapDev-scoped columns and the email share one stricter eligibility set.

---

## 2. Glossary

| Term | Meaning in this spec |
| --- | --- |
| **Created result** | Unchanged from R-CBU: `bulk_upload_results` row with `result_id IS NOT NULL` and `error_message IS NULL`. |
| **CapDev result** | Created result with CapDev indicator (`CAPACITY_SHARING_FOR_DEVELOPMENT`). |
| **Eligible CapDev result** | CapDev result whose linked `results.result_status_id` is **Submitted** or **Approved**. |
| **Ineligible CapDev result** | CapDev result in any other status (including **Draft**), even if the AI payload requested Submitted/Approved. |
| **Requested status** | Payload / `suggested_status` — intent only; never the eligibility source. |
| **Final live status** | `results.result_status_id` after formalize + `customStatus` — the eligibility source. |
| **Project group** | As in R-CBU-002, but built only from **eligible** CapDev results. |

> **KZ-007:** When correcting R-CBU wording that said “created CapDev feeds the notification,” treat that as superseded for the notification stage — do not leave dual definitions that disagree.

---

## 3. System Context & Scope

```
createResultFromAiBulk → persist batch → CapdevBulkNotificationService.dispatch
                                              │
                    reads eligible CapDev only ┤ (status filter)
                                              ▼
                         groups / CapDev metrics / email / CapDev columns on process
```

**In scope:** Server CapDev notification stage — eligibility for groups, email metrics, CapDev persisted metrics, and notification-stage unattributed CapDev warnings.

**Out of scope:** STAR client; changing green-check / `customStatus` rules; AI payload shape; HTTP envelope of `formalize/bulk`; non-CapDev indicators; other lifecycle emails; fixing `bulk_upload_results.final_status` skew (except by not using it for eligibility).

**Surface (KZ-002):** No UI. Observable surfaces = email body metrics, `MessageMicroservice.sendEmail` call count, CapDev columns on `bulk_upload_processes`, notification logs for unattributed eligible rows.

---

## 4. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| Project Leader (PI) | Email reflects only Submitted/Approved trainings. |
| RA / PA / file contacts / SPRM | Same truthful CC content. |
| Center Admin / MEL (token owner) | Drafts still exist in STAR; not advertised as recorded-complete in this email. |
| Dashboard consumer of CapDev process metrics | CapDev columns match the email eligibility set. |
| ARI maintainer | Filter must not break bulk upload success path. |

---

## 5. Functional Requirements

### R-CESF-001 — Eligible CapDev definition

- **As a** Project Leader
- **I want** the system to treat only Submitted/Approved CapDev rows as notification-eligible
- **So that** incomplete Drafts are not reported as completed trainings

**Details:**

- Behavior: A CapDev result is **eligible** iff it is created **and** its `results.result_status_id` is Submitted or Approved.
- Eligibility MUST NOT use `suggested_status`, payload `status`, or `bulk_upload_results.final_status` alone.
- Ineligible CapDev results remain persisted in STAR and in `bulk_upload_results`; they are simply excluded from the notification stage.

**Acceptance criteria:**

- [ ] AC.1 — A CapDev result with live status Draft is not eligible.
- [ ] AC.2 — A CapDev result with live status Submitted is eligible.
- [ ] AC.3 — A CapDev result with live status Approved is eligible.
- [ ] AC.4 — A CapDev result whose payload requested Approved/Submitted but whose live status is Draft (failed completeness) is not eligible.
- [ ] AC.5 — Eligibility is determined from the live result status, not from requested status alone.

**Scenario: Requested Approved, stays Draft**

- GIVEN a bulk row with requested status Approved
- AND formalize creates the result but completeness validation fails
- AND the live `result_status_id` remains Draft
- WHEN the CapDev notification stage runs
- THEN that result is not eligible
- BUT it must NOT be deleted or rolled back solely for being ineligible
- AND IT MUST remain a created CapDev row in the batch metadata

**Out of scope:** Changing when `customStatus` promotes a result.

---

### R-CESF-002 — Email groups and metrics use only eligible CapDev

- **As a** Project Leader
- **I want** my completion email to list metrics only for eligible CapDev results
- **So that** Draft trainings do not appear in trainings/participants/countries figures

**Details:**

- Behavior: Project groups (R-CBU-002), per-group CapDev metrics (R-CBU-006), and the Handlebars metrics sentence MUST be computed only over eligible CapDev results.
- A CapDev result without a primary contract is excluded from groups as today, but only **eligible** such rows enter the notification-stage unattributed warning (OQ2 resolved).

**Acceptance criteria:**

- [ ] AC.1 — Given a group with 3 Approved and 2 Draft CapDev results, trainings count = 3.
- [ ] AC.2 — Participant / female / date-range / country aggregates for a group ignore ineligible CapDev rows.
- [ ] AC.3 — An ineligible CapDev result never contributes to another project’s email metrics.
- [ ] AC.4 — Unattributed notification warnings name only eligible CapDev result ids (Drafts without primary contract are not listed there).

**Scenario: Mixed statuses in one contract**

- GIVEN one primary contract with 2 Submitted and 3 Draft CapDev results in the same batch
- WHEN the group email is rendered
- THEN trainings count is 2
- AND participant/country clauses reflect only those 2
- BUT it must NOT include any of the 3 Drafts in CapDev email metrics
- AND IT MUST still send exactly one email for that group if recipients resolve

---

### R-CESF-003 — Zero eligible CapDev → no email

- **As a** ARI maintainer
- **I want** no CapDev completion email when nothing is eligible
- **So that** PIs are not notified for Draft-only batches

**Details:**

- Behavior: If the batch has zero eligible CapDev results (including “created CapDev exist but all Draft”), `sendEmail` is never called for CapDev completion.
- Bulk upload HTTP success is unchanged.
- Extends R-CBU-001’s “zero created CapDev → no email” to “zero **eligible** CapDev → no email”.

**Acceptance criteria:**

- [ ] AC.1 — Batch with only Draft CapDev created results → zero `sendEmail` calls from CapDev notification.
- [ ] AC.2 — Batch with ≥1 eligible CapDev result → existing per-group send rules still apply for groups that have ≥1 eligible row.
- [ ] AC.3 — Endpoint still returns success for the bulk upload when CapDev notification skips for zero eligible.

**Scenario: Draft-only CapDev batch**

- GIVEN a successful bulk upload that created CapDev results all in Draft
- WHEN notification dispatch runs
- THEN no CapDev completion `sendEmail` is invoked
- AND the bulk response remains successful
- BUT it must NOT fail the HTTP call because of the skip
- AND IT MUST record notification outcome consistent with a skip (see R-CESF-004)

---

### R-CESF-004 — Persisted CapDev metrics match eligibility (decision B)

- **As a** dashboard consumer
- **I want** CapDev columns on `bulk_upload_processes` to use the same eligible set as the email
- **So that** stored metrics never disagree with what was emailed

**Details:**

- CapDev-scoped persisted fields (at minimum: `total_capdev_results`, `total_participants`, `total_female_participants`, activity date range, `countries`) MUST be derived from **eligible, attributed** CapDev results — the same per-group aggregates that feed the email (inherits archived OD-3 / R-CBU-008 AC.1: CapDev columns = sum of per-group training counts, not a batch-wide count of every eligible row). Eligible CapDev without a primary contract is excluded from CapDev metric columns and from email groups but MAY appear in the unattributed warning log.
- **`total_results`:** SHALL remain the count of **all created results** in the batch (any indicator; not status-filtered). (OQ1 resolved: option a.)
- When zero eligible CapDev results: CapDev metric columns reflect empty/zero CapDev aggregates; `notification_status = SKIPPED` and `notification_sent_at` null when no CapDev completion email is dispatched for that reason (aligned with R-CBU-008 skip semantics).

**Acceptance criteria:**

- [ ] AC.1 — After dispatch, CapDev metric columns equal aggregates computed from eligible **attributed** CapDev (per-group spine outputs), not from every eligible row including unattributed.
- [ ] AC.2 — Draft CapDev rows do not increase `total_capdev_results` or CapDev participant/country aggregates.
- [ ] AC.3 — `total_results` still counts every created row in the batch, including Draft CapDev and non-CapDev.
- [ ] AC.4 — Zero eligible CapDev → CapDev metric columns are zero/empty as applicable; `notification_status = SKIPPED`; `notification_sent_at` is null.
- [ ] AC.5 — Flag-off behavior from R-CBU-009 still persists CapDev metrics (now eligibility-filtered) and records `SKIPPED` without sending.

**Scenario: Persisted metrics exclude Drafts**

- GIVEN a batch with 4 created CapDev (2 Approved, 2 Draft) and 1 created non-CapDev Draft
- WHEN metrics are persisted
- THEN `total_capdev_results` = 2
- AND `total_results` = 5
- BUT it must NOT set `total_capdev_results` to 4
- AND IT MUST keep email CapDev totals equal to the persisted CapDev totals

**Scenario: Eligible but unattributed only**

- GIVEN a batch with 2 Submitted CapDev results and no active primary contract on either
- WHEN notification dispatch runs
- THEN `findGroups` yields zero groups
- AND `total_capdev_results` = 0
- AND no CapDev completion `sendEmail` is invoked
- AND unattributed warning lists both eligible `result_id`s
- BUT it must NOT count those rows in CapDev metric columns or open an email group
- AND IT MUST record `notification_status = SKIPPED`

---

### R-CESF-005 — Negative constraints (status source)

- **As a** ARI maintainer
- **I want** eligibility never driven by requested status alone
- **So that** failed validations cannot be reported as Submitted/Approved in the email

**Acceptance criteria:**

- [ ] AC.1 — Filtering by `suggested_status` / payload status alone is forbidden for eligibility.
- [ ] AC.2 — Filtering by `bulk_upload_results.final_status` alone is forbidden while it can disagree with live `results.result_status_id` for Submitted (known skew).
- [ ] AC.3 — Eligible statuses are exactly Submitted and Approved (no Revised, Rejected, Editing, etc.).

**Scenario: final_status skew must not drop Submitted**

- GIVEN a CapDev result whose live status is Submitted
- AND `bulk_upload_results.final_status` is Draft (metadata skew)
- WHEN eligibility is evaluated
- THEN the result is eligible
- BUT it must NOT be excluded because `final_status` is Draft
- AND IT MUST still appear in CapDev email metrics for its group

---

## 6. Non-Functional Requirements

### NFR-CESF-001 — Query shape preserved

- **Category:** performance
- **Target:** Eligibility filter MUST NOT change CapDev notification from O(groups) query count to O(results) application-side filtering (inherits NFR-CBU-001 intent).
- **How verified:** Design + repository tests / review of shared spine; no per-result status round-trips in the service loop.

### NFR-CESF-002 — Bulk upload isolation

- **Category:** reliability
- **Target:** Eligibility filtering MUST NOT cause `formalize/bulk` to fail or roll back when CapDev notification skips or filters.
- **How verified:** Existing outer try/catch around dispatch remains; unit/integration cases with Draft-only batches return success.

### NFR-CESF-003 — Observability of eligibility

- **Category:** observability
- **Target:** Existing CapDev notification logs remain useful; unattributed warnings only list eligible ids (R-CESF-002 AC.4). No requirement for a new log line listing every excluded Draft (MAY add debug later).
- **How verified:** Spec/service tests for unattributed path; log assertion only where already required.

---

## 7. Defect classes → gates

| Defect class | Gate |
| --- | --- |
| Draft counted in CapDev email/metrics | Repository/service unit tests with mixed-status fixtures (discriminating fields — KZ-004) |
| Submitted wrongly excluded via `final_status` skew | Fixture: live Submitted + metadata Draft → included |
| Requested status used instead of live status | Test/assert eligibility predicate uses live status; code review against R-CESF-005 |
| Email CapDev totals ≠ persisted CapDev totals | Service test: same aggregate input for persist + template |
| `total_results` accidentally status-filtered | Explicit assertion `total_results` includes Draft created rows |
| O(n) post-filter regression | Design review + no service-layer status filter over full result lists |
| Bulk HTTP fails on Draft-only skip | Test/assert dispatch skip does not throw to caller |

**Blind spot (accepted):** End-to-end mailer delivery / real PI inbox content — out of scope (fire-and-forget mailer); covered only to `sendEmail` invocation + template field inputs.

---

## 8. Data / API

- **Entities:** no new columns required. Reads `results.result_status_id` for eligibility; writes existing CapDev metric / notification columns on `bulk_upload_processes`.
- **Migrations:** none expected.
- **API:** no contract change to `POST .../ai/formalize/bulk`.

---

## 9. Assumptions, Dependencies, Risks

| Item | Note |
| --- | --- |
| Assumption A1 | OQ1 → `total_results` stays unfiltered by status. |
| Assumption A2 | OQ2 → unattributed CapDev warnings only for eligible rows. |
| Dependency | AC-1607 CapDev notification already on target branch/worktree. |
| Risk R1 | `final_status` skew — mitigated by R-CESF-005 (live status). |
| Risk R2 | Archived R-CBU text still says “created CapDev” — this spec **modifies** that for the notification stage; implementers must follow **this** spec for eligibility. |

---

## 10. Open Questions

| ID | Question | Owner | Target |
| --- | --- | --- | --- |
| — | None blocking Phase 2. OQ1/OQ2 resolved in R-CESF-002/004. | — | — |

---

## 11. Requirement ID Index

| ID | Title |
| --- | --- |
| R-CESF-001 | Eligible CapDev definition |
| R-CESF-002 | Email groups and metrics use only eligible CapDev |
| R-CESF-003 | Zero eligible CapDev → no email |
| R-CESF-004 | Persisted CapDev metrics match eligibility |
| R-CESF-005 | Negative constraints (status source) |
| NFR-CESF-001 | Query shape preserved |
| NFR-CESF-002 | Bulk upload isolation |
| NFR-CESF-003 | Observability of eligibility |

---

## 12. Sign-off

- [ ] Engineering — pending
- [ ] MEL / product — pending
- [ ] Security — n/a (no auth/secrets change)
- [ ] DevOps — n/a

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.

# Proposal — CapDev bulk email & metrics: only Approved / Submitted

> **Verdict:** Filter CapDev completion-email groups **and** persisted process metrics to results whose **final** lifecycle status is Approved or Submitted. Drafts (including rows requested as Approved/Submitted that failed green-check validation) must not appear in the email or in those metrics.

---

## Document Control

| Field | Value |
| --- | --- |
| **Type** | Change |
| **Spec path** | `changes/capdev-email-status-filter` |
| **Slug** | `capdev-email-status-filter` — derived from free-text argument (bulk email must exclude drafts; only Approved/Submitted) |
| **Approval Mode** | gated |
| **Status** | approved for specify (Phase 1 in progress) |
| **Linked tickets** | Follow-up on **AC-1607** (*Send bulk upload completion email with CapDev metrics*) |
| **Extends** | `docs/specs/archive/2026-08-11-results--capdev-bulk-upload-notification/` |
| **Depends on** | none (builds on AC-1607 already present on the target branch) |
| **Parallel-safe** | yes vs unrelated client/server specs; **no** vs concurrent edits to CapDev notification / `results.service` formalize paths |
| **Target branch** | `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics` |
| **Worktree** | `/Users/pelitos/Documents/CIAT/alliance-research-indicators-ac1607-capdev-email` |
| **Execution models** | **Cursor-hosted only** (Claude quota exhausted) — Composer / Grok / GPT / Gemini for Implementer · Reviewer · Tester |
| **Surface** | Server only (`server/researchindicators`) — no STAR UI |
| **Last updated** | 2026-08-26 |

---

## Intent

After a CapDev bulk upload, the completion email and the metrics stored on `bulk_upload_processes` must reflect only results that **actually** ended as **Approved** or **Submitted**. Drafts must not inflate counts or appear in project-group emails.

---

## Problem / Current Behavior

Today (AC-1607 / archived CapDev notification spec):

1. `CapdevBulkNotificationRepository.capdevSpineQuery` includes every **created** CapDev row (`result_id IS NOT NULL`, `error_message IS NULL`, CapDev indicator) — **no status filter**.
2. Groups, trainings/participants/countries, unattributed warnings, and CapDev-side persisted metrics all descend from that spine (or from aggregates built from it).
3. During formalize, payload rows may request `status: Approved | Submitted`, but `ResultsService.customStatus` only applies that status when green checks pass (`completness`). Otherwise the result **stays Draft**.
4. Consequence: PIs receive emails and dashboards see metrics that include incomplete Draft trainings that were never submitted/approved.

---

## Proposed Outcome

- Email body metrics and grouping include **only** CapDev results with `result_status_id ∈ {SUBMITTED, APPROVED}`.
- Persisted CapDev notification metrics on `bulk_upload_processes` use the **same** eligibility set (user decision **B**).
- A batch with created CapDev rows that are **all Draft** behaves like “no eligible CapDev results”: **no email**, metrics reflect zeros / empty CapDev aggregates as specified in `/akili-specify`, `notification_status = SKIPPED` when nothing is dispatchable for that reason.
- Eligibility is based on the **post-validation** status on `results`, never on the requested `suggested_status` / payload `status` alone.

---

## Scope

| In | Out |
| --- | --- |
| `capdev-bulk-notification.repository.ts` spine (+ callers: groups, metrics, countries, unattributed) | Client / STAR UI |
| Persisted CapDev metrics alignment (same set as email) | Changing green-check / `customStatus` business rules |
| Unit/spec updates for repository + service (regression: Draft excluded; Submitted/Approved included) | Non-CapDev indicators; other workflow emails |
| Spec delta vs archived R-CBU glossary (“created result” vs “email-eligible result”) | Resend UI; mailer delivery tracking |
| Work only in the AC-1607 worktree above | Edits in `alliance-research-indicators-main` |

---

## Non-Goals

- Fixing or redesigning `customStatus` validation itself (beyond noting a known metadata skew — see Risks).
- Changing the AI payload contract or HTTP envelope of `ai/formalize/bulk`.
- Filtering by `bulk_upload_results.suggested_status`.
- UI copy or template redesign (template tokens stay; numbers change).

---

## Affected Users, Systems, And Specs

| Actor / system | Impact |
| --- | --- |
| Project PI / CC recipients | See only Approved/Submitted CapDev trainings in the completion email |
| Token owner / MEL / Center Admin | Same; drafts remain in STAR but not in this email |
| Dashboards consuming `bulk_upload_processes` CapDev metric columns | Counts match the email (Approved/Submitted only) |
| Spec | Extends archived `results--capdev-bulk-upload-notification` (R-CBU-001/002/006/008 glossary + ACs) |
| Code | `CapdevBulkNotificationRepository`, related specs; possibly `countTotalResults` semantics (see Open Questions) |

---

## Visual Reference

- **Source:** None
- **Location:** n/a
- **Notes:** Backend-only change; no Figma / mockup required.

---

## Requirement Delta Preview

### ADDED Requirements

- Define **email-/metrics-eligible CapDev result**: created CapDev row **and** `results.result_status_id ∈ {SUBMITTED (2), APPROVED (6)}`.
- Draft (and any other status) created CapDev rows are excluded from groups, email metrics, CapDev persisted metrics, and unattributed CapDev logging that feeds the notification stage.

### MODIFIED Requirements

- R-CBU glossary “feeds the notification” / metric definitions: from “all created CapDev” → “eligible CapDev (Approved/Submitted)”.
- R-CBU-001 / R-CBU-008: zero **eligible** CapDev results → no email; CapDev metrics persist consistently with that set; `SKIPPED` when nothing to dispatch for that reason.
- R-CBU-006 metric table: counts only eligible rows.

### REMOVED Requirements

- None. Broaden exclusion rules; do not remove the notification feature.

---

## Approach Options

| # | Option | Pros | Cons |
| --- | --- | --- | --- |
| **1** | **Join `results` on `bur.result_id` and filter `r.result_status_id IN (SUBMITTED, APPROVED)` inside `capdevSpineQuery`** (and decide `countTotalResults` explicitly) | Single choke point; source of truth = live result status; matches post-`customStatus` DB state; keeps O(groups) query shape | Touches shared spine — tests must cover Draft/Submitted/Approved |
| **2** | Filter on `bur.final_status IN (SUBMITTED, APPROVED)` only | No join to `results` | **Unsafe today:** for Submitted, `customStatus` updates `results` but often returns `null`, so `final_status` is stored as Draft while DB is Submitted — would **drop valid Submitted rows from email/metrics** |
| **3** | Filter in the service layer after fetch | No SQL change | Breaks “email metrics ≡ persisted metrics” discipline if any path diverges; worse for NFR query budget; easy to miss a read |

### Recommended Approach

**Option 1.** Extend `capdevSpineQuery` with an `innerJoin` to `results` and bind status IDs from `ResultStatusEnum` (never raw literals alone without the enum). Keep email and CapDev persisted metrics on the same spine-derived aggregates (R-CBU-008 AC.6). Add regression tests that:

1. Requested Approved/Submitted **failing** green checks → Draft → **excluded**.
2. Requested Approved/Submitted **passing** → **included**.
3. Explicit Draft → **excluded**.
4. Batch with only Drafts → no `sendEmail`, CapDev metrics empty/zero as specified, status `SKIPPED`.

**Do not** use Option 2 until/unless `final_status` is proven identical to `results.result_status_id` for both Submitted and Approved.

---

## Risks, Dependencies, And Open Questions

| ID | Item | Notes |
| --- | --- | --- |
| R1 | `customStatus` + `final_status` skew | Submitted path updates DB then returns `null` → metadata `final_status` can be Draft. **Mitigation:** filter on `results.result_status_id` (Option 1). Optional follow-up (out of scope unless approved): make `customStatus` return Submitted too. |
| R2 | Spec glossary drift | Archived AC-1607 text says “created CapDev”. Specify must redefine eligibility and update ACs/tests. Cite KZ-007 when correcting archived claims. |
| R3 | Empty eligible set | Confirm product copy: still “Training Results Successfully Recorded…” only when ≥1 eligible row; otherwise skip send (recommended). |
| OQ1 | **`total_results` column** | Today: all created rows (any indicator), no CapDev/status filter. Under decision B, should it (a) stay “all created”, (b) become “all created Approved/Submitted”, or (c) stay as-is while only CapDev columns filter? **Recommendation for specify:** (a) keep `total_results` = all successfully created; filter status only on CapDev spine / CapDev metric columns — unless product wants (b). |
| OQ2 | Unattributed Draft CapDev | Still log as unattributed if no primary contract, or only log unattributed **eligible** rows? **Recommendation:** only eligible rows enter notification-stage unattributed warnings. |
| Dep | Worktree / models | Execute only in AC-1607 worktree; Cursor models only for workers. |

**Kaizen:** Prefer asserting eligibility in **generated SQL / query builder predicates** and in formatter inputs (KZ-001 / KZ-017), not only in mock call order. Prove a Draft fixture fails inclusion before claiming the filter (KZ-014 / K-004).

---

## Success Criteria

- [ ] CapDev completion email metrics/groups never include Draft results.
- [ ] Persisted CapDev metrics on the process match the email eligibility set (decision B).
- [ ] Rows requested as Approved/Submitted that fail validation and remain Draft are excluded.
- [ ] Rows that truly become Approved or Submitted are included.
- [ ] Zero eligible CapDev results → no `sendEmail`; process still returns success for the bulk upload.
- [ ] Regression tests cover the four cases above; filter bound via `ResultStatusEnum`.
- [ ] Work lands on the AC-1607 worktree with Cursor-model workers only.

---

## Next Step

After proposal approval:

```text
/akili-specify changes/capdev-email-status-filter
```

Resolve OQ1 (`total_results`) during specify if not answered before then.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.

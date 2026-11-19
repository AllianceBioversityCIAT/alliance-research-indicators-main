# Requirements — Bilateral / PRMS push lock while PRMS holds the result

## 1. Document Control

| Field | Value |
|---|---|
| Module | bilateral (PRMS sync) + results (version selector) |
| Spec id | 2026-11-prms-pending-review-lock |
| Spec path | `changes/prms-pending-review-lock` |
| Type | Change |
| Deliverable | software |
| Depth | Standard |
| Status | draft |
| Approval Mode | gated |
| Owner | David Casañas / ARI |
| Linked PRD section | [`docs/prd.md`](../../../prd.md) §3.5 (PRMS as downstream consumer) |
| Linked tickets | none supplied |
| Extends | `bilateral/prms-sync/sync-engine` (sync gate), `bilateral/prms-sync/sync-status-panel` (history read), `changes/update-result-year-prompt` (update prompt) |
| Branch | `fix/prevent-prms-resubmission-during-active-review` |
| Last updated | 2026-11-19 (Judgment Day round 1: S-6, S-15, S-20 amended; S-26, S-27 added) |

**Owner decisions taken at the start of `/akili-specify` (2026-11-18):**

| Proposal item | Decision |
|---|---|
| OQ-1 | **Mirror PRMS.** A push is allowed only when the year was never pushed or PRMS's latest decision is `REJECT` |
| OQ-2 | The year chosen in the picker (*No, choose another year*) gets the same warning |
| OQ-4 | Spec stays in `changes/`; it is not a `bilateral/prms-sync` family child |
| R-1 | No unlock path. A result PRMS never answers stays locked — accepted risk (§8) |

## 2. Executive Summary

PRMS accepts a second push of a result **only after it rejected the first one** (verbatim PRMS text: *"Only rejected results can be resubmitted"*). STAR does not know this. When someone updates an Approved result and approves it again, STAR re-creates the year version as un-synced and lets PRMS SYNC fire. PRMS then answers `409` (refs `698` and `702` on Dev, proposal §3.1).

This spec makes STAR follow the same rule:

- **Server:** one rule decides whether a year's version may be pushed. It reads only PRMS push history. `POST …/prms-sync` refuses when the rule says no, and the client can read the rule's answer.
- **Update result:** before updating a year whose version PRMS is still reviewing or has already approved, the user sees a warning. They can cancel or update anyway.
- **PRMS SYNC button:** stays disabled, with the reason, while the rule says no.

## 3. Glossary

| Term | Meaning |
|---|---|
| **PRMS push status** | The state of STAR's push **in PRMS** for one `platform + result code + year`. It is **never** a STAR result status (`result_status_id`); the STAR result stays *Approved* throughout (owner, 2026-11-18) |
| Push | One accepted ingest of a version into PRMS: a `result_prms_sync_history` row with `event_source = 'STAR'`, `status = 'PENDING_REVIEW'` |
| Decision | A PRMS webhook row: `event_source = 'PRMS'`, `decision` `APPROVE` or `REJECT` |
| **Pending Review** | The newest push has no later decision |
| **Approved in PRMS** | The newest event is an `APPROVE` decision |
| **Rejected in PRMS** | The newest event is a `REJECT` decision |
| **Never pushed** | No push exists for that key |
| **Resubmittable** | Never pushed, or Rejected in PRMS |
| Year version | The snapshot (`is_snapshot = TRUE`) for one year; what PRMS SYNC pushes |

## 4. System Context & Scope

Current behavior, cited (full trail in the proposal §3 and §3.1):

- *Update result* asks only for a year, then calls `PATCH …/new-reporting-cycle/:code/year/:year`. It never reads PRMS state. Source: `version-selector.component.ts` → `updateResult`, `showPrompt`, `pickerAlert`, `submitReportingCycle`.
- The server reopens the live result as Draft with no PRMS check. Source: `green-checks.service.ts` → `newReportingCycle`.
- Re-approval deletes and re-creates the year snapshot. The new row has `is_synced_to_prms = 0`, because `SP_versioning` does not copy that column. Source: `green-checks.repository.ts` → `createSnapshot`; `1791468452856-UpdateSPVersionDeletePRMSPhase.ts` (`INSERT INTO results` column list).
- The push gate refuses only on `is_synced_to_prms = TRUE`, so a re-created snapshot passes. Source: `sync-gate.ts` → `SYNC_GATE_ENTRIES` (`not_already_synced`); `result-prms-sync-log.repository.ts` → `claimInsideLock` (`already_synced`).
- PRMS push history is keyed by `platform + code + year`, not by `result_id`, so it survives snapshot re-creation. Source: `prms-sync-history.reader.ts` → `EVENTS_SQL`.
- The PRMS SYNC button enables on status 6, a green Pool Funding check, `has_contribution` and `!is_synced_to_prms`. Source: `result-sidebar.component.ts` → `canSyncPrms`, `prmsAlreadySynced`.

**In scope:** the server push rule and gate; exposing the rule's answer; the warning in both update paths; the PRMS SYNC button and its tooltip.

**Out of scope:** an update operation in PRMS; editing locks; TIP and PRMS-platform results (*Edit in TIP/PRMS* path); the Pooled Funding Monitor's own status derivation (proposal OQ-5 — follow-up); fixing timestamp skew in stored history rows (proposal R-3); an admin override.

**Affected surface, by what renders:**
- The result page's version selector bar, including the global alert host it opens.
- The result sidebar's Pool Funding block, including the PRMS sync card under the button. The card is not changed.

## 5. Stakeholders / Personas

| Persona | Interest |
|---|---|
| Contributor / PI | Updates Approved results; must not be surprised that PRMS ignores the update |
| Center Admin / System Admin | Same flows; bypass `ResultStatusGuard` but **not** this rule — PRMS refuses them too |
| PRMS / SP reviewers | Receive no pushes PRMS would refuse |

## 6. Functional Requirements

### Requirement R-PRL-001: One rule decides whether a year's version may be pushed

The system SHALL derive the PRMS push status of a `platform + result code + year` from PRMS push history alone, and SHALL call a year *resubmittable* only when it is Never pushed or Rejected in PRMS.

#### Scenario S-1: Pending Review
- GIVEN a year whose newest history event is a push with no later decision
- WHEN the rule is evaluated
- THEN the status is Pending Review and the year is not resubmittable

#### Scenario S-2: Approved in PRMS
- GIVEN a push followed by an `APPROVE` decision
- THEN the status is Approved in PRMS and the year is not resubmittable

#### Scenario S-3: Rejected, then pushed again
- GIVEN push → `REJECT` (refs `627`, `631`, `647` on Dev)
- THEN the status is Rejected in PRMS and the year is resubmittable
- AND after a further push the status becomes Pending Review again

#### Scenario S-4: Never pushed
- GIVEN no history row for the key, or no year version exists
- THEN the status is Never pushed and the year is resubmittable

#### Scenario S-5: Event order follows the real sequence, not a stored timestamp
- GIVEN ref `698`: push, `REJECT`, then a second push whose stored `occurred_at` is earlier than the `REJECT`'s `decided_at` (5 h skew, proposal R-3)
- WHEN the rule is evaluated
- THEN the status is Pending Review, because the second push came after the `REJECT`
- BUT it must NOT order STAR and PRMS events by `occurred_at` / `decided_at`

#### Scenario S-6: Inputs the rule ignores
- AND IT MUST ignore rows that are inactive (`is_active = FALSE`) or are duplicate deliveries (`duplicate_of_id` set)
- AND IT MUST ignore other platforms' and other years' rows. A PRMS decision's year is the phase year PRMS reports in its callback (`data.obj_version.phase_year`), falling back to the stored year only when the callback carries none (S-26)
- BUT it must NOT read `result_status_id`, `is_synced_to_prms`, or `result_prms_sync_log`
- AND IT MUST treat a `decision` value other than `APPROVE` or `REJECT` as no decision (PRMS's verbs; `APPROVED`/`REJECTED` are the `status` badges, not decisions). A push followed only by such a row stays Pending Review

#### Scenario S-26: A decision counts for the year PRMS decided, not the year STAR moved to
- GIVEN the 2026 version was pushed and is Pending Review
- AND the user updated the result to 2027 before PRMS answered
- WHEN PRMS rejects the 2026 push
- THEN 2026 is Rejected in PRMS and resubmittable
- AND 2027 is unaffected (Never pushed, unless it has its own pushes)
- BUT it must NOT take the decision's year from the result's live version at the time the callback arrives

#### Scenario S-27: Re-imported history does not reorder real events
- GIVEN a result whose history holds rows written by the PRMS as-STAR import and later rows written by a real push or a real callback
- WHEN the import runs again and re-inserts its rows
- THEN the status is the same as before the re-import
- BUT it must NOT let an imported row outrank a real push or a real callback

### Requirement R-PRL-002: The server refuses a push that PRMS would refuse

`POST /api/results/:resultCode/prms-sync` SHALL refuse with `409` when the pushed year is not resubmittable, whatever the value of `is_synced_to_prms`.

#### Scenario S-7: Ref `702` replay — re-created snapshot during review
- GIVEN a year version that is Pending Review
- AND the result was updated, re-approved and its snapshot re-created with `is_synced_to_prms = 0`
- WHEN the push is requested
- THEN the response envelope is `status: 409` with a description naming the PRMS push status, e.g. *"This result cannot be resubmitted to PRMS: its PRMS status is Pending Review. Only results rejected in PRMS can be resubmitted."*
- AND no request reaches the PRMS Normalizer
- BUT it must NOT write a `result_prms_sync_log` row, so the attempt count is unchanged

#### Scenario S-8: Approved in PRMS
- GIVEN a year that is Approved in PRMS and a re-created un-synced snapshot
- THEN the push is refused the same way, with the description naming *Approved*

#### Scenario S-9: Rejected or never pushed
- GIVEN a year that is resubmittable
- THEN the request proceeds through the remaining gate entries exactly as today

#### Scenario S-10: Refusal order
- AND IT MUST evaluate this refusal **after** `feature_enabled`, `result_exists` and `not_already_synced`, and **before** the reporting-year and eligibility entries. An already-synced result keeps today's `409` *"Result is already synced to PRMS"*
- AND IT MUST apply to every caller and role, `SYSTEM_ADMIN` included, and to the TIP sync origin

### Requirement R-PRL-003: The client can read the push status of any year version

The system SHALL return the PRMS push status and the resubmittable flag for a result code and an **explicitly named** year, from an existing PRMS read endpoint, with that endpoint's guards unchanged.

#### Scenario S-11: Named year
- WHEN the client asks for code `C`, year `Y`, platform `P`
- THEN the response carries the status (`never_pushed | pending_review | approved | rejected`) and `resubmittable`, computed by R-PRL-001 for exactly that key
- BUT it must NOT depend on the `version` query parameter of the page the user is on

#### Scenario S-12: Year with no version
- GIVEN no year version exists for `Y`
- THEN the response is successful with `never_pushed` / `resubmittable: true`. It is not a 404

### Requirement R-PRL-004: Updating a year PRMS holds shows a warning first

After the user picks the year to update — through *Yes, update {year}* **or** the picker reached by *No, choose another year* — the client SHALL read that year's push status. When the year is not resubmittable, it SHALL show a warning before calling the update.

#### Scenario S-13: Pending Review, direct path
- GIVEN the viewed 2026 version is Pending Review
- WHEN the user clicks *Yes, update 2026*
- THEN a warning replaces the confirmation. Its title is *PRMS review in progress* and its body says the 2026 version was sent to PRMS, is pending review, and that PRMS will not receive the changes, nor accept a new push, until it rejects the current one
- AND it offers *Cancel* and *Update anyway*

#### Scenario S-14: Picker path
- GIVEN the user picks year 2025 in the picker, and 2025 is not resubmittable
- WHEN they click *Confirm*
- THEN the same warning appears for 2025

#### Scenario S-15: Approved in PRMS
- GIVEN the target year is Approved in PRMS
- THEN the warning is titled *Already approved in PRMS* and says PRMS already approved that version and will not accept the updated one

#### Scenario S-16: Cancel
- WHEN the user clicks *Cancel* or closes the warning
- THEN no update request is sent and the result is unchanged

#### Scenario S-17: Update anyway
- WHEN the user clicks *Update anyway*
- THEN today's update runs unchanged for that year (same request, success alert, navigation)
- BUT it must NOT block the update, which stays the user's choice

#### Scenario S-18: Resubmittable year
- GIVEN the target year is resubmittable
- THEN the flow is exactly today's, with no extra modal

#### Scenario S-19: Status read fails
- GIVEN the push-status request fails or times out
- THEN the update proceeds as today (fail-open), and the failure is logged to the console
- AND IT MUST still be protected by R-PRL-002, which refuses any later push

#### Scenario S-20: No double requests
- GIVEN the confirmation closes as soon as it is confirmed (global-alert behaviour)
- WHILE the status is being read, the *Update result* button shows a busy state and cannot start a second flow
- AND IT MUST send one status request and at most one update per confirmed choice

### Requirement R-PRL-005: PRMS SYNC is disabled while the year is not resubmittable

The sidebar's PRMS SYNC button SHALL be disabled, with a tooltip giving the reason, while the viewed year version is not resubmittable.

#### Scenario S-21: Pending Review
- GIVEN the viewed version is Pending Review and every other enabling condition holds
- THEN the button is disabled
- AND its tooltip says PRMS is reviewing this version and it can be sent again only if PRMS rejects it

#### Scenario S-22: Approved in PRMS
- THEN the button is disabled with a tooltip saying PRMS already approved this version

#### Scenario S-23: Tooltip precedence
- AND IT MUST show the existing *already synced* tooltip when `is_synced_to_prms` is true, and this spec's reason only otherwise. Every other existing tooltip keeps its wording and conditions

#### Scenario S-24: Rejected
- GIVEN the viewed version is Rejected in PRMS and every other condition holds
- THEN the button is enabled, as today

#### Scenario S-25: Race with an open tab
- GIVEN the button was enabled when the page loaded, and the year became not resubmittable afterwards
- WHEN the user clicks it
- THEN the server's `409` description from R-PRL-002 is shown in the existing failure modal

## 7. Non-Functional Requirements

| ID | Category | Target | How verified |
|---|---|---|---|
| NFR-PRL-001 | performance | The update flow adds at most **one** GET, and only after a year is chosen | Component test counts calls |
| NFR-PRL-002 | a11y | The warning reuses the existing global alert, so focus trap, `Esc` and focus return are unchanged. Visible text comes first, colour second (WCAG 2.1 AA) | Component test + HITL visual check |
| NFR-PRL-003 | reliability | The client cannot override the gate: a stale tab or a direct API call is refused by R-PRL-002 | Server unit + controller tests |
| NFR-PRL-004 | consistency | One rule implementation on the server. The client consumes its answer and never re-derives the status from raw events for these two decisions | Code review (Reviewer checklist) |

### Defect classes → gate

| Defect class | Gate |
|---|---|
| Rule logic wrong (state table, ordering, filters) | Server unit tests over the pure rule, with event sequences mirroring refs `627`, `631`, `698`, `702`, plus a cross-year decision (S-26) and a re-import (S-27); the SQL is pinned on a fixture (`*.fixture-spec.ts`) because the year attribution and the imported-row marker live in SQL |
| SQL that feeds the rule selects the wrong rows (platform/year/duplicate/inactive, ordering) | Fixture test on the TEST datasource (`npm run test:fixtures`), asserting on the rows the SQL returns. Mocked SQL cannot see this (KZ-001, KZ-017) |
| Gate entry missing, misordered, or writing a log row | `sync-gate.spec.ts` + service spec (no Normalizer call, no log insert) |
| New read field absent from the response | Controller/reader spec on the envelope |
| Client flow wrong (warning skipped, update sent on cancel, double request) | Component tests that arrange the **transition**: prompt → confirm → status read → warning → choice (KZ-015) |
| Button/tooltip wrong | `result-sidebar.component.spec.ts`, real template |
| Type errors in app or spec code | `npm run build` in both packages + `npx tsc -p tsconfig.spec.json --noEmit` comparing the error set of touched files (client K-002) |
| Copy and visual of the warning | **No automated check** — HITL visual approval before commit (memory: no commit before visual approval) |
| The rule disagrees with real PRMS behavior | **No automated check.** Substitute: a live Dev run of the ref `702` path at HITL, reading `result_prms_sync_log` read-only to confirm no new attempt row |

## 8. Assumptions, Dependencies, Risks

| ID | Item |
|---|---|
| A-1 | PRMS's rule is *only rejected results can be resubmitted*. Source: verbatim `failure_reason` on Dev (proposal §3.1). If PRMS loosens it, only R-PRL-001's resubmittable set changes |
| A-2 | Every accepted push writes at most one STAR `PENDING_REVIEW` row (the write is swallowed on failure) (`recordOutboundPendingReview`, called on `ACCEPTED`). A push whose history write failed is invisible to the rule. In that case PRMS's own `409` still protects; accepted |
| R-1 | **Accepted risk:** a lost PRMS decision keeps the year locked in STAR indefinitely (owner, 2026-11-18). Recovery is an ops action on PRMS's side |
| R-2 | Stored timestamps are skewed across sources (proposal R-3). R-PRL-001 S-5 forbids timestamp ordering. The sidebar card's own ordering is not changed here |
| R-3 | The Pooled Funding Monitor may show *Ready to sync* for a locked year (proposal OQ-5). Follow-up, out of scope |
| D-1 | Reads `result_prms_sync_history` as written by `decision-webhook` (child 5) and `sync-engine` (child 1); no schema change |

## 9. Open Questions

| ID | Question | Owner | Target |
|---|---|---|---|
| — | none open; proposal OQ-1/2/4 and R-1 resolved above, OQ-3 (fail-open) adopted as S-19, OQ-6 (no log row) adopted in S-7 | — | — |

## 10. Requirement ID Index

| ID | Title | Scenarios |
|---|---|---|
| R-PRL-001 | One push rule | S-1 … S-6, S-26, S-27 |
| R-PRL-002 | Server refuses the push | S-7 … S-10 |
| R-PRL-003 | Read the push status of a named year | S-11, S-12 |
| R-PRL-004 | Warning before updating a held year | S-13 … S-20 |
| R-PRL-005 | PRMS SYNC disabled while held | S-21 … S-25 |
| NFR-PRL-001 … 004 | Performance, a11y, reliability, consistency | — |

## 11. Sign-off

- [ ] Engineering lead — David Casañas
- [ ] Product owner — TBD

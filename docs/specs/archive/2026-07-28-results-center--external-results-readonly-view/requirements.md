# Requirements — Results Center / External Results Readonly View

- **Module:** results-center (client feature)
- **Spec id:** 2026-07-external-results-readonly-view
- **Depth:** Standard
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked PRD section:** `docs/prd.md` §"Federated, not duplicated" (client responsibility: search/deep-link across STAR/TIP/PRMS/AICCRA, never write into them); TRD `docs/trd/trd.md:425` ("Federation with STAR/TIP/PRMS/AICCRA is read/link-only from the client").
- **Linked tickets:** Jira user story (pasted directly by requester; no ticket key supplied)
- **Extends:** `docs/specs/results-center/external-results-readonly-view/proposal.md`
- **Reviewed:** Judgment Day round 1 (`./judgment.md`) — corrections F-1 through F-6 applied below; F-7 resolved as an explicit scope clarification (see R-RC-003).
- **Last updated:** 2026-07-27

---

## 1. Context

STAR's Results Center lists results from four sources — STAR, TIP, PRMS, AICCRA. Opening a STAR result navigates to the full section shell at `/result/:code` (12 tabs: general information, alliance alignment, partners, geographic scope, evidence, IP rights, etc.). Opening a TIP/PRMS/AICCRA result instead opens a small summary modal (`ResultInformationModalComponent`) showing ~9 fields — a fraction of what the same result actually has once synced into ARI.

This spec makes external-platform results open in the **same section shell** STAR results use, fully populated, with every field **non-editable**, plus a synced-date and public-link affordance at the top. Requested via a Jira user story pasted directly into `/akili-propose` (Summary/Context/Acceptance Criteria; no ticket key given, so no Jira MCP lookup was performed).

**Not changing:** how TIP/PRMS/AICCRA data enters ARI (cron sync, `tip-integration` tool module), the deep-link URL to the source platform, the STAR section forms' visual layout, or STAR-origin result editability rules.

---

## 2. Requirement numbering

Requirements use `R-RC-<NNN>` (Results Center). Numbered in dependency order — routing first, then field-level and action-level read-only gaps discovered during codebase investigation, then the new top-of-form UI, then the small server surface needed to power it.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **External result** | A result whose `platform_code` (derived from the `TIP-`/`PRMS-`/`AICCRA-` prefix of the result code) is not `STAR`. |
| **STAR result** | A result whose `platform_code` is `STAR`, or a result-id with no platform prefix (treated as STAR today by `CacheService.getCurrentPlatformCode()`). |
| **Section shell** | The `/result/:code` page (`ResultComponent` + `ResultSidebarComponent` + the 12 tab routes under `result/pages/*`) — today used only by STAR results. |
| **`isExternalResult`** | New pure computed signal proposed by this spec: `true` when `platform_code` is non-empty and `!== 'STAR'`. Does not depend on result status or role — a strict function of platform origin. |
| **`isEditableStatus()`** | Existing `SubmissionService` computed (`submission.service.ts:60-81`) that already folds in the STAR/non-STAR check, plus result-status and RBAC rules, to decide whether a field may be edited right now. |
| **Sync date** | The point in time ARI last received/updated this result's data from its source platform. Best available proxy today: the `Result` entity's `AuditableEntity`-inherited `updated_at` column, since only the sync ingestion path writes to non-STAR rows. |
| **Public link** | `result.public_link` — a public URL with the complete metadata (distinct from `external_link`, the deep link back into the source platform's own UI). |

---

## 4. System Context & Scope

**In scope:**
- Client (`client/research-indicators`) routing, section-shell gating, and a new top-of-form header block.
- A minimal server (`server/researchindicators`) DTO/select extension so the metadata endpoint returns the fields the new header needs (`platform_code`, `public_link`, `external_link`, `updated_at`). No schema/migration change — these columns already exist on `Result`.

**Out of scope (corrected after Judgment Day round 1 — see `./judgment.md` F-1/F-2/F-3):**
- Any change to how external data is ingested (cron/`tip-integration`).
- **Only one** server-side mutation gap remains genuinely deferred: the OICR author/contact `DELETE` (`result-users.service.ts`'s `deleteAuthorContactByResultIdAndKey`) — flagged as NFR-RC-001 + optional task `tasks.md` T-12. The other two gaps originally believed unguarded are now **in scope** (not deferred), per corrected findings:
  - The pool-funding-alignment `PATCH` already has a server-side gate for PRMS (`bilateral.service.ts`'s `assertPrmsSourceWritable`/`isPrmsSourced`) — only TIP/AICCRA were actually open. Closing that remaining gap is a small, low-risk extension of an existing, already-tested pattern (R-RC-005, `tasks.md` T-08) — **not deferred**.
  - The submit-status `PATCH` (`result-status-workflow.service.ts`'s `changeStatus()`) has zero platform check today, and — confirmed directly against code — its `Result.update()` call auto-bumps `updated_at` via TypeORM's `@UpdateDateColumn`, which would silently corrupt this same spec's own "last synced" feature (R-RC-008) if ever exercised against an external result. Deferring this one would ship a feature whose own data can be invalidated by a hole this spec already knew about. **Brought in scope as R-RC-012** (`tasks.md` T-13) — not deferred.
- `search-a-result.component.ts` — confirmed (not just suspected) to already navigate every result, external or not, straight to `/result/:code` with **zero** platform gating today. No routing fix is needed there (see R-RC-001 note) — it inherits the read-only enforcement "for free" once R-RC-002…007 land, since those fixes live in the destination components, not the entry point. It is added to `tasks.md` T-11's manual verification matrix instead of a routing task.
- `my-latest-results.component.ts` (home page) — confirmed already correctly gated today (`opensResultInformationModal()` guards its `routerLink`/click) — verified, no change needed.
- Deleting `ResultInformationModalComponent` outright vs. leaving it unused — a task-level decision (`tasks.md` T-11 area), not a requirement.

**Depth justification (Standard):** cross-cutting client change (routing + 5 distinct read-only gaps across the tab set + shared header/sidebar) plus one small, additive server DTO extension. No auth model change, no migration, no new persistence — so not Full; too broad and multi-file to call Lite.

---

## 5. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| Research/MEL staff (STAR user) | Wants to see the complete metadata of a TIP/PRMS/AICCRA result without leaving STAR, without being able to accidentally edit a record STAR doesn't own. |
| Center Admin / System Admin | Currently has additional edit affordances (submit/review/approve, OICR status dropdown, admin-only fields) that must also respect the external/read-only boundary — an admin viewing a TIP result should not see "Submit Result" or be able to change its status from STAR. |
| TIP / PRMS / AICCRA (source platforms) | Indirect stakeholder — not an actor in this flow (client never writes to them); their data must render faithfully and must not be corrupted by an ARI-side edit that shouldn't be possible for a federated record. |

---

## 6. Functional Requirements

### R-RC-001 — External results navigate into the section shell, not the modal

- **As a** STAR user
- **I want** clicking/opening a TIP, PRMS, or AICCRA result from Results Center to take me to `/result/:code`
- **So that** I see the complete metadata in the same forms STAR results use, instead of a 9-field summary

**Details:**
- Inputs: a `Result` row with `platform_code ∈ {TIP, PRMS, AICCRA}` from any of the **six** current entry points in `results-center-table.component.ts`: `openResult()` (row click), `onResultLinkClick()` (link click), `handleRowClickResult()` (capture-click handler), `getResultRouteArray()`/`getResultHref()` (href/routerLink resolution), **and `openResultByYear()`** (year-badge links in the snapshot-years column, `:303-312` — confirmed during Judgment Day round 1 (`./judgment.md` F-6) as a sixth handler that today does a bare `return` for external platforms; without including it, the row itself would navigate correctly while a specific year-link on the same row silently dead-clicks).
- Behavior: replace the "open `resultInformation` modal" branch (or, for `openResultByYear()`, the bare `return`) in all six handlers with the same `router.navigate(['/result', resultCode], { queryParams: ... })` call already used for STAR results (mirroring the snapshot/version logic at `results-center-table.component.ts:293-300` where applicable).
- Outputs: browser navigates to `/result/{PLATFORM}-{code}`; `ResultComponent` loads, `ResultSidebarComponent` and the requested tab render.
- **No fix needed at `search-a-result.component.ts`** — confirmed during Judgment Day round 1 (F-3) that `openResult()` there (`:42-45`) already navigates unconditionally to `/result/{code}/general-information` for every platform, with zero gating. This entry point already does what R-RC-001 wants; it simply inherits the read-only enforcement automatically once R-RC-002 through R-RC-007 land (those fixes live in the destination components — tabs, sidebar, services — not in how the user arrived there). It is added to `tasks.md` T-11's manual verification matrix rather than needing a routing change.
- **`my-latest-results.component.ts` — SCOPE EXTENDED 2026-07-28 (product decision).** Originally fenced out as "already correctly gated via `opensResultInformationModal()`" — factually true (it has no dead-click bug) but answering the wrong question: it still routes external results into the **old modal**, so Home would behave inconsistently with Results Center and `search-a-result` once T-04 shipped, contradicting this spec's own headline requirement. Now in scope as **R-RC-013** / `tasks.md` T-14. See `execution.md` → `## Scope Gap: T-10` for how the gap was surfaced.

**Acceptance criteria:**
- [ ] AC.1 — Clicking a TIP/PRMS/AICCRA row, or a specific year-link on that row, in Results Center navigates to `/result/:code` (URL changes, section shell renders).
- [ ] AC.2 — The `resultInformation` modal does NOT open from any of the six Results Center entry points for external results.
- [ ] AC.3 — STAR-result navigation behavior (including the "approved snapshot → latest year" branch) is unchanged.
- [ ] AC.4 — Opening an external result via `search-a-result` already lands on the fully read-only shell once R-RC-002…007 ship (verified in T-11, not a routing change here).

**Out of scope (for this requirement):** none remaining — both alternate entry points were investigated and resolved above (Judgment Day round 1 closed what was previously an open question).

#### Scenario: Opening a TIP result from Results Center
- GIVEN a Results Center row with `platform_code = 'TIP'`
- WHEN the user clicks the row (or its title link)
- THEN the app navigates to `/result/TIP-31310`
- AND the section shell (sidebar + General Information tab) renders with TIP's data
- BUT the `Result information` modal MUST NOT open
- AND IT MUST preserve existing query params used for Results Center-origin navigation (`resultEntryQueryParamsForNavigation()`)

---

### R-RC-002 — A pure "is this an external result" signal exists and is the single source of truth for readonly gating

- **As a** developer maintaining the section shell
- **I want** one explicit computed signal that means "this result's platform is not STAR"
- **So that** every readonly check across tabs, sidebar, and header derives from the same fact instead of re-deriving or misusing `isEditableStatus()` (which also encodes status/RBAC, a different concern)

**Details:**
- Behavior: introduce `isExternalResult` (naming TBD in design) as `platform_code !== '' && platform_code !== 'STAR'`, computed from `CacheService.getCurrentPlatformCode()`. `SubmissionService.isEditableStatus()` MUST consume it instead of inlining the same two-line check it has today (`submission.service.ts:64-69`) — behavior-preserving refactor, not a behavior change for STAR results.
- Outputs: a signal usable by `ResultSidebarComponent`, `FormHeaderComponent`, and any tab component that needs "is external" without conflating status/role.

**Acceptance criteria:**
- [ ] AC.1 — `isEditableStatus()` returns the exact same values as before this change for all existing STAR-result test cases (behavior-preserving refactor — no regression).
- [ ] AC.2 — The new signal is exported/injectable from a shared service reachable by sidebar, header, and tab components without introducing a circular dependency.

---

### R-RC-003 — OICR "Authors and Contact Persons" table is non-editable for external results

- **As a** STAR user viewing an external OICR result
- **I want** the Add/Delete controls on the Authors and Contact Persons table disabled
- **So that** I cannot mutate a record that belongs to TIP/PRMS/AICCRA

**Details:**
- Behavior: `AuthorsContactPersonsTableComponent` (`oicr-details/components/authors-contact-persons-table/`) gains a `disabled` input, driven by `!isExternalResult` negation (i.e., `[disabled]="isExternalResult() || !submission.isEditableStatus()"` at the call site, `oicr-details.component.html:115-116`). Both the "Add author/contact person" button (`authors-contact-persons-table.component.html:4-7`) and the delete/trash button (`:67-70`) must respect it. `OicrDetailsComponent.onDeleteContactPerson()` (`oicr-details.component.ts:111-119`) MUST short-circuit (no `DELETE_AutorContact` call) when the result is external.
- This closes the one gap found during investigation where an API mutation (`DELETE_AutorContact`) had **zero** client-side guard today.

**Acceptance criteria:**
- [ ] AC.1 — For an external OICR result, "Add author/contact person" is disabled (not clickable, or visibly inert).
- [ ] AC.2 — For an external OICR result, the delete/trash icon on each row is disabled; clicking it does not call `DELETE_AutorContact`.
- [ ] AC.3 — For a STAR OICR result in an editable status, both controls behave exactly as before.

#### Scenario: Attempting to delete a contact person on an external OICR result
- GIVEN a TIP-origin OICR result open in the section shell
- WHEN the user clicks the delete icon on an author/contact row
- THEN nothing happens — no confirmation, no API call
- BUT for a STAR OICR result in Draft status, the same click MUST still open the confirmation and delete on confirm

**Scope clarification (Judgment Day round 1, `./judgment.md` F-7 — single-judge finding, resolved by explicit decision rather than a workaround):** the most direct implementation (a `disabled` input on the table gated by `isExternalResult() || !isEditableStatus()`) will also newly disable the Add button for **STAR** results in a non-editable status (e.g., Submitted/Approved) — today that click still opens the modal, and only the modal's own confirm action is gated. This is accepted as a deliberate tightening, not a regression to avoid: an Add button that opens a modal whose confirm action is guaranteed to be blocked is a confusing UX regardless of platform, so this spec explicitly widens AC.3 to allow it. AC.3 below reflects this.
- [ ] AC.3 (revised) — For a STAR OICR result in an editable status, both controls behave exactly as before. For a STAR OICR result in a non-editable status, the Add button MAY now also render disabled at the table level (previously only its modal-confirm was blocked) — this is an accepted, in-scope tightening, not a defect.

**Separately noted, explicitly out of scope:** `onDeleteContactPerson()` has no method-level `isEditableStatus()` guard at all today, even for STAR results in a non-editable status (Judgment Day F-7, Judge B) — a real but pre-existing, non-external-specific gap. Not fixed by this spec; recorded in `tasks.md` Risks & Blockers so it isn't silently lost.

---

### R-RC-004 — OICR admin-only fields also respect external readonly

- **As a** System/Center Admin viewing an external OICR result
- **I want** "MEL Regional Expert" and "SharePoint Folder Link" to be disabled
- **So that** the read-only rule holds even for roles that currently bypass the standard field gate

**Details:**
- Behavior: `oicr-details.component.html:30` and `:37` currently gate on `!isAdmin` only. Both MUST become `!isAdmin || isExternalResult()` (mirroring the existing combined pattern already used for the OICR-No field at `:50`: `!submission.isEditableStatus() || !isAdmin`).

**Acceptance criteria:**
- [ ] AC.1 — For an admin viewing an external OICR result, "MEL Regional Expert" and "SharePoint Folder Link" render disabled.
- [ ] AC.2 — For an admin viewing a STAR OICR result, both fields remain editable exactly as before.

---

### R-RC-005 — Pool Funding Alignment tab is read-only for external results

- **As a** STAR user (including Center Admin / result owner) viewing an external result's Pool Funding Alignment tab
- **I want** the radio buttons, multiselect, ToC alignment blocks, and Save action all disabled
- **So that** a tab whose editability today depends only on `bilateralService.editable` (backend `is_read_only` + ownership/admin — with no platform_code check at all) doesn't remain the one editable surface on an otherwise-locked external result

**Details:**
- **Client:** `BilateralService.editable` (`bilateral.service.ts:73-79`) MUST additionally return `false` whenever `isExternalResult()` is true, regardless of `is_read_only`, ownership, or admin role. Today a Center Admin or the result's own "owner" can still edit this tab on a TIP or AICCRA result (which is never PRMS-synced, so `is_read_only` is false) because the client-side check never consulted platform origin.
- **Server — corrected during Judgment Day round 1 (`./judgment.md` F-1):** the pool-funding-alignment `PATCH` is **not** fully unguarded server-side as first believed. `bilateral.service.ts` already has `assertPrmsSourceWritable()`/`isPrmsSourced()` (~lines 1329-1342), called at the top of `updateAlignment()` (`:659`), which throws `ConflictException('Result is PRMS-sourced; bilateral alignment is read-only in STAR')` whenever `platform_code === 'PRMS'`. **Only TIP and AICCRA remain server-side unguarded on this endpoint.** This spec brings closing that remaining gap in scope (not deferred to T-12), since it is a small, low-risk extension of an existing, already-tested pattern.
  - **Constraint discovered during review:** the PRMS-specific 409 description string is a **locked contract the client pattern-matches on** — `pool-funding-alignment.component.ts:110` hardcodes `PRMS_SOURCED_409_DESCRIPTION = 'Result is PRMS-sourced; bilateral alignment is read-only in STAR'` to differentiate toast copy. The TIP/AICCRA gate MUST use a **separate, distinctly-worded** rejection (not the PRMS-locked string, which would be factually wrong for TIP/AICCRA and would NOT match the client's existing string-comparison), so the existing PRMS contract is left completely untouched.

**Acceptance criteria:**
- [ ] AC.1 — For an external (TIP/AICCRA) result where `is_read_only = false` and the viewer is a Center Admin, the Pool Funding Alignment tab still renders fully disabled on the client.
- [ ] AC.2 — For a STAR result, `bilateralService.editable` behavior is unchanged (still governed by `is_read_only` + ownership/admin as today).
- [ ] AC.3 — The pool-funding-alignment `PATCH` endpoint server-side rejects the mutation for TIP/AICCRA-sourced results, with a distinct, accurate error description that does not collide with or alter the existing locked PRMS 409 string.
- [ ] AC.4 — The existing PRMS-sourced 409 behavior and its exact description string are unchanged (regression check against `bilateral.service.sourceReadOnlyGate.spec.ts`).

#### Scenario: Center Admin opens Pool Funding Alignment on an AICCRA result
- GIVEN an AICCRA-origin result with `alignment.is_read_only = false`
- WHEN a Center Admin opens the Pool Funding Alignment tab
- THEN every control (lever radio, ToC block, Save) renders disabled
- BUT the same admin on a STAR result with `is_read_only = false` MUST still be able to edit it

---

### R-RC-006 — "Request to add a CLARISA record" links are hidden or disabled for external results

- **As a** STAR user viewing an external result
- **I want** the "Request to add [institution/partner]..." links in Capacity Sharing, Partners, and Innovation Details (Organization item) not to open a mutation-adjacent request modal
- **So that** the shell reads as consistently locked, not selectively so

**Details:**
- Behavior: `capacity-sharing.component.ts:149`, `partners.component.ts:91`, and the Innovation Details organization-item equivalent (`organization-item.component.html:34`) gate their `setSectionAndOpenModal(...)` call/link on `!isExternalResult()`.
- **New DI note (Judgment Day round 1, `./judgment.md` F-4):** `organization-item.component.ts` currently injects only `SubmissionService` — this guard requires adding a new `CacheService` injection there (safe — `CacheService` has no dependencies of its own). `BilateralService` (R-RC-005) needs the identical new injection.

**Acceptance criteria:**
- [ ] AC.1 — The three "request to add" links do not open their modal when the result is external.
- [ ] AC.2 — They behave unchanged for STAR results.

---

### R-RC-007 — Status-changing sidebar actions are hidden for external results

- **As a** STAR user (any role) viewing an external result
- **I want** "Submit Result"/"Unsubmit Result", "Review Result", "Approve Result", and the OICR status dropdown to not appear
- **So that** no path exists in the sidebar to change a federated result's status from STAR

**Details:**
- Behavior — **line citations corrected during Judgment Day round 1** (`./judgment.md` F-5, verified directly against `result-sidebar.component.html`): `:74-76` is a single **shared outer wrapper** (`indicator_id !== 5 && status_id not in [6,7,8]`) around all three of Review (`:77-88`), Submit/Unsubmit (`:89-105`), and Approve (`:106-120`). Adding `&& !cache.isExternalResult()` **once, to the shared wrapper at `:74-76`**, closes all three simultaneously — simpler than three separate edits. The OICR status dropdown's `showOicrStatusDropdown()` (`result-sidebar.component.ts:96-99`, used at `.html:23-27`) is a separate, independent condition and needs its own `&& !isExternalResult()` addition. None of these currently check platform_code.
- The "X/Y sections completed" progress counter (`.html:36-38`) MAY remain visible (informational-only, low risk) — no requirement to hide it, but design.md should note this as a deliberate choice, not an oversight.

**Acceptance criteria:**
- [ ] AC.1 — For an external result, none of Submit/Unsubmit, Review, Approve, or the OICR status dropdown render, for any role including System Admin.
- [ ] AC.2 — For a STAR result, all four keep their exact current visibility/enablement logic.

#### Scenario: Admin viewing an external OICR result
- GIVEN a PRMS-origin result with `indicator_id = 5` (OICR) and the viewer is System Admin
- WHEN the sidebar renders
- THEN the OICR status dropdown MUST NOT appear
- BUT for a STAR OICR result under the same admin, it MUST still appear per existing rules

---

### R-RC-008 — Section form header shows the result's last synced date for external results

- **As a** STAR user viewing an external result
- **I want** to see when ARI last synced this result's data
- **So that** I know how current the information is without leaving STAR

**Details:**
- Inputs: a date value sourced from the `Result` entity's `updated_at` (via the server metadata endpoint extension, R-RC-011).
- Behavior: `FormHeaderComponent` renders a "Last synced: {date}" element when `isExternalResult()` is true. Not shown for STAR results.
- Outputs: human-readable date (format aligned with existing date formatting conventions, e.g. the `format-date` pipe already used elsewhere in the client).

**Acceptance criteria:**
- [ ] AC.1 — Opening any tab of an external result shows a synced-date element at the top of the form.
- [ ] AC.2 — The date element does not render for STAR results.
- [ ] AC.3 — If the source date value is null/missing, the element degrades gracefully (e.g. omits itself or shows a neutral placeholder) rather than showing "Invalid Date".

---

### R-RC-009 — Section form header offers "Open public link" for external results

- **As a** STAR user viewing an external result
- **I want** a button to open the public link with the complete metadata
- **So that** I can verify/cross-reference against the source of truth without hunting for it elsewhere

**Details:**
- Behavior: reuse the existing `openDocumentLink()` semantics from `ResultInformationModalComponent` (`result.public_link`, opened via `globalThis.open(link, '_blank', 'noopener')`), relocated into `FormHeaderComponent`, gated on `isExternalResult() && !!publicLink`.

**Acceptance criteria:**
- [ ] AC.1 — For an external result with a non-empty `public_link`, an "Open public link" action renders at the top of every tab and opens the link in a new tab.
- [ ] AC.2 — For an external result with no `public_link`, the action does not render (no dead button).
- [ ] AC.3 — The action never renders for STAR results.

---

### R-RC-010 — Section form header preserves the "Open result in {platform}" deep link

- **As a** STAR user viewing an external result
- **I want** the existing ability to jump to the source system's own record
- **So that** removing the modal doesn't remove a capability users already rely on

**Details:**
- Behavior: reuse `openExternalLink()` semantics from the modal (`result.external_link`, platform-specific button copy: "Open link to result" for TIP, "Open result in MARLO" for AICCRA, "Open result in PRMS" for PRMS), relocated into `FormHeaderComponent`, gated the same way as R-RC-009.

**Acceptance criteria:**
- [ ] AC.1 — For an external result with a non-empty `external_link`, the platform-appropriate deep-link button renders and opens the source system.
- [ ] AC.2 — Button copy matches platform (`TIP` / `AICCRA` / `PRMS`) per the existing modal's copy rules.

---

### R-RC-011 — Metadata endpoint returns the fields the new header needs

- **As a** client developer building `FormHeaderComponent`
- **I want** `GET /results/:id/metadata` to include `platform_code`, `public_link`, `external_link`, and `updated_at`
- **So that** the header doesn't need a second round-trip or a different endpoint to render R-RC-008/009/010

**Details:**
- Inputs: existing `result_id`/result-code path token — no new inputs.
- Behavior: extend `ResultsService.findMetadataResult()`'s `select` clause (`results.service.ts:766-791`) and `MetadataResultDto` to project the four additional columns, which already exist on `Result` — no migration needed.
- Outputs: `ServerResponseDto<MetadataResultDto>` with the four new optional fields.
- Permissions: unchanged — same guard/role surface as today's metadata endpoint.

**Acceptance criteria:**
- [ ] AC.1 — `GET /results/:id/metadata` response `data` includes `platform_code`, `public_link`, `external_link`, `updated_at` for both STAR and external results (present but not surfaced in the UI for STAR).
- [ ] AC.2 — Swagger schema for the endpoint documents the four new optional fields.
- [ ] AC.3 — Existing consumers of this endpoint (STAR shell for STAR results) are unaffected by the additive fields.

---

### R-RC-012 — Submit-status endpoint rejects status changes for external results (server-side)

**Added during Judgment Day round 1** (`./judgment.md` F-2) — this requirement did not exist in the original draft; it was elevated from a flagged NFR to a blocking functional requirement because it directly protects this same spec's own R-RC-008.

- **As a** STAR platform (defending its own data integrity)
- **I want** the result-status change endpoint to reject transitions on a non-STAR result
- **So that** the "last synced" date (R-RC-008) this spec introduces cannot be silently invalidated by an unrelated status-change call

**Details:**
- Inputs: existing `resultId`, `toStatusId`, `aditionalData` — no new inputs.
- Behavior: `ResultStatusWorkflowService.changeStatus()` (`result-status-workflow.service.ts:216-290`) currently has **zero** `platform_code` check, and its `manager.getRepository(Result).update(resultId, { result_status_id, ...audit })` call (`:283-286`) auto-bumps `Result.updated_at` (a TypeORM `@UpdateDateColumn`) regardless of which fields were explicitly set — confirmed directly against code during review, not assumed. Add an early rejection (`ConflictException` or `BadRequestException`, consistent with existing exception conventions in this service) when the target result's `platform_code !== 'STAR'`.
- Outputs: existing error envelope (`ServerResponseDto`/`GlobalExceptions`) — no new response shape.
- Permissions: unchanged — this is a data-integrity guard, not a new role/permission surface.

**Acceptance criteria:**
- [ ] AC.1 — Calling the status-change endpoint against a TIP/PRMS/AICCRA result is rejected before any `Result.update()` executes (so `updated_at` is never touched).
- [ ] AC.2 — Calling it against a STAR result is unaffected — all existing status-transition tests still pass.
- [ ] AC.3 — The rejection uses a clear, accurate error description (does not reuse or collide with the locked PRMS bilateral-alignment 409 string from R-RC-005).

---

### R-RC-013 — Home "My Latest Results" cards route external results into the section shell

**Added 2026-07-28 by product decision**, after T-10's verification surfaced that decision D-3 had fenced this out on a technically-true but irrelevant basis (see `execution.md` → `## Scope Gap: T-10`). This closes the last inconsistent entry point.

- **As a** STAR user on the Home page
- **I want** clicking a TIP/PRMS/AICCRA card in "My Latest Results" to open the full read-only section shell
- **So that** the behavior matches Results Center and search — the Jira AC ("when entering a result from an external system, the full metadata must be shown in the same STAR forms") holds regardless of which screen I came from

**Details:**
- `my-latest-results.component.ts`'s `opensResultInformationModal()` (`:130-132`) currently returns `true` for PRMS/TIP/AICCRA, which the template (`:18-20`) uses to null out `routerLink`/`queryParams`, and `onResultCardClick()` (`:158-161`) uses to `preventDefault()` and open the modal instead.
- Behavior: external results MUST use the same `getStarResultRouterLink()` / `getStarResultQueryParams()` paths STAR results already use. Both are already platform-agnostic (`getStarResultRouterLink` builds `${platform_code}-${result_official_code}`) and already handle the approved-snapshot → `general-information` + `version` case, so no new navigation logic is needed — only the removal of the modal special-casing.
- The `RESULT_ENTRY_SOURCE_VALUE_HOME` query param must continue to be applied for external results, exactly as it is for STAR.
- The `.more-vert` overflow-menu click guard in `onResultCardClick()` MUST be preserved (unrelated concern — clicking the card's ⋮ menu must not navigate).

**Acceptance criteria:**
- [ ] AC.1 — Clicking a TIP/PRMS/AICCRA card on Home navigates to `/result/:code` with the home-entry query param, not the `resultInformation` modal.
- [ ] AC.2 — The approved-snapshot case (`result_status_id === 6` with `snapshot_years`) resolves to `general-information` + `version`, for external results as it already does for STAR.
- [ ] AC.3 — STAR-card behavior is completely unchanged.
- [ ] AC.4 — Clicking the `.more-vert` menu still does not navigate, for any platform.

---

### R-RC-014 — The shared result shell and shared field components also respect external read-only

**Added 2026-07-28** after T-11's exhaustive sweep found 5 ungated controls in files the original scope never enumerated. See `execution.md` → `## T-11 Result: FAILED`.

- **As a** STAR platform (defending a federated record's integrity)
- **I want** the read-only rule to hold across the *whole* result surface, not just the 12 tab components
- **So that** no path exists to mutate — least of all **delete** — a result STAR does not own

**Details:**
The original scope (R-RC-003…007) enumerated the 12 tabs plus `result-sidebar` and `form-header`. It omitted the shared shell rendered *above* `form-header` (`section-header`, the submission-history panel — both reachable on the result route via `showSectionHeaderActions: true`) and the shared `oicr-form-fields` custom-field component. Five controls there carry no platform term:

| # | Control | Reaches | Gate as written |
| --- | --- | --- | --- |
| F-1 | "Delete Result" kebab action | **`DELETE_Result()`** | `… \|\| rolesService.isAdmin()` — no platform term |
| F-2 | Submission-history edit-date pencil | **`PATCH_StatusChangeDate()`** | role + per-row flags only; `confirmEdit()` unguarded |
| F-3 | 4 `oicr-form-fields` controls + AI-generate button | `api.fastResponse` (POST); fields typable | modal-state + role, not result editability |
| F-4 | Quantification / extrapolated-estimates inputs | writes parent signals | **no `[disabled]` at all** |
| F-5 | Innovation-readiness step buttons 1–9 | writes `innovation_readiness_id` | **no `[disabled]` at all** |

Behavior: every one of the above MUST be non-interactive for a result whose `platform_code !== 'STAR'`. F-1 and F-2 additionally require method-level guards before their API calls (defense in depth, mirroring `onDeleteContactPerson()`), not just template gating.

**Acceptance criteria:**
- [ ] AC.1 — For an external result, **no Delete Result affordance renders for any role**, and `DELETE_Result()` is unreachable even if the handler is invoked programmatically.
- [ ] AC.2 — For an external result, no submission-history edit-date affordance renders, and `PATCH_StatusChangeDate()` is unreachable even if `confirmEdit()` is invoked programmatically.
- [ ] AC.3 — All four `oicr-form-fields` controls and the AI-generate button are disabled for external results, **and the create-result modal flow that shares this component is unaffected**.
- [ ] AC.4 — Quantification/extrapolated-estimates inputs and the innovation-readiness step buttons are disabled for external results.
- [ ] AC.5 — STAR behavior is unchanged for all five surfaces.
- [ ] AC.6 — Re-running T-11's exhaustive static sweep yields zero remaining findings.

**Note on the failure mode this closes:** the gap was scope, not implementation — every prior task correctly gated everything it was pointed at. Recorded so future specs enumerate the *shared shell*, not only the feature-local components.

---

## 7. Non-Functional Requirements

### NFR-RC-001 — Security (defense-in-depth; corrected and narrowed after Judgment Day round 1)

- **Category:** security
- **Target — corrected twice; final state:** three server-side mutation endpoints lacked a platform check. **All three are now closed** — none remains deferred:
  1. **Pool-funding-alignment `PATCH`** — originally believed fully unguarded; Judgment Day F-1 corrected that (a tested PRMS-only gate already existed), so only the TIP/AICCRA half was missing. Closed by **R-RC-005 AC.3/AC.4** (`tasks.md` T-08).
  2. **Submit-status `PATCH`** — had no check at all, and Judgment Day F-2 showed its `Result.update()` would silently corrupt the very `updated_at` this spec surfaces as the sync date (R-RC-008). Elevated from deferred to blocking and closed by **R-RC-012** (`tasks.md` T-13).
  3. **OICR author/contact `DELETE`** — the last one, and genuinely the lowest-risk of the three (it touches only the child `result_user` table, not `Result`, so it cannot corrupt the sync date). Originally deferred as an optional fast-follow pending OQ-2; **OQ-2 was resolved 2026-07-28 — the product owner opted in — and it is now closed** (`tasks.md` T-12, done).
- **How verified:** each has unit-test coverage proving rejection *before* any DB work, with a distinct 409 description that cannot collide with the locked PRMS bilateral string — see `test-report.md`'s backend-unit section for the per-AC matrix and the mutation evidence.

### NFR-RC-002 — Performance

- **Category:** performance
- **Target:** Navigating to an external result's section shell must not introduce a new class of slow request — the shell already lazy-loads each tab's data on visit (same pattern as STAR), so no additional eager fetch is introduced by this change beyond the header's now-required `platform_code`/`public_link`/`external_link`/`updated_at` fields (already columns on the row fetched for the metadata call).
- **How verified:** code review — confirm no new N+1 or eager-load pattern introduced in `FormHeaderComponent` or the metadata endpoint change.

### NFR-RC-003 — Accessibility

- **Category:** a11y
- **Target:** New header elements (synced-date text, "Open public link", "Open result in {platform}") meet WCAG 2.1 AA per client-wide convention (PRD C-4) — accessible names on link/button elements, sufficient contrast using existing tokens, keyboard-operable.
- **How verified:** manual a11y check on the new header markup; no new custom interactive widgets are introduced (reuses `ButtonModule`/anchor patterns already in the codebase).

Inherited defaults (not restated in full): every client HTTP call goes through `ApiService` and handles the `MainResponse<T>` envelope; every server response stays within `ServerResponseDto`; standalone components only; token-based styling only (no hex literals).

---

## 8. Data requirements

- **Entity touched:** `server/researchindicators/src/domain/entities/results/entities/result.entity.ts` (`Result`) — no columns added, changed, or removed. `platform_code`, `public_link`, `external_link` (existing columns) and `updated_at` (inherited from `AuditableEntity`) are newly **selected/returned** by `findMetadataResult()`, not newly created.
- No new indexes, no new OpenSearch fields, no migration required.
- **Client interface:** `GetMetadata` (`client/.../interfaces/get-metadata.interface.ts`) gains four new optional fields mirroring the DTO additions.

---

## 9. Cross-system impact

- **STAR (`client/`):** primary surface of this change — see Functional Requirements above.
- **TIP / PRMS / AICCRA:** no contract change; these platforms are read-only data sources for this flow already (unaffected).
- **CLARISA / AGRESSO / OpenSearch / DynamoDB / RabbitMQ / Socket.IO:** untouched.
- **Cross-cutting risk, narrowed after Judgment Day round 1 (F-1, F-2):** the read/link-only federation principle stated in `docs/trd/trd.md:425` was found to be enforced server-side for **two of three** mutation endpoints once R-RC-005 AC.3/AC.4 and R-RC-012 ship (only the PRMS half of the bilateral gate existed before this spec; the submit-status gate didn't exist at all). **Only the OICR author/contact `DELETE` remains a genuinely open, deferred gap** (NFR-RC-001, `tasks.md` T-12) — resolved to a much smaller residual risk than originally scoped, since it touches a child table only and cannot corrupt the sync-date feature.

---

## 10. Assumptions, dependencies, risks

- **Assumption — status changed from "unverified" to "confirmed risk, mitigated in-scope" after Judgment Day round 1 (F-2):** `Result.updated_at` (via `AuditableEntity`) is used as the "last synced date" proxy. It was confirmed — not just suspected — that the submit-status endpoint (`ResultStatusWorkflowService.changeStatus()`) would silently bump this same column with no re-sync having occurred, since it has no platform check and TypeORM's `@UpdateDateColumn` auto-populates on any `.update()`. **This is now mitigated by bringing R-RC-012 in scope** (server-side rejection for non-STAR results), rather than left as a documented-but-unresolved risk. Residual risk: any *other*, still-undiscovered write path to `Result` for a non-STAR row would have the same effect — not exhaustively ruled out, but no other such path was found during this review's targeted checks.
- **Dependency:** none on other in-flight specs (`docs/specs/` has no other results-center spec yet), except that R-RC-005's server-side extension must not regress the existing PRMS-sourced gate from the prior `bilateral-module/pending-items` spec (R-BIL-071) — verify against its existing test suite (`bilateral.service.sourceReadOnlyGate.spec.ts`).
- **Risk:** the gap audit (§6, R-RC-003 through R-RC-007) was performed via targeted code reading of the 12 tabs and the sidebar, **and independently re-verified by two separate reviewers during Judgment Day round 1**, who found no additional unguarded control of the same class beyond the five (now six, counting R-RC-012) already identified. An exhaustive line-by-line audit of all ~30 files referencing `isEditableStatus()` was still not performed field-by-field; `tasks.md` T-11's manual E2E pass remains the final backstop.
- **Pre-existing, explicitly out-of-scope finding (Judgment Day F-7, Judge B):** `onDeleteContactPerson()` has no method-level `isEditableStatus()` guard at all today, even for STAR results in a non-editable status. Not fixed here — it predates and is unrelated to the external-readonly concern — but recorded so it isn't silently lost.

---

## 11. Open questions

- **OQ-1.** Is `Result.updated_at` actually the right "last synced" signal for the *normal* sync path, or does the TIP/PRMS/AICCRA sync path need a dedicated `last_synced_at` column distinct from any manual touch? — **Owner:** product owner / backend lead — **Target:** resolved before/at rollout via a production data spot-check (design.md D-1/RB-1). *(Narrowed by Judgment Day round 1 — the one confirmed corruption path, R-RC-012, is now mitigated in-scope; this OQ is about residual accuracy, not the concrete corruption risk, which is resolved.)*
- **OQ-2. FULLY RESOLVED — all three gaps closed.** Judgment Day round 1 first narrowed this: two of the three server-side mutation gaps became in-scope blocking requirements (R-RC-005 AC.3/AC.4, R-RC-012), leaving only the OICR author/contact `DELETE` as an optional fast-follow. **On 2026-07-28 the product owner opted in for that one too**, and it shipped as `tasks.md` T-12 (done). No server-side mutation gap remains deferred.
- **OQ-3. RESOLVED by Judgment Day round 1.** `search-a-result.component.ts` is confirmed to need **no routing change** (see R-RC-001) — it already navigates correctly and inherits the read-only fixes automatically; added to `tasks.md` T-11's verification matrix. `my-latest-results.component.ts` is confirmed already correctly gated — no change needed.
- **OQ-4.** Is the `resultInformation` modal component fully deleted, or just no longer triggered from Results Center (kept for any other still-undiscovered caller)? — **Owner:** engineering lead — **Target:** resolved at task-authoring time (affects whether a "delete modal" task exists). *(Not addressed by Judgment Day round 1 — still open.)*

---

## 12. Requirement ID Index

| ID | Title |
| --- | --- |
| R-RC-001 | External results navigate into the section shell, not the modal |
| R-RC-002 | A pure `isExternalResult` signal is the single source of truth |
| R-RC-003 | OICR Authors/Contact Persons table is non-editable externally |
| R-RC-004 | OICR admin-only fields respect external readonly |
| R-RC-005 | Pool Funding Alignment tab is read-only externally |
| R-RC-006 | "Request to add" CLARISA-record links hidden externally |
| R-RC-007 | Status-changing sidebar actions hidden externally |
| R-RC-008 | Header shows last synced date externally |
| R-RC-009 | Header offers "Open public link" externally |
| R-RC-010 | Header preserves "Open result in {platform}" deep link |
| R-RC-011 | Metadata endpoint returns the four fields the header needs |
| R-RC-012 | Submit-status endpoint rejects status changes for external results (added, Judgment Day round 1) |
| R-RC-013 | Home "My Latest Results" cards route external results into the section shell (added 2026-07-28, closes the T-10 scope gap) |
| R-RC-014 | Shared result shell + shared field components respect external read-only (added 2026-07-28, closes the 5 findings from T-11's failed sweep — incl. a CRITICAL Delete-Result path) |
| NFR-RC-001 | Security — only the author/contact DELETE remains deferred (narrowed, Judgment Day round 1) |
| NFR-RC-002 | Performance — no new eager-load pattern |
| NFR-RC-003 | Accessibility — WCAG 2.1 AA on new header elements |

---

## 13. Sign-off

- [ ] Engineering lead — TBD
- [ ] MEL / product owner — David Felipe Casañas Hernández
- [ ] Security review (NFR-RC-001 — all three server-side mutation guards now shipped; nothing deferred) — TBD
- [ ] DevOps (if infra touched) — N/A, no infra change

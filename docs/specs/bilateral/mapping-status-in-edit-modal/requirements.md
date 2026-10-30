# Requirements — Bilateral / Mapping status in the Edit modal

- **Module:** bilateral (STAR client page `administration/center-admin/bilateral-mapping` + server `bilateral-project-mapping`)
- **Spec id:** 2026-10-mapping-status-in-edit-modal
- **Status:** draft
- **Depth:** Standard
- **Type:** Change
- **Approval Mode:** interactive
- **Owner:** David Casañas
- **Linked PRD section:** `docs/prd.md` — Center Admin / Bilateral Mapping
- **Linked tickets:** AC-1797 ("Move bilateral mapping activation/inactivation to the edit modal with mandatory justification…")
- **Extends:** `docs/specs/archive/2026-10-30-bilateral--annualized-project-mapping` (R-APM-011, the Activate action)
- **Last updated:** 2026-10-30

---

## Executive Summary

Today each row of the Bilateral Project Mapping table has two actions: **Edit** (pencil) and **Deactivate / Activate** (ban / check icon), each with its own flow. This spec moves the status change **into the Edit modal**: the row keeps only Edit, the modal gains an Active/Inactive control, and saving a status change asks for a **second confirmation** ("This mapping will be inactivated / activated"). Inactivating additionally requires a **justification**, stored in a dedicated `status_justification` column (overwritten each time, no history) — **Notes is never replaced** (Amendment A-2).

> **Amendment A-2 (2026-10-30, owner at the T-03 HITL gate) supersedes** every clause below that stores the justification in `notes`, replaces the Notes field with Justification, or locks the CLARISA picker on activation. See §4b.

The AC-1797 ticket also names "export the filtered list". The owner scoped that **out** of this spec (2026-10-30).

## 1. Context

- **What:** relocate the status toggle into the Edit modal, add a confirmation on Save when the status changes, and require a justification when inactivating.
- **Why now:** owner request on 2026-10-30 (screenshot of the table with the two row actions). Two separate row flows for one mapping is confusing, and an inactivation currently leaves no reason.
- **Who asked:** the product owner, via AC-1797.
- **Not changing:** the list, filters, sort, pagination, coverage strip, Auto-map, the create flow, the "+ Map" flow on Pending rows, and the `activate`/`deactivate`/`update` endpoint URLs.

**Surface enumerated by what renders on the route (KZ-002, `staging` lineage):** the route renders `BilateralMappingComponent` (table + Edit `p-dialog`), its children `app-bilateral-mapping-coverage` and `app-automapper-dialog`, and the shell's `app-global-alert` (the confirmation surface). Only the table's Actions cell, the Edit dialog and the confirmation alert change. The `/admin` SSR page `BilateralProjectMappings.tsx` also calls `PATCH …/deactivate`; it is a consumer of the server rule in R-MSE-005 and already sends a note.

**Current behavior (cited at `43dd6341`):**
- Row actions: `bilateral-mapping.component.html:317-349` renders Edit plus Deactivate (`is_active`) or Activate (inactive); Pending/UNMAPPED rows render only "+ Map" (`:306-316`).
- Each status action opens its own `showGlobalAlert` confirm (`bilateral-mapping.component.ts:501-509`, `:552-560`) and calls the service **without notes** (`:518`, `:564`).
- Server `PATCH :id/deactivate` and `PATCH :id/activate` accept an optional `{ notes }` that overwrites `row.notes` (`bilateral-project-mapping.service.ts:272-274`, `:290-292`); `notes` is a nullable `text` column (`entities/bilateral-project-mapping.entity.ts:86-90`). Neither endpoint requires notes today.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Status | The mapping's `is_active` flag, shown as Mapped (active) or Inactive |
| Status change | Saving the Edit modal with the status different from the value it opened with |
| Justification | Required text when inactivating; written to `notes`, replacing its previous value |
| Second confirmation | The `showGlobalAlert` confirm shown after Save and before any request |

## 3. Stakeholders / Personas

- **Center Admin / System Admin** — maintains bilateral mappings (the only roles that reach the page, `centerAdminGuard`).
- **Product owner (AC-1797)** — wants one place to edit a mapping and a recorded reason for every inactivation.

## 4. Functional Requirements

### R-MSE-001 — Row actions keep only Edit

- **As a** Center Admin **I want** one action per mapped row **so that** every change to a mapping goes through one modal.

**Behavior:** a row that is not Pending/UNMAPPED shows only the Edit action, whether it is active or inactive. Pending/UNMAPPED rows keep "+ Map" unchanged.

#### Scenario: Active and inactive rows

- GIVEN the table shows an active row and an inactive row
- WHEN the page renders
- THEN each of those rows shows the Edit action only
- BUT it must NOT render the Deactivate or the Activate row action on any row
- AND IT MUST still render "+ Map" (and nothing else) on a Pending or UNMAPPED row

### R-MSE-002 — Status control inside the Edit modal

- **As a** Center Admin **I want** to see and change the mapping's status in the Edit modal **so that** I do not need a separate row action.

**Behavior:**
- The Edit modal shows a **Status** control with two states, Active and Inactive, initialized from the row's `is_active`.
- The control is present only in edit mode; the create dialog ("New mapping" and "+ Map") does not show it.
- Changing the control alone makes the form savable (it counts as a change); when the change is Active → Inactive, the justification required by R-MSE-003 must also be filled.
- ~~While the status differs from its initial value, the CLARISA project picker is disabled~~ *(superseded by A-2: locked only while inactivating; editable on activation)*.
- Setting the control back to its initial value restores the modal to its normal edit behavior, including any CLARISA project the admin had picked before switching the status.

#### Scenario: Project pick survives a status round trip

- GIVEN an active mapping open in Edit, and the admin picks a different CLARISA project
- WHEN the admin switches Status to Inactive and then back to Active
- THEN the picker is enabled again and shows the project the admin picked
- BUT it must NOT send the picked project while Status reads Inactive

#### Scenario: Edit an active mapping

- GIVEN an active mapping
- WHEN the admin opens Edit
- THEN the Status control reads Active
- AND IT MUST make Save enabled when only the Status control is changed — immediately for Inactive → Active; for Active → Inactive once a justification is typed (R-MSE-003). *(Amended 2026-10-30 by the owner at the T-03 gate, resolving the tension with R-MSE-003 / design §7.2.)*

#### Scenario: Create flow is unchanged

- GIVEN the admin opens "New mapping" or "+ Map"
- THEN the dialog shows no Status control
- BUT it must NOT send any activate or deactivate request from the create flow

### R-MSE-003 — Justification required when inactivating

- **As a** product owner **I want** a reason for every inactivation **so that** an inactive mapping says why.

**Behavior:**
- *(A-2: Justification renders directly below the Status control and Notes stays visible and independent.)* When the Status control changes from Active to Inactive, a **Justification** field appears: required, empty on entry, same 500-character cap and counter as Notes.
- Save stays disabled while the justification is empty or whitespace only.
- On a confirmed save the justification (trimmed) is written to `status_justification`, replacing the previous justification; `notes` is untouched unless the admin edited it (A-2).
- When the Status control changes from Inactive to Active, no justification is required; Notes stays the normal optional field, and an edited value is saved with the activation.

#### Scenario: Inactivate without a justification

- GIVEN an active mapping open in Edit
- WHEN the admin switches Status to Inactive and leaves Justification empty or types only spaces
- THEN Save is disabled
- BUT it must NOT send any request

#### Scenario: ~~Justification overwrites notes~~ *(superseded by A-2 → R-MSE-006 "Justification leaves notes alone")*

- GIVEN a mapping whose notes read "old note"
- WHEN the admin inactivates it with justification "Contract closed" and confirms
- THEN the mapping's notes read exactly "Contract closed"
- AND IT MUST NOT keep "old note" anywhere in the row

### R-MSE-004 — Second confirmation before a status change is saved

- **As a** Center Admin **I want** an explicit warning before a status change is applied **so that** I do not inactivate or activate a mapping by mistake.

**Behavior:**
- Clicking Save with a status change opens a confirmation naming the action and the agreement: inactivate → "Inactivate mapping" / "The mapping for agreement <id> will be inactivated. Continue?"; activate → the same with "activated".
- **Confirm** sends exactly one request (deactivate with the justification, or activate with notes if edited), then closes the modal, shows a success toast ("Mapping inactivated" / "Mapping activated"), and reloads the table and the coverage strip.
- **Cancel** sends nothing and leaves the modal open with every value the admin entered.
- A Save with no status change (project or notes only) behaves as today: no confirmation, `PATCH :id`.
- A failed request keeps the modal open and shows the error inline (the existing `save-error` block).
- While the confirmation is open: Save is disabled, the modal's fields cannot be edited, Escape does not close the modal, and the confirmation offers only Confirm and Cancel (no close icon). The request sends the values the modal held when Save was clicked.

#### Scenario: Save pressed twice

- GIVEN the confirmation for a status change is open
- WHEN the admin presses Enter or Space on Save again, or presses Escape
- THEN no second confirmation opens and the modal stays open
- AND IT MUST send exactly one request after the admin confirms

#### Scenario: Confirm an inactivation

- GIVEN an active mapping with Status switched to Inactive and a justification typed
- WHEN the admin clicks Save
- THEN the inactivation confirmation is shown
- AND IT MUST send no request before the admin confirms
- WHEN the admin confirms
- THEN exactly one `PATCH …/deactivate` is sent with `{ justification: <justification> }` *(A-2; plus `notes` only when edited)*
- AND the modal closes, the toast reads "Mapping inactivated", the row shows Inactive

#### Scenario: Cancel the confirmation

- GIVEN the confirmation is open
- WHEN the admin clicks Cancel
- THEN no request is sent
- AND the modal is still open with the Status control and the justification as entered

#### Scenario: Plain edit is not double-confirmed

- GIVEN an active mapping open in Edit
- WHEN the admin changes only the notes and saves
- THEN no confirmation is shown and one `PATCH :id` is sent, as today

#### Scenario: Request fails

- GIVEN a confirmed status change
- WHEN the server answers an error
- THEN the modal stays open with the error message inline
- BUT it must NOT show the success toast

### R-MSE-005 — Server requires the justification on deactivate

- **As a** product owner **I want** the justification enforced by the API **so that** no client can inactivate a mapping without a reason.

**Details:**
- Inputs: `PATCH /api/bilateral-project-mappings/:id/deactivate`, body `{ notes: string }` *(A-2: now `{ justification: string, notes?: string }`, justification → `status_justification`; R-MSE-006)*.
- Behavior: `notes` is required; trimmed, it must be 1–500 characters. The trimmed value is stored and replaces `notes`, **also when the row is already inactive** (another admin got there first): the status stays inactive and the justification is still written. Activate keeps `notes` optional; when supplied on an already-active row it is likewise written.
- Outputs: `200`, `ServerResponseDto` with `data` = the updated mapping, description "Bilateral project mapping deactivated" (unchanged).
- Errors: missing, blank, or over-500 `notes` → `400` through the validation pipe, row unchanged.
- Permissions: unchanged (the controller's existing role gating).

**Acceptance criteria:**
- [ ] AC.1 — `{}` or `{ notes: "   " }` → `400`, `is_active` unchanged.
- [ ] AC.2 — `{ notes: " Contract closed " }` → `200`, `is_active=false`, `notes="Contract closed"`.
- [ ] AC.3 — 501-character notes → `400`.
- [ ] AC.4 — the `/admin` SSR deactivate (sends `{ notes: 'Deactivated via admin panel' }`) still succeeds.
- [ ] AC.5 — `PATCH :id/activate` with an empty body still returns `200`.
- [ ] AC.6 — deactivate on an already-inactive row with `{ notes: "Late reason" }` → `200`, `is_active=false`, `notes="Late reason"`.

**Out of scope:** history of justifications; exporting the filtered list (AC-1797's other item, owner-deferred).

## 4b. Amendment A-2 — justification has its own column; CLARISA editable on activation

*Owner decisions at the T-03 HITL gate, 2026-10-30. Where this section and an earlier clause disagree, this section wins.*

### R-MSE-006 — Justification stored apart from Notes

- A new nullable `text` column `bilateral_project_mapping.status_justification` holds the last inactivation justification; each inactivation overwrites it (no history). `notes` is never written by the justification.
- `PATCH :id/deactivate` body: `{ justification: string, notes?: string }`. `justification` is required, trimmed, 1–500 chars (`400` otherwise) and written to `status_justification`; `notes`, when supplied, is written to `notes`. Both are written also on an already-inactive row (idempotent path, as AC.6).
- Activate does **not** clear `status_justification` and requires no justification.
- The `/admin` SSR page sends `{ justification: 'Deactivated via admin panel' }`.
- In the Edit modal the Justification field sits **directly below the Status control**; Notes stays visible, optional and independent in both directions.

#### Scenario: Justification leaves notes alone
- GIVEN a mapping whose notes read "old note"
- WHEN the admin inactivates it with justification "Contract closed" and confirms
- THEN `status_justification` reads exactly "Contract closed"
- AND `notes` still reads "old note"

### R-MSE-007 — CLARISA project editable when activating

- The CLARISA picker is locked to the initial project **only while inactivating** (Active → Inactive). On Inactive → Active it stays editable.
- `PATCH :id/activate` body: `{ notes?: string, clarisa_project_id?: number }`. A supplied project different from the current one is applied with the same rules as `PATCH :id` (external code refreshed, `source` set to MANUAL; the short-name snapshot is copied only when supplied, as in `PATCH :id` — corrected 2026-10-30 after the T-05 review) in the **same** request — one save, one request.
- An inactive mapping opened in Edit must show its current CLARISA project in the picker (the 2026-10-30 HITL saw it empty; diagnose and fix).

#### Scenario: Reactivate onto another project
- GIVEN an inactive mapping on project A open in Edit
- WHEN the admin switches Status to Active, picks project B and confirms
- THEN exactly one `PATCH …/activate` is sent with `{ clarisa_project_id: B }`
- AND the row is active on project B

## 5. Non-Functional Requirements

### NFR-MSE-001 — Accessibility

- **Category:** a11y (PRD C-4, WCAG 2.1 AA)
- **Target:** the Status control is keyboard-operable, has a visible label and an accessible name that states the current value; the Justification field has a label, `aria-required="true"`, and the required marker; the confirmation's Confirm and Cancel buttons are reachable and operable by keyboard while the modal is open.
- **How verified:** component test on attributes + manual keyboard pass (Tab to Status, toggle, Save, reach Confirm/Cancel) at the HITL pause.

### NFR-MSE-002 — No new hex literals or tokens

- **Category:** dx — component code uses existing token utilities only (client child guide).
- **How verified:** review + `npm run lint -- --quiet`.

## 6. Data requirements

~~No schema change.~~ *(A-2)* One additive migration: nullable `text` column `bilateral_project_mapping.status_justification`. No backfill. Applying it to the shared Dev DB is a human step.

## 7. API surface delta

| Endpoint | Change |
| --- | --- |
| `PATCH /api/bilateral-project-mappings/:id/deactivate` | body `notes` becomes **required**, trimmed 1–500 chars; Swagger `@ApiBody` becomes required |
| `PATCH /api/bilateral-project-mappings/:id/deactivate` (A-2) | body becomes `{ justification (required), notes? }` → `status_justification` |
| `PATCH /api/bilateral-project-mappings/:id/activate` | *(A-2)* optional `notes` and `clarisa_project_id` |
| `PATCH /api/bilateral-project-mappings/:id` | none |

The path is unversioned (`/api/bilateral-project-mappings/...`; no `@Version` on this controller — cite in design).

## 8. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| A status change saved without confirmation, or a request sent before confirm/after cancel | Client component spec: spy on `showGlobalAlert` and the service; assert zero calls before `confirmCallback.event()` and after cancel |
| Justification bypassed (blank accepted) client-side | Component spec on `canSave` + template `disabled` |
| Justification bypassed server-side | Server controller spec through the real `ValidationPipe` (supertest pattern already in `bilateral-project-mapping.controller.spec.ts:381`) |
| Old row actions still rendered | Component spec querying the rendered DOM for `deactivate-btn` / `activate-btn` (must be absent) |
| Typed-contract break (spec or app) | `npm run build` (app) and `npx tsc -p tsconfig.spec.json --noEmit` grep on touched specs (client K-002) |
| Double submit / Escape closing the modal while the confirmation is open | Component spec: second `onSave()` while pending opens no alert and sends nothing; the dialog's `visibleChange(false)` (what Escape and the header X emit) and `closeDialog()` while pending leave the modal open with its values |
| Justification dropped on an already-inactive row | Server service spec: deactivate on `is_active=false` with notes writes notes |
| Confirmation alert rendered **behind** the Edit modal (z-order) | **No automated check** (jsdom has no stacking). Substitute: human check in the running app at the HITL pause |
| Confirmation not reachable by keyboard (focus trap) | **No automated check** (jsdom does not run PrimeNG's focus trap faithfully). Substitute: keyboard pass at the HITL pause |
| Visual fit of the Status control in the modal | **No automated check.** Substitute: human check at the HITL pause |

## 9. Assumptions, dependencies, risks

- Depends on the archived `annualized-project-mapping` (Activate endpoint) — `done`.
- Risk: making `notes` required on deactivate breaks any caller that sends no body. Mitigation: the only callers are this page and the `/admin` SSR page (which sends a note) — confirmed by the consumer search in design's Premise Ledger.
- Risk: the confirmation could render behind the `p-dialog`. Mitigation: HITL check; PrimeNG's stack-based z-index puts the dialog at ~1102 in the normal case, under the alert's 1200 (design P-5).
- Risk: a browser tab still running the previous client bundle sends deactivate with an empty body and gets a `400` after the server deploys. Accepted: the old client shows the server message in an error toast and a reload fixes it.

## 10. Open questions

None blocking. Resolved by the owner on 2026-10-30: justification lives in `notes` and is overwritten (no history); export is out of scope; the second confirmation is required for both inactivate and activate.

## 11. Requirement ID Index

| ID | Title |
| --- | --- |
| R-MSE-001 | Row actions keep only Edit |
| R-MSE-002 | Status control inside the Edit modal |
| R-MSE-003 | Justification required when inactivating |
| R-MSE-004 | Second confirmation before a status change is saved |
| R-MSE-005 | Server requires the justification on deactivate |
| R-MSE-006 | Justification stored apart from Notes (A-2) |
| R-MSE-007 | CLARISA project editable when activating (A-2) |
| NFR-MSE-001 | Accessibility |
| NFR-MSE-002 | No new hex literals or tokens |

## 12. Sign-off

- [ ] Engineering lead — David Casañas
- [ ] Product owner — AC-1797 owner

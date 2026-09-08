# Requirements — Pool Funding Alignment / UX/UI Enhancements

- **Module:** results / pool-funding-alignment
- **Spec id:** 2026-08-pool-funding-ux-improvements
- **Status:** in-review
- **Owner:** Results Squad / Frontend Core
- **Linked PRD section:** [`docs/prd.md`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/prd.md) (Result Creation & Pool Funding Alignment)
- **Linked proposal:** [`docs/specs/changes/pool-funding-ux-improvements/proposal.md`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/specs/changes/pool-funding-ux-improvements/proposal.md)
- **Last updated:** 2026-08-20

---

## 1. Context

In STAR result reporting, when a result is linked to a bilateral agreement that contributes to one or more CGIAR Science Programs (SPs) or Accelerators, the user aligns the result with the Theory of Change (ToC) under the **Pool Funding Alignment** section.

User feedback and usability observations identified three key friction points in the current interface:
1. **Single-SP Projects:** When a project is mapped to only one Science Program (the most frequent operational case), the user must click "Yes", open an oversized multi-select dropdown with only 1 item, check it, and then scroll down to answer a separate redundant radio question selecting that same SP as Primary.
2. **Confusing "Pending" Tag & Fragmented Flow:** An amber `Pending` tag is displayed beside Science Programs if their bilateral mapping status is not 'Confirmed', causing result authors to believe their submission is blocked. Additionally, selecting the Primary SP is isolated in a separate question rather than unified with the SP selection interface.
3. **Uninformative Loading States:** When fetching external Theory of Change indicators from CLARISA, dropdowns display generic spinning icons without contextual progress messaging or skeleton placeholders.

This specification establishes the requirements to auto-select single SPs, unify SP and Primary selection into modern interactive cards, remove the misleading `Pending` tag, and introduce PrimeNG skeleton loaders for ToC queries.

---

## 2. Requirement Defect Classes and Verification Gates

| Defect Class | Example Failure | Gate / Verification Command |
| --- | --- | --- |
| **State synchronization defect** | Auto-selection doesn't update `formData.selected_sps` or `primary_sp_code` | Unit test in `pool-funding-alignment.component.spec.ts` asserting signal state on `has_contribution = true` |
| **DOM / Rendering omission** | Dropdown is still rendered when single SP is mapped; or `Pending` badge is still visible in DOM | Unit test asserting DOM element presence/absence with `fixture.nativeElement` |
| **Keyboard Accessibility (a11y)** | SP selection card cannot be activated with `Space`/`Enter` or lacks `aria-checked` | Component a11y tests asserting `tabindex`, `role="checkbox"` / `role="radio"`, and keydown handling |
| **Visual / Design token divergence** | Colors or borders diverge from ARI design system (`--ac-primary-blue-*`) | Code audit & unit test class inspection against approved design tokens |

---

## 3. Functional Requirements

### R-PFU-001 — Single Science Program Auto-Selection & Interactive Card Presentation

- **As a** STAR Result Author reporting on a bilateral project mapped to exactly 1 Science Program
- **I want** the system to automatically select that Science Program and set it as Primary when I answer "Yes" to the contribution question
- **So that** I don't have to perform redundant manual clicks through empty-feeling dropdowns and duplicate radio questions

#### Scenario 1.1: Automatic selection and card presentation on single-SP project
- GIVEN a project with `sciencePrograms()` containing exactly 1 program (e.g. `SP06 — 100% - Climate Action`)
- AND `formData().has_contribution` is initially `null` or `false`
- WHEN the user clicks "Yes" (`has_contribution = true`)
- THEN the system SHALL automatically populate `formData().selected_sps` with that single SP object
- AND the system SHALL automatically set `formData().primary_sp_code` to that SP's `official_code`
- AND the system SHALL initialize the Theory of Change draft for that SP
- AND the UI SHALL render an interactive **Selected Science Program Card** displaying the SP icon, official code, contribution %, full name, and a `★ Primary` badge
- BUT it must NOT render an empty multi-select dropdown requiring manual user selection
- AND it must NOT render a separate redundant radio button question asking to choose the primary SP
- AND IT MUST transition smoothly to rendering the Theory of Change alignment block for that primary SP.

#### Scenario 1.2: Clearing state when toggling contribution to "No"
- GIVEN a single-SP project with the SP auto-selected and ToC block visible
- WHEN the user clicks "No" (`has_contribution = false`)
- THEN the system SHALL clear `selected_sps`, `primary_sp_code`, and `toc_drafts`
- AND the UI SHALL hide the SP Card and the ToC alignment section.

---

### R-PFU-002 — Integrated Multi-SP Selection & Inline Primary Designation

- **As a** STAR Result Author reporting on a project mapped to multiple Science Programs
- **I want** a unified, visual SP selection panel where I can pick contributing SPs and designate the Primary SP with a single click
- **So that** the selection is intuitive, visual, and avoids disjointed duplicate questions

#### Scenario 2.1: Multi-SP interactive card grid display
- GIVEN a project with `sciencePrograms()` containing 2 or more programs
- WHEN the user clicks "Yes" (`has_contribution = true`)
- THEN the system SHALL render interactive selectable SP Cards / Chips for all available Science Programs
- AND each card SHALL display the SP icon, code, allocation percentage, and full title.

#### Scenario 2.2: Single selection among multiple auto-designates Primary
- GIVEN the multi-SP selection grid
- WHEN the user selects exactly 1 Science Program
- THEN that program SHALL automatically be designated as the `primary_sp_code`
- AND its card SHALL display the `★ Primary` badge.

#### Scenario 2.3: Multiple selection allows one-click Primary toggle
- GIVEN the user has selected 2 or more Science Programs
- WHEN the user clicks the "Make Primary" action / star on any of the selected SP cards
- THEN `formData().primary_sp_code` SHALL immediately update to that SP's code
- AND that card SHALL display the `★ Primary` badge while other selected cards display the `Contributing` badge
- AND the ToC block below SHALL dynamically switch to the newly designated Primary SP
- BUT it must NOT render a separate radio question section below the SP cards.

---

### R-PFU-003 — Removal of Confusing "Pending" Tag from Result Flow

- **As a** STAR Result Author
- **I want** to see clear Science Program details without ambiguous "Pending" status labels
- **So that** I have full confidence that my result alignment is valid and active

#### Scenario 3.1: No "Pending" badge rendered in SP selection or alignment view
- GIVEN Science Programs loaded for the result (regardless of internal `mapping_status`)
- WHEN rendered in the Pool Funding Alignment form
- THEN the system SHALL NOT render any `Pending` badge or amber tag
- AND only the Science Program code, allocation %, title, and role (`Primary` or `Contributing`) SHALL be shown.

---

### R-PFU-004 — Skeleton Loading & Informative Feedback for Theory of Change (ToC) Queries

- **As a** STAR Result Author
- **I want** clear, contextual loading placeholders and progress feedback while Theory of Change data is being fetched from CLARISA
- **So that** I understand that external catalog data is loading and the application has not frozen

#### Scenario 4.1: Skeleton loading during ToC catalog fetch
- GIVEN a Primary Science Program has been selected
- WHEN the ToC catalog query is in flight (`catalogState() === 'loading'`)
- THEN the system SHALL display PrimeNG `p-skeleton` shapes matching the height and layout of the level and HLO selectors
- AND the system SHALL display an informative message (e.g., *"Fetching Theory of Change indicators for SP06 from CLARISA..."*) with `aria-busy="true"`
- BUT it must NOT show a broken or unstyled hanging dropdown.

#### Scenario 4.2: Smooth transition upon catalog resolution
- GIVEN the skeleton loading state is active
- WHEN the catalog data finishes loading successfully
- THEN the system SHALL replace the skeletons with the populated PrimeNG selectors without vertical layout shifts (CLS < 0.05).

#### Scenario 4.3: Accessible error and retry state
- GIVEN the ToC catalog fetch fails or times out (`catalogState() === 'error'`)
- THEN the system SHALL render an accessible error alert with `role="alert"`
- AND provide a prominent `Retry` button that triggers a re-fetch of the ToC catalog.

---

## 4. Non-Functional Requirements

### NFR-PFU-001 — Accessibility (WCAG 2.1 AA Compliance)
- **Category:** a11y
- **Target:** 100% WCAG 2.1 AA compliance across all new SP cards and ToC block states.
- **Rules:**
  - Interactive SP cards must be keyboard accessible via `Tab`, `Space`, and `Enter` keys (`tabindex="0"`).
  - Selected states must use `aria-checked="true"|"false"` and appropriate semantic roles (`role="checkbox"` / `role="radio"`).
  - Colors must meet contrast ratio ≥ 4.5:1 for normal text and ≥ 3:1 for large text/icons.
- **How verified:** Automated unit tests asserting ARIA attributes and keyboard event triggers.

### NFR-PFU-002 — Visual Layout Stability & Minimal Clicks
- **Category:** Performance & UX
- **Target:**
  - Cumulative Layout Shift (CLS) < 0.05 during ToC catalog loading transitions.
  - Single-SP projects reduce user interaction from 4+ clicks down to exactly 1 click ("Yes").
- **How verified:** Automated DOM assertions in component test suite.

### NFR-PFU-003 — Data Contract & Signal Compatibility
- **Category:** Reliability & Backward Compatibility
- **Target:** 100% compatibility with backend `POST /api/results/:id/pool-funding-alignment` payload and existing draft signal lifecycle.
- **How verified:** Full suite regression tests in `pool-funding-alignment.component.spec.ts`.

---

## 5. Requirement ID Index

| Requirement ID | Title | Priority | Target |
| --- | --- | --- | --- |
| **R-PFU-001** | Single Science Program Auto-Selection & Interactive Card Presentation | High | `client/research-indicators` |
| **R-PFU-002** | Integrated Multi-SP Selection & Inline Primary Designation | High | `client/research-indicators` |
| **R-PFU-003** | Removal of Confusing "Pending" Tag from Result Flow | Medium | `client/research-indicators` |
| **R-PFU-004** | Skeleton Loading & Informative Feedback for Theory of Change Queries | High | `client/research-indicators` |
| **NFR-PFU-001** | Accessibility (WCAG 2.1 AA Compliance) | High | `client/research-indicators` |
| **NFR-PFU-002** | Visual Layout Stability & Minimal Clicks | Medium | `client/research-indicators` |
| **NFR-PFU-003** | Data Contract & Signal Compatibility | High | `client/research-indicators` |

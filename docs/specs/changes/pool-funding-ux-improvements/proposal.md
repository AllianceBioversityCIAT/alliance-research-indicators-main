# Proposal — Pool Funding Alignment UX/UI Enhancements

## 1. Document Control

| Property | Value |
| --- | --- |
| **Spec Path** | `docs/specs/changes/pool-funding-ux-improvements` |
| **Slug** | `pool-funding-ux-improvements — derived from free-text argument` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Author** | Antigravity (T1 Architect) |
| **Date** | 2026-08-20 |
| **Target Packages** | `client/research-indicators` |

---

## 2. Intent

Modernize and streamline the **Pool Funding Alignment** user experience in the STAR result workspace by:
1. Eliminating friction for the common case where a project has only a single Science Program mapped (auto-selection & intuitive card presentation).
2. Unifying Science Program selection and Primary SP designation into a single, cohesive visual component while removing confusing and misleading `Pending` badges.
3. Replacing uninformative spinners with rich PrimeNG skeleton loaders and descriptive progress feedback during external CLARISA ToC catalog loading.

---

## 3. Problem / Current Behavior

### 3.1 Unnecessary manual friction for Single-SP projects (Image 1)
In projects where only **1 Science Program** is mapped (e.g., `SP06 — 100% - Climate Action`), when the user answers "Yes" to *"Does this result contribute to a Science Program or Accelerator?"*:
- A multi-select dropdown is shown with only 1 item inside.
- The user must click the dropdown, find the single item, and check it manually.
- The user is then presented with a second, redundant radio question (*"Select the Primary Science Program"*) to select that same single SP again.

### 3.2 Misleading "Pending" badge and fragmented step flow (Image 2)
- In the Primary SP selection list, an orange `Pending` badge is displayed for SP allocations whose bilateral mapping status is not `'Confirmed'`. This confuses result authors who believe their submission is blocked or pending approval.
- Having Primary SP selection as a completely separate question below the multi-select breaks the mental model and adds unnecessary vertical clutter.

### 3.3 Generic and uninformative loading spinners for Theory of Change (ToC)
- When fetching Theory of Change levels, High-Level Outputs (HLOs), and indicators from external CLARISA endpoints, dropdowns show generic spinning icons or hang without clear contextual feedback, making the UI feel slow or unresponsive to users.

---

## 4. Proposed Outcome

### 4.1 Intelligent Auto-Selection & Visual SP Card Display
- When `sciencePrograms().length === 1`:
  - Selecting "Yes" immediately and automatically selects that Science Program and designates it as **Primary**.
  - Replaces the multi-select dropdown with an elegant, clear **Selected Science Program Card** (featuring program icon, code, title, allocation badge, and a distinct `★ Primary` indicator).
- When `sciencePrograms().length > 1`:
  - Presents interactive **Selectable SP Cards / Badges** where users can select contributing SPs.
  - If 1 SP is selected, it automatically becomes Primary.
  - If multiple SPs are selected, users can designate the Primary SP directly within the cards with a single click (e.g., a "Make Primary" star button), eliminating the redundant radio section.

### 4.2 Removal of the "Pending" Tag
- Remove the `Pending` tag from the result alignment view. Result submitters only need to know the Science Program name, allocation, and whether it is Primary or Contributing.

### 4.3 Rich Skeletons & Informative ToC Loading Feedback
- Implement PrimeNG `p-skeleton` placeholders for dropdowns while ToC catalog queries are in flight.
- Provide clear, descriptive loading messages (e.g., *"Fetching Theory of Change indicators for SP06 from CLARISA..."*) and clear retry triggers if external network calls experience latency or error.

---

## 5. Scope

### In Scope
- **Frontend Component Refactoring:**
  - [`pool-funding-alignment.component.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.ts) & [`html`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.html)
  - [`sp-toc-alignment-block.component.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.ts) & [`html`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html)
- **Auto-selection & Form Signal State:**
  - Auto-populating `selected_sps`, `primary_sp_code`, and initial `toc_drafts` when `has_contribution === true` and `sciencePrograms().length === 1`.
  - Immediate initialization of ToC block for the primary SP without extra clicks.
- **UI Components & Skeletons:**
  - PrimeNG `SkeletonModule` (`p-skeleton`) integration for loading states.
  - Modern SP Card component/template using ARI design tokens (`var(--ac-primary-blue-*)`, `var(--ac-grey-*)`).
- **Comprehensive Unit Testing:**
  - Updating and expanding `pool-funding-alignment.component.spec.ts` and `sp-toc-alignment-block.component.spec.ts`.

### Non-Goals
- Modifying backend schemas, migrations, or database tables (the wire format and API endpoints remain 100% compatible).
- Altering the business logic for calculating pool funding percentages or CLARISA external endpoints.

---

## 6. Affected Users, Systems, And Specs

- **Users:** STAR Result Authors, Center Administrators, Science Program focal points.
- **Target App:** `client/research-indicators` (Angular 19 + PrimeNG 19).
- **Related Specs:** `docs/specs/archive/2026-08-20-bugfix--pool-funding-sp-picker-empty/`, `docs/specs/archive/2026-07-02-bilateral-module--mapping-drives-pool-funding-tag/`.

---

## 7. Visual Reference

- **Source:** User Screenshots
  - Image 1: Single SP dropdown friction (`orca-paste-1787276174390-7859188a-43a4-4116-bcaa-889d467a020f.png`).
  - Image 2: Misleading pending tag & separate radio section (`orca-paste-1787276323650-511783ce-5b13-4c2c-b348-9996d0f15212.png`).
- **Design Tokens:** PrimeNG 19 Aura theme (`roartheme.ts`), ARI color variables (`--ac-primary-blue-*`, `--ac-grey-*`).
- **Component Palette:** `p-skeleton`, `p-tag`, `p-button`, `p-select`, `p-radioButton`.

---

## 8. Requirement Delta Preview

### ADDED Requirements
- **R-PFU-001 (Single-SP Auto-Selection):** When `sciencePrograms()` has length 1 and user selects `has_contribution = true`, the system automatically selects the single SP, sets it as `primary_sp_code`, initializes its ToC draft, and displays an informative selected card tile instead of an empty dropdown.
- **R-PFU-002 (Integrated SP & Primary Visual Cards):** Replace the disjointed multi-select dropdown and separate primary radio group with an integrated SP card selection panel that visually distinguishes Primary vs Contributing roles with interactive badges/stars.
- **R-PFU-003 (Skeleton Loaders & Descriptive Async States):** When ToC levels/HLOs/indicators are being fetched from CLARISA, render `p-skeleton` loading shapes with contextual messages (e.g. *"Loading ToC indicators from CLARISA..."*) instead of bare spinning icons.

### REMOVED Requirements
- **R-PFU-004 (Pending Tag Removal):** Remove the misleading `Pending` tag from Science Program items in the result submission flow.
- **R-PFU-005 (Redundant Primary Section Removal):** Eliminate the redundant second question section when the primary program is already determined or unambiguously selected.

---

## 9. Approach Options

### Option 1: Integrated Visual Cards with Intelligent Auto-Selection & PrimeNG Skeletons (Recommended)
- **Design:**
  - Auto-selects single SP on "Yes" toggle.
  - Displays visually polished SP cards with clear typography, allocation chips, and role badges.
  - Smoothly integrates Primary selection into the card action area.
  - Replaces raw spinners with `p-skeleton` and descriptive loading cards.
- **Pros:**
  - Maximizes UX clarity, reduces clicks from 4+ clicks down to 1 click ("Yes").
  - Eliminates user confusion regarding "Pending" state.
  - Modern, responsive look matching PrimeNG 19 & Tailwind standards.
- **Cons:**
  - Requires small template and unit test refactor across the alignment page and block components.

### Option 2: Minimal Auto-Select within Existing Multi-Select Dropdown
- **Design:**
  - Retains the existing `app-multiselect` dropdown and radio buttons, but sets the default value programmatically when length === 1.
- **Pros:**
  - Slightly fewer template changes.
- **Cons:**
  - Leaves the clunky, oversized dropdown and disjointed second radio section in place.
  - Misses the opportunity to significantly elevate the UI/UX quality.

---

## 10. Recommended Approach

**Option 1** is strongly recommended. It directly addresses every point raised in the user feedback, significantly reduces cognitive load, complies with WCAG AA accessibility, and creates a clean, premium visual design using standard PrimeNG 19 components and ARI design tokens.

---

## 11. Risks, Dependencies, And Open Questions

- **Signal State Synchronization:** Ensure `formData` signal updates cleanly when auto-selecting so `isDirty()`, `canSave()`, and draft reconciliation stay 100% predictable.
- **Accessibility:** Ensure the new SP card selection and skeleton states include proper ARIA roles (`role="radiogroup"`, `role="checkbox"`, `aria-checked`, `aria-busy="true"`).

---

## 12. Success Criteria

- [ ] Selecting "Yes" on a single-SP project immediately auto-selects the SP, designates it as Primary, and renders the ToC alignment block.
- [ ] No `Pending` tag is shown to result authors during alignment submission.
- [ ] Multi-SP projects offer an intuitive, unified card-based selection experience.
- [ ] ToC loading states show sleek `p-skeleton` placeholders with informative messaging.
- [ ] All client unit tests pass green with 100% coverage across touched components.

---

## 13. Next Step

Run the specification phase:

```text
/akili-specify docs/specs/changes/pool-funding-ux-improvements
```

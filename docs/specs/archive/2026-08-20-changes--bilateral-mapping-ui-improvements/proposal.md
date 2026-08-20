# Proposal: Bilateral Project Mapping UI/UX Refinements

## Document Control

| Property | Value |
| --- | --- |
| **Spec Path** | `docs/specs/changes/bilateral-mapping-ui-improvements` |
| **Type** | Change |
| **Approval Mode** | `gated` |
| **Author** | Antigravity (T1 Architect) |
| **Date** | 2026-08-20 |
| **Status** | Proposed / Under Review |
| **Derived From** | User prompt: Visual and UX/UI adjustments for Bilateral Mapping administration screen |

---

## 1. Intent

Refine the **Bilateral Project Mapping** administration interface (`/platform/admin/center-admin/bilateral-mapping`) to provide explicit semantic context for the mapping process between AGRESSO agreements and CLARISA bilateral projects, improve layout ergonomics by repositioning action controls, add contextual onboarding/help guidance, and polish the visual hierarchy using modern design intelligence (`ui-ux-pro-max` + `frontend-design`).

---

## 2. Problem / Current Behavior

The current Bilateral Project Mapping screen in STAR exhibits several UX ambiguities and ergonomic inefficiencies:

1. **Unclear Column Semantics:**
   - The column header `"Agreement ID"` does not explicitly state that it represents the **AGRESSO Project / Contract ID**.
   - The column header `"CLARISA Project"` does not make immediately obvious that it represents the **Bilateral Mapping Target from CLARISA** for the active reporting phase.
2. **Disconnected Action Buttons:**
   - The `"Auto-map"` trigger button currently lives nested inside the `Mapping Coverage` sub-strip rather than in the primary page header next to `"New mapping"`, creating cognitive friction for operators managing batch mapping runs.
3. **Missing Module Context / Explanation:**
   - Operators landing on this screen lack an explicit explanation of what this module does: matching bilateral CLARISA projects (filtered by the active phase, e.g. Phase 2026) against AGRESSO contracts to drive downstream Pool Funding allocations and indicator reporting.
4. **Status Filter & Badge Alignment:**
   - The table header reads `"Status"` with badges `"Active"` / `"Inactive"`, while the coverage strip talks about `"MAPPED"` / `"PENDING"` / `"REACHABLE"`. The dropdown filter options and table status labels should be coherent and intuitive for operators.
5. **General Visual Hierarchy & Spacing:**
   - Metric cards in the coverage strip, filter alignments, table row padding, and action button affordances can be elevated to meet production-grade enterprise design standards (`ui-ux-pro-max`).

---

## 3. Proposed Outcome

A polished, intuitive Bilateral Project Mapping admin dashboard with:
- **Top Header Action Group:** The `⚡ Auto-map` button is elevated to the top header alongside `+ New mapping`.
- **Contextual Info / Help affordance:** An inline `(?)` button / info trigger opens a popover or dialog explaining the purpose of the module, the active CLARISA phase (e.g. 2026), and the AGRESSO contract reconciliation workflow.
- **Explicit Column Headers:**
  - `Agreement ID (AGRESSO)`: clearly identifies the source AGRESSO contract identifier.
  - `CLARISA Project (Bilateral)`: clearly identifies the target CLARISA bilateral project code and ID.
- **Aligned Status Nomenclature:** Coherent status semantics between the filter dropdown (`Active`, `Inactive`, `All`) and table badges, with clear mapping status indicators.
- **High-Craft UI Polish:** Enhanced metric cards (Mapped, Pending, Reachable), clean filter layout with clear actions, accessible ARIA labels, responsive table typography, and PrimeNG Aura design token compliance.

---

## 4. Scope

### In Scope
- **Page Header Refactoring:**
  - Move `⚡ Auto-map` button from `bilateral-mapping-coverage` into `bilateral-mapping.component.html` header alongside `+ New mapping`.
  - Add `(?)` Help / Info button next to page title with a descriptive popover or modal.
- **Help Content Copy:**
  - Text: *"In this module, bilateral projects from CLARISA (filtered by the active phase, e.g., Phase 2026) are mapped and reconciled against AGRESSO agreements/contracts. This mapping ensures accurate science program alignment, pool funding contributions, and indicator reporting in STAR."*
- **Table Column Headers & Formatting:**
  - Update `Agreement ID` header to `Agreement ID (AGRESSO)`.
  - Update `CLARISA Project` header to `CLARISA Project (Bilateral)`.
  - Ensure status badges and filter dropdown options (`Status: All / Active / Inactive`) are harmonized and styled with proper contrast.
- **Visual Polish (UI/UX Pro Max):**
  - KPI tiles in `Mapping Coverage` with improved visual hierarchy, micro-accents (emerald green, amber orange, blue), and progress indicator.
  - Consistent token classes (`.abc-*`, `.atc-*`, `.rs-*`) and PrimeNG Aura component styles.
  - Full automated unit test coverage in `bilateral-mapping.component.spec.ts` and `bilateral-mapping-coverage.component.spec.ts`.

### Non-Goals
- Modifying the underlying backend mapping API (`GET /api/bilateral-project-mappings` or automapper backend service).
- Changing the CLARISA upstream sync cron jobs or AGRESSO contract endpoints.
- Altering user role authorization guards (`centerAdminGuard` / `RolesGuard`).

---

## 5. Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| **Users** | Center Administrators, Finance/Operations managers managing bilateral contracts |
| **Frontend Surface** | `client/research-indicators/src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/` |
| **Components** | `bilateral-mapping.component.ts/.html/.scss`, `bilateral-mapping-coverage.component.ts/.html` |
| **Specs** | `docs/specs/bilateral-module/center-admin-project-mapping` |

---

## 6. Visual Reference

- **User Provided Image:** `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1787260733529-2ebf7f82-16bf-4321-90d3-3a7a9a21e0aa.png`
- **Generated Mockup:** `bilateral_mapping_improved_ui` (Saved in artifacts directory)
- **Key Design Tokens:**
  - Primary Action: `var(--ac-primary-blue-600)`, `var(--ac-primary-blue-500)`
  - Status Badges: `.bil-status-badge--active` (emerald), `.bil-status-badge--inactive` (neutral gray)
  - KPI Metrics: Emerald `var(--ac-green-600)` (Mapped), Amber `var(--ac-yellow-600)` (Pending), Blue `var(--ac-primary-blue-600)` (Reachable)

---

## 7. Requirement Delta Preview

### MODIFIED Requirements
- **Header Actions:** Move `Auto-map` button from coverage sub-strip to main page action group (alongside `New mapping`).
- **Table Headers:** Update column labels to `Agreement ID (AGRESSO)` and `CLARISA Project (Bilateral)`.
- **Status Filter & Display:** Harmonize filter options and status badges so operators have unambiguous feedback.

### ADDED Requirements
- **Help / Info Affordance (`(?)` Icon):** Add info trigger button and popover detailing the mapping mechanism, phase filtering (Phase 2026), and data source reconciliation.
- **Coverage Strip Layout:** Retain KPI telemetry cards (Mapped, Pending, Reachable) as dedicated analytical readout with refresh trigger.

---

## 8. Approach Options

### Option A: Header Action Elevation + Popover Help + Table Label Harmonization (Recommended)
- Move `Auto-map` to the top right flex header next to `New mapping`.
- Add an accessible `(?)` button opening a PrimeNG popover (`p-popover`) or dialog with rich markdown explaining the module and active phase.
- Update table column headers with explicit system sources (`AGRESSO`, `CLARISA`).
- Keep coverage metrics clean as a dedicated status strip without action button clutter.

*Pros:* Minimal blast radius, immediate ergonomic clarity, zero breaking API changes, fully accessible (WCAG 2.1 AA).

### Option B: Merged Hero Header with Inline Banner
- Merge the coverage strip directly into the page header as a unified hero block and use a permanent dismissible banner for the module description.

*Cons:* Takes up excessive vertical real estate on standard laptop displays and pushes table rows below the fold.

---

## 9. Recommended Approach

**Option A**. It provides the cleanest information hierarchy:
1. **Primary Control Bar:** Title, Info button `(?)`, `Auto-map` (secondary action), `New mapping` (primary action).
2. **KPI Analytics Strip:** Clean 3-card metrics summary (Mapped, Pending, Reachable) + 5-min TTL indicator + Refresh button.
3. **Filter Toolbar:** Search + Status filter + Source filter + Clear filters.
4. **Data Grid:** Explicit headers, badge indicators, confidence score, date, action buttons with tooltips.

---

## 10. Success Criteria

1. Header contains `⚡ Auto-map` and `+ New mapping` side-by-side.
2. Clicking `(?)` presents the descriptive explanation of the Bilateral Mapping module and phase filtering.
3. Table headers explicitly display `Agreement ID (AGRESSO)` and `CLARISA Project (Bilateral)`.
4. Status dropdown and table status badges are 100% harmonized.
5. All automated unit tests in `client/research-indicators` pass with 0 regressions.
6. Linting passes with 0 warnings/errors (`npm run lint -- --quiet`).

---

## 11. Next Step

```text
/akili-specify changes/bilateral-mapping-ui-improvements
```

# Requirements — Bilateral Module / Bilateral Project Mapping Table Enhancements

- **Module:** bilateral-module / center-admin
- **Spec id:** 2026-08-bilateral-mapping-table-enhancements
- **Status:** in-review
- **Owner:** Platform UI Squad / Center Admin
- **Linked PRD section:** [docs/prd.md](../../../prd.md) — Center Administration & Bilateral Management
- **Linked tickets:** AC-1676
- **Extends:** [docs/specs/archive/2026-08-20-changes--bilateral-mapping-ui-improvements](../../archive/2026-08-20-changes--bilateral-mapping-ui-improvements/requirements.md) (R-BIL-UI-001..003)
- **Last updated:** 2026-08-20

---

## 1. Context

The Bilateral Project Mapping administration dashboard (`/platform/admin/center-admin/bilateral-mapping`) enables Center Administrators and Operations managers to reconcile CLARISA bilateral projects against AGRESSO agreements and contracts.

Following initial UI reorganization in AC-1676, operators identified five key usability and data visibility bottlenecks:
1. Identifying projects by code alone (e.g. `A1676` or `B-A1676`) is error-prone and requires constant external lookup.
2. The `Confidence` column takes up horizontal space while displaying empty dashes for manual and derived rows.
3. The `Status` column and filter currently display technical database states (`Active` / `Inactive`) instead of business mapping lifecycle states (`Mapped`, `Pending`, `Inactive`), creating a disconnect with the top KPI coverage strip (Mapped: 198, Pending: 0, Reachable: 198).
4. Table columns cannot be sorted interactively.
5. The `⚡ Auto-map` button suffers from low visual contrast against the white header card.

This specification defines the functional, non-functional, and verification requirements to resolve these gaps.

---

## 2. Requirement Numbering

- Functional Requirements: `R-BTE-<NNN>` (Bilateral Table Enhancements)
- Non-Functional Requirements: `NFR-BTE-<NNN>`

---

## 3. Defect Classes & Verification Mapping

| Defect Class | Risk | Verification Gate |
| --- | --- | --- |
| **Missing/Null Description Fallback** | Cell displays `null`, `undefined`, or empty whitespace when contract/project has no description. | Unit test in `bilateral-mapping.component.spec.ts` asserting graceful fallback to code-only display. |
| **Status Filter / KPI Mismatch** | Filter dropdown does not match coverage metrics or fails to return Pending unmapped projects. | Component unit test verifying `Mapped`, `Pending`, and `Inactive` filter transitions and item sets. |
| **Table Sorting Regression** | Clicking sort icons does not sort rows or reverses pagination order. | Unit tests in `bilateral-mapping.component.spec.ts` testing ascending and descending sort on all sortable fields. |
| **Contrast & A11y Regression** | `⚡ Auto-map` button fails WCAG AA (4.5:1) or lacks focus states. | CSS token enforcement (`atc-primary-blue-600 border border-[var(--ac-primary-blue-400)]`) and visual inspection. |
| **Backend N+1 Query on List Join** | Querying contract descriptions causes N+1 queries during mapping list fetch. | Backend test in `bilateral-project-mapping.service.spec.ts` verifying single query execution with left join. |

---

## 4. Functional Requirements

### R-BTE-001 — Confidence Column Removal

- **As a** Center Administrator
- **I want** the `Confidence` column removed from the table headers and data rows
- **So that** horizontal real estate is reclaimed for project titles and descriptions.

**Details:**
- The table header `<th>` for `Confidence` SHALL be removed.
- The table body `<td>` for `Confidence` SHALL be removed.
- Unused helper methods (`showConfidence`) SHALL be cleaned up.

#### Scenario 1.1: Table Structure Verification
- GIVEN the Bilateral Project Mapping table is rendered with rows
- WHEN inspecting `<thead>` and `<tbody>`
- THEN the table contains exactly 6 columns: `Agreement ID (AGRESSO)`, `CLARISA Project (Bilateral)`, `Source`, `Status`, `Last Updated`, and `Actions`
- AND IT MUST NOT contain any column or cell for `Confidence`.

---

### R-BTE-002 — Descriptive Project Titles for AGRESSO and CLARISA Cells

- **As an** Operator reviewing mappings
- **I want** to see human-readable project descriptions and titles below the AGRESSO agreement ID and CLARISA project code in a 2-line layout
- **So that** I can instantly understand the research scope without looking up external systems.

**Details:**
- **AGRESSO Cell Layout:**
  - Line 1: Agreement ID in bold (`font-medium text-sm text-[var(--ac-grey-900)]`).
  - Line 2: Contract description / title in secondary typography (`text-xs text-[var(--ac-grey-600)] line-clamp-1`).
  - Tooltip: `[pTooltip]` attached to Line 2 displaying the full description on hover.
  - Fallback: If `agresso_description` is null, empty, or whitespace, Line 2 is omitted and only Line 1 is rendered.
- **CLARISA Cell Layout:**
  - Line 1: Short name + project ID in bold (`font-medium text-sm text-[var(--ac-grey-900)]`, e.g. `B-A1676 (id 1403)`).
  - Line 2: Full CLARISA project name in secondary typography (`text-xs text-[var(--ac-grey-600)] line-clamp-1`).
  - Tooltip: `[pTooltip]` attached to Line 2 displaying the full name on hover.
  - Fallback: If `clarisa_project_full_name` is null, empty, or identical to short name, Line 2 is omitted.
- **Backend Data Supply:**
  - `BilateralProjectMappingService.list()` SHALL perform a SQL `leftJoin` on `agresso_contracts` to select `description` (or `projectDescription`) as `agresso_description`.
  - The API payload for `GET /api/bilateral-project-mappings` SHALL include `agresso_description` and `clarisa_project_full_name`.

#### Scenario 2.1: Two-Line Rendering with Full Descriptions
- GIVEN a mapping row with AGRESSO ID `A1676` ("Scaling Sustainable Rice-Wheat Systems") and CLARISA Project `B-A1676 (id 1403)` ("Sustainable Rice-Wheat Cropping Initiatives")
- WHEN the row is rendered in the table
- THEN the AGRESSO cell displays `A1676` on Line 1 and the contract description on Line 2
- AND the CLARISA cell displays `B-A1676 (id 1403)` on Line 1 and the full project name on Line 2
- AND hovering over Line 2 reveals the full title via tooltip.

#### Scenario 2.2: Graceful Null/Empty Description Handling
- GIVEN a mapping row where the AGRESSO contract description is null or empty
- WHEN the row is rendered
- THEN Line 1 renders `A1676` normally
- BUT Line 2 is NOT rendered and does NOT create empty whitespace or broken layout.

---

### R-BTE-003 — Mapping Lifecycle Status Model & Filter Synchronization

- **As a** Center Administrator
- **I want** the Status filter and table status column to reflect business mapping lifecycle states (`All`, `Mapped`, `Pending`, `Inactive`) in sync with the top KPI coverage strip
- **So that** I can filter, inspect, and act on both mapped and pending unmapped projects directly from the table.

**Details:**
- **Status Nomenclature & Badges:**
  - `Mapped`: Rendered in Green (`bg-green-50 text-green-700 border-green-200`). Represents an active mapping linking CLARISA to an AGRESSO contract.
  - `Pending`: Rendered in Amber (`bg-amber-50 text-amber-700 border-amber-200`). Represents an eligible CLARISA bilateral project for the active phase that lacks an AGRESSO mapping.
  - `Inactive`: Rendered in Neutral Gray (`bg-gray-100 text-gray-600 border-gray-300`). Represents a deactivated mapping.
- **Status Filter Dropdown:**
  - Options: `All`, `Mapped`, `Pending`, `Inactive` (default: `All`).
  - Selecting `Mapped` filters for active mappings.
  - Selecting `Pending` filters for unmapped eligible CLARISA projects.
  - Selecting `Inactive` filters for deactivated mappings.
- **Pending Row Visuals & Actions:**
  - For `Pending` rows, `Agreement ID (AGRESSO)` displays `—` (or derived suggestion if available).
  - The `Source` badge displays `Unmapped` or `—`.
  - The `Actions` column renders a quick `+ Map` action button that opens the New Mapping dialog with the CLARISA project pre-selected.

#### Scenario 3.1: Filtering by `Mapped`
- GIVEN 198 mapped projects and 0 pending projects in the system
- WHEN the operator selects `Mapped` in the Status dropdown
- THEN the table displays only the 198 active mapped records with `Mapped` badges.

#### Scenario 3.2: Filtering by `Pending` and Triggering Quick Map
- GIVEN an eligible CLARISA project exists with no active AGRESSO mapping
- WHEN the operator selects `Pending` in the Status dropdown
- THEN the row displays `Status: Pending` with an amber badge and Agreement ID `—`
- AND WHEN the operator clicks the `+ Map` action button on the row
- THEN the New Mapping modal opens with this CLARISA project pre-selected.

---

### R-BTE-004 — Interactive Table Column Sorting

- **As an** Operator
- **I want** table column headers to be sortable by clicking
- **So that** I can order mappings alphabetically by Agreement ID, Project Title, Source, Status, or by Last Updated date.

**Details:**
- Column headers SHALL include PrimeNG `pSortableColumn` and `<p-sortIcon>` for:
  - `agresso_agreement_id` (Agreement ID)
  - `clarisa_project_short_name` (CLARISA Project)
  - `source` (Source)
  - `mapping_status` (Status)
  - `updated_at` (Last Updated)
- Clicking a header SHALL toggle sort between `ascending`, `descending`, and `none`.

#### Scenario 4.1: Sorting by Agreement ID
- GIVEN multiple rows in the mapping table
- WHEN the operator clicks the `Agreement ID (AGRESSO)` column header
- THEN rows are sorted alphabetically by `agresso_agreement_id`
- AND clicking again reverses the sort order to descending.

---

### R-BTE-005 — High-Contrast `⚡ Auto-map` Action Button

- **As an** Operator
- **I want** the `⚡ Auto-map` button in the header to have high visual contrast and distinct styling
- **So that** it is easy to find and use alongside the primary `+ New mapping` button.

**Details:**
- The button SHALL use an outlined primary style (`p-button-outlined` / `border border-[var(--ac-primary-blue-400)] text-[var(--ac-primary-blue-600)]`).
- Background on hover SHALL transition to `var(--ac-primary-blue-50)`.
- Icon `pi pi-bolt` and label text SHALL maintain WCAG AA contrast ratio (≥ 4.5:1).

#### Scenario 5.1: Button Styling and Affordance
- GIVEN the top page header is rendered
- WHEN inspecting the `⚡ Auto-map` button
- THEN it displays with clear blue border, blue text, and bolt icon
- AND hover state displays a subtle background tint
- AND clicking the button opens the Automapper dialog (`openAutomapperDialog()`).

---

## 5. Non-Functional Requirements

### NFR-BTE-001 — Accessibility & WCAG AA Compliance
- **Category:** a11y
- **Target:** All text, badges, and button labels MUST achieve a color contrast ratio ≥ 4.5:1 against their backgrounds. Tooltips MUST be accessible via keyboard focus and hover.
- **How verified:** A11y audit and design token validation.

### NFR-BTE-002 — Responsive Two-Line Layout & Text Clamping
- **Category:** UX / Layout
- **Target:** Project descriptions MUST truncate cleanly at 1 line (`line-clamp-1` with ellipsis) across viewport widths from 1024px to 2560px without expanding row height unpredictably.
- **How verified:** Visual rendering across viewport breakpoints.

### NFR-BTE-003 — List Query Performance & Single SQL Join
- **Category:** Performance
- **Target:** Fetching 50 mapping records with contract descriptions SHALL execute in a single SQL query with `leftJoin` and p95 latency ≤ 150ms.
- **How verified:** Backend unit test and query inspection.

---

## 6. Requirement ID Index

| ID | Title | Priority |
| --- | --- | --- |
| **R-BTE-001** | Confidence Column Removal | High |
| **R-BTE-002** | Descriptive Project Titles for AGRESSO and CLARISA Cells | High |
| **R-BTE-003** | Mapping Lifecycle Status Model & Filter Synchronization | High |
| **R-BTE-004** | Interactive Table Column Sorting | Medium |
| **R-BTE-005** | High-Contrast `⚡ Auto-map` Action Button | Medium |
| **NFR-BTE-001** | Accessibility & WCAG AA Compliance | High |
| **NFR-BTE-002** | Responsive Two-Line Layout & Text Clamping | Medium |
| **NFR-BTE-003** | List Query Performance & Single SQL Join | High |

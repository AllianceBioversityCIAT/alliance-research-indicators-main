# Proposal: Bilateral Project Mapping Table & UX Enhancements

## Document Control

| Property | Value |
| --- | --- |
| **Spec Path** | `docs/specs/changes/bilateral-mapping-table-enhancements` |
| **Type** | Change |
| **Approval Mode** | `gated` |
| **Author** | Antigravity (T1 Architect) |
| **Date** | 2026-08-20 |
| **Status** | Proposed / Under Review |
| **Derived From** | User prompt: Visual and functional improvements for Bilateral Mapping table (Confidence column removal, AGRESSO & CLARISA project titles/descriptions, Status column & filter alignment to Mapped / Pending / Inactive, column sorting, and Auto-map button contrast) |

---

## 1. Intent

Refine the **Bilateral Project Mapping** table, status semantics, and header controls (`/platform/admin/center-admin/bilateral-mapping`) to align with the core business workflow of reconciling CLARISA projects against AGRESSO agreements by:
1. **Removing the redundant `Confidence` column** from the table.
2. **Enriching `Agreement ID (AGRESSO)` and `CLARISA Project (Bilateral)`** with full descriptive titles (using a 2-line layout: bold code/ID on top + truncated title/description with hover tooltip below).
3. **Aligning the `Status` column and filter with real Mapping Lifecycle States (`Mapped`, `Pending`, `Inactive`, `All`)**:
   - Synchronizing the table statuses directly with the Mapping Coverage metrics (`MAPPED`, `PENDING`, `REACHABLE`).
   - Allowing operators to filter and inspect both **Mapped** projects and **Pending** (unmapped) projects directly in the table.
4. **Enabling column sorting** (`pSortableColumn` + `<p-sortIcon>`) on Agreement ID, CLARISA Project, Source, Status, and Last Updated.
5. **Improving visual contrast and affordance of the `⚡ Auto-map` button** in the header using an outlined primary style.

---

## 2. Problem / Current Behavior

Based on user feedback and analysis of the active codebase:

1. **Disconnected Status Nomenclature (`Active`/`Inactive` vs `Mapped`/`Pending`):**
   - The top KPI strip displays mapping coverage metrics: **MAPPED**, **PENDING**, and **REACHABLE**.
   - However, the filter and table below currently only offer `Active`, `Inactive`, and `All`.
   - This reflects an internal DB boolean (`is_active`) rather than the business mapping lifecycle. Operators cannot use the table to find and resolve **Pending** (unmapped) projects, and every row in the table redundantly displays `Active`.
2. **Uninformative Identifier-Only Cells:**
   - The `Agreement ID (AGRESSO)` column only displays raw codes (e.g. `A1676`, `S303`).
   - The `CLARISA Project (Bilateral)` column only displays the short code and numeric ID (e.g. `B-A1676 (id 1403)`).
   - Operators have to cross-reference other tools to know what project is being mapped.
3. **Redundant `Confidence` Column:**
   - Renders dashes (`—`) for manual and derived mappings, wasting horizontal table space.
4. **Lack of Table Column Sorting:**
   - Table column headers are static and cannot be sorted.
5. **Low-Contrast `Auto-map` Button:**
   - The `⚡ Auto-map` button currently uses `severity="secondary"`, rendering as faint gray text on a white card background with very low contrast and poor visual affordance compared to the solid primary `+ New mapping` button.

---

## 3. Proposed Outcome & Status Model

### 3.1 Mapping Status Model & Filter Alignment

We align the table status and filter directly with the mapping coverage lifecycle:

| Status | Badge Color | Meaning | Table Row Content | Row Action |
| --- | --- | --- | --- | --- |
| **`Mapped`** | Green (`bg-green-50 text-green-700 border-green-200`) | Eligible CLARISA bilateral project with an active mapping to an AGRESSO contract. | AGRESSO ID + Title, CLARISA Code + Title, Source badge, Updated date. | Edit (`pi-pencil`), Deactivate (`pi-ban`). |
| **`Pending`** | Amber / Orange (`bg-amber-50 text-amber-700 border-amber-200`) | Eligible CLARISA bilateral project for active phase without an AGRESSO mapping. | Agreement ID: `—` (or suggested contract if derived), CLARISA Code + Title, Source: `Unmapped`. | `+ Map` (opens New Mapping modal pre-selected). |
| **`Inactive`** | Neutral Gray (`bg-gray-100 text-gray-600 border-gray-300`) | Previously mapped entry that has been deactivated. | AGRESSO ID + Title, CLARISA Code + Title, Source badge, Deactivated date. | Edit / Reactivate. |
| **`Divergent`** *(Optional)* | Purple / Red | Project whose manual mapping diverges from the CLARISA external code. | AGRESSO ID + Title, CLARISA Code + Title, Divergence indicator. | Reconcile / Edit. |

### 3.2 Filter Dropdown
- **Options:** `All`, `Mapped`, `Pending`, `Inactive` (default: `All` or `Mapped`).
- Selecting `Pending` immediately surfaces the projects that need mapping attention.
- Selecting `Mapped` surfaces all active mappings.

### 3.3 Two-Line Rich Project Identification
- **AGRESSO Column:**
  - Line 1: `A1676` (Bold, `font-medium text-sm text-[var(--ac-grey-900)]`)
  - Line 2: `Scaling Sustainable Rice-Wheat Systems in South Asia…` (`text-xs text-[var(--ac-grey-600)] line-clamp-1` with `[pTooltip]`)
- **CLARISA Column:**
  - Line 1: `B-A1676 (id 1403)` (Bold, `font-medium text-sm text-[var(--ac-grey-900)]`)
  - Line 2: `Sustainable Rice-Wheat Cropping Initiatives…` (`text-xs text-[var(--ac-grey-600)] line-clamp-1` with `[pTooltip]`)

### 3.4 Table Sorting & Layout Refinement
- Remove `Confidence` column.
- Add `pSortableColumn` and `<p-sortIcon>` to `Agreement ID (AGRESSO)`, `CLARISA Project (Bilateral)`, `Source`, `Status`, and `Last Updated`.

### 3.5 High-Contrast `Auto-map` Button
- Style `⚡ Auto-map` with an outlined primary token (`p-button-outlined` / `atc-primary-blue-600 border border-[var(--ac-primary-blue-400)] hover:abc-primary-blue-50`), providing crisp contrast against the white header card while harmonizing with the solid `+ New mapping` button.

---

## 4. Scope

### In Scope

- **Frontend (`client/research-indicators`):**
  - Refactor `bilateral-mapping.component.html`:
    - Remove `Confidence` column.
    - Implement 2-line layout with `[pTooltip]` for AGRESSO and CLARISA cells.
    - Update `Status` column with semantic badges (`Mapped`, `Pending`, `Inactive`).
    - Update Status filter dropdown with options (`All`, `Mapped`, `Pending`, `Inactive`).
    - Add sort icons and `pSortableColumn` to sortable table headers.
    - Restyle `⚡ Auto-map` button for high WCAG contrast.
  - Refactor `bilateral-mapping.component.ts`:
    - Update status filtering and sorting logic.
    - Connect `Pending` status to load unmapped eligible projects from coverage/automapper service.
  - Update `bilateral-project-mapping.interface.ts`:
    - Add `agresso_description?: string | null`, `clarisa_project_full_name?: string | null`, and `mapping_status: 'Mapped' | 'Pending' | 'Inactive'`.
  - Update unit test suite `bilateral-mapping.component.spec.ts`.

- **Backend (`server/researchindicators`):**
  - Update `BilateralProjectMappingService` and Controller:
    - Enrich mapping list queries with `agresso_contracts.description` and `clarisa_project.full_name`.
    - Support filtering by status (`mapped`, `pending`, `inactive`, `all`).
    - Support sorting parameters (`sort_by`, `order`).
  - Update backend unit tests (`bilateral-project-mapping.service.spec.ts`, `bilateral-project-mapping.controller.spec.ts`).

### Non-Goals

- Altering the automapper algorithm or CLARISA external code normalization rules.
- Modifying the underlying database schema migrations (handled via existing TypeORM joins and CLARISA cache).

---

## 5. Visual Reference

- **Source:** User screenshots (`orca-paste-1787272892083-b259ba8e-03da-4c7e-8150-dadd15d1c28b.png` and `orca-paste-1787273185861-0c44d908-b78e-4e2a-973c-73adca29cb93.png`).
- **Target UI Layout:**
  - Header actions: `[ ⚡ Auto-map ]` (Outlined Blue) `[ + New mapping ]` (Solid Blue)
  - Filter Bar: `[ Search... ]` `[ Status: All ▾ | Mapped | Pending | Inactive ]` `[ Source: All sources ▾ ]`
  - Table:
    - Col 1: `Agreement ID (AGRESSO)` (ID + Description) [Sortable]
    - Col 2: `CLARISA Project (Bilateral)` (Code + Title) [Sortable]
    - Col 3: `Source` (Manual / Derived / AI / Unmapped) [Sortable]
    - Col 4: `Status` (Mapped [Green] / Pending [Amber] / Inactive [Gray]) [Sortable]
    - Col 5: `Last Updated` (Date) [Sortable]
    - Col 6: `Actions` (Edit / Deactivate or + Map)

---

## 6. Requirement Delta Preview

### ADDED Requirements

- **Mapping Status Model:** Table and filter support `Mapped`, `Pending`, `Inactive`, and `All`.
- **Project Title / Description Display:** Secondary line in AGRESSO and CLARISA cells with tooltip on truncate.
- **Table Column Sorting:** Sorting by Agreement ID, Project Title, Source, Status, and Date.
- **Pending Row Action:** Quick "+ Map" action on pending (unmapped) projects.

### MODIFIED Requirements

- **Status Filter:** Replaced `Active / Inactive` with business mapping statuses `Mapped / Pending / Inactive / All`.
- **Auto-map Button:** Enhanced visual contrast and outlined primary styling.

### REMOVED Requirements

- **Confidence Column:** Removed from table view.

---

## 7. Approach Options

### Option 1: Unified Mapped + Pending Table Feed (Recommended)
- The list endpoint (or client orchestration service) provides a unified view of Mapped, Pending, and Inactive items, perfectly matching the KPI coverage strip.
- **Pros:** Completely eliminates confusion; enables operators to work through pending items directly from the main table; 100% alignment with user request and domain model.
- **Cons:** Backend query combines mapping table with unmapped CLARISA eligible slice.

### Option 2: Filter-Driven Dual Query
- When status filter is `Mapped` / `Inactive`, query `bilateral_project_mapping`. When status is `Pending`, query the automapper/coverage unmapped candidates.
- **Pros:** Modular, reuses existing automapper candidate resolution.
- **Cons:** Slight difference in paging if combined into 'All'.

---

## 8. Recommended Approach

Adopt **Option 1 / Option 2 unified approach**:
1. Table displays `Mapped` (green), `Pending` (amber), and `Inactive` (gray) statuses.
2. Filter allows filtering by `Mapped`, `Pending`, `Inactive`, or `All`.
3. Cells display 2-line code + project title with tooltip.
4. Confidence column is removed.
5. Headers support column sorting.
6. `⚡ Auto-map` button uses high-contrast outlined primary styling.

---

## 9. Next Step

Upon user approval of this updated proposal, proceed to:

```text
/akili-specify docs/specs/changes/bilateral-mapping-table-enhancements
```

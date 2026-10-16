# Design — Bilateral Module / Bilateral Project Mapping Table Enhancements

- **Module:** bilateral-module / center-admin
- **Spec id:** 2026-08-bilateral-mapping-table-enhancements
- **Status:** in-review
- **Owner:** Platform UI Squad / Center Admin
- **Linked requirements:** ./requirements.md
- **Linked detailed design:** [docs/trd/trd.md](../../../trd/trd.md)
- **Last updated:** 2026-08-20

---

## 1. Goals & Non-Goals

### Goals
1. Provide rich, human-readable context in AGRESSO and CLARISA table cells via a 2-line layout (code + title) with tooltip on hover (R-BTE-002).
2. Remove the unused `Confidence` column to optimize horizontal space (R-BTE-001).
3. Align the table status badges and filter dropdown with the business mapping lifecycle (`Mapped`, `Pending`, `Inactive`, `All`) in sync with the top KPI coverage strip (R-BTE-003).
4. Enable interactive table column sorting for all primary data columns (R-BTE-004).
5. Improve the visual contrast and hierarchy of the `⚡ Auto-map` button in the header using an outlined primary style (R-BTE-005).

### Non-Goals
- Changing the underlying automapper matching algorithm or CLARISA external code normalization rules.
- Modifying the create/edit modal form pickers (which already display rich titles).
- Database schema migrations (TypeORM query joins and existing CLARISA caches are used).

---

## 2. Architecture & System Context

The changes touch two main layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             STAR Angular Client                             │
│                                                                             │
│   BilateralMappingComponent  ───────────►  BilateralMappingService          │
│   (2-line cells, sorting,                  (Unified Mapped/Pending Feed,    │
│    Mapped/Pending badges,                   API contract mapping)           │
│    Outlined Auto-map button)                                                │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTP (JWT Bearer)
┌────────────────────────────────────▼────────────────────────────────────────┐
│                               ARI NestJS Server                             │
│                                                                             │
│   BilateralProjectMappingController                                         │
│                    │                                                        │
│                    ▼                                                        │
│   BilateralProjectMappingService ──── leftJoin ────► agresso_contracts     │
│   (enriched with contract description &              (description /         │
│    CLARISA full name)                                 projectDescription)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 File Composition

#### Frontend (`client/research-indicators`):
- `src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/bilateral-mapping.component.html` — Updated table layout, removed confidence column, 2-line title layout, sort icons, status badges, and styled Auto-map button.
- `src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/bilateral-mapping.component.ts` — Updated filter handlers, pending status integration, and sorting signals.
- `src/app/shared/services/bilateral-mapping.service.ts` — Extended list method and unmapped pending project resolution.
- `src/app/shared/interfaces/bilateral/bilateral-project-mapping.interface.ts` — Extended `BilateralProjectMapping` interface with `agresso_description`, `clarisa_project_full_name`, and `mapping_status`.
- `src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/bilateral-mapping.component.spec.ts` — Unit tests for table rendering, 2-line titles, status filtering, and sorting.

#### Backend (`server/researchindicators`):
- `src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts` — Added `leftJoin` to `agresso_contracts` to select contract description; enriched returned items.
- `src/domain/entities/bilateral-project-mapping/dto/list-bilateral-project-mappings.query.dto.ts` — Added support for `status` filtering (`mapped`, `pending`, `inactive`, `all`).
- `src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.spec.ts` — Unit tests for enriched list queries.

---

## 3. Data Model & Entity Extensions

No MySQL schema migrations required.

The TypeScript view model contract is extended as follows:

```typescript
export type MappingStatus = 'Mapped' | 'Pending' | 'Inactive';

export interface BilateralProjectMapping {
  id: number;
  agresso_agreement_id: string;
  agresso_description?: string | null;
  clarisa_project_id: number;
  clarisa_project_short_name?: string | null;
  clarisa_project_full_name?: string | null;
  source: BilateralMappingSource | 'UNMAPPED';
  confidence_score?: number | null;
  notes?: string | null;
  is_active: boolean;
  mapping_status?: MappingStatus;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}
```

---

## 4. API Surface

### `GET /api/bilateral-project-mappings`

- **Controller:** `BilateralProjectMappingController` (`src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.controller.ts`)
- **Roles:** `CENTER_ADMIN`, `SYSTEM_ADMIN`
- **Query Params:**
  - `page?: number` (default: 1)
  - `limit?: number` (default: 50)
  - `search?: string` (matches `agresso_agreement_id`, `clarisa_project_short_name`, or `agresso_contracts.description`)
  - `status?: 'all' | 'mapped' | 'pending' | 'inactive'`
  - `source?: BilateralMappingSource`
- **Response Data Shape:**
  - `items: BilateralProjectMapping[]` (containing `agresso_description` and `clarisa_project_full_name`)
  - `meta: { total, page, limit, totalPages }`

---

## 5. UI/UX Component Architecture & Design Tokens

### 5.1 Two-Line Cell Design
- **AGRESSO Column:**
  - Primary line: `text-sm font-medium text-[var(--ac-grey-900)]` -> `{{ row.agresso_agreement_id }}`
  - Secondary line: `text-xs text-[var(--ac-grey-600)] line-clamp-1` with `[pTooltip]="row.agresso_description"` -> `{{ row.agresso_description }}`
  - Conditional: Omit Line 2 if `agresso_description` is null/empty.
- **CLARISA Column:**
  - Primary line: `text-sm font-medium text-[var(--ac-grey-900)]` -> `{{ row.clarisa_project_short_name }} (id {{ row.clarisa_project_id }})`
  - Secondary line: `text-xs text-[var(--ac-grey-600)] line-clamp-1` with `[pTooltip]="row.clarisa_project_full_name"` -> `{{ row.clarisa_project_full_name }}`
  - Conditional: Omit Line 2 if `clarisa_project_full_name` is null/empty or identical to short name.

### 5.2 Status Badges
- **`Mapped`:** `.bil-status-badge--mapped` -> `bg-green-50 text-green-700 border border-green-200`
- **`Pending`:** `.bil-status-badge--pending` -> `bg-amber-50 text-amber-700 border border-amber-200`
- **`Inactive`:** `.bil-status-badge--inactive` -> `bg-gray-100 text-gray-600 border border-gray-300`

### 5.3 Action Buttons
- **`⚡ Auto-map`:**
  - Classes: `p-button-outlined !border-[var(--ac-primary-blue-400)] !text-[var(--ac-primary-blue-600)] hover:!bg-[var(--ac-primary-blue-50)] !rounded-[9px] !max-h-[27px] !text-[13px] font-medium`
  - Affordance: High visual contrast, distinctive bolt icon, elegant pairing with solid `+ New mapping`.
- **Pending Row Action (`+ Map`):**
  - Renders a compact button `+ Map` (icon `pi pi-link` or `pi pi-plus`) that triggers `openCreateDialog()` pre-filling the CLARISA project.

### 5.4 Column Sorting
- Attached to `p-table` using `[sortField]` and `[sortOrder]`.
- Headers decorated with `pSortableColumn="field"` and `<p-sortIcon field="field">`.

---

## 6. Design Decisions & Trade-Offs

### DD-1: SQL Left Join for Contract Description
- **Decision:** Perform `leftJoin('agresso_contracts', 'ac', 'ac.agreement_id = bpm.agresso_agreement_id')` in `BilateralProjectMappingService.list()`.
- **Trade-Off:** Adds a single indexed join to the query, eliminating the need for N client lookups.
- **Supersedes:** Direct entity select without contract metadata.

### DD-2: Mapping Lifecycle Status Synchronization (Mapped / Pending / Inactive)
- **Decision:** Shift the status semantics from raw boolean `is_active` to business mapping lifecycle states (`Mapped`, `Pending`, `Inactive`), matching the top coverage strip (Mapped: 198, Pending: 0, Reachable: 198).
- **Trade-Off:** Provides unified operational workflow directly from the table, allowing operators to see and resolve unmapped projects.

### DD-3: Deprecation of Confidence Column
- **Decision:** Remove the `Confidence` column from the table.
- **Reversion Challenge Outcome (Step 2.3):** "What does removing Confidence break?" -> Nothing in the operational workflow. Confidence was only populated for experimental AI suggestions (currently null in production per NFR-CAM-002). Removing it recovers ~120px of table width for project titles.

### DD-4: Outlined Primary Style for `⚡ Auto-map`
- **Decision:** Apply `p-button-outlined` with `var(--ac-primary-blue-*)` tokens to `⚡ Auto-map`.
- **Trade-Off:** Replaces the low-contrast `severity="secondary"` styling with an accessible, high-contrast button that stands out against the white header card.

---

## 7. Budget Sizing (Step 2.4)

- **Expected Tasks:** 4 tasks
- **Expected Total LOC:** ~180 LOC
  - Server: ~40 LOC
  - Client: ~90 LOC
  - Tests: ~50 LOC
- **Expected Review Rounds:** 1 round
- **Budget Tripwire:** If execution exceeds 6 tasks or 350 LOC, the Leader will pause and escalate.

---

## 8. Kaizen Lessons Applied

- **KZ-001 (Assert generated output/DOM):** Component tests will assert rendered HTML elements, tooltips, and sorting icon attributes, not just service mock sequences.
- **KZ-002 (Enumerate by what renders):** Both the table component and the action buttons rendered in the header are included in the scope.
- **KZ-015 (Arrange transitions in fixtures):** Test fixtures will arrange filter change events and verify DOM state transitions.

# Archive Summary — Bilateral Project Mapping Table Enhancements

## 1. Document Control

| Property | Value |
| --- | --- |
| **Original Spec Path** | `docs/specs/changes/bilateral-mapping-table-enhancements` |
| **Archive Date** | 2026-08-20 |
| **Final Status** | completed |
| **Leader** | Antigravity (T1 Architect) |
| **Parent Spec** | None (Standalone change) |

---

## 2. Requirements Delivered

| Requirement ID | Description | Status | Evidence |
| --- | --- | --- | --- |
| **R-BTE-001** | Confidence column removed from table header and body cells | Delivered | Header and `<td>` removed from DOM; verified in unit tests. |
| **R-BTE-002** | Two-line cells for AGRESSO agreements and CLARISA projects with titles & accessible tooltips | Delivered | Left-joined `AgressoContract` & CLARISA cache enrichment; rendered with `[pTooltip]` and `tabindex="0"`. |
| **R-BTE-003** | Mapping lifecycle status model (`Mapped`, `Pending`, `Inactive`, `All`) with semantic badges and quick `+ Map` | Delivered | Status filter and styled badges implemented; unmapped candidates surfaced on `Pending` filter with `+ Map` action. |
| **R-BTE-004** | Interactive column sorting across all primary table headers | Delivered | PrimeNG `pSortableColumn` / `<p-sortIcon>` with custom sort handler on table data. |
| **R-BTE-005** | High-contrast outlined styling for `⚡ Auto-map` button | Delivered | Outlined styling with primary blue tokens (`border-[var(--ac-primary-blue-400)]`). |
| **NFR-BTE-001** | Accessibility & WCAG AA compliance for tooltips and contrast | Delivered | `tabindex="0"`, `role="note"`, and `aria-label` added to tooltips; token colors verified. |
| **NFR-BTE-002** | Visual layout stability & single-line truncation | Delivered | `max-w-[260px]` / `max-w-[280px]` with `truncate` prevents row height explosion. |
| **NFR-BTE-003** | Single query efficiency on backend list endpoint | Delivered | Left join on `AgressoContract` in single SQL query; in-memory CLARISA project resolution. |

---

## 3. Files Changed Summary

### Server (`server/researchindicators`)
- [`bilateral-project-mapping.service.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts): Added `leftJoin(AgressoContract)` to select `ac.description` and `ac.projectDescription` as `agresso_description`. Integrated `@Optional() ClarisaProjectsService` for `clarisa_project_full_name`. Added multi-field search and status filtering.
- [`dto/list-bilateral-project-mappings.query.dto.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/entities/bilateral-project-mapping/dto/list-bilateral-project-mappings.query.dto.ts): Added `status?: string` and defined `EnrichedBilateralProjectMapping`.
- [`bilateral-project-mapping.service.spec.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.spec.ts): Added 15 comprehensive unit tests covering search, join, status filtering, and fallback behavior.

### Client (`client/research-indicators`)
- [`interfaces/bilateral/bilateral-project-mapping.interface.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/shared/interfaces/bilateral/bilateral-project-mapping.interface.ts): Extended model with `agresso_description`, `clarisa_project_full_name`, `mapping_status`, and `status`.
- [`services/api.service.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/shared/services/api.service.ts): Forwarded `status` query parameter.
- [`services/bilateral-mapping.service.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/shared/services/bilateral-mapping.service.ts): Enriched items with `mapping_status` and integrated `previewAutoMap()` to surface `Pending` unmapped candidates with `source: 'UNMAPPED'`.
- [`services/bilateral-mapping.service.spec.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/shared/services/bilateral-mapping.service.spec.ts): Added tests for status query forwarding and pending unmapped candidates aggregation (23/23 tests pass).
- [`pages/bilateral-mapping.component.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/bilateral-mapping.component.ts): Added `statusFilter`, `onSort` custom sorting handler, and `openMapDialogForPending` helper.
- [`pages/bilateral-mapping.component.html`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/bilateral-mapping.component.html): Removed Confidence column; implemented 2-line cells with accessible tooltips (`tabindex="0" role="note"`); added semantic badges (`Mapped` green, `Pending` amber, `Inactive` gray); added `+ Map` button for pending rows; bound table column sorting and styled `⚡ Auto-map` button.
- [`pages/bilateral-mapping.component.spec.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/bilateral-mapping.component.spec.ts): Updated and added tests covering R-BTE-001 through R-BTE-005 and NFR-BTE-001 (88/88 tests pass).

---

## 4. Test & Verification Evidence

| Suite | Tests Executed | Passed | Failed |
| --- | --- | --- | --- |
| `bilateral-project-mapping.service.spec.ts` (Server) | 15 | 15 | 0 |
| `bilateral-mapping.component.spec.ts` (Client) | 88 | 88 | 0 |
| `bilateral-mapping.service.spec.ts` (Client) | 23 | 23 | 0 |
| **Total** | **126** | **126** | **0** |

---

## 5. Review & Audit Verification

- **T-BTE-01:** PASS (Audited by Reviewer `9363ba15-6028-4cbd-ab72-9998685a9a3b`).
- **T-BTE-02:** PASS (Audited by Reviewer `7e9a72eb-f3bd-459b-8bfe-3f316efce662`).
- **T-BTE-03:** PASS (Audited by Reviewer `991dcc6e-2e28-4224-9ed2-32018d71df0f`).
- **T-BTE-04:** PASS (Audited by Reviewer `cd438fc5-ba72-4c3d-bac7-bf54406816b7`).

---

## 6. Accepted Warnings & Follow-Ups

- None. All requirements and design specifications have been fully met and verified.

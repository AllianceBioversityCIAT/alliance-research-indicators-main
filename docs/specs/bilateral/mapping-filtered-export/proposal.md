# Proposal — Bilateral mapping: export the filtered list

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec Path | `bilateral/mapping-filtered-export` |
| Ticket | AC-1797, acceptance criteria §4 (Export filtered list); §3 is a dependency |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Status | Approved 2026-11-05: the owner ran `/akili-specify` after the Q1–Q5 recommendations were presented |
| Date | 2026-11-05 |
| Depends on | `bilateral/mapping-status-in-edit-modal` (merged to `dev`, not archived) |
| Parallel-safe | no — touches `BilateralProjectMappingService.list()`, `activate()` and `deactivate()` |

## 2. Intent

Let a Center Admin download the bilateral mapping list as Excel, with the Search, Status and Source filters applied, so that the Alliance can answer the System Office about why specific projects did not deliver.

## 3. Problem / Current Behavior

- There is no export for this module. `git grep` for `exportExcel|exportFiltered|/export` over the server module and the client page returned 0 hits, on this branch and on `origin/dev`.
- The page holds one page of rows: `limit` defaults to 20 (`bilateral-mapping.component.ts:122`) and the list endpoint caps `limit` at 200 (`list-bilateral-project-mappings.query.dto.ts:30`).
- The Pending view is built in the client, from `previewAutoMap()` (`bilateral-mapping.service.ts:31-60`). The server answers `status=pending` with `1 = 0` (`bilateral-project-mapping.service.ts:101`).
- The Pending branch ignores `source` and searches other fields than the server (`bilateral-mapping.service.ts:37-45`).
- `ReportsController` declares `@UseGuards(RolesGuard)` with no class-level `@Roles` (`reports.controller.ts:39`), and `RolesGuard` allows a handler with no roles (`roles.guard.ts:18`).
- Two ticket columns have no reliable source. `bilateral_project_mapping` has no status-change columns (`bilateral-project-mapping.entity.ts`). `updated_by` and `updated_at` change on every edit, for example a notes change (`bilateral-project-mapping.service.ts:222-240`). `deleted_at` is set on inactivate and cleared on activate, so it gives a date only for a currently Inactive row.
- The ticket's §3 "?" icon on the Inactive badge is not implemented (`bilateral-mapping.component.html:276-281`: a plain badge).
- Science Program allocations are not in the list response. They exist in the CLARISA feed as `project_mappings_array`, and the picker already trims them (`clarisa-projects.controller.ts:104-116`).

## 4. Proposed Outcome

An **Export to Excel** button next to Auto-map and New mapping downloads `Bilateral_Mapping_<year>_<yyyymmdd>.xlsx`. It contains exactly the rows that match the filters on screen, across all pages, with the ticket's columns.

## 5. Scope

- `GET /api/reports/bilateralMapping/xlsx` with `search`, `status`, `source`, guarded by `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` on the method.
- One filter path shared by the list and the export.
- Pending rows built on the server, with the same search behavior as today's client.
- Science Program allocations resolved from the cached CLARISA feed.
- `status_changed_by` and `status_changed_at` on `bilateral_project_mapping`, written only on a real status transition. **This adds a migration** (see Q1).
- Export button with a loading state and an error message.

## 6. Non-Goals

- Sorting the export by the column sorted on screen. The ticket does not ask for it; the export keeps the server's `updated_at DESC`.
- A year selector. The export uses the same reporting year as the list.
- Registering the export in `ReportHandlerRegistry`. Its contract takes the results-specific `FullFiltersReportDto`.
- Status-change history. The ticket keeps only the last change.
- Moving the client's on-screen Pending list to the server endpoint.
- Reviewing the ticket's §2 (results of an inactive project). See Risks.

## 7. Affected Users, Systems, And Specs

| Area | Effect |
| --- | --- |
| Center Admin, System Admin | New button and download |
| `reports` module | New handler, new generation method, new controller route; imports `BilateralProjectMappingModule` |
| `bilateral-project-mapping` module | Shared filters, Pending rows, status audit on activate/deactivate |
| `bilateral_project_mapping` table | Two nullable columns |
| Client `bilateral-mapping` page and `ApiService` | Button and blob call |
| `bilateral/mapping-status-in-edit-modal` | Its traceability gap against ticket §3 closes here |

## 8. Visual Reference

- Source: None.
- Location: n/a.
- Notes: one button in an existing toolbar, using the same `p-button` pattern as Auto-map. A mockup adds nothing. The workbook reuses the banner pattern of the PI Delegates export (`pi-delegates-export.service.ts:209-247`).

## 9. Requirement Delta Preview

### ADDED Requirements

- Export button next to Auto-map and New mapping (ticket §4).
- The export honors Search, Status and Source. With no filters it holds the whole list for the reporting year.
- Columns, from the ticket: Agreement ID (AGRESSO), Agresso project name, CLARISA Project (Bilateral), Science Program allocations, Source, Status, Reporting year, Notes / Justification, Status changed by, Status change date, Last Updated.
- File name carries the reporting year and the export date, for example `Bilateral_Mapping_2026_20261020.xlsx`.
- Only Center Admin and System Admin can export. A user without the role is rejected.
- The system stores the user and date of the last status change (ticket §3).

### MODIFIED Requirements

- `activate()` and `deactivate()` also write the status audit on a real transition, and not on idempotent calls.
- `list()` uses the shared filter path, with unchanged behavior.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Summary | Cost | Verdict |
| --- | --- | --- | --- |
| **A. Server export under `reports` + audit columns** | One request, real status audit, ticket columns are truthful | One migration, more server work | **Recommended** |
| B. Server export, no migration | Fill the status columns from `updated_by`/`updated_at` | A later notes edit changes "Status changed by" and the Excel states something false | Rejected |
| C. Client export with `exceljs` | Loop pages at 200, build the file in the browser | First client-built workbook, heavier bundle, still lacks allocations and status audit | Rejected |

## 11. Recommended Approach

Option A, because it is the smallest path whose output is true. `reports` builds the workbook, and `BilateralProjectMappingService` keeps the data and filters. A dedicated handler in `reports/handlers/bilateral-mapping/` uses `ExcelWorkbookBuilder`, as PI Delegates does.

## 12. Risks, Dependencies, And Open Questions

### Risks

| Risk | Mitigation |
| --- | --- |
| Omitting `@Roles` exposes the data to any authenticated user | Negative test, observed red first (K-004) |
| Extracting the filters regresses `list()`, a working endpoint | Assert the generated SQL, not the call sequence: a mocked query builder cannot show operator precedence (`staging` lineage KZ-001, KZ-017) |
| Pending rows diverge between screen and Excel | Parity tests over the same fixture |
| CLARISA is unavailable during the export | `list()` swallows this today, which would give empty allocations silently. Decide in `/akili-specify` whether to fail or to mark the file |
| `AutomapperService.resolve()` can throw 422 (`automapper.service.ts:135-141`) | The button shows the error |
| The CLARISA feed is cached, so allocations can lag (K-016) | State the window in the verification steps |
| Rows inactivated before the migration have no audit | See Q2 |
| Export volume is unmeasured | Measure row count and duration on Dev |
| Ticket §2 is unverified. The pool funding predicate honors `is_active` (`pool-funding.util.ts:28`), but "not synchronized to PRMS" and the read-only or hidden section were not checked | Owner decides whether to audit it separately |

### Open Questions for the owner

| # | Question | Recommendation |
| --- | --- | --- |
| Q1 | Accept the migration for `status_changed_by` and `status_changed_at`? | Yes. Without it, two ticket columns are unreliable |
| Q2 | Existing Inactive rows: leave the audit blank, or fill the date from `deleted_at`? | Fill the date, leave the user blank: `updated_by` may be a later editor |
| Q3 | The ticket has one "Notes / Justification" column, written when both were one field. They are now separate. One column or two? | Two: Notes and Justification. It deviates from the ticket's text but loses nothing |
| Q4 | Export Pending rows when that filter is active? | Yes, so the file matches the screen. The status audit and notes stay blank |
| Q5 | Include the ticket's §3 "?" tooltip on the Inactive badge in this spec? It uses the same data | Yes. It is small and would otherwise stay undone in AC-1797 |

## 13. Success Criteria

- A filter combination on screen gives the same rows in the Excel, including beyond the first page.
- Status changed by and Status change date stay unchanged after a notes-only edit.
- A user without the role cannot download the file, proven by a test observed failing first.
- `list()` responses are unchanged for every filter combination.
- The file name matches the ticket's pattern.

## 14. Next Step

```text
/akili-specify bilateral/mapping-filtered-export
```

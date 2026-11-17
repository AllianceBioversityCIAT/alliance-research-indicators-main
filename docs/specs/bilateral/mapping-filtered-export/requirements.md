# Requirements — Bilateral / Mapping filtered export

- **Module:** bilateral (server `reports` + `bilateral-project-mapping`; STAR client page `administration/center-admin/bilateral-mapping`)
- **Spec id:** 2026-11-mapping-filtered-export
- **Status:** draft
- **Depth:** Full (migration, authorization and a new API surface)
- **Type:** Change
- **Deliverable:** software
- **Approval Mode:** gated
- **Owner:** David Casañas
- **Linked PRD section:** `docs/prd.md` — Center Admin / Bilateral Mapping
- **Linked tickets:** AC-1797, acceptance criteria §4 (Export filtered list) and §3 (Traceability and visibility)
- **Extends:** `docs/specs/bilateral/mapping-status-in-edit-modal`
- **Last updated:** 2026-11-05

---

## Executive Summary

A Center Admin downloads the bilateral mapping list as Excel with one click. The file holds every row that matches the Search, Status and Source filters on screen, not only the visible page.

The ticket's columns include who changed a status and when, and that data does not exist reliably today. This spec therefore also stores the last status change and shows it on the Inactive badge, which closes AC-1797 §3.

| Decision | Value |
| --- | --- |
| Endpoint | `GET /api/reports/bilateralMapping/xlsx` |
| Who | Center Admin, System Admin |
| Data change | One migration, two nullable columns |
| Sheet | 12 columns: the ticket's 11, with Notes and Justification split |

---

## 1. Context

**Why now:** the System Office may ask why specific projects did not deliver, so each inactivation must be consultable and exportable (AC-1797 Context).

**Current behavior:**

- No export exists. `git grep -nE 'exportExcel|exportFiltered|/export'` over the server module and client page returned 0 hits on this branch and on `origin/dev`.
- The page holds one page of 20 rows (`bilateral-mapping.component.ts:122`). The list endpoint caps `limit` at 200 (`list-bilateral-project-mappings.query.dto.ts:30`).
- Pending rows are built in the client from the auto-map preview (`bilateral-mapping.service.ts:31-60`). The server answers `status=pending` with no rows (`bilateral-project-mapping.service.ts:101`).
- The status filter "All" returns Mapped and Inactive rows, not Pending (`bilateral-project-mapping.service.ts:94-105`).
- `is_active` changes only in `activate()` and `deactivate()` for existing rows (`bilateral-project-mapping.service.ts:265`, `:310`). The `is_active: true` writes at `:405` and `automapper.service.ts:503` are inserts (`design.md` P-4).
- `updated_by` and `updated_at` change on any edit (`bilateral-project-mapping.service.ts:222-240`).
- The Inactive badge is plain text (`bilateral-mapping.component.html:276-281`).

**Surface that renders on the route:** the header toolbar (Auto-map, New mapping), the coverage strip, the filters, the table with its badges, and the Edit dialog. This spec changes the toolbar and the Inactive badge.

**Not changing:** the on-screen list, its Pending view, the Edit modal, and the coverage counters.

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Mapping | One row of `bilateral_project_mapping`: an AGRESSO agreement linked to a CLARISA project for one reporting year |
| Pending row | A CLARISA project with no mapping yet, computed from the auto-map preview. It is not stored |
| Status change | A real transition between Mapped and Inactive. A repeated call that leaves the status unchanged is not one |
| Status audit | The user and date of the last status change |
| Reporting year | The year the list is scoped to, resolved by the server. The UI has no year selector |

---

## 3. Stakeholders / Personas

| Persona | Need |
| --- | --- |
| Center Admin | Export the list and see why a mapping was inactivated |
| System Admin | Same access; bypasses role checks |
| System Office | Receives the answers; does not use the module |

---

## 4. Functional Requirements

### R-MFE-001 — Export endpoint and authorization

The system SHALL provide `GET /api/reports/bilateralMapping/xlsx`, restricted to Center Admin and System Admin.

- **Inputs:** optional query params `search`, `status`, `source`.
- **Output:** an `.xlsx` attachment, not the `ServerResponseDto` envelope.
- **Errors:** forbidden for a user without the role.
- **Permissions:** `CENTER_ADMIN`, `SYSTEM_ADMIN`.

#### Scenario: Allowed role

- GIVEN a user with the Center Admin role
- WHEN they request the endpoint
- THEN the response is an `.xlsx` file
- AND the same holds for System Admin

#### Scenario: Denied role

- GIVEN an authenticated user with neither role
- WHEN they request the endpoint
- THEN the request is forbidden
- BUT it must NOT return any mapping data

**Acceptance criteria:**

- [ ] AC.1 — Center Admin and System Admin receive the file.
- [ ] AC.2 — Any other authenticated user is forbidden, through the real guard and route metadata.
- [ ] AC.3 — The endpoint appears in Swagger under the Reports tag.

### R-MFE-002 — The export honors the filters

For Status values All, Mapped and Inactive, the export SHALL hold exactly the rows the list holds for the same Search and Source, across all pages. Status = Pending follows R-MFE-003, because the list endpoint returns no Pending rows.

#### Scenario: Filtered list larger than one page

- GIVEN 25 Mapped rows and a filter that matches all of them
- WHEN the admin exports
- THEN the file holds 25 data rows
- BUT it must NOT stop at the page size or at the list's limit of 200

#### Scenario: No filters

- GIVEN no filter is applied
- WHEN the admin exports
- THEN the file holds all Mapped and Inactive rows of the reporting year
- AND IT MUST hold the same rows the "All" view lists

#### Scenario: Nothing matches

- GIVEN a filter that matches no rows
- WHEN the admin exports
- THEN the file holds the header row and no data rows
- BUT it must NOT fail

**Acceptance criteria:**

- [ ] AC.1 — For each combination of Search, Source and Status other than Pending, the export's set of rows equals the list's. Order is not part of this criterion.
- [ ] AC.2 — More than 200 matching rows are all exported.
- [ ] AC.3 — An empty result still downloads a valid file.

### R-MFE-003 — Pending rows in the export

When the Status filter is Pending, the export SHALL hold the same Pending rows as the screen.

#### Scenario: Pending filter

- GIVEN the auto-map preview returns candidates in its to-create, ambiguous and unresolved groups
- WHEN the admin exports with Status = Pending
- THEN the file holds one row per candidate
- AND Status reads "Pending"
- AND Justification, Notes, Status changed by and Status change date are blank

#### Scenario: Pending with Search

- GIVEN Status = Pending and a Search term
- WHEN the admin exports
- THEN the term matches the project short name, the full name or the derived contract id, ignoring case
- AND IT MUST match the rows the screen shows

#### Scenario: CLARISA returns no projects

- GIVEN CLARISA responds with no eligible projects
- WHEN the admin exports with Status = Pending
- THEN the file holds the header row, no data rows, and the notice of R-MFE-011

#### Scenario: Pending with Source

- GIVEN Status = Pending and a Source value
- WHEN the admin exports
- THEN the Source value is ignored, as it is on screen

**Acceptance criteria:**

- [ ] AC.1 — The rows equal the screen's for the same fixture.
- [ ] AC.2 — The Search matches the same three fields.
- [ ] AC.3 — A CLARISA error or timeout with no feed for the year cached, or the automapper guard, gives an error response, never a file. When a feed for the year is cached, Pending uses it, as the other statuses do.

### R-MFE-004 — Workbook columns

The workbook SHALL hold these columns, in this order:

| # | Column | Value |
| --- | --- | --- |
| 1 | Agreement ID (AGRESSO) | The agreement id |
| 2 | Agresso project name | The agreement's description |
| 3 | CLARISA Project (Bilateral) | The project name |
| 4 | Science Program allocations | Each Science Program with its percentage |
| 5 | Source | The label shown on screen |
| 6 | Status | Mapped, Inactive or Pending |
| 7 | Reporting year | The row's year |
| 8 | Justification | The last recorded justification. On a row reactivated with no justification, it is the earlier inactivation reason |
| 9 | Notes | The mapping notes |
| 10 | Status changed by | The user's name |
| 11 | Status change date | The date of the last status change |
| 12 | Last Updated | The row's last update date, moved by any edit |

#### Scenario: Inactive row

- GIVEN a mapping inactivated with a justification and with separate notes
- WHEN it is exported
- THEN Justification and Notes hold their own values
- BUT it must NOT merge them into one column

#### Scenario: Project with several Science Programs

- GIVEN a CLARISA project with two Science Programs and their allocations
- WHEN it is exported
- THEN one cell lists both with their percentages

**Acceptance criteria:**

- [ ] AC.1 — The real generated file has the 12 columns in this order.
- [ ] AC.2 — Each column holds the value in the table above for a known row.
- [ ] AC.3 — A row with no value shows a blank cell, not `null` or `undefined`.

### R-MFE-005 — File name

The file SHALL be named `Bilateral_Mapping_<reporting year>_<yyyymmdd>.xlsx`, for example `Bilateral_Mapping_2026_20261020.xlsx`. The date is in UTC.

**Acceptance criteria:**

- [ ] AC.1 — The downloaded file has that name, with the export's reporting year and date.
- [ ] AC.2 — The name holds the year even when the coverage strip has not reported one to the page.
- [ ] AC.3 — The file name never depends on data rows: an empty export is named the same way.

### R-MFE-006 — The list keeps its behavior

The list endpoint SHALL behave exactly as it does today after the filters are shared with the export.

#### Scenario: Existing list request

- GIVEN any combination of `page`, `limit`, `search`, `status`, `is_active` and `source`
- WHEN the list is requested
- THEN rows, order, and pagination metadata are the same as before
- BUT it must NOT change how the search groups with the other filters

**Acceptance criteria:**

- [ ] AC.1 — The generated SQL keeps the search condition grouped inside its parentheses.
- [ ] AC.2 — Existing list tests stay green with no change to their expectations.

### R-MFE-007 — Store the last status change

The system SHALL store the user and date of the last status change on each mapping.

#### Scenario: Inactivate

- GIVEN a Mapped mapping
- WHEN a user inactivates it
- THEN the user and date are stored

#### Scenario: Reactivate

- GIVEN an Inactive mapping
- WHEN a user reactivates it
- THEN the stored user and date are replaced with the new ones

#### Scenario: Edit with no status change

- GIVEN a mapping with a stored status change
- WHEN another user edits its notes or project
- THEN the stored user and date stay the same
- AND IT MUST hold for a repeated activate or deactivate call that changes no status

**Acceptance criteria:**

- [ ] AC.1 — Both directions store the acting user and the date.
- [ ] AC.2 — A notes edit, a project edit and an idempotent status call leave them unchanged.
- [ ] AC.3 — No history is kept.
- [ ] AC.4 — The change applies to the record of that reporting year only.
- [ ] AC.5 — Any authorized call to the activate and deactivate endpoints is stored the same way. Whether the `/admin` panel can authenticate to them is out of scope.

### R-MFE-008 — Rows that changed before this spec

Existing Inactive mappings SHALL show their inactivation date, with the user blank. Existing Mapped mappings SHALL show both blank.

#### Scenario: Existing Inactive row

- GIVEN a mapping inactivated before the migration
- WHEN the migration runs
- THEN its status change date is its inactivation date
- BUT it must NOT take the user from the last editor

**Acceptance criteria:**

- [ ] AC.1 — After the migration, Inactive rows hold the date and a blank user.
- [ ] AC.2 — Mapped rows hold both blank.
- [ ] AC.3 — Reverting the migration removes the two columns and changes nothing else.

### R-MFE-009 — Export button

The page SHALL show an **Export to Excel** button next to Auto-map and New mapping.

#### Scenario: Export with filters

- GIVEN filters on screen
- WHEN the admin presses the button
- THEN the export uses those filters
- AND the file downloads

#### Scenario: Export in progress

- GIVEN an export is running
- WHEN the admin looks at the button
- THEN it shows a loading state
- BUT it must NOT start a second export

#### Scenario: Export fails

- GIVEN the server returns an error
- WHEN the export ends
- THEN the page shows an error message and the button is usable again
- BUT it must NOT download a file

**Acceptance criteria:**

- [ ] AC.1 — The request carries the Search, Status and Source on screen. "All" sends no filter.
- [ ] AC.2 — A second press during an export starts no request.
- [ ] AC.3 — An error shows exactly one message, with the server's text when it has one, and resets the button.

### R-MFE-010 — Status change on the Inactive badge

The Inactive badge SHALL show a "?" icon. Hovering or focusing it SHALL show the justification, the user and the date of the last status change.

#### Scenario: Row with full data

- GIVEN an Inactive mapping with all three values
- WHEN the admin hovers or focuses the icon
- THEN all three show

#### Scenario: Row with partial data

- GIVEN an Inactive mapping from before this spec
- WHEN the admin hovers or focuses the icon
- THEN only the values that exist show
- BUT it must NOT print `null`, `undefined` or an empty label

**Acceptance criteria:**

- [ ] AC.1 — The icon appears only on Inactive rows.
- [ ] AC.2 — The icon is reachable by keyboard and has an accessible name.
- [ ] AC.3 — The list response carries what the tooltip needs.

### R-MFE-011 — CLARISA unavailable

When the Science Program allocations cannot be resolved for All, Mapped or Inactive rows, the export SHALL still download and SHALL say so inside the file. Pending follows R-MFE-003 AC.3 instead.

#### Scenario: CLARISA fails with Status other than Pending

- GIVEN CLARISA returns an error, or gives no answer within 10 seconds
- AND no CLARISA feed for the reporting year is cached
- WHEN the admin exports All, Mapped or Inactive rows
- THEN the file downloads with its rows
- AND a visible notice says allocations and CLARISA names could not be loaded
- BUT it must NOT look like the projects have no allocations

#### Scenario: CLARISA returns no projects

- GIVEN CLARISA responds with no eligible projects
- WHEN the admin exports
- THEN the file holds the same notice

**Acceptance criteria:**

- [ ] AC.1 — The real file holds the notice on an error or a timeout when no feed for the year is cached, and always on an empty response. It holds no notice when CLARISA returns projects, or when a cached feed for the year is served after an error or a timeout.
- [ ] AC.2 — The 10-second limit applies to the export only. The list keeps its behavior.

---

## 5. Non-Functional Requirements

### NFR-MFE-001 — Single request, visible wait

- **Category:** performance
- **Target:** one HTTP request per export; ≤ 15 s for the Dev list, including a cold CLARISA fetch, which is bounded at 10 s. The target is provisional, because the volume is unmeasured.
- **How verified:** measured at the HITL with the row count and time recorded in `execution.md`. The loading state of R-MFE-009 covers the wait.

### NFR-MFE-002 — Authorization is declared on the handler

- **Category:** security
- **Target:** the handler carries its own role declaration, because the reports controller has no class-level roles (`reports.controller.ts:39`, `roles.guard.ts:18`).
- **How verified:** a test that reads the real route metadata and a negative test through the real guard.

### NFR-MFE-003 — Accessibility and tokens

- **Category:** a11y
- **Target:** the button and the "?" icon are keyboard reachable with accessible names. No new hex literals.
- **How verified:** component tests and code review; rendering at the HITL.

---

## 6. Data requirements

Two nullable fields on `bilateral_project_mapping`: the user and the date of the last status change. The migration fills the date for rows that are currently Inactive.

---

## 7. API surface delta

| Change | Surface |
| --- | --- |
| New | `GET /api/reports/bilateralMapping/xlsx` |
| Additive | Every response that returns a mapping gains the stored status audit. The list also gains the user's name |
| Additive | CORS exposes `Content-Disposition` |
| Unchanged | Every request body, and the rest of each response |

---

## 8. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| Export open to any authenticated user | Test on real route metadata plus negative guard test, each observed red by removing the declaration |
| Filter regression in the list (operator precedence) | Assertion on the generated SQL. A mocked query builder cannot show this (`staging` lineage KZ-001, KZ-017) |
| Export and list disagree | Parity test over one fixture through both paths |
| Pending differs from the screen | Parity test against the client's rules over one fixture |
| Status audit overwritten by an ordinary edit | Service tests, observed red with the audit written on every save |
| Wrong columns or order | Test that parses the real workbook buffer |
| Empty CLARISA data reads as "no allocations" | Tests with failing, never-resolving and empty CLARISA stubs, parsing the real workbook |
| Module wiring fails at boot | Mocked specs cannot see it. Boot the server once in the task that wires the modules |
| Two error toasts | Interceptor test on the route, plus a component test counting toasts |
| Compile-only defects in specs | `npm run build` does not cover spec files, so run the client `tsc -p tsconfig.spec.json`, proven able to fail (K-004) |
| Migration wrong on real data | Up and down run by hand on a scratch schema. The disposable harness is broken at `CreatePiDelegates1787600000000` (`mapping-status-in-edit-modal` execution notes) |
| Spreadsheet renders badly in Excel | **No automated gate.** Owner opens the real file at the HITL |
| Tooltip and button look wrong | **No automated gate.** jsdom cannot evaluate rendering. Owner checks light and dark at the HITL |
| Filter state sent differs from what the user sees | Component test on the transition: change the filter, then export (KZ-015) |

---

## 9. Assumptions, dependencies, risks

| Item | Note |
| --- | --- |
| Owner decisions | Running `/akili-specify` on 2026-11-05 was taken as approval of the proposal's Q1–Q5 recommendations. The owner can correct any of them at this gate |
| Ticket deviations | (1) "Notes / Justification" is split in two, because `mapping-status-in-edit-modal` separated the fields. (2) Last Updated moves on any edit, not only on status changes; the exact date is in Status change date. (3) Justification shows the last recorded text, so it can predate a reactivation |
| Judgment decisions | The owner chose "Fix and Re-judge" on 2026-11-05 and left the five recommendations in place. Taken as approved: deviations 2 and 3 above, AC.5 at endpoint level, a 10-second limit for the export only, and UTC dates |
| Dependency | `mapping-status-in-edit-modal` delivered `status_justification` |
| Migration | The migration must reach a database before code that reads the columns. Dev cannot meet that exactly: the pipeline migrates after the new container starts, and the short window is accepted (`design.md` §11, DD-16) |
| CLARISA cache | Allocations can lag the feed by the cache window (K-016). State it at the HITL so it does not read as a defect |
| Ticket §2 | Results of an inactive project are out of scope and unverified |

---

## 10. Open questions

None blocking.

---

## 11. Requirement ID Index

| ID | Title |
| --- | --- |
| R-MFE-001 | Export endpoint and authorization |
| R-MFE-002 | The export honors the filters |
| R-MFE-003 | Pending rows in the export |
| R-MFE-004 | Workbook columns |
| R-MFE-005 | File name |
| R-MFE-006 | The list keeps its behavior |
| R-MFE-007 | Store the last status change |
| R-MFE-008 | Rows that changed before this spec |
| R-MFE-009 | Export button |
| R-MFE-010 | Status change on the Inactive badge |
| R-MFE-011 | CLARISA unavailable |
| NFR-MFE-001 | Single request, visible wait |
| NFR-MFE-002 | Authorization is declared on the handler |
| NFR-MFE-003 | Accessibility and tokens |

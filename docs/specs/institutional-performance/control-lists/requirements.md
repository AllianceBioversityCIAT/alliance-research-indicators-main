# Requirements — Institutional Performance / Control Lists

- **Module:** institutional-performance (new) — server + client
- **Spec id:** 2026-09-control-lists
- **Status:** draft
- **Depth:** Standard (new module, new tables and API, one migration + seed; no change to existing data or screens)
- **Owner:** Hector F. Tobón (requester) · PISA4 / Strategy Refresh
- **Parent spec:** [`../family.md`](../family.md) — child 1 of 5; shared rules **F-1 … F-9** apply and are cited, not restated
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — Center Admin tools
- **Linked tickets:** [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258)
- **Proposal:** [`proposal.md`](proposal.md) — this spec stays aligned with it
- **Approval Mode:** `gated`
- **Last updated:** 2026-09-26 (Adjust round 1: key naming — no portfolio segment; qualified reference added. Judgment-day J-2: unconfigured portfolios stay selectable)

---

## 1. Executive summary

Admins get a new page, *Center admin › Portfolio Management › Control Lists*. On it they manage, **per portfolio**, categories of lists, the lists themselves and their values. Two seeded categories ship with it: **Key Performance Indicators (KPIs)**, with 5 lists, and **Organizational structure**, with the list of 4 levels. Other modules read a list by its fixed **system key**. A value that other records use cannot be deleted, only deactivated. This child also delivers two things its siblings reuse: the **nested Portfolio Management menu group** (F-3) and the **table standard** (F-7).

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Category** | A named group of lists, e.g. *Key Performance Indicators (KPIs)* |
| **List** | A named set of values, identified within its portfolio by an immutable **system key** (e.g. `org.level`) that code uses to read it |
| **Qualified reference** | Display-only label `P<portfolio id> · <key>` (e.g. `P2 · org.level`), computed, never stored |
| **System list** | A list that a module reads; created by the system (seed/migration), never deletable |
| **Custom list** | A list an admin creates; exists with no form linked until development links it |
| **Value** | One entry in a list: code, value, description, display order, active flag |
| **In use** | A value is referenced by at least one record of a consuming module |
| **Consumer** | A module that reads a list by key and stores value ids (first consumer: `organizational-structure`) |
| **Admin** | A user who passes F-1: Center Admin (role 9 with focus 1) or System Admin (role 1) |

## 3. System context & scope

| # | Current behavior | Evidence |
| --- | --- | --- |
| C-1 | KPI vocabularies exist only as drop-down sheets in Excel. | tracking tool *Control Lists* sheet; Master Monitoring Framework *08. Control Lists* (read 2026-09-25) |
| C-2 | No admin-managed, portfolio-scoped list of values exists in STAR. | `UNVERIFIED — confirm at source before relying on it` (settled in design Premise Ledger) |
| C-3 | Center admin pages are guarded by `centerAdminGuard` → `canAccessCenterAdmin`, which admits role 1, or role 9 with `focus_id = 1` and `sec_role_id = 9`. | `client/research-indicators/src/app/shared/services/cache/roles.service.ts:34,51-63` |
| C-4 | Server admin handlers use `@Roles(...)` + `RolesGuard`; `SYSTEM_ADMIN` bypasses role checks. Portfolio creation also admits `TECHNICAL_SUPPORT`. | `server/…/domain/entities/portfolios/portfolios.controller.ts:36-40`; root `CLAUDE.md` §4.1 |
| C-5 | Center admin children are declared in the sidebar as one flat level under *Center admin*. | `client/…/shared/components/alliance-sidebar/alliance-sidebar.component.ts:54-75` |
| C-6 | No existing table offers resizable columns; 5 of 10 have a paginator; export exists only in Results Center and My Projects. | inventory run 2026-09-26 (`grep -rl "<p-table"` + per-file counts over `client/…/src/app`); `../family.md` §5 |

**In scope:** categories, lists and values per portfolio; in-use protection; the nested menu group; the table standard as a reusable client pattern; `.xlsx` export of values; seed data.

**Not changing:** existing Center admin items and pages (including Portfolio Management), existing tables (`../family.md` §5), CLARISA vocabularies, global (cross-portfolio) lists.

## 4. Stakeholders / personas

| Persona | Role here |
| --- | --- |
| Center Admin (PRD persona "Center Admin") | Creates and maintains categories, lists and values |
| System Admin | Same rights, plus the role-check bypass |
| PISA4 / Strategy team | Decides the values (via the admin) |
| Consuming modules | Read lists by key: organizational-structure (levels), institutional-indicators (KPI lists) |

---

## 5. Functional requirements

### R-CTL-001 — Portfolio-scoped control lists

- **As an** Admin **I want** every category, list and value to belong to one portfolio **so that** each strategy period keeps its own vocabulary.

**Details**
- Behavior: every read and write is filtered by the selected portfolio. The page's portfolio selector defaults to the portfolio whose start/end years contain the current year. **Every portfolio stays selectable**; a portfolio with no categories carries the label *not configured* and opens on an empty state with **+ New category**, so its first category can be created from the page (F-2; design D-CTL-10).
- Errors: a request for a portfolio that does not exist → `404`; a write without a portfolio → `400`.

#### Scenario: Lists are isolated per portfolio
- GIVEN Portfolio 2 has a list `kpi.direction` with 3 values
- WHEN an Admin reads Control Lists for Portfolio 2
- THEN the 3 values are returned
- BUT it must NOT return any category, list or value of another portfolio
- AND IT MUST reject a write that names a portfolio id different from the parent list's portfolio (`400`)

#### Scenario: Default portfolio
- GIVEN today is in 2026 and Portfolio 2 covers 2026–2030
- WHEN the page opens
- THEN Portfolio 2 is selected
- AND Portfolio 1 appears as *not configured*
- AND IT MUST stay selectable, opening on an empty state with **+ New category**

**Acceptance criteria**
- [ ] AC.1 — `GET` endpoints return only rows of the requested `portfolioId` (envelope `status 200`, `data: array`).
- [ ] AC.2 — A value created under a list of Portfolio 2 cannot be read under Portfolio 1.

### R-CTL-002 — Categories CRUD

- **As an** Admin **I want** to create, rename and delete categories **so that** lists are grouped by the part of the system that uses them.

**Details**
- Inputs: name (required, 1–150 chars, unique per portfolio, case-insensitive), description (optional, ≤ 500).
- Behavior: a category can be deleted only when it has no lists.
- Outputs: the category with its id, name, description, list count.

#### Scenario: Delete a non-empty category
- GIVEN the category *Organizational structure* holds 1 list
- WHEN an Admin deletes it
- THEN the request fails with `409` and a description naming the blocking lists
- BUT it must NOT delete the category or any list

#### Scenario: Duplicate name
- GIVEN a category *Key Performance Indicators (KPIs)* exists in Portfolio 2
- WHEN an Admin creates *key performance indicators (kpis)* in Portfolio 2
- THEN the request fails with `409` and the field error names `name`

**Acceptance criteria**
- [ ] AC.1 — Create → `201`; update → `200`; delete of an empty category → `200`.
- [ ] AC.2 — Delete of a non-empty category → `409`, nothing removed.

### R-CTL-003 — Lists CRUD with an immutable system key

- **As an** Admin **I want** to create lists and edit their name, description and category **so that** new vocabularies can be prepared without a deployment.

**Details**
- Inputs: name (required, 1–150), system key (required on create, pattern `^[a-z0-9_.]{2,100}$`, unique per portfolio), category (required), description (optional ≤ 500).
- Behavior: the **system key names the list's meaning, not its portfolio** — it carries no portfolio or year segment. The same key exists once per portfolio (e.g. `org.level` in Portfolio 1 and in Portfolio 2), and consumers read by `(portfolio, key)` (R-CTL-006). Rationale: portfolio years are editable data (Portfolio 1 moved from 2021–2025 to 2010–2025 — migration `1783024745006-UpdatePortfolio1Years.ts`), so a year inside an immutable key would become false; and a portfolio-bearing key would force code changes for every new portfolio and a rename on every copy.
- Display: wherever a list is identified, the UI shows a **qualified reference** built at read time from the portfolio's id and the key — `P2 · org.level`. It is never stored.
- The **system key never changes after creation**. A list is a **system list** when it was created by the system; system lists cannot be deleted. A custom list can be deleted only when it has no values. Moving a list to another category of the same portfolio is allowed. Each list shows *Used by* — the consumer(s) that read it, or *Not linked to a form yet*.

#### Scenario: System key is fixed
- GIVEN the list `org.level` exists
- WHEN an Admin sends an update containing a different system key
- THEN the request fails with `400`
- AND IT MUST keep the key `org.level`

#### Scenario: Same key in two portfolios
- GIVEN `org.level` exists in Portfolio 2
- WHEN an Admin creates `org.level` in Portfolio 1
- THEN it is created (`201`) and each portfolio reads its own list
- AND the list header shows `P1 · org.level` and `P2 · org.level` respectively
- BUT it must NOT accept a second `org.level` inside the same portfolio (`409`)

#### Scenario: System list cannot be deleted
- GIVEN `kpi.unit_of_measure` is a system list
- WHEN an Admin deletes it
- THEN the request fails with `409`
- BUT it must NOT remove the list or its values

#### Scenario: Custom list lifecycle
- GIVEN an Admin created `kpi.data_source` with no values
- WHEN they delete it
- THEN it is removed (`200`)

**Acceptance criteria**
- [ ] AC.1 — Create returns `201` with `is_system = false` for admin-created lists.
- [ ] AC.2 — Key update → `400`; system-list delete → `409`; non-empty custom-list delete → `409`.

### R-CTL-004 — Values CRUD with uniqueness and ordering

- **As an** Admin **I want** to add, edit, reorder, activate and deactivate values **so that** forms offer exactly the vocabulary the organization agreed.

**Details**
- Inputs: code (required, 1–30, unique in list, case-insensitive), value (required, 1–150, unique in list, case-insensitive), description (optional ≤ 500), display order (integer ≥ 0), active (boolean, default true).
- Behavior: a new value's code is proposed as `<PREFIX>-<nn>` (next number in the list) and is editable (F-6). Inactive values stay readable but are excluded when a consumer asks for *active values only*.
- Outputs: the value with id, code, value, description, display order, active, in-use count.

#### Scenario: Duplicate code or value
- GIVEN `kpi.direction` holds `DIR-01 Increase`
- WHEN an Admin adds `dir-01` or `increase`
- THEN the request fails with `409` naming the duplicated field
- BUT it must NOT create the value

#### Scenario: Deactivate
- GIVEN `FRQ-01 Monthly` is active
- WHEN an Admin sets it inactive
- THEN it disappears from the consumer read with `activeOnly=true`
- AND IT MUST still be returned by the admin read and by any existing record that references it

**Acceptance criteria**
- [ ] AC.1 — Create `201`, update `200`; the consumer endpoint with `activeOnly=true` omits inactive values.
- [ ] AC.2 — Duplicates (code or value, any letter case) → `409`.

### R-CTL-005 — In-use protection

- **As an** Admin **I want** the system to stop me from deleting a value that records use **so that** no record ends up pointing at nothing (F-5).

**Details**
- Behavior: each value exposes an **in-use count** summed over every registered consumer. A value with in-use count > 0 cannot be deleted; the error proposes deactivation. The protection also holds at the database level for consumers that store the value id.
- At ship time no consumer exists yet; the mechanism must be in place so that the first consumer (`organizational-structure`) plugs into it without changes here.

#### Scenario: Value in use
- GIVEN value `L1 Division` is referenced by 3 records of a registered consumer
- WHEN an Admin deletes it
- THEN the request fails with `409` and a description that states the count and proposes deactivation
- BUT it must NOT delete the value

#### Scenario: Value not in use
- GIVEN a value with in-use count 0
- WHEN an Admin deletes it
- THEN it is removed (`200`)

**Acceptance criteria**
- [ ] AC.1 — In-use count is returned per value.
- [ ] AC.2 — Delete with count > 0 → `409`; with 0 → `200`.
- [ ] AC.3 — A test consumer registered in the test suite drives the count and the block.

### R-CTL-006 — Consumer read by system key

- **As a** STAR module **I want** to read a list by `(portfolio, system key)` **so that** no module keeps its own copy (F-9).

**Details**
- Inputs: portfolio id, system key, `activeOnly` (default true).
- Outputs: the list's values ordered by display order, then code (natural numeric order).
- Errors: unknown key for the portfolio → `404`.

#### Scenario: Ordered read
- GIVEN `org.level` has L1…L4 with display order 1…4
- WHEN a consumer reads it for Portfolio 2
- THEN L1, L2, L3, L4 are returned in that order

**Acceptance criteria**
- [ ] AC.1 — `200` with ordered values; unknown key → `404`.

### R-CTL-007 — Access control

- **As the** organization **we want** only Admins to see or change control lists (F-1).

**Details**
- Client: the page is reachable only through `centerAdminGuard`.
- Server: every write handler requires `CENTER_ADMIN` or `SYSTEM_ADMIN` (the latter bypasses). Admin reads use the same roles. The consumer read (R-CTL-006) is available to any authenticated user, because forms that other users fill will read it.

#### Scenario: Denied role
- GIVEN a user with only the Contributor role
- WHEN they call any create, update or delete endpoint
- THEN the request fails with `403`
- BUT it must NOT change any data

#### Scenario: Allowed roles
- GIVEN a Center Admin, and separately a System Admin
- WHEN each creates a value
- THEN both succeed (`201`)

**Acceptance criteria**
- [ ] AC.1 — Contributor → `403` on every write; Center Admin and System Admin → success.
- [ ] AC.2 — A user without center-admin access does not see the menu item and cannot open the route.

### R-CTL-008 — Page layout and navigation

- **As an** Admin **I want** the page nested under Portfolio Management in the left menu **so that** it is clear the configuration depends on a portfolio (F-3).

**Details**
- Behavior: the sidebar shows *Portfolio Management* followed by an indented group: **Control Lists**, then **Organizational Structure** and **Strategy Framework** — those two appear only once their own specs ship. Existing Center admin items keep their order and look. The page has three areas: a category › list navigator, a list header (name, category, qualified reference `P<n> · <key>`, *Used by*, *Edit list*, *Delete list* for custom lists only), and the values table (R-CTL-009). Create/edit of a category, list or value happens in a modal with only **Cancel** and **Save**; a delete opens a confirmation dialog.
- UI states: **loading** (progress bar, as in Portfolio Management), **empty** (no categories / no lists / no values, each with its call to action), **error** (inline message, retry by refresh), **success** (a toast after each save or delete).

#### Scenario: Menu placement
- GIVEN an Admin on any page
- WHEN they expand *Center admin*
- THEN *Control Lists* appears indented directly under *Portfolio Management*
- BUT it must NOT change the order, label or link of Bulk upload, SDG Management, Bilateral Mapping or Portfolio Management

#### Scenario: Empty list
- GIVEN a custom list with no values
- WHEN the Admin selects it
- THEN the table shows an empty state with *Add value*

**Acceptance criteria**
- [ ] AC.1 — The nested group renders in the expanded and the collapsed sidebar (flyout).
- [ ] AC.2 — Each of the four UI states renders.

### R-CTL-009 — Table standard (F-7), delivered as a reusable pattern

- **As an** Admin **I want** tables I can size, sort, page and export **so that** I can work with long lists comfortably.

**Details**
- Behavior: rows per page 10 / 25 / 50 / 100 (default 10); every data column resizable by dragging its header edge; click a header to sort ascending, again for descending, with a visible indicator; **default sort by code ascending in natural numeric order** (`UOM-2` before `UOM-10`); a search box filtering code, value and description; **Export .xlsx** of the filtered and sorted rows (all pages), with the list name in the file name.
- The pattern is built once and reused by the sibling specs.

#### Scenario: Natural sort
- GIVEN codes `UOM-1`, `UOM-10`, `UOM-2`
- WHEN the table opens
- THEN the order is `UOM-1`, `UOM-2`, `UOM-10`

#### Scenario: Export respects filter and sort
- GIVEN a search for `per` and a descending sort by value
- WHEN the Admin exports
- THEN the `.xlsx` holds exactly the matching rows of all pages in that order
- BUT it must NOT include rows hidden by the search

**Acceptance criteria**
- [ ] AC.1 — Page size change keeps the current sort and search.
- [ ] AC.2 — A resized column keeps its width while paging and sorting within the session.

### R-CTL-010 — Seed data

- **As the** requester **I want** the page to open with example data **so that** a colleague can review and adjust it (F-8).

**Details** — for Portfolio 2 only, all system lists:
- Category *Key Performance Indicators (KPIs)*:
  - `kpi.unit_of_measure` (UOM): Percentage (%), Count, Days, Score (0-100), USD, Ratio, Yes/No
  - `kpi.direction` (DIR): Increase, Decrease, Maintain within range
  - `kpi.measurement_frequency` (FRQ): Monthly, Quarterly, Semi-annual, Annual
  - `kpi.level` (KLV): Strategic, Tactical, Operational
  - `kpi.type` (KTY): Institutional, Customized
- Category *Organizational structure*:
  - `org.level`: `L1` Division, `L2` Department, `L3` Office, `L4` Unit
- The module also works when all data is deleted (custom data only; system lists remain).

#### Scenario: Seed is idempotent
- GIVEN the seed already ran
- WHEN it runs again
- THEN no duplicate category, list or value is created

**Acceptance criteria**
- [ ] AC.1 — After migration, Portfolio 2 holds 2 categories, 6 lists and 23 values.

---

## 6. Non-functional requirements

| ID | Category | Target | How verified |
| --- | --- | --- | --- |
| NFR-CTL-001 | performance | Admin read of one list with ≤ 500 values: p95 ≤ 300 ms on Dev | e2e timing on Dev, 3 runs |
| NFR-CTL-002 | security | Every write handler declares `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)`; no write reachable by machine tokens | unit tests per handler (allowed + denied) |
| NFR-CTL-003 | reliability | Uniqueness (name, key, code, value) enforced by DB unique indexes, not only in code | migration review + e2e duplicate insert |
| NFR-CTL-004 | a11y | Modals trap focus; icon-only buttons carry `aria-label`; sort headers expose `aria-sort` | component tests + manual keyboard pass at HITL |
| NFR-CTL-005 | dx | Swagger on every endpoint (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, per-param docs) | code review |
| Inherited | — | `ServerResponseDto` envelope, `AuditableEntity` audit fields, `GlobalExceptions`, unversioned `/api/...` routes (root `CLAUDE.md` §4.1) | existing gates |

## 7. Data requirements

- New entities (portfolio-scoped): category, list (with `is_system`, immutable key), value. All extend `AuditableEntity`.
- Unique indexes: category `(portfolio_id, name)`, list `(portfolio_id, key)`, value `(list_id, code)` and `(list_id, value)` — case-insensitive via collation.
- One migration creates the tables and seeds R-CTL-010; migrations are append-only.
- No OpenSearch fields.

## 8. API surface delta

Resource base: `/api/control-lists` (unversioned, per root `CLAUDE.md` §4.1). Admin CRUD for categories, lists and values; consumer read by `(portfolioId, key)`; `.xlsx` export may be server- or client-side (decided in design). Exact routes in `design.md`.

## 9. Cross-system impact

None outside STAR (no CLARISA, AGRESSO, OpenSearch or socket events). Client: sidebar, routes, new page, shared table pattern.

## 10. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| Authorization leak (wrong role can write) | Server unit tests per handler: allowed and denied role |
| Portfolio leakage (data crosses portfolios) | Server e2e/integration: two portfolios, cross-read returns nothing |
| Duplicate or case-variant values stored | DB unique indexes + e2e duplicate insert → `409` |
| In-use value deleted | Unit test with a registered test consumer → `409` |
| Immutable key edited / system list deleted | Unit tests → `400` / `409` |
| Sort order wrong (lexical instead of natural) | Client unit test on the sort comparator with `1, 2, 10` fixture |
| Export content differs from the screen | Client unit test on the export row builder (filtered + sorted input → rows) |
| Type/compile error hidden by the test runner | `npm run build` (server) and `ng build` (client) in verification |
| Migration/seed not applied or not idempotent | migration run twice on the disposable TEST schema; row counts = 2 / 6 / 23 |
| Sidebar regression on existing items | Existing `alliance-sidebar` spec suite + a new assertion that existing items keep order |
| **Column resize and table layout** (rendered geometry) | **No automated check in jsdom.** Substitute: manual check at the HITL pause in a real browser (drag a header edge, page, sort; widths persist) |
| Visual fidelity to the mockup | **No automated check.** Substitute: side-by-side human review against `../mockup/ControlledLists.dc.html` at the HITL pause |

## 11. Assumptions, dependencies, risks

| Item | Note |
| --- | --- |
| Dependency | None upstream. Downstream: `organizational-structure` registers the first consumer (`org.level`) |
| Assumption | `TECHNICAL_SUPPORT` is **not** granted write access (F-1), unlike portfolio creation (C-4) |
| Risk | A consumer forgets to register its in-use provider → a used value becomes deletable. Mitigation: DB foreign keys from consumer rows to value ids |
| Risk | Seed names diverge from what the business later agrees. Mitigation: all seeded values are editable |

## 12. Open questions

None blocking. Decided upstream: F-1 … F-9, requester answers of 2026-09-26 (per-portfolio lists; admins create lists and categories; table standard for new tables only).

## 13. Requirement ID index

| ID | Title |
| --- | --- |
| R-CTL-001 | Portfolio-scoped control lists |
| R-CTL-002 | Categories CRUD |
| R-CTL-003 | Lists CRUD with an immutable system key |
| R-CTL-004 | Values CRUD with uniqueness and ordering |
| R-CTL-005 | In-use protection |
| R-CTL-006 | Consumer read by system key |
| R-CTL-007 | Access control |
| R-CTL-008 | Page layout and navigation |
| R-CTL-009 | Table standard (reusable pattern) |
| R-CTL-010 | Seed data |
| NFR-CTL-001…005 | Performance, security, reliability, a11y, dx |

## 14. Sign-off

- [ ] Engineering lead — _TBD_
- [ ] Product owner — Hector F. Tobón
- [ ] Security review (roles on new endpoints) — _TBD_

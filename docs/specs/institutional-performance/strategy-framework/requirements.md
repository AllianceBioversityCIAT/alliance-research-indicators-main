# Requirements — Institutional Performance / Strategy Framework

- **Module:** institutional-performance — server + client
- **Spec id:** 2026-11-strategy-framework
- **Status:** rev 3.1, 2026-11-17 — rev 2 approved at the Phase 1 gate; rev 3 amended by the dev lead at the Phase 2 gate (§0, A-6…A-10); rev 3.1 carries the Judgment Day lineage 2 clarifications (R-STF-003 cap and AC.2, R-STF-006 IOB blocking, R-STF-007 title and empty state, R-STF-011 email source, R-STF-012 registry, R-STF-013 AC.2, R-STF-014 machine tokens); **approved 2026-11-17**
- **Depth:** **Full** — new role, five new tables (the strategy in **one** self-referencing table), a seed from three workbooks, a cross-module contract (KPIs and mapping attach to Indicators later)
- **Owner:** Hector F. Tobón (requester) · PISA4 / Strategy Refresh. Scope decisions 2026-11-17 by the dev lead
- **Parent spec:** [`../family.md`](../family.md) — child 3 of 5. Shared rules **F-2 … F-9** apply and are cited, not restated. **F-1, F-3 and F-8 carry child-3 exceptions** (family amendment 2026-11-17)
- **Depends on:** `institutional-performance/organizational-structure` — `done`, archived at [`../../archive/2026-11-10-institutional-performance--organizational-structure/`](../../archive/2026-11-10-institutional-performance--organizational-structure/). Only its staff-picker pattern is reused; no org unit is linked
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — admin tools
- **Linked tickets:** [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258)
- **Proposal:** [`proposal.md`](proposal.md) — revision 6 (2026-11-17)
- **Visual reference:** (1) **Framework page:** the dev lead's mockup *Strategy 2026–2030 – Monitoring framework*, shared 2026-11-17 (inline outline editor; screenshot only). (2) **Sidebar:** the *Institutional Indicators* canvas https://claude.ai/artifact/8tak5qfvNbBhfaH8DvWDpg (group *ODS Admin*). (3) **Institutional Objectives page:** artboard 4, [`../mockup/InstitutionalObjectives.dc.html`](../mockup/InstitutionalObjectives.dc.html). Known drift: the Framework mockup shows 14 dimensions · 32 indicators (pre-merge innovation rows, A-6), KPI counts (only once child 4 exists, R-STF-012) and no detail panel, portfolio selector or table view (A-8, A-9); artboard 4 shows an owner unit (removed, A-3)
- **Approval Mode:** `gated`
- **Last updated:** 2026-11-17

## 0. Revisions — what changed (dev lead, 2026-11-17)

| # | Decision | Effect here |
| --- | --- | --- |
| A-1 | Build only the **monitoring framework** (Performance Areas → Dimensions → Indicators) and the **Institutional Objectives**. Impact Outcomes and Strategic Objectives already exist and are not touched | IO/SO extension, Enablers, the Strategy tree, the IO/SO delete guard and *Copy to new portfolio* removed (§12 deferred) |
| A-2 | The screens live in a **new menu, ODS Admin** (first written *ODU Admin*; settled as *ODS Admin*, as in the canvas, at the Phase 2 gate), shown to a **new role, ODS Admin**, and to System Admins | New role (R-STF-013); access and navigation replace F-1/F-3 for this child (R-STF-014, 015) |
| A-3 | Institutional Objectives have **no owner**. **Responsibles** belong to **Indicators**: one or more specific people, not units | R-STF-004 |
| A-4 | Initial values come from `Alliance-Strategy-2026-2030_20260902.xlsx` | Read 2026-11-17 (C-5); objectives, links and responsibles come from the MMF it names (C-6) |
| A-5 | `2026_Strategic-Objectives-Tracking-Tool.xlsx` is the **main source** | Structure, numbering and objective links from it (C-11, R-STF-011) |
| A-6 | Rev 3 — the Framework page follows the dev lead's mockup; the structure stays **Tracking Tool 13 dimensions / 31 indicators** (not the mockup's 14 / 32) | R-STF-007 rewritten as an inline outline editor |
| A-7 | Rev 3 — the strategy lives in **one table**, because it may grow in levels | R-STF-002 (levels) and R-STF-003 (elements) rewritten; any number of levels without a schema change |
| A-8 | Rev 3 — Institutional Objectives get **their own menu item** under ODS Admin | R-STF-009, 015 |
| A-9 | Rev 3 — description and responsibles are edited in a **panel opened from the row** | R-STF-004, 007 |
| A-10 | Rev 3 — keep the **table view** with F-7 and export beside the editor | R-STF-008 |

---

## 1. Executive summary

A new sidebar group, **ODS Admin**, gives ODS Admins and System Admins two pages:

| Page | What it holds |
| --- | --- |
| **Framework** | The monitoring framework of a portfolio as an inline outline editor (Area → Dimension → Indicator, colour-coded per area), with a **Table** view per level and `.xlsx` export. A details panel per row edits the description and, on Indicators, the **responsible people** |
| **Institutional Objectives** | Objectives (IOB) per year 2026–2030, each linked to one or more Indicators. *Carry forward* copies a year into the next |

| Rule | Meaning |
| --- | --- |
| One table | Every framework element, whatever its level, is a row of one table pointing to its parent. Levels are data, so a level can be added later without a schema change |
| Identity | Every element has a permanent ID; anything linked to it stores that ID (F-9). Codes are readable, hierarchical (`1`, `1.2`, `1.2.3`), proposed and editable (F-6) |
| Protection | Nothing with children or links can be deleted (F-5) |
| Consumers | One read returns the framework of a portfolio; KPIs (child 4) and the mapping module attach to Indicators |

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Framework** | All elements of one portfolio |
| **Level** | A named depth of the framework for a portfolio: 1 *Performance Area*, 2 *Dimension*, 3 *Indicator* today. Exactly one level per portfolio is the **indicator level** |
| **Element** | One row of the framework, at one level. Every element below level 1 has a parent at the level just above |
| **Performance Area / Dimension / Indicator** | Elements at levels 1 / 2 / 3. *Indicator* is not the existing result-type `indicators` catalogue |
| **Responsible** | A specific person accountable for an element at the indicator level, chosen from the Alliance staff list |
| **Institutional Objective (IOB)** | An annual objective of a portfolio: code, year, statement, linked indicator-level elements |
| **Carry forward** | Copy all IOBs of a year into the next year of the same portfolio |
| **ODS Admin** | New role (R-STF-013) that may read and maintain these pages |
| **Authorized user** | An ODS Admin or a System Admin |

## 3. System context & scope

| # | Current behavior | Evidence |
| --- | --- | --- |
| C-1 | No code, table or migration exists for performance areas, dimensions, framework indicators or institutional objectives. The `indicators` entity is the result-type catalogue | grep (case-insensitive) `framework_indicator\|institutional_objective\|institutional-objective\|InstitutionalObjective\|PerformanceArea\|performance_area\|enabler` over `{server,client}/**/src/**` → 0 hits (scout, 2026-11-13, HEAD `64a39c26`); proposal fact 3.1 |
| C-2 | Roles are rows of `sec_roles` with ids mirrored in `SecRolesEnum` (1…10; 10 is the newest, inserted by migration). There is **no** ODS Admin role. The client checks role ids in `RolesService` | `server/…/domain/shared/enum/sec_role.enum.ts:1-12`; migration `1776433682077-InsertNewRoles.ts`; `client/…/shared/services/cache/roles.service.ts:8-48` |
| C-3 | No API or admin screen assigns roles to users: `user-roles.controller.ts` declares no route | `grep "@Get\|@Post\|@Patch\|@Put\|@Delete" user-roles.controller.ts` → 0 hits (2026-11-17) |
| C-4 | The sidebar builds its groups in code, each behind a role check, inside a template gate for Center admin or App configuration | `alliance-sidebar.component.ts:67-133`; `.html:73` |
| C-5 | `Alliance-Strategy-2026-2030_20260902.xlsx` holds 4 PA (sheet 05), 14 DIM (06) and 30 coded IND (07) with descriptions. Its sheet 08 says IOBs are "managed in Master-Monitoring-Framework, sheet '05. Institutional Objectives'" | read with `openpyxl` on 2026-11-17 from `D:\OneDrive - CGIAR\Alliance - Strategy Refresh - Monitoring Framework Analysis\KPI Validation\` (file dated 2026-10-22) |
| C-6 | `Master-Monitoring-Framework_…_adjusted_MA_v2.xlsx` (same folder, 2026-11-10) holds 28 IOBs (sheet 05) and the Indicator responsibles as free text (sheet 03, e.g. "Idris Jones <I.Jones@CGIAR.ORG>; BOF rep; Philippe Attey") | same read, 2026-11-17 |
| C-7 | The org structure picks people from the Agresso staff table `alliance_user_staff` by staff ID (`carnet`) with its own search | archived org-structure design §4 B4, R-ORG-016 |
| C-8 | The shared client `DataTable` (F-7) renders text cells only; `exportRowsToXlsx` writes one sheet | `data-table.component.ts:12,57-70`; `xlsx-export.util.ts:46-52` |
| C-9 | Portfolio 2 is `id = 2`, years 2026–2030 | `portfolio-id.enum.ts:6`; migration `1782328490591:14` |
| C-10 | `2026_Strategic-Objectives-Tracking-Tool.xlsx` (same folder, 2026-11-17), sheet *Institutional Objectives 2026*: 4 areas, 14 dimensions (one, *4.6 Powering Impact Through Knowledge and Data*, with no indicator) and **31** numbered indicators (`1.2.4`-style numbering). Its *Control Lists* sheet maps the 28 objectives to indicators in 36 rows; two rows still name pre-merge indicators (*3.2.1 Innovation development*, *4.1.1 Uptake of innovations for system change*). The 28 objective texts equal the MMF's exactly | read with `openpyxl` on 2026-11-17; text comparison of the 28 objectives → 0 differences |
| C-11 | The dev lead's Framework mockup: header *ADMIN · ODS*, title *Strategy 2026–2030 – Monitoring framework*; a summary line (*4 areas · 14 dimensions · 32 indicators*) and an info banner; one card per area with a coloured left border; rows *AREA* / *DIMENSION* / indented indicators, each with a code badge (`1`, `1.1`, `1.1.1`), an inline name field, counts (*6 dimensions · 18 indicators · 46 KPIs*), **+ Dimension** / **+ Indicator** buttons and a delete icon (red when deletable, grey otherwise); **+ Add performance area** at the end | screenshot shared 2026-11-17 |

**Affected surface (what renders on the routes):** the shared sidebar (one new group, two items), the two new pages, the shared `DataTable`, the shared modal/alert host.

**In scope:** framework levels and elements in one table; responsibles; IOBs and their links; the outline editor, details panel and table view; delete protection; codes; carry forward; `.xlsx` export; the ODS Admin role, menu and access; the read contract; the seed.

**Not changing:** Impact Outcomes, Strategic Objectives and their endpoints; result alignment; the Center admin and System admin menus; the org structure; control lists; existing tables (family §5); how roles are assigned to users (C-3).

## 4. Stakeholders / personas

| Persona | Role here |
| --- | --- |
| ODS Admin | Maintains the framework and the IOBs |
| System Admin | Same rights, plus the role-check bypass |
| Responsible | Named on an Indicator; no access granted by being named |
| PISA4 / Strategy team | Owns the content (via the ODS Admin) |
| Future consumers | `institutional-indicators` (KPIs per Indicator), the mapping module |

---

## 5. Functional requirements

### R-STF-001 — Framework belongs to a portfolio

- **As an** authorized user **I want** the framework scoped to a portfolio **so that** each strategy period has its own elements (F-2).

**Details**
- Every level, element and IOB belongs to one portfolio. A parent and a linked element must belong to the **same portfolio** as the element or IOB that points to them.
- A portfolio with no element shows as **not configured**.

#### Scenario: Cross-portfolio link rejected
- GIVEN Indicator `1.1.1` in Portfolio 2 and an IOB of another portfolio
- WHEN an authorized user links `1.1.1` to that IOB
- THEN the save fails with `400` naming the linked indicators
- AND IT MUST NOT store the link

**Acceptance criteria**
- [ ] AC.1 — A parent or a linked element of another portfolio is rejected with `400`.

### R-STF-002 — Levels

- **As the** strategy team **we want** the framework's levels to be data **so that** a new level can be added later without changing the database.

**Details**
- Each portfolio has an ordered list of levels: depth `1..n`, singular name, plural name. Seeded for Portfolio 2: 1 *Performance Area* / *Performance Areas*, 2 *Dimension* / *Dimensions*, 3 *Indicator* / *Indicators*.
- Exactly one level per portfolio is the **indicator level** (depth 3 today). Responsibles (R-STF-004) and IOB links (R-STF-009) attach only to elements at that level.
- Every screen and read derives level names, counts, add buttons and table chips from the levels, never from hard-coded names. Adding a fourth level is a data change; a screen to manage levels is **not** part of this spec (§12).

**Acceptance criteria**
- [ ] AC.1 — With a fourth level added by a test fixture, the read, the editor and the table view show it with no code change.
- [ ] AC.2 — A responsible or IOB link on an element outside the indicator level → `400`.

### R-STF-003 — Elements in one table

- **As an** authorized user **I want** to add, rename, describe, move and delete elements at any level **so that** I can maintain the framework.

**Details**
- Every element, at every level, is a row of **one** table: permanent ID, portfolio, level, parent, code, name, description.
- An element at depth 1 has no parent; an element at depth `d > 1` has a parent at depth `d − 1` in the same portfolio. No cycles.
- Name is required (1–255 characters); description is optional. A portfolio holds at most 500 elements; the 501st create is rejected with `400`.
- Changing the parent moves the element with its whole subtree; no code is renumbered (F-9). The new parent must be at the same depth as the old one.
- Counts shown for an element (its children and descendants per level) are calculated on read.

#### Scenario: Move a dimension
- GIVEN Dimension `1.3` with two Indicators, under Area `1`
- WHEN an authorized user moves it to Area `2`
- THEN `1.3` and its Indicators appear under Area `2` with the same codes
- BUT it must NOT accept a parent that is an Indicator or another Dimension

**Acceptance criteria**
- [ ] AC.1 — Create at each level; rename; move within the same portfolio and depth; codes unchanged after the move.
- [ ] AC.2 — Through the API: wrong-depth parent, parent of another portfolio, `parentId: null` on a moved element, `parentId` on a depth-1 element → `400`. Cycles cannot be expressed through the API (a same-depth parent is never a descendant); the tree util's cycle check is tested directly.

### R-STF-004 — Responsibles of indicators

- **As an** authorized user **I want** to name the people responsible for each Indicator **so that** KPIs have a named owner.

**Details**
- An indicator-level element has zero or more **responsibles**, chosen from the Alliance staff list (as the org-structure director, C-7): a search by name or email, at least 2 characters, **active** staff only, up to 20 hits. Each is stored by staff ID; name and email are always read from the staff list, never typed.
- No person twice on one Indicator. The order shown is the order chosen.
- A responsible who later becomes inactive in the staff list stays and is shown as inactive.
- Edited in the details panel (R-STF-007).

#### Scenario: Two responsibles
- GIVEN Indicator `1.1.1` *Process efficiency* with no responsibles
- WHEN an authorized user adds Idris Jones and Philippe Attey in its panel and saves
- THEN the Indicator shows both, with name and email from the staff list
- BUT it must NOT accept a typed name that is not in the staff list
- AND IT MUST reject an unknown staff ID with `400`

**Acceptance criteria**
- [ ] AC.1 — Add, reorder and remove responsibles; duplicate or unknown staff ID → `400`; a name or email field in the body → `400`.
- [ ] AC.2 — An inactive responsible is kept and labelled inactive; the search does not offer inactive staff.

### R-STF-005 — Codes (F-6)

- **As an** authorized user **I want** codes proposed for me **so that** I rarely type them, and **unique** **so that** a code means one element.

**Details**
- Element codes are hierarchical numbers, as in the mockup and the Tracking Tool: a root is `<n>`; a child is `<parent code>.<n>`. The proposal is the next free `<n>` among codes with that prefix and one more segment, **portfolio-wide** (a moved element keeps its code and still holds it). A parent whose code is not a dotted number gets children coded `<parent code>.<n>` all the same.
- IOB codes are `IOB-<n>`, next free per portfolio and year.
- Any code of 1–30 characters is accepted. **Uniqueness:** element codes per portfolio (all levels together); IOB codes per portfolio and year. Case-insensitive, after trimming. Deleted elements do not hold their code.

#### Scenario: Next code from the parent
- GIVEN Area `1` with Dimensions `1.1` … `1.6`
- WHEN an authorized user presses **+ Dimension** on Area `1`
- THEN a new Dimension row is stored as `1.7`
- AND IT MUST reject `1.3` with `409` naming `code`

**Acceptance criteria**
- [ ] AC.1 — Proposal correct at each level, after a gap (`1.1`, `1.3` → `1.4`), after a move, and under a non-numeric parent code.
- [ ] AC.2 — Duplicate in the portfolio (any case) → `409`; same code in another portfolio or IOB year → accepted.

### R-STF-006 — Delete protection (F-5)

- **As an** authorized user **I want** a delete blocked while anything depends on the element **so that** nothing is left orphaned.

**Details**
- An element is blocked while it has children, while an IOB links it, or while a module registered through R-STF-012 reports a dependant (e.g. KPIs, child 4). An IOB is blocked only by a registered dependant that counts objectives; none is registered in this spec, so every IOB is deletable today. Responsibles never block; they go with their element.
- In the editor the delete icon is active (red) only when nothing blocks; otherwise it is muted and its tooltip names the blocker. The API re-checks on every delete.
- The blocked message names each blocker with its count and the way out. When nothing blocks, a confirmation asks "Delete <level> <code> · <name>?" with **Delete** and **Cancel**.

#### Scenario: Indicator linked to objectives
- GIVEN Indicator `1.2.2` is linked by IOB-6
- WHEN an authorized user deletes `1.2.2` through the API
- THEN the request fails with `409` naming "1 institutional objective"
- AND IT MUST NOT delete the Indicator or its responsibles

**Acceptance criteria**
- [ ] AC.1 — Blocked and free cases for: children, IOB link, registered dependant.
- [ ] AC.2 — A deleted element is gone from every read and its code is free again.

### R-STF-007 — Framework page: outline editor

- **As an** authorized user **I want** to edit the framework as an outline, as in the mockup **so that** I see and change the whole structure in one place.

**Details**
- Header: eyebrow *ADMIN · ODS*, title `Strategy <start year>–<end year> – Monitoring framework` from the selected portfolio, subtitle, portfolio selector. Toolbar: **Editor | Table** toggle and **Export .xlsx**.
- Summary line per level (*4 performance areas · 13 dimensions · 31 indicators*) and an info banner: *"Changes apply to every module that uses the framework. Items in use cannot be deleted."*
- One card per level-1 element with a distinct accent colour on its left border. Inside, each element is a row: level label, code badge, **inline name field**, counts of its descendants per level (plus registered dependants such as *KPIs* once they exist), **+ <next level>** (absent on the deepest level), a **details** icon, and a delete icon (R-STF-006). Deeper levels are indented.
- **Inline name:** Enter or leaving the field saves; Escape restores the previous value; an empty name is rejected inline. **+ <next level>** adds an empty row marked *New* with focus in the name field; it is stored on the first save, receiving the next free code, and discarded by Escape. **+ Add <level 1 name>** at the end adds a root.
- **Details panel** (from the icon): code, name, description, parent (move), and on indicator-level elements the responsibles. Buttons **Save**, **Cancel**, **Delete** only (F-4).
- States: loading; empty ("This portfolio has no framework yet" with the add button, on **any** portfolio — the default levels are created with its first element); load error with retry; a failed inline save keeps the typed value and shows the error under the field.

**Acceptance criteria**
- [ ] AC.1 — The seeded framework renders in code order (natural sort: `1.2` before `1.10`) with the right counts per row and in the summary line.
- [ ] AC.2 — Inline rename saves on Enter and on blur, reverts on Escape, rejects an empty name.
- [ ] AC.3 — **+ Dimension** on Area `1` adds a *New* row that is stored as `1.7`; Escape removes it unsaved.
- [ ] AC.4 — Loading, empty, error and failed-save states each render.

### R-STF-008 — Framework page: table view (F-7)

- **As an** authorized user **I want** a table per level **so that** I can search, sort and export.

**Details**
- Level chips from the levels (*Performance Areas (4)*, *Dimensions (13)*, *Indicators (31)*). Each table meets F-7 and has edit (opens the details panel) and delete actions plus a **+ <Level>** button. Columns: code, name, parent code and the codes of every higher level; Indicators also show the responsibles.
- **Export .xlsx** (toolbar) writes one workbook with one sheet per level, all elements of the selected portfolio, sorted by code.

**Acceptance criteria**
- [ ] AC.1 — Each level's table passes the F-7 checks with the shared `DataTable`.
- [ ] AC.2 — Edit and delete from the table behave as in the editor.
- [ ] AC.3 — The workbook has one sheet per level with the seeded counts.

### R-STF-009 — Institutional Objectives page

- **As an** authorized user **I want** to maintain each year's Institutional Objectives **so that** annual priorities are recorded with the Indicators they move.

**Details**
- Its own page under ODS Admin, with the same portfolio selector.
- Year selector over the portfolio's years (2026–2030 for Portfolio 2), labelled "YYYY · N objectives", defaulting to the current year when in range, else the first year.
- Table (F-7): Code, Statement, Linked indicators (codes and names), actions; search over code and statement; export.
- Side form: **Code\*** (unique per portfolio and year), **Year\***, **Statement\***, Linked indicators (optional, multi, indicator-level elements of the same portfolio). **No owner and no responsible** on an objective (A-3).

**Acceptance criteria**
- [ ] AC.1 — CRUD of an IOB with and without linked Indicators.
- [ ] AC.2 — The form and the API have no owner or responsible field; such a field in the body → `400`.

### R-STF-010 — Carry forward

- **As an** authorized user **I want** to copy a year's objectives to the next year **so that** I start next year from this year's list.

**Details**
- Button **Carry forward to <Y+1>** on year *Y*. Unavailable in the portfolio's last year and when *Y* has no objectives.
- Blocked (`409`, nothing copied) when *Y+1* already has at least one IOB.
- Copies code, statement and linked Indicators into new IOBs for *Y+1*. Year *Y* is unchanged. All or nothing.

#### Scenario: Copy to next year
- GIVEN 2026 has 28 IOBs and 2027 has none
- WHEN an authorized user carries forward 2026
- THEN 2027 has 28 IOBs with the same codes and links, and the toast says "28 objectives copied to 2027; 2026 is unchanged"
- BUT it must NOT change any 2026 IOB

**Acceptance criteria**
- [ ] AC.1 — Copy count, content, untouched source year.
- [ ] AC.2 — Target year with objectives → `409`, zero rows written; last year → action unavailable (UI) and `400` (API).

### R-STF-011 — Seed data (F-8)

- **As the** strategy team **we want** Portfolio 2 pre-loaded **so that** a colleague can review real content.

**Main source: the Tracking Tool (A-5, A-6, C-10).**

| Data | Source | Count |
| --- | --- | --- |
| Levels: Performance Area, Dimension, Indicator (indicator level = 3) | — | 3 |
| Level-1 elements, codes `1`…`4`, names | Tracking Tool, column *Area* | 4 |
| Level-2 elements, codes `n.n`. *4.6 Powering Impact Through Knowledge and Data* is **not** seeded (no indicators; excluded since proposal rev 4) | Tracking Tool, column *Dimensions* | 13 |
| Level-3 elements, codes `n.n.n` | Tracking Tool, column *Indicators* | 31 |
| Descriptions, **only** where the same element exists in the strategy workbook (normalized name; the area-1 definition included); otherwise empty | Strategy workbook, sheets 05–07 | 22 of 31 indicators · 7 of 13 dimensions |
| Institutional Objectives, year 2026, codes `IOB-1` … `IOB-28` (IOB-7 and IOB-27 both kept) | Tracking Tool, *Control Lists* | 28 |
| IOB → Indicator links. The two pre-merge names both map to `4.1.1` *Innovation development and uptake* | Tracking Tool, *Control Lists* | 36 |
| Indicator responsibles (people), matched to active staff by email, else by exact full name; a missing email is filled from the canvas file `project/kpi-framework.json` (field `resp`) | MMF v2, sheet 03; *Institutional Indicators* canvas | as matched |

- The Tracking Tool's per-KPI *Owner / Responsible* units are **not** seeded (they belong to KPIs, child 4, and are units).
- Text that is not a person (e.g. "BOF rep", "(TBC and regions)", "?") is skipped. A name with no single active-staff match is left out and **listed** for the requester; the seed never guesses.
- Re-running the seed changes nothing while the staff table is unchanged; a person who became matchable since the last run is added as a responsible. The pages work with an empty portfolio (F-8).

**Acceptance criteria**
- [ ] AC.1 — After the seed, Portfolio 2 has 3 levels and 4 / 13 / 31 elements per level, 28 IOBs and 36 links; every IOB has at least one link; only Indicator `1.3.2` has no IOB.
- [ ] AC.2 — Unmatched responsible names are listed in the seed task's record, with the reason.
- [ ] AC.3 — Second run with the staff table unchanged → zero changes.

### R-STF-012 — Read contract and usage registry for later modules

- **As a** later module (KPIs, mapping) **I want** one read and one way to register my links **so that** I use the same elements and they cannot be deleted under me.

**Details**
- One read returns the framework of a portfolio: its levels and every element with permanent ID, level (depth and name), code, name, description, parent ID, descendant counts per level, and, on indicator-level elements, the responsibles (staff ID, name, email, active). Available to any authenticated user and as an injectable server service.
- A resolve read returns elements by permanent IDs, marking missing ones.
- A usage registry lets a module register a provider that counts its records per element ID and/or per IOB ID under a label (e.g. *KPIs*); R-STF-006 consults every provider, and the editor shows each provider's element counts on the rows (R-STF-007).

**Acceptance criteria**
- [ ] AC.1 — The read returns the seeded framework of Portfolio 2 with correct levels, parents and responsibles; a portfolio with no elements returns `elements: []`, and `levels: []` when it has never had levels.
- [ ] AC.2 — A test provider reporting a dependant blocks the delete with `409` naming the provider, and its count appears on the row.

### R-STF-013 — New role: ODS Admin

- **As the** platform **we want** an ODS Admin role **so that** the framework is maintained by its owners without granting Center admin rights.

**Details**
- A new role **ODS Admin** exists in `sec_roles`, with the next free role ID, focus *application*, and a description.
- The role grants access to these two pages only. It grants nothing in Center admin, System admin or results.
- Assigning the role to a user uses the existing mechanism (no API or screen exists — C-3). This spec does not add one.

**Acceptance criteria**
- [ ] AC.1 — After the migration, `sec_roles` has one ODS Admin row; running it twice adds nothing; `down` removes it only when no user holds it, else fails naming the count.
- [ ] AC.2 — A user with only ODS Admin sees no Center admin or System admin item and gets `403` on their `@Roles`-guarded endpoints.

### R-STF-014 — Access control

- **As the** platform **we want** only ODS Admins and System Admins to use these pages.

**Details**
- Every write and every admin read of this module: ODS Admin and System Admin. **Center Admin has no access** (replaces F-1 for this child). Writes reject machine tokens. The consumer reads of R-STF-012: any authenticated user.
- Both client routes have a guard that admits the same two roles.

**Acceptance criteria**
- [ ] AC.1 — Per write handler: allowed for ODS Admin and System Admin; `403` for Center Admin and others.
- [ ] AC.2 — The routes reject a Center Admin; the sidebar group is hidden for them.

### R-STF-015 — Navigation

- **As an** authorized user **I want** to find both pages under ODS Admin.

**Details**
- Sidebar: a new group **ODS Admin**, after *Center admin* and before *System admin*, with **Framework** and **Institutional Objectives**. Shown when the user has ODS Admin or System Admin. Other groups unchanged (replaces F-3 for this child).
- Both pages: portfolio selector defaulting to the portfolio whose years contain today.
- Responsive down to tablet width; below that the details panel and the IOB form become full-width panels.

**Acceptance criteria**
- [ ] AC.1 — Group order, items and visibility per role (ODS Admin, System Admin, Center Admin, none).
- [ ] AC.2 — Default portfolio is Portfolio 2 on any date in 2026–2030.

---

## 6. Non-functional requirements

| ID | Category | Target | How verified |
| --- | --- | --- | --- |
| NFR-STF-001 | performance | Framework read of one portfolio (≤ 500 elements): p95 ≤ 300 ms on Dev; staff search ≤ 300 ms | integration timing, 3 runs; inconclusive if runs vary more than 30 % |
| NFR-STF-002 | integrity | Carry forward and the seed are each one transaction; a failure leaves zero rows | integration test with an injected failure |
| NFR-STF-003 | security | Every write declares `@Roles(ODS_ADMIN, SYSTEM_ADMIN)`; Center Admin is denied | unit tests per handler |
| NFR-STF-004 | a11y | Outline rows reachable by keyboard; inline fields labelled with level and code; icon buttons have `aria-label`; sort headers expose `aria-sort`; dialogs and panels trap focus; the staff picker is a labelled combobox; area accent colours are not the only cue (the code and label carry the level) | component tests + manual keyboard pass at HITL |
| NFR-STF-005 | dx | Swagger on every endpoint | code review |
| Inherited | — | `ServerResponseDto`, `AuditableEntity`, `GlobalExceptions`, unversioned `/api/...` routes (root `CLAUDE.md` §4.1) | existing gates |

## 7. Data requirements

- **New:** framework levels; framework elements (**one** self-referencing table for every level); element responsibles (element, staff ID, position); institutional objectives (portfolio, year, code, statement); IOB ↔ element links; one `sec_roles` row.
- **Constraints:** element code unique per portfolio among existing rows; IOB code unique per portfolio and year; level depth unique per portfolio; one indicator level per portfolio; responsible unique per (element, staff ID); FKs between elements `ON DELETE RESTRICT`; responsible staff ID → `alliance_user_staff.carnet` `ON DELETE RESTRICT`.
- No change to `impact_outcomes`, `strategic_objectives` or any result table. Migrations append-only; seed logic in `src/db/seeds/`, as the siblings. No OpenSearch fields.

## 8. API surface delta

New resource base `/api/strategy-framework` (unversioned): framework read and resolve (any authenticated user); context; element create/update/delete; blockers; code proposal; staff search; IOB list per year; IOB create/update/delete; carry forward. Exact routes in `design.md`.

## 9. Cross-system impact

Agresso, indirectly: responsibles read the staff table that the existing staff sync fills; no change to the sync. ROAR: issues the user's role list; whether it carries the new role is checked on Dev (design P-3). Inside STAR: a new role, the sidebar, routes, two new pages.

## 10. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| **Role leak** (Center Admin reaches a page or API; ODS Admin reaches another admin area) | Unit tests per handler (ODS Admin, System Admin, Center Admin, other); guard and sidebar DOM tests per role |
| **Role migration not idempotent or `down` strands users** | Migration run twice and `down` on the local development database |
| **Hierarchy broken** (wrong-depth parent, cycle, cross-portfolio parent, move that changes depth) | Table-driven unit tests per rule |
| **Levels hard-coded** (a fourth level does not appear) | Read, editor and table tests with a four-level fixture |
| **Delete protection bypassed** | Unit test per blocker kind, blocked and free |
| **Code proposal / uniqueness wrong** (prefix scan, gaps, moved element, case, deleted codes) | Table-driven unit tests |
| **Responsible typed, duplicated, unknown, on a non-indicator element, or inactive one dropped** | Unit tests both ways; DTO rejects name/email fields |
| **Inline edit loses or duplicates data** (blur after Enter saves twice; Escape after a failed save) | Component tests of the row field state machine |
| **Carry forward partial or source changed** | Integration test with an injected failure; source rows unchanged |
| **Seed: wrong IOB–IND link or wrong structure** (name drift, the pre-merge names) | Seed test asserts the 36 pairs and the 3/4/13/31 structure from a fixture derived from the Tracking Tool, including both pre-merge names mapping to `4.1.1` and dimension `4.6` absent |
| **Seed: wrong person as responsible** | Seed test: ambiguous or inactive name → left out and listed; only email or exact full-name single matches stored |
| **Seed counts wrong or not idempotent** | Migration run twice on the local development database; counts asserted |
| **Natural sort / export content** | Reused `DataTable` tests + one page test with `1.2`/`1.10`; workbook sheet and row count test |
| **Type/compile errors hidden by the runner** | `npm run build` (server), `ng build` (client) — each observed failing once (K-004) |
| **Sidebar regression** | Existing `alliance-sidebar` suite + DOM assertions on the new group |
| **Outline geometry, indentation, accent colours, column resize** (rendered) | **No automated check in jsdom.** Substitute: manual check in a real browser at the HITL pause |
| **Visual fidelity to the mockups** | **No automated check.** Substitute: side-by-side review against the Framework mockup and artboard 4 at the HITL pause, accounting for the drift in Document Control |
| **Seed content matches the workbooks** (texts) | No automated check against the workbooks. Substitute: requester review of the seeded framework at the HITL pause. Every seeded value is editable |

## 11. Assumptions, dependencies, risks

| Item | Note |
| --- | --- |
| Assumption | "Current year" and "today" are the server's calendar date (UTC), as in the org structure |
| Assumption | The seed's IOBs are year **2026** (strategy workbook sheet 08: "Institutional Objective (annual, 2026)") |
| Risk | The strategy workbook's sheet 08 says 29 IOBs; the MMF and the Tracking Tool hold 28 (C-5, C-6, C-10). The seed loads the 28 that exist |
| Risk | The Tracking Tool is a live working file. The seed task re-reads it and records the file date it used; later edits are made in the pages, not by re-seeding |
| Risk | Codes follow the Tracking Tool numbering, which differs from the strategy workbook for areas 3 and 4. Anyone holding the September codes must re-map |
| Risk | Responsibles in the MMF are free text; some are not people or are tentative. Mitigation: R-STF-011 match rules and the listed leftovers |
| Risk | Nobody holds the ODS Admin role after deploy until it is assigned through the existing mechanism (C-3). System Admins can use the pages meanwhile |
| Risk | Shared Dev database: migrations reach it through the pipeline on merge to `dev` (root `CLAUDE.md` §4.3) |

## 12. Open questions and deferred work

**Defaults chosen, changeable at the gate**
- **Q-1** Deleted elements free their code (R-STF-005).
- **Q-2** Seed sources: Tracking Tool for structure, objectives and links; strategy workbook for descriptions; MMF v2 for responsible people (A-4, A-5).
- **Q-3** The editor's banner is generic (R-STF-007), not the mockup's text naming KPI setup, Report KPIs and the Dashboard, which do not exist yet.
- **Q-4** *4.6 Powering Impact Through Knowledge and Data* is not seeded.

**Deferred (not lost)**
- A screen to add, rename or reorder **levels** (R-STF-002 makes it a data change only).
- Extending Impact Outcomes / Strategic Objectives, Enablers and the Strategy tree; *Copy framework to a new portfolio*.
- A guard on the existing `DELETE /api/impact-outcomes/:id` and `DELETE /api/strategic-objectives/:id`, which today soft-delete an IO/SO even when results are aligned to it (`impact-outcomes.service.ts:78-90`, `strategic-objectives.service.ts:118-134`). Suggested as its own bugfix.
- A screen or API to assign roles (C-3).

## 13. Requirement ID index

| ID | Title |
| --- | --- |
| R-STF-001 | Framework belongs to a portfolio |
| R-STF-002 | Levels |
| R-STF-003 | Elements in one table |
| R-STF-004 | Responsibles of indicators |
| R-STF-005 | Codes (F-6) |
| R-STF-006 | Delete protection (F-5) |
| R-STF-007 | Framework page: outline editor |
| R-STF-008 | Framework page: table view (F-7) |
| R-STF-009 | Institutional Objectives page |
| R-STF-010 | Carry forward |
| R-STF-011 | Seed data (F-8) |
| R-STF-012 | Read contract and usage registry |
| R-STF-013 | New role: ODS Admin |
| R-STF-014 | Access control |
| R-STF-015 | Navigation |
| NFR-STF-001…005 | Performance, integrity, security, a11y, dx |

## 14. Sign-off

| Gate | By | Date | Result |
| --- | --- | --- | --- |
| Phase 1 — requirements rev 1 | dev lead | 2026-11-17 | approved, then adjusted (§0 A-1…A-4) |
| Phase 1 — requirements rev 2 | dev lead | 2026-11-17 | approved (A-5 source choice) |
| Requirements rev 3.1 (amended at the Phase 2 gate, Judgment Day clarifications) | dev lead | 2026-11-17 | approved (with the design and tasks gates) |

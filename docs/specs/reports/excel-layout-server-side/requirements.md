# Requirements — Reports / Excel workbook layout on the server

- **Module:** reports (Results Center Excel export, workbook `star_results_metadata`)
- **Spec id:** 2026-10-excel-layout-server-side
- **Status:** approved (2026-10-06) — Judgment Day round 1 fixes applied (J-3, J-5, J-6)
- **Owner:** ARI server squad
- **Linked PRD section:** `docs/prd.md` — MEL-3 (export structured metadata to Excel), G8
- **Linked tickets:** none yet (branch `AC-1681-Include-the-Innovation-use-data-in-the-excel-export`)
- **Related spec:** `docs/specs/innovation-dev/excel-export/` — **paused at T-02** for this spec; its T-03 (layout migration) and T-04 (TS wiring) are re-planned against it
- **Last updated:** 2026-10-06

## Document Control

| Field | Value |
| --- | --- |
| Type | Change (refactor of an existing behavior source; the workbook a user downloads must not change) |
| Depth | Standard — re-checked at design (Step 2.4) |
| Approval Mode | gated |
| Source of intent | User, 2026-10-06: move `report_workbook_column_group` and `report_workbook_sheet` to the server, extracting their data from the database; compute each section-title merge automatically from the column array, with a tag on each column object. Result data and `report_*` views are correct and out of scope |
| HITL rulings (2026-10-06) | (a) colours use 8-digit ARGB with the `FF` alpha prefix; (b) Prod rows stay `UNVERIFIED` — a human checks them before the `main` merge; (c) the two tables are **not dropped** in this spec; (d) the banner title merge is also computed from the column array; `report_data_dictionary` stays in the database; the June Dev-only Innovation Development layout is excluded from the extraction |

---

## Executive Summary

The Raw data sheet paints 11 coloured section bands ("GENERAL INFORMATION", "IP RIGHTS", …) above its 80 columns. Today the band ranges, titles and colours, and the list of sheets, are read from two database tables, and every new column forces a migration that rewrites `from_col`/`to_col` numbers. This spec moves that layout into server code. Each column object carries a **section tag**. The server derives each band's start and end column, its title and its colour from the tagged columns, and derives the banner width from the column count. The downloaded workbook stays identical to the intended layout extracted from the database. Nothing reads the two tables anymore, and they are left in place.

---

## Glossary

| Term | Meaning |
| --- | --- |
| Section | One coloured band of the Raw data sheet (e.g. `IP RIGHTS`), spanning a contiguous run of columns |
| Section tag | The value on each raw column object that names the section it belongs to |
| Band / merge | The merged header cell spanning a section's columns and holding its title |
| Banner title | The `ALLIANCE RESULTS` strip of row 1, merged from column 3 to the last column |
| Intended layout | The Dev rows **minus** the June Dev-only Innovation Development work (see §1) with colours in `FF` form |
| June work | Commit `5b426acf` (branch `dev` only): migrations `1781300000000`/`1781301000000`, scheduled for removal |

---

## 1. System Context & Scope

**Current behavior (cited as run at `7afcedfc`):**

| Claim | Evidence |
| --- | --- |
| The handler reads the sheet list and the column groups from the database on every export | `report-layout.repository.ts:23-33` (`report_workbook_sheet`), `:49-62` (`report_workbook_column_group`); called from `star-results-metadata-workbook.handler.ts:61-63` and `:167-181` |
| When the group table is empty, a hardcoded copy is used | `star-results-metadata.sheet-presentation.ts:26-68` (`STAR_RAW_COLUMN_GROUP_FALLBACK`, 11 groups) |
| Each column's header colour is the colour of the group whose `from_col…to_col` contains its position | `handler.ts:183-193` |
| The banner title merge ends at a hardcoded column | `sheet-presentation.ts:80` (`bannerTitleMergeToCol: 80`) |
| Sheet names come from the database and overwrite the handler's literals; the order can be overridden by an environment variable | `handler.ts:64-70`, `:116`; `workbook-sheet-order.resolver.ts:9-34` |
| Raw data has 80 columns, in 11 contiguous sections with no gap and no uncovered column | `star-results-metadata.columns.ts` (80 raw entries), mapped position by position against the fallback list (run 2026-10-06, `ts-node` listing; first/last keys per section in design P-10) |
| 12 migrations write these two tables | `grep -l -E "report_workbook_sheet\|report_workbook_column_group" src/db/migrations/*.ts` → 12 files (`1777025000000` … `1791500000000`) |

**Database reading (Dev `alliancereportingdb`, MySQL 8.0.45, read-only `SELECT`, 2026-10-06):**

`report_workbook_sheet` — 2 active rows: `raw_data` "Raw data" sort 1 · `data_dictionary` "Data dictionary" sort 2.

`report_workbook_column_group` — 12 active rows (workbook `star_results_metadata`, sheet `raw_data`):

| sort | from–to | label | fill (as stored) |
| --- | --- | --- | --- |
| 1 | 1–14 | GENERAL INFORMATION | `203C61` |
| 2 | 15–22 | ALLIANCE ALIGNMENT | `2A4783` |
| 3 | 23–23 | PARTNERS | `325B94` |
| 4 | 24–27 | GEOGRAPHIC SCOPE | `5A91D3` |
| 5 | 28–29 | EVIDENCES | `64B1DD` |
| 6 | 30–30 | LINK TO RESULT | `FF7E57C2` |
| 7 | 31–35 | IP RIGHTS | `35749A` |
| 8 | 36–56 | CAPSHARING DETAILS | `FF4D7C31` |
| 9 | 57–60 | POLICY DETAILS | `FFDA7842` |
| 10 | 61–87 | INNOVATION DETAILS | `FF00897B` — **June work, excluded** |
| 11 | 88–101 | OICR DETAILS | `FFD9A041` — **shifted +27 by the June work** |
| 12 | 75–80 | INNOVATION USE | `FF6A1B9A` |

**Findings from the reading:**

| # | Finding | Evidence |
| --- | --- | --- |
| F-1 | The June work touches **two** rows: it inserts INNOVATION DETAILS and shifts every later group by +27 (OICR 61–74 → 88–101). Excluding it means dropping the inserted row **and** reversing the shift: OICR = 61–74 | `git show origin/dev:…/1781301000000-StarRawInnovationDevColumnGroup.ts` lines 7 ("shifting OICR +27"), 17-23 |
| F-2 | Six fills are stored without the alpha prefix (`203C61`…); the migrations wrote `FF203C61`… — the rows were edited outside migrations. Ruling (a): the server uses the `FF` form, same colours | `1777026100000-FixStarRawColumnGroupsEvidences.ts:20-25` |
| F-3 | Dev minus the June work equals `STAR_RAW_COLUMN_GROUP_FALLBACK` exactly (11 groups, same ranges, labels and colours in `FF` form) | the table above against `sheet-presentation.ts:32-67` |
| F-4 | The scratch schema cannot serve as a source: it holds 0 sheet rows and 1 group row (INNOVATION USE) — it is bootstrapped schema-only | scratch `ari_scratch_test`, same `SELECT`s, 2026-10-06 |
| F-5 | Prod was not read | `UNVERIFIED — confirm at source before relying on it` (ruling (b)) |

**The intended layout** this spec puts in code (sheets and 11 sections):

| # | Section title | Columns | Fill |
| --- | --- | --- | --- |
| 1 | GENERAL INFORMATION | 1–14 | `FF203C61` |
| 2 | ALLIANCE ALIGNMENT | 15–22 | `FF2A4783` |
| 3 | PARTNERS | 23 | `FF325B94` |
| 4 | GEOGRAPHIC SCOPE | 24–27 | `FF5A91D3` |
| 5 | EVIDENCES | 28–29 | `FF64B1DD` |
| 6 | LINK TO RESULT | 30 | `FF7E57C2` |
| 7 | IP RIGHTS | 31–35 | `FF35749A` |
| 8 | CAPSHARING DETAILS | 36–56 | `FF4D7C31` |
| 9 | POLICY DETAILS | 57–60 | `FFDA7842` |
| 10 | OICR DETAILS | 61–74 | `FFD9A041` |
| 11 | INNOVATION USE | 75–80 | `FF6A1B9A` |

Sheets: `raw_data` "Raw data" (1), `data_dictionary` "Data dictionary" (2).

**In scope:** the sheet list, the section bands (title, range, colour), the per-column header colour and the banner title width — all defined in server code and derived from the column array.

**Out of scope / NOT changing:**
- result data, the `report_*` views and the export queries;
- `report_data_dictionary` (stays in the database, read as today);
- the banner subtitle, the notice row, the logo and every other preamble value;
- the sheet-order environment override;
- dropping or editing the two tables (ruling (c)) — they remain, unread;
- the client (it stores the `.xlsx` blob unchanged).

**Affected surface (what renders):** the downloaded `.xlsx` — and only where Dev's stored rows differed from the intended layout (F-1, F-2): on Dev the June overlap disappears. Everywhere the intended layout already applied, the file is unchanged.

---

## 2. Stakeholders / Personas

| Persona (PRD §3) | Need |
| --- | --- |
| MEL / Results Center analyst | The same workbook as today, with correct section bands |
| ARI server team | Add or move a column without rewriting band numbers in a migration; no layout drift between environments |

---

## 3. Functional Requirements

### R-WBL-001 — The sheet list is defined in server code

The system SHALL build the workbook's sheets, their names and their default order from a server-side definition: `raw_data` "Raw data" first, `data_dictionary` "Data dictionary" second.

#### Scenario: Default order
- GIVEN no sheet-order override is configured
- WHEN the workbook is generated
- THEN the tabs are "Raw data" then "Data dictionary"
- AND IT MUST NOT read `report_workbook_sheet`

#### Scenario: Override still applies
- GIVEN the sheet-order environment variable lists `data_dictionary,raw_data`
- WHEN the workbook is generated
- THEN "Data dictionary" comes first
- BUT a key in the override that names no defined sheet is ignored, as today

### R-WBL-002 — Every raw column carries a section tag

Each Raw data column definition SHALL name the section it belongs to. The section's title and colour are defined once per section, not per column.

#### Scenario: Missing tag
- GIVEN a raw column definition with no section tag
- THEN the server build fails (a compile error), before any test or export runs

#### Scenario: Unknown section
- GIVEN a column tagged with a section that has no definition
- THEN the server build fails

### R-WBL-003 — Section bands are computed from the tagged columns

For each section, the system SHALL compute the band's first and last column from the positions of the columns tagged with it, and paint the section's title and colour there. No band range is written by hand anywhere.

#### Scenario: Today's layout
- GIVEN the 80 raw columns tagged per the intended layout (§1)
- WHEN the workbook is generated
- THEN the Raw data sheet shows exactly the 11 bands of §1, with the same titles, ranges and colours, in column order
- AND IT MUST NOT read `report_workbook_column_group`

#### Scenario: A column is added to a section
- GIVEN a new column inserted inside an existing section's run (e.g. a new IP RIGHTS column after column 35)
- WHEN the workbook is generated
- THEN that section's band grows by one, and every later band shifts by one
- AND no range number was edited to achieve it

#### Scenario: A new section is appended
- GIVEN new columns tagged with a new section, after the last section
- THEN a new band appears over exactly those columns
- BUT no existing band moves, renames or recolours

#### Scenario: Split section
- GIVEN the columns of one section are not contiguous (another section's column sits between two of them)
- THEN generation fails with an error naming the section, the other section's column that interrupts it (the stray column), and the column that reopens it
- BUT it must NOT paint two bands, or one band covering the other section's column (overlapping merges are what break the file today on Dev)

#### Scenario: Empty section
- GIVEN a section definition that no column uses
- THEN it produces no band and no error

### R-WBL-004 — Column header colour follows the column's section

Each Raw data column header SHALL be filled with its own section's colour.

#### Scenario: Header colour
- GIVEN column 31 tagged IP RIGHTS
- THEN its header cell fill is `FF35749A`, the IP RIGHTS colour

### R-WBL-005 — The banner title spans to the last column

The `ALLIANCE RESULTS` banner title SHALL merge from column 3 to the last Raw data column, computed from the column count.

#### Scenario: Banner width
- GIVEN 80 raw columns
- THEN the banner title merges columns 3–80
- AND with 81 columns it merges 3–81, with no other edit

### R-WBL-006 — Colours are 8-digit ARGB

Every section colour SHALL be an 8-character ARGB value with the `FF` alpha prefix (ruling (a)).

#### Scenario: Colour format
- GIVEN the section definitions
- THEN every colour matches `^FF[0-9A-F]{6}$`
- BUT it must NOT carry the 6-character form stored on Dev for six rows (F-2)

### R-WBL-007 — The database tables are no longer read and are kept

The export SHALL NOT query `report_workbook_sheet` or `report_workbook_column_group`. The tables, their rows and the migrations that wrote them SHALL remain unchanged (ruling (c)). `report_data_dictionary` is still read exactly as today.

#### Scenario: Export with the tables emptied
- GIVEN both layout tables are empty (or hold the June rows)
- WHEN the workbook is generated
- THEN the sheets and bands are the intended layout of §1
- AND the Data dictionary sheet still lists the `report_data_dictionary` rows

---

## 4. Non-Functional Requirements

### NFR-WBL-001 — Output parity (reliability)
- **Target:** for the same result rows, the generated workbook's sheets, column headers, bands (merge ranges, titles, fills), per-column header fills and banner merge equal the intended layout of §1. The only intended differences from a Dev export today are F-1 and F-2.
- **How verified:** a unit test asserting the derived bands against the §1 table (ranges, titles, colours) and an `.xlsx` read-back asserting merges and fills by content.

### NFR-WBL-002 — Fewer queries (performance)
- **Target:** the export issues two fewer layout queries per request (sheets, groups); the dictionary query stays.
- **How verified:** the handler unit spec asserts the layout repository's sheet and group readers are not called (or no longer exist).

### NFR-WBL-003 — Fail at build, not at export (dx)
- **Target:** a missing or unknown section tag is a compile error (R-WBL-002); a split section is a deterministic error caught by a unit test over the real column array (R-WBL-003).

---

## 5. Defect classes → gates

| # | Defect class | Gate |
| --- | --- | --- |
| D1 | A band with the wrong range, title or colour | Unit test of the derivation against the §1 table, over the **real** column array; `.xlsx` read-back of merges and fills |
| D2 | A split or overlapping section silently painted | Unit test feeding a split array: generation throws, naming the section, the stray column and the reopening column (R-WBL-003) |
| D3 | An untagged or mis-tagged column | `npm run build` (required, typed tag); the D1 test catches a mis-tag that moves a boundary |
| D4 | A colour in the 6-character form | Unit test over every section colour |
| D5 | A consumer still pinning the removed readers, the fallback constant or the hardcoded banner column | Consumer sweep (one grep per changed symbol over `src`, `test`, client) at the first task |
| D6 | Compiler-only defect in the new types | `npm run build` |
| D7 | Visual rendering (bands, colours) | **No automated gate.** Substitute: a human opens a generated file at the execute HITL pause |
| D8 | Prod layout differs from Dev in a way the extraction did not see | **No automated gate.** Substitute: a human reads Prod's two tables before the `main` merge (ruling (b)) |

---

## 6. Data requirements

- No table, column, row or index change. No migration.
- The two layout tables stay, unread (ruling (c)). Dropping them is a later, separate human decision.

## 7. API surface delta

None. Same endpoint, same file name.

## 8. Cross-system impact

STAR client: none. `docs/specs/innovation-dev/excel-export` (paused): its layout migration (T-03) loses the group-row half — Innovation Development becomes 32 tagged columns plus one section definition; its dictionary half is unchanged.

## 9. Assumptions, dependencies, risks

| # | Item | Mitigation |
| --- | --- | --- |
| A1 | Prod's layout equals the intended layout | `UNVERIFIED`; human reading before `main` merge (D8) |
| R1 | The June work stays on Dev until Thursday's restore; with this spec deployed, Dev's export ignores it (bands come from code) | Intended: removes the D9 overlap of the paused spec |
| R2 | Future layout changes need a code deploy, not a data edit | Accepted: the user's intent; columns already need a deploy |

## 10. Open questions

None open. Rulings (a)–(d) settled 2026-10-06.

## 11. Requirement ID Index

| ID | Title | Kind |
| --- | --- | --- |
| R-WBL-001 | Sheet list in server code | functional |
| R-WBL-002 | Section tag on every raw column | functional |
| R-WBL-003 | Bands computed from tagged columns | functional |
| R-WBL-004 | Header colour follows section | functional |
| R-WBL-005 | Banner title to last column | functional |
| R-WBL-006 | 8-digit ARGB colours | functional |
| R-WBL-007 | Tables unread and kept | functional |
| NFR-WBL-001 | Output parity | reliability |
| NFR-WBL-002 | Two fewer queries | performance |
| NFR-WBL-003 | Fail at build | dx |

## 12. Sign-off

- [ ] Engineering lead
- [ ] MEL / product owner

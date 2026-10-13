# Proposal — Institutional Performance / Organizational Structure (living, versioned per year)

> **Answer first:** a new page, *Center admin › Organizational Structure* (outside Portfolio Management — 2026-10-13), holding **one living Alliance structure that does not belong to any portfolio**. It has four levels: L1 Division › L2 Department › L3 Office (optional) › L4 Unit. Every entry has a **permanent ID**. Names, parents and directors are **versioned per year**: each version applies from a year onward, and the structure of any year can be rebuilt exactly as it was. Nothing that was ever in effect is physically erased, so a unit that was inactivated or deleted later still appears in the structure of every earlier year (for example, *which units were active last year*).

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/institutional-performance/organizational-structure` |
| **Slug** | `organizational-structure` — from the family split approved 2026-09-26 |
| **Type** | **Change** |
| **Approval Mode** | `gated` |
| **Parent Spec** | `docs/specs/institutional-performance` (`family.md`, child 2 of 5) |
| **Status** | **approved** 2026-10-08 by the requester, with Q-1…Q-4 accepted as recommended (see §15) |
| **Last updated** | 2026-10-08 |
| **Branch** | `institutional-kpis` (from `staging`) |
| **JPD idea** | [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258) |
| **Depends on** | `institutional-performance/control-lists` (reads the `org.level` list; see Q-1) |
| **Parallel-safe** | no |
| **Shared rules** | F-1, F-3 … F-9 (`../family.md` §4). **F-2 does not apply** to this child (family exception, 2026-10-08). **F-5** is narrowed by §5 *Delete*. **F-9 stable links** is this spec's core |

## 2. Intent

Model the Alliance organizational structure as **one living tree** that admins can change at any time (units created, renamed, moved between departments, merged, inactivated or deleted), while every record linked to a unit stays consistent. The structure is **versioned per year**: reports can use the structure of the current year or of any past year. Entries that were deleted or inactivated later are included.

The structure is **not tied to a portfolio**. Portfolios, strategy frameworks and KPIs come and go on their own schedule. The organization exists across them, and anything portfolio-scoped refers to its units by permanent ID (F-9).

## 3. Problem / Current Behavior

| # | Fact | Evidence |
| --- | --- | --- |
| 3.1 | The structure exists only in a PDF and a sheet with no IDs and no dates. | Master Monitoring Framework *04. ORG structure* (source `Organizational-Structure-June-2026--ENG--FINAL.pdf`) |
| 3.2 | The org chart changes frequently: names change, units move between departments, units are created and removed. | requester, 2026-09-26; requester, 2026-10-08 |
| 3.3 | A mapping module will link many records (especially results) to units and indicators after this family. | requester, 2026-09-26 |
| 3.4 | Today results are mapped to Portfolio 1 levers (CLARISA levers linked to a portfolio), not to an Alliance org structure. | `domain/entities/portfolios/entities/portfolio.entity.ts:67` (`ClarisaLever` relation); `domain/entities/result-levers` |
| 3.5 | The structure must not be scoped to a portfolio. It is one tree that lives across portfolios. | requester, 2026-10-08 |
| 3.6 | Even after units are deleted or inactivated, it must be possible to know which ones were active in a past period (e.g. one year ago). | requester, 2026-10-08 |
| 3.7 | Versioning per **year** is enough; day and time are more detail than needed. | requester, 2026-10-08 |
| 3.8 | The `org.level` control list is portfolio-scoped today (`portfolio_id` NOT NULL, seeded under Portfolio 2, value ids 20–23). | `server/…/db/migrations/1790900000001-createControlLists.ts:34,94`; `1790900000002-createControlListValues.ts:142-148` |

## 4. Proposed Outcome

| Given | When | Then |
| --- | --- | --- |
| A unit with linked records | it moves from Department A to B, **applies from 2027** | it keeps its permanent ID; its records count under B for 2027 onward and under A for 2026 and earlier |
| A unit | it is renamed, **applies from 2027** | a new version starting in 2027 is stored; History shows *old → new*; the 2026 structure still shows the old name |
| A unit | it is edited and the change **applies from the year its current version already starts** | that version is updated in place (this is how typos are fixed); no new version, but the change log records who, when and the old value |
| A change that should have applied earlier | the admin picks an **earlier year** (Back-date, off by default) | the change applies from that year onward, later versions included; the UI warns that reports for those years will be recalculated; the change log records it |
| A unit with KPIs in 2026–2028 | it moves from Department A to B **from 2029**, and later is renamed | the unit's own KPI history (2026 → today) stays in **one continuous series** under the same permanent ID, whatever its department or name; viewed by department, 2026–2028 values count under A and 2029 onward under B |
| Two units merge | one is **inactivated from 2027** with the other as successor | from 2027 its records roll up to the successor; the records themselves are not rewritten |
| A unit was inactivated or deleted from 2027 | the admin views the **2026** structure | the unit appears, with the name, parent and director it had in 2026 |
| A unit was inactivated or deleted from 2027 | the admin views the **2027** structure | the unit is hidden (visible with *Show inactive / deleted*) |
| Any entry that was ever in effect | Delete is pressed | it is never physically removed: it is ended from the chosen year and marked deleted; it disappears from that year's view onward and stays in every earlier year's view |
| Any entry with active children or associated information | Delete or Inactivate is pressed | it is blocked (F-5); the dialog names the blocker and offers to move or inactivate the children first |
| The admin picks a *Structure year* | any year | the tree and table show the structure valid for that year; changes already scheduled for later years are badged |

## 5. Scope

| Aspect | Design |
| --- | --- |
| Scope | **Global — no `portfolio_id`.** One tree for the Alliance. The page has **no portfolio selector**; it has a *Structure year* selector instead (default = current year) |
| Identity | Hidden **permanent ID**; visible **Code** (`ORG-###`, editable, unique across the whole tree **including inactive and deleted entries**, so a code is never reused for a different unit — F-6). The code does not encode the parent, so a move never renumbers |
| Time model | **Per year.** Every version has `valid_from_year` and `valid_to_year` (integers; half-open `[from, to)`, open-ended = current). At most one version of an entry per year, so the structure of a year is unambiguous. No days, no times. **A version is created only when that entry changes; the tree is never copied per year.** If nothing changes for three years, every entry keeps its single open-ended version (`2026 → ∞`) and the structure of 2026, 2027 and 2028 is the same set of rows. A move of one unit in 2029 ends that unit's version at 2029 and adds one new version for it; the other ~116 entries are untouched |
| Versions | `name`, `acronym`, `level`, `parent`, `director` live in versions. **Director** is a staff member from the Agresso staff table (`alliance_user_staff`), stored by staff ID; name and email are read from it (requester, 2026-10-08 — see requirements R-ORG-016) |
| Save | One field, **Applies from year** (default = current year). Same year as the current version → that version is updated in place. Later year → a new version is created. Earlier year → **Back-date** (must be ticked explicitly; warns about recalculated reports) |
| Entry lifecycle | `active` → `inactive` from a year (optional successor; reactivate allowed, creates a new version) or `deleted` from a year (cannot be reactivated). Both are **logical**: the entry and all its versions stay in the database, and the year views before that year still show it |
| Change log | Every write (edit, new version, back-date, inactivate, reactivate, delete) is recorded with user, recorded-at timestamp, year it applies from, and old → new values. The log is append-only and never edited. It keeps the fine-grained "who and when" that the annual versions leave out |
| Hierarchy rules | L1: no parent · L2 under L1 · L3 under L2 · L4 under L3 or L2 (Office optional). Levels come from Control Lists (`org.level`, Q-1). A parent must be active **in the year** the child's version starts, and in every year it covers |
| Roll-ups | The read service resolves each unit's parent **for the report year**. A record linked to a unit is resolved with the structure of the record's year (Q-2). A helper view exposes the current year's version |
| Delete | **Physical delete only for an entry that did not exist before the current year** (its first version starts in the current year or later) and has no associated information. Any other delete is **logical** (ended from a year + `deleted`). Blocked while the entry has active children or associated information (F-5) |
| KPI-managing flag | The *Manages institutional KPIs* flag is **not** part of the tree. It is a per-portfolio association (portfolio ↔ unit permanent ID), owned by the portfolio-scoped modules that need it (`institutional-indicators`). This page may display it read-only for a chosen portfolio (Q-3) |
| Views | **Tree** (+ on container rows) and **Table** (F-7); filter *Show inactive / deleted*; *Structure year* selector |
| Form | Code*, Level*, Name*, Acronym, Parent*, Responsible director (staff search), Applies from year*. Tabs: **Details**, **History** (versions per year + change log), **Linked data** |
| Seed (F-8) | 3 divisions · 19 departments/regions · 1 office · 94 units from MMF sheet 04; DT = Technology Integration; the three parent-less units placed under the parent they appear with; all versions valid from **2026** |

## 6. Non-Goals
- Versioning finer than a year (day or time). A change in the middle of a year is recorded in the change log, but the structure only has one version per year.
- The mapping of results and other records to units (next module; it must follow F-9 and resolve units with the structure of the record's year).
- Splitting one unit into two that share its history. A split is modelled as new units (the original is inactivated with one of them as successor); the original's KPI history stays with the original.
- Loading the organization's history from before 2026 (possible later as back-dated versions, without a schema change).
- Syncing with an HR system.
- Making control lists global in general (`../family.md` F-2 keeps that as a later decision; Q-1 covers only `org.level`).

## 7. Affected Users, Systems, And Specs
| Area | Impact |
| --- | --- |
| Server | `org_units` (permanent id, code, status, status_from_year, successor_id; **no portfolio_id**), `org_unit_versions` (unit id, valid_from_year, valid_to_year, name, acronym, level value id, parent unit id, director staff id → `alliance_user_staff.carnet`; unique `(unit_id, valid_from_year)`), `org_unit_change_log` (append-only); read service with `year`; roll-up helper; `.xlsx` export; migrations + seed. The per-portfolio KPI flag moves to `institutional-indicators` |
| Client | new page with tree/table, year selector, versioned form with *Applies from year*, change-log history and dialogs; no portfolio selector |
| Specs | `control-lists` (levels, Q-1), `strategy-framework` (portfolio-scoped elements refer to owner units by permanent ID), `institutional-indicators` (owns the KPI-managing flag), the future mapping module |

## 8. Visual Reference
- **Source:** generated mockup (claude.ai Design canvas), working prototype.
- **Location:** https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP — artboard **2 · Organizational Structure** (`../mockup/OrgStructure.dc.html`). A sticky note on the canvas walks through a move.
- **Drift to fix during `/akili-specify`:** the mockup still shows a portfolio selector, the *Only KPI-managing entries* filter, a date-based as-of picker and an effective date in the form. This revision replaces them with no portfolio selector, no KPI filter, a year selector and *Applies from year*.

## 9. Requirement Delta Preview
- **ADDED:** global living org structure with permanent IDs; versions per year; in-place edit vs new version vs back-date chosen by the year; append-only change log; year views that include later-deleted and later-inactivated entries; roll-ups by year; inactivate with successor; logical delete; delete protection.
- **MODIFIED (vs the 2026-09-26 draft):** not portfolio-scoped; versions per year instead of per date; the *change vs correction* choice is replaced by the year; *close* renamed *inactivate* and joined by a logical *delete*; edits are logged; the KPI flag leaves this spec.
- **REMOVED:** none.

## 10. Approach Options
| Option | Pros | Cons |
| --- | --- | --- |
| **A. Permanent ID + per-year versions + append-only change log** | Records never rewritten; any year reconstructable, deleted entries included; only changed entries get a new version; moves change roll-ups exactly from their year; merges via successor; edits still traceable | Queries resolve "version for year"; needs an index and a helper view |
| B. Current row + audit log | Simplest reads | History not reconstructable for reporting; past totals silently change after a move; deleted rows lost |
| C. Full copy of the tree per year | Very simple to read one year | Every entry duplicated every year with new ids, so links break across years unless a mapping is kept; a back-date means editing many copies |

## 11. Recommended Approach
**Option A.** It is the only option where a move neither breaks linked data nor rewrites history, and where a deleted or inactivated unit can still be seen in any earlier year. Versions per year keep it simple: one version per entry per year at most. It also sets the rule for the mapping module: **link to the permanent ID, resolve names and parents with the structure of the record's year.**

## 12. Risks, Dependencies, And Open Questions
| Risk | Mitigation |
| --- | --- |
| Resolving the version for a year slows reports | Index `(unit_id, valid_from_year)`; current-year view; cache per request |
| Back-dating changes already-published totals | Off by default; explicit warning; recorded in the change log |
| A mid-year reorganisation is not visible until the year it applies from | Expected with per-year versions (requester, 2026-10-08). The admin chooses: current year (the whole year uses the new structure) or next year. The change log keeps the real date |
| Cycles in the hierarchy (a unit made parent of its own ancestor) | Validation on save, for the year it applies from **and** every later version |
| A logical delete looks like data loss to users | The delete dialog says the entry stays visible in earlier years; *Show inactive / deleted* reveals it now |

| # | Open question | Recommendation |
| --- | --- | --- |
| **Q-1** | The tree is global but `org.level` is a Portfolio 2 control list (fact 3.8). Which list does it read? | Store the level as the **control-list value's permanent ID** (ids 20–23 are fixed across environments) and treat that one `org.level` list as the source regardless of portfolio. Promote it to a global list when global control lists are decided (F-2). No schema change in `control-lists` now |
| **Q-2** | Which year decides the structure for a linked record (e.g. a result)? | The record's reporting year. The mapping module confirms the exact field |
| **Q-3** | Should this page still show the *Manages institutional KPIs* flag? | Read-only, for a portfolio chosen in a side panel, only once `institutional-indicators` exists. Until then, not shown |
| **Q-4** | When a unit is inactivated with a successor, should the successor's KPI history also show the predecessor's years? | Yes as an optional *Include predecessors* view, following the successor chain; stored values are never moved. Decide in `institutional-indicators` |

## 13. Success Criteria
- Moving a unit with linked records from a year changes department roll-ups from that year only; a report for an earlier year is unchanged.
- A back-dated change applies from its year to all later versions, and the change log shows when it was entered.
- After a unit is deleted or inactivated from a year, the structure of every earlier year still lists it with its name, parent and director for that year.
- Nothing that existed in a past year is physically deleted; in-place edits appear in the change log.
- An entry has at most one version per year.
- The history of anything linked to a unit (KPIs first) is continuous across moves and renames, because the link is the permanent ID; only department-level views change from the move's year.
- No entry with active children or associated information can be deleted or inactivated.
- No table or endpoint of this module takes a portfolio parameter.
- The table view meets F-7.

## 14. Next Step
```text
/akili-specify institutional-performance/organizational-structure
```

## 15. Revision Log
| Date | Change | Source |
| --- | --- | --- |
| 2026-09-26 | First draft (portfolio-scoped, date-based versions, close/successor) | family split |
| 2026-10-08 (a) | Structure made **global** (no portfolio); logical delete + inactivate keep every entry visible in earlier views; append-only change log; KPI flag moved to `institutional-indicators`; open questions Q-1…Q-3 | requester, 2026-10-08 |
| 2026-10-08 (b) | Versions **per year** instead of per date/time; *change vs correction* replaced by *Applies from year*; year selector instead of an as-of date; Q-2 now asks which year a linked record uses | requester, 2026-10-08 |
| 2026-10-08 (c) | KPI continuity across moves (outcome row, success criterion, Q-4); proposal **approved** with Q-1…Q-4 as recommended | requester, 2026-10-08 |

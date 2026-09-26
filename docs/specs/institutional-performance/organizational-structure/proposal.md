# Proposal — Institutional Performance / Organizational Structure (versioned)

> **Answer first:** a new page, *Center admin › Portfolio Management › Organizational Structure*, holding the Alliance structure for Portfolio 2 in four levels: L1 Division › L2 Department › L3 Office (optional) › L4 Unit. Every entry has a **permanent ID**. Names, parents and directors are stored as **effective-dated versions**, so renames, moves and merges never break linked data. Totals follow a unit to its new department from the change date, and the structure can be viewed as of any date.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/institutional-performance/organizational-structure` |
| **Slug** | `organizational-structure` — from the family split approved 2026-09-26 |
| **Type** | **Change** |
| **Approval Mode** | `gated` |
| **Parent Spec** | `docs/specs/institutional-performance` (`family.md`, child 2 of 5) |
| **Status** | draft — awaiting approval |
| **Last updated** | 2026-09-26 |
| **Branch** | `institutional-kpis` (from `staging`) |
| **JPD idea** | [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258) |
| **Depends on** | `institutional-performance/control-lists` (reads the `org.level` list) |
| **Parallel-safe** | no |
| **Shared rules** | F-1 … F-9 (`../family.md` §4); **F-9 stable links** is this spec's core |

## 2. Intent

Model the Alliance organizational structure so that it can change many times a year (units renamed, moved between departments, merged) while every record linked to a unit stays consistent. Reports must be answerable both as the structure is today and as it was on any past date.

## 3. Problem / Current Behavior

| # | Fact | Evidence |
| --- | --- | --- |
| 3.1 | The structure exists only in a PDF and a sheet with no IDs and no dates. | Master Monitoring Framework *04. ORG structure* (source `Organizational-Structure-June-2026--ENG--FINAL.pdf`) |
| 3.2 | The org chart changes frequently: names change and units move between departments. | requester, 2026-09-26 |
| 3.3 | A mapping module will link many records (especially results) to units and indicators after this family. | requester, 2026-09-26 |
| 3.4 | Today results are mapped to Portfolio 1 levers (CLARISA levers linked to a portfolio), not to an Alliance org structure. | `domain/entities/portfolios/entities/portfolio.entity.ts:67` (`ClarisaLever` relation); `domain/entities/result-levers` |

## 4. Proposed Outcome

| Given | When | Then |
| --- | --- | --- |
| A unit with linked records | it moves from Department A to B, **effective 2026-10-01** | it keeps its permanent ID; its records count under B for any date from 2026-10-01 and under A before |
| A unit | it is renamed as an **organizational change** | a new version is stored; History shows *old → new*; the as-of view shows the name valid on each date |
| A typo | it is saved as a **Correction** | the current version is overwritten; no history entry |
| A change that happened earlier | the admin ticks **Back-date** (off by default) | the change applies from the earlier date onward, later versions included, and the UI warns that reports from that date will be recalculated |
| Two units merge | one is **closed** with the other as successor | from the closing date its records roll up to the successor; the records themselves are not rewritten |
| Any entry with children or associated information | Delete is pressed | it is blocked (F-5) and *Close entry* is offered |
| The admin sets *Structure as of* | to any date | the tree and table show the structure valid on that date; scheduled changes are badged |

## 5. Scope

| Aspect | Design |
| --- | --- |
| Identity | Hidden **permanent ID**; visible **Code** (`ORG-###`, editable, unique — F-6). The code does not encode the parent, so a move never renumbers |
| Versions | `name`, `acronym`, `level`, `parent`, `director`, `director email` live in versions with `valid_from`. The *Manages institutional KPIs* flag is per portfolio |
| Save choice | **Organizational change** (effective date, default = the as-of date; later than the current version unless **Back-date** is ticked) or **Correction** |
| Hierarchy rules | L1: no parent · L2 under L1 · L3 under L2 · L4 under L3 or L2 (Office optional). Levels come from Control Lists (`org.level`) |
| Roll-ups | The read service resolves each unit's parent **as of the report date**; a helper view exposes the current version |
| Close / merge | *Close entry* from a date with optional successor; closed entries hidden unless *Show closed*; reopen allowed |
| Delete | Only when there are no children, no associated information and a single version (F-5) |
| Views | **Tree** (+ on container rows) and **Table** (F-7); filters *Only KPI-managing entries* and *Show closed*; *Structure as of* date |
| Form | Code*, Level*, Name*, Acronym, Parent*, Responsible director, Director email, Manages institutional KPIs. Tabs: **Details**, **History**, **Linked data** |
| Seed (F-8) | 3 divisions · 19 departments/regions · 1 office · 94 units from MMF sheet 04; DT = Technology Integration; the three parent-less units placed under the parent they appear with; all versions valid from 2026-01-01 |

## 6. Non-Goals
- The mapping of results and other records to units (next module; it must follow F-9).
- A Portfolio 1 structure (`../family.md` §5).
- Syncing with an HR system.

## 7. Affected Users, Systems, And Specs
| Area | Impact |
| --- | --- |
| Server | `org_units` (permanent id, portfolio, code, closed_on, successor_id), `org_unit_versions` (unit id, valid_from, valid_to, name, acronym, level value id, parent unit id, director, email), `portfolio_org_unit_flags`; read service with `asOf`; roll-up helper; `.xlsx` export; migrations + seed |
| Client | new page with tree/table, as-of picker, versioned form and dialogs |
| Specs | `control-lists` (levels), `strategy-framework` (owner units), the future mapping module |

## 8. Visual Reference
- **Source:** generated mockup (claude.ai Design canvas), working prototype.
- **Location:** https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP — artboard **2 · Organizational Structure** (`../mockup/OrgStructure.dc.html`). A sticky note on the canvas walks through a move.

## 9. Requirement Delta Preview
- **ADDED:** versioned org structure with permanent IDs, change vs correction, optional back-dating, as-of views and roll-ups, close with successor, history, delete protection.
- **MODIFIED / REMOVED:** none.

## 10. Approach Options
| Option | Pros | Cons |
| --- | --- | --- |
| **A. Permanent ID + effective-dated versions** | Records never rewritten; any date reconstructable; moves change roll-ups exactly from the effective date; merges via successor | Queries resolve "version as of date"; needs an index and a helper view |
| B. Current row + audit log | Simplest reads | History not reconstructable for reporting; past totals silently change after a move |
| C. Snapshot per reporting period | Simple per period | Duplicated identities; heavy with frequent changes |

## 11. Recommended Approach
**Option A.** It is the only option where a move neither breaks linked data nor rewrites history. It also sets the rule for the mapping module: **link to the permanent ID, resolve names and parents as of the report date.**

## 12. Risks, Dependencies, And Open Questions
| Risk | Mitigation |
| --- | --- |
| As-of resolution slows reports | Index `(unit_id, valid_from)`; current-version view; cache per request |
| Back-dating changes already-published totals | Off by default; explicit warning; recorded in history |
| Cycles in the hierarchy (a unit made parent of its own ancestor) | Validation on save, checked as of the effective date |

No open questions — decisions in `../family.md` §4 and the requester's answers of 2026-09-26.

## 13. Success Criteria
- Moving a unit with linked records changes department roll-ups from the effective date only; a report for an earlier date is unchanged.
- A back-dated change applies from its date to all later versions.
- No entry with children or associated information can be deleted.
- The table view meets F-7.

## 14. Next Step
```text
/akili-specify institutional-performance/organizational-structure
```
